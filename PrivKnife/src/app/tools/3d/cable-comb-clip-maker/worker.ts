/// <reference lib="webworker" />

import {
  buildCableToolFileBase,
  calculateCableToolMetrics,
  exportTo3mf,
  exportToBinaryStl,
  generateCableToolParts,
  validateCableToolOptions,
} from './engine';
import {
  CableToolParts,
  CableToolWorkerRequest,
  CableToolWorkerResponse,
} from './types';

export async function handleCableToolWorkerMessage(
  request: CableToolWorkerRequest,
  post: (msg: CableToolWorkerResponse, transfer?: Transferable[]) => void
): Promise<void> {
  const id = request?.id ?? 0;

  if (!request || (request.type !== 'export-stl' && request.type !== 'export-3mf')) {
    post({
      id,
      type: 'error',
      error: 'Unsupported cable organizer worker export request.',
    });
    return;
  }

  const validation = validateCableToolOptions(request.options);
  if (!validation.valid) {
    post({
      id,
      type: 'error',
      error: validation.error || 'Invalid cable organizer configuration.',
    });
    return;
  }

  let parts: CableToolParts | null = null;
  try {
    post({ id, type: 'progress', percent: 25 });
    parts = generateCableToolParts(request.options);
    const metrics = calculateCableToolMetrics(request.options, parts);

    post({ id, type: 'progress', percent: 70 });
    const fileBase = buildCableToolFileBase(request.options);

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
      error: err instanceof Error ? err.message : '3D cable organizer export worker failed.',
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
  addEventListener('message', (event: MessageEvent<CableToolWorkerRequest>) => {
    void handleCableToolWorkerMessage(event.data, (msg, transfer) =>
      postMessage(msg, transfer ? { transfer } : undefined)
    );
  });
}
