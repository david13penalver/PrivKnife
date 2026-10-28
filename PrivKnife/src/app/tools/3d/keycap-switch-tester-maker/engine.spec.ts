import { describe, expect, it } from 'vitest';
import {
  validateKeycapOptions,
  getKeycapDimensions,
  generateKeycapMesh,
  generateSwitchTesterMesh,
  exportKeycapSTL,
  exportKeycap3MF,
  processKeycap,
} from './engine';
import {
  DEFAULT_KEYCAP_OPTIONS,
  MINIMAL_KEYCAP_OPTIONS,
  MAXIMUM_KEYCAP_OPTIONS,
  DEFAULT_SWITCH_TESTER_OPTIONS,
} from './test-fixtures';

describe('Custom Mechanical Keycap & Switch Tester Maker Engine (Seam 1)', () => {
  describe('Parameter Validation & Guardrails', () => {
    it('should validate default keycap options successfully', () => {
      const result = validateKeycapOptions(DEFAULT_KEYCAP_OPTIONS);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate default switch tester tray options successfully', () => {
      const result = validateKeycapOptions(DEFAULT_SWITCH_TESTER_OPTIONS);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject null or undefined options', () => {
      const result = validateKeycapOptions(null as any);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should enforce stem tolerance boundaries [0.0mm, 0.5mm]', () => {
      expect(
        validateKeycapOptions({ ...DEFAULT_KEYCAP_OPTIONS, stemToleranceOffsetMm: -0.1 }).valid
      ).toBe(false);
      expect(
        validateKeycapOptions({ ...DEFAULT_KEYCAP_OPTIONS, stemToleranceOffsetMm: 0.8 }).valid
      ).toBe(false);
      expect(
        validateKeycapOptions({ ...DEFAULT_KEYCAP_OPTIONS, stemToleranceOffsetMm: 0.15 }).valid
      ).toBe(true);
    });

    it('should enforce wall thickness boundaries [0.8mm, 3.0mm]', () => {
      expect(
        validateKeycapOptions({ ...DEFAULT_KEYCAP_OPTIONS, wallThicknessMm: 0.5 }).valid
      ).toBe(false);
      expect(
        validateKeycapOptions({ ...DEFAULT_KEYCAP_OPTIONS, wallThicknessMm: 4.5 }).valid
      ).toBe(false);
      expect(
        validateKeycapOptions({ ...DEFAULT_KEYCAP_OPTIONS, wallThicknessMm: 1.5 }).valid
      ).toBe(true);
    });

    it('should enforce tray row and column limits [1, 8]', () => {
      expect(
        validateKeycapOptions({ ...DEFAULT_SWITCH_TESTER_OPTIONS, trayRows: 0 }).valid
      ).toBe(false);
      expect(
        validateKeycapOptions({ ...DEFAULT_SWITCH_TESTER_OPTIONS, trayCols: 10 }).valid
      ).toBe(false);
      expect(
        validateKeycapOptions({ ...DEFAULT_SWITCH_TESTER_OPTIONS, trayRows: 4, trayCols: 4 }).valid
      ).toBe(true);
    });

    it('should enforce legend text length limit for keycaps', () => {
      expect(
        validateKeycapOptions({ ...DEFAULT_KEYCAP_OPTIONS, legendText: 'VERYLONGTEXTEXCEEDING' }).valid
      ).toBe(false);
      expect(
        validateKeycapOptions({ ...DEFAULT_KEYCAP_OPTIONS, legendText: 'CTRL' }).valid
      ).toBe(true);
    });
  });

  describe('Keycap Profile Dimensions Calculation', () => {
    it('should calculate accurate standard 1U dimensions for Cherry profile', () => {
      const dim = getKeycapDimensions('cherry', '1u');
      expect(dim.baseWidthMm).toBe(18.0);
      expect(dim.baseDepthMm).toBe(18.0);
      expect(dim.topWidthMm).toBeLessThan(dim.baseWidthMm);
      expect(dim.heightMm).toBeCloseTo(9.4, 0.5);
    });

    it('should calculate scaled base width for modifier key sizes', () => {
      const dim1u = getKeycapDimensions('cherry', '1u');
      const dim2u = getKeycapDimensions('cherry', '2u');
      const dim625u = getKeycapDimensions('cherry', '6.25u');

      expect(dim2u.baseWidthMm).toBeGreaterThan(dim1u.baseWidthMm);
      expect(dim625u.baseWidthMm).toBeGreaterThan(110);
    });

    it('should support all standard profiles (Cherry, OEM, DSA, XDA, SA)', () => {
      const profiles = ['cherry', 'oem', 'dsa', 'xda', 'sa'] as const;
      for (const p of profiles) {
        const dim = getKeycapDimensions(p, '1u');
        expect(dim.heightMm).toBeGreaterThan(6);
        expect(dim.heightMm).toBeLessThan(16);
      }
    });
  });

  describe('3D Keycap Mesh Generation', () => {
    it('should generate shell, stem, and legend geometries for 1U ESC keycap', () => {
      const result = generateKeycapMesh(DEFAULT_KEYCAP_OPTIONS);
      expect(result.shellGeometry).toBeDefined();
      expect(result.stemGeometry).toBeDefined();
      expect(result.legendGeometry).toBeDefined();
      expect(result.metrics.totalTriangles).toBeGreaterThan(50);
      expect(result.metrics.estimatedGrams).toBeGreaterThan(0.5);
      expect(result.metrics.slicerTips.length).toBeGreaterThan(0);
    });

    it('should generate blank keycap without legend geometry when style is blank', () => {
      const result = generateKeycapMesh(MINIMAL_KEYCAP_OPTIONS);
      expect(result.legendGeometry.getAttribute('position')).toBeUndefined();
      expect(result.metrics.legendTriangles).toBe(0);
    });

    it('should generate stabilizer stems for wide keycaps (>= 2U)', () => {
      const result = generateKeycapMesh({ ...DEFAULT_KEYCAP_OPTIONS, keyUnitSize: '2.25u' });
      expect(result.metrics.stemTriangles).toBeGreaterThan(50);
      expect(result.metrics.widthMm).toBeGreaterThan(35);
    });

    it('should generate high profile SA keycap without crashing', () => {
      const result = generateKeycapMesh(MAXIMUM_KEYCAP_OPTIONS);
      expect(result.metrics.heightMm).toBeGreaterThan(11);
      expect(result.metrics.totalTriangles).toBeGreaterThan(100);
    });

    it('should generate connected cylindrical MX cross stem with outer barrel (DEFECT-39-02 Red test)', () => {
      const result = generateKeycapMesh(DEFAULT_KEYCAP_OPTIONS);
      const pos = result.stemGeometry.getAttribute('position');
      expect(pos).toBeDefined();
      expect(result.metrics.stemTriangles).toBeGreaterThan(100);

      // Verify outer cylinder perimeter vertices exist at radius ~2.75mm
      let hasOuterCylinderRadius = false;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const r = Math.hypot(x, y);
        if (r >= 2.70 && r <= 2.80) {
          hasOuterCylinderRadius = true;
          break;
        }
      }
      expect(hasOuterCylinderRadius).toBe(true);
    });

    it('should apply dish depth and profile tilt to top keycap surface and flush inlay (DEFECT-39-03 Red test)', () => {
      const flatRes = generateKeycapMesh({
        ...DEFAULT_KEYCAP_OPTIONS,
        dishDepthMm: 0,
      });
      const dishedRes = generateKeycapMesh({
        ...DEFAULT_KEYCAP_OPTIONS,
        dishDepthMm: 1.2,
      });

      const flatPos = flatRes.shellGeometry.getAttribute('position');
      const dishedPos = dishedRes.shellGeometry.getAttribute('position');

      // Find center top vertex (near x=0, y=0, z > 5)
      let flatCenterZ = 0;
      let dishedCenterZ = 0;
      for (let i = 0; i < flatPos.count; i++) {
        if (Math.hypot(flatPos.getX(i), flatPos.getY(i)) < 1.0 && flatPos.getZ(i) > 5) {
          flatCenterZ = flatPos.getZ(i);
          break;
        }
      }
      for (let i = 0; i < dishedPos.count; i++) {
        if (Math.hypot(dishedPos.getX(i), dishedPos.getY(i)) < 1.0 && dishedPos.getZ(i) > 5) {
          dishedCenterZ = dishedPos.getZ(i);
          break;
        }
      }

      expect(flatCenterZ).toBeGreaterThan(0);
      expect(dishedCenterZ).toBeGreaterThan(0);
      expect(flatCenterZ - dishedCenterZ).toBeCloseTo(1.2, 0.2);

      // Inlaid multicolor legend should sit flush and not protrude above keycap shell
      const inlaidRes = generateKeycapMesh({
        ...DEFAULT_KEYCAP_OPTIONS,
        legendStyle: 'inlaid_multicolor',
      });
      inlaidRes.shellGeometry.computeBoundingBox();
      inlaidRes.legendGeometry.computeBoundingBox();
      const shellMaxZ = inlaidRes.shellGeometry.boundingBox!.max.z;
      const legendMaxZ = inlaidRes.legendGeometry.boundingBox!.max.z;
      expect(legendMaxZ).toBeLessThanOrEqual(shellMaxZ + 0.05);
    });
  });

  describe('3D Switch Tester Tray Generation', () => {
    it('should generate switch tester tray with correct cutout grid', () => {
      const result = generateSwitchTesterMesh(DEFAULT_SWITCH_TESTER_OPTIONS);
      expect(result.trayGeometry).toBeDefined();
      expect(result.metrics.totalTriangles).toBeGreaterThan(100);
      expect(result.metrics.widthMm).toBeGreaterThan(50);
      expect(result.metrics.depthMm).toBeGreaterThan(50);
      expect(result.metrics.slicerTips.some((t) => t.includes('14mm'))).toBe(true);
    });

    it('should support 1x1 single switch tester', () => {
      const result = generateSwitchTesterMesh({
        ...DEFAULT_SWITCH_TESTER_OPTIONS,
        trayRows: 1,
        trayCols: 1,
      });
      expect(result.metrics.widthMm).toBeGreaterThan(20);
      expect(result.metrics.totalTriangles).toBeGreaterThan(50);
    });

    it('should generate flat-bottomed switch tester base at z=0 with tray tilt (DEFECT-39-04 Red test)', () => {
      const result = generateSwitchTesterMesh({
        ...DEFAULT_SWITCH_TESTER_OPTIONS,
        trayTiltAngleDeg: 8,
      });
      result.trayGeometry.computeBoundingBox();
      const box = result.trayGeometry.boundingBox!;
      expect(box.min.z).toBeCloseTo(0, 0.05);
      expect(box.max.z).toBeGreaterThan(6.0);
    });
  });

  describe('File Serialization & Export (STL & 3MF)', () => {
    it('should encode a geometry into valid binary STL buffer with 80-byte header', () => {
      const { shellGeometry } = generateKeycapMesh(DEFAULT_KEYCAP_OPTIONS);
      const stlBuffer = exportKeycapSTL(shellGeometry);
      expect(stlBuffer).toBeInstanceOf(ArrayBuffer);
      expect(stlBuffer.byteLength).toBeGreaterThan(84);

      const view = new DataView(stlBuffer);
      const triangleCount = view.getUint32(80, true);
      expect(triangleCount).toBeGreaterThan(0);
      expect(stlBuffer.byteLength).toBe(84 + triangleCount * 50);
    });

    it('should package keycap parts into a valid multi-object 3MF zip file', async () => {
      const { shellGeometry, stemGeometry, legendGeometry } =
        generateKeycapMesh(DEFAULT_KEYCAP_OPTIONS);
      const blob = await exportKeycap3MF(
        shellGeometry,
        stemGeometry,
        legendGeometry,
        DEFAULT_KEYCAP_OPTIONS
      );
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(500);
      expect(blob.type).toBe('model/3mf');
    });

    it('should execute end-to-end processKeycap for keycap 3MF export', async () => {
      const result = await processKeycap(DEFAULT_KEYCAP_OPTIONS, '3mf_multicolor');
      expect(result.success).toBe(true);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.fileName).toContain('.3mf');
      expect(result.fileSize).toBeGreaterThan(500);
      expect(result.mimeType).toBe('model/3mf');
    });

    it('should execute end-to-end processKeycap for switch tester STL export', async () => {
      const result = await processKeycap(DEFAULT_SWITCH_TESTER_OPTIONS, 'stl_unified');
      expect(result.success).toBe(true);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.fileName).toContain('.stl');
      expect(result.fileSize).toBeGreaterThan(1000);
      expect(result.mimeType).toBe('model/stl');
    });
  });
});
