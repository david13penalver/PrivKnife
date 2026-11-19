import {
  BinaryRadix,
  DetectedBinaryInfo,
  EncoderWorkbenchOptions,
  EncoderWorkbenchResult,
  HexDelimiter,
  HtmlEncodeMode,
  MAX_MORSE_WAV_SECONDS,
  MorseTimeline,
  MorseTimelineEvent,
  ParsedUrlSummary,
  UrlEncodeMode,
  UrlParamEntry,
} from './types';

const CHUNK_SIZE = 8192;

const NAMED_HTML_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
  copy: '©',
  reg: '®',
  trade: '™',
  euro: '€',
  pound: '£',
  yen: '¥',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  laquo: '«',
  raquo: '»',
  deg: '°',
  plusmn: '±',
  times: '×',
  divide: '÷',
};

export function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

export function encodeBytesToBase64(
  bytes: Uint8Array,
  options: { urlSafe?: boolean; omitPadding?: boolean; wrap76?: boolean } = {}
): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    const end = Math.min(offset + CHUNK_SIZE, bytes.length);
    for (let i = offset; i < end; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
  }

  let encoded = btoa(binary);
  if (options.urlSafe) {
    encoded = encoded.replace(/\+/g, '-').replace(/\//g, '_');
  }
  if (options.omitPadding) {
    encoded = encoded.replace(/=+$/g, '');
  }
  if (options.wrap76 && encoded.length > 76) {
    const lines: string[] = [];
    for (let i = 0; i < encoded.length; i += 76) {
      lines.push(encoded.slice(i, i + 76));
    }
    encoded = lines.join('\n');
  }
  return encoded;
}

export function decodeBase64ToBytes(rawInput: string): {
  bytes: Uint8Array;
  declaredMime?: string;
} {
  let working = rawInput.trim();
  let declaredMime: string | undefined;

  const dataUriMatch = /^data:([^;,]+)?(?:;[^;,]+)*;base64,(.*)$/is.exec(working);
  if (dataUriMatch) {
    declaredMime = dataUriMatch[1]?.trim().toLowerCase() || 'application/octet-stream';
    working = dataUriMatch[2] ?? '';
  }

  const compact = working.replace(/\s+/g, '');
  if (compact.length === 0) {
    return { bytes: new Uint8Array(0), declaredMime };
  }

  if (!/^[A-Za-z0-9\-_+/]+={0,2}$/.test(compact)) {
    throw new Error('Invalid character in Base64 / Base64Url input.');
  }

  const stripped = compact.replace(/=+$/, '');
  if (stripped.length % 4 === 1) {
    throw new Error('Malformed Base64 length: truncated quartet.');
  }

  const padLen = (4 - (stripped.length % 4)) % 4;
  const standard =
    stripped.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen);

  let binary: string;
  try {
    binary = atob(standard);
  } catch {
    throw new Error('Malformed Base64 payload.');
  }

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return { bytes, declaredMime };
}

export function buildDataUri(
  bytes: Uint8Array,
  mimeType = 'application/octet-stream'
): string {
  const safeMime = mimeType.trim() || 'application/octet-stream';
  return `data:${safeMime};base64,${encodeBytesToBase64(bytes)}`;
}

function extensionForMime(mime: string): string {
  const map: Readonly<Record<string, string>> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'application/pdf': 'pdf',
    'application/zip': 'zip',
    'audio/wav': 'wav',
    'application/gzip': 'gz',
    'application/json': 'json',
  };
  return map[mime] ?? 'bin';
}

