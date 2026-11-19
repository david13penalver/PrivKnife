import {
  AMBIGUOUS_CHARS,
  BASE62_CHARS,
  CharToken,
  CROCKFORD_BASE32_CHARS,
  DEFAULT_SYMBOL_CHARS,
  EntropyGrade,
  EntropyReport,
  LOWERCASE_CHARS,
  NUMBER_CHARS,
  PASSPHRASE_SYMBOLS,
  PasswordGeneratorOptions,
  PasswordGeneratorResult,
  RandomSource,
  UPPERCASE_CHARS,
  WPA2_ASCII_CHARS,
} from './types';
import { EFF_SHORT_WORDLIST } from './wordlist';

const UINT32_RANGE = 0x100000000;
const AMBIGUOUS_SET = new Set(AMBIGUOUS_CHARS.split(''));

function getDefaultRandomSource(): RandomSource {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== 'function') {
    throw new Error('Web Crypto CSPRNG (crypto.getRandomValues) is unavailable.');
  }
  return cryptoApi;
}

/**
 * Unbiased integer in [0, maxExclusive - 1] using 32-bit rejection sampling.
 */
export function secureRandomInt(
  maxExclusive: number,
  rng: RandomSource = getDefaultRandomSource(),
): number {
  if (
    !Number.isInteger(maxExclusive) ||
    maxExclusive < 1 ||
    maxExclusive > UINT32_RANGE
  ) {
    throw new RangeError(
      `maxExclusive must be an integer in [1, ${UINT32_RANGE}], received ${maxExclusive}.`,
    );
  }
  if (maxExclusive === 1) {
    return 0;
  }

  const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
  const buf = new Uint32Array(1);

  while (true) {
    rng.getRandomValues(buf);
    const candidate = buf[0];
    if (candidate < limit) {
      return candidate % maxExclusive;
    }
  }
}

/**
 * Unbiased in-place Fisher-Yates shuffle backed by rejection-sampled CSPRNG.
 */
export function secureShuffle<T>(
  items: T[],
  rng: RandomSource = getDefaultRandomSource(),
): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1, rng);
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}

export function secureRandomBytes(
  length: number,
  rng: RandomSource = getDefaultRandomSource(),
): Uint8Array {
  if (!Number.isInteger(length) || length < 0) {
    throw new RangeError(`Byte length must be a non-negative integer.`);
  }
  const out = new Uint8Array(length);
  if (length > 0) {
    rng.getRandomValues(out);
  }
  return out;
}

export function gradeEntropyBits(bits: number): EntropyGrade {
  if (!Number.isFinite(bits) || bits <= 0) return 'very_weak';
  if (bits < 40) return 'very_weak';
  if (bits < 60) return 'weak';
  if (bits < 80) return 'fair';
  if (bits < 110) return 'strong';
  return 'excellent';
}

/**
 * Estimates time to exhaust 50% of keyspace (2^(bits - 1) guesses) in log10 space
 * so huge entropies (e.g. 256-bit / 512-bit) never overflow IEEE-754 floats.
 */
