/// <reference lib="webworker" />

import { compileFormPdf, inspectPdfForm } from './engine';
import {
  PdfFormStudioDeps,
  PdfFormWorkerRequest,
  PdfFormWorkerResponse,
} from './types';

export async function handlePdfFormWorkerMessage(
  data: PdfFormWorkerRequest,
  post: (msg: PdfFormWorkerResponse) => void,
  deps: PdfFormStudioDeps = {}
): Promise<void> {
  if (!data || typeof data !== 'object') {
    post({
      type: 'done',
      result: {
        success: false,
        fileName: 'document-filled.pdf',
        fileSize: 0,
        fieldsPopulated: 0,
        fieldsCreated: 0,
        flattened: false,
        errorCode: 'WORKER_ERROR',
        error: 'Malformed worker request payload.',
      },
    });
    return;
  }

  if (data.type === 'inspect') {
    try {
      const inspection = await inspectPdfForm(data.pdfBytes);
      post({ type: 'inspect_done', inspection });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to inspect PDF form.';
      post({
        type: 'inspect_done',
        errorCode: /encrypt/i.test(msg) ? 'ENCRYPTED_PDF' : 'INVALID_PDF',
        error: msg,
      });
    }
    return;
  }

  if (data.type === 'compile') {
    try {
      const result = await compileFormPdf(
        data.pdfBytes,
        data.fields,
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
          fileName: 'document-filled.pdf',
          fileSize: 0,
          fieldsPopulated: 0,
          fieldsCreated: 0,
          flattened: false,
          errorCode: 'WORKER_ERROR',
          error: err instanceof Error ? err.message : 'PDF form compile worker failed.',
        },
      });
    }
    return;
  }

  post({
    type: 'done',
    result: {
      success: false,
      fileName: 'document-filled.pdf',
      fileSize: 0,
      fieldsPopulated: 0,
      fieldsCreated: 0,
      flattened: false,
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
  addEventListener('message', (event: MessageEvent<PdfFormWorkerRequest>) => {
    void handlePdfFormWorkerMessage(event.data, (msg) => postMessage(msg));
  });
}
