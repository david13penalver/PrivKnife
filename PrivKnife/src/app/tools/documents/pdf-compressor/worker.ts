/// <reference lib="webworker" />

import { compressBatchPdfs } from './engine';
import {
  PdfCompressorDeps,
  PdfCompressorWorkerRequest,
  PdfCompressorWorkerResponse,
} from './types';

export async function handlePdfCompressorWorkerMessage(
  data: PdfCompressorWorkerRequest,
  post: (msg: PdfCompressorWorkerResponse) => void,
  deps: PdfCompressorDeps = {}
): Promise<void> {
  if (!data || data.type !== 'compress') {
    post({
      type: 'done',
      result: {
        success: false,
        files: [],
        errorCode: 'WORKER_ERROR',
        error: 'Unsupported worker request payload.',
      },
    });
    return;
  }

  try {
    const result = await compressBatchPdfs(data.files, data.options, {
      ...deps,
      onProgress: (percent, stage) => {
        deps.onProgress?.(percent, stage);
        post({ type: 'progress', percent, stage });
      },
    });
    post({ type: 'done', result });
  } catch (err: unknown) {
    post({
      type: 'done',
      result: {
        success: false,
        files: [],
        errorCode: 'WORKER_ERROR',
        error: err instanceof Error ? err.message : 'PDF compression worker failed.',
      },
    });
  }
}

if (
  typeof WorkerGlobalScope !== 'undefined' &&
  typeof self !== 'undefined' &&
  self instanceof WorkerGlobalScope
) {
  addEventListener('message', (event: MessageEvent<PdfCompressorWorkerRequest>) => {
    void handlePdfCompressorWorkerMessage(event.data, (msg) => postMessage(msg));
  });
}
