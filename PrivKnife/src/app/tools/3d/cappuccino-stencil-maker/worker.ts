/// <reference lib="webworker" />

import { processStencil } from './engine';
import { StencilWorkerRequest, StencilWorkerResponse } from './types';

addEventListener('message', async (event: MessageEvent<StencilWorkerRequest>) => {
  const { id, options, format } = event.data;

  try {
    postMessage({ id, type: 'progress', percent: 25 } as StencilWorkerResponse);

    const result = await processStencil(options, format);
    if (!result.success || !result.blob) {
      postMessage({
        id,
        type: 'error',
        error: result.error || 'Failed to generate cappuccino stencil deliverable',
      } as StencilWorkerResponse);
      return;
    }

    postMessage({ id, type: 'progress', percent: 75 } as StencilWorkerResponse);

    const buffer = await result.blob.arrayBuffer();
    const response: StencilWorkerResponse = {
      id,
      type: 'result',
      percent: 100,
      buffer,
      fileName: result.fileName,
      fileSize: result.fileSize,
      mimeType: result.mimeType,
      metrics: result.metrics,
      svgContent: result.svgContent,
    };

    postMessage(response, [buffer]);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Worker stencil generation failed';
    postMessage({
      id,
      type: 'error',
      error: errorMsg,
    } as StencilWorkerResponse);
  }
});
