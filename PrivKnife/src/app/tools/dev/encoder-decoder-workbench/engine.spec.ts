import { describe, expect, it, vi } from 'vitest';
import {
  buildDataUri,
  buildMorseTimeline,
  decodeBase64ToBytes,
  decodeHex,
  decodeHtmlUnicode,
  decodeMorse,
  decodeRadix,
  encodeBytesToBase64,
  encodeHex,
  encodeHtmlUnicode,
  encodeMorse,
  encodeRadix,
  parseUrlComponents,
  rebuildUrlFromParams,
  runCodecTransform,
  sniffBinaryMagicBytes,
  synthesizeMorseWav,
} from './engine';
import {
  JPEG_HEADER_BASE64,
  MORSE_SPEC_EXPECTED,
  MORSE_SPEC_INPUT,
  PDF_HEADER_BASE64,
  PNG_1X1_BASE64,
  PNG_1X1_DATA_URI,
  URL_QUERY_SAMPLE,
  UTF8_SAMPLE_TEXT,
  WEBP_HEADER_BYTES,
  XSS_HTML_SAMPLE,
  ZIP_HEADER_BASE64,
} from './test-fixtures';
import { DEFAULT_WORKBENCH_OPTIONS, MAX_MORSE_WAV_SECONDS } from './types';

