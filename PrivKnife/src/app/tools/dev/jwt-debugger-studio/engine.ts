import {
  AsymmetricJwtAlgorithm,
  DecodedJwtResult,
  GeneratedKeyPair,
  HmacJwtAlgorithm,
  JwtClaimAnnotation,
  JwtVerificationResult,
  KeyInputFormat,
  MAX_JWT_INPUT_LENGTH,
  MintJwtOptions,
  MintedJwtResult,
  SUPPORTED_JWT_ALGORITHMS,
  SupportedJwtAlgorithm,
} from './types';

export interface Base64DecodeOptions {
  allowStandardBase64?: boolean;
  allowPadding?: boolean;
  allowEmpty?: boolean;
}

export interface Base64DecodeResult {
  bytes: Uint8Array;
  hadPadding: boolean;
}

export interface Base64Utf8DecodeResult {
  text: string;
  hadPadding: boolean;
}

const MAX_IAT_FUTURE_SKEW_SECONDS = 300;
const BASE64_CHUNK_SIZE = 8192;

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

export function normalizeTokenInput(raw: string): string {
  if (typeof raw !== 'string') {
    return '';
  }
  return raw.trim().replace(/^bearer\s+/i, '').trim();
}

export function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_SIZE) {
    const end = Math.min(offset + BASE64_CHUNK_SIZE, bytes.length);
    for (let i = offset; i < end; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function base64UrlDecodeBytes(
  input: string,
  options: Base64DecodeOptions = {}
): Base64DecodeResult {
  const allowStandardBase64 = options.allowStandardBase64 ?? false;
  const allowPadding = options.allowPadding ?? false;
  const allowEmpty = options.allowEmpty ?? false;

  if (input.length === 0) {
    if (allowEmpty) {
      return { bytes: new Uint8Array(0), hadPadding: false };
    }
    throw new Error('Empty Base64Url segment');
  }

  if (!allowStandardBase64 && (input.includes('+') || input.includes('/'))) {
    throw new Error('Invalid character in Base64Url input: "+" and "/" are not allowed');
  }

  const eqIndex = input.indexOf('=');
  const hadPadding = eqIndex !== -1;

  if (hadPadding && !allowPadding) {
    throw new Error('Unexpected "=" padding in Base64Url segment');
  }

  const allowedPattern = allowStandardBase64
    ? /^[A-Za-z0-9\-_+/]+={0,2}$/
    : /^[A-Za-z0-9\-_]+={0,2}$/;

  if (!allowedPattern.test(input)) {
    throw new Error('Invalid character in Base64Url input');
  }

  const stripped = input.replace(/=+$/, '');
  if (stripped.length % 4 === 1) {
    throw new Error('Invalid Base64Url segment length');
  }

  const padLen = (4 - (stripped.length % 4)) % 4;
  const standardBase64 =
    stripped.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen);

  let binary: string;
  try {
    binary = atob(standardBase64);
  } catch {
    throw new Error('Malformed Base64Url encoding');
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { bytes, hadPadding };
}

export function base64UrlEncodeUtf8(text: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(text));
}

export function base64UrlDecodeUtf8(
  input: string,
  options: { allowPadding?: boolean } = {}
): Base64Utf8DecodeResult {
  const { bytes, hadPadding } = base64UrlDecodeBytes(input, {
    allowStandardBase64: false,
    allowPadding: options.allowPadding ?? false,
    allowEmpty: false,
  });

  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    return { text: decoder.decode(bytes), hadPadding };
  } catch {
    throw new Error('Segment contains invalid UTF-8 byte sequence');
  }
}

