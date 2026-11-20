import { describe, expect, it, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import JSZip from 'jszip';
import {
  calculateMetrics,
  exportTo3mf,
  exportToBinaryStl,
  generateBatteryCaseParts,
  validateBatteryCaseOptions,
} from './engine';
import {
  AA_DISPENSER_FIXTURE,
  CLAMSHELL_CASE_FIXTURE,
  INVALID_STACK_FIXTURE,
  INVALID_ZERO_SLOTS_FIXTURE,
  MIXED_SLIDING_CASE_FIXTURE,
  OPEN_TRAY_MICROSD_FIXTURE,
  OVERSIZED_BED_FIXTURE,
  XML_SPECIAL_LABEL_FIXTURE,
} from './test-fixtures';
import {
  BATTERY_CELL_SPECS,
  BatteryCellPreset,
  BatteryCaseParts,
  DispenserMountStyle,
} from './types';

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

describe('Battery Dispenser & Memory Card Case Engine — Seam 1A (Validation & CSG Geometry)', () => {
  const createdParts: BatteryCaseParts[] = [];

  afterEach(() => {
    while (createdParts.length > 0) {
      createdParts.pop()?.dispose();
    }
    vi.restoreAllMocks();
  });

  describe('validateBatteryCaseOptions', () => {
    it('accepts valid dispenser and memory card fixtures', () => {
      expect(validateBatteryCaseOptions(AA_DISPENSER_FIXTURE)).toEqual({ valid: true });
      expect(validateBatteryCaseOptions(MIXED_SLIDING_CASE_FIXTURE)).toEqual({ valid: true });
      expect(validateBatteryCaseOptions(CLAMSHELL_CASE_FIXTURE)).toEqual({ valid: true });
      expect(validateBatteryCaseOptions(OPEN_TRAY_MICROSD_FIXTURE)).toEqual({ valid: true });
    });

    it('rejects null/undefined and out-of-range battery stack, angle, wall, or tolerance parameters', () => {
      expect(validateBatteryCaseOptions(null as unknown as typeof AA_DISPENSER_FIXTURE).valid).toBe(false);
      expect(validateBatteryCaseOptions(INVALID_STACK_FIXTURE).valid).toBe(false);
      expect(validateBatteryCaseOptions({ ...AA_DISPENSER_FIXTURE, stackCount: 25 }).valid).toBe(false);
      expect(validateBatteryCaseOptions({ ...AA_DISPENSER_FIXTURE, stackCount: 8.5 }).valid).toBe(false);
      expect(validateBatteryCaseOptions({ ...AA_DISPENSER_FIXTURE, rampAngleDeg: 11 }).valid).toBe(false);
      expect(validateBatteryCaseOptions({ ...AA_DISPENSER_FIXTURE, rampAngleDeg: 31 }).valid).toBe(false);
      expect(validateBatteryCaseOptions({ ...AA_DISPENSER_FIXTURE, wallThicknessMm: 1.3 }).valid).toBe(false);
      expect(validateBatteryCaseOptions({ ...AA_DISPENSER_FIXTURE, wallThicknessMm: 4.1 }).valid).toBe(false);
      expect(validateBatteryCaseOptions({ ...AA_DISPENSER_FIXTURE, fitToleranceMm: 0.14 }).valid).toBe(false);
      expect(validateBatteryCaseOptions({ ...AA_DISPENSER_FIXTURE, fitToleranceMm: 0.61 }).valid).toBe(false);
      expect(validateBatteryCaseOptions({ ...AA_DISPENSER_FIXTURE, fitToleranceMm: Number.NaN }).valid).toBe(false);
      expect(
        validateBatteryCaseOptions({ ...AA_DISPENSER_FIXTURE, labelText: 'TOO LONG LABEL TEXT 19+' }).valid
      ).toBe(false);
    });

    it('rejects memory card cases with zero total slots or out-of-bounds slot counts', () => {
      const zeroResult = validateBatteryCaseOptions(INVALID_ZERO_SLOTS_FIXTURE);
      expect(zeroResult.valid).toBe(false);
      expect(zeroResult.error).toBeTruthy();

      expect(validateBatteryCaseOptions({ ...MIXED_SLIDING_CASE_FIXTURE, sdSlots: -1 }).valid).toBe(false);
      expect(validateBatteryCaseOptions({ ...MIXED_SLIDING_CASE_FIXTURE, sdSlots: 17 }).valid).toBe(false);
      expect(validateBatteryCaseOptions({ ...MIXED_SLIDING_CASE_FIXTURE, microSdSlots: 25 }).valid).toBe(false);
      expect(validateBatteryCaseOptions({ ...MIXED_SLIDING_CASE_FIXTURE, cfExpressSlots: 9 }).valid).toBe(false);
      expect(validateBatteryCaseOptions({ ...MIXED_SLIDING_CASE_FIXTURE, switchCartSlots: 13 }).valid).toBe(false);
      expect(validateBatteryCaseOptions({ ...MIXED_SLIDING_CASE_FIXTURE, usbASlots: 9 }).valid).toBe(false);
      expect(validateBatteryCaseOptions({ ...MIXED_SLIDING_CASE_FIXTURE, usbCSlots: 2.5 }).valid).toBe(false);
    });
  });

  describe('generateBatteryCaseParts — Gravity Battery Dispenser', () => {
    it('builds manifold AA dispenser matching exact caliper chute clearance (>= 51.3 mm) and seated Z >= 0', () => {
      const parts = generateBatteryCaseParts(AA_DISPENSER_FIXTURE);
      createdParts.push(parts);

      assertFiniteGeometry(parts.bodyGeometry, 24);
      expect(parts.lidGeometry).toBeNull();
      assertFiniteGeometry(parts.labelGeometry, 6);

      // 50.5mm AA length + 2 * 0.4mm fit tolerance = 51.3mm minimum inner chute span
      expect(parts.layoutMeta.innerChuteWidthMm).toBeGreaterThanOrEqual(51.3);
      expect(parts.layoutMeta.chuteChannelDepthMm).toBeGreaterThanOrEqual(14.5 + 0.9);
      expect(parts.bodyGeometry.boundingBox!.min.z).toBeGreaterThanOrEqual(-0.01);
    });

    it('generates finite manifold body geometry for all 7 cell presets and scales width from AAA to 21700', () => {
      const presets: BatteryCellPreset[] = ['aaa', 'aa', 'c', 'cr2032', '9v', '18650', '21700'];
      const widths: Record<string, number> = {};

      for (const preset of presets) {
        const spec = BATTERY_CELL_SPECS[preset];
        const parts = generateBatteryCaseParts({
          ...AA_DISPENSER_FIXTURE,
          cellPreset: preset,
          stackCount: 6,
          labelText: preset.toUpperCase(),
        });
        createdParts.push(parts);

        assertFiniteGeometry(parts.bodyGeometry, 12);
        const box = parts.bodyGeometry.boundingBox!;
        widths[preset] = box.max.x - box.min.x;
        expect(parts.layoutMeta.innerChuteWidthMm).toBeGreaterThanOrEqual(
          spec.chuteSpanMm + 2 * Math.max(AA_DISPENSER_FIXTURE.fitToleranceMm, 0.35) - 1e-6
        );
      }

      expect(widths['21700']).toBeGreaterThan(widths['18650']);
      expect(widths['18650']).toBeGreaterThan(widths['aa']);
      expect(widths['aa']).toBeGreaterThan(widths['aaa']);
    });

    it('supports all 4 mount styles (desk, wall_keyhole, skadis, magnetic) and increases height with stackCount', () => {
      const mounts: DispenserMountStyle[] = ['desk', 'wall_keyhole', 'skadis', 'magnetic'];
      for (const mountStyle of mounts) {
        const parts = generateBatteryCaseParts({
          ...AA_DISPENSER_FIXTURE,
          mountStyle,
          stackCount: 8,
        });
        createdParts.push(parts);
        assertFiniteGeometry(parts.bodyGeometry, 12);
      }

      const shortStack = generateBatteryCaseParts({ ...AA_DISPENSER_FIXTURE, stackCount: 4 });
      const tallStack = generateBatteryCaseParts({ ...AA_DISPENSER_FIXTURE, stackCount: 16 });
      createdParts.push(shortStack, tallStack);

      const shortH = shortStack.bodyGeometry.boundingBox!.max.z - shortStack.bodyGeometry.boundingBox!.min.z;
      const tallH = tallStack.bodyGeometry.boundingBox!.max.z - tallStack.bodyGeometry.boundingBox!.min.z;
      expect(tallH).toBeGreaterThan(shortH + 100);
    });

    it('omits labelGeometry cleanly when includeEmbossedLabel is false or labelText is blank', () => {
      const noLabel = generateBatteryCaseParts({
        ...AA_DISPENSER_FIXTURE,
        includeEmbossedLabel: false,
      });
      const blankLabel = generateBatteryCaseParts({
        ...AA_DISPENSER_FIXTURE,
        includeEmbossedLabel: true,
        labelText: '   ',
      });
      createdParts.push(noLabel, blankLabel);

      expect(noLabel.labelGeometry).toBeNull();
      expect(blankLabel.labelGeometry).toBeNull();
    });
  });

  describe('generateBatteryCaseParts — Rugged Memory Card & EDC Case', () => {
    it('builds sliding_dovetail mixed case with flat bed-separated body, lid, and embossed label', () => {
      const parts = generateBatteryCaseParts(MIXED_SLIDING_CASE_FIXTURE);
      createdParts.push(parts);

      assertFiniteGeometry(parts.bodyGeometry, 20);
      assertFiniteGeometry(parts.lidGeometry, 12);
      assertFiniteGeometry(parts.labelGeometry, 6);

      expect(parts.layoutMeta.totalSlots).toBe(14);
      const bodyBox = parts.bodyGeometry.boundingBox!;
      const lidBox = parts.lidGeometry!.boundingBox!;

      expect(bodyBox.min.z).toBeGreaterThanOrEqual(-0.01);
      expect(lidBox.min.z).toBeGreaterThanOrEqual(-0.01);
      // Lid positioned beside body on build plate without collision
      expect(lidBox.min.x).toBeGreaterThan(bodyBox.max.x + 2);
    });

    it('builds snap_clamshell case with non-null hinged lid', () => {
      const parts = generateBatteryCaseParts(CLAMSHELL_CASE_FIXTURE);
      createdParts.push(parts);

      assertFiniteGeometry(parts.bodyGeometry, 20);
      assertFiniteGeometry(parts.lidGeometry, 12);
      expect(parts.layoutMeta.totalSlots).toBe(14);
    });

    it('builds open_tray MicroSD x24 rack without lid and enforces >= 1.2mm minimum divider wall', () => {
      const parts = generateBatteryCaseParts(OPEN_TRAY_MICROSD_FIXTURE);
      createdParts.push(parts);

      assertFiniteGeometry(parts.bodyGeometry, 20);
      expect(parts.lidGeometry).toBeNull();
      expect(parts.labelGeometry).toBeNull();
      expect(parts.layoutMeta.totalSlots).toBe(24);
      expect(parts.layoutMeta.minDividerWallMm).toBeGreaterThanOrEqual(1.2);
    });

    it('throws a validation error when called directly with invalid zero-slot options', () => {
      expect(() => generateBatteryCaseParts(INVALID_ZERO_SLOTS_FIXTURE)).toThrow(/slot/i);
    });
  });

  describe('Seam 1B — Single-Pass Metrics, Binary .STL & Multi-Object .3MF Exports', () => {
    it('computes accurate single-pass metrics without exceeding bounds and flags >220mm oversized assemblies', () => {
      const aaParts = generateBatteryCaseParts(AA_DISPENSER_FIXTURE);
      createdParts.push(aaParts);
      const metrics = calculateMetrics(AA_DISPENSER_FIXTURE, aaParts);

      expect(metrics.widthMm).toBeGreaterThan(50);
      expect(metrics.depthMm).toBeGreaterThan(25);
      expect(metrics.heightMm).toBeGreaterThan(150);
      expect(metrics.triangleCount).toBeGreaterThan(20);
      expect(metrics.estimatedVolumeCm3).toBeGreaterThan(4);
      expect(metrics.estimatedWeightG).toBeCloseTo(metrics.estimatedVolumeCm3 * 1.24, 1);
      expect(metrics.estimatedPrintTimeHours).toBeGreaterThan(0.2);
      expect(metrics.exceedsStandardBed).toBe(false);

      const bigParts = generateBatteryCaseParts(OVERSIZED_BED_FIXTURE);
      createdParts.push(bigParts);
      const bigMetrics = calculateMetrics(OVERSIZED_BED_FIXTURE, bigParts);
      expect(bigMetrics.exceedsStandardBed).toBe(true);
    });

    it('exports valid binary STL matching exact byte size 84 + triangleCount * 50 without ASCII solid header', () => {
      const parts = generateBatteryCaseParts(MIXED_SLIDING_CASE_FIXTURE);
      createdParts.push(parts);
      const metrics = calculateMetrics(MIXED_SLIDING_CASE_FIXTURE, parts);

      const stlBuffer = exportToBinaryStl(parts);
      expect(stlBuffer.byteLength).toBe(84 + metrics.triangleCount * 50);

      const headerAscii = new TextDecoder('ascii').decode(new Uint8Array(stlBuffer, 0, 80));
      expect(headerAscii.toLowerCase().startsWith('solid ')).toBe(false);

      const view = new DataView(stlBuffer);
      const triCount = view.getUint32(80, true);
      expect(triCount).toBe(metrics.triangleCount);

      // Every coordinate & normal float in every facet must be finite
      for (let off = 84; off < stlBuffer.byteLength; off += 50) {
        for (let f = 0; f < 12; f++) {
          expect(Number.isFinite(view.getFloat32(off + f * 4, true))).toBe(true);
        }
      }
    });

    it('exports valid multi-object 3MF zip XML with distinct Body, Lid, and Label objects and escapes XML characters', async () => {
      const parts = generateBatteryCaseParts(XML_SPECIAL_LABEL_FIXTURE);
      createdParts.push(parts);

      const blob = await exportTo3mf(XML_SPECIAL_LABEL_FIXTURE, parts);
      expect(blob.type).toBe('model/3mf');
      expect(blob.size).toBeGreaterThan(500);

      const zip = await JSZip.loadAsync(await blob.arrayBuffer());
      expect(zip.file('[Content_Types].xml')).not.toBeNull();
      expect(zip.file('_rels/.rels')).not.toBeNull();

      const modelFile = zip.file('3D/3dmodel.model');
      expect(modelFile).not.toBeNull();
      const modelXml = await modelFile!.async('string');

      const objectMatches = modelXml.match(/<object\s+id="/g) || [];
      const itemMatches = modelXml.match(/<item\s+objectid="/g) || [];
      expect(objectMatches.length).toBeGreaterThanOrEqual(3);
      expect(itemMatches.length).toBeGreaterThanOrEqual(3);
      expect(modelXml).toContain('<basematerials');
      expect(modelXml).toContain('A&amp;B &lt;1&gt;');
      expect(modelXml).not.toContain('A&B <1>');
    });

    it('executes zero fetch/Storage.setItem calls and produces byte-identical exports regardless of Math.random', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.111);
      const partsA = generateBatteryCaseParts(MIXED_SLIDING_CASE_FIXTURE);
      createdParts.push(partsA);
      const stlA = new Uint8Array(exportToBinaryStl(partsA));
      const zipA = await JSZip.loadAsync(await (await exportTo3mf(MIXED_SLIDING_CASE_FIXTURE, partsA)).arrayBuffer());
      const xmlA = await zipA.file('3D/3dmodel.model')!.async('string');

      randSpy.mockReturnValue(0.888);
      const partsB = generateBatteryCaseParts(MIXED_SLIDING_CASE_FIXTURE);
      createdParts.push(partsB);
      const stlB = new Uint8Array(exportToBinaryStl(partsB));
      const zipB = await JSZip.loadAsync(await (await exportTo3mf(MIXED_SLIDING_CASE_FIXTURE, partsB)).arrayBuffer());
      const xmlB = await zipB.file('3D/3dmodel.model')!.async('string');

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(setItemSpy).not.toHaveBeenCalled();
      expect(stlA).toEqual(stlB);
      expect(xmlA).toBe(xmlB);
    });
  });
});
