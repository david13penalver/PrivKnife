import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleDrawerGridWorkerMessage } from './worker';
import {
  INVALID_TINY_DRAWER_FIXTURE,
  OVERSIZED_SPLIT_FIXTURE,
  STANDARD_DESK_DRAWER_FIXTURE,
} from './test-fixtures';
import { DrawerGridWorkerResponse } from './types';

describe('Drawer Divider & Interlocking Grid Worker (Spec 125 — Seam 2)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('streams progress updates and returns transferable binary .STL ArrayBuffer with metrics', async () => {
    const messages: DrawerGridWorkerResponse[] = [];
    const transfers: Transferable[] = [];

    await handleDrawerGridWorkerMessage(
      { id: 1, type: 'export-stl', options: STANDARD_DESK_DRAWER_FIXTURE },
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
    expect(res.fileName).toMatch(/\.stl$/);
    expect(res.buffer).toBeInstanceOf(ArrayBuffer);
    expect(transfers).toContain(res.buffer!);
    expect(res.buffer!.byteLength).toBe(84 + res.metrics!.triangleCount * 50);
  });

  it('exports valid .3MF and plate-pack .ZIP ArrayBuffers with PK zip headers', async () => {
    const msgs3mf: DrawerGridWorkerResponse[] = [];
    await handleDrawerGridWorkerMessage(
      { id: 2, type: 'export-3mf', options: OVERSIZED_SPLIT_FIXTURE },
      (m) => msgs3mf.push(m)
    );
    const res3mf = msgs3mf.find((m) => m.type === 'result')!;
    expect(res3mf.mimeType).toBe('model/3mf');
    expect(res3mf.fileName).toMatch(/\.3mf$/);
    expect(new Uint8Array(res3mf.buffer!)[0]).toBe(0x50);
    expect(new Uint8Array(res3mf.buffer!)[1]).toBe(0x4b);

    const msgsZip: DrawerGridWorkerResponse[] = [];
    await handleDrawerGridWorkerMessage(
      { id: 3, type: 'export-zip', options: OVERSIZED_SPLIT_FIXTURE },
      (m) => msgsZip.push(m)
    );
    const resZip = msgsZip.find((m) => m.type === 'result')!;
    expect(resZip.mimeType).toBe('application/zip');
    expect(resZip.fileName).toMatch(/\.zip$/);
    expect(new Uint8Array(resZip.buffer!)[0]).toBe(0x50);
    expect(new Uint8Array(resZip.buffer!)[1]).toBe(0x4b);
  });

  it('returns structured errors on invalid drawer dimensions or malformed worker action', async () => {
    const errors: DrawerGridWorkerResponse[] = [];

    await handleDrawerGridWorkerMessage(
      { id: 4, type: 'export-stl', options: INVALID_TINY_DRAWER_FIXTURE },
      (m) => {
        if (m.type === 'error') errors.push(m);
      }
    );
    await handleDrawerGridWorkerMessage(
      { id: 5, type: 'invalid-op' as any, options: STANDARD_DESK_DRAWER_FIXTURE },
      (m) => {
        if (m.type === 'error') errors.push(m);
      }
    );

    expect(errors).toHaveLength(2);
    expect(errors[0].error).toMatch(/width/i);
    expect(errors[1].error).toBeTruthy();
  });

  it('performs zero network or storage calls and emits deterministic STL bytes', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.2);

    const msgsA: DrawerGridWorkerResponse[] = [];
    await handleDrawerGridWorkerMessage(
      { id: 6, type: 'export-stl', options: STANDARD_DESK_DRAWER_FIXTURE },
      (m) => msgsA.push(m)
    );

    randSpy.mockReturnValue(0.8);
    const msgsB: DrawerGridWorkerResponse[] = [];
    await handleDrawerGridWorkerMessage(
      { id: 7, type: 'export-stl', options: STANDARD_DESK_DRAWER_FIXTURE },
      (m) => msgsB.push(m)
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(new Uint8Array(msgsA.find((m) => m.type === 'result')!.buffer!)).toEqual(
      new Uint8Array(msgsB.find((m) => m.type === 'result')!.buffer!)
    );
  });
});
