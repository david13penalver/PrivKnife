/// <reference lib="webworker" />

import { sanitizePdf } from './engine';
import type { RedactionWorkerRequest, RedactionWorkerResponse } from './types';

addEventListener('message', async ({ data }: MessageEvent<RedactionWorkerRequest>) => {
  try {
    const bytes = Uint8Array.from(await sanitizePdf(data.buffer, data.redactions));
    postMessage({ bytes } satisfies RedactionWorkerResponse, { transfer: [bytes.buffer] });
  } catch {
    postMessage({ error: 'PDF rendering failed. No redacted PDF was created.' } satisfies RedactionWorkerResponse);
  }
});
