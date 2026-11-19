/// <reference lib="webworker" />

import { convertExtractedDocument } from './engine';
import {
  PdfToWordDeps,
  PdfToWordWorkerRequest,
  PdfToWordWorkerResponse,
} from './types';

export async function handlePdfToWordWorkerMessage(
  data: PdfToWordWorkerRequest,
  post: (msg: PdfToWordWorkerResponse) => void,
  deps: PdfToWordDeps = {}
): Promise<void> {
  if (!data || data.type !== 'convert') {
    post({
      type: 'done',
      result: {
        success: false,
        blocks: [],
        markdown: '',
        plainText: '',
        sanitizedHtml: '',
        fileName: 'document.docx',
        wordCount: 0,
        headingCount: 0,
        isScannedFallbackNeeded: false,
        errorCode: 'WORKER_ERROR',
        error: 'Unsupported worker request payload.',
      },
    });
    return;
  }

  try {
    const result = await convertExtractedDocument(
      data.spans,
      data.pageSizes,
      data.fileName,
      data.options,
      (percent, stage) => {
        deps.onProgress?.(percent, stage);
        post({ type: 'progress', percent, stage });
      }
    );
    post({ type: 'done', result });
  } catch (err: unknown) {
    post({
      type: 'done',
      result: {
        success: false,
        blocks: [],
        markdown: '',
        plainText: '',
        sanitizedHtml: '',
        fileName: 'document.docx',
        wordCount: 0,
        headingCount: 0,
        isScannedFallbackNeeded: false,
        errorCode: 'WORKER_ERROR',
        error: err instanceof Error ? err.message : 'PDF to Word worker failed.',
      },
    });
  }
}

if (
  typeof WorkerGlobalScope !== 'undefined' &&
  typeof self !== 'undefined' &&
  self instanceof WorkerGlobalScope
) {
  addEventListener('message', (event: MessageEvent<PdfToWordWorkerRequest>) => {
    void handlePdfToWordWorkerMessage(event.data, (msg) => postMessage(msg));
  });
}
