/// <reference lib="webworker" />

import { processLithophane } from './engine';
import { LithophaneWorkerRequest, LithophaneWorkerResponse } from './types';

addEventListener('message', async (event: MessageEvent<LithophaneWorkerRequest>) => {
  const { id, options, format } = event.data;

  try {
    const onProgress = (percent: number) => {
      postMessage({ id, type: 'progress', percent } as LithophaneWorkerResponse);
    };

    const result = await processLithophane(options, format, onProgress);
    if (!result.success || !result.blob) {
      postMessage({
        id,
        type: 'error',
        error: result.error || 'Failed to generate lithophane',
      } as LithophaneWorkerResponse);
      return;
    }

    const buffer = await result.blob.arrayBuffer();
    const response: LithophaneWorkerResponse = {
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
    } as LithophaneWorkerResponse);
  }
});
