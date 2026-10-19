import { describe, it, expect } from 'vitest';
import {
  validateClampOptions,
  generateClampGeometries,
  calculateClampMetrics,
  exportClampSTL,
  exportClamp3MF,
  processClamp,
} from './engine';
import {
  DEFAULT_CLAMP_OPTIONS,
  CABLE_RACEWAY_OPTIONS,
  POWER_STRIP_OPTIONS,
  CUP_HOLDER_OPTIONS,
  INVALID_CLAMP_DESK_TOO_THIN,
  INVALID_CLAMP_GAP_SMALLER_THAN_DESK,
  INVALID_CLAMP_FRAME_TOO_THIN,
} from './test-fixtures';

describe('UnderDeskClampEngine (Seam 1: Pure Processing Engine)', () => {
  describe('validateClampOptions', () => {
    it('should validate default configuration successfully', () => {
      const result = validateClampOptions(DEFAULT_CLAMP_OPTIONS);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate all accessory presets', () => {
      expect(validateClampOptions(CABLE_RACEWAY_OPTIONS).valid).toBe(true);
      expect(validateClampOptions(POWER_STRIP_OPTIONS).valid).toBe(true);
      expect(validateClampOptions(CUP_HOLDER_OPTIONS).valid).toBe(true);
    });

    it('should reject null or undefined options', () => {
      // @ts-expect-error Testing invalid runtime input
      expect(validateClampOptions(null).valid).toBe(false);
      // @ts-expect-error Testing invalid runtime input
      expect(validateClampOptions(undefined).valid).toBe(false);
    });

    it('should reject desk thickness less than 8mm or exceeding 150mm', () => {
      expect(validateClampOptions(INVALID_CLAMP_DESK_TOO_THIN).valid).toBe(false);
      expect(
        validateClampOptions({ ...DEFAULT_CLAMP_OPTIONS, deskThicknessMm: 200 }).valid
      ).toBe(false);
    });

    it('should reject clamp gap smaller than desk thickness + 5mm', () => {
      const result = validateClampOptions(INVALID_CLAMP_GAP_SMALLER_THAN_DESK);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('gap');
    });

    it('should reject frame thickness below 6mm', () => {
      const result = validateClampOptions(INVALID_CLAMP_FRAME_TOO_THIN);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Frame thickness');
    });

    it('should reject invalid screw diameter or pitch', () => {
      expect(
        validateClampOptions({ ...DEFAULT_CLAMP_OPTIONS, screwDiameterMm: 5 }).valid
      ).toBe(false);
      expect(
        validateClampOptions({ ...DEFAULT_CLAMP_OPTIONS, screwPitchMm: 0.5 }).valid
      ).toBe(false);
    });
  });

  describe('generateClampGeometries', () => {
    it('should generate valid BufferGeometries for clamp frame, bolt, and foot pad', () => {
      const { clampGeometry, boltGeometry, footPadGeometry, combinedGeometry } =
        generateClampGeometries(DEFAULT_CLAMP_OPTIONS);

      expect(clampGeometry).toBeDefined();
      expect(boltGeometry).toBeDefined();
      expect(footPadGeometry).toBeDefined();
      expect(combinedGeometry).toBeDefined();

      expect(clampGeometry.getAttribute('position').count).toBeGreaterThan(0);
      expect(boltGeometry.getAttribute('position').count).toBeGreaterThan(0);
      expect(footPadGeometry.getAttribute('position').count).toBeGreaterThan(0);
      expect(combinedGeometry.getAttribute('position').count).toBeGreaterThan(0);

      clampGeometry.dispose();
      boltGeometry.dispose();
      footPadGeometry.dispose();
      combinedGeometry.dispose();
    });

    it('should handle all 4 accessory types without error', () => {
      const presets = [
        DEFAULT_CLAMP_OPTIONS, // headphone_hanger
        CABLE_RACEWAY_OPTIONS, // cable_raceway
        POWER_STRIP_OPTIONS, // power_strip_holder
        CUP_HOLDER_OPTIONS, // cup_holder
      ];

      for (const preset of presets) {
        const { clampGeometry, combinedGeometry } = generateClampGeometries(preset);
        expect(clampGeometry.getAttribute('position').count).toBeGreaterThan(20);
        expect(combinedGeometry.getAttribute('position').count).toBeGreaterThan(50);
        clampGeometry.dispose();
        combinedGeometry.dispose();
      }
    });

    it('should support swivelFootPad disabled', () => {
      const { footPadGeometry, combinedGeometry } = generateClampGeometries({
        ...DEFAULT_CLAMP_OPTIONS,
        swivelFootPad: false,
      });

      expect(footPadGeometry.getAttribute('position').count).toBe(0);
      expect(combinedGeometry.getAttribute('position').count).toBeGreaterThan(0);
      footPadGeometry.dispose();
      combinedGeometry.dispose();
    });

    it('should support exploded view offset for 3D preview inspection', () => {
      const normal = generateClampGeometries(DEFAULT_CLAMP_OPTIONS, false);
      const exploded = generateClampGeometries(DEFAULT_CLAMP_OPTIONS, true);

      expect(normal.boltGeometry.boundingBox).toBeDefined();
      expect(exploded.boltGeometry.boundingBox).toBeDefined();

      normal.clampGeometry.dispose();
      normal.boltGeometry.dispose();
      normal.footPadGeometry.dispose();
      normal.combinedGeometry.dispose();

      exploded.clampGeometry.dispose();
      exploded.boltGeometry.dispose();
      exploded.footPadGeometry.dispose();
      exploded.combinedGeometry.dispose();
    });
  });

  describe('calculateClampMetrics', () => {
    it('should calculate valid bounding dimensions, triangle counts, print time, and weight', () => {
      const { clampGeometry, boltGeometry, footPadGeometry } =
        generateClampGeometries(DEFAULT_CLAMP_OPTIONS);
      const metrics = calculateClampMetrics(
        clampGeometry,
        boltGeometry,
        footPadGeometry,
        DEFAULT_CLAMP_OPTIONS
      );

      expect(metrics.totalWidthMm).toBeGreaterThan(0);
      expect(metrics.totalDepthMm).toBeGreaterThan(0);
      expect(metrics.totalHeightMm).toBeGreaterThan(0);
      expect(metrics.totalTriangles).toBeGreaterThan(0);
      expect(metrics.estimatedGrams).toBeGreaterThan(10);
      expect(metrics.estimatedPrintTimeHours).toBeGreaterThan(0.5);
      expect(metrics.slicerTips.length).toBeGreaterThan(2);

      clampGeometry.dispose();
      boltGeometry.dispose();
      footPadGeometry.dispose();
    });
  });

  describe('exportClampSTL and exportClamp3MF', () => {
    it('should export binary STL buffer', () => {
      const { combinedGeometry } = generateClampGeometries(DEFAULT_CLAMP_OPTIONS);
      const buffer = exportClampSTL(combinedGeometry);

      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(84); // 80-byte header + 4-byte triangle count
      combinedGeometry.dispose();
    });

    it('should export multi-object 3MF zip blob', async () => {
      const { clampGeometry, boltGeometry, footPadGeometry } =
        generateClampGeometries(DEFAULT_CLAMP_OPTIONS);
      const blob = await exportClamp3MF(
        clampGeometry,
        boltGeometry,
        footPadGeometry,
        DEFAULT_CLAMP_OPTIONS
      );

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('model/3mf');
      expect(blob.size).toBeGreaterThan(500);

      clampGeometry.dispose();
      boltGeometry.dispose();
      footPadGeometry.dispose();
    });
  });

  describe('processClamp', () => {
    it('should execute full pipeline and return valid STL result', async () => {
      const result = await processClamp(DEFAULT_CLAMP_OPTIONS, 'stl');

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('model/stl');
      expect(result.fileName).toContain('.stl');
      expect(result.fileSize).toBeGreaterThan(100);
      expect(result.metrics.totalTriangles).toBeGreaterThan(0);
    });

    it('should execute full pipeline and return valid 3MF result', async () => {
      const result = await processClamp(CABLE_RACEWAY_OPTIONS, '3mf');

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('model/3mf');
      expect(result.fileName).toContain('.3mf');
      expect(result.fileSize).toBeGreaterThan(500);
    });

    it('should return error result when options are invalid', async () => {
      const result = await processClamp(INVALID_CLAMP_DESK_TOO_THIN);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.fileSize).toBe(0);
    });
  });
});
