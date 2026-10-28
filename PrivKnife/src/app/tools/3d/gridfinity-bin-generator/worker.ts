/// <reference lib="webworker" />

import { processGridfinity } from './engine';
import { GridfinityWorkerRequest, GridfinityWorkerResponse } from './types';

addEventListener('message', async (event: MessageEvent<GridfinityWorkerRequest>) => {
  const { id, options, format } = event.data;

  try {
    postMessage({ id, type: 'progress', percent: 25 } as GridfinityWorkerResponse);

    const result = await processGridfinity(options, format);
    if (!result.success || !result.blob) {
      postMessage({
        id,
        type: 'error',
        error: result.error || 'Failed to generate Gridfinity deliverable',
      } as GridfinityWorkerResponse);
      return;
    }

    postMessage({ id, type: 'progress', percent: 75 } as GridfinityWorkerResponse);

    const buffer = await result.blob.arrayBuffer();
    const response: GridfinityWorkerResponse = {
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
    const errorMsg = err instanceof Error ? err.message : 'Worker export generation failed';
    postMessage({
      id,
      type: 'error',
      error: errorMsg,
    } as GridfinityWorkerResponse);
  }
});