function parsePlainJsonObject(jsonText: string, label: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Invalid JSON in JWT ${label}`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`JWT ${label} must be a JSON object`);
  }

  return parsed as Record<string, unknown>;
}

function formatDurationDelta(absSeconds: number): string {
  const total = Math.max(0, Math.floor(absSeconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function formatUnixTimestamp(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString().replace('.000Z', 'Z');
}

function auditClaims(
  payload: Record<string, unknown>,
  nowSeconds: number
): { claims: JwtClaimAnnotation[]; missingExp: boolean } {
  const claims: JwtClaimAnnotation[] = [];
  const hasOwn = (key: string) => Object.prototype.hasOwnProperty.call(payload, key);

  if (hasOwn('iss')) {
    claims.push({
      claim: 'iss',
      labelKey: 'tools.jwtDebuggerStudio.claimIss',
      rawValue: payload['iss'],
      formattedValue: String(payload['iss']),
    });
  }

  if (hasOwn('sub')) {
    claims.push({
      claim: 'sub',
      labelKey: 'tools.jwtDebuggerStudio.claimSub',
      rawValue: payload['sub'],
      formattedValue: String(payload['sub']),
    });
  }

  if (hasOwn('aud')) {
    const rawAud = payload['aud'];
    claims.push({
      claim: 'aud',
      labelKey: 'tools.jwtDebuggerStudio.claimAud',
      rawValue: rawAud,
      formattedValue: Array.isArray(rawAud) ? rawAud.join(', ') : String(rawAud),
    });
  }

  const missingExp = !hasOwn('exp');
  if (!missingExp) {
    const rawExp = payload['exp'];
    if (typeof rawExp !== 'number' || !Number.isFinite(rawExp)) {
      claims.push({
        claim: 'exp',
        labelKey: 'tools.jwtDebuggerStudio.claimExp',
        rawValue: rawExp,
        formattedValue: 'Invalid numeric exp timestamp',
        status: 'warning',
      });
    } else if (rawExp <= nowSeconds) {
      claims.push({
        claim: 'exp',
        labelKey: 'tools.jwtDebuggerStudio.claimExp',
        rawValue: rawExp,
        formattedValue: `${formatUnixTimestamp(rawExp)} (Expired ${formatDurationDelta(
          nowSeconds - rawExp
        )} ago)`,
        status: 'expired',
      });
    } else {
      claims.push({
        claim: 'exp',
        labelKey: 'tools.jwtDebuggerStudio.claimExp',
        rawValue: rawExp,
        formattedValue: `${formatUnixTimestamp(rawExp)} (Valid for ${formatDurationDelta(
          rawExp - nowSeconds
        )})`,
        status: 'valid',
      });
    }
  }

  if (hasOwn('nbf')) {
    const rawNbf = payload['nbf'];
    if (typeof rawNbf !== 'number' || !Number.isFinite(rawNbf)) {
      claims.push({
        claim: 'nbf',
        labelKey: 'tools.jwtDebuggerStudio.claimNbf',
        rawValue: rawNbf,
        formattedValue: 'Invalid numeric nbf timestamp',
        status: 'warning',
      });
    } else if (nowSeconds < rawNbf) {
      claims.push({
        claim: 'nbf',
        labelKey: 'tools.jwtDebuggerStudio.claimNbf',
        rawValue: rawNbf,
        formattedValue: `${formatUnixTimestamp(rawNbf)} (Not valid for ${formatDurationDelta(
          rawNbf - nowSeconds
        )})`,
        status: 'not_yet_valid',
      });
    } else {
      claims.push({
        claim: 'nbf',
        labelKey: 'tools.jwtDebuggerStudio.claimNbf',
        rawValue: rawNbf,
        formattedValue: `${formatUnixTimestamp(rawNbf)} (Active)`,
        status: 'valid',
      });
    }
  }

  if (hasOwn('iat')) {
    const rawIat = payload['iat'];
    if (typeof rawIat !== 'number' || !Number.isFinite(rawIat)) {
      claims.push({
        claim: 'iat',
        labelKey: 'tools.jwtDebuggerStudio.claimIat',
        rawValue: rawIat,
        formattedValue: 'Invalid numeric iat timestamp',
        status: 'warning',
      });
    } else if (rawIat > nowSeconds + MAX_IAT_FUTURE_SKEW_SECONDS) {
      claims.push({
        claim: 'iat',
        labelKey: 'tools.jwtDebuggerStudio.claimIat',
        rawValue: rawIat,
        formattedValue: `${formatUnixTimestamp(rawIat)} (Clock skew: ${formatDurationDelta(
          rawIat - nowSeconds
        )} in the future)`,
        status: 'warning',
      });
    } else {
      claims.push({
        claim: 'iat',
        labelKey: 'tools.jwtDebuggerStudio.claimIat',
        rawValue: rawIat,
        formattedValue: formatUnixTimestamp(rawIat),
        status: 'valid',
      });
    }
  }

  if (hasOwn('jti')) {
    claims.push({
      claim: 'jti',
      labelKey: 'tools.jwtDebuggerStudio.claimJti',
      rawValue: payload['jti'],
      formattedValue: String(payload['jti']),
    });
  }

  return { claims, missingExp };
}

export function decodeJwt(
  rawToken: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): DecodedJwtResult {
  const normalizedToken = normalizeTokenInput(rawToken);
  if (!normalizedToken) {
    return {
      validStructure: false,
      normalizedToken: '',
      headerRaw: '',
      payloadRaw: '',
      signatureRaw: '',
      claims: [],
      securityWarnings: [],
      error: 'Enter a JWT string to decode.',
    };
  }

  if (normalizedToken.length > MAX_JWT_INPUT_LENGTH) {
    return {
      validStructure: false,
      normalizedToken,
      headerRaw: '',
      payloadRaw: '',
      signatureRaw: '',
      claims: [],
      securityWarnings: [],
      error: `JWT input exceeds the maximum allowed size limit of ${MAX_JWT_INPUT_LENGTH} characters.`,
    };
  }

  const segments = normalizedToken.split('.');
  if (segments.length === 5) {
    return {
      validStructure: false,
      normalizedToken,
      headerRaw: segments[0] ?? '',
      payloadRaw: '',
      signatureRaw: '',
      claims: [],
      securityWarnings: [],
      error: 'Input appears to be a 5-part JWE (encrypted token); only 3-part JWS tokens are supported.',
    };
  }

  if (segments.length !== 3) {
    return {
      validStructure: false,
      normalizedToken,
      headerRaw: segments[0] ?? '',
      payloadRaw: segments[1] ?? '',
      signatureRaw: segments[2] ?? '',
      claims: [],
      securityWarnings: [],
      error: 'Invalid JWT format: expected exactly 3 dot-separated segments (Header.Payload.Signature).',
    };
  }

  const [headerRaw, payloadRaw, signatureRaw] = segments;

  try {
    const decodedHeader = base64UrlDecodeUtf8(headerRaw, { allowPadding: true });
    const header = parsePlainJsonObject(decodedHeader.text, 'header');

    const decodedPayload = base64UrlDecodeUtf8(payloadRaw, { allowPadding: true });
    const payload = parsePlainJsonObject(decodedPayload.text, 'payload');

    const decodedSignature = base64UrlDecodeBytes(signatureRaw, {
      allowStandardBase64: false,
      allowPadding: true,
      allowEmpty: true,
    });

    const securityWarnings: string[] = [];
    if (
      decodedHeader.hadPadding ||
      decodedPayload.hadPadding ||
      decodedSignature.hadPadding
    ) {
      securityWarnings.push(
        'Non-canonical Base64Url "=" trailing padding detected; strict verifiers may reject this token.'
      );
    }

    const algorithm =
      typeof header['alg'] === 'string' ? header['alg'] : undefined;

    if (!algorithm) {
      securityWarnings.push('Header is missing required "alg" (Algorithm) parameter.');
    } else if (algorithm.toLowerCase() === 'none') {
      securityWarnings.push(
        'Critical security risk: Token specifies "alg": "none" (unsigned / signature verification bypassed).'
      );
      if (signatureRaw.length > 0) {
        securityWarnings.push(
          'Token with "alg": "none" carries a non-empty signature segment.'
        );
      }
    } else if (signatureRaw.length === 0) {
      securityWarnings.push(
        `Signed algorithm "${algorithm}" has an empty signature segment.`
      );
    }

    for (const riskyHeader of ['jku', 'x5u', 'jwk'] as const) {
      if (Object.prototype.hasOwnProperty.call(header, riskyHeader)) {
        securityWarnings.push(
          `Header contains "${riskyHeader}"; ignored during verification to prevent SSRF or untrusted key injection.`
        );
      }
    }

    if (Object.prototype.hasOwnProperty.call(header, 'crit')) {
      securityWarnings.push(
        'Header declares critical extensions ("crit") requiring explicit verifier handling.'
      );
    }

    const { claims, missingExp } = auditClaims(payload, nowSeconds);
    if (missingExp) {
      securityWarnings.push(
        'Payload does not define an "exp" (Expiration Time) claim.'
      );
    }

    return {
      validStructure: true,
      normalizedToken,
      headerRaw,
      payloadRaw,
      signatureRaw,
      header,
      payload,
      algorithm,
      claims,
      securityWarnings,
    };
  } catch (err) {
    return {
      validStructure: false,
      normalizedToken,
      headerRaw,
      payloadRaw,
      signatureRaw,
      claims: [],
      securityWarnings: [],
      error: err instanceof Error ? err.message : 'Failed to decode JWT segments.',
    };
  }
}

export function buildBearerHeader(token: string): string {
  return `Authorization: Bearer ${normalizeTokenInput(token)}`;
}

function escapeSingleQuotedShell(value: string): string {
  return value.replace(/[\r\n]/g, '').replace(/'/g, "'\\''");
}

export function buildCurlSnippet(
  token: string,
  url = 'https://api.example.local/protected'
): string {
  const safeToken = escapeSingleQuotedShell(normalizeTokenInput(token));
  const safeUrl = escapeSingleQuotedShell(url);
  return `curl -H 'Authorization: Bearer ${safeToken}' '${safeUrl}'`;
}

export function buildDecodedExportJson(decoded: DecodedJwtResult): string {
  return JSON.stringify(
    {
      validStructure: decoded.validStructure,
      algorithm: decoded.algorithm ?? null,
      header: decoded.header ?? null,
      payload: decoded.payload ?? null,
      claims: decoded.claims,
      securityWarnings: decoded.securityWarnings,
      error: decoded.error ?? null,
    },
    null,
    2
  );
}

interface WebCryptoJwtConfig {
  family: 'hmac' | 'rsa' | 'ec';
  importAlg: HmacImportParams | RsaHashedImportParams | EcKeyImportParams;
  opAlg: AlgorithmIdentifier | RsaPssParams | EcdsaParams;
  expectedKty: 'oct' | 'RSA' | 'EC';
  expectedCrv?: 'P-256' | 'P-384';
  expectedSigBytes?: number;
  rsaModulusLength?: number;
  rsaHash?: 'SHA-256' | 'SHA-384' | 'SHA-512';
}

const JWT_ALG_CONFIG: Record<SupportedJwtAlgorithm, WebCryptoJwtConfig> = {
  HS256: {
    family: 'hmac',
    importAlg: { name: 'HMAC', hash: 'SHA-256' },
    opAlg: { name: 'HMAC' },
    expectedKty: 'oct',
  },
  HS384: {
    family: 'hmac',
    importAlg: { name: 'HMAC', hash: 'SHA-384' },
    opAlg: { name: 'HMAC' },
    expectedKty: 'oct',
  },
  HS512: {
    family: 'hmac',
    importAlg: { name: 'HMAC', hash: 'SHA-512' },
    opAlg: { name: 'HMAC' },
    expectedKty: 'oct',
  },
  RS256: {
    family: 'rsa',
    importAlg: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    opAlg: { name: 'RSASSA-PKCS1-v1_5' },
    expectedKty: 'RSA',
    rsaModulusLength: 2048,
    rsaHash: 'SHA-256',
  },
  RS384: {
    family: 'rsa',
    importAlg: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-384' },
    opAlg: { name: 'RSASSA-PKCS1-v1_5' },
    expectedKty: 'RSA',
    rsaModulusLength: 2048,
    rsaHash: 'SHA-384',
  },
  RS512: {
    family: 'rsa',
    importAlg: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' },
    opAlg: { name: 'RSASSA-PKCS1-v1_5' },
    expectedKty: 'RSA',
    rsaModulusLength: 2048,
    rsaHash: 'SHA-512',
  },
  PS256: {
    family: 'rsa',
    importAlg: { name: 'RSA-PSS', hash: 'SHA-256' },
    opAlg: { name: 'RSA-PSS', saltLength: 32 },
    expectedKty: 'RSA',
    rsaModulusLength: 2048,
    rsaHash: 'SHA-256',
  },
  ES256: {
    family: 'ec',
    importAlg: { name: 'ECDSA', namedCurve: 'P-256' },
    opAlg: { name: 'ECDSA', hash: 'SHA-256' },
    expectedKty: 'EC',
    expectedCrv: 'P-256',
    expectedSigBytes: 64,
  },
  ES384: {
    family: 'ec',
    importAlg: { name: 'ECDSA', namedCurve: 'P-384' },
    opAlg: { name: 'ECDSA', hash: 'SHA-384' },
    expectedKty: 'EC',
    expectedCrv: 'P-384',
    expectedSigBytes: 96,
  },
};

export function isSupportedJwtAlgorithm(
  alg: string | undefined
): alg is SupportedJwtAlgorithm {
  return typeof alg === 'string' && SUPPORTED_JWT_ALGORITHMS.includes(alg as SupportedJwtAlgorithm);
}

export function isHmacAlgorithm(
  alg: SupportedJwtAlgorithm
): alg is HmacJwtAlgorithm {
  return alg === 'HS256' || alg === 'HS384' || alg === 'HS512';
}

function getSubtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error('Web Crypto API (crypto.subtle) is unavailable in this environment.');
  }
  return subtle;
}

export function pemToDerBytes(
  pem: string,
  expectedType: 'PUBLIC KEY' | 'PRIVATE KEY'
): ArrayBuffer {
  const normalized = pem.replace(/\r\n/g, '\n').trim();
  if (
    expectedType === 'PUBLIC KEY' &&
    (normalized.includes('BEGIN RSA PUBLIC KEY') ||
      normalized.includes('BEGIN EC PUBLIC KEY'))
  ) {
    throw new Error(
      'Legacy PKCS#1 / SEC1 PEM format is unsupported by Web Crypto; convert to SPKI (BEGIN PUBLIC KEY) or paste JWK JSON.'
    );
  }
  if (
    expectedType === 'PRIVATE KEY' &&
    (normalized.includes('BEGIN RSA PRIVATE KEY') ||
      normalized.includes('BEGIN EC PRIVATE KEY'))
  ) {
    throw new Error(
      'Legacy PKCS#1 / SEC1 private PEM format is unsupported by Web Crypto; convert to PKCS#8 (BEGIN PRIVATE KEY) or paste JWK JSON.'
    );
  }

  const blockMatch = /-----BEGIN ([A-Z0-9 ]+)-----\s*([\s\S]*?)\s*-----END \1-----/.exec(
    normalized
  );
  if (!blockMatch) {
    throw new Error(
      `Invalid PEM formatting: expected -----BEGIN ${expectedType}----- ... -----END ${expectedType}-----.`
    );
  }

  const foundLabel = blockMatch[1].trim();
  if (foundLabel !== expectedType) {
    throw new Error(
      `PEM key type mismatch: expected "${expectedType}", found "${foundLabel}".`
    );
  }

  const base64Body = blockMatch[2].replace(/\s+/g, '');
  if (!base64Body) {
    throw new Error('PEM key body is empty.');
  }

  const decoded = base64UrlDecodeBytes(base64Body, {
    allowStandardBase64: true,
    allowPadding: true,
    allowEmpty: false,
  });
  return toArrayBuffer(decoded.bytes);
}

export function derBytesToPem(
  der: ArrayBuffer,
  label: 'PUBLIC KEY' | 'PRIVATE KEY'
): string {
  const bytes = new Uint8Array(der);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_SIZE) {
    const end = Math.min(offset + BASE64_CHUNK_SIZE, bytes.length);
    for (let i = offset; i < end; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
  }
  const b64 = btoa(binary);
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += 64) {
    lines.push(b64.slice(i, i + 64));
  }
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----`;
}

