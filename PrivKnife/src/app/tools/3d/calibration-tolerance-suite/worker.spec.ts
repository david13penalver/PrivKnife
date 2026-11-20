import { expect, it, vi } from 'vitest';
import { handleCalibrationWorkerMessage } from './worker';
import { gauge, sheet } from './test-fixtures';

it('transfers both export formats and exact-height preview buffers after reporting progress', async () => {
  for (const type of ['stl', '3mf', 'preview'] as const) {
    const post = vi.fn();
    await handleCalibrationWorkerMessage({ type, options: sheet }, post);
    const results = post.mock.calls;
    expect(results.filter(([msg]) => msg.type === 'progress').map(([msg]) => msg.percent)).toEqual([10, 70, 100]);
    const [result, transfer] = results.at(-1)!;
    expect(result.type).toBe(type === 'preview' ? 'preview' : 'download');
    expect(result.metrics.heightMm).toBe(0.2);
    expect(transfer[0]).toBeInstanceOf(ArrayBuffer);
  }
});

it('rejects invalid benchmark input before starting or making network calls', async () => {
  const network = vi.spyOn(globalThis, 'fetch');
  try {
    const post = vi.fn();
    await handleCalibrationWorkerMessage({ type: 'stl', options: { ...gauge, clearanceValuesText: '' } }, post);
    expect(post).toHaveBeenCalledExactlyOnceWith({ type: 'error', key: 'clearanceError' });
    expect(network).not.toHaveBeenCalled();
  } finally {
    network.mockRestore();
  }
});
