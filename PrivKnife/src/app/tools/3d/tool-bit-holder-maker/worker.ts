/// <reference lib="webworker" />

import {
  buildToolHolderFileBase,
  calculateToolHolderMetrics,
  exportTo3mf,
  exportToBinaryStl,
  generateToolHolderParts,
  validateToolHolderOptions,
} from './engine';
import {
  ToolHolderParts,
  ToolHolderWorkerRequest,
  ToolHolderWorkerResponse,
} from './types';

export async function handleToolHolderWorkerMessage(
  request: ToolHolderWorkerRequest,
  post: (msg: ToolHolderWorkerResponse, transfer?: Transferable[]) => void
): Promise<void> {
  const id = request?.id ?? 0;

  if (!request || (request.type !== 'export-stl' && request.type !== 'export-3mf')) {
    post({
      id,
      type: 'error',
      error: 'Unsupported tool holder worker export request.',
    });
    return;
  }

  const validation = validateToolHolderOptions(request.options);
  if (!validation.valid) {
    post({
      id,
      type: 'error',
      error: validation.error || 'Invalid tool holder configuration.',
    });
    return;
  }

  let parts: ToolHolderParts | null = null;
  try {
    post({ id, type: 'progress', percent: 20 });
    parts = generateToolHolderParts(request.options);
    const metrics = calculateToolHolderMetrics(request.options, parts);

    post({ id, type: 'progress', percent: 65 });
    const fileBase = buildToolHolderFileBase(request.options);

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
      error: err instanceof Error ? err.message : '3D tool organizer export worker failed.',
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
  addEventListener('message', (event: MessageEvent<ToolHolderWorkerRequest>) => {
    void handleToolHolderWorkerMessage(event.data, (msg, transfer) =>
      postMessage(msg, transfer ? { transfer } : undefined)
    );
  });
}
