/// <reference lib="webworker" />
import { processAudioTrimmer } from './engine';
import { AudioTrimmerWorkerRequest, AudioTrimmerWorkerResponse } from './types';

addEventListener('message', async (event: MessageEvent<AudioTrimmerWorkerRequest>) => {
  const { id, options } = event.data;
  try {
    const result = await processAudioTrimmer(options);
    postMessage({ id, result } satisfies AudioTrimmerWorkerResponse);
  } catch (err) {
    postMessage({
      id,
      error: err instanceof Error ? err.message : String(err),
    } satisfies AudioTrimmerWorkerResponse);
  }
});
