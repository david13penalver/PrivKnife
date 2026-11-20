/// <reference lib="webworker" />

import {
  buildDeviceCradleFileBase,
  calculateDeviceCradleMetrics,
  exportTo3mf,
  exportToBinaryStl,
  generateDeviceCradleParts,
  validateDeviceCradleOptions,
} from './engine';
import {
  DeviceCradleParts,
  DeviceCradleWorkerRequest,
  DeviceCradleWorkerResponse,
} from './types';

export async function handleDeviceCradleWorkerMessage(
  request: DeviceCradleWorkerRequest,
  post: (msg: DeviceCradleWorkerResponse, transfer?: Transferable[]) => void
): Promise<void> {
  const id = request?.id ?? 0;

  if (!request || (request.type !== 'export-stl' && request.type !== 'export-3mf')) {
    post({
      id,
      type: 'error',
      error: 'Unsupported device cradle worker export request.',
    });
    return;
  }

  const validation = validateDeviceCradleOptions(request.options);
  if (!validation.valid) {
    post({
      id,
      type: 'error',
      error: validation.error || 'Invalid device cradle configuration.',
    });
    return;
  }

  let parts: DeviceCradleParts | null = null;
  try {
    post({ id, type: 'progress', percent: 25 });
    parts = generateDeviceCradleParts(request.options);
    const metrics = calculateDeviceCradleMetrics(request.options, parts);

    post({ id, type: 'progress', percent: 70 });
    const fileBase = buildDeviceCradleFileBase(request.options);

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
      error: err instanceof Error ? err.message : '3D device cradle export worker failed.',
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
  addEventListener('message', (event: MessageEvent<DeviceCradleWorkerRequest>) => {
    void handleDeviceCradleWorkerMessage(event.data, (msg, transfer) =>
      postMessage(msg, transfer ? { transfer } : undefined)
    );
  });
}
