/// <reference lib="webworker" />

import { processPetTag } from './engine';
import { PetTagWorkerRequest, PetTagWorkerResponse } from './types';

addEventListener('message', async (event: MessageEvent<PetTagWorkerRequest>) => {
  const { options, format } = event.data;

  try {
    const result = await processPetTag(options, format);
    if (!result.success || !result.blob) {
      postMessage({
        success: false,
        error: result.error || 'Failed to generate pet tag deliverable',
      } as PetTagWorkerResponse);
      return;
    }

    const response: PetTagWorkerResponse = {
      success: true,
      blob: result.blob,
      fileName: result.fileName,
      fileSize: result.fileSize,
      mimeType: result.mimeType,
      metrics: result.metrics,
    };

    postMessage(response);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Worker pet tag generation failed';
    postMessage({
      success: false,
      error: errorMsg,
    } as PetTagWorkerResponse);
  }
});
