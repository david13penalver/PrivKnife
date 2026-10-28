/// <reference lib="webworker" />
import { processVideoCompressor } from './engine';
import { VideoCompressorWorkerRequest, VideoCompressorWorkerResponse } from './types';

addEventListener('message', async (event: MessageEvent<VideoCompressorWorkerRequest>) => {
  const { id, options } = event.data;
  try {
    const result = await processVideoCompressor(options);
    postMessage({ id, result } satisfies VideoCompressorWorkerResponse);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    postMessage({
      id,
      result: {
        success: false,
        blob: new Blob([], { type: 'application/octet-stream' }),
        fileName: '',
        fileSize: 0,
        mimeType: 'application/octet-stream',
        error: errorMsg,
      },
    } satisfies VideoCompressorWorkerResponse);
  }
});
