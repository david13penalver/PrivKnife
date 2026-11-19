/// <reference lib="webworker" />

import { buildPdfDiffReport, compareExtractedDocuments } from './engine';
import {
  PdfCompareWorkerRequest,
  PdfCompareWorkerResponse,
  PdfVisualCompareDeps,
} from './types';

export async function handlePdfCompareWorkerMessage(
  data: PdfCompareWorkerRequest,
  post: (msg: PdfCompareWorkerResponse) => void,
  deps: PdfVisualCompareDeps = {}
): Promise<void> {
  if (!data || typeof data !== 'object') {
    post({
      type: 'done',
      result: {
        success: false,
        fileNameA: '',
        fileNameB: '',
        totalPairs: 0,
        changedPageCount: 0,
        pagesA: 0,
        pagesB: 0,
        summaries: [],
        errorCode: 'WORKER_ERROR',
        error: 'Malformed worker request payload.',
      },
    });
    return;
  }

  if (data.type === 'compare_frames') {
    try {
      const result = compareExtractedDocuments(
        data.fileNameA,
        data.fileNameB,
        data.pagesA,
        data.pagesB,
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
          fileNameA: data.fileNameA ?? '',
          fileNameB: data.fileNameB ?? '',
          totalPairs: 0,
          changedPageCount: 0,
          pagesA: 0,
          pagesB: 0,
          summaries: [],
          errorCode: 'WORKER_ERROR',
          error: err instanceof Error ? err.message : 'PDF comparison worker failed.',
        },
      });
    }
    return;
  }

  if (data.type === 'build_pdf_report') {
    try {
      const rep = await buildPdfDiffReport(data.result, data.changedOnly);
      post({
        type: 'report_done',
        success: rep.success,
        blob: rep.blob,
        bytes: rep.bytes,
        fileName: rep.fileName,
        error: rep.error,
      });
    } catch (err: unknown) {
      post({
        type: 'report_done',
        success: false,
        fileName: 'privknife-pdf-diff-report.pdf',
        error: err instanceof Error ? err.message : 'Failed to build diff report.',
      });
    }
    return;
  }

  post({
    type: 'done',
    result: {
      success: false,
      fileNameA: '',
      fileNameB: '',
      totalPairs: 0,
      changedPageCount: 0,
      pagesA: 0,
      pagesB: 0,
      summaries: [],
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
  addEventListener('message', (event: MessageEvent<PdfCompareWorkerRequest>) => {
    void handlePdfCompareWorkerMessage(event.data, (msg) => postMessage(msg));
  });
}
