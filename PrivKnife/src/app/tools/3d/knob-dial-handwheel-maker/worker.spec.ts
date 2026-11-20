import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleKnobWorkerMessage } from './worker';
import {
  INVALID_THIN_HUB_FIXTURE,
  M6_STAR_NUT_FIXTURE,
  POTENTIOMETER_DSHAFT_FIXTURE,
} from './test-fixtures';
import { KnobWorkerResponse } from './types';

describe('Replacement Knob, Dial & Captive-Nut Thumbscrew Worker — Seam 2', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('streams progress updates and returns transferable binary .STL ArrayBuffer with metrics', async () => {
    const messages: KnobWorkerResponse[] = [];
    const transfers: Transferable[] = [];

    await handleKnobWorkerMessage(
      { id: 1, type: 'export-stl', options: { ...POTENTIOMETER_DSHAFT_FIXTURE, sectionCutaway: true } },
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
    expect(res.fileName).toMatch(/^privknife-knob.*\.stl$/);
    expect(res.buffer).toBeInstanceOf(ArrayBuffer);
    expect(transfers).toContain(res.buffer!);
    expect(res.buffer!.byteLength).toBe(84 + res.metrics!.triangleCount * 50);
  });

  it('exports transferable dual-object .3MF ArrayBuffer with PK header', async () => {
    const messages: KnobWorkerResponse[] = [];
    const transfers: Transferable[] = [];

    await handleKnobWorkerMessage(
      { id: 2, type: 'export-3mf', options: M6_STAR_NUT_FIXTURE },
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

  it('returns structured errors on thin hub wall violation or invalid worker action', async () => {
    const errors: KnobWorkerResponse[] = [];

    await handleKnobWorkerMessage(
      { id: 3, type: 'export-stl', options: INVALID_THIN_HUB_FIXTURE },
      (m) => {
        if (m.type === 'error') errors.push(m);
      }
    );
    await handleKnobWorkerMessage(
      { id: 4, type: 'bad-action' as any, options: POTENTIOMETER_DSHAFT_FIXTURE },
      (m) => {
        if (m.type === 'error') errors.push(m);
      }
    );

    expect(errors).toHaveLength(2);
    expect(errors[0].error).toBeTruthy();
    expect(errors[1].error).toBeTruthy();
  });

  it('performs zero network or storage calls and emits deterministic STL bytes', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.15);

    const msgsA: KnobWorkerResponse[] = [];
    await handleKnobWorkerMessage(
      { id: 5, type: 'export-stl', options: POTENTIOMETER_DSHAFT_FIXTURE },
      (m) => msgsA.push(m)
    );

    randSpy.mockReturnValue(0.85);
    const msgsB: KnobWorkerResponse[] = [];
    await handleKnobWorkerMessage(
      { id: 6, type: 'export-stl', options: POTENTIOMETER_DSHAFT_FIXTURE },
      (m) => msgsB.push(m)
    );

    const bufA = new Uint8Array(msgsA.find((m) => m.type === 'result')!.buffer!);
    const bufB = new Uint8Array(msgsB.find((m) => m.type === 'result')!.buffer!);
    expect(bufA).toEqual(bufB);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});