function parseAndPrepareJwk(
  keyInput: string,
  algorithm: SupportedJwtAlgorithm,
  cfg: WebCryptoJwtConfig,
  usage: 'sign' | 'verify'
): JsonWebKey {
  const parsed = parsePlainJsonObject(keyInput, 'JWK');
  const kty = parsed['kty'];
  if (kty !== cfg.expectedKty) {
    throw new Error(
      `Algorithm confusion guard: JWK key type "${String(kty)}" is incompatible with ${algorithm}.`
    );
  }

  const jwkAlg = parsed['alg'];
  if (typeof jwkAlg === 'string' && jwkAlg !== algorithm) {
    throw new Error(
      `JWK algorithm "${jwkAlg}" does not match token algorithm "${algorithm}".`
    );
  }

  if (cfg.expectedCrv && parsed['crv'] !== cfg.expectedCrv) {
    throw new Error(
      `EC JWK curve "${String(parsed['crv'])}" does not match expected "${cfg.expectedCrv}" for ${algorithm}.`
    );
  }

  const privateOnlyFields = new Set([
    'd',
    'p',
    'q',
    'dp',
    'dq',
    'qi',
    'oth',
  ]);
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (key === 'key_ops' || key === 'ext' || key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    if (usage === 'verify' && cfg.family !== 'hmac' && privateOnlyFields.has(key)) {
      continue;
    }
    clean[key] = value;
  }

  if (usage === 'sign') {
    if (cfg.family === 'hmac' && typeof clean['k'] !== 'string') {
      throw new Error('Symmetric "oct" JWK must contain base64url secret parameter "k".');
    }
    if (cfg.family !== 'hmac' && typeof clean['d'] !== 'string') {
      throw new Error('Signing with JWK requires a private JWK containing parameter "d".');
    }
  }

  return clean as JsonWebKey;
}