export function formatCrackTime(bits: number, guessesPerSecond: number): string {
  if (!Number.isFinite(bits) || bits <= 0) {
    return '< 1 second';
  }
  const effectiveBits = Math.max(0, bits - 1);
  const log10Seconds = effectiveBits * Math.LOG10E * Math.LN2 - Math.log10(guessesPerSecond);

  if (log10Seconds < 0) return '< 1 second';

  const seconds = Math.pow(10, Math.min(log10Seconds, 18));
  if (log10Seconds < Math.log10(60)) {
    const s = Math.max(1, Math.round(seconds));
    return `${s} ${s === 1 ? 'second' : 'seconds'}`;
  }
  if (log10Seconds < Math.log10(3600)) {
    const m = Math.max(1, Math.round(seconds / 60));
    return `${m} ${m === 1 ? 'minute' : 'minutes'}`;
  }
  if (log10Seconds < Math.log10(86400)) {
    const h = Math.max(1, Math.round(seconds / 3600));
    return `${h} ${h === 1 ? 'hour' : 'hours'}`;
  }
  if (log10Seconds < Math.log10(31557600)) {
    const d = Math.max(1, Math.round(seconds / 86400));
    return `${d} ${d === 1 ? 'day' : 'days'}`;
  }

  const log10Years = log10Seconds - Math.log10(31557600);
  if (log10Years < 3) {
    const y = Math.max(1, Math.round(Math.pow(10, log10Years)));
    return `${y} ${y === 1 ? 'year' : 'years'}`;
  }
  if (log10Years < 6) {
    return `${Math.round(Math.pow(10, log10Years - 3))} thousand years`;
  }
  if (log10Years < 9) {
    return `${Math.round(Math.pow(10, log10Years - 6))} million years`;
  }
  if (log10Years < 12) {
    return `${Math.round(Math.pow(10, log10Years - 9))} billion years`;
  }
  if (log10Years < 18) {
    return `${Math.round(Math.pow(10, log10Years - 12))} trillion years`;
  }
  return 'Centuries beyond heat death';
}

export function buildEntropyReport(
  bits: number,
  warnings: string[] = [],
): EntropyReport {
  const roundedBits = Math.round(Math.max(0, bits) * 100) / 100;
  return {
    bits: roundedBits,
    grade: gradeEntropyBits(roundedBits),
    crackTimeFastGpu: formatCrackTime(roundedBits, 1e10),
    crackTimeArgon2: formatCrackTime(roundedBits, 1e4),
    warnings,
  };
}

function emptyFailure(error: string): PasswordGeneratorResult {
  return {
    success: false,
    items: [],
    entropy: buildEntropyReport(0, []),
    error,
  };
}

function normalizeBatchCount(raw: number, fallback: number): number | null {
  if (!Number.isInteger(raw) || raw < 1 || raw > 100) {
    return null;
  }
  return raw || fallback;
}

function dedupeChars(raw: string, excludeAmbiguous: boolean): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const ch of raw) {
    if (/\s/.test(ch)) continue;
    if (excludeAmbiguous && AMBIGUOUS_SET.has(ch)) continue;
    if (seen.has(ch)) continue;
    seen.add(ch);
    result.push(ch);
  }
  return result;
}

export function generateRandomPassword(
  options: PasswordGeneratorOptions,
  rng: RandomSource = getDefaultRandomSource(),
): PasswordGeneratorResult {
  if (!Number.isInteger(options.length) || options.length < 8 || options.length > 128) {
    return emptyFailure('Password length must be an integer between 8 and 128.');
  }

  const batchCount = normalizeBatchCount(options.batchCount, 1);
  if (batchCount === null) {
    return emptyFailure('Batch count must be an integer between 1 and 100.');
  }

  const enabledSets: string[][] = [];
  if (options.includeUppercase) {
    const s = dedupeChars(UPPERCASE_CHARS, options.excludeAmbiguous);
    if (s.length > 0) enabledSets.push(s);
  }
  if (options.includeLowercase) {
    const s = dedupeChars(LOWERCASE_CHARS, options.excludeAmbiguous);
    if (s.length > 0) enabledSets.push(s);
  }
  if (options.includeNumbers) {
    const s = dedupeChars(NUMBER_CHARS, options.excludeAmbiguous);
    if (s.length > 0) enabledSets.push(s);
  }
  if (options.includeSymbols) {
    const rawSymbols =
      options.customSymbols && options.customSymbols.length > 0
        ? options.customSymbols
        : DEFAULT_SYMBOL_CHARS;
    const s = dedupeChars(rawSymbols, options.excludeAmbiguous);
    if (s.length > 0) enabledSets.push(s);
  }

  const combinedPool: string[] = [];
  const combinedSeen = new Set<string>();
  for (const set of enabledSets) {
    for (const ch of set) {
      if (!combinedSeen.has(ch)) {
        combinedSeen.add(ch);
        combinedPool.push(ch);
      }
    }
  }

  if (combinedPool.length === 0) {
    return emptyFailure('Select at least one non-empty character set.');
  }

  const items: string[] = [];
  for (let n = 0; n < batchCount; n++) {
    const chars: string[] = [];
    if (options.requireEachClass && options.length >= enabledSets.length) {
      for (const set of enabledSets) {
        chars.push(set[secureRandomInt(set.length, rng)]);
      }
    }
    while (chars.length < options.length) {
      chars.push(combinedPool[secureRandomInt(combinedPool.length, rng)]);
    }
    secureShuffle(chars, rng);
    items.push(chars.join(''));
  }

  const entropyBits = options.length * Math.log2(combinedPool.length);
  return {
    success: true,
    items,
    entropy: buildEntropyReport(entropyBits),
  };
}

