import { describe, it, expect } from 'vitest';
import {
  validateLithophaneOptions,
  computeLuminance,
  generateLithophaneGeometry,
  calculateLithophaneMetrics,
  exportLithophaneSTL,
  exportLithophane3MF,
  processLithophane,
} from './engine';
import {
  DEFAULT_LITHOPHANE_OPTIONS,
  CURVED_ARC_OPTIONS,
  CYLINDER_OPTIONS,
  NIGHTLIGHT_OPTIONS,
  INVALID_OPTIONS_MIN_MAX,
  INVALID_OPTIONS_ZERO_WIDTH,
  createSyntheticImageBuffer,
} from './test-fixtures';

describe('LithophaneMaker Engine (Seam 1)', () => {
  describe('validateLithophaneOptions', () => {
    it('should validate default options successfully', () => {
      const res = validateLithophaneOptions(DEFAULT_LITHOPHANE_OPTIONS);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('should validate curved arc options', () => {
      const res = validateLithophaneOptions(CURVED_ARC_OPTIONS);
      expect(res.valid).toBe(true);
    });

    it('should validate cylinder options', () => {
      const res = validateLithophaneOptions(CYLINDER_OPTIONS);
      expect(res.valid).toBe(true);
    });

    it('should validate nightlight panel options', () => {
      const res = validateLithophaneOptions(NIGHTLIGHT_OPTIONS);
      expect(res.valid).toBe(true);
    });

    it('should reject when min thickness >= max thickness', () => {
      const res = validateLithophaneOptions(INVALID_OPTIONS_MIN_MAX);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/thickness/i);
    });

    it('should reject when width is zero or negative', () => {
      const res = validateLithophaneOptions(INVALID_OPTIONS_ZERO_WIDTH);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/width/i);
    });
  });

  describe('computeLuminance (ITU-R BT.601)', () => {
    it('should calculate 1.0 for pure white and 0.0 for pure black', () => {
      expect(computeLuminance(255, 255, 255)).toBeCloseTo(1.0, 3);
      expect(computeLuminance(0, 0, 0)).toBeCloseTo(0.0, 3);
    });

    it('should apply standard BT.601 weighting for primary colors', () => {
      expect(computeLuminance(255, 0, 0)).toBeCloseTo(0.299, 3);
      expect(computeLuminance(0, 255, 0)).toBeCloseTo(0.587, 3);
      expect(computeLuminance(0, 0, 255)).toBeCloseTo(0.114, 3);
    });
  });

  describe('generateLithophaneGeometry', () => {
    it('should generate flat watertight geometry with positions, normals, and colors', () => {
      const geom = generateLithophaneGeometry(DEFAULT_LITHOPHANE_OPTIONS);
      expect(geom).toBeDefined();
      expect(geom.getAttribute('position')).toBeDefined();
      expect(geom.getAttribute('normal')).toBeDefined();
      expect(geom.getAttribute('color')).toBeDefined();
      expect(geom.getIndex()).toBeDefined();

      const triangleCount = geom.getIndex()!.count / 3;
      expect(triangleCount).toBeGreaterThan(100);
      geom.dispose();
    });

    it('should generate curved arc geometry across specified angle', () => {
      const geom = generateLithophaneGeometry(CURVED_ARC_OPTIONS);
      expect(geom).toBeDefined();
      const pos = geom.getAttribute('position');
      expect(pos.count).toBeGreaterThan(100);

      // Verify bounding dimensions are reasonable
      geom.computeBoundingBox();
      const bbox = geom.boundingBox!;
      expect(bbox.max.x - bbox.min.x).toBeGreaterThan(10);
      expect(bbox.max.y - bbox.min.y).toBeGreaterThan(10);
      geom.dispose();
    });

    it('should generate 360 degree cylindrical geometry', () => {
      const geom = generateLithophaneGeometry(CYLINDER_OPTIONS);
      expect(geom).toBeDefined();
      geom.computeBoundingBox();
      const bbox = geom.boundingBox!;
      expect(bbox.max.y - bbox.min.y).toBeCloseTo(CYLINDER_OPTIONS.heightMm, 0);
      geom.dispose();
    });

    it('should generate nightlight panel with base stand slot', () => {
      const geom = generateLithophaneGeometry(NIGHTLIGHT_OPTIONS);
      expect(geom).toBeDefined();
      geom.computeBoundingBox();
      const bbox = geom.boundingBox!;
      expect(bbox.max.z - bbox.min.z).toBeGreaterThan(NIGHTLIGHT_OPTIONS.minThicknessMm);
      geom.dispose();
    });

    it('should handle fallback when imageData is not provided', () => {
      const optsWithoutImg = { ...DEFAULT_LITHOPHANE_OPTIONS, imageData: null };
      const geom = generateLithophaneGeometry(optsWithoutImg);
      expect(geom).toBeDefined();
      expect(geom.getIndex()!.count).toBeGreaterThan(0);
      geom.dispose();
    });
  });

  describe('calculateLithophaneMetrics', () => {
    it('should compute valid metrics from geometry', () => {
      const geom = generateLithophaneGeometry(DEFAULT_LITHOPHANE_OPTIONS);
      const metrics = calculateLithophaneMetrics(geom, DEFAULT_LITHOPHANE_OPTIONS);

      expect(metrics.triangleCount).toBeGreaterThan(0);
      expect(metrics.vertexCount).toBeGreaterThan(0);
      expect(metrics.estimatedGrams).toBeGreaterThan(0);
      expect(metrics.estimatedPrintTimeHours).toBeGreaterThan(0);
      expect(metrics.slicerTips.length).toBeGreaterThan(0);
      geom.dispose();
    });
  });

  describe('exportLithophaneSTL', () => {
    it('should export binary STL with 80-byte header and valid triangle count', () => {
      const geom = generateLithophaneGeometry(DEFAULT_LITHOPHANE_OPTIONS);
      const buffer = exportLithophaneSTL(geom);

      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(84);

      const view = new DataView(buffer);
      const reportedTris = view.getUint32(80, true);
      const actualTris = geom.getIndex()!.count / 3;
      expect(reportedTris).toBe(actualTris);
      expect(buffer.byteLength).toBe(84 + actualTris * 50);
      geom.dispose();
    });
  });

  describe('exportLithophane3MF', () => {
    it('should generate a valid 3MF blob package containing model xml', async () => {
      const geom = generateLithophaneGeometry(DEFAULT_LITHOPHANE_OPTIONS);
      const blob = await exportLithophane3MF(geom, DEFAULT_LITHOPHANE_OPTIONS);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(200);
      expect(blob.type).toMatch(/3mf|zip|octet-stream/);
      geom.dispose();
    });
  });

  describe('processLithophane', () => {
    it('should process default options into STL deliverable', async () => {
      const result = await processLithophane(DEFAULT_LITHOPHANE_OPTIONS, 'stl');
      expect(result.success).toBe(true);
      expect(result.fileName).toMatch(/\.stl$/);
      expect(result.fileSize).toBeGreaterThan(100);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.metrics.triangleCount).toBeGreaterThan(0);
    });

    it('should process curved arc options into 3MF deliverable', async () => {
      const result = await processLithophane(CURVED_ARC_OPTIONS, '3mf');
      expect(result.success).toBe(true);
      expect(result.fileName).toMatch(/\.3mf$/);
      expect(result.fileSize).toBeGreaterThan(200);
      expect(result.blob).toBeInstanceOf(Blob);
    });

    it('should return error result gracefully when options are invalid', async () => {
      const result = await processLithophane(INVALID_OPTIONS_MIN_MAX);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.fileSize).toBe(0);
    });
  });
});
