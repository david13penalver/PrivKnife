import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import JSZip from 'jszip';
import {
  calculateRuggedBoxMetrics,
  exportTo3mf,
  exportToBinaryStl,
  generateRuggedBoxParts,
  validateRuggedBoxOptions,
} from './engine';
import {
  FILAMENT_PIN_HINGE_FIXTURE,
  INVALID_SMALL_LENGTH_FIXTURE,
  INVALID_THIN_WALL_FIXTURE,
  M3_SCREW_HINGE_FIXTURE,
  OVERSIZED_BOX_FIXTURE,
  STANDARD_BOX_FIXTURE,
  WIDE_TWO_LATCH_GASKET_FIXTURE,
  XML_SPECIAL_BOX_LABEL_FIXTURE,
} from './test-fixtures';
import { RuggedBoxParts } from './types';

function triangleCountOf(geom: THREE.BufferGeometry): number {
  const idx = geom.getIndex();
  if (idx) return Math.floor(idx.count / 3);
  const pos = geom.getAttribute('position');
  return pos ? Math.floor(pos.count / 3) : 0;
}

function assertFiniteGeometry(geom: THREE.BufferGeometry | null, minTris = 8): THREE.Box3 {
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

describe('Rugged Hinged Box Engine — Seam 1A (Validation, Shell/Ribs, Hinges & Latches)', () => {
  const created: RuggedBoxParts[] = [];

  afterEach(() => {
    while (created.length > 0) {
      created.pop()?.dispose();
    }
    vi.restoreAllMocks();
  });

  describe('validateRuggedBoxOptions', () => {
    it('accepts valid standard and wide gasket box fixtures', () => {
      expect(validateRuggedBoxOptions(STANDARD_BOX_FIXTURE)).toEqual({ valid: true });
      expect(validateRuggedBoxOptions(WIDE_TWO_LATCH_GASKET_FIXTURE)).toEqual({ valid: true });
      expect(validateRuggedBoxOptions(M3_SCREW_HINGE_FIXTURE)).toEqual({ valid: true });
      expect(validateRuggedBoxOptions(FILAMENT_PIN_HINGE_FIXTURE)).toEqual({ valid: true });
    });

    it('rejects null/undefined and out-of-range dimensions, wall, corner radius, ribs, clearance, dividers & label length', () => {
      expect(validateRuggedBoxOptions(null as unknown as typeof STANDARD_BOX_FIXTURE).valid).toBe(false);
      expect(validateRuggedBoxOptions(INVALID_SMALL_LENGTH_FIXTURE).valid).toBe(false);
      expect(validateRuggedBoxOptions(INVALID_THIN_WALL_FIXTURE).valid).toBe(false);
      expect(validateRuggedBoxOptions({ ...STANDARD_BOX_FIXTURE, innerLengthMm: 245 }).valid).toBe(false);
      expect(validateRuggedBoxOptions({ ...STANDARD_BOX_FIXTURE, innerWidthMm: 45 }).valid).toBe(false);
      expect(validateRuggedBoxOptions({ ...STANDARD_BOX_FIXTURE, innerWidthMm: 205 }).valid).toBe(false);
      expect(validateRuggedBoxOptions({ ...STANDARD_BOX_FIXTURE, baseDepthMm: 16 }).valid).toBe(false);
      expect(validateRuggedBoxOptions({ ...STANDARD_BOX_FIXTURE, baseDepthMm: 115 }).valid).toBe(false);
      expect(validateRuggedBoxOptions({ ...STANDARD_BOX_FIXTURE, lidDepthMm: 9 }).valid).toBe(false);
      expect(validateRuggedBoxOptions({ ...STANDARD_BOX_FIXTURE, lidDepthMm: 62 }).valid).toBe(false);
      expect(validateRuggedBoxOptions({ ...STANDARD_BOX_FIXTURE, wallThicknessMm: 5.2 }).valid).toBe(false);
      expect(validateRuggedBoxOptions({ ...STANDARD_BOX_FIXTURE, cornerRadiusMm: 2.0 }).valid).toBe(false);
      expect(validateRuggedBoxOptions({ ...STANDARD_BOX_FIXTURE, cornerRadiusMm: 15.0 }).valid).toBe(false);
      expect(validateRuggedBoxOptions({ ...STANDARD_BOX_FIXTURE, ribCountPerSide: -1 }).valid).toBe(false);
      expect(validateRuggedBoxOptions({ ...STANDARD_BOX_FIXTURE, ribCountPerSide: 7 }).valid).toBe(false);
      expect(validateRuggedBoxOptions({ ...STANDARD_BOX_FIXTURE, hingeClearanceMm: 0.2 }).valid).toBe(false);
      expect(validateRuggedBoxOptions({ ...STANDARD_BOX_FIXTURE, hingeClearanceMm: 0.55 }).valid).toBe(false);
      expect(validateRuggedBoxOptions({ ...STANDARD_BOX_FIXTURE, dividerCols: 0 }).valid).toBe(false);
      expect(validateRuggedBoxOptions({ ...STANDARD_BOX_FIXTURE, dividerCols: 9 }).valid).toBe(false);
      expect(validateRuggedBoxOptions({ ...STANDARD_BOX_FIXTURE, dividerRows: 7 }).valid).toBe(false);
      expect(
        validateRuggedBoxOptions({ ...STANDARD_BOX_FIXTURE, frontLabelText: 'LONGER THAN TWENTY CHARS!' }).valid
      ).toBe(false);
    });
  });

  describe('generateRuggedBoxParts', () => {
    it('builds exact outer envelope around inner 120x80x35 cavity and seats base, lid, and latches flat at Z >= 0', () => {
      const parts = generateRuggedBoxParts(STANDARD_BOX_FIXTURE);
      created.push(parts);

      expect(parts.layoutMeta.outerWidthMm).toBe(126);
      expect(parts.layoutMeta.outerDepthMm).toBe(86);
      expect(parts.layoutMeta.innerCavityVolumeCm3).toBe(336);
      expect(parts.layoutMeta.latchCount).toBe(1);

      const baseBb = assertFiniteGeometry(parts.baseGeometry, 24);
      const lidBb = assertFiniteGeometry(parts.lidGeometry, 24);
      const latchBb = assertFiniteGeometry(parts.latchesGeometry, 12);

      expect(baseBb.min.z).toBeGreaterThanOrEqual(-0.01);
      expect(lidBb.min.z).toBeGreaterThanOrEqual(-0.01);
      expect(latchBb.min.z).toBeGreaterThanOrEqual(-0.01);
      // Flat plate latches sit cleanly to the right of base without XY collision
      expect(latchBb.min.x).toBeGreaterThan(baseBb.max.x + 2);
      // Standard fixture disables dividers & gasket channel
      expect(parts.dividersGeometry).toBeNull();
      expect(parts.gasketGeometry).toBeNull();
    });

    it('offsets hinge axis cleanly behind rear exterior ribs and cuts through-bores for M3 and filament pin hinges', () => {
      for (const fixture of [STANDARD_BOX_FIXTURE, M3_SCREW_HINGE_FIXTURE, FILAMENT_PIN_HINGE_FIXTURE]) {
        const parts = generateRuggedBoxParts(fixture);
        created.push(parts);

        expect(parts.layoutMeta.hingeCenterYMm).toBeLessThan(-parts.layoutMeta.outerDepthMm / 2);
        const baseBb = assertFiniteGeometry(parts.baseGeometry, 24);
        const lidBb = assertFiniteGeometry(parts.lidGeometry, 24);

        expect(baseBb.min.y).toBeLessThan(-parts.layoutMeta.outerDepthMm / 2);
        // Coaxial Lid knuckles clear Base rear shell by hingeClearanceMm without collision
        expect(lidBb.max.y).toBeLessThan(-parts.layoutMeta.outerDepthMm / 2);
        expect(lidBb.min.y).toBeLessThan(parts.layoutMeta.hingeCenterYMm - 20);
      }
    });

    it('scales latch count from 1 (< 125mm) to 2 (>= 125mm) and supports both latch styles', () => {
      const single = generateRuggedBoxParts({ ...STANDARD_BOX_FIXTURE, innerLengthMm: 120 });
      const twin = generateRuggedBoxParts({ ...STANDARD_BOX_FIXTURE, innerLengthMm: 130 });
      const slide = generateRuggedBoxParts({ ...STANDARD_BOX_FIXTURE, innerLengthMm: 130, latchType: 'friction_slide' });
      created.push(single, twin, slide);

      expect(single.layoutMeta.latchCount).toBe(1);
      expect(twin.layoutMeta.latchCount).toBe(2);
      expect(triangleCountOf(twin.latchesGeometry)).toBeGreaterThan(triangleCountOf(single.latchesGeometry));
      assertFiniteGeometry(slide.latchesGeometry, 12);
    });

    it('adds exterior reinforcement ribs and builds molded vs removable divider matrices & TPU gasket', () => {
      const noRibs = generateRuggedBoxParts({ ...STANDARD_BOX_FIXTURE, ribCountPerSide: 0 });
      const ribbed = generateRuggedBoxParts({ ...STANDARD_BOX_FIXTURE, ribCountPerSide: 4 });
      const molded = generateRuggedBoxParts({
        ...STANDARD_BOX_FIXTURE,
        dividerMode: 'molded_fixed',
        dividerCols: 4,
        dividerRows: 3,
      });
      const fullTrayGasket = generateRuggedBoxParts(WIDE_TWO_LATCH_GASKET_FIXTURE);
      created.push(noRibs, ribbed, molded, fullTrayGasket);

      expect(triangleCountOf(ribbed.baseGeometry)).toBeGreaterThan(triangleCountOf(noRibs.baseGeometry));
      expect(molded.dividersGeometry).toBeNull();
      expect(triangleCountOf(molded.baseGeometry)).toBeGreaterThan(triangleCountOf(ribbed.baseGeometry));

      const baseBb = fullTrayGasket.baseGeometry.boundingBox!;
      const divBb = assertFiniteGeometry(fullTrayGasket.dividersGeometry, 12);
      const gasketBb = assertFiniteGeometry(fullTrayGasket.gasketGeometry, 16);
      assertFiniteGeometry(fullTrayGasket.labelGeometry, 6);

      expect(divBb.min.z).toBeGreaterThanOrEqual(-0.01);
      expect(divBb.max.x).toBeLessThan(baseBb.min.x - 2);
      expect(gasketBb.min.z).toBeGreaterThanOrEqual(-0.01);
    });
  });

  describe('Seam 1B — Single-Pass Metrics, Multi-Material .3MF & Binary .STL', () => {
    it('computes accurate metrics in single pass and flags oversized assemblies exceeding 220mm print bed', () => {
      const stdParts = generateRuggedBoxParts(STANDARD_BOX_FIXTURE);
      created.push(stdParts);
      const metrics = calculateRuggedBoxMetrics(STANDARD_BOX_FIXTURE, stdParts);

      expect(metrics.outerWidthMm).toBe(126);
      expect(metrics.outerDepthMm).toBe(86);
      expect(metrics.closedHeightMm).toBeCloseTo(35 + 18 + 2.55 * 2, 1);
      expect(metrics.flatPlateWidthMm).toBeGreaterThan(metrics.outerWidthMm);
      expect(metrics.flatPlateDepthMm).toBeGreaterThan(metrics.outerDepthMm * 2);
      expect(metrics.triangleCount).toBeGreaterThan(50);
      expect(metrics.estimatedWeightG).toBeCloseTo(metrics.estimatedVolumeCm3 * 1.24, 1);
      expect(metrics.estimatedPrintTimeHours).toBeGreaterThan(0.4);
      expect(metrics.exceedsStandardBed).toBe(false);

      const bigParts = generateRuggedBoxParts(OVERSIZED_BOX_FIXTURE);
      created.push(bigParts);
      const bigMetrics = calculateRuggedBoxMetrics(OVERSIZED_BOX_FIXTURE, bigParts);
      expect(bigMetrics.exceedsStandardBed).toBe(true);
    });

    it('exports valid binary STL matching exact byte size 84 + triangleCount * 50 with finite normals & vertices', () => {
      const parts = generateRuggedBoxParts(WIDE_TWO_LATCH_GASKET_FIXTURE);
      created.push(parts);
      const metrics = calculateRuggedBoxMetrics(WIDE_TWO_LATCH_GASKET_FIXTURE, parts);

      const buffer = exportToBinaryStl(parts);
      expect(buffer.byteLength).toBe(84 + metrics.triangleCount * 50);

      const header = new TextDecoder('ascii').decode(new Uint8Array(buffer, 0, 80));
      expect(header.toLowerCase().startsWith('solid ')).toBe(false);

      const view = new DataView(buffer);
      expect(view.getUint32(80, true)).toBe(metrics.triangleCount);

      for (let off = 84; off < buffer.byteLength; off += 50) {
        for (let f = 0; f < 12; f++) {
          expect(Number.isFinite(view.getFloat32(off + f * 4, true))).toBe(true);
        }
      }
    });

    it('exports multi-material .3MF separating Base, Lid, Latches, Dividers, TPU Gasket & Label and escapes XML entities', async () => {
      const parts = generateRuggedBoxParts(XML_SPECIAL_BOX_LABEL_FIXTURE);
      created.push(parts);

      const blob = await exportTo3mf(XML_SPECIAL_BOX_LABEL_FIXTURE, parts);
      expect(blob.type).toBe('model/3mf');

      const zip = await JSZip.loadAsync(await blob.arrayBuffer());
      expect(zip.file('[Content_Types].xml')).not.toBeNull();
      expect(zip.file('_rels/.rels')).not.toBeNull();

      const modelXml = await zip.file('3D/3dmodel.model')!.async('string');
      const objects = modelXml.match(/<object\s+id="/g) || [];
      const items = modelXml.match(/<item\s+objectid="/g) || [];

      // Base + Lid + Latches + Removable Dividers + TPU Gasket + Nameplate Label = 6 objects
      expect(objects.length).toBeGreaterThanOrEqual(5);
      expect(items.length).toBe(objects.length);
      expect(modelXml).toContain('<basematerials');
      expect(modelXml).toContain('TPU Gasket Seal');
      expect(modelXml).toContain('M3 &amp; M4 &lt;KIT&gt;');
      expect(modelXml).not.toContain('M3 & M4 <KIT>');
    });

    it('performs zero fetch/Storage.setItem calls and produces deterministic byte-identical exports', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.15);

      const partsA = generateRuggedBoxParts(STANDARD_BOX_FIXTURE);
      created.push(partsA);
      const stlA = new Uint8Array(exportToBinaryStl(partsA));
      const xmlA = await (
        await JSZip.loadAsync(await (await exportTo3mf(STANDARD_BOX_FIXTURE, partsA)).arrayBuffer())
      )
        .file('3D/3dmodel.model')!
        .async('string');

      randSpy.mockReturnValue(0.85);
      const partsB = generateRuggedBoxParts(STANDARD_BOX_FIXTURE);
      created.push(partsB);
      const stlB = new Uint8Array(exportToBinaryStl(partsB));
      const xmlB = await (
        await JSZip.loadAsync(await (await exportTo3mf(STANDARD_BOX_FIXTURE, partsB)).arrayBuffer())
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
