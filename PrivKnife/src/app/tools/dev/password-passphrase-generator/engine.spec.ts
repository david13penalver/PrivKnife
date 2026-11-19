import { describe, expect, it, vi } from 'vitest';
import {
  auditPasswordStrength,
  exportCredentialsCsv,
  exportCredentialsEnv,
  exportCredentialsTxt,
  generateCredentials,
  generateDevSecret,
  generateDicewarePassphrase,
  generateRandomPassword,
  secureRandomInt,
  secureShuffle,
  tokenizePasswordForDisplay,
} from './engine';
import {
  createSequenceRandomSource,
  DEV_HEX_256_OPTIONS,
  PASSPHRASE_FIXTURE_OPTIONS,
  SAMPLE_AUDITOR_PASSWORDS,
  STRICT_NO_AMBIGUOUS_OPTIONS,
} from './test-fixtures';
import {
  AMBIGUOUS_CHARS,
  CROCKFORD_BASE32_CHARS,
  DEFAULT_PASSWORD_OPTIONS,
  LOWERCASE_CHARS,
  NUMBER_CHARS,
  UPPERCASE_CHARS,
} from './types';
import { EFF_SHORT_WORDLIST } from './wordlist';

describe('Password, Passphrase & API Key Engine (Spec 120 — Seam 1A)', () => {
  it('bundles exactly 1,296 unique lowercase EFF short words (3-8 ASCII letters)', () => {
    expect(EFF_SHORT_WORDLIST.length).toBe(1296);
    const unique = new Set(EFF_SHORT_WORDLIST);
    expect(unique.size).toBe(1296);
    for (const word of EFF_SHORT_WORDLIST) {
      expect(word).toMatch(/^[a-z]{3,8}$/);
    }
  });

  it('uses Web Crypto CSPRNG with rejection sampling and never calls Math.random()', () => {
    const mathRandomSpy = vi.spyOn(Math, 'random');
    const getRandomValuesSpy = vi.spyOn(globalThis.crypto, 'getRandomValues');

    try {
      const pw = generateRandomPassword(DEFAULT_PASSWORD_OPTIONS);
      const phrase = generateDicewarePassphrase(PASSPHRASE_FIXTURE_OPTIONS);
      const secret = generateDevSecret(DEV_HEX_256_OPTIONS);

      expect(pw.success).toBe(true);
      expect(phrase.success).toBe(true);
      expect(secret.success).toBe(true);
      expect(mathRandomSpy).not.toHaveBeenCalled();
      expect(getRandomValuesSpy).toHaveBeenCalled();
    } finally {
      mathRandomSpy.mockRestore();
      getRandomValuesSpy.mockRestore();
    }
  });

  it('rejects modulo-biased tail values in secureRandomInt and validates bounds', () => {
    // 0x100000000 % 7 === 4 -> limit === 0xFFFFFFFC (values >= 0xFFFFFFFC must be rejected)
    const biasedSource = createSequenceRandomSource([
      0xffffffff,
      0xfffffffe,
      0xfffffffd,
      0xfffffffc,
      9,
    ]);
    const spy = vi.spyOn(biasedSource, 'getRandomValues');
    const picked = secureRandomInt(7, biasedSource);
    expect(picked).toBe(2); // 9 % 7 === 2
    expect(spy).toHaveBeenCalledTimes(5);

    expect(secureRandomInt(1, biasedSource)).toBe(0);
    expect(() => secureRandomInt(0, biasedSource)).toThrow(RangeError);
    expect(() => secureRandomInt(-3, biasedSource)).toThrow(RangeError);
    expect(() => secureRandomInt(2.5, biasedSource)).toThrow(RangeError);
    expect(() => secureRandomInt(0x100000001, biasedSource)).toThrow(RangeError);
  });

  it('shuffles arrays cleanly via unbiased Fisher-Yates secureShuffle', () => {
    expect(secureShuffle([])).toEqual([]);
    expect(secureShuffle(['only'])).toEqual(['only']);

    const source = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const shuffled = secureShuffle([...source]);
    expect(shuffled).toHaveLength(source.length);
    expect([...shuffled].sort()).toEqual([...source].sort());
  });

  it('enforces ambiguous exclusion and every enabled char class across 200 random 24-char runs', () => {
    const ambiguousSet = new Set(AMBIGUOUS_CHARS.split(''));
    const allowedUpper = new Set(
      UPPERCASE_CHARS.split('').filter((c) => !ambiguousSet.has(c)),
    );
    const allowedLower = new Set(
      LOWERCASE_CHARS.split('').filter((c) => !ambiguousSet.has(c)),
    );
    const allowedDigits = new Set(
      NUMBER_CHARS.split('').filter((c) => !ambiguousSet.has(c)),
    );
    const allowedSymbols = new Set(
      STRICT_NO_AMBIGUOUS_OPTIONS.customSymbols
        .split('')
        .filter((c) => !ambiguousSet.has(c)),
    );

    for (let i = 0; i < 200; i++) {
      const result = generateRandomPassword(STRICT_NO_AMBIGUOUS_OPTIONS);
      expect(result.success).toBe(true);
      const pw = result.items[0];
      expect(pw).toHaveLength(24);

      let hasUpper = false;
      let hasLower = false;
      let hasDigit = false;
      let hasSymbol = false;

      for (const ch of pw) {
        expect(ambiguousSet.has(ch)).toBe(false);
        if (allowedUpper.has(ch)) hasUpper = true;
        if (allowedLower.has(ch)) hasLower = true;
        if (allowedDigits.has(ch)) hasDigit = true;
        if (allowedSymbols.has(ch)) hasSymbol = true;
      }

      expect(hasUpper).toBe(true);
      expect(hasLower).toBe(true);
      expect(hasDigit).toBe(true);
      expect(hasSymbol).toBe(true);
      expect(result.entropy.bits).toBeGreaterThan(140);
    }
  });

  it('returns graceful errors when character pools or bounds are invalid', () => {
    const noCharsets = generateRandomPassword({
      ...DEFAULT_PASSWORD_OPTIONS,
      includeUppercase: false,
      includeLowercase: false,
      includeNumbers: false,
      includeSymbols: false,
    });
    expect(noCharsets.success).toBe(false);
    expect(noCharsets.items).toEqual([]);
    expect(noCharsets.error).toBeTruthy();

    const filteredEmptySymbols = generateRandomPassword({
      ...DEFAULT_PASSWORD_OPTIONS,
      includeUppercase: false,
      includeLowercase: false,
      includeNumbers: false,
      includeSymbols: true,
      customSymbols: '|||',
      excludeAmbiguous: true,
    });
    expect(filteredEmptySymbols.success).toBe(false);

    expect(
      generateRandomPassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 7 }).success,
    ).toBe(false);
    expect(
      generateRandomPassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 129 }).success,
    ).toBe(false);
    expect(
      generateRandomPassword({ ...DEFAULT_PASSWORD_OPTIONS, length: Number.NaN })
        .success,
    ).toBe(false);

    // Deduplicates repeated characters in customSymbols for honest entropy calculation
    const dupSymbols = generateRandomPassword({
      ...DEFAULT_PASSWORD_OPTIONS,
      includeUppercase: false,
      includeLowercase: false,
      includeNumbers: false,
      includeSymbols: true,
      customSymbols: '!!!!@@@@',
      length: 10,
      excludeAmbiguous: false,
      requireEachClass: true,
    });
    expect(dupSymbols.success).toBe(true);
    expect(dupSymbols.entropy.bits).toBeCloseTo(10 * Math.log2(2), 4);
  });

  it('generates Diceware passphrases with EFF wordlist membership, casing variants & extras', () => {
    const wordSet = new Set(EFF_SHORT_WORDLIST);
    const res = generateDicewarePassphrase({
      ...PASSPHRASE_FIXTURE_OPTIONS,
      wordCount: 6,
      separator: '-',
    });
    expect(res.success).toBe(true);
    const tokens = res.items[0].split('-');
    expect(tokens).toHaveLength(6);
    for (const token of tokens) {
      expect(wordSet.has(token)).toBe(true);
    }
    expect(res.entropy.bits).toBeGreaterThanOrEqual(62);

    const titled = generateDicewarePassphrase({
      ...PASSPHRASE_FIXTURE_OPTIONS,
      wordCount: 4,
      separator: '_',
      wordCase: 'title',
      appendNumber: true,
      appendSymbol: true,
    });
    expect(titled.success).toBe(true);
    expect(titled.items[0]).toMatch(/^[A-Z][a-z]+(?:_[A-Z][a-z]+){3}\d[!@#$%^&*]$/);

    const upper = generateDicewarePassphrase({
      ...PASSPHRASE_FIXTURE_OPTIONS,
      wordCount: 3,
      separator: 'random_digit',
      wordCase: 'upper',
    });
    expect(upper.success).toBe(true);
    expect(upper.items[0]).toMatch(/^[A-Z]+\d[A-Z]+\d[A-Z]+$/);

    const randomUpper = generateDicewarePassphrase({
      ...PASSPHRASE_FIXTURE_OPTIONS,
      wordCount: 5,
      separator: '.',
      wordCase: 'random_upper',
    });
    expect(randomUpper.success).toBe(true);
    expect(randomUpper.items[0].split('.')).toHaveLength(5);

    expect(
      generateDicewarePassphrase({ ...PASSPHRASE_FIXTURE_OPTIONS, wordCount: 2 })
        .success,
    ).toBe(false);
    expect(
      generateDicewarePassphrase({ ...PASSPHRASE_FIXTURE_OPTIONS, wordCount: 13 })
        .success,
    ).toBe(false);
  });

  it('generates all Developer Secret presets with exact formats and entropy', () => {
    const hexRes = generateDevSecret({
      ...DEV_HEX_256_OPTIONS,
      devPreset: 'hex_256',
    });
    expect(hexRes.success).toBe(true);
    expect(hexRes.items[0]).toMatch(/^[0-9a-f]{64}$/);
    expect(hexRes.entropy.bits).toBe(256);

    const b64Res = generateDevSecret({
      ...DEV_HEX_256_OPTIONS,
      devPreset: 'base64url_256',
    });
    expect(b64Res.success).toBe(true);
    expect(b64Res.items[0]).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(b64Res.entropy.bits).toBe(256);

    const apiRes = generateDevSecret({
      ...DEV_HEX_256_OPTIONS,
      devPreset: 'api_key_prefixed',
      apiKeyPrefix: 'sk_test_',
    });
    expect(apiRes.success).toBe(true);
    expect(apiRes.items[0]).toMatch(/^sk_test_[A-Za-z0-9]{32}$/);
    expect(apiRes.entropy.bits).toBeCloseTo(32 * Math.log2(62), 1);

    const wpaRes = generateDevSecret({
      ...DEV_HEX_256_OPTIONS,
      devPreset: 'wpa2_63',
    });
    expect(wpaRes.success).toBe(true);
    expect(wpaRes.items[0]).toMatch(/^[\x21-\x7E]{63}$/);
    expect(wpaRes.entropy.bits).toBeGreaterThan(400);

    const recDefault = generateDevSecret({
      ...DEV_HEX_256_OPTIONS,
      devPreset: 'recovery_codes',
      batchCount: 1,
    });
    expect(recDefault.success).toBe(true);
    expect(recDefault.items).toHaveLength(10);
    const crockfordSet = new Set(CROCKFORD_BASE32_CHARS.split(''));
    for (const code of recDefault.items) {
      expect(code).toMatch(
        /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/,
      );
      expect(code).not.toMatch(/[ILOU]/);
      for (const ch of code.replace(/-/g, '')) {
        expect(crockfordSet.has(ch)).toBe(true);
      }
    }

    const recCustomBatch = generateDevSecret({
      ...DEV_HEX_256_OPTIONS,
      devPreset: 'recovery_codes',
      batchCount: 20,
    });
    expect(recCustomBatch.success).toBe(true);
    expect(recCustomBatch.items).toHaveLength(20);
  });
});

