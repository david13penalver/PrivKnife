/// <reference lib="webworker" />

import { processKeycap } from './engine';
import { KeycapWorkerRequest, KeycapWorkerResponse } from './types';

addEventListener('message', async (event: MessageEvent<KeycapWorkerRequest>) => {
  const { id, options, format } = event.data;

  try {
    postMessage({ id, type: 'progress', percent: 25 } as KeycapWorkerResponse);

    const result = await processKeycap(options, format);
    if (!result.success || !result.blob) {
      postMessage({
        id,
        type: 'error',
        error: result.error || 'Failed to generate keycap deliverable',
      } as KeycapWorkerResponse);
      return;
    }

    postMessage({ id, type: 'progress', percent: 75 } as KeycapWorkerResponse);

    const buffer = await result.blob.arrayBuffer();
    const response: KeycapWorkerResponse = {
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
    } as KeycapWorkerResponse);
  }
});