async function importCryptoKeyForJwt(
  algorithm: SupportedJwtAlgorithm,
  keyInput: string,
  keyFormat: KeyInputFormat,
  usage: 'sign' | 'verify'
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const cfg = JWT_ALG_CONFIG[algorithm];

  if (cfg.family === 'hmac' && keyFormat === 'pem') {
    throw new Error(
      `Algorithm confusion guard: PEM asymmetric keys cannot be used with HMAC (${algorithm}).`
    );
  }

  if (cfg.family !== 'hmac' && (keyFormat === 'hmac_utf8' || keyFormat === 'hmac_base64url')) {
    throw new Error(
      `Algorithm confusion guard: HMAC secret format cannot be used with asymmetric algorithm ${algorithm}.`
    );
  }

  switch (keyFormat) {
    case 'hmac_utf8': {
      const secretBytes = new TextEncoder().encode(keyInput);
      return subtle.importKey('raw', toArrayBuffer(secretBytes), cfg.importAlg, false, [usage]);
    }
    case 'hmac_base64url': {
      const decoded = base64UrlDecodeBytes(keyInput.trim(), {
        allowStandardBase64: true,
        allowPadding: true,
        allowEmpty: false,
      });
      return subtle.importKey('raw', toArrayBuffer(decoded.bytes), cfg.importAlg, false, [usage]);
    }
    case 'pem': {
      const pemType = usage === 'verify' ? 'PUBLIC KEY' : 'PRIVATE KEY';
      const keyFormatWebCrypto = usage === 'verify' ? 'spki' : 'pkcs8';
      const der = pemToDerBytes(keyInput, pemType);
      return subtle.importKey(keyFormatWebCrypto, der, cfg.importAlg, false, [usage]);
    }
    case 'jwk': {
      const jwk = parseAndPrepareJwk(keyInput, algorithm, cfg, usage);
      return subtle.importKey('jwk', jwk, cfg.importAlg, false, [usage]);
    }
  }
}

