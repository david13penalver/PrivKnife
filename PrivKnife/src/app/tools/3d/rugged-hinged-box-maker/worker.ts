/// <reference lib="webworker" />

import {
  buildRuggedBoxFileBase,
  calculateRuggedBoxMetrics,
  exportTo3mf,
  exportToBinaryStl,
  generateRuggedBoxParts,
  validateRuggedBoxOptions,
} from './engine';
import {
  RuggedBoxParts,
  RuggedBoxWorkerRequest,
  RuggedBoxWorkerResponse,
} from './types';

export async function handleRuggedBoxWorkerMessage(
  request: RuggedBoxWorkerRequest,
  post: (msg: RuggedBoxWorkerResponse, transfer?: Transferable[]) => void
): Promise<void> {
  const id = request?.id ?? 0;

  if (!request || (request.type !== 'export-stl' && request.type !== 'export-3mf')) {
    post({ id, type: 'error', error: 'Unsupported worker export request.' });
    return;
  }

  const check = validateRuggedBoxOptions(request.options);
  if (!check.valid) {
    post({ id, type: 'error', error: check.error || 'Invalid box options.' });
    return;
  }

  let parts: RuggedBoxParts | null = null;
  try {
    post({ id, type: 'progress', percent: 20 });
    parts = generateRuggedBoxParts(request.options);
    const metrics = calculateRuggedBoxMetrics(request.options, parts);
    post({ id, type: 'progress', percent: 65 });

    const fileBase = buildRuggedBoxFileBase(request.options);
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
      error: err instanceof Error ? err.message : 'Rugged box worker failed.',
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
  addEventListener('message', (event: MessageEvent<RuggedBoxWorkerRequest>) => {
    void handleRuggedBoxWorkerMessage(event.data, (msg, transfer) =>
      postMessage(msg, transfer ?? [])
    );
  });
}