export function sniffBinaryMagicBytes(
  bytes: Uint8Array,
  declaredMime?: string
): DetectedBinaryInfo | undefined {
  const len = bytes.length;
  if (len === 0) {
    return undefined;
  }

  if (
    len >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mimeType: 'image/png', extension: 'png', byteLength: len };
  }

  if (len >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg', byteLength: len };
  }

  if (
    len >= 4 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return { mimeType: 'image/gif', extension: 'gif', byteLength: len };
  }

  if (
    len >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  ) {
    if (
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return { mimeType: 'image/webp', extension: 'webp', byteLength: len };
    }
    if (
      bytes[8] === 0x57 &&
      bytes[9] === 0x41 &&
      bytes[10] === 0x56 &&
      bytes[11] === 0x45
    ) {
      return { mimeType: 'audio/wav', extension: 'wav', byteLength: len };
    }
  }

  if (
    len >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return { mimeType: 'application/pdf', extension: 'pdf', byteLength: len };
  }

  if (
    len >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05) &&
    (bytes[3] === 0x04 || bytes[3] === 0x06)
  ) {
    return { mimeType: 'application/zip', extension: 'zip', byteLength: len };
  }

  if (len >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
    return { mimeType: 'application/gzip', extension: 'gz', byteLength: len };
  }

  if (declaredMime && !declaredMime.startsWith('text/')) {
    return {
      mimeType: declaredMime,
      extension: extensionForMime(declaredMime),
      byteLength: len,
    };
  }

  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i);
      if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) {
        return {
          mimeType: 'application/octet-stream',
          extension: 'bin',
          byteLength: len,
        };
      }
    }
    return undefined;
  } catch {
    return {
      mimeType: 'application/octet-stream',
      extension: 'bin',
      byteLength: len,
    };
  }
}

export function encodeUrlValue(text: string, mode: UrlEncodeMode): string {
  switch (mode) {
    case 'component':
      return encodeURIComponent(text);
    case 'full_uri':
      return encodeURI(text);
    case 'form_plus':
      return encodeURIComponent(text).replace(/%20/g, '+');
  }
}

export function decodeUrlValue(text: string, mode: UrlEncodeMode): string {
  if (mode === 'full_uri') {
    return decodeURI(text);
  }
  const normalized = mode === 'form_plus' ? text.replace(/\+/g, '%20') : text;
  return decodeURIComponent(normalized);
}

export function parseUrlComponents(input: string): ParsedUrlSummary {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      validUrl: false,
      baseWithoutQuery: '',
      protocol: '',
      host: '',
      pathname: '',
      hash: '',
      params: [],
    };
  }

  try {
    const url = new URL(trimmed);
    const params: UrlParamEntry[] = [];
    url.searchParams.forEach((value, key) => {
      params.push({ key, value });
    });
    const baseWithoutQuery = `${url.origin === 'null' ? `${url.protocol}//` : url.origin}${url.pathname}`;
    return {
      validUrl: true,
      baseWithoutQuery,
      protocol: url.protocol,
      host: url.host,
      pathname: url.pathname,
      hash: url.hash,
      params,
    };
  } catch {
    return {
      validUrl: false,
      baseWithoutQuery: trimmed.split('?')[0] ?? '',
      protocol: '',
      host: '',
      pathname: '',
      hash: '',
      params: [],
    };
  }
}

export function rebuildUrlFromParams(
  parsedOrBase: ParsedUrlSummary | string,
  params: UrlParamEntry[]
): string {
  let baseWithoutQuery: string;
  let hash = '';

  if (typeof parsedOrBase === 'string') {
    const parsed = parseUrlComponents(parsedOrBase);
    baseWithoutQuery = parsed.baseWithoutQuery;
    hash = parsed.hash;
  } else {
    baseWithoutQuery = parsedOrBase.baseWithoutQuery;
    hash = parsedOrBase.hash;
  }

  const sp = new URLSearchParams();
  for (const entry of params) {
    if (entry.key.length > 0) {
      sp.append(entry.key, entry.value);
    }
  }
  const query = sp.toString();
  return `${baseWithoutQuery}${query ? `?${query}` : ''}${hash}`;
}

function escapeMinimalHtmlChar(ch: string): string | null {
  switch (ch) {
    case '&':
      return '&amp;';
    case '<':
      return '&lt;';
    case '>':
      return '&gt;';
    case '"':
      return '&quot;';
    case "'":
      return '&#39;';
    default:
      return null;
  }
}