describe('Password Strength Auditor, Batch Dispatcher & Exporters (Spec 120 — Seam 1B)', () => {
  it('audits empty, weak, repeated, keyboard walk, year-pattern, strong, and emoji passwords accurately', () => {
    const emptyAudit = auditPasswordStrength('');
    expect(emptyAudit.bits).toBe(0);
    expect(emptyAudit.grade).toBe('very_weak');
    expect(emptyAudit.warnings).toContain('empty_password');

    const commonAudit = auditPasswordStrength(SAMPLE_AUDITOR_PASSWORDS.weakCommon);
    expect(commonAudit.grade).toBe('very_weak');
    expect(commonAudit.warnings).toContain('common_password');

    const walkAudit = auditPasswordStrength(SAMPLE_AUDITOR_PASSWORDS.keyboardWalk);
    expect(walkAudit.warnings).toContain('keyboard_or_sequence');

    const revAudit = auditPasswordStrength(SAMPLE_AUDITOR_PASSWORDS.reverseSequence);
    expect(revAudit.warnings).toContain('keyboard_or_sequence');

    const repeatAudit = auditPasswordStrength(SAMPLE_AUDITOR_PASSWORDS.repeatedRuns);
    expect(repeatAudit.warnings).toContain('repeated_chars');
    expect(repeatAudit.bits).toBeLessThan(65);

    const yearAudit = auditPasswordStrength(SAMPLE_AUDITOR_PASSWORDS.yearPattern);
    expect(yearAudit.warnings).toContain('date_or_year_pattern');

    const strongAudit = auditPasswordStrength(SAMPLE_AUDITOR_PASSWORDS.strongRandom);
    expect(strongAudit.grade).toBe('excellent');
    expect(strongAudit.warnings).toEqual([]);
    expect(strongAudit.crackTimeFastGpu.length).toBeGreaterThan(0);
    expect(strongAudit.crackTimeArgon2.length).toBeGreaterThan(0);

    const unicodeAudit = auditPasswordStrength(SAMPLE_AUDITOR_PASSWORDS.unicodeEmoji);
    expect(Number.isFinite(unicodeAudit.bits)).toBe(true);
    expect(unicodeAudit.bits).toBeGreaterThan(0);
  });

  it('tokenizes passwords into letter, digit, and symbol classes preserving surrogate pairs', () => {
    const tokens = tokenizePasswordForDisplay(SAMPLE_AUDITOR_PASSWORDS.unicodeEmoji);
    expect(tokens.map((t) => t.ch).join('')).toBe(SAMPLE_AUDITOR_PASSWORDS.unicodeEmoji);
    expect(tokens[0]).toEqual({ ch: '🔒', kind: 'symbol' });
    expect(tokens[1]).toEqual({ ch: 'C', kind: 'letter' });
    expect(tokens[4]).toEqual({ ch: 'é', kind: 'letter' });
    expect(tokens[5]).toEqual({ ch: '🚀', kind: 'symbol' });
    expect(tokens[6]).toEqual({ ch: '2', kind: 'digit' });
    expect(tokens[10]).toEqual({ ch: '!', kind: 'symbol' });
  });

  it('dispatches batch generation across modes and validates batch bounds 1..100', () => {
    const batch50 = generateCredentials({
      ...DEFAULT_PASSWORD_OPTIONS,
      mode: 'password',
      batchCount: 50,
    });
    expect(batch50.success).toBe(true);
    expect(batch50.items).toHaveLength(50);

    expect(
      generateCredentials({ ...DEFAULT_PASSWORD_OPTIONS, batchCount: 0 }).success,
    ).toBe(false);
    expect(
      generateCredentials({ ...DEFAULT_PASSWORD_OPTIONS, batchCount: 101 }).success,
    ).toBe(false);

    const phraseRes = generateCredentials({
      ...PASSPHRASE_FIXTURE_OPTIONS,
      batchCount: 3,
    });
    expect(phraseRes.success).toBe(true);
    expect(phraseRes.items).toHaveLength(3);

    const devRes = generateCredentials({
      ...DEV_HEX_256_OPTIONS,
      batchCount: 2,
    });
    expect(devRes.success).toBe(true);
    expect(devRes.items).toHaveLength(2);
  });

  it('formats .txt, RFC-4180 .csv, and sanitized .env exports cleanly', () => {
    const secrets = ['alpha,beta', 'say"hello"$HOME\\`id`'];

    expect(exportCredentialsTxt(secrets)).toBe('alpha,beta\nsay"hello"$HOME\\`id`');

    const csv = exportCredentialsCsv(secrets);
    expect(csv).toBe('index,credential\n1,"alpha,beta"\n2,"say""hello""$HOME\\`id`"');

    const singleEnv = exportCredentialsEnv(['sec$ret"\\`val'], ' my-jwt.secret! ');
    expect(singleEnv).toBe('MY_JWT_SECRET="sec\\$ret\\"\\\\\\`val"\n');

    const multiEnv = exportCredentialsEnv(['one', 'two'], '123bad-var');
    expect(multiEnv).toBe('KEY_123BAD_VAR_1="one"\nKEY_123BAD_VAR_2="two"\n');
  });

  it('performs zero network requests and zero local/sessionStorage writes across all flows', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const localSpy = vi.spyOn(Storage.prototype, 'setItem');

    try {
      generateCredentials(DEFAULT_PASSWORD_OPTIONS);
      generateCredentials(PASSPHRASE_FIXTURE_OPTIONS);
      generateCredentials(DEV_HEX_256_OPTIONS);
      auditPasswordStrength(SAMPLE_AUDITOR_PASSWORDS.strongRandom);
      exportCredentialsTxt(['a']);
      exportCredentialsCsv(['a']);
      exportCredentialsEnv(['a'], 'API_KEY');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(localSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
      localSpy.mockRestore();
    }
  });
});
