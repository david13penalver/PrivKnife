/// <reference lib="webworker" />

import { inspectPdfHealth, processPdfRepairMetadata } from './engine';
import {
  PdfRepairDeps,
  PdfRepairWorkerRequest,
  PdfRepairWorkerResponse,
} from './types';

export async function handlePdfRepairWorkerMessage(
  data: PdfRepairWorkerRequest,
  post: (msg: PdfRepairWorkerResponse, transfer?: Transferable[]) => void,
  deps: PdfRepairDeps = {}
): Promise<void> {
  if (!data || (data.type !== 'inspect' && data.type !== 'process')) {
    post({
      type: 'error',
      error: 'Unsupported PDF Repair worker request payload.',
    });
    return;
  }

  try {
    if (data.type === 'inspect') {
      const report = await inspectPdfHealth(data.pdfBytes);
      post({ type: 'inspected', report });
      return;
    }

    const result = await processPdfRepairMetadata(
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

    if (!result.success || !result.pdfBytes) {
      post({
        type: 'error',
        error: result.error || 'PDF repair / archival processing failed.',
      });
      return;
    }

    const pdfBuffer = result.pdfBytes.slice().buffer;
    post(
      {
        type: 'done',
        pdfBuffer,
        result: {
          ...result,
          blob: undefined,
          pdfBytes: undefined,
        },
      },
      [pdfBuffer]
    );
  } catch (err: unknown) {
    post({
      type: 'error',
      error:
        err instanceof Error
          ? err.message
          : 'PDF Repair worker execution failed.',
    });
  }
}

if (
  typeof WorkerGlobalScope !== 'undefined' &&
  typeof self !== 'undefined' &&
  self instanceof WorkerGlobalScope
) {
  addEventListener('message', (event: MessageEvent<PdfRepairWorkerRequest>) => {
    void handlePdfRepairWorkerMessage(event.data, (msg, transfer) => {
      if (transfer && transfer.length > 0) {
        postMessage(msg, transfer);
      } else {
        postMessage(msg);
      }
    });
  });
}