export function encodeHtmlUnicode(text: string, mode: HtmlEncodeMode): string {
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) {
      continue;
    }

    if (mode === 'js_unicode') {
      if (cp > 0xffff) {
        out += `\\u{${cp.toString(16).toUpperCase()}}`;
      } else if (cp > 0x7e || cp < 0x20) {
        out += `\\u${cp.toString(16).padStart(4, '0')}`;
      } else {
        out += ch;
      }
      continue;
    }

    const minimal = escapeMinimalHtmlChar(ch);
    if (minimal !== null) {
      out += minimal;
      continue;
    }

    if (mode === 'all_non_ascii') {
      if (cp > 0xffff) {
        out += `&#x${cp.toString(16).toUpperCase()};`;
      } else if (cp > 0x7e) {
        out += `&#${cp};`;
      } else {
        out += ch;
      }
    } else {
      out += ch;
    }
  }
  return out;
}

function safeFromCodePoint(cp: number): string | null {
  if (!Number.isInteger(cp) || cp <= 0 || cp > 0x10ffff) {
    return null;
  }
  if (cp >= 0xd800 && cp <= 0xdfff) {
    return null;
  }
  return String.fromCodePoint(cp);
}

export function decodeHtmlUnicode(text: string): string {
  // Decode JS surrogate pairs first, then \u{...}, then BMP \uXXXX
  let decoded = text.replace(
    /\\u([dD][89abAB][0-9a-fA-F]{2})\\u([dD][cdefCDEF][0-9a-fA-F]{2})/g,
    (match, hiHex: string, loHex: string) => {
      const hi = parseInt(hiHex, 16);
      const lo = parseInt(loHex, 16);
      const combined = 0x10000 + ((hi - 0xd800) << 10) + (lo - 0xdc00);
      return safeFromCodePoint(combined) ?? match;
    }
  );

  decoded = decoded.replace(/\\u\{([0-9a-fA-F]+)\}/g, (match, hex: string) => {
    const cp = parseInt(hex, 16);
    return safeFromCodePoint(cp) ?? match;
  });

  decoded = decoded.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex: string) => {
    const cp = parseInt(hex, 16);
    return safeFromCodePoint(cp) ?? match;
  });

  // Single-pass HTML entity decoder without touching innerHTML
  decoded = decoded.replace(
    /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z0-9]+);/g,
    (match, body: string) => {
      if (body.startsWith('#x') || body.startsWith('#X')) {
        const cp = parseInt(body.slice(2), 16);
        return safeFromCodePoint(cp) ?? match;
      }
      if (body.startsWith('#')) {
        const cp = parseInt(body.slice(1), 10);
        return safeFromCodePoint(cp) ?? match;
      }
      const named = NAMED_HTML_ENTITIES[body];
      return named !== undefined ? named : match;
    }
  );

  return decoded;
}

