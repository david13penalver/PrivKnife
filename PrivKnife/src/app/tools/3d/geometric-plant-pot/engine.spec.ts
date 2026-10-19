import { describe, it, expect } from 'vitest';
import {
  validatePlanterOptions,
  generatePlanterGeometries,
  calculatePlanterMetrics,
  exportPlanterSTL,
  exportPlanter3MF,
  processPlanter,
} from './engine';
import {
  DEFAULT_PLANTER_OPTIONS,
  LOW_POLY_FACETED_OPTIONS,
  FLUTED_MINIMAL_OPTIONS,
  SMOOTH_PLANTER_OPTIONS,
  INVALID_OPTIONS_DIAMETER_ZERO,
  INVALID_OPTIONS_HEIGHT_TOO_SMALL,
  INVALID_OPTIONS_SIDES_LOW,
} from './test-fixtures';

describe('GeometricPlantPotEngine (Seam 1: Pure Processing Engine)', () => {
  describe('validatePlanterOptions', () => {
    it('should validate default options successfully', () => {
      const result = validatePlanterOptions(DEFAULT_PLANTER_OPTIONS);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate all presets and styles', () => {
      expect(validatePlanterOptions(LOW_POLY_FACETED_OPTIONS).valid).toBe(true);
      expect(validatePlanterOptions(FLUTED_MINIMAL_OPTIONS).valid).toBe(true);
      expect(validatePlanterOptions(SMOOTH_PLANTER_OPTIONS).valid).toBe(true);
    });

    it('should reject null or undefined options', () => {
      // @ts-expect-error Testing invalid runtime input
      expect(validatePlanterOptions(null).valid).toBe(false);
      // @ts-expect-error Testing invalid runtime input
      expect(validatePlanterOptions(undefined).valid).toBe(false);
    });

    it('should reject top diameter less than 30mm or exceeding 350mm', () => {
      expect(validatePlanterOptions(INVALID_OPTIONS_DIAMETER_ZERO).valid).toBe(false);
      expect(
        validatePlanterOptions({ ...DEFAULT_PLANTER_OPTIONS, topDiameterMm: 450 }).valid
      ).toBe(false);
    });

    it('should reject height less than 30mm or exceeding 350mm', () => {
      expect(validatePlanterOptions(INVALID_OPTIONS_HEIGHT_TOO_SMALL).valid).toBe(false);
      expect(
        validatePlanterOptions({ ...DEFAULT_PLANTER_OPTIONS, heightMm: 500 }).valid
      ).toBe(false);
    });

    it('should reject polygon sides less than 3 or exceeding 32', () => {
      expect(validatePlanterOptions(INVALID_OPTIONS_SIDES_LOW).valid).toBe(false);
      expect(
        validatePlanterOptions({ ...DEFAULT_PLANTER_OPTIONS, polygonSides: 40 }).valid
      ).toBe(false);
    });

    it('should reject invalid wall thickness', () => {
      expect(
        validatePlanterOptions({ ...DEFAULT_PLANTER_OPTIONS, wallThicknessMm: 0.5 }).valid
      ).toBe(false);
    });
  });

  describe('generatePlanterGeometries', () => {
    it('should generate valid geometries for default self-watering planter', () => {
      const { potGeometry, insertGeometry, saucerGeometry, combinedGeometry } =
        generatePlanterGeometries(DEFAULT_PLANTER_OPTIONS);

      expect(potGeometry).toBeDefined();
      expect(insertGeometry).toBeDefined();
      expect(saucerGeometry).toBeDefined();
      expect(combinedGeometry).toBeDefined();

      expect(potGeometry.getAttribute('position').count).toBeGreaterThan(0);
      expect(insertGeometry.getAttribute('position').count).toBeGreaterThan(0);
      expect(combinedGeometry.getAttribute('position').count).toBeGreaterThan(0);

      potGeometry.dispose();
      insertGeometry.dispose();
      saucerGeometry.dispose();
      combinedGeometry.dispose();
    });

    it('should generate geometries across all 4 aesthetic styles', () => {
      const presets = [
        DEFAULT_PLANTER_OPTIONS, // twisted_polygon
        LOW_POLY_FACETED_OPTIONS, // low_poly_faceted
        FLUTED_MINIMAL_OPTIONS, // vertical_flutes
        SMOOTH_PLANTER_OPTIONS, // smooth_minimal
      ];

      for (const preset of presets) {
        const { potGeometry, combinedGeometry } = generatePlanterGeometries(preset);
        expect(potGeometry.getAttribute('position').count).toBeGreaterThan(20);
        expect(combinedGeometry.getAttribute('position').count).toBeGreaterThan(20);
        potGeometry.dispose();
        combinedGeometry.dispose();
      }
    });

    it('should generate matching saucer geometry when planterType is drainage_with_saucer', () => {
      const { saucerGeometry, combinedGeometry } =
        generatePlanterGeometries(LOW_POLY_FACETED_OPTIONS);

      expect(saucerGeometry.getAttribute('position').count).toBeGreaterThan(0);
      expect(combinedGeometry.getAttribute('position').count).toBeGreaterThan(0);

      saucerGeometry.dispose();
      combinedGeometry.dispose();
    });

    it('should support exploded view offset for 3D inspection', () => {
      const normal = generatePlanterGeometries(DEFAULT_PLANTER_OPTIONS, false);
      const exploded = generatePlanterGeometries(DEFAULT_PLANTER_OPTIONS, true);

      expect(normal.insertGeometry.boundingBox).toBeDefined();
      expect(exploded.insertGeometry.boundingBox).toBeDefined();

      normal.potGeometry.dispose();
      normal.insertGeometry.dispose();
      normal.saucerGeometry.dispose();
      normal.combinedGeometry.dispose();

      exploded.potGeometry.dispose();
      exploded.insertGeometry.dispose();
      exploded.saucerGeometry.dispose();
      exploded.combinedGeometry.dispose();
    });
  });

  describe('calculatePlanterMetrics', () => {
    it('should calculate valid physical dimensions, reservoir capacity, print weight, and tips', () => {
      const { potGeometry, insertGeometry, saucerGeometry } =
        generatePlanterGeometries(DEFAULT_PLANTER_OPTIONS);
      const metrics = calculatePlanterMetrics(
        potGeometry,
        insertGeometry,
        saucerGeometry,
        DEFAULT_PLANTER_OPTIONS
      );

      expect(metrics.outerDiameterMm).toBeGreaterThan(0);
      expect(metrics.totalHeightMm).toBeGreaterThan(0);
      expect(metrics.reservoirCapacityMl).toBeGreaterThan(0);
      expect(metrics.totalTriangles).toBeGreaterThan(0);
      expect(metrics.estimatedGrams).toBeGreaterThan(15);
      expect(metrics.estimatedPrintTimeHours).toBeGreaterThan(0.5);
      expect(metrics.slicerTips.length).toBeGreaterThan(2);

      potGeometry.dispose();
      insertGeometry.dispose();
      saucerGeometry.dispose();
    });
  });

  describe('exportPlanterSTL and exportPlanter3MF', () => {
    it('should export binary STL buffer', () => {
      const { combinedGeometry } = generatePlanterGeometries(DEFAULT_PLANTER_OPTIONS);
      const buffer = exportPlanterSTL(combinedGeometry);

      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(84);
      combinedGeometry.dispose();
    });

    it('should export multi-object 3MF package', async () => {
      const { potGeometry, insertGeometry, saucerGeometry } =
        generatePlanterGeometries(DEFAULT_PLANTER_OPTIONS);
      const blob = await exportPlanter3MF(
        potGeometry,
        insertGeometry,
        saucerGeometry,
        DEFAULT_PLANTER_OPTIONS
      );

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('model/3mf');
      expect(blob.size).toBeGreaterThan(500);

      potGeometry.dispose();
      insertGeometry.dispose();
      saucerGeometry.dispose();
    });
  });

  describe('processPlanter', () => {
    it('should process default options and return valid STL result', async () => {
      const result = await processPlanter(DEFAULT_PLANTER_OPTIONS, 'stl');

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('model/stl');
      expect(result.fileName).toContain('.stl');
      expect(result.fileSize).toBeGreaterThan(100);
      expect(result.metrics.totalTriangles).toBeGreaterThan(0);
    });

    it('should process options and return valid 3MF result', async () => {
      const result = await processPlanter(LOW_POLY_FACETED_OPTIONS, '3mf');

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('model/3mf');
      expect(result.fileName).toContain('.3mf');
      expect(result.fileSize).toBeGreaterThan(500);
    });

    it('should return failure with descriptive error on invalid input', async () => {
      const result = await processPlanter(INVALID_OPTIONS_DIAMETER_ZERO);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.fileSize).toBe(0);
    });
  });
});
