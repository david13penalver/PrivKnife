import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleHardwareWorkerMessage } from './worker';
import {
  ARRAY_9_PLATE_FIXTURE,
  INVALID_THIN_WALL_FIXTURE,
  M6_WASHER_FIXTURE,
} from './test-fixtures';
import { HardwareWorkerResponse } from './types';

describe('Washer, Spacer, Standoff, Shim & Bushing Worker — Seam 2', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('streams progress updates and returns transferable binary .STL ArrayBuffer with metrics', async () => {
    const messages: HardwareWorkerResponse[] = [];
    const transfers: Transferable[] = [];

    await handleHardwareWorkerMessage(
      { id: 1, type: 'export-stl', options: M6_WASHER_FIXTURE },
      (msg, transfer) => {
        messages.push(msg);
        if (transfer) transfers.push(...transfer);
      }
    );

    const progress = messages.filter((m) => m.type === 'progress');
    const results = messages.filter((m) => m.type === 'result');
    expect(progress.length).toBeGreaterThanOrEqual(2);
    expect(results).toHaveLength(1);

    const res = results[0];
    expect(res.mimeType).toBe('model/stl');
    expect(res.fileName).toMatch(/^privknife-washer_spacer.*\.stl$/);
    expect(res.buffer).toBeInstanceOf(ArrayBuffer);
    expect(transfers).toContain(res.buffer!);
    expect(res.buffer!.byteLength).toBe(84 + res.metrics!.triangleCount * 50);
  });

  it('exports transferable multi-object .3MF ArrayBuffer with PK header', async () => {
    const messages: HardwareWorkerResponse[] = [];
    const transfers: Transferable[] = [];

    await handleHardwareWorkerMessage(
      { id: 2, type: 'export-3mf', options: ARRAY_9_PLATE_FIXTURE },
      (msg, transfer) => {
        messages.push(msg);
        if (transfer) transfers.push(...transfer);
      }
    );

    const res = messages.find((m) => m.type === 'result')!;
    expect(res.mimeType).toBe('model/3mf');
    expect(res.fileName).toMatch(/\.3mf$/);
    expect(transfers).toContain(res.buffer!);
    const bytes = new Uint8Array(res.buffer!);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it('returns structured errors on thin radial wall violation or unsupported worker action', async () => {
    const errors: HardwareWorkerResponse[] = [];

    await handleHardwareWorkerMessage(
      { id: 3, type: 'export-stl', options: INVALID_THIN_WALL_FIXTURE },
      (m) => {
        if (m.type === 'error') errors.push(m);
      }
    );
    await handleHardwareWorkerMessage(
      { id: 4, type: 'invalid-cmd' as any, options: M6_WASHER_FIXTURE },
      (m) => {
        if (m.type === 'error') errors.push(m);
      }
    );

    expect(errors).toHaveLength(2);
    expect(errors[0].error).toMatch(/wall/i);
    expect(errors[1].error).toBeTruthy();
  });

  it('performs zero network or storage calls and emits deterministic STL bytes across random seeds', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.15);

    const msgsA: HardwareWorkerResponse[] = [];
    await handleHardwareWorkerMessage(
      { id: 5, type: 'export-stl', options: M6_WASHER_FIXTURE },
      (m) => msgsA.push(m)
    );

    randSpy.mockReturnValue(0.85);
    const msgsB: HardwareWorkerResponse[] = [];
    await handleHardwareWorkerMessage(
      { id: 6, type: 'export-stl', options: M6_WASHER_FIXTURE },
      (m) => msgsB.push(m)
    );

    const bufA = new Uint8Array(msgsA.find((m) => m.type === 'result')!.buffer!);
    const bufB = new Uint8Array(msgsB.find((m) => m.type === 'result')!.buffer!);
    expect(bufA).toEqual(bufB);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});
