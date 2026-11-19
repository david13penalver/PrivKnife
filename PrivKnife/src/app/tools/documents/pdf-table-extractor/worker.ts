/// <reference lib="webworker" />

import {
  exportTablesToCsv,
  exportTablesToJson,
  exportTablesToXlsx,
  extractTablesFromTokens,
} from './engine';
import {
  PdfTableExtractorDeps,
  PdfTableWorkerRequest,
  PdfTableWorkerResponse,
} from './types';

export async function handlePdfTableWorkerMessage(
  data: PdfTableWorkerRequest,
  post: (msg: PdfTableWorkerResponse) => void,
  deps: PdfTableExtractorDeps = {}
): Promise<void> {
  if (!data || typeof data !== 'object') {
    post({
      type: 'cluster_done',
      result: {
        success: false,
        tables: [],
        isScannedFallbackNeeded: false,
        totalRows: 0,
        errorCode: 'WORKER_ERROR',
        error: 'Malformed worker request payload.',
      },
    });
    return;
  }

  if (data.type === 'cluster') {
    try {
      const notify = (pct: number, stage: string) => {
        deps.onProgress?.(pct, stage);
        post({ type: 'progress', percent: pct, stage });
      };
      notify(25, 'Detecting column gutters and rows');
      const result = extractTablesFromTokens(
        data.tokens,
        data.pageCount,
        data.options
      );
      notify(100, 'Complete');
      post({ type: 'cluster_done', result });
    } catch (err: unknown) {
      post({
        type: 'cluster_done',
        result: {
          success: false,
          tables: [],
          isScannedFallbackNeeded: false,
          totalRows: 0,
          errorCode: 'WORKER_ERROR',
          error: err instanceof Error ? err.message : 'Spatial clustering worker failed.',
        },
      });
    }
    return;
  }

  if (data.type === 'export') {
    try {
      let artifact;
      if (data.format === 'xlsx') {
        artifact = exportTablesToXlsx(
          data.tables,
          data.baseFileName,
          data.sanitizeCsvFormulas
        );
      } else if (data.format === 'csv') {
        artifact = exportTablesToCsv(
          data.tables,
          data.baseFileName,
          data.sanitizeCsvFormulas
        );
      } else {
        artifact = exportTablesToJson(data.tables, data.baseFileName);
      }
      post({ type: 'export_done', artifact });
    } catch (err: unknown) {
      post({
        type: 'export_done',
        artifact: {
          success: false,
          fileName: 'document-tables',
          fileSize: 0,
          mimeType: 'application/octet-stream',
          error: err instanceof Error ? err.message : 'Table export worker failed.',
        },
      });
    }
    return;
  }

  post({
    type: 'cluster_done',
    result: {
      success: false,
      tables: [],
      isScannedFallbackNeeded: false,
      totalRows: 0,
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
  addEventListener('message', (event: MessageEvent<PdfTableWorkerRequest>) => {
    void handlePdfTableWorkerMessage(event.data, (msg) => postMessage(msg));
  });
}
