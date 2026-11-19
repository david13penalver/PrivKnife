/// <reference lib="webworker" />

import { inspectPdfEncryption, protectPdf, unlockPdf } from './engine';
import {
  PdfPasswordWorkerRequest,
  PdfPasswordWorkerResponse,
  PdfSecurityDeps,
} from './types';

export async function handlePdfPasswordWorkerMessage(
  data: PdfPasswordWorkerRequest,
  post: (msg: PdfPasswordWorkerResponse) => void,
  deps: PdfSecurityDeps = {}
): Promise<void> {
  if (!data || typeof data !== 'object') {
    post({
      type: 'done',
      result: {
        success: false,
        mode: 'protect',
        fileName: 'document-protected.pdf',
        fileSize: 0,
        errorCode: 'WORKER_ERROR',
        error: 'Malformed worker request payload.',
      },
    });
    return;
  }

  if (data.type === 'inspect') {
    try {
      const info = await inspectPdfEncryption(data.pdfBytes);
      post({ type: 'inspect_done', info });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to inspect PDF encryption.';
      post({
        type: 'inspect_done',
        error: msg,
        errorCode: 'INVALID_PDF',
      });
    }
    return;
  }

  if (data.type === 'protect') {
    try {
      const result = await protectPdf(data.pdfBytes, data.fileName, data.options, {
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
          mode: 'protect',
          fileName: 'document-protected.pdf',
          fileSize: 0,
          errorCode: 'WORKER_ERROR',
          error: err instanceof Error ? err.message : 'PDF encryption worker failed.',
        },
      });
    }
    return;
  }

  if (data.type === 'unlock') {
    try {
      const result = await unlockPdf(data.pdfBytes, data.fileName, data.options, {
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
          mode: 'unlock',
          fileName: 'document-unlocked.pdf',
          fileSize: 0,
          errorCode: 'WORKER_ERROR',
          error: err instanceof Error ? err.message : 'PDF decryption worker failed.',
        },
      });
    }
    return;
  }

  post({
    type: 'done',
    result: {
      success: false,
      mode: 'protect',
      fileName: 'document-protected.pdf',
      fileSize: 0,
      errorCode: 'WORKER_ERROR',
      error: 'Unsupported worker request type.',
    },
  });
}

if (
  typeof WorkerGlobalScope !== 'undefined' &&
  typeof self !== 'undefined' &&
  self instanceof WorkerGlobalScope
) {
  addEventListener('message', (event: MessageEvent<PdfPasswordWorkerRequest>) => {
    void handlePdfPasswordWorkerMessage(event.data, (msg) => postMessage(msg));
  });
}
