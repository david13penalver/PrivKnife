/// <reference lib="webworker" />

import { processHsw } from './engine';
import { HswWorkerRequest, HswWorkerResponse } from './types';

addEventListener('message', async (event: MessageEvent<HswWorkerRequest>) => {
  const { options, format } = event.data;

  try {
    const result = await processHsw(options, format);
    if (!result.success || !result.blob) {
      postMessage({
        success: false,
        error: result.error || 'Failed to generate HSW deliverable',
      } as HswWorkerResponse);
      return;
    }

    const response: HswWorkerResponse = {
      success: true,
      blob: result.blob,
      fileName: result.fileName,
      fileSize: result.fileSize,
      mimeType: result.mimeType,
      metrics: result.metrics,
    };

    postMessage(response);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Worker HSW generation failed';
    postMessage({
      success: false,
      error: errorMsg,
    } as HswWorkerResponse);
  }
});
