import {
  CASE_FORMATS,
  CaseFormatId,
  CaseTransformOptions,
  DEFAULT_CASE_OPTIONS,
  KaomojiCategory,
  KaomojiEntry,
  TextStats,
  UNICODE_STYLES,
  UnicodeStyleId,
  ZalgoOptions,
} from './types';
import { KAOMOJI_CATALOG } from './kaomoji';

const AP_MINOR_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'in',
  'nor',
  'of',
  'on',
  'or',
  'so',
  'the',
  'to',
  'up',
  'vs',
  'yet',
]);

function capitalizeFirst(word: string): string {
  const chars = Array.from(word);
  if (chars.length === 0) return '';
  return chars[0].toUpperCase() + chars.slice(1).join('').toLowerCase();
}

export function tokenizeIdentifier(input: string): string[] {
  if (!input) return [];

  const separated = input
    .replace(/([a-z\p{Ll}])([A-Z\p{Lu}])/gu, '$1 $2')
    .replace(/([A-Z\p{Lu}]+)([A-Z\p{Lu}][a-z\p{Ll}])/gu, '$1 $2')
    .replace(/([\p{L}])(\d)/gu, '$1 $2')
    .replace(/(\d)([\p{L}])/gu, '$1 $2');

  return separated
    .split(/[^\p{L}\p{N}]+/u)
    .map((tok) => tok.trim())
    .filter((tok) => tok.length > 0);
}

