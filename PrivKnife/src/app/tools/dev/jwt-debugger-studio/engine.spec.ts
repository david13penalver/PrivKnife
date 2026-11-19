import { describe, expect, it, vi } from 'vitest';
import {
  base64UrlDecodeBytes,
  base64UrlDecodeUtf8,
  base64UrlEncodeBytes,
  base64UrlEncodeUtf8,
  buildBearerHeader,
  buildCurlSnippet,
  buildDecodedExportJson,
  decodeJwt,
  generateEphemeralKeyPair,
  mintJwt,
  normalizeTokenInput,
  verifyJwtSignature,
} from './engine';
import {
  ALG_NONE_MIXED_CASE_TOKEN,
  ALG_NONE_TOKEN,
  EXPIRED_NBF_SKEW_TOKEN,
  FIXED_NOW_SECONDS,
  JWE_FIVE_PART_TOKEN,
  MALFORMED_PKCS1_PEM,
  RFC_HS256_SECRET,
  RFC_HS256_SECRET_BASE64URL,
  RFC_HS256_SECRET_BASE64_PADDED,
  RFC_HS256_TOKEN,
  UTF8_HS256_TOKEN,
} from './test-fixtures';
import { MAX_JWT_INPUT_LENGTH } from './types';

describe('JWT Debugger Studio Engine — Seam 1A (Codec, Decoder & Claim Audit)', () => {
  describe('1. Canonical Decoding & Bearer Normalization', () => {
    it('decodes canonical RFC 7519 HS256 token and strips case-insensitive Bearer prefix and whitespace', () => {
      const messy = `  \n\tBeArEr   ${RFC_HS256_TOKEN}  \r\n `;
      expect(normalizeTokenInput(messy)).toBe(RFC_HS256_TOKEN);

      const res = decodeJwt(messy, FIXED_NOW_SECONDS);
      expect(res.validStructure).toBe(true);
      expect(res.normalizedToken).toBe(RFC_HS256_TOKEN);
      expect(res.algorithm).toBe('HS256');
      expect(res.header).toEqual({ alg: 'HS256', typ: 'JWT' });
      expect(res.payload).toEqual({
        sub: '1234567890',
        name: 'John Doe',
        iat: 1516239022,
      });
      expect(res.headerRaw).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(res.payloadRaw).toBe(
        'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ'
      );
      expect(res.signatureRaw).toBe(
        'SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      );
      expect(res.error).toBeUndefined();
    });
  });

  describe('2. UTF-8 Multi-Byte Roundtrip & Invalid Sequence Rejection', () => {
    it('round-trips multi-byte UTF-8 emojis and accents without mojibake', () => {
      const text = '{"name":"Sofía Müller 🚀","city":"東京"}';
      const encoded = base64UrlEncodeUtf8(text);
      expect(encoded).not.toMatch(/[+/=]/);
      expect(base64UrlDecodeUtf8(encoded).text).toBe(text);

      const decoded = decodeJwt(UTF8_HS256_TOKEN, 1_800_000_000);
      expect(decoded.validStructure).toBe(true);
      expect(decoded.payload?.['name']).toBe('Sofía Müller 🚀');
      expect(decoded.payload?.['city']).toBe('東京');
    });

    it('rejects invalid UTF-8 byte sequences (0xFF 0xFE) cleanly', () => {
      const invalidB64u = base64UrlEncodeBytes(new Uint8Array([0xff, 0xfe, 0x80]));
      expect(() => base64UrlDecodeUtf8(invalidB64u)).toThrow(/utf-?8/i);
    });
  });

  describe('3. Structure & Boundary Rejections', () => {
    it('rejects empty input, 2-part, 4-part, 5-part JWE, and oversized inputs (> MAX_JWT_INPUT_LENGTH)', () => {
      expect(decodeJwt('   ', FIXED_NOW_SECONDS).validStructure).toBe(false);
      expect(decodeJwt('abc.def', FIXED_NOW_SECONDS).validStructure).toBe(false);
      expect(decodeJwt('a.b.c.d', FIXED_NOW_SECONDS).validStructure).toBe(false);

      const jwe = decodeJwt(JWE_FIVE_PART_TOKEN, FIXED_NOW_SECONDS);
      expect(jwe.validStructure).toBe(false);
      expect(jwe.error).toMatch(/JWE/i);

      const oversized = 'a'.repeat(MAX_JWT_INPUT_LENGTH + 1);
      const hugeRes = decodeJwt(oversized, FIXED_NOW_SECONDS);
      expect(hugeRes.validStructure).toBe(false);
      expect(hugeRes.error).toMatch(/length|size|limit/i);
    });

    it('rejects illegal Base64Url length (len % 4 === 1) and illegal characters (+, /, !)', () => {
      expect(() => base64UrlDecodeBytes('abcde')).toThrow(/length|base64url/i);
      expect(() => base64UrlDecodeBytes('ab+d')).toThrow(/character|base64url/i);
      expect(() => base64UrlDecodeBytes('ab/d')).toThrow(/character|base64url/i);
      expect(() => base64UrlDecodeBytes('ab!d')).toThrow(/character|base64url/i);
    });

    it('rejects non-object JSON headers or payloads (arrays, primitives, null)', () => {
      const arrSeg = base64UrlEncodeUtf8('[1,2,3]');
      const strSeg = base64UrlEncodeUtf8('"hello"');
      const numSeg = base64UrlEncodeUtf8('42');
      const nullSeg = base64UrlEncodeUtf8('null');
      const validHeader = base64UrlEncodeUtf8('{"alg":"HS256"}');
      const validPayload = base64UrlEncodeUtf8('{"sub":"1"}');

      expect(decodeJwt(`${arrSeg}.${validPayload}.sig`).validStructure).toBe(false);
      expect(decodeJwt(`${validHeader}.${strSeg}.sig`).validStructure).toBe(false);
      expect(decodeJwt(`${validHeader}.${numSeg}.sig`).validStructure).toBe(false);
      expect(decodeJwt(`${validHeader}.${nullSeg}.sig`).validStructure).toBe(false);
    });
  });

  describe('4. Non-Canonical Padding Tolerance & Warning', () => {
    it('decodes segments with trailing = padding cleanly while emitting a warning', () => {
      const paddedHeader = `${base64UrlEncodeUtf8('{"alg":"HS256","typ":"JWT"}')}==`;
      const payload = base64UrlEncodeUtf8('{"sub":"padded"}');
      const res = decodeJwt(`${paddedHeader}.${payload}.c2ln`, FIXED_NOW_SECONDS);

      expect(res.validStructure).toBe(true);
      expect(res.header?.['alg']).toBe('HS256');
      expect(res.securityWarnings.some((w) => /padding/i.test(w))).toBe(true);
    });
  });

  describe('5. Deterministic RFC 7519 Claim Auditing', () => {
    it('evaluates valid exp, expired exp, future nbf, iat clock skew, array aud, and non-numeric timestamps', () => {
      const utfRes = decodeJwt(UTF8_HS256_TOKEN, FIXED_NOW_SECONDS);
      const expValid = utfRes.claims.find((c) => c.claim === 'exp');
      expect(expValid?.status).toBe('valid');

      const skewRes = decodeJwt(EXPIRED_NBF_SKEW_TOKEN, FIXED_NOW_SECONDS);
      expect(skewRes.claims.find((c) => c.claim === 'exp')?.status).toBe('expired');
      expect(skewRes.claims.find((c) => c.claim === 'nbf')?.status).toBe(
        'not_yet_valid'
      );
      expect(skewRes.claims.find((c) => c.claim === 'iat')?.status).toBe('warning');
      expect(skewRes.claims.find((c) => c.claim === 'aud')?.formattedValue).toBe(
        'api-a, api-b'
      );
      expect(skewRes.claims.find((c) => c.claim === 'iss')?.rawValue).toBe(
        'https://auth.example.local'
      );
      expect(skewRes.claims.find((c) => c.claim === 'jti')?.rawValue).toBe(
        'tok-001'
      );

      // Missing exp emits warning; non-numeric timestamps flagged as warning
      const rfcRes = decodeJwt(RFC_HS256_TOKEN, FIXED_NOW_SECONDS);
      expect(rfcRes.securityWarnings.some((w) => /exp/i.test(w))).toBe(true);

      const headerB64 = base64UrlEncodeUtf8('{"alg":"HS256"}');
      const badTypesPayload = base64UrlEncodeUtf8(
        JSON.stringify({ exp: '2026-01-01', nbf: null, iat: true })
      );
      const badTypesRes = decodeJwt(`${headerB64}.${badTypesPayload}.sig`, FIXED_NOW_SECONDS);
      expect(badTypesRes.claims.find((c) => c.claim === 'exp')?.status).toBe('warning');
      expect(badTypesRes.claims.find((c) => c.claim === 'nbf')?.status).toBe('warning');
      expect(badTypesRes.claims.find((c) => c.claim === 'iat')?.status).toBe('warning');
    });
  });

  describe('6. Critical Security Warnings Audit', () => {
    it('flags alg: "none", mixed-case alg: "NoNe", empty signature on signed alg, non-empty signature on none, and jku/x5u/jwk/crit headers', () => {
      const noneRes = decodeJwt(ALG_NONE_TOKEN, FIXED_NOW_SECONDS);
      expect(noneRes.validStructure).toBe(true);
      expect(noneRes.securityWarnings.some((w) => /alg.*none/i.test(w))).toBe(true);

      const mixedNoneRes = decodeJwt(ALG_NONE_MIXED_CASE_TOKEN, FIXED_NOW_SECONDS);
      expect(mixedNoneRes.validStructure).toBe(true);
      expect(mixedNoneRes.securityWarnings.some((w) => /alg.*none/i.test(w))).toBe(true);
      expect(
        mixedNoneRes.securityWarnings.some((w) => /non-empty.*signature|unsigned/i.test(w))
      ).toBe(true);

      const headerB64 = base64UrlEncodeUtf8('{"alg":"HS256"}');
      const payloadB64 = base64UrlEncodeUtf8('{"sub":"1","exp":2000000000}');
      const emptySigRes = decodeJwt(`${headerB64}.${payloadB64}.`, FIXED_NOW_SECONDS);
      expect(
        emptySigRes.securityWarnings.some((w) => /empty.*signature|missing.*signature/i.test(w))
      ).toBe(true);

      const skewRes = decodeJwt(EXPIRED_NBF_SKEW_TOKEN, FIXED_NOW_SECONDS);
      expect(skewRes.securityWarnings.some((w) => /jku/i.test(w))).toBe(true);
      expect(skewRes.securityWarnings.some((w) => /crit/i.test(w))).toBe(true);
    });
  });

  describe('7. Safe Export & Snippet Builders', () => {
    it('builds safe Authorization header, shell-safe curl snippet (sanitizing newlines & quotes), and decoded JSON without secrets', () => {
      expect(buildBearerHeader(`Bearer ${RFC_HS256_TOKEN}`)).toBe(
        `Authorization: Bearer ${RFC_HS256_TOKEN}`
      );

      const injectedToken = "a.b.c'\nrm -rf /";
      const curl = buildCurlSnippet(injectedToken, "https://api.example.com/me';whoami");
      expect(curl).not.toContain('\n');
      expect(curl).toContain("'\\''");

      const decoded = decodeJwt(RFC_HS256_TOKEN, FIXED_NOW_SECONDS);
      const exported = JSON.parse(buildDecodedExportJson(decoded));
      expect(exported.header).toEqual(decoded.header);
      expect(exported.payload).toEqual(decoded.payload);
      expect(exported.claims).toBeDefined();
      expect(exported.securityWarnings).toBeDefined();
      expect(JSON.stringify(exported)).not.toContain('your-256-bit-secret');
    });
  });
});

describe('JWT Debugger Studio Engine — Seam 1B (Web Crypto Sign, Verify & Keypair Generation)', () => {
  describe('8. RFC HS256 Verification & Tamper Detection', () => {
    it('verifies canonical RFC HS256 token via utf8, base64url, and padded base64url secrets and detects tampering', async () => {
      const okUtf8 = await verifyJwtSignature(
        RFC_HS256_TOKEN,
        RFC_HS256_SECRET,
        'hmac_utf8'
      );
      expect(okUtf8.verified).toBe(true);
      expect(okUtf8.status).toBe('valid');
      expect(okUtf8.algorithm).toBe('HS256');

      const okB64u = await verifyJwtSignature(
        RFC_HS256_TOKEN,
        RFC_HS256_SECRET_BASE64URL,
        'hmac_base64url'
      );
      expect(okB64u.verified).toBe(true);

      const okB64Padded = await verifyJwtSignature(
        RFC_HS256_TOKEN,
        RFC_HS256_SECRET_BASE64_PADDED,
        'hmac_base64url'
      );
      expect(okB64Padded.verified).toBe(true);

      // Tamper 1 payload character (John Doe -> John Foe) keeping original signature
      const [hRaw, , sigRaw] = RFC_HS256_TOKEN.split('.');
      const tamperedPayloadRaw = base64UrlEncodeUtf8(
        JSON.stringify({ sub: '1234567890', name: 'John Foe', iat: 1516239022 })
      );
      const badPayload = await verifyJwtSignature(
        `${hRaw}.${tamperedPayloadRaw}.${sigRaw}`,
        RFC_HS256_SECRET,
        'hmac_utf8'
      );
      expect(badPayload.verified).toBe(false);
      expect(badPayload.status).toBe('invalid');

      // Tamper 1 secret byte
      const badSecret = await verifyJwtSignature(
        RFC_HS256_TOKEN,
        'your-256-bit-secres',
        'hmac_utf8'
      );
      expect(badSecret.verified).toBe(false);
      expect(badSecret.status).toBe('invalid');

      // Tamper 1 signature byte
      const flippedSig = `${sigRaw[0] === 'S' ? 'T' : 'S'}${sigRaw.slice(1)}`;
      const badSig = await verifyJwtSignature(
        RFC_HS256_TOKEN.replace(sigRaw, flippedSig),
        RFC_HS256_SECRET,
        'hmac_utf8'
      );
      expect(badSig.verified).toBe(false);
      expect(badSig.status).toBe('invalid');
    });
  });

  describe('9. HS384, HS512 & Symmetric oct JWK Mint + Verify Roundtrips', () => {
    it('mints and verifies HS384, HS512, and oct JWK tokens', async () => {
      for (const alg of ['HS384', 'HS512'] as const) {
        const minted = await mintJwt({
          headerJson: JSON.stringify({ alg, typ: 'JWT' }),
          payloadJson: JSON.stringify({ sub: `user-${alg}`, role: 'tester' }),
          algorithm: alg,
          keyInput: 'strong-local-hmac-secret',
          keyFormat: 'hmac_utf8',
        });
        const ver = await verifyJwtSignature(
          minted.token,
          'strong-local-hmac-secret',
          'hmac_utf8'
        );
        expect(ver.verified).toBe(true);
        expect(ver.algorithm).toBe(alg);
      }

      const octJwk = JSON.stringify({
        kty: 'oct',
        alg: 'HS256',
        k: RFC_HS256_SECRET_BASE64URL,
      });
      const mintedOct = await mintJwt({
        headerJson: '{"alg":"HS256","typ":"JWT"}',
        payloadJson: '{"sub":"oct-user"}',
        algorithm: 'HS256',
        keyInput: octJwk,
        keyFormat: 'jwk',
      });
      const verOctWithUtf8 = await verifyJwtSignature(
        mintedOct.token,
        RFC_HS256_SECRET,
        'hmac_utf8'
      );
      expect(verOctWithUtf8.verified).toBe(true);
      const verOctWithJwk = await verifyJwtSignature(
        mintedOct.token,
        octJwk,
        'jwk'
      );
      expect(verOctWithJwk.verified).toBe(true);
    });
  });

  describe('10. Security Rejections & Algorithm Confusion Guards', () => {
    it('never verifies alg:none / EdDSA, flags missing key, and blocks PEM/RSA keys against HMAC', async () => {
      const noneRes = await verifyJwtSignature(ALG_NONE_TOKEN, 'any-secret', 'hmac_utf8');
      expect(noneRes.verified).toBe(false);
      expect(noneRes.status).toBe('unsupported_alg');

      const mixedNoneRes = await verifyJwtSignature(
        ALG_NONE_MIXED_CASE_TOKEN,
        'any-secret',
        'hmac_utf8'
      );
      expect(mixedNoneRes.verified).toBe(false);
      expect(mixedNoneRes.status).toBe('unsupported_alg');

      const eddsaToken = `${base64UrlEncodeUtf8('{"alg":"EdDSA","typ":"JWT"}')}.${base64UrlEncodeUtf8('{"sub":"1"}')}.sig`;
      const eddsaRes = await verifyJwtSignature(eddsaToken, 'abc', 'pem');
      expect(eddsaRes.verified).toBe(false);
      expect(eddsaRes.status).toBe('unsupported_alg');

      const missingRes = await verifyJwtSignature(RFC_HS256_TOKEN, '   ', 'hmac_utf8');
      expect(missingRes.verified).toBe(false);
      expect(missingRes.status).toBe('missing_key');

      // Algorithm confusion: PEM key or RSA JWK given to verify an HS256 token
      const confusionPem = await verifyJwtSignature(
        RFC_HS256_TOKEN,
        '-----BEGIN PUBLIC KEY-----\nMFkw\n-----END PUBLIC KEY-----',
        'pem'
      );
      expect(confusionPem.verified).toBe(false);
      expect(confusionPem.status).toBe('key_error');

      const confusionRsaJwk = await verifyJwtSignature(
        RFC_HS256_TOKEN,
        JSON.stringify({ kty: 'RSA', n: 'AQAB', e: 'AQAB' }),
        'jwk'
      );
      expect(confusionRsaJwk.verified).toBe(false);
      expect(confusionRsaJwk.status).toBe('key_error');

      // Opposite confusion: hmac_utf8 secret passed for RS256 token
      const rs256Token = `${base64UrlEncodeUtf8('{"alg":"RS256","typ":"JWT"}')}.${base64UrlEncodeUtf8('{"sub":"1"}')}.c2ln`;
      const hmacForRsa = await verifyJwtSignature(rs256Token, 'secret', 'hmac_utf8');
      expect(hmacForRsa.verified).toBe(false);
      expect(hmacForRsa.status).toBe('key_error');
    });
  });

  describe('11. Ephemeral ES256 & ES384 Keypairs, Mint, Verify & Truncation Checks', () => {
    it('mints with PKCS#8 PEM / private JWK, verifies with SPKI PEM / public JWK, rejects tampered/truncated sigs and curve mismatch', async () => {
      const es256Keys = await generateEphemeralKeyPair('ES256');
      expect(es256Keys.publicKeyPem).toContain('BEGIN PUBLIC KEY');
      expect(es256Keys.privateKeyPem).toContain('BEGIN PRIVATE KEY');

      const mintedPem = await mintJwt({
        headerJson: '{"alg":"ES256","typ":"JWT"}',
        payloadJson: '{"sub":"ec-pem","name":"Sofía 🚀"}',
        algorithm: 'ES256',
        keyInput: es256Keys.privateKeyPem,
        keyFormat: 'pem',
      });
      const verPem = await verifyJwtSignature(
        mintedPem.token,
        es256Keys.publicKeyPem,
        'pem'
      );
      expect(verPem.verified).toBe(true);
      expect(verPem.algorithm).toBe('ES256');

      const verJwk = await verifyJwtSignature(
        mintedPem.token,
        es256Keys.publicKeyJwk,
        'jwk'
      );
      expect(verJwk.verified).toBe(true);

      // Tampered payload
      const parts = mintedPem.token.split('.');
      const tamperedPayload = base64UrlEncodeUtf8('{"sub":"ec-pem","name":"Evil"}');
      const tamperedVer = await verifyJwtSignature(
        `${parts[0]}.${tamperedPayload}.${parts[2]}`,
        es256Keys.publicKeyPem,
        'pem'
      );
      expect(tamperedVer.verified).toBe(false);
      expect(tamperedVer.status).toBe('invalid');

      // Truncated ES256 raw R||S signature (< 64 bytes)
      const truncatedSig = base64UrlEncodeBytes(new Uint8Array(63));
      const truncVer = await verifyJwtSignature(
        `${parts[0]}.${parts[1]}.${truncatedSig}`,
        es256Keys.publicKeyPem,
        'pem'
      );
      expect(truncVer.verified).toBe(false);
      expect(truncVer.status).toBe('invalid');

      // ES384 Mint via private JWK + Verify + Truncated check + Mismatched curve
      const es384Keys = await generateEphemeralKeyPair('ES384');
      const minted384 = await mintJwt({
        headerJson: '{"alg":"ES384","typ":"JWT"}',
        payloadJson: '{"sub":"ec-384"}',
        algorithm: 'ES384',
        keyInput: es384Keys.privateKeyJwk,
        keyFormat: 'jwk',
      });
      const ver384 = await verifyJwtSignature(
        minted384.token,
        es384Keys.publicKeyPem,
        'pem'
      );
      expect(ver384.verified).toBe(true);

      const parts384 = minted384.token.split('.');
      const trunc384 = await verifyJwtSignature(
        `${parts384[0]}.${parts384[1]}.${base64UrlEncodeBytes(new Uint8Array(95))}`,
        es384Keys.publicKeyPem,
        'pem'
      );
      expect(trunc384.verified).toBe(false);
      expect(trunc384.status).toBe('invalid');

      const mismatchCurve = await verifyJwtSignature(
        mintedPem.token,
        es384Keys.publicKeyJwk,
        'jwk'
      );
      expect(mismatchCurve.verified).toBe(false);
      expect(mismatchCurve.status).toBe('key_error');
    });
  });

  describe('12. Ephemeral RS256 & PS256 Roundtrips, Private-JWK Strip & PEM/Mint Errors', () => {
    it('mints and verifies RS256 and PS256, accepts full private JWK for verify safely, and rejects PKCS#1/bad JSON', async () => {
      for (const alg of ['RS256', 'PS256'] as const) {
        const keys = await generateEphemeralKeyPair(alg);
        const minted = await mintJwt({
          headerJson: JSON.stringify({ alg, typ: 'JWT' }),
          payloadJson: JSON.stringify({ sub: `rsa-${alg}` }),
          algorithm: alg,
          keyInput: keys.privateKeyPem,
          keyFormat: 'pem',
        });

        const verSpki = await verifyJwtSignature(
          minted.token,
          keys.publicKeyPem,
          'pem'
        );
        expect(verSpki.verified).toBe(true);

        // Passing private JWK directly during verification strips private fields & key_ops and succeeds
        const verFromPrivJwk = await verifyJwtSignature(
          minted.token,
          keys.privateKeyJwk,
          'jwk'
        );
        expect(verFromPrivJwk.verified).toBe(true);
      }

      const rsKeys = await generateEphemeralKeyPair('RS256');
      const rsToken = await mintJwt({
        headerJson: '{"alg":"RS256"}',
        payloadJson: '{"sub":"pkcs1-check"}',
        algorithm: 'RS256',
        keyInput: rsKeys.privateKeyPem,
        keyFormat: 'pem',
      });
      const pkcs1Ver = await verifyJwtSignature(
        rsToken.token,
        MALFORMED_PKCS1_PEM,
        'pem'
      );
      expect(pkcs1Ver.verified).toBe(false);
      expect(pkcs1Ver.status).toBe('key_error');
      expect(pkcs1Ver.error).toMatch(/SPKI|PKCS#1|BEGIN PUBLIC KEY/i);

      await expect(
        mintJwt({
          headerJson: '{"alg":"HS256"}',
          payloadJson: 'not json',
          algorithm: 'HS256',
          keyInput: 'secret',
          keyFormat: 'hmac_utf8',
        })
      ).rejects.toThrow(/JSON/i);

      await expect(
        mintJwt({
          headerJson: '{"alg":"HS256"}',
          payloadJson: '["not-an-object"]',
          algorithm: 'HS256',
          keyInput: 'secret',
          keyFormat: 'hmac_utf8',
        })
      ).rejects.toThrow(/object/i);
    });
  });

  describe('13. Zero-Network & Zero-Storage Privacy Audit', () => {
    it('performs zero fetch/network calls and zero localStorage/sessionStorage writes across all operations', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const localSetSpy = vi.spyOn(Storage.prototype, 'setItem');

      try {
        decodeJwt(RFC_HS256_TOKEN, FIXED_NOW_SECONDS);
        await verifyJwtSignature(RFC_HS256_TOKEN, RFC_HS256_SECRET, 'hmac_utf8');
        const kp = await generateEphemeralKeyPair('ES256');
        await mintJwt({
          headerJson: '{"alg":"ES256","typ":"JWT"}',
          payloadJson: '{"sub":"privacy-audit"}',
          algorithm: 'ES256',
          keyInput: kp.privateKeyPem,
          keyFormat: 'pem',
        });

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(localSetSpy).not.toHaveBeenCalled();
      } finally {
        fetchSpy.mockRestore();
        localSetSpy.mockRestore();
      }
    });
  });
});
