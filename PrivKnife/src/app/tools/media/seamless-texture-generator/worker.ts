/// <reference lib="webworker" />
import { processTexture } from './engine';
import { TextureWorkerRequest, TextureWorkerResponse } from './types';

addEventListener('message', async (event: MessageEvent<TextureWorkerRequest>) => {
  const { id, type, source, options } = event.data;

  if (type === 'PROCESS_TEXTURE') {
    try {
      const result = await processTexture(source, options);
      const response: TextureWorkerResponse = {
        id,
        type: 'SUCCESS',
        result,
      };
      postMessage(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Worker processing failed';
      const response: TextureWorkerResponse = {
        id,
        type: 'ERROR',
        error: message,
      };
      postMessage(response);
    }
  }
});
