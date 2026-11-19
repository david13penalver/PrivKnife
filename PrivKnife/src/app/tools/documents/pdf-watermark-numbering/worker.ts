/// <reference lib="webworker" />

import { applyWatermarkAndNumbering } from './engine';
import {
  PdfWatermarkDeps,
  PdfWatermarkWorkerRequest,
  PdfWatermarkWorkerResponse,
} from './types';

export async function handlePdfWatermarkWorkerMessage(
  data: PdfWatermarkWorkerRequest,
  post: (msg: PdfWatermarkWorkerResponse) => void,
  deps: PdfWatermarkDeps = {}
): Promise<void> {
  if (!data || data.type !== 'stamp') {
    post({
      type: 'done',
      result: {
        success: false,
        fileName: 'document-stamped.pdf',
        fileSize: 0,
        pagesStamped: 0,
        totalPages: 0,
        winAnsiSubstitutions: 0,
        errorCode: 'WORKER_ERROR',
        error: 'Unsupported worker request payload.',
      },
    });
    return;
  }

  try {
    const result = await applyWatermarkAndNumbering(
      data.pdfBytes,
      data.fileName,
      data.options,
      {
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
        fileName: 'document-stamped.pdf',
        fileSize: 0,
        pagesStamped: 0,
        totalPages: 0,
        winAnsiSubstitutions: 0,
        errorCode: 'WORKER_ERROR',
        error:
          err instanceof Error
            ? err.message
            : 'PDF stamping failed inside worker.',
      },
    });
  }
}

if (
  typeof WorkerGlobalScope !== 'undefined' &&
  typeof self !== 'undefined' &&
  self instanceof WorkerGlobalScope
) {
  addEventListener('message', (event: MessageEvent<PdfWatermarkWorkerRequest>) => {
    void handlePdfWatermarkWorkerMessage(event.data, (msg) => postMessage(msg));
  });
}
