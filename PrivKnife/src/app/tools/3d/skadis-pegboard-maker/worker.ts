/// <reference lib="webworker" />

import { processSkadisHolder } from './engine';
import { SkadisPegboardWorkerRequest, SkadisPegboardWorkerResponse } from './types';

addEventListener('message', async (event: MessageEvent<SkadisPegboardWorkerRequest>) => {
  const { id, options, format } = event.data;

  try {
    postMessage({ id, type: 'progress', percent: 25 } as SkadisPegboardWorkerResponse);

    const result = await processSkadisHolder(options, format);
    if (!result.success || !result.blob) {
      postMessage({
        id,
        type: 'error',
        error: result.error || 'Failed to generate Skadis deliverable',
      } as SkadisPegboardWorkerResponse);
      return;
    }

    postMessage({ id, type: 'progress', percent: 75 } as SkadisPegboardWorkerResponse);

    const buffer = await result.blob.arrayBuffer();
    const response: SkadisPegboardWorkerResponse = {
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
    } as SkadisPegboardWorkerResponse);
  }
});
