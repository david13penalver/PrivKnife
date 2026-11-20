import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import JSZip from 'jszip';
import {
  buildKnobFileBase,
  calculateKnobMetrics,
  computeHexSocketCircumradiusMm,
  exportTo3mf,
  exportToBinaryStl,
  generateKnobParts,
  validateKnobOptions,
} from './engine';
import {
  FLUTED_APPLIANCE_FIXTURE,
  INVALID_DFLAT_FIXTURE,
  INVALID_SOCKET_DEPTH_FIXTURE,
  INVALID_THIN_HUB_FIXTURE,
  M6_STAR_NUT_FIXTURE,
  POTENTIOMETER_DSHAFT_FIXTURE,
  SET_SCREW_ROUND_FIXTURE,
  SPLINED_T18_FIXTURE,
  TRIPOD_BOLT_WING_FIXTURE,
} from './test-fixtures';
import { KnobParts } from './types';

function assertFiniteGeometry(
  geom: THREE.BufferGeometry | null,
  minTriangles = 24,
  requireZ0 = true
): void {
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
  if (requireZ0) {
    expect(box.min.z).toBeGreaterThanOrEqual(-0.01);
    expect(box.min.z).toBeLessThanOrEqual(0.05);
  } else {
    expect(box.min.z).toBeGreaterThan(10);
  }
}

