/// <reference lib="webworker" />

import { processClamp } from './engine';
import { UnderDeskClampWorkerRequest, UnderDeskClampWorkerResponse } from './types';

addEventListener('message', async (event: MessageEvent<UnderDeskClampWorkerRequest>) => {
  const { id, options, format } = event.data;

  try {
    postMessage({ id, type: 'progress', percent: 25 } as UnderDeskClampWorkerResponse);

    const result = await processClamp(options, format);
    if (!result.success || !result.blob) {
      postMessage({
        id,
        type: 'error',
        error: result.error || 'Failed to generate Under-Desk Clamp deliverable',
      } as UnderDeskClampWorkerResponse);
      return;
    }

    postMessage({ id, type: 'progress', percent: 75 } as UnderDeskClampWorkerResponse);

    const buffer = await result.blob.arrayBuffer();
    const response: UnderDeskClampWorkerResponse = {
      id,
      type: 'result',
      percent: 100,
      buffer,
      fileName: result.fileName,
      fileSize: result.fileSize,
      mimeType: result.mimeType,
      metrics: result.metrics,
    };

    postMessage(response, [buffer]);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Worker clamp export generation failed';
    postMessage({
      id,
      type: 'error',
      error: errorMsg,
    } as UnderDeskClampWorkerResponse);
  }
});