describe('Universal Encoder/Decoder Workbench Engine — Seam 1A (Base64, URL & HTML/Unicode)', () => {
  describe('1. Base64 / Base64Url UTF-8 & 76-Char Wrap Codecs', () => {
    it('round-trips multi-byte UTF-8 and emoji text in Standard, URL-safe (no padding), and 76-col wrap modes', () => {
      const encodedStd = runCodecTransform(UTF8_SAMPLE_TEXT, {
        ...DEFAULT_WORKBENCH_OPTIONS,
        mode: 'base64',
        direction: 'encode',
      });
      expect(encodedStd.success).toBe(true);
      expect(encodedStd.outputText).toBe(
        encodeBytesToBase64(new TextEncoder().encode(UTF8_SAMPLE_TEXT))
      );

      const decodedStd = runCodecTransform(encodedStd.outputText, {
        ...DEFAULT_WORKBENCH_OPTIONS,
        mode: 'base64',
        direction: 'decode',
      });
      expect(decodedStd.success).toBe(true);
      expect(decodedStd.outputText).toBe(UTF8_SAMPLE_TEXT);

      const urlSafeRes = runCodecTransform(UTF8_SAMPLE_TEXT, {
        ...DEFAULT_WORKBENCH_OPTIONS,
        mode: 'base64',
        direction: 'encode',
        base64UrlSafe: true,
        base64OmitPadding: true,
      });
      expect(urlSafeRes.success).toBe(true);
      expect(urlSafeRes.outputText).not.toMatch(/[+/=]/);

      const decodedUrlSafe = runCodecTransform(urlSafeRes.outputText, {
        ...DEFAULT_WORKBENCH_OPTIONS,
        mode: 'base64',
        direction: 'decode',
      });
      expect(decodedUrlSafe.success).toBe(true);
      expect(decodedUrlSafe.outputText).toBe(UTF8_SAMPLE_TEXT);

      const longInput = 'PrivKnife-LongLine-1234567890-'.repeat(6);
      const wrapped = encodeBytesToBase64(new TextEncoder().encode(longInput), {
        wrap76: true,
      });
      const lines = wrapped.split('\n');
      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0].length).toBe(76);
      expect(new TextDecoder().decode(decodeBase64ToBytes(wrapped).bytes)).toBe(
        longInput
      );
    });

    it('rejects invalid Base64 characters (!, @) and illegal length (len % 4 === 1)', () => {
      expect(() => decodeBase64ToBytes('abc!def=')).toThrow(/character|base64/i);
      expect(() => decodeBase64ToBytes('abc@def=')).toThrow(/character|base64/i);
      expect(() => decodeBase64ToBytes('abcde')).toThrow(/length|base64/i);

      const badResult = runCodecTransform('abc!def=', {
        ...DEFAULT_WORKBENCH_OPTIONS,
        mode: 'base64',
        direction: 'decode',
      });
      expect(badResult.success).toBe(false);
      expect(badResult.error).toBeDefined();
    });
  });

  describe('2. Data URI Stripping & Binary Magic-Byte Sniffing', () => {
    it('strips data:<mime>;base64 prefix, sniffs PNG/JPEG/PDF/ZIP/WebP signatures, and builds Data URIs without crashing on binary bytes', () => {
      const pngRes = runCodecTransform(PNG_1X1_DATA_URI, {
        ...DEFAULT_WORKBENCH_OPTIONS,
        mode: 'base64',
        direction: 'decode',
      });
      expect(pngRes.success).toBe(true);
      expect(pngRes.detectedBinary?.mimeType).toBe('image/png');
      expect(pngRes.detectedBinary?.extension).toBe('png');
      expect(pngRes.decodedBytes?.byteLength).toBe(70);
      expect(buildDataUri(pngRes.decodedBytes!, 'image/png')).toBe(PNG_1X1_DATA_URI);

      const pngRawRes = runCodecTransform(PNG_1X1_BASE64, {
        ...DEFAULT_WORKBENCH_OPTIONS,
        mode: 'base64',
        direction: 'decode',
      });
      expect(pngRawRes.detectedBinary?.mimeType).toBe('image/png');

      const jpegDecoded = decodeBase64ToBytes(JPEG_HEADER_BASE64);
      expect(sniffBinaryMagicBytes(jpegDecoded.bytes)?.mimeType).toBe('image/jpeg');
      expect(sniffBinaryMagicBytes(jpegDecoded.bytes)?.extension).toBe('jpg');

      const pdfDecoded = decodeBase64ToBytes(PDF_HEADER_BASE64);
      expect(sniffBinaryMagicBytes(pdfDecoded.bytes)?.mimeType).toBe('application/pdf');
      expect(sniffBinaryMagicBytes(pdfDecoded.bytes)?.extension).toBe('pdf');

      const zipDecoded = decodeBase64ToBytes(ZIP_HEADER_BASE64);
      expect(sniffBinaryMagicBytes(zipDecoded.bytes)?.mimeType).toBe('application/zip');
      expect(sniffBinaryMagicBytes(zipDecoded.bytes)?.extension).toBe('zip');

      expect(sniffBinaryMagicBytes(WEBP_HEADER_BYTES)?.mimeType).toBe('image/webp');
      expect(sniffBinaryMagicBytes(WEBP_HEADER_BYTES)?.extension).toBe('webp');
    });
  });

  describe('3. URL Encoding / Decoding & Error Handling', () => {
    it('round-trips component, full_uri, and form_plus modes and surfaces malformed percent-encoding cleanly', () => {
      const compEnc = runCodecTransform('hello world & a=b/c?x=1', {
        ...DEFAULT_WORKBENCH_OPTIONS,
        mode: 'url',
        direction: 'encode',
        urlMode: 'component',
      });
      expect(compEnc.success).toBe(true);
      expect(compEnc.outputText).toBe('hello%20world%20%26%20a%3Db%2Fc%3Fx%3D1');

      const formEnc = runCodecTransform('hello world + 100%', {
        ...DEFAULT_WORKBENCH_OPTIONS,
        mode: 'url',
        direction: 'encode',
        urlMode: 'form_plus',
      });
      expect(formEnc.outputText).toBe('hello+world+%2B+100%25');

      const formDec = runCodecTransform('hello+world+%2B+100%25', {
        ...DEFAULT_WORKBENCH_OPTIONS,
        mode: 'url',
        direction: 'decode',
        urlMode: 'form_plus',
      });
      expect(formDec.success).toBe(true);
      expect(formDec.outputText).toBe('hello world + 100%');

      const fullEnc = runCodecTransform('https://example.com/a b?q=c d', {
        ...DEFAULT_WORKBENCH_OPTIONS,
        mode: 'url',
        direction: 'encode',
        urlMode: 'full_uri',
      });
      expect(fullEnc.outputText).toBe('https://example.com/a%20b?q=c%20d');

      const badPercent = runCodecTransform('%E0%A4%A', {
        ...DEFAULT_WORKBENCH_OPTIONS,
        mode: 'url',
        direction: 'decode',
        urlMode: 'component',
      });
      expect(badPercent.success).toBe(false);
      expect(badPercent.error).toBeDefined();

      const badHex = runCodecTransform('%ZZ', {
        ...DEFAULT_WORKBENCH_OPTIONS,
        mode: 'url',
        direction: 'decode',
        urlMode: 'component',
      });
      expect(badHex.success).toBe(false);
      expect(badHex.error).toBeDefined();
    });
  });

  describe('4. Interactive URL Query Parameter Parser & Rebuilder', () => {
    it('decomposes URL_QUERY_SAMPLE preserving duplicate params and hash, and rebuilds edits accurately', () => {
      const parsed = parseUrlComponents(URL_QUERY_SAMPLE);
      expect(parsed.validUrl).toBe(true);
      expect(parsed.protocol).toBe('https:');
      expect(parsed.host).toBe('example.com');
      expect(parsed.pathname).toBe('/search');
      expect(parsed.hash).toBe('#results');
      expect(parsed.params).toEqual([
        { key: 'q', value: 'hello world' },
        { key: 'tag', value: 'a' },
        { key: 'tag', value: 'b' },
      ]);

      const rebuilt = rebuildUrlFromParams(parsed, [
        { key: 'q', value: 'priv knife' },
        { key: 'tag', value: 'b' },
        { key: 'page', value: '2' },
      ]);
      expect(rebuilt).toBe('https://example.com/search?q=priv+knife&tag=b&page=2#results');
    });
  });

  describe('5. HTML Entities & JS Unicode Escapes (Pure TS, XSS-Safe)', () => {
    it('round-trips minimal, all_non_ascii, js_unicode, named entities, and guards out-of-range / surrogate codepoints', () => {
      const minEnc = encodeHtmlUnicode(XSS_HTML_SAMPLE, 'minimal');
      expect(minEnc).toContain('&lt;script&gt;');
      expect(minEnc).toContain('&quot;xss&quot;');
      expect(decodeHtmlUnicode(minEnc)).toBe(XSS_HTML_SAMPLE);

      const nonAsciiEnc = encodeHtmlUnicode('Café 🚀', 'all_non_ascii');
      expect(nonAsciiEnc).toBe('Caf&#233; &#x1F680;');
      expect(decodeHtmlUnicode(nonAsciiEnc)).toBe('Café 🚀');

      const jsEnc = encodeHtmlUnicode('Café 🚀', 'js_unicode');
      expect(jsEnc).toBe('Caf\\u00e9 \\u{1F680}');
      expect(decodeHtmlUnicode(jsEnc)).toBe('Café 🚀');

      // Surrogate pair & named entity checks
      expect(decodeHtmlUnicode('A &copy; B &nbsp; \\uD83D\\uDE80')).toBe(
        'A © B \u00A0 🚀'
      );

      // Out-of-range numeric entity and lone surrogate must never throw RangeError
      expect(() => decodeHtmlUnicode('&#99999999; &#xD800; &#0;')).not.toThrow();
      const safeOut = decodeHtmlUnicode('&#99999999; &#xD800; &amp;');
      expect(safeOut).toContain('&');
    });
  });
});

