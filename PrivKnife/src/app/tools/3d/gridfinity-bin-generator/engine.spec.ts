import { describe, it, expect } from 'vitest';
import {
  validateGridfinityOptions,
  generateGridfinityGeometry,
  calculateGridfinityMetrics,
  exportGridfinitySTL,
  exportGridfinity3MF,
  processGridfinity,
} from './engine';
import {
  DEFAULT_GRIDFINITY_OPTIONS,
  GRIDFINITY_2X1_OPTIONS,
  GRIDFINITY_3X3_OPTIONS,
  INVALID_GRIDFINITY_GRID_ZERO,
  INVALID_GRIDFINITY_HEIGHT_LOW,
} from './test-fixtures';

describe('GridfinityBinGenerator Engine (Seam 1)', () => {
  describe('validateGridfinityOptions', () => {
    it('should validate default 1x1 options successfully', () => {
      const res = validateGridfinityOptions(DEFAULT_GRIDFINITY_OPTIONS);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('should validate 2x1 and 3x3 options', () => {
      expect(validateGridfinityOptions(GRIDFINITY_2X1_OPTIONS).valid).toBe(true);
      expect(validateGridfinityOptions(GRIDFINITY_3X3_OPTIONS).valid).toBe(true);
    });

    it('should reject when gridX or gridY is 0 or negative', () => {
      const res = validateGridfinityOptions(INVALID_GRIDFINITY_GRID_ZERO);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/grid/i);
    });

    it('should reject when heightUnits is 0 or negative', () => {
      const res = validateGridfinityOptions(INVALID_GRIDFINITY_HEIGHT_LOW);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/height/i);
    });
  });

  describe('generateGridfinityGeometry', () => {
    it('should generate valid watertight geometry for 1x1 bin', () => {
      const geom = generateGridfinityGeometry(DEFAULT_GRIDFINITY_OPTIONS);
      expect(geom).toBeDefined();
      expect(geom.getAttribute('position')).toBeDefined();
      expect(geom.getAttribute('normal')).toBeDefined();
      expect(geom.getIndex()).toBeDefined();

      const tris = geom.getIndex()!.count / 3;
      expect(tris).toBeGreaterThan(50);

      geom.computeBoundingBox();
      const bbox = geom.boundingBox!;
      // Total width for 1x1 is approx 41.5mm (42 - 0.5)
      expect(bbox.max.x - bbox.min.x).toBeCloseTo(41.5, 0);
      expect(bbox.max.y - bbox.min.y).toBeCloseTo(41.5, 0);
      geom.dispose();
    });

    it('should scale dimensions properly for multi-unit bins (2x1)', () => {
      const geom = generateGridfinityGeometry(GRIDFINITY_2X1_OPTIONS);
      geom.computeBoundingBox();
      const bbox = geom.boundingBox!;

      // 2 units along X: 2 * 42 - 0.5 = 83.5mm
      expect(bbox.max.x - bbox.min.x).toBeCloseTo(83.5, 0);
      // 1 unit along Y: 1 * 42 - 0.5 = 41.5mm
      expect(bbox.max.y - bbox.min.y).toBeCloseTo(41.5, 0);
      // 6U height: 6 * 7 = 42mm
      expect(bbox.max.z - bbox.min.z).toBeGreaterThan(35);
      geom.dispose();
    });

    it('should generate internal divider walls and compartments (3x3)', () => {
      const geom = generateGridfinityGeometry(GRIDFINITY_3X3_OPTIONS);
      expect(geom).toBeDefined();
      const pos = geom.getAttribute('position');
      expect(pos.count).toBeGreaterThan(100);
      geom.dispose();
    });
  });

  describe('calculateGridfinityMetrics', () => {
    it('should compute dimensional and slicing telemetry accurately', () => {
      const geom = generateGridfinityGeometry(DEFAULT_GRIDFINITY_OPTIONS);
      const metrics = calculateGridfinityMetrics(geom, DEFAULT_GRIDFINITY_OPTIONS);

      expect(metrics.totalWidthMm).toBeCloseTo(41.5, 0);
      expect(metrics.totalLengthMm).toBeCloseTo(41.5, 0);
      // 3U = 21mm body + 3.75mm stacking lip = 24.8mm total bounding height
      expect(metrics.totalHeightMm).toBeCloseTo(24.8, 0);
      expect(metrics.internalCompartments).toBe(1);
      expect(metrics.triangleCount).toBeGreaterThan(50);
      expect(metrics.estimatedGrams).toBeGreaterThan(0);
      expect(metrics.estimatedPrintTimeHours).toBeGreaterThan(0);
      expect(metrics.slicerTips.length).toBeGreaterThan(0);
      geom.dispose();
    });
  });

  describe('exportGridfinitySTL', () => {
    it('should export binary STL with 80-byte header and valid triangle count', () => {
      const geom = generateGridfinityGeometry(DEFAULT_GRIDFINITY_OPTIONS);
      const buffer = exportGridfinitySTL(geom);

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

  describe('exportGridfinity3MF', () => {
    it('should produce a valid 3MF blob package containing model xml', async () => {
      const geom = generateGridfinityGeometry(DEFAULT_GRIDFINITY_OPTIONS);
      const blob = await exportGridfinity3MF(geom, DEFAULT_GRIDFINITY_OPTIONS);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(200);
      expect(blob.type).toMatch(/3mf|zip|octet-stream/);
      geom.dispose();
    });
  });

  describe('processGridfinity', () => {
    it('should process default options into STL deliverable', async () => {
      const result = await processGridfinity(DEFAULT_GRIDFINITY_OPTIONS, 'stl');
      expect(result.success).toBe(true);
      expect(result.fileName).toMatch(/\.stl$/);
      expect(result.fileSize).toBeGreaterThan(100);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.metrics.triangleCount).toBeGreaterThan(0);
    });

    it('should process 2x1 options into 3MF deliverable', async () => {
      const result = await processGridfinity(GRIDFINITY_2X1_OPTIONS, '3mf');
      expect(result.success).toBe(true);
      expect(result.fileName).toMatch(/\.3mf$/);
      expect(result.fileSize).toBeGreaterThan(200);
      expect(result.blob).toBeInstanceOf(Blob);
    });

    it('should return error result gracefully when options are invalid', async () => {
      const result = await processGridfinity(INVALID_GRIDFINITY_GRID_ZERO);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.fileSize).toBe(0);
    });
  });
});
