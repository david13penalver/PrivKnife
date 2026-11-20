import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import JSZip from 'jszip';
import {
  buildHardwareFileBase,
  calculateHardwareMetrics,
  exportTo3mf,
  exportToBinaryStl,
  generateHardwarePlateParts,
  generateSingleHardwareGeometry,
  validateHardwareOptions,
} from './engine';
import {
  ARRAY_9_PLATE_FIXTURE,
  FLANGED_BUSHING_FIXTURE,
  HEX_STANDOFF_FIXTURE,
  HIGH_ASPECT_TALL_SPACER_FIXTURE,
  INVALID_FLANGE_FIXTURE,
  INVALID_THIN_WALL_FIXTURE,
  INVALID_WEDGE_HEIGHT_FIXTURE,
  LARGE_CHAMFER_CLAMP_FIXTURE,
  LEVELING_WEDGE_FIXTURE,
  M6_WASHER_FIXTURE,
  OVERSIZED_PLATE_FIXTURE,
  U_SLOT_SHIM_FIXTURE,
} from './test-fixtures';
import { HardwarePlateParts } from './types';

function assertFiniteZ0Geometry(geom: THREE.BufferGeometry, minTriangles = 12): void {
  const pos = geom.getAttribute('position');
  expect(pos).toBeDefined();
  expect(pos.count).toBeGreaterThanOrEqual(minTriangles * 3);

  for (let i = 0; i < pos.count; i++) {
    expect(Number.isFinite(pos.getX(i))).toBe(true);
    expect(Number.isFinite(pos.getY(i))).toBe(true);
    expect(Number.isFinite(pos.getZ(i))).toBe(true);
  }

  geom.computeBoundingBox();
  const box = geom.boundingBox!;
  expect(box.min.z).toBeGreaterThanOrEqual(-0.01);
  expect(box.min.z).toBeLessThanOrEqual(0.05);
}

