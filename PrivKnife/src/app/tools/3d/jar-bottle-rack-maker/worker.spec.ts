import { expect, it, vi } from 'vitest';
import { handleJarRackWorkerMessage } from './worker';
import { honeycomb, thinWeb } from './test-fixtures';

it('reports progress and transfers preview and both export formats', async () => {
  for (const type of ['preview', '3mf', 'stl'] as const) {
    const post = vi.fn();
    await handleJarRackWorkerMessage({ type, options: honeycomb }, post);
    expect(post.mock.calls.filter(([message]) => message.type === 'progress').map(([message]) => message.percent))
      .toEqual([10, 70, 100]);
    const [result, transfer] = post.mock.calls.at(-1)!;
    expect(result.type).toBe(type === 'preview' ? 'preview' : 'download');
    expect(transfer[0]).toBeInstanceOf(ArrayBuffer);
  }
});

it('rejects a thin wall and malformed requests', async () => {
  const post = vi.fn();
  await handleJarRackWorkerMessage({ type: 'stl', options: thinWeb }, post);
  expect(post).toHaveBeenCalledExactlyOnceWith({ type: 'error', key: 'invalid' });
  post.mockClear();
  await handleJarRackWorkerMessage(null!, post);
  expect(post).toHaveBeenCalledExactlyOnceWith({ type: 'error', key: 'invalid' });
});