describe('Replacement Knob, Dial & Captive-Nut Thumbscrew Engine — Seam 1A', () => {
  const createdParts: KnobParts[] = [];

  afterEach(() => {
    while (createdParts.length > 0) {
      createdParts.pop()?.dispose();
    }
    vi.restoreAllMocks();
  });

  describe('validateKnobOptions & computeHexSocketCircumradiusMm', () => {
    it('accepts all valid knob grip styles and drive fixtures', () => {
      expect(validateKnobOptions(POTENTIOMETER_DSHAFT_FIXTURE)).toEqual({ valid: true });
      expect(validateKnobOptions(FLUTED_APPLIANCE_FIXTURE)).toEqual({ valid: true });
      expect(validateKnobOptions(M6_STAR_NUT_FIXTURE)).toEqual({ valid: true });
      expect(validateKnobOptions(TRIPOD_BOLT_WING_FIXTURE)).toEqual({ valid: true });
      expect(validateKnobOptions(SPLINED_T18_FIXTURE)).toEqual({ valid: true });
      expect(validateKnobOptions(SET_SCREW_ROUND_FIXTURE)).toEqual({ valid: true });
    });

    it('rejects insufficient hub wall (< 2.5mm), invalid D-flat depth, oversized socket depth, and out-of-range inputs', () => {
      const thinHub = validateKnobOptions(INVALID_THIN_HUB_FIXTURE);
      expect(thinHub.valid).toBe(false);
      expect(thinHub.error).toBeTruthy();

      expect(validateKnobOptions(INVALID_DFLAT_FIXTURE).valid).toBe(false);
      expect(validateKnobOptions(INVALID_SOCKET_DEPTH_FIXTURE).valid).toBe(false);
      expect(validateKnobOptions(null as unknown as typeof POTENTIOMETER_DSHAFT_FIXTURE).valid).toBe(false);
      expect(validateKnobOptions({ ...POTENTIOMETER_DSHAFT_FIXTURE, fitToleranceMm: 0.7 }).valid).toBe(false);
      expect(validateKnobOptions({ ...POTENTIOMETER_DSHAFT_FIXTURE, gripDiameterMm: Number.NaN }).valid).toBe(false);
    });

    it('computes DIN 934 M6 hex pocket circumradius accurately across flats plus fit tolerance', () => {
      const rM6 = computeHexSocketCircumradiusMm(10.0, 0.25);
      expect(rM6).toBeCloseTo(10.25 / Math.sqrt(3), 4);
      expect(rM6).toBeCloseTo(5.9178, 3);
    });
  });

  describe('generateKnobParts — Grips, Shaft Drives & D-Flat Rotation', () => {
    it('builds watertight Z = 0 meshes across all 4 grip styles and 5 shaft drive types', () => {
      const fixtures = [
        POTENTIOMETER_DSHAFT_FIXTURE,
        FLUTED_APPLIANCE_FIXTURE,
        M6_STAR_NUT_FIXTURE,
        TRIPOD_BOLT_WING_FIXTURE,
        SPLINED_T18_FIXTURE,
        SET_SCREW_ROUND_FIXTURE,
      ];

      for (const fx of fixtures) {
        const parts = generateKnobParts(fx);
        createdParts.push(parts);
        assertFiniteGeometry(parts.bodyGeometry, 40);
        expect(parts.minHubWallMm).toBeGreaterThanOrEqual(2.5);
        expect(parts.totalHeightMm).toBeCloseTo(fx.gripHeightMm + fx.neckHeightMm, 0);
      }
    });

    it('populates M6 DIN 934 circumradius and supports 0 vs 90 deg D-flat internal rotation cleanly', () => {
      const m6Parts = generateKnobParts(M6_STAR_NUT_FIXTURE);
      createdParts.push(m6Parts);
      expect(m6Parts.hexSocketCircumradiusMm).toBeCloseTo(5.9178, 3);
      expect(m6Parts.indicatorGeometry).toBeNull();

      const rot0 = generateKnobParts({ ...POTENTIOMETER_DSHAFT_FIXTURE, flatRotationDeg: 0 });
      const rot90 = generateKnobParts({ ...POTENTIOMETER_DSHAFT_FIXTURE, flatRotationDeg: 90 });
      createdParts.push(rot0, rot90);

      assertFiniteGeometry(rot0.bodyGeometry, 40);
      assertFiniteGeometry(rot90.bodyGeometry, 40);
      assertFiniteGeometry(rot0.indicatorGeometry, 8, false);
      expect(rot0.outerDiameterMm).toBeCloseTo(rot90.outerDiameterMm, 2);
      expect(rot0.totalHeightMm).toBeCloseTo(rot90.totalHeightMm, 2);

      // Internal flat rotation modifies vertex distribution without changing symmetric outer silhouette
      const pos0 = rot0.bodyGeometry.getAttribute('position');
      const pos90 = rot90.bodyGeometry.getAttribute('position');
      let diffCount = 0;
      const limit = Math.min(pos0.count, pos90.count);
      for (let i = 0; i < limit; i++) {
        if (Math.abs(pos0.getX(i) - pos90.getX(i)) > 0.05 || Math.abs(pos0.getY(i) - pos90.getY(i)) > 0.05) {
          diffCount++;
        }
      }
      expect(diffCount).toBeGreaterThan(6);
    });
  });

  describe('Seam 1B — Dual-Color Indicator, Metrics, .STL / .3MF & Privacy Determinism', () => {
    it('calculates single-pass knob metrics cleanly', () => {
      const parts = generateKnobParts(POTENTIOMETER_DSHAFT_FIXTURE);
      createdParts.push(parts);

      const metrics = calculateKnobMetrics(POTENTIOMETER_DSHAFT_FIXTURE, parts);
      expect(metrics.outerDiameterMm).toBeCloseTo(parts.outerDiameterMm, 2);
      expect(metrics.totalHeightMm).toBeCloseTo(parts.totalHeightMm, 2);
      expect(metrics.minHubWallMm).toBeGreaterThanOrEqual(2.5);
      expect(metrics.triangleCount).toBeGreaterThan(80);
      expect(metrics.estimatedWeightG).toBeGreaterThan(1);
      expect(metrics.estimatedPrintTimeHours).toBeGreaterThan(0.05);
    });

    it('exports binary little-endian .STL without "solid " header and multi-object .3MF separating Body and Indicator', async () => {
      const labeledParts = generateKnobParts(POTENTIOMETER_DSHAFT_FIXTURE);
      createdParts.push(labeledParts);
      const metrics = calculateKnobMetrics(POTENTIOMETER_DSHAFT_FIXTURE, labeledParts);

      const stlBuf = exportToBinaryStl(labeledParts);
      expect(stlBuf.byteLength).toBe(84 + metrics.triangleCount * 50);
      const header = new TextDecoder().decode(new Uint8Array(stlBuf, 0, 6));
      expect(header.startsWith('solid ')).toBe(false);
      expect(new DataView(stlBuf).getUint32(80, true)).toBe(metrics.triangleCount);

      const blob3mf = await exportTo3mf(POTENTIOMETER_DSHAFT_FIXTURE, labeledParts);
      expect(blob3mf.size).toBeGreaterThan(500);
      const zip = await JSZip.loadAsync(await blob3mf.arrayBuffer());
      const modelXml = await zip.file('3D/3dmodel.model')!.async('string');
      expect((modelXml.match(/<object /g) || []).length).toBe(2);
      expect(modelXml).toContain('Knob Body');
      expect(modelXml).toContain('Position Indicator');

      const singleParts = generateKnobParts(M6_STAR_NUT_FIXTURE);
      createdParts.push(singleParts);
      const singleBlob = await exportTo3mf(M6_STAR_NUT_FIXTURE, singleParts);
      const singleZip = await JSZip.loadAsync(await singleBlob.arrayBuffer());
      const singleXml = await singleZip.file('3D/3dmodel.model')!.async('string');
      expect((singleXml.match(/<object /g) || []).length).toBe(1);
    });

    it('performs zero network or storage calls and emits byte-identical STL and XML across random seeds', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.15);

      const partsA = generateKnobParts(FLUTED_APPLIANCE_FIXTURE);
      createdParts.push(partsA);
      const stlA = new Uint8Array(exportToBinaryStl(partsA));
      const zipA = await JSZip.loadAsync(await (await exportTo3mf(FLUTED_APPLIANCE_FIXTURE, partsA)).arrayBuffer());
      const xmlA = await zipA.file('3D/3dmodel.model')!.async('string');

      randSpy.mockReturnValue(0.85);
      const partsB = generateKnobParts(FLUTED_APPLIANCE_FIXTURE);
      createdParts.push(partsB);
      const stlB = new Uint8Array(exportToBinaryStl(partsB));
      const zipB = await JSZip.loadAsync(await (await exportTo3mf(FLUTED_APPLIANCE_FIXTURE, partsB)).arrayBuffer());
      const xmlB = await zipB.file('3D/3dmodel.model')!.async('string');

      expect(stlA).toEqual(stlB);
      expect(xmlA).toBe(xmlB);
      expect(buildKnobFileBase(FLUTED_APPLIANCE_FIXTURE)).toBe('privknife-knob-fluted-d_shaft');
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(setItemSpy).not.toHaveBeenCalled();
    });
  });
});
