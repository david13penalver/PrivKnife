/// <reference lib="webworker" />

import {
  buildBatteryCaseFileBase,
  calculateMetrics,
  exportTo3mf,
  exportToBinaryStl,
  generateBatteryCaseParts,
  validateBatteryCaseOptions,
} from './engine';
import {
  BatteryCaseParts,
  BatteryCaseWorkerRequest,
  BatteryCaseWorkerResponse,
} from './types';

export async function handleBatteryCaseWorkerMessage(
  request: BatteryCaseWorkerRequest,
  post: (msg: BatteryCaseWorkerResponse, transfer?: Transferable[]) => void
): Promise<void> {
  const id = request?.id ?? 0;

  if (!request || (request.type !== 'export-stl' && request.type !== 'export-3mf')) {
    post({
      id,
      type: 'error',
      error: 'Unsupported worker export request.',
    });
    return;
  }

  const validation = validateBatteryCaseOptions(request.options);
  if (!validation.valid) {
    post({
      id,
      type: 'error',
      error: validation.error || 'Invalid configuration options.',
    });
    return;
  }

  let parts: BatteryCaseParts | null = null;
  try {
    post({ id, type: 'progress', percent: 20 });
    parts = generateBatteryCaseParts(request.options);
    const metrics = calculateMetrics(request.options, parts);

    post({ id, type: 'progress', percent: 65 });
    const fileBase = buildBatteryCaseFileBase(request.options);

    if (request.type === 'export-3mf') {
      const blob = await exportTo3mf(request.options, parts);
      const buffer = await blob.arrayBuffer();
      post({ id, type: 'progress', percent: 100 });
      post(
        {
          id,
          type: 'result',
          percent: 100,
          buffer,
          fileName: `${fileBase}.3mf`,
          mimeType: 'model/3mf',
          metrics,
        },
        [buffer]
      );
    } else {
      const buffer = exportToBinaryStl(parts);
      post({ id, type: 'progress', percent: 100 });
      post(
        {
          id,
          type: 'result',
          percent: 100,
          buffer,
          fileName: `${fileBase}.stl`,
          mimeType: 'model/stl',
          metrics,
        },
        [buffer]
      );
    }
  } catch (err: unknown) {
    post({
      id,
      type: 'error',
      error: err instanceof Error ? err.message : '3D export worker failed.',
    });
  } finally {
    parts?.dispose();
  }
}

if (
  typeof WorkerGlobalScope !== 'undefined' &&
  typeof self !== 'undefined' &&
  self instanceof WorkerGlobalScope
) {
  addEventListener('message', (event: MessageEvent<BatteryCaseWorkerRequest>) => {
    void handleBatteryCaseWorkerMessage(event.data, (msg, transfer) =>
      postMessage(msg, transfer ?? [])
    );
  });
}