export async function verifyJwtSignature(
  rawToken: string,
  keyInput: string,
  keyFormat: KeyInputFormat
): Promise<JwtVerificationResult> {
  const decoded = decodeJwt(rawToken);
  if (!decoded.validStructure) {
    return {
      verified: false,
      status: 'key_error',
      algorithm: decoded.algorithm ?? 'unknown',
      error: decoded.error ?? 'Invalid JWT structure.',
    };
  }

  const alg = decoded.algorithm ?? '';
  if (alg.toLowerCase() === 'none') {
    return {
      verified: false,
      status: 'unsupported_alg',
      algorithm: alg,
      error: 'Insecure "alg": "none" tokens are never cryptographically verified.',
    };
  }

  if (!isSupportedJwtAlgorithm(alg)) {
    return {
      verified: false,
      status: 'unsupported_alg',
      algorithm: alg || 'unknown',
      error: `Algorithm "${alg || 'missing'}" is not supported.`,
    };
  }

  if (!keyInput || keyInput.trim().length === 0) {
    return {
      verified: false,
      status: 'missing_key',
      algorithm: alg,
      error: 'Enter a verification secret, PEM public key, or JWK.',
    };
  }

  const cfg = JWT_ALG_CONFIG[alg];
  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await importCryptoKeyForJwt(alg, keyInput, keyFormat, 'verify');
  } catch (err) {
    return {
      verified: false,
      status: 'key_error',
      algorithm: alg,
      error: err instanceof Error ? err.message : 'Failed to parse or import verification key.',
    };
  }

  try {
    const sigDecoded = base64UrlDecodeBytes(decoded.signatureRaw, {
      allowStandardBase64: false,
      allowPadding: true,
      allowEmpty: true,
    });

    if (sigDecoded.bytes.length === 0) {
      return {
        verified: false,
        status: 'invalid',
        algorithm: alg,
        error: 'Signature segment is empty.',
      };
    }

    if (
      cfg.expectedSigBytes !== undefined &&
      sigDecoded.bytes.length !== cfg.expectedSigBytes
    ) {
      return {
        verified: false,
        status: 'invalid',
        algorithm: alg,
        error: `Invalid ${alg} signature length: expected ${cfg.expectedSigBytes} bytes, received ${sigDecoded.bytes.length}.`,
      };
    }

    const subtle = getSubtleCrypto();
    const signingInputBytes = new TextEncoder().encode(
      `${decoded.headerRaw}.${decoded.payloadRaw}`
    );
    const verified = await subtle.verify(
      cfg.opAlg,
      cryptoKey,
      toArrayBuffer(sigDecoded.bytes),
      toArrayBuffer(signingInputBytes)
    );

    return {
      verified,
      status: verified ? 'valid' : 'invalid',
      algorithm: alg,
    };
  } catch (err) {
    return {
      verified: false,
      status: 'invalid',
      algorithm: alg,
      error: err instanceof Error ? err.message : 'Signature verification failed.',
    };
  }
}

