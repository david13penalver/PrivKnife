import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { extractTextTokensWithPdfJs } from './engine';
import {
  createTwoPageLedgerPdf,
  DEFAULT_TABLE_EXTRACTOR_OPTIONS,
} from './test-fixtures';
import { PdfTableWorkerRequest, PdfTableWorkerResponse } from './types';
import { handlePdfTableWorkerMessage } from './worker';

describe('PDF Table Extractor Worker (Seam 2)', () => {
  it('clusters tokens and exports .xlsx, .csv, and .json via worker messages', async () => {
    const pdfBytes = await createTwoPageLedgerPdf();
    const extracted = await extractTextTokensWithPdfJs(pdfBytes);
    const clusterMsgs: PdfTableWorkerResponse[] = [];

    await handlePdfTableWorkerMessage(
      {
        type: 'cluster',
        tokens: extracted.tokens,
        pageCount: extracted.pageCount,
        options: DEFAULT_TABLE_EXTRACTOR_OPTIONS,
      },
      (msg) => clusterMsgs.push(msg)
    );

    expect(clusterMsgs.filter((m) => m.type === 'progress').length).toBeGreaterThanOrEqual(2);
    const doneCluster = clusterMsgs.find((m) => m.type === 'cluster_done');
    expect(doneCluster?.type).toBe('cluster_done');
    if (doneCluster?.type !== 'cluster_done') return;

    expect(doneCluster.result.success).toBe(true);
    expect(doneCluster.result.tables[0].rows).toHaveLength(5);

    for (const fmt of ['xlsx', 'csv', 'json'] as const) {
      const exportMsgs: PdfTableWorkerResponse[] = [];
      await handlePdfTableWorkerMessage(
        {
          type: 'export',
          tables: doneCluster.result.tables,
          format: fmt,
          baseFileName: 'q1-ledger.pdf',
          sanitizeCsvFormulas: true,
        },
        (msg) => exportMsgs.push(msg)
      );

      const exportDone = exportMsgs.find((m) => m.type === 'export_done');
      expect(exportDone?.type).toBe('export_done');
      if (exportDone?.type !== 'export_done') return;
      expect(exportDone.artifact.success).toBe(true);
      expect(exportDone.artifact.fileName).toBe(`q1-ledger-tables.${fmt}`);

      if (fmt === 'xlsx') {
        const wb = XLSX.read(exportDone.artifact.bytes!, { type: 'array' });
        expect(wb.SheetNames).toEqual(['Table 1']);
      }
    }
  });

  it('returns WORKER_ERROR on malformed or unknown worker request payloads', async () => {
    const msgs: PdfTableWorkerResponse[] = [];
    await handlePdfTableWorkerMessage(
      { type: 'invalid' } as unknown as PdfTableWorkerRequest,
      (msg) => msgs.push(msg)
    );

    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({
      type: 'cluster_done',
      result: {
        success: false,
        errorCode: 'WORKER_ERROR',
      },
    });
  });
});
