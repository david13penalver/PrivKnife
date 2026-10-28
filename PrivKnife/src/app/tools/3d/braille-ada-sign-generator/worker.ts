/// <reference lib="webworker" />

import { processSign } from './engine';
import { BrailleAdaSignWorkerRequest, BrailleAdaSignWorkerResponse } from './types';

addEventListener('message', async (event: MessageEvent<BrailleAdaSignWorkerRequest>) => {
  const { id, options, format } = event.data;

  try {
    postMessage({ id, type: 'progress', percent: 25 } as BrailleAdaSignWorkerResponse);

    const result = await processSign(options, format);
    if (!result.success || !result.blob) {
      postMessage({
        id,
        type: 'error',
        error: result.error || 'Failed to generate ADA sign deliverable',
      } as BrailleAdaSignWorkerResponse);
      return;
    }

    postMessage({ id, type: 'progress', percent: 75 } as BrailleAdaSignWorkerResponse);

    const buffer = await result.blob.arrayBuffer();
    const response: BrailleAdaSignWorkerResponse = {
      id,
      type: 'result',
      percent: 100,
      buffer,
      fileName: result.fileName,
      fileSize: result.fileSize,
      mimeType: result.mimeType,
      metrics: result.metrics,
      brailleTransliteration: result.brailleTransliteration,
      unicodeBraille: result.unicodeBraille,
    };

    postMessage(response, [buffer]);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Worker export generation failed';
    postMessage({
      id,
      type: 'error',
      error: errorMsg,
    } as BrailleAdaSignWorkerResponse);
  }
});
