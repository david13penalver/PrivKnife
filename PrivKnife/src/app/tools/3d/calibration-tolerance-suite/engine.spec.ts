import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';
import {
  calculateCalibrationMetrics, computeFastenerFits, generateCalibrationParts,
  exportTo3mf, exportToBinaryStl, getGaugeStrokeWidth,
  parseClearanceList, validateCalibrationOptions,
} from './engine';
import { bridges, fitBlock, gauge, overhangs, sheet } from './test-fixtures';

describe('printer calibration geometry', () => {
  it('parses bounded radial clearances and rejects malformed or uncapturable settings', () => {
    expect(parseClearanceList(gauge.clearanceValuesText)).toEqual([0.1, 0.15, 0.2, 0.25, 0.3, 0.4]);
    expect(parseClearanceList('0,1; 0,15; 0,25')).toEqual([0.1, 0.15, 0.25]);
    for (const text of [' ', '0.1,,0.2', '0x20', '0.15,0.15', '0.5']) {
      expect(validateCalibrationOptions({ ...gauge, clearanceValuesText: text }).valid).toBe(false);
    }
    expect(validateCalibrationOptions({ ...sheet, layerHeightMm: 0.9 }).valid).toBe(false);
    expect(validateCalibrationOptions({ ...sheet, bedWidthMm: 120, bedDepthMm: 120, bedMarginMm: 25 }).valid).toBe(false);
  });

  it('preserves five DIN 934 M4 round and hex measurements', () => {
    const fits = computeFastenerFits('M4');
    expect(fits).toHaveLength(5);
    expect(fits[0]).toMatchObject({ boltDiameterMm: 3.9, nutAcrossFlatsMm: 6.9 });
    expect(fits[4]).toMatchObject({ boltDiameterMm: 4.35, nutAcrossFlatsMm: 7.35 });
  });

  it('keeps all layers of the first-layer sheet at exactly the selected Z height', () => {
    const parts = generateCalibrationParts(sheet);
    try {
      expect(parts).toHaveLength(10);
      const metrics = calculateCalibrationMetrics(sheet, parts);
      expect(metrics).toMatchObject({ testFeatureCount: 9, widthMm: 236, depthMm: 236, heightMm: 0.2, layerCount: 1 });
      for (const { geometry } of parts) {
        expect(geometry.boundingBox?.min.z).toBeCloseTo(0, 6);
        expect(geometry.boundingBox?.max.z).toBeCloseTo(0.2, 6);
      }
    } finally {
      parts.forEach(({ geometry }) => geometry.dispose());
    }
  });

  it('creates one independent pin per socket and five distinct bridge or overhang features', () => {
    for (const options of [gauge, fitBlock, bridges, overhangs]) {
      const parts = generateCalibrationParts(options);
      try {
        for (const { geometry } of parts) {
          expect(geometry.attributes['position'].array.every(Number.isFinite)).toBe(true);
        }
        expect(calculateCalibrationMetrics(options, parts).testFeatureCount).toBe(options === gauge ? 6 : 5);
        if (options === gauge) expect(parts.filter(({ name }) => name.startsWith('Clearance Pin'))).toHaveLength(6);
        if (options === bridges || options === overhangs) expect(parts.filter(({ material }) => material !== 1)).toHaveLength(5);
      } finally {
        parts.forEach(({ geometry }) => geometry.dispose());
      }
    }
  });
});

it('keeps scale labels and captive pins as independent printable 3MF objects', async () => {
  const network = vi.spyOn(globalThis, 'fetch');
  const storage = vi.spyOn(Storage.prototype, 'setItem');
  const parts = generateCalibrationParts(gauge);
  try {
    const metrics = calculateCalibrationMetrics(gauge, parts);
    expect(exportToBinaryStl(parts).byteLength).toBe(84 + metrics.triangleCount * 50);
    const file = await JSZip.loadAsync(await (await exportTo3mf(gauge, parts)).arrayBuffer());
    const model = await file.file('3D/3dmodel.model')!.async('string');
    expect(model).toContain('name="Clearance Gauge Base"');
    expect(model).toContain('name="Clearance Pin 0.10 mm"');
    expect(model).toContain('name="Scale Labels" pid="1" pindex="1"');
    expect(getGaugeStrokeWidth(0.2)).toBe(0.55);
    expect(getGaugeStrokeWidth(0.6)).toBeCloseTo(0.75);
    expect(getGaugeStrokeWidth(1)).toBe(1.25);
    expect(network).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
  } finally {
    network.mockRestore();
    storage.mockRestore();
    parts.forEach(({ geometry }) => geometry.dispose());
  }
});

it('supports both stress patterns together and a single full-bed sheet', () => {
  const both = { ...bridges, includeOverhangs: true };
  const full = { ...sheet, patchCount: 0 as const };
  for (const [options, count] of [[both, 10], [full, 1]] as const) {
    const parts = generateCalibrationParts(options);
    try {
      expect(calculateCalibrationMetrics(options, parts).testFeatureCount).toBe(count);
    } finally {
      parts.forEach(({ geometry }) => geometry.dispose());
    }
  }
});
