/// <reference lib="webworker" />

import {
  buildDrawerGridFileBase,
  calculateDrawerGridMetrics,
  exportPlateZip,
  exportTo3mf,
  exportToBinaryStl,
  generateDrawerGridParts,
  validateDrawerGridOptions,
} from './engine';
import {
  DrawerGridParts,
  DrawerGridWorkerRequest,
  DrawerGridWorkerResponse,
} from './types';

export async function handleDrawerGridWorkerMessage(
  request: DrawerGridWorkerRequest,
  post: (msg: DrawerGridWorkerResponse, transfer?: Transferable[]) => void
): Promise<void> {
  const id = request?.id ?? 0;

  if (
    !request ||
    (request.type !== 'export-stl' &&
      request.type !== 'export-3mf' &&
      request.type !== 'export-zip')
  ) {
    post({ id, type: 'error', error: 'Unsupported worker export request.' });
    return;
  }

  const check = validateDrawerGridOptions(request.options);
  if (!check.valid) {
    post({ id, type: 'error', error: check.error || 'Invalid drawer grid options.' });
    return;
  }

  let parts: DrawerGridParts | null = null;
  try {
    post({ id, type: 'progress', percent: 20 });
    parts = generateDrawerGridParts(request.options);
    const metrics = calculateDrawerGridMetrics(request.options, parts);
    post({ id, type: 'progress', percent: 65 });

    const fileBase = buildDrawerGridFileBase(request.options);
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
    } else if (request.type === 'export-zip') {
      const blob = await exportPlateZip(request.options, parts);
      const buffer = await blob.arrayBuffer();
      post({ id, type: 'progress', percent: 100 });
      post(
        {
          id,
          type: 'result',
          percent: 100,
          buffer,
          fileName: `${fileBase}-plates.zip`,
          mimeType: 'application/zip',
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
      error: err instanceof Error ? err.message : 'Drawer grid worker failed.',
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
  addEventListener('message', (event: MessageEvent<DrawerGridWorkerRequest>) => {
    void handleDrawerGridWorkerMessage(event.data, (msg, transfer) =>
      postMessage(msg, transfer ?? [])
    );
  });
}