describe('Washer, Spacer, Standoff, Shim & Bushing Engine — Seam 1A', () => {
  const createdGeoms: THREE.BufferGeometry[] = [];

  afterEach(() => {
    while (createdGeoms.length > 0) {
      createdGeoms.pop()?.dispose();
    }
    vi.restoreAllMocks();
  });

  describe('validateHardwareOptions', () => {
    it('accepts all five valid hardware fixtures', () => {
      expect(validateHardwareOptions(M6_WASHER_FIXTURE)).toEqual({ valid: true });
      expect(validateHardwareOptions(FLANGED_BUSHING_FIXTURE)).toEqual({ valid: true });
      expect(validateHardwareOptions(HEX_STANDOFF_FIXTURE)).toEqual({ valid: true });
      expect(validateHardwareOptions(LEVELING_WEDGE_FIXTURE)).toEqual({ valid: true });
      expect(validateHardwareOptions(U_SLOT_SHIM_FIXTURE)).toEqual({ valid: true });
    });

    it('rejects radial walls below 0.8mm, invalid flanges, inverted wedge heights, and out-of-range inputs', () => {
      const thinWall = validateHardwareOptions(INVALID_THIN_WALL_FIXTURE);
      expect(thinWall.valid).toBe(false);
      expect(thinWall.error).toBeTruthy();

      expect(validateHardwareOptions(INVALID_FLANGE_FIXTURE).valid).toBe(false);
      expect(validateHardwareOptions(INVALID_WEDGE_HEIGHT_FIXTURE).valid).toBe(false);
      expect(validateHardwareOptions(null as unknown as typeof M6_WASHER_FIXTURE).valid).toBe(false);
      expect(validateHardwareOptions({ ...M6_WASHER_FIXTURE, quantity: 0 }).valid).toBe(false);
      expect(validateHardwareOptions({ ...M6_WASHER_FIXTURE, quantity: 25 }).valid).toBe(false);
      expect(validateHardwareOptions({ ...M6_WASHER_FIXTURE, holeToleranceMm: 0.65 }).valid).toBe(false);
      expect(validateHardwareOptions({ ...M6_WASHER_FIXTURE, outerDiameterMm: Number.NaN }).valid).toBe(false);
    });
  });

  describe('generateSingleHardwareGeometry', () => {
    it('builds manifold closed-lathe washer, flanged bushing, and brim-tabbed tall spacer seated at Z = 0', () => {
      const washer = generateSingleHardwareGeometry(M6_WASHER_FIXTURE);
      createdGeoms.push(washer.geometry);
      assertFiniteZ0Geometry(washer.geometry, 60);
      expect(washer.radialWallMm).toBeCloseTo((18 - 6.65) / 2, 2);

      const bushing = generateSingleHardwareGeometry(FLANGED_BUSHING_FIXTURE);
      createdGeoms.push(bushing.geometry);
      assertFiniteZ0Geometry(bushing.geometry, 80);
      bushing.geometry.computeBoundingBox();
      expect(bushing.geometry.boundingBox!.max.x - bushing.geometry.boundingBox!.min.x).toBeCloseTo(22, 0);

      const tall = generateSingleHardwareGeometry(HIGH_ASPECT_TALL_SPACER_FIXTURE);
      createdGeoms.push(tall.geometry);
      assertFiniteZ0Geometry(tall.geometry, 80);
      tall.geometry.computeBoundingBox();
      expect(tall.geometry.boundingBox!.max.x - tall.geometry.boundingBox!.min.x).toBeGreaterThan(8.5);
    });

    it('auto-clamps oversized chamfers to prevent vertex inversion on thin rings', () => {
      const clamped = generateSingleHardwareGeometry(LARGE_CHAMFER_CLAMP_FIXTURE);
      createdGeoms.push(clamped.geometry);
      assertFiniteZ0Geometry(clamped.geometry, 60);

      expect(clamped.effectiveChamferMm).toBeLessThan(3.0);
      expect(clamped.effectiveChamferMm).toBeLessThanOrEqual(1.5 * 0.42 + 0.01);
      clamped.geometry.computeBoundingBox();
      expect(clamped.geometry.boundingBox!.max.z).toBeCloseTo(1.5, 2);
    });

    it('builds hex standoff, U-slot framing shim, and monotonically sloped leveling wedge', () => {
      const hex = generateSingleHardwareGeometry(HEX_STANDOFF_FIXTURE);
      createdGeoms.push(hex.geometry);
      assertFiniteZ0Geometry(hex.geometry, 24);

      const shim = generateSingleHardwareGeometry(U_SLOT_SHIM_FIXTURE);
      createdGeoms.push(shim.geometry);
      assertFiniteZ0Geometry(shim.geometry, 24);

      const wedge = generateSingleHardwareGeometry(LEVELING_WEDGE_FIXTURE);
      createdGeoms.push(wedge.geometry);
      assertFiniteZ0Geometry(wedge.geometry, 24);

      // Verify monotonic height increase from low -Y edge (>= 1.0mm, < 4mm) to high +Y edge (>= 12.0mm)
      const pos = wedge.geometry.getAttribute('position');
      wedge.geometry.computeBoundingBox();
      const minY = wedge.geometry.boundingBox!.min.y;
      const maxY = wedge.geometry.boundingBox!.max.y;
      let lowEdgeMaxZ = -Infinity;
      let highEdgeMaxZ = -Infinity;

      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const z = pos.getZ(i);
        if (y < minY + 5) lowEdgeMaxZ = Math.max(lowEdgeMaxZ, z);
        if (y > maxY - 5) highEdgeMaxZ = Math.max(highEdgeMaxZ, z);
      }

      expect(lowEdgeMaxZ).toBeGreaterThanOrEqual(1.0);
      expect(lowEdgeMaxZ).toBeLessThan(4.0);
      expect(highEdgeMaxZ).toBeGreaterThanOrEqual(12.0);
    });
  });

  describe('Seam 1B — Build-Plate Grid Array, Metrics, .STL / .3MF & Determinism', () => {
    const createdPlates: HardwarePlateParts[] = [];

    afterEach(() => {
      while (createdPlates.length > 0) {
        createdPlates.pop()?.dispose();
      }
    });

    it('arranges quantity=9 in a clean 3x3 build-plate array seated at Z = 0', () => {
      const plate = generateHardwarePlateParts(ARRAY_9_PLATE_FIXTURE);
      createdPlates.push(plate);

      expect(plate.quantity).toBe(9);
      expect(plate.cols).toBe(3);
      expect(plate.rows).toBe(3);
      expect(plate.partGeometries).toHaveLength(9);
      assertFiniteZ0Geometry(plate.mergedGeometry, 540);
      expect(plate.plateWidthMm).toBeCloseTo(3 * plate.partWidthMm + 2 * 6.0, 1);
      expect(plate.plateDepthMm).toBeCloseTo(3 * plate.partDepthMm + 2 * 6.0, 1);
    });

    it('computes metrics cleanly and flags highAspectWarning and exceedsStandardBed', () => {
      const tallPlate = generateHardwarePlateParts(HIGH_ASPECT_TALL_SPACER_FIXTURE);
      createdPlates.push(tallPlate);
      const tallMetrics = calculateHardwareMetrics(HIGH_ASPECT_TALL_SPACER_FIXTURE, tallPlate);
      expect(tallMetrics.highAspectWarning).toBe(true);
      expect(tallMetrics.exceedsStandardBed).toBe(false);
      expect(tallMetrics.triangleCount).toBeGreaterThan(80);
      expect(tallMetrics.estimatedWeightG).toBeGreaterThan(0.5);

      const bigPlate = generateHardwarePlateParts(OVERSIZED_PLATE_FIXTURE);
      createdPlates.push(bigPlate);
      const bigMetrics = calculateHardwareMetrics(OVERSIZED_PLATE_FIXTURE, bigPlate);
      expect(bigMetrics.exceedsStandardBed).toBe(true);
      expect(bigMetrics.highAspectWarning).toBe(false);
    });

    it('exports binary little-endian .STL without "solid " header and multi-object .3MF archive', async () => {
      const plate = generateHardwarePlateParts(ARRAY_9_PLATE_FIXTURE);
      createdPlates.push(plate);
      const metrics = calculateHardwareMetrics(ARRAY_9_PLATE_FIXTURE, plate);

      const stlBuf = exportToBinaryStl(plate);
      expect(stlBuf.byteLength).toBe(84 + metrics.triangleCount * 50);
      const header = new TextDecoder().decode(new Uint8Array(stlBuf, 0, 6));
      expect(header.startsWith('solid ')).toBe(false);
      expect(new DataView(stlBuf).getUint32(80, true)).toBe(metrics.triangleCount);

      const blob3mf = await exportTo3mf(ARRAY_9_PLATE_FIXTURE, plate);
      expect(blob3mf.size).toBeGreaterThan(500);
      const zip = await JSZip.loadAsync(await blob3mf.arrayBuffer());
      const modelXml = await zip.file('3D/3dmodel.model')!.async('string');
      expect((modelXml.match(/<object /g) || []).length).toBe(9);
      expect(zip.file('[Content_Types].xml')).not.toBeNull();
      expect(zip.file('_rels/.rels')).not.toBeNull();
    });

    it('performs zero network or storage calls and emits byte-identical STL and XML across Math.random seeds', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.15);

      const plateA = generateHardwarePlateParts(M6_WASHER_FIXTURE);
      createdPlates.push(plateA);
      const stlA = new Uint8Array(exportToBinaryStl(plateA));
      const zipA = await JSZip.loadAsync(await (await exportTo3mf(M6_WASHER_FIXTURE, plateA)).arrayBuffer());
      const xmlA = await zipA.file('3D/3dmodel.model')!.async('string');

      randSpy.mockReturnValue(0.85);
      const plateB = generateHardwarePlateParts(M6_WASHER_FIXTURE);
      createdPlates.push(plateB);
      const stlB = new Uint8Array(exportToBinaryStl(plateB));
      const zipB = await JSZip.loadAsync(await (await exportTo3mf(M6_WASHER_FIXTURE, plateB)).arrayBuffer());
      const xmlB = await zipB.file('3D/3dmodel.model')!.async('string');

      expect(stlA).toEqual(stlB);
      expect(xmlA).toBe(xmlB);
      expect(buildHardwareFileBase(M6_WASHER_FIXTURE)).toBe('privknife-washer_spacer-x4');
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(setItemSpy).not.toHaveBeenCalled();
    });
  });
});
