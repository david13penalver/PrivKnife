import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';
import {
  buildHelixThreadGeometry, calculateContainerMetrics, generateContainerParts,
  exportTo3mf, exportToBinaryStl,
  getThreadDimensions, validateContainerOptions,
} from './engine';
import { oversizeSlit, pill, pod, splitPill, tube } from './test-fixtures';

describe('container geometry', () => {
  it('sets the female thread envelope to the male envelope plus radial clearance', () => {
    const dimensions = getThreadDimensions(tube);
    expect(dimensions.femaleMajorDiameterMm - dimensions.maleMajorDiameterMm).toBeCloseTo(2 * tube.threadClearanceMm, 10);
    expect(dimensions.neckWallRemainingMm).toBeGreaterThanOrEqual(1.4);
    for (const pitch of [2.5, 5]) {
      const geometry = buildHelixThreadGeometry(12, pitch);
      geometry.computeBoundingBox();
      expect(geometry.attributes['position'].array.every(Number.isFinite)).toBe(true);
      expect(geometry.attributes['normal'].array.every(Number.isFinite)).toBe(true);
      expect(geometry.boundingBox?.max.x).toBeCloseTo(12 + 0.35 * pitch, 3);
      geometry.dispose();
    }
  });

  it('limits desiccant slits and sizes the pod to the spool hub', () => {
    expect(validateContainerOptions(oversizeSlit).valid).toBe(false);
    expect(validateContainerOptions(pod).valid).toBe(true);
    expect(getThreadDimensions(pod).outerRadius * 2).toBeCloseTo(52.2);
  });

  it('builds distinct tube, pod and sliding-lid parts', () => {
    for (const options of [tube, pod, pill, splitPill]) {
      const parts = generateContainerParts(options);
      try {
        expect(parts.length).toBe(options.mode === 'pill_organizer' ? 3 : 2);
        for (const { geometry } of parts) {
          expect(geometry.attributes['position'].array.every(Number.isFinite)).toBe(true);
          geometry.computeBoundingBox();
          expect(geometry.boundingBox?.min.z).toBeGreaterThanOrEqual(-0.0001);
        }
        if (options.mode === 'pill_organizer') {
          expect(calculateContainerMetrics(options, parts).pocketCount).toBe(options.pillDoubleAmPm ? 14 : 7);
        }
      } finally {
        parts.forEach(({ geometry }) => geometry.dispose());
      }
    }
  });
});

it('exports the lid and labels as distinct local 3MF objects', async () => {
  const net = vi.spyOn(globalThis, 'fetch');
  const storage = vi.spyOn(Storage.prototype, 'setItem');
  const parts = generateContainerParts(pill);
  try {
    const metrics = calculateContainerMetrics(pill, parts);
    expect(metrics.internalVolumeMl).toBeGreaterThan(30);
    expect(exportToBinaryStl(parts).byteLength).toBe(84 + 50 * metrics.triangleCount);
    const archive = await JSZip.loadAsync(await (await exportTo3mf(pill, parts)).arrayBuffer());
    const model = await archive.file('3D/3dmodel.model')!.async('string');
    expect(model).toContain('name="Sliding Lid"');
    expect(model).toContain('name="Day Labels" pid="1" pindex="1"');
    expect(net).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
  } finally {
    net.mockRestore();
    storage.mockRestore();
    parts.forEach(({ geometry }) => geometry.dispose());
  }
});
