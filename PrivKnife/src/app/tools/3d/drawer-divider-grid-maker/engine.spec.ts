import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import JSZip from 'jszip';
import {
  calculateDrawerGridMetrics,
  exportPlateZip,
  exportTo3mf,
  exportToBinaryStl,
  generateDrawerGridParts,
  parseNormalizedRatios,
  planSlatSplits,
  validateDrawerGridOptions,
} from './engine';
import {
  INVALID_SINGLE_CELL_FIXTURE,
  INVALID_TINY_DRAWER_FIXTURE,
  MALFORMED_RATIOS_FIXTURE,
  OVERSIZED_SPLIT_FIXTURE,
  STANDARD_DESK_DRAWER_FIXTURE,
  UNEQUAL_RATIOS_FIXTURE,
} from './test-fixtures';
import { DrawerGridParts } from './types';

function triangleCountOf(geom: THREE.BufferGeometry): number {
  const idx = geom.getIndex();
  if (idx) return Math.floor(idx.count / 3);
  const pos = geom.getAttribute('position');
  return pos ? Math.floor(pos.count / 3) : 0;
}

function assertFiniteGeometry(geom: THREE.BufferGeometry | null, minTris = 6): THREE.Box3 {
  expect(geom).not.toBeNull();
  const pos = geom!.getAttribute('position');
  expect(pos).toBeDefined();
  expect(triangleCountOf(geom!)).toBeGreaterThanOrEqual(minTris);

  for (let i = 0; i < pos.count; i++) {
    expect(Number.isFinite(pos.getX(i))).toBe(true);
    expect(Number.isFinite(pos.getY(i))).toBe(true);
    expect(Number.isFinite(pos.getZ(i))).toBe(true);
  }
  geom!.computeBoundingBox();
  expect(geom!.boundingBox).not.toBeNull();
  return geom!.boundingBox!;
}