export function runCodecTransform(
  input: string,
  options: EncoderWorkbenchOptions
): EncoderWorkbenchResult {
  const utf8InputBytes = new TextEncoder().encode(input);
  const inputBytes = utf8InputBytes.byteLength;

  if (!input) {
    const emptyParsedUrl =
      options.mode === 'url' ? parseUrlComponents(input) : undefined;
    return {
      success: true,
      outputText: '',
      inputBytes: 0,
      outputBytes: 0,
      parsedUrl: emptyParsedUrl,
      parsedUrlParams: emptyParsedUrl?.params,
    };
  }

  try {
    switch (options.mode) {
      case 'base64': {
        if (options.direction === 'encode') {
          const out = encodeBytesToBase64(utf8InputBytes, {
            urlSafe: options.base64UrlSafe,
            omitPadding: options.base64OmitPadding,
            wrap76: options.base64Wrap76,
          });
          return {
            success: true,
            outputText: out,
            inputBytes,
            outputBytes: new TextEncoder().encode(out).byteLength,
          };
        }

        const { bytes, declaredMime } = decodeBase64ToBytes(input);
        const detectedBinary = sniffBinaryMagicBytes(bytes, declaredMime);
        let outputText = '';
        if (!detectedBinary) {
          outputText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        } else {
          outputText = `[Binary payload detected: ${detectedBinary.mimeType} (${bytes.byteLength} bytes)]`;
        }
        return {
          success: true,
          outputText,
          inputBytes,
          outputBytes: bytes.byteLength,
          detectedBinary,
          decodedBytes: bytes,
        };
      }

      case 'url': {
        const outputText =
          options.direction === 'encode'
            ? encodeUrlValue(input, options.urlMode)
            : decodeUrlValue(input, options.urlMode);
        const parsedCandidate = options.direction === 'encode' ? input : outputText;
        const parsedUrl = parseUrlComponents(
          parsedCandidate.includes('://') ? parsedCandidate : input
        );
        return {
          success: true,
          outputText,
          inputBytes,
          outputBytes: new TextEncoder().encode(outputText).byteLength,
          parsedUrl,
          parsedUrlParams: parsedUrl.validUrl ? parsedUrl.params : undefined,
        };
      }

      case 'html_unicode': {
        const outputText =
          options.direction === 'encode'
            ? encodeHtmlUnicode(input, options.htmlEncodeMode)
            : decodeHtmlUnicode(input);
        return {
          success: true,
          outputText,
          inputBytes,
          outputBytes: new TextEncoder().encode(outputText).byteLength,
        };
      }

      case 'hex': {
        if (options.direction === 'encode') {
          const out = encodeHex(utf8InputBytes, options.hexDelimiter, options.hexUppercase);
          return {
            success: true,
            outputText: out,
            inputBytes,
            outputBytes: new TextEncoder().encode(out).byteLength,
          };
        }
        const bytes = decodeHex(input);
        const decodedText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        return {
          success: true,
          outputText: decodedText,
          inputBytes,
          outputBytes: bytes.byteLength,
          decodedBytes: bytes,
        };
      }

      case 'binary': {
        if (options.direction === 'encode') {
          const out = encodeRadix(utf8InputBytes, options.binaryRadix);
          return {
            success: true,
            outputText: out,
            inputBytes,
            outputBytes: new TextEncoder().encode(out).byteLength,
          };
        }
        const bytes = decodeRadix(input, options.binaryRadix);
        const decodedText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        return {
          success: true,
          outputText: decodedText,
          inputBytes,
          outputBytes: bytes.byteLength,
          decodedBytes: bytes,
        };
      }

      case 'morse': {
        const outputText =
          options.direction === 'encode'
            ? encodeMorse(input)
            : decodeMorse(input);
        return {
          success: true,
          outputText,
          inputBytes,
          outputBytes: new TextEncoder().encode(outputText).byteLength,
        };
      }
    }
  } catch (err) {
    return {
      success: false,
      outputText: '',
      inputBytes,
      outputBytes: 0,
      error: err instanceof Error ? err.message : 'Encoding/decoding failed.',
    };
  }
}

export function encodeHex(
  bytes: Uint8Array,
  delimiter: HexDelimiter,
  uppercase: boolean
): string {
  const tokens: string[] = [];
  for (let i = 0; i < bytes.length; i += 1) {
    const raw = bytes[i].toString(16).padStart(2, '0');
    tokens.push(uppercase ? raw.toUpperCase() : raw);
  }

  switch (delimiter) {
    case 'space':
      return tokens.join(' ');
    case 'none':
      return tokens.join('');
    case 'colon':
      return tokens.join(':');
    case '0x':
      return tokens.map((t) => `0x${t}`).join(' ');
    case 'backslash_x':
      return tokens.map((t) => `\\x${t}`).join('');
  }
}

