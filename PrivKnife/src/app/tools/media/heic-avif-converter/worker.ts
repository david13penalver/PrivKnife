/// <reference lib="webworker" />

import { processBatch } from './engine';
import { HeicAvifWorkerRequest, HeicAvifWorkerResponse } from './types';

addEventListener('message', async (event: MessageEvent<HeicAvifWorkerRequest>) => {
  const { files, itemIds, options } = event.data;

  try {
    const result = await processBatch(
      files,
      options,
      (progressPercent, item) => {
        postMessage({
          type: 'progress',
          progressPercent,
          item,
        } as HeicAvifWorkerResponse);
      },
      itemIds
    );

    postMessage({
      type: 'done',
      success: true,
      result,
    } as HeicAvifWorkerResponse);
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : 'Batch conversion failed in worker';
    postMessage({
      type: 'done',
      success: false,
      error: errorMsg,
    } as HeicAvifWorkerResponse);
  }
});