function applyWordCase(
  words: string[],
  mode: PasswordGeneratorOptions['wordCase'],
  rng: RandomSource,
): string[] {
  if (mode === 'lower') {
    return words;
  }
  if (mode === 'upper') {
    return words.map((w) => w.toUpperCase());
  }
  if (mode === 'title') {
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  }
  // random_upper: pick a uniformly random word index to UPPERCASE
  const targetIndex = secureRandomInt(words.length, rng);
  return words.map((w, idx) => (idx === targetIndex ? w.toUpperCase() : w));
}

export function generateDicewarePassphrase(
  options: PasswordGeneratorOptions,
  rng: RandomSource = getDefaultRandomSource(),
): PasswordGeneratorResult {
  if (
    !Number.isInteger(options.wordCount) ||
    options.wordCount < 3 ||
    options.wordCount > 12
  ) {
    return emptyFailure('Word count must be an integer between 3 and 12.');
  }

  const batchCount = normalizeBatchCount(options.batchCount, 1);
  if (batchCount === null) {
    return emptyFailure('Batch count must be an integer between 1 and 100.');
  }

  const dictSize = EFF_SHORT_WORDLIST.length;
  const items: string[] = [];

  for (let n = 0; n < batchCount; n++) {
    const chosen: string[] = [];
    for (let i = 0; i < options.wordCount; i++) {
      chosen.push(EFF_SHORT_WORDLIST[secureRandomInt(dictSize, rng)]);
    }
    const cased = applyWordCase(chosen, options.wordCase, rng);

    let phrase = '';
    if (options.separator === 'random_digit') {
      for (let i = 0; i < cased.length; i++) {
        phrase += cased[i];
        if (i < cased.length - 1) {
          phrase += String(secureRandomInt(10, rng));
        }
      }
    } else {
      phrase = cased.join(options.separator);
    }

    if (options.appendNumber) {
      phrase += String(secureRandomInt(10, rng));
    }
    if (options.appendSymbol) {
      phrase += PASSPHRASE_SYMBOLS[secureRandomInt(PASSPHRASE_SYMBOLS.length, rng)];
    }
    items.push(phrase);
  }

  let bits = options.wordCount * Math.log2(dictSize);
  if (options.wordCase === 'random_upper') {
    bits += Math.log2(options.wordCount);
  }
  if (options.separator === 'random_digit' && options.wordCount > 1) {
    bits += (options.wordCount - 1) * Math.log2(10);
  }
  if (options.appendNumber) {
    bits += Math.log2(10);
  }
  if (options.appendSymbol) {
    bits += Math.log2(PASSPHRASE_SYMBOLS.length);
  }

  return {
    success: true,
    items,
    entropy: buildEntropyReport(bits),
  };
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function encodeHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

function sampleFromAlphabet(
  alphabet: string,
  length: number,
  rng: RandomSource,
): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[secureRandomInt(alphabet.length, rng)];
  }
  return out;
}

