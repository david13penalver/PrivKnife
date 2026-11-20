import JSZip from 'jszip';
import { weldPositions } from '../shared/mesh';
import { describe, expect, it, vi } from 'vitest';
import { calculateJarRackMetrics, exportTo3mf, exportToBinaryStl, computeWellCoordinates, generateJarRackParts, validateJarRackOptions } from './engine';
import { honeycomb, stadium, thinWeb, track } from './test-fixtures';

describe('rack pocket geometry', () => {
  it('compresses hex row pitch and keeps all 12 pockets separated', () => {
    const { centers, pitchX, pitchY } = computeWellCoordinates(honeycomb);
    expect(centers).toHaveLength(12);
    expect(pitchY / pitchX).toBeCloseTo(Math.sqrt(3) / 2, 10);
    expect(centers[4].x - centers[0].x).toBeCloseTo(pitchX / 2, 10);
    for (let i = 0; i < centers.length; i++) {
      for (const other of centers.slice(i + 1)) {
        expect(Math.hypot(centers[i].x - other.x, centers[i].y - other.y)).toBeGreaterThanOrEqual(pitchX - 1e-8);
      }
    }
  });

  it('rejects thin webs, invalid diameters and oversized unsplit footprints', () => {
    expect(validateJarRackOptions(thinWeb).valid).toBe(false);
    expect(validateJarRackOptions({ ...stadium, bottleDiameterMm: 5 }).valid).toBe(false);
    const oversized = { ...stadium, columns: 10 };
    expect(validateJarRackOptions(oversized).valid).toBe(false);
    expect(validateJarRackOptions({ ...oversized, splitForBed: true }).valid).toBe(true);
  });

  it('creates finite grounded geometry for tiers, hex wells and open capsule tracks', () => {
    for (const options of [stadium, honeycomb, track]) {
      const parts = generateJarRackParts(options);
      expect(parts).toHaveLength(1);
      try {
        const { geometry } = parts[0];
        geometry.computeBoundingBox();
        expect(geometry.boundingBox!.min.z).toBeCloseTo(0, 6);
        expect(geometry.attributes['position'].array.every(Number.isFinite)).toBe(true);
        expectClosedMesh(geometry);
      } finally {
        parts.forEach(({ geometry }) => geometry.dispose());
      }
    }
  });
});

it('removes material under the tiers and adds a mating side connector', () => {
  const solid = generateJarRackParts({ ...stadium, hollowVaultUnderside: false });
  const vaulted = generateJarRackParts(stadium);
  const joined = generateJarRackParts({ ...stadium, includeSideDovetails: true });
  try {
    const a = calculateJarRackMetrics(stadium, solid);
    const b = calculateJarRackMetrics(stadium, vaulted);
    const c = calculateJarRackMetrics(stadium, joined);
    expect(b.estimatedWeightG).toBeLessThan(a.estimatedWeightG);
    expect(c.widthMm).toBeGreaterThan(b.widthMm + 4);
    expectClosedMesh(joined[0].geometry);
  } finally {
    [...solid, ...vaulted, ...joined].forEach(({ geometry }) => geometry.dispose());
  }
});

it('creates independently bed-sized modules and exports each in 3MF', async () => {
  const options = { ...honeycomb, columns: 10, splitForBed: true };
  const network = vi.spyOn(globalThis, 'fetch');
  const storage = vi.spyOn(Storage.prototype, 'setItem');
  const parts = generateJarRackParts(options);
  try {
    const metrics = calculateJarRackMetrics(options, parts);
    expect(metrics.totalCapacityCount).toBe(30);
    expect(metrics.multiplePlates).toBe(true);
    expect(metrics.exceedsStandardBed).toBe(false);
    expect(exportToBinaryStl(parts).byteLength).toBe(84 + metrics.triangleCount * 50);
    const zip = await JSZip.loadAsync(await (await exportTo3mf(options, parts)).arrayBuffer());
    const xml = await zip.file('3D/3dmodel.model')!.async('string');
    expect(xml.match(/name="Rack Module \d+"/g)).toHaveLength(parts.length);
    expect(network).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
  } finally {
    parts.forEach(({ geometry }) => geometry.dispose());
    network.mockRestore();
    storage.mockRestore();
  }
});

function expectClosedMesh(geometry: Parameters<typeof weldPositions>[0]): void {
  const welded = weldPositions(geometry);
  const edges = new Map<string, number>();
  const index = welded.index!;
  const positions = welded.attributes['position'];
  for (let i = 0; i < index.count; i += 3) {
    const triangle = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    if (new Set(triangle).size < 3) continue;
    for (let j = 0; j < 3; j++) {
      const a = triangle[j];
      const b = triangle[(j + 1) % 3];
      const key = `${Math.min(a, b)},${Math.max(a, b)}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  const invalid = [...edges].filter(([, n]) => n !== 2).map(([key, n]) =>
    [n, key.split(',').map(Number).map((i) => [positions.getX(i), positions.getY(i), positions.getZ(i)])]);
  expect(invalid).toEqual([]);
  welded.dispose();
}
