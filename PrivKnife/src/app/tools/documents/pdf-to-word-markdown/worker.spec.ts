import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { extractStyledSpansWithPdfJs } from './engine';
import {
  createStructuredSamplePdf,
  DEFAULT_PDF_TO_WORD_OPTIONS,
} from './test-fixtures';
import { PdfToWordWorkerRequest, PdfToWordWorkerResponse } from './types';
import { handlePdfToWordWorkerMessage } from './worker';

describe('PDF to Word (DOCX) & Markdown Worker (Seam 2)', () => {
  it('converts styled spans into valid OOXML .docx and Markdown with progress events', async () => {
    const pdfBytes = await createStructuredSamplePdf();
    const extracted = await extractStyledSpansWithPdfJs(pdfBytes);
    const msgs: PdfToWordWorkerResponse[] = [];

    await handlePdfToWordWorkerMessage(
      {
        type: 'convert',
        spans: extracted.spans,
        pageSizes: extracted.pageSizes,
        fileName: 'privacy-report.pdf',
        options: DEFAULT_PDF_TO_WORD_OPTIONS,
      },
      (msg) => msgs.push(msg)
    );

    const progresses = msgs.filter((m) => m.type === 'progress');
    expect(progresses.length).toBeGreaterThanOrEqual(2);
    const done = msgs.find((m) => m.type === 'done');
    expect(done?.type).toBe('done');
    if (done?.type !== 'done') return;

    expect(done.result.success).toBe(true);
    expect(done.result.fileName).toBe('privacy-report.docx');
    expect(done.result.markdown).toContain('# Annual Privacy Architecture Report');
    const zip = await JSZip.loadAsync(done.result.docxBytes!);
    expect(zip.file('word/document.xml')).not.toBeNull();
  });

  it('returns WORKER_ERROR on malformed or unknown worker requests', async () => {
    const msgs: PdfToWordWorkerResponse[] = [];
    await handlePdfToWordWorkerMessage(
      { type: 'unknown_cmd' } as unknown as PdfToWordWorkerRequest,
      (msg) => msgs.push(msg)
    );

    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({
      type: 'done',
      result: {
        success: false,
        errorCode: 'WORKER_ERROR',
      },
    });
  });
});