export function generateDevSecret(
  options: PasswordGeneratorOptions,
  rng: RandomSource = getDefaultRandomSource(),
): PasswordGeneratorResult {
  const normalizedBatch = normalizeBatchCount(options.batchCount, 1);
  if (normalizedBatch === null) {
    return emptyFailure('Batch count must be an integer between 1 and 100.');
  }

  const effectiveCount =
    options.devPreset === 'recovery_codes' && options.batchCount === 1
      ? 10
      : normalizedBatch;

  const cleanPrefix = (options.apiKeyPrefix ?? 'pk_live_').replace(/[\r\n]/g, '');
  const items: string[] = [];
  let bitsPerItem = 256;

  for (let i = 0; i < effectiveCount; i++) {
    switch (options.devPreset) {
      case 'hex_256':
        items.push(encodeHex(secureRandomBytes(32, rng)));
        bitsPerItem = 256;
        break;
      case 'base64url_256':
        items.push(encodeBase64Url(secureRandomBytes(32, rng)));
        bitsPerItem = 256;
        break;
      case 'api_key_prefixed':
        items.push(`${cleanPrefix}${sampleFromAlphabet(BASE62_CHARS, 32, rng)}`);
        bitsPerItem = 32 * Math.log2(BASE62_CHARS.length);
        break;
      case 'wpa2_63':
        items.push(sampleFromAlphabet(WPA2_ASCII_CHARS, 63, rng));
        bitsPerItem = 63 * Math.log2(WPA2_ASCII_CHARS.length);
        break;
      case 'recovery_codes': {
        const g1 = sampleFromAlphabet(CROCKFORD_BASE32_CHARS, 4, rng);
        const g2 = sampleFromAlphabet(CROCKFORD_BASE32_CHARS, 4, rng);
        const g3 = sampleFromAlphabet(CROCKFORD_BASE32_CHARS, 4, rng);
        items.push(`${g1}-${g2}-${g3}`);
        bitsPerItem = 12 * Math.log2(CROCKFORD_BASE32_CHARS.length);
        break;
      }
    }
  }

  return {
    success: true,
    items,
    entropy: buildEntropyReport(bitsPerItem),
  };
}

const COMMON_WEAK_TOKENS = [
  'password',
  'passw0rd',
  '123456',
  'qwerty',
  'letmein',
  'admin',
  'welcome',
  'iloveyou',
  'monkey',
  'dragon',
  'football',
  'baseball',
  'sunshine',
  'princess',
  'abc123',
  'trustno1',
];

const KEYBOARD_WALK_ROWS = [
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  'abcdefghijklmnopqrstuvwxyz',
  '01234567890',
];

function containsWalkSequence(lower: string, minRun = 4): boolean {
  for (const row of KEYBOARD_WALK_ROWS) {
    const rev = row.split('').reverse().join('');
    for (let i = 0; i <= row.length - minRun; i++) {
      const forward = row.slice(i, i + minRun);
      const backward = rev.slice(i, i + minRun);
      if (lower.includes(forward) || lower.includes(backward)) {
        return true;
      }
    }
  }
  return false;
}

