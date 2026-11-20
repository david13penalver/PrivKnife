import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleRuggedBoxWorkerMessage } from './worker';
import {
  INVALID_SMALL_LENGTH_FIXTURE,
  STANDARD_BOX_FIXTURE,
  WIDE_TWO_LATCH_GASKET_FIXTURE,
} from './test-fixtures';
import { RuggedBoxWorkerResponse } from './types';

describe('Rugged Hinged Box Worker (Spec 124 — Seam 2)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('streams progress events and returns transferable binary .STL ArrayBuffer with metrics', async () => {
    const messages: RuggedBoxWorkerResponse[] = [];
    const transfers: Transferable[] = [];

    await handleRuggedBoxWorkerMessage(
      { id: 1, type: 'export-stl', options: STANDARD_BOX_FIXTURE },
      (msg, transferList) => {
        messages.push(msg);
        if (transferList) transfers.push(...transferList);
      }
    );

    const progress = messages.filter((m) => m.type === 'progress');
    const results = messages.filter((m) => m.type === 'result');

    expect(progress.length).toBeGreaterThanOrEqual(2);
    expect(results).toHaveLength(1);
    const res = results[0];

    expect(res.mimeType).toBe('model/stl');
    expect(res.fileName).toMatch(/\.stl$/);
    expect(res.buffer).toBeInstanceOf(ArrayBuffer);
    expect(transfers).toContain(res.buffer!);
    expect(res.buffer!.byteLength).toBe(84 + res.metrics!.triangleCount * 50);
  });

  it('streams progress events and emits valid ZIP-signature multi-material .3MF buffer', async () => {
    const messages: RuggedBoxWorkerResponse[] = [];

    await handleRuggedBoxWorkerMessage(
      { id: 2, type: 'export-3mf', options: WIDE_TWO_LATCH_GASKET_FIXTURE },
      (msg) => messages.push(msg)
    );

    const results = messages.filter((m) => m.type === 'result');
    expect(results).toHaveLength(1);
    const res = results[0];

    expect(res.mimeType).toBe('model/3mf');
    expect(res.fileName).toMatch(/\.3mf$/);
    const bytes = new Uint8Array(res.buffer!);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it('emits structured error payload on out-of-range dimensions or unknown request types', async () => {
    const messages: RuggedBoxWorkerResponse[] = [];

    await handleRuggedBoxWorkerMessage(
      { id: 3, type: 'export-stl', options: INVALID_SMALL_LENGTH_FIXTURE },
      (msg) => messages.push(msg)
    );
    await handleRuggedBoxWorkerMessage(
      { id: 4, type: 'unknown' as any, options: STANDARD_BOX_FIXTURE },
      (msg) => messages.push(msg)
    );

    const errors = messages.filter((m) => m.type === 'error');
    expect(errors).toHaveLength(2);
    expect(errors[0].error).toMatch(/length/i);
    expect(errors[1].error).toBeTruthy();
  });

  it('performs zero fetch/Storage.setItem calls and generates deterministic STL bytes', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.2);

    const msgsA: RuggedBoxWorkerResponse[] = [];
    await handleRuggedBoxWorkerMessage(
      { id: 5, type: 'export-stl', options: STANDARD_BOX_FIXTURE },
      (m) => msgsA.push(m)
    );

    randSpy.mockReturnValue(0.8);
    const msgsB: RuggedBoxWorkerResponse[] = [];
    await handleRuggedBoxWorkerMessage(
      { id: 6, type: 'export-stl', options: STANDARD_BOX_FIXTURE },
      (m) => msgsB.push(m)
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(new Uint8Array(msgsA.find((m) => m.type === 'result')!.buffer!)).toEqual(
      new Uint8Array(msgsB.find((m) => m.type === 'result')!.buffer!)
    );
  });
});
