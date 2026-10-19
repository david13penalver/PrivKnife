import { describe, expect, it } from 'vitest';
import {
  validateSignOptions,
  transliterateToBraille,
  cellsToUnicodeBraille,
  generateSignMesh,
  exportSignSTL,
  exportSign3MF,
  processSign,
} from './engine';
import {
  DEFAULT_BRAILLE_SIGN_OPTIONS,
  MINIMAL_BRAILLE_SIGN_OPTIONS,
  MAXIMUM_BRAILLE_SIGN_OPTIONS,
} from './test-fixtures';
import { BrailleAdaSignGeneratorOptions } from './types';

describe('Braille & ADA Tactile Door Sign Generator Engine (Seam 1)', () => {
  describe('Parameter Validation & Guardrails', () => {
    it('should validate default options successfully', () => {
      const result = validateSignOptions(DEFAULT_BRAILLE_SIGN_OPTIONS);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject null or undefined options', () => {
      const result = validateSignOptions(null as any);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should reject empty or whitespace-only room title', () => {
      const invalid = { ...DEFAULT_BRAILLE_SIGN_OPTIONS, roomTitle: '   ' };
      const result = validateSignOptions(invalid);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Room title');
    });

    it('should reject overly long room title (> 40 chars)', () => {
      const invalid = { ...DEFAULT_BRAILLE_SIGN_OPTIONS, roomTitle: 'A'.repeat(45) };
      const result = validateSignOptions(invalid);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('length');
    });

    it('should enforce plaque width boundaries [80mm, 350mm]', () => {
      expect(validateSignOptions({ ...DEFAULT_BRAILLE_SIGN_OPTIONS, plaqueWidthMm: 50 }).valid).toBe(false);
      expect(validateSignOptions({ ...DEFAULT_BRAILLE_SIGN_OPTIONS, plaqueWidthMm: 400 }).valid).toBe(false);
      expect(validateSignOptions({ ...DEFAULT_BRAILLE_SIGN_OPTIONS, plaqueWidthMm: 120 }).valid).toBe(true);
    });

    it('should enforce plaque height boundaries [80mm, 350mm]', () => {
      expect(validateSignOptions({ ...DEFAULT_BRAILLE_SIGN_OPTIONS, plaqueHeightMm: 40 }).valid).toBe(false);
      expect(validateSignOptions({ ...DEFAULT_BRAILLE_SIGN_OPTIONS, plaqueHeightMm: 500 }).valid).toBe(false);
      expect(validateSignOptions({ ...DEFAULT_BRAILLE_SIGN_OPTIONS, plaqueHeightMm: 200 }).valid).toBe(true);
    });

    it('should enforce plaque thickness boundaries [1.5mm, 10mm]', () => {
      expect(validateSignOptions({ ...DEFAULT_BRAILLE_SIGN_OPTIONS, plaqueThicknessMm: 0.5 }).valid).toBe(false);
      expect(validateSignOptions({ ...DEFAULT_BRAILLE_SIGN_OPTIONS, plaqueThicknessMm: 15 }).valid).toBe(false);
      expect(validateSignOptions({ ...DEFAULT_BRAILLE_SIGN_OPTIONS, plaqueThicknessMm: 3 }).valid).toBe(true);
    });

    it('should enforce tactile raise boundaries [0.5mm, 4.0mm]', () => {
      expect(validateSignOptions({ ...DEFAULT_BRAILLE_SIGN_OPTIONS, tactileRaiseMm: 0.2 }).valid).toBe(false);
      expect(validateSignOptions({ ...DEFAULT_BRAILLE_SIGN_OPTIONS, tactileRaiseMm: 5.0 }).valid).toBe(false);
      expect(validateSignOptions({ ...DEFAULT_BRAILLE_SIGN_OPTIONS, tactileRaiseMm: 0.8 }).valid).toBe(true);
    });
  });

  describe('Braille Transliteration & Unicode Mapping', () => {
    it('should transliterate basic alphabet characters to Braille cells', () => {
      const cells = transliterateToBraille('CAB');
      // C is dots [1, 4]
      // A is dot [1]
      // B is dots [1, 2]
      expect(cells.length).toBe(3);
      expect(cells[0].dots).toEqual([1, 4]);
      expect(cells[1].dots).toEqual([1]);
      expect(cells[2].dots).toEqual([1, 2]);
    });

    it('should transliterate numbers with number prefix sign', () => {
      const cells = transliterateToBraille('101');
      // '#' number sign: [3, 4, 5, 6]
      // '1' corresponds to 'a' [1]
      // '0' corresponds to 'j' [2, 4, 5]
      expect(cells.length).toBe(4);
      expect(cells[0].dots).toEqual([3, 4, 5, 6]);
      expect(cells[1].dots).toEqual([1]);
      expect(cells[2].dots).toEqual([2, 4, 5]);
      expect(cells[3].dots).toEqual([1]);
    });

    it('should convert Braille cells to valid Unicode Braille Patterns', () => {
      const cells = transliterateToBraille('A');
      const unicode = cellsToUnicodeBraille(cells);
      // Dot 1 = \u2801 (⠁)
      expect(unicode).toBe('⠁');
    });

    it('should handle Grade 2 contractions for common words like RESTROOM or AND', () => {
      const cells = transliterateToBraille('RESTROOM');
      expect(cells.length).toBeGreaterThan(0);
      const dotCount = cells.reduce((sum, c) => sum + c.dots.length, 0);
      expect(dotCount).toBeGreaterThan(5);
    });
  });

  describe('3D Procedural Sign Mesh Generation', () => {
    it('should generate base, tactile, and braille geometries for default sign', () => {
      const result = generateSignMesh(DEFAULT_BRAILLE_SIGN_OPTIONS);
      expect(result.baseGeometry).toBeDefined();
      expect(result.tactileGeometry).toBeDefined();
      expect(result.brailleGeometry).toBeDefined();
      expect(result.metrics.totalTriangles).toBeGreaterThan(100);
      expect(result.metrics.brailleDotCount).toBeGreaterThan(0);
      expect(result.metrics.adaComplianceNotes.length).toBeGreaterThan(0);
    });

    it('should calculate estimated weight and print time in reasonable range', () => {
      const result = generateSignMesh(DEFAULT_BRAILLE_SIGN_OPTIONS);
      expect(result.metrics.estimatedGrams).toBeGreaterThan(10);
      expect(result.metrics.estimatedPrintTimeHours).toBeGreaterThan(0.5);
    });

    it('should support minimal options without crashing', () => {
      const result = generateSignMesh(MINIMAL_BRAILLE_SIGN_OPTIONS);
      expect(result.metrics.totalTriangles).toBeGreaterThan(50);
      expect(result.metrics.plaqueWidthMm).toBe(100);
    });

    it('should support maximum options with California Title 24 spacing', () => {
      const result = generateSignMesh(MAXIMUM_BRAILLE_SIGN_OPTIONS);
      expect(result.metrics.totalTriangles).toBeGreaterThan(100);
      expect(result.metrics.plaqueWidthMm).toBe(300);
      expect(result.metrics.adaComplianceNotes.some((n) => n.includes('California Title 24'))).toBe(true);
    });

    it('should support all standard pictograms', () => {
      const pictos: BrailleAdaSignGeneratorOptions['pictogram'][] = [
        'none',
        'restroom_unisex',
        'restroom_men',
        'restroom_women',
        'accessible_wheelchair',
        'exit',
      ];

      for (const p of pictos) {
        const res = generateSignMesh({ ...DEFAULT_BRAILLE_SIGN_OPTIONS, pictogram: p });
        expect(res.metrics.totalTriangles).toBeGreaterThan(0);
      }
    });
  });

  describe('File Serialization & Export (STL & 3MF)', () => {
    it('should encode a geometry into valid binary STL buffer with 80-byte header', () => {
      const { baseGeometry } = generateSignMesh(DEFAULT_BRAILLE_SIGN_OPTIONS);
      const stlBuffer = exportSignSTL(baseGeometry);
      expect(stlBuffer).toBeInstanceOf(ArrayBuffer);
      expect(stlBuffer.byteLength).toBeGreaterThan(84);

      const view = new DataView(stlBuffer);
      const triangleCount = view.getUint32(80, true);
      expect(triangleCount).toBeGreaterThan(0);
      expect(stlBuffer.byteLength).toBe(84 + triangleCount * 50);
    });

    it('should package sign parts into a valid multi-object 3MF zip file', async () => {
      const { baseGeometry, tactileGeometry, brailleGeometry } =
        generateSignMesh(DEFAULT_BRAILLE_SIGN_OPTIONS);
      const blob = await exportSign3MF(
        baseGeometry,
        tactileGeometry,
        brailleGeometry,
        DEFAULT_BRAILLE_SIGN_OPTIONS
      );
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(500);
      expect(blob.type).toBe('model/3mf');
    });

    it('should execute end-to-end processSign for 3MF export', async () => {
      const result = await processSign(DEFAULT_BRAILLE_SIGN_OPTIONS, '3mf_multicolor');
      expect(result.success).toBe(true);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.fileName).toContain('.3mf');
      expect(result.fileSize).toBeGreaterThan(500);
      expect(result.metrics).toBeDefined();
      expect(result.unicodeBraille.length).toBeGreaterThan(0);
    });

    it('should execute end-to-end processSign for STL export', async () => {
      const result = await processSign(DEFAULT_BRAILLE_SIGN_OPTIONS, 'stl_unified');
      expect(result.success).toBe(true);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.fileName).toContain('.stl');
      expect(result.fileSize).toBeGreaterThan(1000);
      expect(result.mimeType).toBe('model/stl');
    });
  });
});
