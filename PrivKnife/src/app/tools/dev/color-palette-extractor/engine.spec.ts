import { describe, expect, it } from 'vitest';
import {
  buildContrastMatrix,
  calculateContrastRatio,
  calculateRelativeLuminance,
  createExtractedColor,
  encodeAseBinary,
  evaluateWcagCompliance,
  extractPaletteFromImageData,
  generateCssVariables,
  generateJsonTokens,
  generateWcagPdfReport,
  hexToRgb,
  rgbToHex,
  rgbToHsl,
} from './engine';
import {
  createMockImageData,
  SAMPLE_EXTRACTED_PALETTE,
} from './test-fixtures';

describe('ColorPaletteEngine (Seam 1: W3C Luminance, Contrast Matrix, Quantization & Exporters)', () => {
  describe('Color Conversion Utilities', () => {
    it('should convert hex to RGB and RGB to hex accurately', () => {
      const rgbWhite = hexToRgb('#ffffff');
      expect(rgbWhite).toEqual({ r: 255, g: 255, b: 255 });
      expect(rgbToHex(255, 255, 255)).toBe('#ffffff');

      const rgbBlue = hexToRgb('#2563eb');
      expect(rgbBlue).toEqual({ r: 37, g: 99, b: 235 });
      expect(rgbToHex(37, 99, 235)).toBe('#2563eb');
    });

    it('should convert RGB to HSL accurately', () => {
      const hslWhite = rgbToHsl(255, 255, 255);
      expect(hslWhite.l).toBe(100);

      const hslBlue = rgbToHsl(37, 99, 235);
      expect(hslBlue.h).toBeGreaterThanOrEqual(220);
      expect(hslBlue.h).toBeLessThanOrEqual(223);
      expect(hslBlue.s).toBeGreaterThanOrEqual(80);
    });
  });

  describe('W3C Relative Luminance & Contrast Ratio', () => {
    const white = createExtractedColor('#ffffff', 'White');
    const black = createExtractedColor('#000000', 'Black');
    const blue = createExtractedColor('#2563eb', 'Blue');

    it('should calculate relative luminance matching W3C spec', () => {
      expect(calculateRelativeLuminance(white.rgb)).toBeCloseTo(1.0, 3);
      expect(calculateRelativeLuminance(black.rgb)).toBeCloseTo(0.0, 3);
      expect(calculateRelativeLuminance(blue.rgb)).toBeCloseTo(0.153, 2);
    });

    it('should calculate contrast ratio matching standard W3C benchmarks', () => {
      // Black on White must be 21:1
      const blackOnWhite = calculateContrastRatio(black, white);
      expect(blackOnWhite).toBeCloseTo(21.0, 1);

      // Identical colors must be 1:1
      const whiteOnWhite = calculateContrastRatio(white, white);
      expect(whiteOnWhite).toBeCloseTo(1.0, 1);

      // Blue on White is ~5.17:1 (Passing AA Normal text >= 4.5:1)
      const blueOnWhite = calculateContrastRatio(blue, white);
      expect(blueOnWhite).toBeGreaterThan(4.5);
      expect(blueOnWhite).toBeLessThan(6.0);
    });

    it('should evaluate WCAG 2.1 compliance levels correctly', () => {
      const compliance = evaluateWcagCompliance(blue, white);

      expect(compliance.ratio).toBeGreaterThan(4.5);
      expect(compliance.passAaNormal).toBe(true);
      expect(compliance.passAaLarge).toBe(true);
      expect(compliance.passUi).toBe(true);
      // Fails AAA Normal text (which requires 7:1)
      expect(compliance.passAaaNormal).toBe(false);
    });
  });

  describe('buildContrastMatrix', () => {
    it('should construct an N x N contrast matrix with compliance data', () => {
      const palette = SAMPLE_EXTRACTED_PALETTE.slice(0, 4);
      const matrix = buildContrastMatrix(palette);

      expect(matrix.length).toBe(4);
      expect(matrix[0].length).toBe(4);

      // Diagonal elements must have ratio 1:1
      for (let i = 0; i < 4; i++) {
        expect(matrix[i][i].compliance.ratio).toBeCloseTo(1.0, 1);
      }
    });
  });

  describe('extractPaletteFromImageData', () => {
    it('should extract dominant colors from image pixel buffer via quantization', () => {
      const mockImg = createMockImageData(20, 20);
      const palette = extractPaletteFromImageData(mockImg.data, mockImg.width, mockImg.height, 4);

      expect(palette).toBeDefined();
      expect(palette.length).toBeGreaterThanOrEqual(1);
      expect(palette.length).toBeLessThanOrEqual(4);
      for (const col of palette) {
        expect(col.hex).toMatch(/^#[0-9a-f]{6}$/i);
        expect(col.luminance).toBeGreaterThanOrEqual(0);
        expect(col.luminance).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Exporters: ASE Binary, JSON, CSS & PDF', () => {
    it('should compile valid Adobe Swatch Exchange (.ase) binary format with ASEF header', () => {
      const aseBytes = encodeAseBinary(SAMPLE_EXTRACTED_PALETTE, 'PrivKnife Palette');

      expect(aseBytes).toBeInstanceOf(Uint8Array);
      // ASEF signature
      expect(aseBytes[0]).toBe(0x41); // 'A'
      expect(aseBytes[1]).toBe(0x53); // 'S'
      expect(aseBytes[2]).toBe(0x45); // 'E'
      expect(aseBytes[3]).toBe(0x46); // 'F'
      // Version 1.0 (major = 1, minor = 0)
      expect(aseBytes[4]).toBe(0);
      expect(aseBytes[5]).toBe(1);
      expect(aseBytes[6]).toBe(0);
      expect(aseBytes[7]).toBe(0);
    });

    it('should generate valid JSON design tokens string', () => {
      const jsonStr = generateJsonTokens(SAMPLE_EXTRACTED_PALETTE);
      const parsed = JSON.parse(jsonStr);

      expect(Array.isArray(parsed.tokens)).toBe(true);
      expect(parsed.tokens.length).toBe(SAMPLE_EXTRACTED_PALETTE.length);
      expect(parsed.tokens[0].hex).toBe(SAMPLE_EXTRACTED_PALETTE[0].hex);
    });

    it('should generate clean CSS custom properties block', () => {
      const css = generateCssVariables(SAMPLE_EXTRACTED_PALETTE);

      expect(css).toContain(':root {');
      expect(css).toContain('--color-1:');
      expect(css).toContain(SAMPLE_EXTRACTED_PALETTE[0].hex);
    });

    it('should generate downloadable WCAG Accessibility PDF Report', async () => {
      const matrix = buildContrastMatrix(SAMPLE_EXTRACTED_PALETTE.slice(0, 4));
      const pdfBlob = await generateWcagPdfReport(SAMPLE_EXTRACTED_PALETTE.slice(0, 4), matrix);

      expect(pdfBlob).toBeInstanceOf(Blob);
      expect(pdfBlob.type).toBe('application/pdf');
      expect(pdfBlob.size).toBeGreaterThan(0);
    });
  });
});
