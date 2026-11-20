import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';
import { calculateFunnelScoopMetrics, exportTo3mf, exportToBinaryStl, computeFrustumMl, generateFunnelScoopParts, solveScoopFrustumDimensions, validateFunnelScoopOptions } from './engine';
import { cloggedFunnel, funnel, largeScoop, scoop } from './test-fixtures';

describe('funnel and scoop geometry', () => {
  it('solves exact volume at each aspect and across the volume range', () => {
    for (const aspect of ['shallow_wide', 'balanced', 'deep_narrow'] as const) {
      for (const volume of [5, scoop.targetVolumeMl, largeScoop.targetVolumeMl, 250]) {
        const { rBottom, rTop, innerHeight } = solveScoopFrustumDimensions(volume, aspect);
        expect(computeFrustumMl(rBottom, rTop, innerHeight)).toBeCloseTo(volume, 7);
      }
    }
  });

  it('rejects blocked bores and mouths too close to the spout', () => {
    expect(validateFunnelScoopOptions(cloggedFunnel).valid).toBe(false);
    expect(validateFunnelScoopOptions({ ...funnel, mouthDiameterMm: 35, spoutOuterDiameterMm: 32 }).valid).toBe(false);
  });

  it('grounds finite geometry and adds material with exterior ribs', () => {
    const plain = generateFunnelScoopParts({ ...funnel, includeHangingTab: false, ventRibCount: 0 });
    const ribbed = generateFunnelScoopParts({ ...funnel, includeHangingTab: false });
    try {
      const a = plain[0].geometry;
      const b = ribbed[0].geometry;
      b.computeBoundingBox();
      expect(b.boundingBox?.min.z).toBe(0);
      expect(b.attributes['position'].array.every(Number.isFinite)).toBe(true);
      expect(b.attributes['position'].count).toBeGreaterThan(a.attributes['position'].count);
      for (const geometry of [a, b]) {
        const edges = new Map<string, number>();
        const indices = geometry.index!;
        for (let i = 0; i < indices.count; i += 3) {
          for (let k = 0; k < 3; k++) {
            const v1 = indices.getX(i + k);
            const v2 = indices.getX(i + (k + 1) % 3);
            const edge = `${Math.min(v1, v2)}:${Math.max(v1, v2)}`;
            edges.set(edge, (edges.get(edge) ?? 0) + 1);
          }
        }
        expect([...edges.values()].every((degree) => degree === 2)).toBe(true);
      }
    } finally {
      [...plain, ...ribbed].forEach(({ geometry }) => geometry.dispose());
    }
  });
});


it('exports reproducible local geometry with a separate colored volume label', async () => {
  const network = vi.spyOn(globalThis, 'fetch');
  const storage = vi.spyOn(Storage.prototype, 'setItem');
  const parts = generateFunnelScoopParts(scoop);
  try {
    const metrics = calculateFunnelScoopMetrics(scoop, parts);
    expect(metrics.solvedVolumeMl).toBeCloseTo(30, 7);
    expect(parts.map(({ name }) => name)).toEqual(['Scoop Body', 'Volume Label']);
    const stl = exportToBinaryStl(parts);
    expect(stl.byteLength).toBe(84 + metrics.triangleCount * 50);
    const archive = await JSZip.loadAsync(await (await exportTo3mf(scoop, parts)).arrayBuffer());
    const model = await archive.file('3D/3dmodel.model')!.async('string');
    expect(model).toContain('name="Volume Label" pid="1" pindex="1"');
    expect(model).toContain('name="Scoop Body" pid="1" pindex="0"');
    expect(exportToBinaryStl(parts)).toEqual(stl);
    expect(network).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
  } finally {
    parts.forEach(({ geometry }) => geometry.dispose());
    network.mockRestore();
    storage.mockRestore();
  }
});
