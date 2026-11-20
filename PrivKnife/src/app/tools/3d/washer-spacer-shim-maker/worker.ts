/// <reference lib="webworker" />

import {
  buildHardwareFileBase,
  calculateHardwareMetrics,
  exportTo3mf,
  exportToBinaryStl,
  generateHardwarePlateParts,
  validateHardwareOptions,
} from './engine';
import {
  HardwarePlateParts,
  HardwareWorkerRequest,
  HardwareWorkerResponse,
} from './types';

export async function handleHardwareWorkerMessage(
  request: HardwareWorkerRequest,
  post: (msg: HardwareWorkerResponse, transfer?: Transferable[]) => void
): Promise<void> {
  const id = request?.id ?? 0;

  if (!request || (request.type !== 'export-stl' && request.type !== 'export-3mf')) {
    post({
      id,
      type: 'error',
      error: 'Unsupported hardware worker export request.',
    });
    return;
  }

  const validation = validateHardwareOptions(request.options);
  if (!validation.valid) {
    post({
      id,
      type: 'error',
      error: validation.error || 'Invalid hardware configuration.',
    });
    return;
  }

  let parts: HardwarePlateParts | null = null;
  try {
    post({ id, type: 'progress', percent: 25 });
    parts = generateHardwarePlateParts(request.options);
    const metrics = calculateHardwareMetrics(request.options, parts);

    post({ id, type: 'progress', percent: 70 });
    const fileBase = buildHardwareFileBase(request.options);

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
      error: err instanceof Error ? err.message : '3D hardware export worker failed.',
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
  addEventListener('message', (event: MessageEvent<HardwareWorkerRequest>) => {
    void handleHardwareWorkerMessage(event.data, (msg, transfer) =>
      postMessage(msg, transfer ? { transfer } : undefined)
    );
  });
}
