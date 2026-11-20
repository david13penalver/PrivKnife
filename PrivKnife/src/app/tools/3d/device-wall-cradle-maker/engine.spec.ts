import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import JSZip from 'jszip';
import {
  buildDeviceCradleFileBase,
  calculateDeviceCradleMetrics,
  exportTo3mf,
  exportToBinaryStl,
  generateDeviceCradleParts,
  validateDeviceCradleOptions,
} from './engine';
import {
  ADHESIVE_FLAT_CRADLE_FIXTURE,
  GAN_BRICK_CRADLE_FIXTURE,
  INTERNAL_FLOOR_CRADLE_FIXTURE,
  INVALID_NARROW_FLOOR_MOUNT_FIXTURE,
  INVALID_THIN_WALL_FIXTURE,
  INVALID_TINY_DEVICE_FIXTURE,
  OVERSIZED_UCRADLE_FIXTURE,
  REMOTE_POCKET_FIXTURE,
  WIDE_MINIPC_RAILS_FIXTURE,
} from './test-fixtures';
import { DeviceCradleParts } from './types';

function assertFiniteZ0Geometry(geom: THREE.BufferGeometry | null, minTriangles = 16): void {
  expect(geom).not.toBeNull();
  const pos = geom!.getAttribute('position');
  expect(pos).toBeDefined();
  expect(pos.count).toBeGreaterThanOrEqual(minTriangles * 3);

  for (let i = 0; i < pos.count; i++) {
    expect(Number.isFinite(pos.getX(i))).toBe(true);
    expect(Number.isFinite(pos.getY(i))).toBe(true);
    expect(Number.isFinite(pos.getZ(i))).toBe(true);
  }

  geom!.computeBoundingBox();
  const box = geom!.boundingBox!;
  expect(box.min.z).toBeGreaterThanOrEqual(-0.01);
  expect(box.min.z).toBeLessThanOrEqual(0.05);
}