describe('Universal Encoder/Decoder Workbench Engine — Seam 1B (Hex, Radix, Morse & WAV Synth)', () => {
  describe('6. Hexadecimal & Byte Inspector Codecs', () => {
    it('round-trips UTF-8 text across all 5 delimiters and case modes and rejects odd/invalid hex', () => {
      const sampleBytes = new TextEncoder().encode('Hi 🚀');
      expect(encodeHex(sampleBytes, 'space', true)).toBe('48 69 20 F0 9F 9A 80');
      expect(encodeHex(sampleBytes, 'none', false)).toBe('486920f09f9a80');
      expect(encodeHex(sampleBytes, 'colon', true)).toBe('48:69:20:F0:9F:9A:80');
      expect(encodeHex(sampleBytes, '0x', true)).toBe('0x48 0x69 0x20 0xF0 0x9F 0x9A 0x80');
      expect(encodeHex(sampleBytes, 'backslash_x', false)).toBe(
        '\\x48\\x69\\x20\\xf0\\x9f\\x9a\\x80'
      );

      for (const delim of ['space', 'none', 'colon', '0x', 'backslash_x'] as const) {
        const enc = encodeHex(sampleBytes, delim, delim === 'colon');
        expect(new TextDecoder().decode(decodeHex(enc))).toBe('Hi 🚀');
      }

      expect(() => decodeHex('ABC')).toThrow(/even|odd|hex/i);
      expect(() => decodeHex('48 ZZ')).toThrow(/invalid|hex/i);

      const errRes = runCodecTransform('48 ZZ', {
        ...DEFAULT_WORKBENCH_OPTIONS,
        mode: 'hex',
        direction: 'decode',
      });
      expect(errRes.success).toBe(false);
    });
  });

  describe('7. Binary, Octal & Decimal Radix Translators', () => {
    it('round-trips UTF-8 bytes in 8-bit binary, octal, and decimal and rejects malformed tokens', () => {
      const bytes = new TextEncoder().encode('OK!');
      expect(encodeRadix(bytes, 'binary')).toBe('01001111 01001011 00100001');
      expect(encodeRadix(bytes, 'octal')).toBe('117 113 041');
      expect(encodeRadix(bytes, 'decimal')).toBe('79 75 33');

      expect(new TextDecoder().decode(decodeRadix('01001111 01001011 00100001', 'binary'))).toBe(
        'OK!'
      );
      expect(new TextDecoder().decode(decodeRadix('117 113 041', 'octal'))).toBe('OK!');
      expect(new TextDecoder().decode(decodeRadix('79 75 33', 'decimal'))).toBe('OK!');

      expect(() => decodeRadix('0101', 'binary')).toThrow(/8-bit|multiple/i);
      expect(() => decodeRadix('01021010', 'binary')).toThrow(/binary|character/i);
      expect(() => decodeRadix('300', 'decimal')).toThrow(/range|255|byte/i);
      expect(() => decodeRadix('400', 'octal')).toThrow(/range|octal|byte/i);
    });
  });

  describe('8. ITU Morse Code Encoder & Decoder', () => {
    it('encodes SOS 2026, strips accents, supports ITU punctuation, and decodes ASCII & Unicode Morse glyphs', () => {
      expect(encodeMorse(MORSE_SPEC_INPUT)).toBe(MORSE_SPEC_EXPECTED);
      expect(encodeMorse('CAFÉ!')).toBe('-.-. .- ..-. . -.-.--');
      expect(encodeMorse('A@B?')).toBe('.- .--.-. -... ..--..');

      expect(decodeMorse(MORSE_SPEC_EXPECTED)).toBe('SOS 2026');
      expect(decodeMorse('··· ––– ··· / ··––– ––––– ··––– –····')).toBe('SOS 2026');
    });
  });

  describe('9. Morse PARIS Timing, RIFF WAVE PCM Synth & Duration Bounds', () => {
    it('builds PARIS timeline at 20 WPM and synthesizes a valid envelope-shaped 16-bit PCM WAV bounded by MAX_MORSE_WAV_SECONDS', () => {
      const timeline = buildMorseTimeline('... --- ...', 20);
      expect(timeline.truncated).toBe(false);
      // dot = 0.06s, silence = 0.06s, dash = 0.18s, letter gap = 0.18s
      const firstTone = timeline.events.find((e) => e.type === 'tone');
      expect(firstTone?.durationSec).toBeCloseTo(0.06, 5);
      const dashTone = timeline.events.find(
        (e) => e.type === 'tone' && Math.abs(e.durationSec - 0.18) < 1e-5
      );
      expect(dashTone).toBeDefined();

      const wav = synthesizeMorseWav('... --- ...', 20, 650, 22050);
      expect(wav.truncated).toBe(false);
      expect(wav.durationSec).toBeGreaterThan(0.5);
      // Validate 44-byte RIFF/WAVE header
      const headerAscii = String.fromCharCode(
        wav.wavBytes[0],
        wav.wavBytes[1],
        wav.wavBytes[2],
        wav.wavBytes[3],
        wav.wavBytes[8],
        wav.wavBytes[9],
        wav.wavBytes[10],
        wav.wavBytes[11]
      );
      expect(headerAscii).toBe('RIFFWAVE');
      // Sample 0 must be ramped near zero to avoid click artifacts
      const view = new DataView(wav.wavBytes.buffer, wav.wavBytes.byteOffset, wav.wavBytes.byteLength);
      const sample0 = view.getInt16(44, true);
      expect(Math.abs(sample0)).toBeLessThan(100);

      // Extremely long Morse stream is truncated cleanly at MAX_MORSE_WAV_SECONDS
      const hugeMorse = Array(2000).fill('---').join(' ');
      const bounded = synthesizeMorseWav(hugeMorse, 5, 400, 8000);
      expect(bounded.truncated).toBe(true);
      expect(bounded.durationSec).toBeLessThanOrEqual(MAX_MORSE_WAV_SECONDS + 0.01);
    });
  });

  describe('10. Zero-Network & Zero-Storage Privacy Audit (All 6 Modes)', () => {
    it('performs zero fetch/network calls and zero localStorage/sessionStorage writes across all codecs and WAV synth', () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const storageSpy = vi.spyOn(Storage.prototype, 'setItem');

      try {
        for (const mode of [
          'base64',
          'url',
          'html_unicode',
          'hex',
          'binary',
          'morse',
        ] as const) {
          runCodecTransform(UTF8_SAMPLE_TEXT, {
            ...DEFAULT_WORKBENCH_OPTIONS,
            mode,
            direction: 'encode',
          });
        }
        synthesizeMorseWav('... --- ...', 20, 650, 8000);
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(storageSpy).not.toHaveBeenCalled();
      } finally {
        fetchSpy.mockRestore();
        storageSpy.mockRestore();
      }
    });
  });
});
