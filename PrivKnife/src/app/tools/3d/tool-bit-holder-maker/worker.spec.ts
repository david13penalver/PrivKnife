import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleToolHolderWorkerMessage } from './worker';
import {
  HEX_BITS_12_FIXTURE,
  INVALID_EMPTY_CUSTOM_FIXTURE,
  METRIC_DRILLS_FIXTURE,
} from './test-fixtures';
import { ToolHolderWorkerResponse } from './types';

describe('Tool, Drill Bit, Hex Key & Nozzle Organizer Worker — Seam 2', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('streams progress updates and returns transferable binary .STL ArrayBuffer with metrics', async () => {
    const messages: ToolHolderWorkerResponse[] = [];
    const transfers: Transferable[] = [];

    await handleToolHolderWorkerMessage(
      { id: 1, type: 'export-stl', options: METRIC_DRILLS_FIXTURE },
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
    expect(res.fileName).toMatch(/^privknife-tool-rack-metric_drills.*\.stl$/);
    expect(res.buffer).toBeInstanceOf(ArrayBuffer);
    expect(transfers).toContain(res.buffer!);
    expect(res.buffer!.byteLength).toBe(84 + res.metrics!.triangleCount * 50);
  });

  it('exports transferable dual-object .3MF ArrayBuffer with PK ZIP header', async () => {
    const messages: ToolHolderWorkerResponse[] = [];
    const transfers: Transferable[] = [];

    await handleToolHolderWorkerMessage(
      { id: 2, type: 'export-3mf', options: HEX_BITS_12_FIXTURE },
      (msg, transfer) => {
        messages.push(msg);
        if (transfer) transfers.push(...transfer);
      }
    );

    const res = messages.find((m) => m.type === 'result')!;
    expect(res).toBeDefined();
    expect(res.mimeType).toBe('model/3mf');
    expect(res.fileName).toMatch(/\.3mf$/);
    expect(transfers).toContain(res.buffer!);
    const bytes = new Uint8Array(res.buffer!);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it('emits structured errors on invalid custom spec or unsupported request type', async () => {
    const errors: ToolHolderWorkerResponse[] = [];

    await handleToolHolderWorkerMessage(
      { id: 3, type: 'export-stl', options: INVALID_EMPTY_CUSTOM_FIXTURE },
      (m) => {
        if (m.type === 'error') errors.push(m);
      }
    );
    await handleToolHolderWorkerMessage(
      { id: 4, type: 'unknown-action' as any, options: METRIC_DRILLS_FIXTURE },
      (m) => {
        if (m.type === 'error') errors.push(m);
      }
    );

    expect(errors).toHaveLength(2);
    expect(errors[0].error).toBeTruthy();
    expect(errors[1].error).toBeTruthy();
  });

  it('performs zero network or storage calls and generates byte-identical STL output', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.15);

    const msgsA: ToolHolderWorkerResponse[] = [];
    await handleToolHolderWorkerMessage(
      { id: 5, type: 'export-stl', options: ALLEN_KEYS_LITE },
      (m) => msgsA.push(m)
    );

    randSpy.mockReturnValue(0.85);
    const msgsB: ToolHolderWorkerResponse[] = [];
    await handleToolHolderWorkerMessage(
      { id: 6, type: 'export-stl', options: ALLEN_KEYS_LITE },
      (m) => msgsB.push(m)
    );

    const bufA = new Uint8Array(msgsA.find((m) => m.type === 'result')!.buffer!);
    const bufB = new Uint8Array(msgsB.find((m) => m.type === 'result')!.buffer!);
    expect(bufA).toEqual(bufB);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});

const ALLEN_KEYS_LITE = {
  ...METRIC_DRILLS_FIXTURE,
  preset: 'allen_keys' as const,
  customSpecText: '2, 3, 4',
  rows: 1,
};