function slugifyLine(
  input: string,
  stripDiacritics: boolean,
): string {
  let normalized = input
    .replace(/[ßẞ]/g, 'ss')
    .replace(/[æÆ]/g, 'ae')
    .replace(/[œŒ]/g, 'oe')
    .replace(/[øØ]/g, 'o');

  if (stripDiacritics) {
    normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  return normalized
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

function transformSingleBlock(
  input: string,
  format: CaseFormatId,
  options: CaseTransformOptions,
): string {
  if (format === 'upper') {
    return input.toUpperCase();
  }
  if (format === 'lower') {
    return input.toLowerCase();
  }
  if (format === 'slug') {
    return slugifyLine(input, options.stripDiacriticsForSlug);
  }

  const tokens = tokenizeIdentifier(input);
  if (tokens.length === 0) return '';

  switch (format) {
    case 'camel':
      return tokens
        .map((tok, idx) =>
          idx === 0 ? tok.toLowerCase() : capitalizeFirst(tok),
        )
        .join('');
    case 'pascal':
      return tokens.map((tok) => capitalizeFirst(tok)).join('');
    case 'snake':
      return tokens.map((tok) => tok.toLowerCase()).join('_');
    case 'screaming_snake':
      return tokens.map((tok) => tok.toUpperCase()).join('_');
    case 'kebab':
      return tokens.map((tok) => tok.toLowerCase()).join('-');
    case 'cobol':
      return tokens.map((tok) => tok.toUpperCase()).join('-');
    case 'dot':
      return tokens.map((tok) => tok.toLowerCase()).join('.');
    case 'path':
      return tokens.map((tok) => tok.toLowerCase()).join('/');
    case 'title':
      return tokens
        .map((tok, idx) => {
          const lower = tok.toLowerCase();
          if (idx !== 0 && idx !== tokens.length - 1 && AP_MINOR_WORDS.has(lower)) {
            return lower;
          }
          return capitalizeFirst(tok);
        })
        .join(' ');
    case 'sentence':
      return tokens
        .map((tok, idx) =>
          idx === 0 ? capitalizeFirst(tok) : tok.toLowerCase(),
        )
        .join(' ');
  }
}

export function transformCase(
  input: string,
  format: CaseFormatId,
  options: CaseTransformOptions = DEFAULT_CASE_OPTIONS,
): string {
  if (!input) return '';
  if (options.batchLineByLine) {
    return input
      .split(/\r?\n/)
      .map((line) => (line.length === 0 ? '' : transformSingleBlock(line, format, options)))
      .join('\n');
  }
  return transformSingleBlock(input, format, options);
}

export function transformAllCases(
  input: string,
  options: CaseTransformOptions = DEFAULT_CASE_OPTIONS,
): { id: CaseFormatId; label: string; value: string }[] {
  return CASE_FORMATS.map((meta) => ({
    id: meta.id,
    label: meta.label,
    value: transformCase(input, meta.id, options),
  }));
}

export function trimLines(input: string): string {
  if (!input) return '';
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .join('\n');
}

export function deduplicateLines(input: string): string {
  if (!input) return '';
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of input.split(/\r?\n/)) {
    if (!seen.has(line)) {
      seen.add(line);
      out.push(line);
    }
  }
  return out.join('\n');
}

export function sortLines(
  input: string,
  direction: 'asc' | 'desc' = 'asc',
): string {
  if (!input) return '';
  const lines = input.split(/\r?\n/);
  lines.sort((a, b) =>
    direction === 'asc' ? a.localeCompare(b) : b.localeCompare(a),
  );
  return lines.join('\n');
}

export function removeEmptyLines(input: string): string {
  if (!input) return '';
  return input
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .join('\n');
}

export function reverseText(input: string): string {
  if (!input) return '';
  return Array.from(input).reverse().join('');
}

const UTF8_ENCODER = new TextEncoder();

export function computeTextStats(input: string): TextStats {
  if (!input) {
    return {
      characters: 0,
      codePoints: 0,
      words: 0,
      lines: 0,
      utf8Bytes: 0,
    };
  }

  const trimmedWords = input.trim();
  return {
    characters: input.length,
    codePoints: Array.from(input).length,
    words: trimmedWords.length === 0 ? 0 : trimmedWords.split(/\s+/).length,
    lines: input.split(/\r?\n/).length,
    utf8Bytes: UTF8_ENCODER.encode(input).byteLength,
  };
}

// ---------- Seam 1B: Hole-Free Unicode Styles, Zalgo / De-Zalgo & Kaomojis ----------

const SCRIPT_UPPER_EXCEPTIONS: Record<number, string> = {
  1: '\u212c', // B
  4: '\u2130', // E
  5: '\u2131', // F
  7: '\u210b', // H
  8: '\u2110', // I
  11: '\u2112', // L
  12: '\u2133', // M
  17: '\u211b', // R
};

const SCRIPT_LOWER_EXCEPTIONS: Record<number, string> = {
  4: '\u212f', // e
  6: '\u210a', // g
  14: '\u2134', // o
};

const FRAKTUR_UPPER_EXCEPTIONS: Record<number, string> = {
  2: '\u212d', // C
  7: '\u210c', // H
  8: '\u2111', // I
  17: '\u211c', // R
  25: '\u2128', // Z
};

const DOUBLE_STRUCK_UPPER_EXCEPTIONS: Record<number, string> = {
  2: '\u2102', // C
  7: '\u210d', // H
  13: '\u2115', // N
  15: '\u2119', // P
  16: '\u211a', // Q
  17: '\u211d', // R
  25: '\u2124', // Z
};

const SMALL_CAPS_LOWER = 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ';
const CIRCLED_DIGITS = '⓪①②③④⑤⑥⑦⑧⑨';
const SQUARED_UPPER = Array.from({ length: 26 }, (_, i) =>
  String.fromCodePoint(0x1f130 + i),
);

const UPSIDE_DOWN_MAP: Record<string, string> = {
  a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ',
  j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ',
  s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z',
  A: '∀', B: '𐐒', C: 'Ɔ', D: 'ᗡ', E: 'Ǝ', F: 'Ⅎ', G: 'פ', H: 'H', I: 'I',
  J: 'ſ', K: 'ʞ', L: '˥', M: 'W', N: 'N', O: 'O', P: 'Ԁ', Q: 'Ό', R: 'ᴚ',
  S: 'S', T: '┴', U: '∩', V: 'Λ', W: 'M', X: 'X', Y: '⅄', Z: 'Z',
  0: '0', 1: 'Ɩ', 2: 'ᄅ', 3: 'Ɛ', 4: 'ㄣ', 5: 'ϛ', 6: '9', 7: 'ㄥ', 8: '8', 9: '6',
  '.': '˙', ',': "'", "'": ',', '"': '„', '?': '¿', '!': '¡', '(': ')', ')': '(',
  '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<', '&': '⅋', '_': '‾',
};

function mapMathChar(
  ch: string,
  upperBase: number,
  lowerBase: number,
  digitBase?: number,
  upperExceptions?: Record<number, string>,
  lowerExceptions?: Record<number, string>,
): string {
  const code = ch.codePointAt(0)!;
  if (code >= 65 && code <= 90) {
    const idx = code - 65;
    return upperExceptions?.[idx] ?? String.fromCodePoint(upperBase + idx);
  }
  if (code >= 97 && code <= 122) {
    const idx = code - 97;
    return lowerExceptions?.[idx] ?? String.fromCodePoint(lowerBase + idx);
  }
  if (digitBase !== undefined && code >= 48 && code <= 57) {
    return String.fromCodePoint(digitBase + (code - 48));
  }
  return ch;
}

function mapSingleCodepointForStyle(ch: string, style: UnicodeStyleId): string {
  const code = ch.codePointAt(0)!;
  switch (style) {
    case 'bold_serif':
      return mapMathChar(ch, 0x1d400, 0x1d41a, 0x1d7ce);
    case 'bold_sans':
      return mapMathChar(ch, 0x1d5d4, 0x1d5ee, 0x1d7ec);
    case 'italic_serif':
      return mapMathChar(ch, 0x1d434, 0x1d44e, undefined, undefined, { 7: '\u210e' });
    case 'bold_italic':
      return mapMathChar(ch, 0x1d468, 0x1d482);
    case 'script':
      return mapMathChar(
        ch,
        0x1d49c,
        0x1d4b6,
        undefined,
        SCRIPT_UPPER_EXCEPTIONS,
        SCRIPT_LOWER_EXCEPTIONS,
      );
    case 'bold_script':
      return mapMathChar(ch, 0x1d4d0, 0x1d4ea);
    case 'fraktur':
      return mapMathChar(ch, 0x1d504, 0x1d51e, undefined, FRAKTUR_UPPER_EXCEPTIONS);
    case 'double_struck':
      return mapMathChar(
        ch,
        0x1d538,
        0x1d552,
        0x1d7d8,
        DOUBLE_STRUCK_UPPER_EXCEPTIONS,
      );
    case 'monospace':
      return mapMathChar(ch, 0x1d670, 0x1d68a, 0x1d7f6);
    case 'small_caps':
      if (code >= 97 && code <= 122) {
        return Array.from(SMALL_CAPS_LOWER)[code - 97] ?? ch;
      }
      return ch;
    case 'circled':
      if (code >= 65 && code <= 90) return String.fromCodePoint(0x24b6 + (code - 65));
      if (code >= 97 && code <= 122) return String.fromCodePoint(0x24d0 + (code - 97));
      if (code >= 48 && code <= 57) return CIRCLED_DIGITS[code - 48];
      return ch;
    case 'squared':
      if (code >= 65 && code <= 90) return SQUARED_UPPER[code - 65];
      if (code >= 97 && code <= 122) return SQUARED_UPPER[code - 97];
      return ch;
    case 'fullwidth':
      if (code === 32) return '\u3000';
      if (code >= 0x21 && code <= 0x7e) {
        return String.fromCodePoint(code - 0x21 + 0xff01);
      }
      return ch;
    case 'upside_down':
      return UPSIDE_DOWN_MAP[ch] ?? ch;
    case 'strikethrough':
      return /\s/.test(ch) ? ch : `${ch}\u0336`;
    case 'underline':
      return /\s/.test(ch) ? ch : `${ch}\u0332`;
  }
}

export function transformUnicodeStyle(
  input: string,
  style: UnicodeStyleId,
): string {
  if (!input) return '';
  const mapped = Array.from(input).map((ch) =>
    mapSingleCodepointForStyle(ch, style),
  );
  if (style === 'upside_down') {
    return mapped.reverse().join('');
  }
  return mapped.join('');
}

export function transformAllUnicodeStyles(
  input: string,
): { id: UnicodeStyleId; label: string; value: string }[] {
  return UNICODE_STYLES.map((meta) => ({
    id: meta.id,
    label: meta.label,
    value: transformUnicodeStyle(input, meta.id),
  }));
}

const ZALGO_UP_MARKS = [
  '\u030d', '\u030e', '\u0304', '\u0305', '\u033f', '\u0311', '\u0306', '\u0310',
  '\u0352', '\u0357', '\u0351', '\u0307', '\u0308', '\u030a', '\u0342', '\u0343',
  '\u0344', '\u034a', '\u034b', '\u034c', '\u0303', '\u0302', '\u030c', '\u0350',
];

const ZALGO_MID_MARKS = [
  '\u0315', '\u031b', '\u0340', '\u0341', '\u0358', '\u0321', '\u0322', '\u0327',
  '\u0328', '\u0334', '\u0335', '\u0336', '\u034f', '\u035c', '\u035d', '\u035e',
];

const ZALGO_DOWN_MARKS = [
  '\u0316', '\u0317', '\u0318', '\u0319', '\u031c', '\u031d', '\u031e', '\u031f',
  '\u0320', '\u0324', '\u0325', '\u0326', '\u0329', '\u032a', '\u032b', '\u032c',
  '\u032d', '\u032e', '\u032f', '\u0330', '\u0331', '\u0332', '\u0333', '\u0339',
];

export function generateZalgoSeed(): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] || 1337;
}

function createMulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

export function applyZalgo(input: string, options: ZalgoOptions): string {
  if (!input) return '';
  if (!options.includeUp && !options.includeMid && !options.includeDown) {
    return input;
  }

  const intensity = Math.min(15, Math.max(1, Math.round(options.intensity || 1)));
  const rand =
    options.seed !== undefined
      ? createMulberry32(options.seed)
      : (() => {
          const buf = new Uint32Array(1);
          return () => {
            globalThis.crypto.getRandomValues(buf);
            return buf[0] / 0x100000000;
          };
        })();

  const out: string[] = [];
  for (const ch of Array.from(input)) {
    out.push(ch);
    if (/\s/.test(ch)) {
      continue;
    }

    if (options.includeUp) {
      const count = 1 + Math.floor(rand() * intensity);
      for (let i = 0; i < count; i++) {
        out.push(ZALGO_UP_MARKS[Math.floor(rand() * ZALGO_UP_MARKS.length)]);
      }
    }
    if (options.includeMid) {
      const count = Math.max(1, Math.floor(rand() * Math.ceil(intensity / 2)));
      for (let i = 0; i < count; i++) {
        out.push(ZALGO_MID_MARKS[Math.floor(rand() * ZALGO_MID_MARKS.length)]);
      }
    }
    if (options.includeDown) {
      const count = 1 + Math.floor(rand() * intensity);
      for (let i = 0; i < count; i++) {
        out.push(ZALGO_DOWN_MARKS[Math.floor(rand() * ZALGO_DOWN_MARKS.length)]);
      }
    }
  }

  return out.join('');
}

export function stripZalgo(input: string): string {
  if (!input) return '';
  return input.replace(/[\u0300-\u036f\u0489]+/g, '').normalize('NFC');
}

export function filterKaomojis(
  query: string,
  category: KaomojiCategory | 'all' = 'all',
): readonly KaomojiEntry[] {
  const normalizedQuery = (query ?? '').trim().toLowerCase();
  return KAOMOJI_CATALOG.filter((entry) => {
    if (category !== 'all' && entry.category !== category) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    return (
      entry.emoticon.toLowerCase().includes(normalizedQuery) ||
      entry.category.includes(normalizedQuery) ||
      entry.tags.some((tag) => tag.includes(normalizedQuery))
    );
  });
}
