import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import JSZip from 'jszip';
import {
  buildToolHolderFileBase,
  calculateToolHolderMetrics,
  computeHexCircumradiusMm,
  exportTo3mf,
  exportToBinaryStl,
  generateToolHolderParts,
  parseToolSlots,
  validateToolHolderOptions,
} from './engine';
import {
  ALLEN_KEYS_FIXTURE,
  HEX_BITS_12_FIXTURE,
  INVALID_EMPTY_CUSTOM_FIXTURE,
  INVALID_TOLERANCE_FIXTURE,
  METRIC_DRILLS_FIXTURE,
  NOZZLE_RACK_FIXTURE,
  OVERSIZED_RACK_FIXTURE,
  SKADIS_MAGNET_FIXTURE,
  XML_SPECIAL_LABEL_FIXTURE,
} from './test-fixtures';
import { ToolHolderParts } from './types';

function assertFiniteGeometry(geom: THREE.BufferGeometry | null, minTriangles = 4): void {
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
  expect(geom!.boundingBox).not.toBeNull();
}

describe('Tool, Drill Bit, Hex Key & Nozzle Organizer Engine — Seam 1A', () => {
  const createdParts: ToolHolderParts[] = [];

  afterEach(() => {
    while (createdParts.length > 0) {
      createdParts.pop()?.dispose();
    }
    vi.restoreAllMocks();
  });

  describe('parseToolSlots & computeHexCircumradiusMm', () => {
    it('parses Allen key comma list into allen_slot items and ignores malformed entries', () => {
      const allen = parseToolSlots('1.5, 2, 2.5, 3, 4', 'allen_keys');
      expect(allen).toHaveLength(5);
      expect(allen.map((s) => s.label)).toEqual(['1.5', '2', '2.5', '3', '4']);
      expect(allen.every((s) => s.shape === 'allen_slot')).toBe(true);
      expect(allen[0].diameterMm).toBeCloseTo(1.5, 3);

      const filtered = parseToolSlots('abc, -2, 3.5, 6.0', 'custom');
      expect(filtered).toHaveLength(2);
      expect(filtered.map((s) => s.diameterMm)).toEqual([3.5, 6]);

      const invalidOnly = parseToolSlots('abc, -2', 'custom');
      expect(invalidOnly).toHaveLength(0);
    });

    it('parses imperial fractions and label:diameter pairs for M6 printer nozzles', () => {
      const imperial = parseToolSlots('1/16, 1/8, 1/4', 'imperial_drills');
      expect(imperial).toHaveLength(3);
      expect(imperial[0].label).toBe('1/16');
      expect(imperial[0].diameterMm).toBeCloseTo(1.588, 2);
      expect(imperial[2].diameterMm).toBeCloseTo(6.35, 2);

      const nozzles = parseToolSlots('0.2:7.2, 0.4:7.2, 0.8:7.2', 'printer_nozzles');
      expect(nozzles).toHaveLength(3);
      expect(nozzles[0]).toEqual({ label: '0.2', diameterMm: 7.2, shape: 'round' });
    });

    it('computes 1/4" hex bit circumradius accurately across flats plus tolerance', () => {
      const hex = parseToolSlots('PH1, PH2', 'hex_bits_quarter', 12);
      expect(hex).toHaveLength(12);
      expect(hex.every((s) => s.shape === 'hex' && s.diameterMm === 6.35)).toBe(true);

      const circumradius = computeHexCircumradiusMm(6.35, 0.35);
      expect(circumradius).toBeCloseTo(3.868, 3);
    });
  });

  describe('validateToolHolderOptions', () => {
    it('accepts valid presets and rejects invalid slot lists or out-of-range dimensions', () => {
      expect(validateToolHolderOptions(METRIC_DRILLS_FIXTURE)).toEqual({ valid: true });
      expect(validateToolHolderOptions(HEX_BITS_12_FIXTURE)).toEqual({ valid: true });
      expect(validateToolHolderOptions(ALLEN_KEYS_FIXTURE)).toEqual({ valid: true });
      expect(validateToolHolderOptions(NOZZLE_RACK_FIXTURE)).toEqual({ valid: true });
      expect(validateToolHolderOptions(SKADIS_MAGNET_FIXTURE)).toEqual({ valid: true });

      const emptyRes = validateToolHolderOptions(INVALID_EMPTY_CUSTOM_FIXTURE);
      expect(emptyRes.valid).toBe(false);
      expect(emptyRes.error).toBeTruthy();

      expect(validateToolHolderOptions(INVALID_TOLERANCE_FIXTURE).valid).toBe(false);
      expect(validateToolHolderOptions({ ...METRIC_DRILLS_FIXTURE, rows: 5 }).valid).toBe(false);
      expect(validateToolHolderOptions({ ...METRIC_DRILLS_FIXTURE, holeDepthMm: 45 }).valid).toBe(false);
      expect(validateToolHolderOptions({ ...METRIC_DRILLS_FIXTURE, slotSpacingMm: 2.5 }).valid).toBe(false);
      expect(validateToolHolderOptions({ ...HEX_BITS_12_FIXTURE, hexBitCount: 4 }).valid).toBe(false);
    });
  });

  describe('generateToolHolderParts — Stepped Tiers, CSG Bores & Floor Safety', () => {
    it('guarantees floor thickness >= effectiveHoleDepthMm + 2.5mm and Z = 0 seated stepped metric rack', () => {
      const deepDrills = {
        ...METRIC_DRILLS_FIXTURE,
        rows: 3,
        holeDepthMm: 36,
        stepRiseMm: 12,
      };
      const parts = generateToolHolderParts(deepDrills);
      createdParts.push(parts);

      assertFiniteGeometry(parts.bodyGeometry, 40);
      assertFiniteGeometry(parts.labelGeometry, 12);

      parts.bodyGeometry.computeBoundingBox();
      const box = parts.bodyGeometry.boundingBox!;
      expect(box.min.z).toBeGreaterThanOrEqual(-0.01);
      expect(parts.tierHeightsMm).toHaveLength(3);
      for (const tierH of parts.tierHeightsMm) {
        expect(tierH).toBeGreaterThanOrEqual(parts.effectiveHoleDepthMm + 2.5);
      }
      expect(parts.tierHeightsMm[2]).toBeGreaterThan(parts.tierHeightsMm[0]);
    });

    it('creates 1/4" hex bit sockets with magnet floor safety (>= holeDepthMm + 3.8mm) and Skadis rear hooks', () => {
      const hexParts = generateToolHolderParts(HEX_BITS_12_FIXTURE);
      createdParts.push(hexParts);
      assertFiniteGeometry(hexParts.bodyGeometry, 40);
      expect(hexParts.hexCircumradiusMm).toBeCloseTo(3.868, 3);
      expect(hexParts.magnetCount).toBeGreaterThanOrEqual(2);
      expect(hexParts.tierHeightsMm[0]).toBeGreaterThanOrEqual(
        hexParts.effectiveHoleDepthMm + 3.8
      );

      const skadisParts = generateToolHolderParts(SKADIS_MAGNET_FIXTURE);
      createdParts.push(skadisParts);
      assertFiniteGeometry(skadisParts.bodyGeometry, 40);
      expect(skadisParts.depthMm).toBeGreaterThan(hexParts.depthMm - 15);
    });

    it('builds flat nozzle tray and open-front Allen key rack cleanly', () => {
      const allenParts = generateToolHolderParts(ALLEN_KEYS_FIXTURE);
      createdParts.push(allenParts);
      assertFiniteGeometry(allenParts.bodyGeometry, 20);
      expect(allenParts.slots).toHaveLength(5);

      const nozzleParts = generateToolHolderParts(NOZZLE_RACK_FIXTURE);
      createdParts.push(nozzleParts);
      assertFiniteGeometry(nozzleParts.bodyGeometry, 20);
      expect(nozzleParts.tierHeightsMm).toHaveLength(1);
    });
  });

  describe('Seam 1B — Metrics, Binary .STL, Dual-Object .3MF & Privacy Determinism', () => {
    it('computes single-pass metrics and detects exceedsStandardBed > 220mm', () => {
      const stdParts = generateToolHolderParts(METRIC_DRILLS_FIXTURE);
      createdParts.push(stdParts);
      const stdMetrics = calculateToolHolderMetrics(METRIC_DRILLS_FIXTURE, stdParts);
      expect(stdMetrics.slotCount).toBe(stdParts.slots.length);
      expect(stdMetrics.widthMm).toBeCloseTo(stdParts.widthMm, 2);
      expect(stdMetrics.depthMm).toBeCloseTo(stdParts.depthMm, 2);
      expect(stdMetrics.heightMm).toBeCloseTo(stdParts.heightMm, 2);
      expect(stdMetrics.triangleCount).toBeGreaterThan(80);
      expect(stdMetrics.estimatedWeightG).toBeGreaterThan(5);
      expect(stdMetrics.estimatedPrintTimeHours).toBeGreaterThan(0.1);
      expect(stdMetrics.exceedsStandardBed).toBe(false);

      const bigParts = generateToolHolderParts(OVERSIZED_RACK_FIXTURE);
      createdParts.push(bigParts);
      const bigMetrics = calculateToolHolderMetrics(OVERSIZED_RACK_FIXTURE, bigParts);
      expect(bigMetrics.widthMm).toBeGreaterThan(220);
      expect(bigMetrics.exceedsStandardBed).toBe(true);
    });

    it('exports valid binary little-endian .STL without "solid " ASCII header prefix', () => {
      const parts = generateToolHolderParts(HEX_BITS_12_FIXTURE);
      createdParts.push(parts);
      const metrics = calculateToolHolderMetrics(HEX_BITS_12_FIXTURE, parts);
      const stlBuf = exportToBinaryStl(parts);

      expect(stlBuf.byteLength).toBe(84 + metrics.triangleCount * 50);
      const header = new TextDecoder().decode(new Uint8Array(stlBuf, 0, 6));
      expect(header.startsWith('solid ')).toBe(false);
      expect(new DataView(stlBuf).getUint32(80, true)).toBe(metrics.triangleCount);
    });

    it('exports dual-object .3MF when labels enabled, escapes XML metadata cleanly, and omits labels object when disabled', async () => {
      const partsLabeled = generateToolHolderParts(XML_SPECIAL_LABEL_FIXTURE);
      createdParts.push(partsLabeled);
      const blob3mf = await exportTo3mf(XML_SPECIAL_LABEL_FIXTURE, partsLabeled);
      expect(blob3mf.size).toBeGreaterThan(500);

      const zip = await JSZip.loadAsync(await blob3mf.arrayBuffer());
      const modelXml = await zip.file('3D/3dmodel.model')!.async('string');
      expect((modelXml.match(/<object /g) || []).length).toBe(2);
      expect(modelXml).toContain('Size Labels');
      expect(modelXml).toContain('Rack Body');
      expect(modelXml).not.toContain('A>B"2');

      const noLabelOpts = { ...ALLEN_KEYS_FIXTURE, includeEmbossedLabels: false };
      const noLabelParts = generateToolHolderParts(noLabelOpts);
      createdParts.push(noLabelParts);
      expect(noLabelParts.labelGeometry).toBeNull();

      const singleBlob = await exportTo3mf(noLabelOpts, noLabelParts);
      const singleZip = await JSZip.loadAsync(await singleBlob.arrayBuffer());
      const singleXml = await singleZip.file('3D/3dmodel.model')!.async('string');
      expect((singleXml.match(/<object /g) || []).length).toBe(1);
    });

    it('performs zero network or storage calls and outputs byte-identical STL/3MF across Math.random seeds', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.15);

      const partsA = generateToolHolderParts(ALLEN_KEYS_FIXTURE);
      createdParts.push(partsA);
      const stlA = new Uint8Array(exportToBinaryStl(partsA));
      const zipA = await JSZip.loadAsync(await (await exportTo3mf(ALLEN_KEYS_FIXTURE, partsA)).arrayBuffer());
      const xmlA = await zipA.file('3D/3dmodel.model')!.async('string');

      randSpy.mockReturnValue(0.85);
      const partsB = generateToolHolderParts(ALLEN_KEYS_FIXTURE);
      createdParts.push(partsB);
      const stlB = new Uint8Array(exportToBinaryStl(partsB));
      const zipB = await JSZip.loadAsync(await (await exportTo3mf(ALLEN_KEYS_FIXTURE, partsB)).arrayBuffer());
      const xmlB = await zipB.file('3D/3dmodel.model')!.async('string');

      expect(stlA).toEqual(stlB);
      expect(xmlA).toBe(xmlB);
      expect(buildToolHolderFileBase(ALLEN_KEYS_FIXTURE)).toBe('privknife-tool-rack-allen_keys-1row');
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(setItemSpy).not.toHaveBeenCalled();
    });
  });
});