export function decodeHex(input: string): Uint8Array {
  const withoutPrefixes = input.replace(/0x|\\x/gi, ' ');
  const compact = withoutPrefixes.replace(/[\s:,-]+/g, '');
  if (!compact) {
    return new Uint8Array(0);
  }
  if (!/^[0-9a-fA-F]+$/.test(compact)) {
    throw new Error('Invalid hex character detected (expected 0-9 or A-F).');
  }
  if (compact.length % 2 !== 0) {
    throw new Error('Hex input must have an even number of hex digits.');
  }

  const out = new Uint8Array(compact.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(compact.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function encodeRadix(bytes: Uint8Array, radix: BinaryRadix): string {
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += 1) {
    const b = bytes[i];
    if (radix === 'binary') {
      parts.push(b.toString(2).padStart(8, '0'));
    } else if (radix === 'octal') {
      parts.push(b.toString(8).padStart(3, '0'));
    } else {
      parts.push(b.toString(10));
    }
  }
  return parts.join(' ');
}

export function decodeRadix(input: string, radix: BinaryRadix): Uint8Array {
  const trimmed = input.trim();
  if (!trimmed) {
    return new Uint8Array(0);
  }
  const tokens = trimmed.split(/[\s,;]+/).filter(Boolean);
  const bytes: number[] = [];

  for (const token of tokens) {
    if (radix === 'binary') {
      if (!/^[01]+$/.test(token)) {
        throw new Error(`Invalid binary character in token "${token}" (expected 0 or 1).`);
      }
      if (token.length % 8 !== 0) {
        throw new Error(`Binary group "${token}" must be an 8-bit multiple.`);
      }
      for (let i = 0; i < token.length; i += 8) {
        bytes.push(parseInt(token.slice(i, i + 8), 2));
      }
    } else if (radix === 'octal') {
      if (!/^[0-7]+$/.test(token)) {
        throw new Error(`Invalid octal character in token "${token}" (expected digits 0-7).`);
      }
      const val = parseInt(token, 8);
      if (val < 0 || val > 255) {
        throw new Error(`Octal byte "${token}" out of range (expected 000–377).`);
      }
      bytes.push(val);
    } else {
      if (!/^\d+$/.test(token)) {
        throw new Error(`Invalid decimal character in token "${token}" (expected digits 0-9).`);
      }
      const val = parseInt(token, 10);
      if (val < 0 || val > 255) {
        throw new Error(`Decimal byte "${token}" out of range (expected 0–255).`);
      }
      bytes.push(val);
    }
  }

  return new Uint8Array(bytes);
}

const ITU_MORSE_MAP: Readonly<Record<string, string>> = {
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
  '0': '-----',
  '1': '.----',
  '2': '..---',
  '3': '...--',
  '4': '....-',
  '5': '.....',
  '6': '-....',
  '7': '--...',
  '8': '---..',
  '9': '----.',
  '.': '.-.-.-',
  ',': '--..--',
  '?': '..--..',
  "'": '.----.',
  '!': '-.-.--',
  '/': '-..-.',
  '(': '-.--.',
  ')': '-.--.-',
  '&': '.-...',
  ':': '---...',
  ';': '-.-.-.',
  '=': '-...-',
  '+': '.-.-.',
  '-': '-....-',
  _: '..--.-',
  '"': '.-..-.',
  $: '...-..-',
  '@': '.--.-.',
};

const REVERSE_ITU_MORSE_MAP: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(ITU_MORSE_MAP).map(([char, code]) => [code, char])
);

function normalizeMorseGlyphs(raw: string): string {
  return raw
    .replace(/[·•∙]/g, '.')
    .replace(/[–—−]/g, '-');
}

export function encodeMorse(text: string): string {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if (!normalized) {
    return '';
  }

  const words = normalized.split(/\s+/);
  const encodedWords: string[] = [];

  for (const word of words) {
    const encodedLetters: string[] = [];
    for (const ch of word) {
      const code = ITU_MORSE_MAP[ch];
      if (code) {
        encodedLetters.push(code);
      }
    }
    if (encodedLetters.length > 0) {
      encodedWords.push(encodedLetters.join(' '));
    }
  }

  return encodedWords.join(' / ');
}

export function decodeMorse(morse: string): string {
  const normalized = normalizeMorseGlyphs(morse).trim();
  if (!normalized) {
    return '';
  }

  const words = normalized.split(/\s*\/\s*|\s{3,}/);
  const decodedWords: string[] = [];

  for (const word of words) {
    const tokens = word.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) {
      continue;
    }
    let wordText = '';
    for (const token of tokens) {
      const ch = REVERSE_ITU_MORSE_MAP[token];
      wordText += ch ?? '?';
    }
    decodedWords.push(wordText);
  }

  return decodedWords.join(' ');
}