export function auditPasswordStrength(password: string): EntropyReport {
  const chars = Array.from(password ?? '');
  if (chars.length === 0) {
    return buildEntropyReport(0, ['empty_password']);
  }

  let hasLower = false;
  let hasUpper = false;
  let hasDigit = false;
  let hasSymbol = false;
  let hasUnicodeExtra = false;

  for (const ch of chars) {
    if (ch >= 'a' && ch <= 'z') hasLower = true;
    else if (ch >= 'A' && ch <= 'Z') hasUpper = true;
    else if (ch >= '0' && ch <= '9') hasDigit = true;
    else if (ch.codePointAt(0)! <= 0x7f) hasSymbol = true;
    else hasUnicodeExtra = true;
  }

  let poolSize = 0;
  if (hasLower) poolSize += 26;
  if (hasUpper) poolSize += 26;
  if (hasDigit) poolSize += 10;
  if (hasSymbol) poolSize += 33;
  if (hasUnicodeExtra) poolSize += 64;
  poolSize = Math.max(poolSize, 2);

  // Compress adjacent repeated characters after the 2nd repeat so 'aaaaaabbbbbb' loses fake length
  const collapsedRuns: string[] = [];
  let repeatCount = 0;
  for (let i = 0; i < chars.length; i++) {
    if (i > 0 && chars[i] === chars[i - 1]) {
      repeatCount++;
    } else {
      repeatCount = 1;
    }
    if (repeatCount <= 2) {
      collapsedRuns.push(chars[i]);
    }
  }
  const hasRepeatRuns = /(.)\1{2,}/u.test(password) || collapsedRuns.length < chars.length;

  const uniqueRatio = new Set(chars).size / chars.length;
  let effectiveLength = collapsedRuns.length;
  if (uniqueRatio < 0.4 && effectiveLength > 4) {
    effectiveLength = Math.max(3, effectiveLength * uniqueRatio * 1.5);
  }

  const lower = password.toLowerCase();
  const warnings: string[] = [];
  let penaltyBits = 0;

  if (COMMON_WEAK_TOKENS.some((tok) => lower.includes(tok))) {
    warnings.push('common_password');
    penaltyBits += 34;
  }
  if (containsWalkSequence(lower, 4)) {
    warnings.push('keyboard_or_sequence');
    penaltyBits += 22;
  }
  if (hasRepeatRuns) {
    warnings.push('repeated_chars');
    penaltyBits += 12;
  }
  if (/(?:19|20)\d{2}/.test(password)) {
    warnings.push('date_or_year_pattern');
    penaltyBits += 12;
  }

  let rawBits = effectiveLength * Math.log2(poolSize) - penaltyBits;
  if (chars.length < 12 && !warnings.includes('empty_password')) {
    warnings.push('short_length');
  }
  if (warnings.includes('common_password') && chars.length <= 14) {
    rawBits = Math.min(rawBits, 28);
  }

  return buildEntropyReport(Math.max(1, rawBits), warnings);
}

export function tokenizePasswordForDisplay(credential: string): CharToken[] {
  const tokens: CharToken[] = [];
  for (const ch of Array.from(credential)) {
    if (/^\p{Nd}$/u.test(ch)) {
      tokens.push({ ch, kind: 'digit' });
    } else if (/^\p{L}$/u.test(ch)) {
      tokens.push({ ch, kind: 'letter' });
    } else {
      tokens.push({ ch, kind: 'symbol' });
    }
  }
  return tokens;
}

export function generateCredentials(
  options: PasswordGeneratorOptions,
  rng: RandomSource = getDefaultRandomSource(),
): PasswordGeneratorResult {
  switch (options.mode) {
    case 'password':
      return generateRandomPassword(options, rng);
    case 'passphrase':
      return generateDicewarePassphrase(options, rng);
    case 'dev_secret':
      return generateDevSecret(options, rng);
    case 'auditor':
      return {
        success: true,
        items: [],
        entropy: buildEntropyReport(0, ['empty_password']),
      };
  }
}

export function exportCredentialsTxt(items: readonly string[]): string {
  return items.join('\n');
}

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportCredentialsCsv(items: readonly string[]): string {
  const lines = ['index,credential'];
  for (let i = 0; i < items.length; i++) {
    lines.push(`${i + 1},${escapeCsvCell(items[i])}`);
  }
  return lines.join('\n');
}

function sanitizeEnvVarName(rawName: string): string {
  let clean = (rawName ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (clean.length === 0) {
    return 'SECRET_KEY';
  }
  if (/^[0-9]/.test(clean)) {
    clean = `KEY_${clean}`;
  }
  return clean;
}

function escapeEnvDoubleQuoted(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}

export function exportCredentialsEnv(
  items: readonly string[],
  envVariableName: string,
): string {
  const baseName = sanitizeEnvVarName(envVariableName);
  const multiple = items.length > 1;
  const lines = items.map((val, idx) => {
    const key = multiple ? `${baseName}_${idx + 1}` : baseName;
    return `${key}="${escapeEnvDoubleQuoted(val)}"`;
  });
  return `${lines.join('\n')}\n`;
}
