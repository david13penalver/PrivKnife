/// <reference lib="webworker" />

import { processPlanter } from './engine';
import { GeometricPlantPotWorkerRequest, GeometricPlantPotWorkerResponse } from './types';

addEventListener('message', async (event: MessageEvent<GeometricPlantPotWorkerRequest>) => {
  const { id, options, format } = event.data;

  try {
    postMessage({ id, type: 'progress', percent: 25 } as GeometricPlantPotWorkerResponse);

    const result = await processPlanter(options, format);
    if (!result.success || !result.blob) {
      postMessage({
        id,
        type: 'error',
        error: result.error || 'Failed to generate planter deliverable',
      } as GeometricPlantPotWorkerResponse);
      return;
    }

    postMessage({ id, type: 'progress', percent: 75 } as GeometricPlantPotWorkerResponse);

    const buffer = await result.blob.arrayBuffer();
    const response: GeometricPlantPotWorkerResponse = {
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
    } as GeometricPlantPotWorkerResponse);
  }
});
