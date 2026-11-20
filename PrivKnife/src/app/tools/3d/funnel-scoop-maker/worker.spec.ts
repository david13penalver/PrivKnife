import { expect, it, vi } from 'vitest';
import { handleFunnelScoopWorkerMessage } from './worker';
import { cloggedFunnel, scoop } from './test-fixtures';

it('streams worker progress and transfers the result buffers', async () => {
  for (const type of ['preview', 'stl', '3mf'] as const) {
    const post = vi.fn();
    await handleFunnelScoopWorkerMessage({ type, options: scoop }, post);
    expect(post.mock.calls.filter(([message]) => message.type === 'progress').map(([message]) => message.percent))
      .toEqual([10, 70, 100]);
    const [result, transfers] = post.mock.calls.at(-1)!;
    expect(result.type).toBe(type === 'preview' ? 'preview' : 'download');
    expect(transfers.every((buffer: unknown) => buffer instanceof ArrayBuffer)).toBe(true);
    expect(transfers.length).toBeGreaterThan(0);
  }
});

it('rejects a blocked spout before exporting', async () => {
  const post = vi.fn();
  await handleFunnelScoopWorkerMessage({ type: 'stl', options: cloggedFunnel }, post);
  expect(post).toHaveBeenCalledWith({ type: 'error', key: 'boreError' });
});