export function buildMorseTimeline(morseCode: string, wpm: number): MorseTimeline {
  const clampedWpm = Math.min(35, Math.max(5, Math.round(wpm || 20)));
  const dotSec = 1.2 / clampedWpm;
  const normalized = normalizeMorseGlyphs(morseCode).trim();
  if (!normalized) {
    return { events: [], totalDurationSec: 0, truncated: false };
  }

  const words = normalized.split(/\s*\/\s*|\s{3,}/).filter((w) => w.trim().length > 0);
  const events: MorseTimelineEvent[] = [];
  let cursor = 0;
  let truncated = false;

  const pushEvent = (type: 'tone' | 'silence', durationSec: number): boolean => {
    if (cursor >= MAX_MORSE_WAV_SECONDS) {
      truncated = true;
      return false;
    }
    if (cursor + durationSec > MAX_MORSE_WAV_SECONDS) {
      const remaining = MAX_MORSE_WAV_SECONDS - cursor;
      if (remaining > 0.001) {
        events.push({ type, startSec: cursor, durationSec: remaining });
        cursor = MAX_MORSE_WAV_SECONDS;
      }
      truncated = true;
      return false;
    }
    events.push({ type, startSec: cursor, durationSec });
    cursor += durationSec;
    return true;
  };

  for (let w = 0; w < words.length && !truncated; w += 1) {
    if (w > 0) {
      if (!pushEvent('silence', 7 * dotSec)) break;
    }
    const letters = words[w].trim().split(/\s+/).filter(Boolean);
    for (let l = 0; l < letters.length && !truncated; l += 1) {
      if (l > 0) {
        if (!pushEvent('silence', 3 * dotSec)) break;
      }
      const symbols = letters[l];
      for (let s = 0; s < symbols.length && !truncated; s += 1) {
        const sym = symbols[s];
        if (sym !== '.' && sym !== '-') {
          continue;
        }
        if (s > 0) {
          if (!pushEvent('silence', dotSec)) break;
        }
        const toneDur = sym === '-' ? 3 * dotSec : dotSec;
        if (!pushEvent('tone', toneDur)) break;
      }
    }
  }

  return {
    events,
    totalDurationSec: cursor,
    truncated,
  };
}

function writeAscii(view: Uint8Array, offset: number, text: string): void {
  for (let i = 0; i < text.length; i += 1) {
    view[offset + i] = text.charCodeAt(i);
  }
}

export function synthesizeMorseWav(
  morseCode: string,
  wpm: number,
  frequencyHz: number,
  sampleRate = 22050
): { wavBytes: Uint8Array; durationSec: number; truncated: boolean } {
  const freq = Math.min(900, Math.max(400, frequencyHz || 650));
  const timeline = buildMorseTimeline(morseCode, wpm);
  const totalSamples = Math.max(
    1,
    Math.min(
      Math.ceil(MAX_MORSE_WAV_SECONDS * sampleRate),
      Math.ceil(timeline.totalDurationSec * sampleRate)
    )
  );

  const dataByteLen = totalSamples * 2;
  const wavBytes = new Uint8Array(44 + dataByteLen);
  const view = new DataView(wavBytes.buffer);

  writeAscii(wavBytes, 0, 'RIFF');
  view.setUint32(4, 36 + dataByteLen, true);
  writeAscii(wavBytes, 8, 'WAVE');
  writeAscii(wavBytes, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM subchunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeAscii(wavBytes, 36, 'data');
  view.setUint32(40, dataByteLen, true);

  const maxRampSamples = Math.max(1, Math.floor(0.005 * sampleRate));

  for (const event of timeline.events) {
    if (event.type !== 'tone') {
      continue;
    }
    const startSample = Math.max(0, Math.floor(event.startSec * sampleRate));
    const endSample = Math.min(
      totalSamples,
      Math.floor((event.startSec + event.durationSec) * sampleRate)
    );
    const toneLen = endSample - startSample;
    if (toneLen <= 0) {
      continue;
    }

    const rampSamples = Math.min(maxRampSamples, Math.floor(toneLen / 2));
    for (let i = startSample; i < endSample; i += 1) {
      const localIdx = i - startSample;
      const tailIdx = endSample - 1 - i;
      const env =
        rampSamples > 0
          ? Math.min(1, localIdx / rampSamples, tailIdx / rampSamples)
          : 1;
      const sample = Math.round(
        0.45 * 32767 * env * Math.sin((2 * Math.PI * freq * i) / sampleRate)
      );
      view.setInt16(44 + i * 2, sample, true);
    }
  }

  return {
    wavBytes,
    durationSec: timeline.totalDurationSec,
    truncated: timeline.truncated,
  };
}