export async function mintJwt(options: MintJwtOptions): Promise<MintedJwtResult> {
  if (!isSupportedJwtAlgorithm(options.algorithm)) {
    throw new Error(`Unsupported JWT signing algorithm "${String(options.algorithm)}".`);
  }

  if (!options.keyInput || options.keyInput.trim().length === 0) {
    throw new Error('A signing secret or private key is required to mint a token.');
  }

  const headerObj = parsePlainJsonObject(options.headerJson, 'header');
  const payloadObj = parsePlainJsonObject(options.payloadJson, 'payload');

  const canonicalHeader: Record<string, unknown> = {
    ...headerObj,
    alg: options.algorithm,
    typ:
      typeof headerObj['typ'] === 'string' && headerObj['typ'].length > 0
        ? headerObj['typ']
        : 'JWT',
  };

  const signingKey = await importCryptoKeyForJwt(
    options.algorithm,
    options.keyInput,
    options.keyFormat,
    'sign'
  );

  const headerRaw = base64UrlEncodeUtf8(JSON.stringify(canonicalHeader));
  const payloadRaw = base64UrlEncodeUtf8(JSON.stringify(payloadObj));
  const signingInput = `${headerRaw}.${payloadRaw}`;
  const signingBytes = new TextEncoder().encode(signingInput);

  const cfg = JWT_ALG_CONFIG[options.algorithm];
  const subtle = getSubtleCrypto();
  const signatureBuffer = await subtle.sign(
    cfg.opAlg,
    signingKey,
    toArrayBuffer(signingBytes)
  );
  const signatureRaw = base64UrlEncodeBytes(new Uint8Array(signatureBuffer));

  return {
    token: `${signingInput}.${signatureRaw}`,
    headerRaw,
    payloadRaw,
    signatureRaw,
    algorithm: options.algorithm,
  };
}

