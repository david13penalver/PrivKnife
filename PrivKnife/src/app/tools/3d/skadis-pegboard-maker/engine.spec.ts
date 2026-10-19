import { describe, it, expect } from 'vitest';
import {
  validateSkadisOptions,
  generateSkadisGeometries,
  calculateSkadisMetrics,
  exportSkadisSTL,
  exportSkadis3MF,
  processSkadisHolder,
} from './engine';
import {
  DEFAULT_SKADIS_OPTIONS,
  SKADIS_DUAL_PRONG_OPTIONS,
  PEGBOARD_SHELF_OPTIONS,
  SKADIS_TOOL_HOLSTER_OPTIONS,
  SKADIS_CYLINDER_CUP_OPTIONS,
  INVALID_OPTIONS_HOOK_ZERO,
  INVALID_OPTIONS_ANGLE_EXTREME,
} from './test-fixtures';

describe('SkadisPegboardEngine (Seam 1: Pure Processing Engine)', () => {
  describe('validateSkadisOptions', () => {
    it('should validate default options successfully', () => {
      const result = validateSkadisOptions(DEFAULT_SKADIS_OPTIONS);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate all presets and styles', () => {
      expect(validateSkadisOptions(SKADIS_DUAL_PRONG_OPTIONS).valid).toBe(true);
      expect(validateSkadisOptions(PEGBOARD_SHELF_OPTIONS).valid).toBe(true);
      expect(validateSkadisOptions(SKADIS_TOOL_HOLSTER_OPTIONS).valid).toBe(true);
      expect(validateSkadisOptions(SKADIS_CYLINDER_CUP_OPTIONS).valid).toBe(true);
    });

    it('should reject null or undefined options', () => {
      // @ts-expect-error Testing invalid runtime input
      expect(validateSkadisOptions(null).valid).toBe(false);
      // @ts-expect-error Testing invalid runtime input
      expect(validateSkadisOptions(undefined).valid).toBe(false);
    });

    it('should reject hook length less than 10mm or greater than 250mm', () => {
      expect(validateSkadisOptions(INVALID_OPTIONS_HOOK_ZERO).valid).toBe(false);
      expect(
        validateSkadisOptions({ ...DEFAULT_SKADIS_OPTIONS, hookLengthMm: 350 }).valid
      ).toBe(false);
    });

    it('should reject extreme hook angles outside -10 to 45 degrees', () => {
      expect(validateSkadisOptions(INVALID_OPTIONS_ANGLE_EXTREME).valid).toBe(false);
      expect(
        validateSkadisOptions({ ...DEFAULT_SKADIS_OPTIONS, hookAngleDeg: -20 }).valid
      ).toBe(false);
    });

    it('should reject invalid bracket width or tool diameter', () => {
      expect(
        validateSkadisOptions({ ...DEFAULT_SKADIS_OPTIONS, bracketWidthMm: 5 }).valid
      ).toBe(false);
      expect(
        validateSkadisOptions({ ...DEFAULT_SKADIS_OPTIONS, toolDiameterMm: 2 }).valid
      ).toBe(false);
    });
  });

  describe('generateSkadisGeometries', () => {
    it('should generate valid geometries for IKEA Skådis single hook', () => {
      const { holderGeometry, lockingWedgeGeometry, combinedGeometry } =
        generateSkadisGeometries(DEFAULT_SKADIS_OPTIONS);

      expect(holderGeometry).toBeDefined();
      expect(lockingWedgeGeometry).toBeDefined();
      expect(combinedGeometry).toBeDefined();

      expect(holderGeometry.getAttribute('position').count).toBeGreaterThan(0);
      expect(lockingWedgeGeometry.getAttribute('position').count).toBeGreaterThan(0);
      expect(combinedGeometry.getAttribute('position').count).toBeGreaterThan(0);

      holderGeometry.dispose();
      lockingWedgeGeometry.dispose();
      combinedGeometry.dispose();
    });

    it('should generate geometries across all 3 pegboard systems', () => {
      const systems = [
        'ikea_skadis',
        'standard_pegboard_1_inch',
        'standard_pegboard_half_inch',
      ] as const;

      for (const system of systems) {
        const { holderGeometry } = generateSkadisGeometries({
          ...DEFAULT_SKADIS_OPTIONS,
          pegboardSystem: system,
        });

        expect(holderGeometry.getAttribute('position').count).toBeGreaterThan(20);
        holderGeometry.dispose();
      }
    });

    it('should generate geometries across all 5 holder styles', () => {
      const presets = [
        DEFAULT_SKADIS_OPTIONS, // single_hook
        SKADIS_DUAL_PRONG_OPTIONS, // dual_prong
        PEGBOARD_SHELF_OPTIONS, // shelf_bracket
        SKADIS_TOOL_HOLSTER_OPTIONS, // tool_holster
        SKADIS_CYLINDER_CUP_OPTIONS, // cylinder_cup
      ];

      for (const preset of presets) {
        const { holderGeometry, combinedGeometry } = generateSkadisGeometries(preset);
        expect(holderGeometry.getAttribute('position').count).toBeGreaterThan(20);
        expect(combinedGeometry.getAttribute('position').count).toBeGreaterThan(20);
        holderGeometry.dispose();
        combinedGeometry.dispose();
      }
    });

    it('should support lockingWedge disabled', () => {
      const { lockingWedgeGeometry, combinedGeometry } = generateSkadisGeometries({
        ...DEFAULT_SKADIS_OPTIONS,
        lockingWedge: false,
      });

      expect(lockingWedgeGeometry.getAttribute('position').count).toBe(0);
      expect(combinedGeometry.getAttribute('position').count).toBeGreaterThan(0);

      lockingWedgeGeometry.dispose();
      combinedGeometry.dispose();
    });
  });

  describe('calculateSkadisMetrics', () => {
    it('should calculate valid physical dimensions, print metrics, and slicer tips', () => {
      const { holderGeometry, lockingWedgeGeometry } =
        generateSkadisGeometries(DEFAULT_SKADIS_OPTIONS);
      const metrics = calculateSkadisMetrics(
        holderGeometry,
        lockingWedgeGeometry,
        DEFAULT_SKADIS_OPTIONS
      );

      expect(metrics.totalWidthMm).toBeGreaterThan(0);
      expect(metrics.totalDepthMm).toBeGreaterThan(0);
      expect(metrics.totalHeightMm).toBeGreaterThan(0);
      expect(metrics.triangleCount).toBeGreaterThan(0);
      expect(metrics.estimatedGrams).toBeGreaterThan(1);
      expect(metrics.estimatedPrintTimeHours).toBeGreaterThan(0.1);
      expect(metrics.slicerTips.length).toBeGreaterThan(2);

      holderGeometry.dispose();
      lockingWedgeGeometry.dispose();
    });
  });

  describe('exportSkadisSTL and exportSkadis3MF', () => {
    it('should export binary STL buffer', () => {
      const { combinedGeometry } = generateSkadisGeometries(DEFAULT_SKADIS_OPTIONS);
      const buffer = exportSkadisSTL(combinedGeometry);

      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(84);
      combinedGeometry.dispose();
    });

    it('should export multi-object 3MF package', async () => {
      const { holderGeometry, lockingWedgeGeometry } =
        generateSkadisGeometries(DEFAULT_SKADIS_OPTIONS);
      const blob = await exportSkadis3MF(
        holderGeometry,
        lockingWedgeGeometry,
        DEFAULT_SKADIS_OPTIONS
      );

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('model/3mf');
      expect(blob.size).toBeGreaterThan(500);

      holderGeometry.dispose();
      lockingWedgeGeometry.dispose();
    });
  });

  describe('processSkadisHolder', () => {
    it('should process default options and return valid STL result', async () => {
      const result = await processSkadisHolder(DEFAULT_SKADIS_OPTIONS, 'stl');

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('model/stl');
      expect(result.fileName).toContain('.stl');
      expect(result.fileSize).toBeGreaterThan(100);
      expect(result.metrics.triangleCount).toBeGreaterThan(0);
    });

    it('should process options and return valid 3MF result', async () => {
      const result = await processSkadisHolder(SKADIS_TOOL_HOLSTER_OPTIONS, '3mf');

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('model/3mf');
      expect(result.fileName).toContain('.3mf');
      expect(result.fileSize).toBeGreaterThan(500);
    });

    it('should return failure with descriptive error on invalid input', async () => {
      const result = await processSkadisHolder(INVALID_OPTIONS_HOOK_ZERO);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.fileSize).toBe(0);
    });
  });
});
