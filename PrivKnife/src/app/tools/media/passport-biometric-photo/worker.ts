/// <reference lib="webworker" />

import { processPassportPhoto } from './engine';
import { PassportWorkerRequest, PassportWorkerResponse } from './types';

addEventListener('message', async (event: MessageEvent<PassportWorkerRequest>) => {
  const { imageSource, options, format } = event.data;

  try {
    const result = await processPassportPhoto(imageSource, options, format);
    if (!result.success || !result.blob) {
      postMessage({
        success: false,
        error: result.error || 'Failed to generate passport deliverable',
      } as PassportWorkerResponse);
      return;
    }

    const response: PassportWorkerResponse = {
      success: true,
      blob: result.blob,
      fileName: result.fileName,
      fileSize: result.fileSize,
      mimeType: result.mimeType,
      metrics: result.metrics,
    };

    postMessage(response);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Worker passport photo generation failed';
    postMessage({
      success: false,
      error: errorMsg,
    } as PassportWorkerResponse);
  }
});