export async function generateEphemeralKeyPair(
  algorithm: AsymmetricJwtAlgorithm
): Promise<GeneratedKeyPair> {
  const subtle = getSubtleCrypto();
  const cfg = JWT_ALG_CONFIG[algorithm];

  let keyPair: CryptoKeyPair;
  if (cfg.family === 'rsa') {
    const rsaParams: RsaHashedKeyGenParams = {
      name: cfg.importAlg.name,
      modulusLength: cfg.rsaModulusLength ?? 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: cfg.rsaHash ?? 'SHA-256',
    };
    keyPair = (await subtle.generateKey(rsaParams, true, ['sign', 'verify'])) as CryptoKeyPair;
  } else {
    const ecParams: EcKeyGenParams = {
      name: 'ECDSA',
      namedCurve: cfg.expectedCrv ?? 'P-256',
    };
    keyPair = (await subtle.generateKey(ecParams, true, ['sign', 'verify'])) as CryptoKeyPair;
  }

  const [spkiDer, pkcs8Der, rawPublicJwk, rawPrivateJwk] = await Promise.all([
    subtle.exportKey('spki', keyPair.publicKey),
    subtle.exportKey('pkcs8', keyPair.privateKey),
    subtle.exportKey('jwk', keyPair.publicKey),
    subtle.exportKey('jwk', keyPair.privateKey),
  ]);

  const normalizedPublicJwk: JsonWebKey = {
    ...rawPublicJwk,
    alg: algorithm,
    key_ops: ['verify'],
  };
  const normalizedPrivateJwk: JsonWebKey = {
    ...rawPrivateJwk,
    alg: algorithm,
    key_ops: ['sign'],
  };

  return {
    algorithm,
    publicKeyPem: derBytesToPem(spkiDer, 'PUBLIC KEY'),
    privateKeyPem: derBytesToPem(pkcs8Der, 'PRIVATE KEY'),
    publicKeyJwk: JSON.stringify(normalizedPublicJwk, null, 2),
    privateKeyJwk: JSON.stringify(normalizedPrivateJwk, null, 2),
  };
}
