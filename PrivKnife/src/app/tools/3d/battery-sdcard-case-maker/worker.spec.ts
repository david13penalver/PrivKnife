import { describe, expect, it, afterEach, vi } from 'vitest';
import { handleBatteryCaseWorkerMessage } from './worker';
import { AA_DISPENSER_FIXTURE, INVALID_ZERO_SLOTS_FIXTURE, MIXED_SLIDING_CASE_FIXTURE } from './test-fixtures';
import { BatteryCaseWorkerResponse } from './types';

describe('Battery Dispenser & Memory Card Case Worker (Seam 2)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('streams progress updates and returns transferable binary .STL ArrayBuffer + metrics', async () => {
    const messages: BatteryCaseWorkerResponse[] = [];
    const transfers: Transferable[] = [];

    await handleBatteryCaseWorkerMessage(
      { id: 101, type: 'export-stl', options: AA_DISPENSER_FIXTURE },
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
    expect(res.id).toBe(101);
    expect(res.mimeType).toBe('model/stl');
    expect(res.fileName).toMatch(/\.stl$/);
    expect(res.buffer).toBeInstanceOf(ArrayBuffer);
    expect(transfers).toContain(res.buffer!);
    expect(res.metrics).toBeDefined();
    expect(res.buffer!.byteLength).toBe(84 + res.metrics!.triangleCount * 50);
  });

  it('streams progress updates and returns valid ZIP-signature .3MF ArrayBuffer', async () => {
    const messages: BatteryCaseWorkerResponse[] = [];

    await handleBatteryCaseWorkerMessage(
      { id: 202, type: 'export-3mf', options: MIXED_SLIDING_CASE_FIXTURE },
      (msg) => messages.push(msg)
    );

    const results = messages.filter((m) => m.type === 'result');
    expect(results).toHaveLength(1);
    const res = results[0];

    expect(res.mimeType).toBe('model/3mf');
    expect(res.fileName).toMatch(/\.3mf$/);
    expect(res.buffer).toBeInstanceOf(ArrayBuffer);
    const bytes = new Uint8Array(res.buffer!);
    // PK zip magic header
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it('emits structured error message on invalid options or malformed request without throwing', async () => {
    const messages: BatteryCaseWorkerResponse[] = [];

    await handleBatteryCaseWorkerMessage(
      { id: 303, type: 'export-stl', options: INVALID_ZERO_SLOTS_FIXTURE },
      (msg) => messages.push(msg)
    );

    await handleBatteryCaseWorkerMessage(
      { id: 304, type: 'unsupported' as any, options: AA_DISPENSER_FIXTURE },
      (msg) => messages.push(msg)
    );

    const errors = messages.filter((m) => m.type === 'error');
    expect(errors).toHaveLength(2);
    expect(errors[0].id).toBe(303);
    expect(errors[0].error).toMatch(/slot/i);
    expect(errors[1].id).toBe(304);
    expect(errors[1].error).toBeTruthy();
  });

  it('executes zero network or storage writes inside worker execution and emits deterministic STL bytes', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.25);

    const msgsA: BatteryCaseWorkerResponse[] = [];
    await handleBatteryCaseWorkerMessage(
      { id: 404, type: 'export-stl', options: AA_DISPENSER_FIXTURE },
      (m) => msgsA.push(m)
    );

    randSpy.mockReturnValue(0.75);
    const msgsB: BatteryCaseWorkerResponse[] = [];
    await handleBatteryCaseWorkerMessage(
      { id: 405, type: 'export-stl', options: AA_DISPENSER_FIXTURE },
      (m) => msgsB.push(m)
    );

    const bufA = new Uint8Array(msgsA.find((m) => m.type === 'result')!.buffer!);
    const bufB = new Uint8Array(msgsB.find((m) => m.type === 'result')!.buffer!);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(bufA).toEqual(bufB);
  });
});
