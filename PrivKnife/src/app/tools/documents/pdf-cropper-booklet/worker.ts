/// <reference lib="webworker" />

import { processPdfCropperBooklet } from './engine';
import {
  PdfCropperBookletDeps,
  PdfCropperWorkerRequest,
  PdfCropperWorkerResponse,
} from './types';

export async function handlePdfCropperWorkerMessage(
  data: PdfCropperWorkerRequest,
  post: (msg: PdfCropperWorkerResponse) => void,
  deps: PdfCropperBookletDeps = {}
): Promise<void> {
  if (!data || data.type !== 'process') {
    post({
      type: 'done',
      result: {
        success: false,
        mode: 'crop',
        fileName: 'document-cropped.pdf',
        fileSize: 0,
        outputPageCount: 0,
        errorCode: 'WORKER_ERROR',
        error: 'Unsupported worker request payload.',
      },
    });
    return;
  }

  try {
    const result = await processPdfCropperBooklet(
      data.pdfBytes,
      data.fileName,
      data.options,
      {
        ...deps,
        onProgress: (percent, stage) => {
          deps.onProgress?.(percent, stage);
          post({ type: 'progress', percent, stage });
        },
      }
    );
    post({ type: 'done', result });
  } catch (err: unknown) {
    post({
      type: 'done',
      result: {
        success: false,
        mode: data.options?.mode ?? 'crop',
        fileName: 'document-output.pdf',
        fileSize: 0,
        outputPageCount: 0,
        errorCode: 'WORKER_ERROR',
        error: err instanceof Error ? err.message : 'PDF cropper/booklet worker failed.',
      },
    });
  }
}

if (
  typeof WorkerGlobalScope !== 'undefined' &&
  typeof self !== 'undefined' &&
  self instanceof WorkerGlobalScope
) {
  addEventListener('message', (event: MessageEvent<PdfCropperWorkerRequest>) => {
    void handlePdfCropperWorkerMessage(event.data, (msg) => postMessage(msg));
  });
}
