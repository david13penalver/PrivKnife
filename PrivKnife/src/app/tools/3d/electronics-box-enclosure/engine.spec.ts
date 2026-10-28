import { describe, it, expect } from 'vitest';
import {
  validateEnclosureOptions,
  generateEnclosureGeometries,
  calculateEnclosureMetrics,
  exportEnclosureSTL,
  exportEnclosure3MF,
  processEnclosure,
} from './engine';
import {
  DEFAULT_ENCLOSURE_OPTIONS,
  ARDUINO_ENCLOSURE_OPTIONS,
  ESP32_ENCLOSURE_OPTIONS,
  RPI_PICO_ENCLOSURE_OPTIONS,
  INVALID_ENCLOSURE_LENGTH_ZERO,
  INVALID_ENCLOSURE_WALL_THIN,
} from './test-fixtures';

describe('ElectronicsBoxEnclosure Engine (Seam 1)', () => {
  describe('validateEnclosureOptions', () => {
    it('should validate default options successfully', () => {
      const res = validateEnclosureOptions(DEFAULT_ENCLOSURE_OPTIONS);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('should validate Arduino, ESP32, and Pico presets', () => {
      expect(validateEnclosureOptions(ARDUINO_ENCLOSURE_OPTIONS).valid).toBe(true);
      expect(validateEnclosureOptions(ESP32_ENCLOSURE_OPTIONS).valid).toBe(true);
      expect(validateEnclosureOptions(RPI_PICO_ENCLOSURE_OPTIONS).valid).toBe(true);
    });

    it('should reject when innerLength is 0 or negative', () => {
      const res = validateEnclosureOptions(INVALID_ENCLOSURE_LENGTH_ZERO);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/length/i);
    });

    it('should reject when wall thickness is less than 1.0mm', () => {
      const res = validateEnclosureOptions(INVALID_ENCLOSURE_WALL_THIN);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/wall/i);
    });
  });

  describe('generateEnclosureGeometries', () => {
    it('should generate separate base and lid watertight geometries', () => {
      const { baseGeometry, lidGeometry, combinedGeometry } =
        generateEnclosureGeometries(DEFAULT_ENCLOSURE_OPTIONS);

      expect(baseGeometry).toBeDefined();
      expect(lidGeometry).toBeDefined();
      expect(combinedGeometry).toBeDefined();

      expect(baseGeometry.getIndex()!.count).toBeGreaterThan(50);
      expect(lidGeometry.getIndex()!.count).toBeGreaterThan(30);
      expect(combinedGeometry.getIndex()!.count).toBeGreaterThan(80);

      // Verify dimensions
      baseGeometry.computeBoundingBox();
      const bbox = baseGeometry.boundingBox!;
      const expectedOuterL =
        DEFAULT_ENCLOSURE_OPTIONS.innerLengthMm + 2 * DEFAULT_ENCLOSURE_OPTIONS.wallThicknessMm;
      expect(bbox.max.x - bbox.min.x).toBeCloseTo(expectedOuterL, 0);

      baseGeometry.dispose();
      lidGeometry.dispose();
      combinedGeometry.dispose();
    });

    it('should handle M3 screw bosses on Arduino enclosure', () => {
      const { baseGeometry, lidGeometry } =
        generateEnclosureGeometries(ARDUINO_ENCLOSURE_OPTIONS);

      expect(baseGeometry).toBeDefined();
      expect(lidGeometry).toBeDefined();

      baseGeometry.dispose();
      lidGeometry.dispose();
    });

    it('should handle sliding lid geometry on Pico enclosure', () => {
      const { baseGeometry, lidGeometry } =
        generateEnclosureGeometries(RPI_PICO_ENCLOSURE_OPTIONS);

      expect(baseGeometry).toBeDefined();
      expect(lidGeometry).toBeDefined();

      baseGeometry.dispose();
      lidGeometry.dispose();
    });

    it('should orient lid flat on print bed with min.z >= 0 when exploded is false (DEFECT-34-01)', () => {
      const { baseGeometry, lidGeometry } =
        generateEnclosureGeometries(DEFAULT_ENCLOSURE_OPTIONS, false);

      baseGeometry.computeBoundingBox();
      lidGeometry.computeBoundingBox();

      expect(baseGeometry.boundingBox!.min.z).toBeGreaterThanOrEqual(-1e-4);
      expect(lidGeometry.boundingBox!.min.z).toBeGreaterThanOrEqual(-1e-4);

      baseGeometry.dispose();
      lidGeometry.dispose();
    });

    it('should cut through-slots across lid thickness without raised overflow when ventilationGrille is true (DEFECT-34-01)', () => {
      const withGrille = generateEnclosureGeometries(
        { ...DEFAULT_ENCLOSURE_OPTIONS, ventilationGrille: true },
        false
      );
      const withoutGrille = generateEnclosureGeometries(
        { ...DEFAULT_ENCLOSURE_OPTIONS, ventilationGrille: false },
        false
      );

      withGrille.lidGeometry.computeBoundingBox();
      withoutGrille.lidGeometry.computeBoundingBox();

      expect(withGrille.lidGeometry.boundingBox!.max.z).toBeCloseTo(
        withoutGrille.lidGeometry.boundingBox!.max.z,
        1
      );
      expect(withGrille.lidGeometry.getIndex()!.count).toBeGreaterThan(
        withoutGrille.lidGeometry.getIndex()!.count
      );

      withGrille.baseGeometry.dispose();
      withGrille.lidGeometry.dispose();
      withoutGrille.baseGeometry.dispose();
      withoutGrille.lidGeometry.dispose();
    });

    it('should alter corner geometry when cornerRadiusMm is adjusted (DEFECT-34-01)', () => {
      const sharp = generateEnclosureGeometries(
        { ...DEFAULT_ENCLOSURE_OPTIONS, cornerRadiusMm: 0 },
        false
      );
      const rounded = generateEnclosureGeometries(
        { ...DEFAULT_ENCLOSURE_OPTIONS, cornerRadiusMm: 4 },
        false
      );

      expect(rounded.baseGeometry.getIndex()!.count).toBeGreaterThan(
        sharp.baseGeometry.getIndex()!.count
      );

      sharp.baseGeometry.dispose();
      sharp.lidGeometry.dispose();
      rounded.baseGeometry.dispose();
      rounded.lidGeometry.dispose();
    });
  });

  describe('calculateEnclosureMetrics', () => {
    it('should compute valid dimensional and slicing telemetry', () => {
      const { baseGeometry, lidGeometry } =
        generateEnclosureGeometries(DEFAULT_ENCLOSURE_OPTIONS);
      const metrics = calculateEnclosureMetrics(
        baseGeometry,
        lidGeometry,
        DEFAULT_ENCLOSURE_OPTIONS
      );

      expect(metrics.outerLengthMm).toBe(84); // 80 + 4
      expect(metrics.outerWidthMm).toBe(54); // 50 + 4
      expect(metrics.outerHeightMm).toBe(34); // 30 + 4
      expect(metrics.baseTriangleCount).toBeGreaterThan(0);
      expect(metrics.lidTriangleCount).toBeGreaterThan(0);
      expect(metrics.totalTriangles).toBe(
        metrics.baseTriangleCount + metrics.lidTriangleCount
      );
      expect(metrics.estimatedGrams).toBeGreaterThan(0);
      expect(metrics.estimatedPrintTimeHours).toBeGreaterThan(0);
      expect(metrics.slicerTips.length).toBeGreaterThan(0);

      baseGeometry.dispose();
      lidGeometry.dispose();
    });
  });

  describe('exportEnclosureSTL', () => {
    it('should export binary STL with 80-byte header and valid triangle count', () => {
      const { combinedGeometry } = generateEnclosureGeometries(DEFAULT_ENCLOSURE_OPTIONS);
      const buffer = exportEnclosureSTL(combinedGeometry);

      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(84);

      const view = new DataView(buffer);
      const reportedTris = view.getUint32(80, true);
      const actualTris = combinedGeometry.getIndex()!.count / 3;
      expect(reportedTris).toBe(actualTris);
      expect(buffer.byteLength).toBe(84 + actualTris * 50);

      combinedGeometry.dispose();
    });
  });

  describe('exportEnclosure3MF', () => {
    it('should produce a valid 3MF blob package containing multi-object assembly', async () => {
      const { baseGeometry, lidGeometry } =
        generateEnclosureGeometries(DEFAULT_ENCLOSURE_OPTIONS);
      const blob = await exportEnclosure3MF(
        baseGeometry,
        lidGeometry,
        DEFAULT_ENCLOSURE_OPTIONS
      );

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(200);
      expect(blob.type).toMatch(/3mf|zip|octet-stream/);

      baseGeometry.dispose();
      lidGeometry.dispose();
    });
  });

  describe('processEnclosure', () => {
    it('should process default options into STL deliverable', async () => {
      const result = await processEnclosure(DEFAULT_ENCLOSURE_OPTIONS, 'stl');
      expect(result.success).toBe(true);
      expect(result.fileName).toMatch(/\.stl$/);
      expect(result.fileSize).toBeGreaterThan(100);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.metrics.totalTriangles).toBeGreaterThan(0);
    });

    it('should process Arduino options into 3MF deliverable', async () => {
      const result = await processEnclosure(ARDUINO_ENCLOSURE_OPTIONS, '3mf');
      expect(result.success).toBe(true);
      expect(result.fileName).toMatch(/\.3mf$/);
      expect(result.fileSize).toBeGreaterThan(200);
      expect(result.blob).toBeInstanceOf(Blob);
    });

    it('should return error result gracefully when options are invalid', async () => {
      const result = await processEnclosure(INVALID_ENCLOSURE_LENGTH_ZERO);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.fileSize).toBe(0);
    });
  });
});
