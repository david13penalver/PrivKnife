/// <reference lib="webworker" />

import {
  buildKnobFileBase,
  calculateKnobMetrics,
  exportTo3mf,
  exportToBinaryStl,
  generateKnobParts,
  validateKnobOptions,
} from './engine';
import {
  KnobParts,
  KnobWorkerRequest,
  KnobWorkerResponse,
} from './types';

export async function handleKnobWorkerMessage(
  request: KnobWorkerRequest,
  post: (msg: KnobWorkerResponse, transfer?: Transferable[]) => void
): Promise<void> {
  const id = request?.id ?? 0;

  if (!request || (request.type !== 'export-stl' && request.type !== 'export-3mf')) {
    post({
      id,
      type: 'error',
      error: 'Unsupported knob worker export request.',
    });
    return;
  }

  // Always force solid un-clipped export mesh regardless of live viewport cutaway toggle
  const exportOptions = { ...request.options, sectionCutaway: false };

  const validation = validateKnobOptions(exportOptions);
  if (!validation.valid) {
    post({
      id,
      type: 'error',
      error: validation.error || 'Invalid knob configuration.',
    });
    return;
  }

  let parts: KnobParts | null = null;
  try {
    post({ id, type: 'progress', percent: 25 });
    parts = generateKnobParts(exportOptions);
    const metrics = calculateKnobMetrics(exportOptions, parts);

    post({ id, type: 'progress', percent: 70 });
    const fileBase = buildKnobFileBase(exportOptions);

    if (request.type === 'export-3mf') {
      const blob = await exportTo3mf(exportOptions, parts);
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
      error: err instanceof Error ? err.message : '3D knob export worker failed.',
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
  addEventListener('message', (event: MessageEvent<KnobWorkerRequest>) => {
    void handleKnobWorkerMessage(event.data, (msg, transfer) =>
      postMessage(msg, transfer ? { transfer } : undefined)
    );
  });
}
