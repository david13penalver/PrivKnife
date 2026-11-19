/// <reference lib="webworker" />

import { convertImagesToPdf, convertPdfToImages } from './engine';
import {
  PdfImageConverterDeps,
  PdfImageWorkerRequest,
  PdfImageWorkerResponse,
} from './types';

export async function handlePdfImageConverterWorkerMessage(
  data: PdfImageWorkerRequest,
  post: (msg: PdfImageWorkerResponse) => void,
  deps: PdfImageConverterDeps = {}
): Promise<void> {
  const forwardDeps: PdfImageConverterDeps = {
    ...deps,
    onProgress: (percent, stage) => {
      deps.onProgress?.(percent, stage);
      post({ type: 'progress', percent, stage });
    },
  };

  try {
    if (data?.type === 'pdf_to_images') {
      const result = await convertPdfToImages(
        data.pdfBytes,
        data.fileName,
        data.options,
        forwardDeps
      );
      post({ type: 'done', result });
      return;
    }

    if (data?.type === 'images_to_pdf') {
      const result = await convertImagesToPdf(
        data.images,
        data.options,
        forwardDeps
      );
      post({ type: 'done', result });
      return;
    }

    post({
      type: 'done',
      result: {
        success: false,
        fileName: 'output',
        fileSize: 0,
        mimeType: 'application/octet-stream',
        itemCount: 0,
        warnings: [],
        errorCode: 'WORKER_ERROR',
        error: 'Unsupported worker request payload.',
      },
    });
  } catch (err: unknown) {
    post({
      type: 'done',
      result: {
        success: false,
        fileName: 'output',
        fileSize: 0,
        mimeType: 'application/octet-stream',
        itemCount: 0,
        warnings: [],
        errorCode: 'WORKER_ERROR',
        error:
          err instanceof Error
            ? err.message
            : 'PDF image conversion failed inside worker.',
      },
    });
  }
}

if (
  typeof WorkerGlobalScope !== 'undefined' &&
  typeof self !== 'undefined' &&
  self instanceof WorkerGlobalScope
) {
  addEventListener('message', (event: MessageEvent<PdfImageWorkerRequest>) => {
    void handlePdfImageConverterWorkerMessage(event.data, (msg) => postMessage(msg));
  });
}