describe('Drawer Divider & Interlocking Grid Engine — Seam 1A (Ratio Solver, Dovetail Splits & Geometry)', () => {
  const created: DrawerGridParts[] = [];

  afterEach(() => {
    while (created.length > 0) {
      created.pop()?.dispose();
    }
    vi.restoreAllMocks();
  });

  describe('validateDrawerGridOptions', () => {
    it('accepts standard, unequal ratio, oversized split, and fallback malformed ratio options', () => {
      expect(validateDrawerGridOptions(STANDARD_DESK_DRAWER_FIXTURE)).toEqual({ valid: true });
      expect(validateDrawerGridOptions(UNEQUAL_RATIOS_FIXTURE)).toEqual({ valid: true });
      expect(validateDrawerGridOptions(OVERSIZED_SPLIT_FIXTURE)).toEqual({ valid: true });
      expect(validateDrawerGridOptions(MALFORMED_RATIOS_FIXTURE)).toEqual({ valid: true });
    });

    it('rejects null, out-of-range drawer/blade/bed/clearance values, and 1x1 zero-divider grid', () => {
      expect(validateDrawerGridOptions(null as unknown as typeof STANDARD_DESK_DRAWER_FIXTURE).valid).toBe(false);
      expect(validateDrawerGridOptions(INVALID_TINY_DRAWER_FIXTURE).valid).toBe(false);
      expect(validateDrawerGridOptions(INVALID_SINGLE_CELL_FIXTURE).valid).toBe(false);
      expect(validateDrawerGridOptions({ ...STANDARD_DESK_DRAWER_FIXTURE, drawerWidthMm: 950 }).valid).toBe(false);
      expect(validateDrawerGridOptions({ ...STANDARD_DESK_DRAWER_FIXTURE, drawerDepthMm: 75 }).valid).toBe(false);
      expect(validateDrawerGridOptions({ ...STANDARD_DESK_DRAWER_FIXTURE, drawerDepthMm: 710 }).valid).toBe(false);
      expect(validateDrawerGridOptions({ ...STANDARD_DESK_DRAWER_FIXTURE, dividerHeightMm: 18 }).valid).toBe(false);
      expect(validateDrawerGridOptions({ ...STANDARD_DESK_DRAWER_FIXTURE, dividerHeightMm: 145 }).valid).toBe(false);
      expect(validateDrawerGridOptions({ ...STANDARD_DESK_DRAWER_FIXTURE, bladeThicknessMm: 2.0 }).valid).toBe(false);
      expect(validateDrawerGridOptions({ ...STANDARD_DESK_DRAWER_FIXTURE, bladeThicknessMm: 5.5 }).valid).toBe(false);
      expect(validateDrawerGridOptions({ ...STANDARD_DESK_DRAWER_FIXTURE, edgeClearanceMm: 0.4 }).valid).toBe(false);
      expect(validateDrawerGridOptions({ ...STANDARD_DESK_DRAWER_FIXTURE, edgeClearanceMm: 3.2 }).valid).toBe(false);
      expect(validateDrawerGridOptions({ ...STANDARD_DESK_DRAWER_FIXTURE, notchClearanceMm: 0.1 }).valid).toBe(false);
      expect(validateDrawerGridOptions({ ...STANDARD_DESK_DRAWER_FIXTURE, notchClearanceMm: 0.45 }).valid).toBe(false);
      expect(validateDrawerGridOptions({ ...STANDARD_DESK_DRAWER_FIXTURE, printerBedMm: 170 }).valid).toBe(false);
      expect(validateDrawerGridOptions({ ...STANDARD_DESK_DRAWER_FIXTURE, printerBedMm: 360 }).valid).toBe(false);
    });
  });

  describe('parseNormalizedRatios', () => {
    it('normalizes comma-separated positive ratios and falls back cleanly on malformed input', () => {
      expect(parseNormalizedRatios('1,2,1', 2)).toEqual([0.25, 0.5, 0.25]);
      expect(parseNormalizedRatios('25, 25, 50', 4)).toEqual([0.25, 0.25, 0.5]);
      const fallback = parseNormalizedRatios('abc, -3, NaN', 4);
      expect(fallback).toHaveLength(4);
      expect(fallback.every((v) => Math.abs(v - 0.25) < 1e-6)).toBe(true);
    });
  });

  describe('planSlatSplits (Notch-Safe Dovetail Bed Splitter)', () => {
    it('keeps unsplit slats intact when within bed limit', () => {
      const single = planSlatSplits(190, [60, 130], 204);
      expect(single).toHaveLength(1);
      expect(single[0].hasLeftFemale).toBe(false);
      expect(single[0].hasRightMale).toBe(false);
    });

    it('splits oversized slats into <= maxPieceMm segments and avoids +-12mm zone around every cross-notch', () => {
      const notches = [166, 332];
      const maxPieceMm = 204;
      const plan = planSlatSplits(498, notches, maxPieceMm);

      expect(plan.length).toBeGreaterThanOrEqual(3);
      for (const seg of plan) {
        expect(seg.lengthMm).toBeLessThanOrEqual(maxPieceMm + 0.01);
        if (seg.splitRightMm !== undefined) {
          for (const n of notches) {
            expect(Math.abs(seg.splitRightMm - n)).toBeGreaterThanOrEqual(12);
          }
        }
      }
      expect(plan[0].hasLeftFemale).toBe(false);
      expect(plan[0].hasRightMale).toBe(true);
      expect(plan[plan.length - 1].hasLeftFemale).toBe(true);
      expect(plan[plan.length - 1].hasRightMale).toBe(false);
    });
  });

  describe('generateDrawerGridParts', () => {
    it('splits 500mm oversized drawer cleanly for 220mm bed with zero splits within 12mm of any notch', () => {
      const parts = generateDrawerGridParts(OVERSIZED_SPLIT_FIXTURE);
      created.push(parts);

      expect(parts.usableWidthMm).toBe(498);
      expect(parts.usableDepthMm).toBe(378);
      expect(parts.dovetailSplitCount).toBeGreaterThanOrEqual(2);
      expect(parts.buildPlateCount).toBeGreaterThanOrEqual(2);

      for (const seg of parts.segments) {
        expect(seg.lengthMm).toBeLessThanOrEqual(204.01);
        for (const splitPos of seg.splitPositionsMm) {
          for (const notch of seg.notchPositionsMm) {
            expect(Math.abs(splitPos - notch)).toBeGreaterThanOrEqual(12);
          }
        }

        const flatBb = assertFiniteGeometry(seg.flatGeometry, 8);
        const asmBb = assertFiniteGeometry(seg.assembledGeometry, 8);

        expect(flatBb.min.z).toBeGreaterThanOrEqual(-0.01);
        expect(flatBb.max.z).toBeLessThanOrEqual(OVERSIZED_SPLIT_FIXTURE.bladeThicknessMm + 3.5);

        expect(asmBb.min.z).toBeGreaterThanOrEqual(-0.01);
        expect(asmBb.max.z).toBeCloseTo(OVERSIZED_SPLIT_FIXTURE.dividerHeightMm, 1);

        assertFiniteGeometry(seg.labelFlatGeometry, 2);
        assertFiniteGeometry(seg.labelAssembledGeometry, 2);
      }
    });

    it('adds stabilizing T-feet geometry when includeBaseFeet is true and omits labels when disabled', () => {
      const plain = generateDrawerGridParts({
        ...STANDARD_DESK_DRAWER_FIXTURE,
        includeBaseFeet: false,
        includePieceLabels: false,
      });
      const footed = generateDrawerGridParts({
        ...STANDARD_DESK_DRAWER_FIXTURE,
        includeBaseFeet: true,
        includePieceLabels: false,
      });
      created.push(plain, footed);

      const plainTris = plain.segments.reduce((s, seg) => s + triangleCountOf(seg.flatGeometry), 0);
      const footedTris = footed.segments.reduce((s, seg) => s + triangleCountOf(seg.flatGeometry), 0);
      expect(footedTris).toBeGreaterThan(plainTris);
      expect(plain.segments.every((s) => s.labelFlatGeometry === null)).toBe(true);
    });
  });

  describe('Seam 1B — Multi-Plate Metrics, .STL, .3MF & Plate .ZIP Exports', () => {
    it('computes single-pass metrics accurately across multiple split slats and plates', () => {
      const parts = generateDrawerGridParts(OVERSIZED_SPLIT_FIXTURE);
      created.push(parts);
      const metrics = calculateDrawerGridMetrics(OVERSIZED_SPLIT_FIXTURE, parts);

      expect(metrics.usableWidthMm).toBe(498);
      expect(metrics.usableDepthMm).toBe(378);
      expect(metrics.totalSlatsCount).toBe(parts.segments.length);
      expect(metrics.dovetailSplitCount).toBeGreaterThanOrEqual(2);
      expect(metrics.buildPlateCount).toBe(parts.buildPlateCount);
      expect(metrics.triangleCount).toBeGreaterThan(20);
      expect(metrics.estimatedWeightG).toBeCloseTo(metrics.estimatedVolumeCm3 * 1.24, 1);
      expect(metrics.estimatedPrintTimeHours).toBeGreaterThan(0.2);
    });

    it('exports valid binary STL matching exact 84 + triangleCount * 50 byte size', () => {
      const parts = generateDrawerGridParts(STANDARD_DESK_DRAWER_FIXTURE);
      created.push(parts);
      const metrics = calculateDrawerGridMetrics(STANDARD_DESK_DRAWER_FIXTURE, parts);

      const stlBuffer = exportToBinaryStl(parts);
      expect(stlBuffer.byteLength).toBe(84 + metrics.triangleCount * 50);

      const header = new TextDecoder('ascii').decode(new Uint8Array(stlBuffer, 0, 80));
      expect(header.toLowerCase().startsWith('solid ')).toBe(false);

      const view = new DataView(stlBuffer);
      expect(view.getUint32(80, true)).toBe(metrics.triangleCount);

      for (let off = 84; off < stlBuffer.byteLength; off += 50) {
        for (let f = 0; f < 12; f++) {
          expect(Number.isFinite(view.getFloat32(off + f * 4, true))).toBe(true);
        }
      }
    });

    it('exports multi-object .3MF zip XML with independent objects per slat segment and label', async () => {
      const parts = generateDrawerGridParts(OVERSIZED_SPLIT_FIXTURE);
      created.push(parts);

      const blob = await exportTo3mf(OVERSIZED_SPLIT_FIXTURE, parts);
      expect(blob.type).toBe('model/3mf');

      const zip = await JSZip.loadAsync(await blob.arrayBuffer());
      expect(zip.file('[Content_Types].xml')).not.toBeNull();
      expect(zip.file('_rels/.rels')).not.toBeNull();

      const modelXml = await zip.file('3D/3dmodel.model')!.async('string');
      const objects = modelXml.match(/<object\s+id="/g) || [];
      expect(objects.length).toBeGreaterThanOrEqual(parts.segments.length);
      expect(modelXml).toContain('<basematerials');
      expect(modelXml).toContain('X1-A');
    });

    it('exports plate-by-plate .ZIP pack containing valid plate STL files and assembly-guide.txt', async () => {
      const parts = generateDrawerGridParts(OVERSIZED_SPLIT_FIXTURE);
      created.push(parts);

      const zipBlob = await exportPlateZip(OVERSIZED_SPLIT_FIXTURE, parts);
      expect(zipBlob.type).toBe('application/zip');

      const zip = await JSZip.loadAsync(await zipBlob.arrayBuffer());
      const guide = zip.file('assembly-guide.txt');
      expect(guide).not.toBeNull();
      const guideText = await guide!.async('string');
      expect(guideText).toContain('X1-A');
      expect(guideText).toContain('498');

      for (let p = 1; p <= parts.buildPlateCount; p++) {
        const plateFile = zip.file(`plate-${p}.stl`);
        expect(plateFile).not.toBeNull();
        const plateBuf = await plateFile!.async('arraybuffer');
        const triCount = new DataView(plateBuf).getUint32(80, true);
        expect(plateBuf.byteLength).toBe(84 + triCount * 50);
      }
    });

    it('executes zero fetch/Storage.setItem calls and produces byte-identical exports', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.15);

      const partsA = generateDrawerGridParts(STANDARD_DESK_DRAWER_FIXTURE);
      created.push(partsA);
      const stlA = new Uint8Array(exportToBinaryStl(partsA));
      const xmlA = await (
        await JSZip.loadAsync(await (await exportTo3mf(STANDARD_DESK_DRAWER_FIXTURE, partsA)).arrayBuffer())
      )
        .file('3D/3dmodel.model')!
        .async('string');

      randSpy.mockReturnValue(0.85);
      const partsB = generateDrawerGridParts(STANDARD_DESK_DRAWER_FIXTURE);
      created.push(partsB);
      const stlB = new Uint8Array(exportToBinaryStl(partsB));
      const xmlB = await (
        await JSZip.loadAsync(await (await exportTo3mf(STANDARD_DESK_DRAWER_FIXTURE, partsB)).arrayBuffer())
      )
        .file('3D/3dmodel.model')!
        .async('string');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(setItemSpy).not.toHaveBeenCalled();
      expect(stlA).toEqual(stlB);
      expect(xmlA).toBe(xmlB);
    });
  });
});
