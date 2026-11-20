import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import JSZip from 'jszip';
import {
  buildCableToolFileBase,
  calculateCableToolMetrics,
  exportTo3mf,
  exportToBinaryStl,
  generateCableToolParts,
  validateCableToolOptions,
} from './engine';
import {
  ADHESIVE_COMB_FIXTURE,
  DESK_COMB_6MM_FIXTURE,
  INVALID_CRUSHED_ANNULUS_FIXTURE,
  INVALID_PINCH_RATIO_FIXTURE,
  INVALID_TINY_CORE_WINDER_FIXTURE,
  OVERLOADED_TINY_WINDER_FIXTURE,
  PCLIP_BATCH_6_FIXTURE,
  TRAVEL_WINDER_2M_FIXTURE,
} from './test-fixtures';
import { CableToolParts } from './types';

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

describe('Cable Comb, Travel Cord Winder & Wall Clip Engine — Seam 1A', () => {
  const createdParts: CableToolParts[] = [];

  afterEach(() => {
    while (createdParts.length > 0) {
      createdParts.pop()?.dispose();
    }
    vi.restoreAllMocks();
  });

  describe('validateCableToolOptions', () => {
    it('accepts valid desk comb, travel cord winder, P-clip batch, and adhesive mount fixtures', () => {
      expect(validateCableToolOptions(DESK_COMB_6MM_FIXTURE)).toEqual({ valid: true });
      expect(validateCableToolOptions(TRAVEL_WINDER_2M_FIXTURE)).toEqual({ valid: true });
      expect(validateCableToolOptions(PCLIP_BATCH_6_FIXTURE)).toEqual({ valid: true });
      expect(validateCableToolOptions(ADHESIVE_COMB_FIXTURE)).toEqual({ valid: true });
    });

    it('rejects unsafe cord bend core radius, crushed annulus width, bad pinch ratios, and NaN bounds', () => {
      const tinyCore = validateCableToolOptions(INVALID_TINY_CORE_WINDER_FIXTURE);
      expect(tinyCore.valid).toBe(false);
      expect(tinyCore.error).toBeTruthy();

      expect(validateCableToolOptions(INVALID_CRUSHED_ANNULUS_FIXTURE).valid).toBe(false);
      expect(validateCableToolOptions(INVALID_PINCH_RATIO_FIXTURE).valid).toBe(false);
      expect(validateCableToolOptions(null as unknown as typeof DESK_COMB_6MM_FIXTURE).valid).toBe(false);
      expect(validateCableToolOptions({ ...PCLIP_BATCH_6_FIXTURE, slotCount: 5 }).valid).toBe(false);
      expect(validateCableToolOptions({ ...PCLIP_BATCH_6_FIXTURE, clipQuantity: 15 }).valid).toBe(false);
      expect(validateCableToolOptions({ ...DESK_COMB_6MM_FIXTURE, cableDiameterMm: Number.NaN }).valid).toBe(false);
    });
  });

  describe('generateCableToolParts', () => {
    it('computes teardrop entry pinch (< cavity) and builds Z = 0 desk comb with screw bores or adhesive flat', () => {
      const comb = generateCableToolParts(DESK_COMB_6MM_FIXTURE);
      createdParts.push(comb);

      expect(comb.entryMouthWidthMm).toBeCloseTo(4.92, 2);
      expect(comb.cavityDiameterMm).toBeCloseTo(6.3, 2);
      expect(comb.entryMouthWidthMm).toBeLessThan(comb.cavityDiameterMm);
      expect(comb.partGeometries).toHaveLength(1);
      assertFiniteZ0Geometry(comb.mergedGeometry, 40);

      const adhesive = generateCableToolParts(ADHESIVE_COMB_FIXTURE);
      createdParts.push(adhesive);
      assertFiniteZ0Geometry(adhesive.mergedGeometry, 30);
    });

    it('builds two-piece travel cord winder with USB-C plug slots cleanly grounded on Z = 0', () => {
      const winder = generateCableToolParts(TRAVEL_WINDER_2M_FIXTURE);
      createdParts.push(winder);

      expect(winder.cordCapacityOk).toBe(true);
      expect(winder.maxRecommendedCordM).toBeGreaterThanOrEqual(2.0);
      expect(winder.partGeometries).toHaveLength(2);
      expect(winder.partGeometries[0].name).toContain('Base');
      expect(winder.partGeometries[1].name).toContain('Lid');
      assertFiniteZ0Geometry(winder.partGeometries[0].geometry, 40);
      assertFiniteZ0Geometry(winder.partGeometries[1].geometry, 24);
    });

    it('generates 6 disjoint P-clips in a tidy Z = 0 grid array', () => {
      const clips = generateCableToolParts(PCLIP_BATCH_6_FIXTURE);
      createdParts.push(clips);

      expect(clips.partGeometries).toHaveLength(6);
      assertFiniteZ0Geometry(clips.mergedGeometry, 120);
      clips.partGeometries[0].geometry.computeBoundingBox();
      clips.partGeometries[1].geometry.computeBoundingBox();
      expect(clips.partGeometries[0].geometry.boundingBox!.max.x).toBeLessThan(
        clips.partGeometries[1].geometry.boundingBox!.min.x
      );
    });
  });

  describe('Seam 1B — Cord Capacity Solver, Binary .STL, Multi-Object .3MF & Determinism', () => {
    it('flags cordCapacityOk: false on overloaded tiny winder and passes 2m USB-C winder', () => {
      const okParts = generateCableToolParts(TRAVEL_WINDER_2M_FIXTURE);
      createdParts.push(okParts);
      const okMetrics = calculateCableToolMetrics(TRAVEL_WINDER_2M_FIXTURE, okParts);
      expect(okMetrics.cordCapacityOk).toBe(true);
      expect(okMetrics.maxRecommendedCordM).toBeGreaterThanOrEqual(2.0);
      expect(okMetrics.triangleCount).toBeGreaterThan(80);

      const smallParts = generateCableToolParts(OVERLOADED_TINY_WINDER_FIXTURE);
      createdParts.push(smallParts);
      const smallMetrics = calculateCableToolMetrics(OVERLOADED_TINY_WINDER_FIXTURE, smallParts);
      expect(smallMetrics.cordCapacityOk).toBe(false);
      expect(smallMetrics.maxRecommendedCordM).toBeLessThan(3.0);
    });

    it('exports binary little-endian .STL without "solid " header and separate .3MF objects for clips & winder', async () => {
      const clips = generateCableToolParts(PCLIP_BATCH_6_FIXTURE);
      createdParts.push(clips);
      const metrics = calculateCableToolMetrics(PCLIP_BATCH_6_FIXTURE, clips);

      const stlBuf = exportToBinaryStl(clips);
      expect(stlBuf.byteLength).toBe(84 + metrics.triangleCount * 50);
      const header = new TextDecoder().decode(new Uint8Array(stlBuf, 0, 6));
      expect(header.startsWith('solid ')).toBe(false);
      expect(new DataView(stlBuf).getUint32(80, true)).toBe(metrics.triangleCount);

      const clipBlob3mf = await exportTo3mf(PCLIP_BATCH_6_FIXTURE, clips);
      const clipZip = await JSZip.loadAsync(await clipBlob3mf.arrayBuffer());
      const clipXml = await clipZip.file('3D/3dmodel.model')!.async('string');
      expect((clipXml.match(/<object /g) || []).length).toBe(6);

      const winder = generateCableToolParts(TRAVEL_WINDER_2M_FIXTURE);
      createdParts.push(winder);
      const winderZip = await JSZip.loadAsync(await (await exportTo3mf(TRAVEL_WINDER_2M_FIXTURE, winder)).arrayBuffer());
      const winderXml = await winderZip.file('3D/3dmodel.model')!.async('string');
      expect((winderXml.match(/<object /g) || []).length).toBe(2);
      expect(winderXml).toContain('Spool Base');
      expect(winderXml).toContain('Spool Lid');
    });

    it('performs zero network or storage calls and emits byte-identical STL and XML across random seeds', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.15);

      const pA = generateCableToolParts(DESK_COMB_6MM_FIXTURE);
      createdParts.push(pA);
      const stlA = new Uint8Array(exportToBinaryStl(pA));
      const zipA = await JSZip.loadAsync(await (await exportTo3mf(DESK_COMB_6MM_FIXTURE, pA)).arrayBuffer());
      const xmlA = await zipA.file('3D/3dmodel.model')!.async('string');

      randSpy.mockReturnValue(0.85);
      const pB = generateCableToolParts(DESK_COMB_6MM_FIXTURE);
      createdParts.push(pB);
      const stlB = new Uint8Array(exportToBinaryStl(pB));
      const zipB = await JSZip.loadAsync(await (await exportTo3mf(DESK_COMB_6MM_FIXTURE, pB)).arrayBuffer());
      const xmlB = await zipB.file('3D/3dmodel.model')!.async('string');

      expect(stlA).toEqual(stlB);
      expect(xmlA).toBe(xmlB);
      expect(buildCableToolFileBase(DESK_COMB_6MM_FIXTURE)).toBe('privknife-cable_comb-6mm');
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(setItemSpy).not.toHaveBeenCalled();
    });
  });
});
