import { expect, it, vi } from 'vitest';
import { handleContainerWorkerMessage } from './worker';
import { oversizeSlit, pill, tube } from './test-fixtures';

it('streams progress and transfers both export formats', async () => {
  for (const type of ['stl', '3mf'] as const) {
    const post = vi.fn();
    await handleContainerWorkerMessage({ type, options: pill }, post);
    expect(post.mock.calls.filter(([msg]) => msg.type === 'progress').map(([msg]) => msg.percent)).toEqual([10, 70, 100]);
    const [result, transfer] = post.mock.calls.at(-1)!;
    expect(result.type).toBe('download');
    expect(transfer).toEqual([expect.any(ArrayBuffer)]);
  }
});

it('builds an assembled cutaway only for preview and rejects an oversize slit', async () => {
  const post = vi.fn();
  await handleContainerWorkerMessage({ type: 'preview', options: { ...tube, layoutFlatPlate: false, cutaway: true } }, post);
  expect(post.mock.calls.at(-1)?.[0]).toMatchObject({ type: 'preview', parts: [{ material: 0 }, { material: 0 }] });
  post.mockClear();
  await handleContainerWorkerMessage({ type: 'stl', options: oversizeSlit }, post);
  expect(post).toHaveBeenCalledExactlyOnceWith({ type: 'error', key: 'slitError' });
});
