import { describe, it, expect } from 'vitest';
import {
  parseFontMetadata,
  validateFontBuffer,
  getUnicodeRangeForPreset,
  generateFontFaceCss,
  processFontSubset,
} from './engine';
import {
  DEFAULT_FONT_OPTIONS,
  createSyntheticTrueTypeFont,
} from './test-fixtures';

describe('FontSubsetEngine (engine.ts) - Seam 1', () => {
  describe('validateFontBuffer', () => {
    it('should validate valid TrueType SFNT buffer', () => {
      const fontBuffer = createSyntheticTrueTypeFont();
      const res = validateFontBuffer(fontBuffer);

      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('should reject empty or undersized buffers', () => {
      expect(validateFontBuffer(new ArrayBuffer(0)).isValid).toBe(false);
      expect(validateFontBuffer(new ArrayBuffer(8)).isValid).toBe(false);
    });

    it('should reject unrecognized magic signatures', () => {
      const buffer = new ArrayBuffer(32);
      new DataView(buffer).setUint32(0, 0x12345678);
      expect(validateFontBuffer(buffer).isValid).toBe(false);
    });
  });

  describe('parseFontMetadata', () => {
    it('should parse SFNT table directory and tags', () => {
      const fontBuffer = createSyntheticTrueTypeFont(true, true);
      const meta = parseFontMetadata(fontBuffer);

      expect(meta.isTrueType).toBe(true);
      expect(meta.tables).toContain('cmap');
      expect(meta.tables).toContain('head');
      expect(meta.tables).toContain('kern');
      expect(meta.tables).toContain('GSUB');
      expect(meta.originalSize).toBe(fontBuffer.byteLength);
    });
  });

  describe('getUnicodeRangeForPreset', () => {
    it('should return ASCII range U+0020-007E for basic_latin_ascii', () => {
      const { rangeString, characterSet } = getUnicodeRangeForPreset('basic_latin_ascii');

      expect(rangeString).toBe('U+0020-007E');
      expect(characterSet.has(65)).toBe(true); // 'A'
      expect(characterSet.has(97)).toBe(true); // 'a'
      expect(characterSet.has(48)).toBe(true); // '0'
      expect(characterSet.has(200)).toBe(false);
    });

    it('should include accented characters for latin_supplement', () => {
      const { rangeString, characterSet } = getUnicodeRangeForPreset('latin_supplement');

      expect(rangeString).toContain('U+0020-007E');
      expect(rangeString).toContain('U+00A0-00FF');
      expect(characterSet.has(233)).toBe(true); // 'é'
    });

    it('should restrict to digits and punctuation for numbers_punctuation_only', () => {
      const { characterSet } = getUnicodeRangeForPreset('numbers_punctuation_only');

      expect(characterSet.has(48)).toBe(true); // '0'
      expect(characterSet.has(65)).toBe(false); // 'A'
    });

    it('should extract exact codepoints for custom_characters', () => {
      const { characterSet } = getUnicodeRangeForPreset('custom_characters', 'Hello 123');

      expect(characterSet.has('H'.charCodeAt(0))).toBe(true);
      expect(characterSet.has('e'.charCodeAt(0))).toBe(true);
      expect(characterSet.has('Z'.charCodeAt(0))).toBe(false);
    });
  });

  describe('generateFontFaceCss', () => {
    it('should generate valid @font-face rule with format and unicode-range', () => {
      const css = generateFontFaceCss('CustomBrand', 'woff2', 'CustomBrand.woff2', 'U+0020-007E');

      expect(css).toContain("@font-face {");
      expect(css).toContain("font-family: 'CustomBrand';");
      expect(css).toContain("url('CustomBrand.woff2') format('woff2');");
      expect(css).toContain("font-display: swap;");
      expect(css).toContain("unicode-range: U+0020-007E;");
    });
  });

  describe('processFontSubset', () => {
    it('should process font buffer and strip layout features when requested', () => {
      const fontBuffer = createSyntheticTrueTypeFont(true, true);
      const result = processFontSubset(fontBuffer, {
        ...DEFAULT_FONT_OPTIONS,
        dropLayoutFeatures: true,
        keepKerningTables: false,
      });

      expect(result.success).toBe(true);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.fileName).toContain('.woff2');
      expect(result.mimeType).toBe('font/woff2');
      expect(result.stats.originalBytes).toBe(fontBuffer.byteLength);
      expect(result.stats.subsetBytes).toBeLessThanOrEqual(result.stats.originalBytes);
      expect(result.stats.savingsPercent).toBeGreaterThanOrEqual(0);
      expect(result.metadata?.tables).not.toContain('GSUB');
      expect(result.metadata?.tables).not.toContain('kern');
    });

    it('should preserve kerning tables when keepKerningTables is true', () => {
      const fontBuffer = createSyntheticTrueTypeFont(true, true);
      const result = processFontSubset(fontBuffer, {
        ...DEFAULT_FONT_OPTIONS,
        dropLayoutFeatures: false,
        keepKerningTables: true,
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.tables).toContain('kern');
      expect(result.metadata?.tables).toContain('GSUB');
    });

    it('should support outputting woff and ttf formats', () => {
      const fontBuffer = createSyntheticTrueTypeFont();

      const woffRes = processFontSubset(fontBuffer, {
        ...DEFAULT_FONT_OPTIONS,
        outputFormat: 'woff',
      });
      expect(woffRes.fileName).toContain('.woff');
      expect(woffRes.mimeType).toBe('font/woff');

      const ttfRes = processFontSubset(fontBuffer, {
        ...DEFAULT_FONT_OPTIONS,
        outputFormat: 'ttf',
      });
      expect(ttfRes.fileName).toContain('.ttf');
      expect(ttfRes.mimeType).toBe('font/ttf');
    });

    it('should handle corrupt or invalid buffer gracefully', () => {
      const result = processFontSubset(new ArrayBuffer(10), DEFAULT_FONT_OPTIONS);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.fileSize).toBe(0);
    });
  });
});