describe('Device Wall Mount & Power-Brick Cradle Engine — Seam 1A', () => {
  const createdParts: DeviceCradleParts[] = [];

  afterEach(() => {
    while (createdParts.length > 0) {
      createdParts.pop()?.dispose();
    }
    vi.restoreAllMocks();
  });

  describe('validateDeviceCradleOptions', () => {
    it('accepts all valid under-desk rail, U-cradle, internal-floor, adhesive, and pocket fixtures', () => {
      expect(validateDeviceCradleOptions(GAN_BRICK_CRADLE_FIXTURE)).toEqual({ valid: true });
      expect(validateDeviceCradleOptions(WIDE_MINIPC_RAILS_FIXTURE)).toEqual({ valid: true });
      expect(validateDeviceCradleOptions(REMOTE_POCKET_FIXTURE)).toEqual({ valid: true });
      expect(validateDeviceCradleOptions(INTERNAL_FLOOR_CRADLE_FIXTURE)).toEqual({ valid: true });
      expect(validateDeviceCradleOptions(ADHESIVE_FLAT_CRADLE_FIXTURE)).toEqual({ valid: true });
    });

    it('rejects thin walls (< 2.8mm), invalid device bounds, narrow floor mounts, and NaN parameters', () => {
      const thin = validateDeviceCradleOptions(INVALID_THIN_WALL_FIXTURE);
      expect(thin.valid).toBe(false);
      expect(thin.error).toBeTruthy();

      expect(validateDeviceCradleOptions(INVALID_TINY_DEVICE_FIXTURE).valid).toBe(false);
      expect(validateDeviceCradleOptions(INVALID_NARROW_FLOOR_MOUNT_FIXTURE).valid).toBe(false);
      expect(validateDeviceCradleOptions(null as unknown as typeof GAN_BRICK_CRADLE_FIXTURE).valid).toBe(false);
      expect(validateDeviceCradleOptions({ ...GAN_BRICK_CRADLE_FIXTURE, screwDiameterMm: 7.0 }).valid).toBe(false);
      expect(validateDeviceCradleOptions({ ...GAN_BRICK_CRADLE_FIXTURE, mountSpanMm: Number.NaN }).valid).toBe(false);
    });
  });

  describe('generateDeviceCradleParts', () => {
    it('builds U-wrap brick cradle with exact inner clearances, external screw ears, thermal vents, and Z = 0 seating', () => {
      const parts = generateDeviceCradleParts(GAN_BRICK_CRADLE_FIXTURE);
      createdParts.push(parts);

      expect(parts.innerOpeningWidthMm).toBeCloseTo(76.6, 2);
      expect(parts.innerOpeningHeightMm).toBeCloseTo(32.8, 2);
      expect(parts.partGeometries).toHaveLength(1);
      expect(parts.screwHoleCount).toBeGreaterThanOrEqual(4);
      expect(parts.ventSlotCount).toBeGreaterThanOrEqual(2);
      assertFiniteZ0Geometry(parts.partGeometries[0].geometry, 40);
      assertFiniteZ0Geometry(parts.mergedGeometry, 40);
    });

    it('builds symmetric Left + Right slide rails pair cleanly on XY plate even for 260mm wide Mini-PCs', () => {
      const rails = generateDeviceCradleParts(WIDE_MINIPC_RAILS_FIXTURE);
      createdParts.push(rails);

      expect(rails.partGeometries).toHaveLength(2);
      expect(rails.partGeometries[0].name).toContain('Left');
      expect(rails.partGeometries[1].name).toContain('Right');
      assertFiniteZ0Geometry(rails.partGeometries[0].geometry, 30);
      assertFiniteZ0Geometry(rails.partGeometries[1].geometry, 30);

      rails.partGeometries[0].geometry.computeBoundingBox();
      rails.partGeometries[1].geometry.computeBoundingBox();
      const leftBox = rails.partGeometries[0].geometry.boundingBox!;
      const rightBox = rails.partGeometries[1].geometry.boundingBox!;
      expect(leftBox.max.x).toBeLessThan(rightBox.min.x);
      expect(rails.widthMm).toBeLessThan(220);
    });

    it('builds remote pocket with charging cutout, internal-floor cradle, and adhesive flat bracket cleanly', () => {
      const pocket = generateDeviceCradleParts(REMOTE_POCKET_FIXTURE);
      const floorMount = generateDeviceCradleParts(INTERNAL_FLOOR_CRADLE_FIXTURE);
      const vhbMount = generateDeviceCradleParts(ADHESIVE_FLAT_CRADLE_FIXTURE);
      createdParts.push(pocket, floorMount, vhbMount);

      assertFiniteZ0Geometry(pocket.mergedGeometry, 30);
      assertFiniteZ0Geometry(floorMount.mergedGeometry, 30);
      assertFiniteZ0Geometry(vhbMount.mergedGeometry, 20);
      expect(vhbMount.screwHoleCount).toBe(0);
      expect(vhbMount.ventSlotCount).toBe(0);
    });
  });

  describe('Seam 1B — Metrics, Binary .STL, Multi-Object .3MF & Determinism', () => {
    it('computes single-pass metrics and keeps 260mm rails inside 220mm bed while flagging wide U-cradle', () => {
      const railsParts = generateDeviceCradleParts(WIDE_MINIPC_RAILS_FIXTURE);
      createdParts.push(railsParts);
      const railsMetrics = calculateDeviceCradleMetrics(WIDE_MINIPC_RAILS_FIXTURE, railsParts);
      expect(railsMetrics.partCount).toBe(2);
      expect(railsMetrics.exceedsStandardBed).toBe(false);
      expect(railsMetrics.innerOpeningWidthMm).toBeCloseTo(261.6, 1);

      const bigU = generateDeviceCradleParts(OVERSIZED_UCRADLE_FIXTURE);
      createdParts.push(bigU);
      const bigMetrics = calculateDeviceCradleMetrics(OVERSIZED_UCRADLE_FIXTURE, bigU);
      expect(bigMetrics.partCount).toBe(1);
      expect(bigMetrics.exceedsStandardBed).toBe(true);
    });

    it('exports binary little-endian .STL without "solid " header and separate Left/Right .3MF objects', async () => {
      const rails = generateDeviceCradleParts(WIDE_MINIPC_RAILS_FIXTURE);
      createdParts.push(rails);
      const metrics = calculateDeviceCradleMetrics(WIDE_MINIPC_RAILS_FIXTURE, rails);

      const stlBuf = exportToBinaryStl(rails);
      expect(stlBuf.byteLength).toBe(84 + metrics.triangleCount * 50);
      const header = new TextDecoder().decode(new Uint8Array(stlBuf, 0, 6));
      expect(header.startsWith('solid ')).toBe(false);
      expect(new DataView(stlBuf).getUint32(80, true)).toBe(metrics.triangleCount);

      const blob3mf = await exportTo3mf(WIDE_MINIPC_RAILS_FIXTURE, rails);
      const zip = await JSZip.loadAsync(await blob3mf.arrayBuffer());
      const modelXml = await zip.file('3D/3dmodel.model')!.async('string');
      expect((modelXml.match(/<object /g) || []).length).toBe(2);
      expect(modelXml).toContain('Left Slide Rail');
      expect(modelXml).toContain('Right Slide Rail');
    });

    it('performs zero network or storage calls and outputs byte-identical STL and XML across random seeds', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.15);

      const pA = generateDeviceCradleParts(GAN_BRICK_CRADLE_FIXTURE);
      createdParts.push(pA);
      const stlA = new Uint8Array(exportToBinaryStl(pA));
      const zipA = await JSZip.loadAsync(await (await exportTo3mf(GAN_BRICK_CRADLE_FIXTURE, pA)).arrayBuffer());
      const xmlA = await zipA.file('3D/3dmodel.model')!.async('string');

      randSpy.mockReturnValue(0.85);
      const pB = generateDeviceCradleParts(GAN_BRICK_CRADLE_FIXTURE);
      createdParts.push(pB);
      const stlB = new Uint8Array(exportToBinaryStl(pB));
      const zipB = await JSZip.loadAsync(await (await exportTo3mf(GAN_BRICK_CRADLE_FIXTURE, pB)).arrayBuffer());
      const xmlB = await zipB.file('3D/3dmodel.model')!.async('string');

      expect(stlA).toEqual(stlB);
      expect(xmlA).toBe(xmlB);
      expect(buildDeviceCradleFileBase(GAN_BRICK_CRADLE_FIXTURE)).toBe('privknife-cradle-u_wrap_cradle-75x32mm');
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(setItemSpy).not.toHaveBeenCalled();
    });
  });
});
