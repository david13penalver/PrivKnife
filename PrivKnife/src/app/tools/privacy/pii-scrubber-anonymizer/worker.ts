/// <reference lib="webworker" />
import { processPiiScrub } from './engine';
import { PiiScrubberWorkerRequest, PiiScrubberWorkerResponse } from './types';

addEventListener('message', async (event: MessageEvent<PiiScrubberWorkerRequest>) => {
  const { id, text, options, originalFileName } = event.data;
  try {
    postMessage({ id, type: 'progress', percent: 25 } satisfies PiiScrubberWorkerResponse);
    const result = await processPiiScrub(text, options, originalFileName);
    postMessage({ id, type: 'progress', percent: 100 } satisfies PiiScrubberWorkerResponse);
    postMessage({ id, type: 'result', result } satisfies PiiScrubberWorkerResponse);
  } catch (err) {
    postMessage({
      id,
      type: 'error',
      error: err instanceof Error ? err.message : String(err),
    } satisfies PiiScrubberWorkerResponse);
  }
});
