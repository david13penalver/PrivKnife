/// <reference lib="webworker" />

import { processEnclosure } from './engine';
import { ElectronicsBoxWorkerRequest, ElectronicsBoxWorkerResponse } from './types';

addEventListener('message', async (event: MessageEvent<ElectronicsBoxWorkerRequest>) => {
  const { id, options, format } = event.data;

  try {
    postMessage({ id, type: 'progress', percent: 25 } as ElectronicsBoxWorkerResponse);

    const result = await processEnclosure(options, format);
    if (!result.success || !result.blob) {
      postMessage({
        id,
        type: 'error',
        error: result.error || 'Failed to generate Electronics Enclosure deliverable',
      } as ElectronicsBoxWorkerResponse);
      return;
    }

    postMessage({ id, type: 'progress', percent: 75 } as ElectronicsBoxWorkerResponse);

    const buffer = await result.blob.arrayBuffer();
    const response: ElectronicsBoxWorkerResponse = {
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
    } as ElectronicsBoxWorkerResponse);
  }
});
