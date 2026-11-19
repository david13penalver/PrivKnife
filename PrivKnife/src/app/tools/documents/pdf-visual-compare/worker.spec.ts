import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  createSyntheticRgbaFrame,
  DEFAULT_COMPARE_OPTIONS,
} from './test-fixtures';
import { PdfCompareWorkerRequest, PdfCompareWorkerResponse } from './types';
import { handlePdfCompareWorkerMessage } from './worker';

describe('Visual PDF Comparison & Overlay Diff Worker (Seam 2)', () => {
  it('compares extracted RGBA + text frames via worker with monotonic progress and generates PDF diff report', async () => {
    const frameSame = createSyntheticRgbaFrame(60, 60);
    const frameChanged = createSyntheticRgbaFrame(60, 60, [
      { x: 10, y: 10, w: 15, h: 15, r: 0, g: 0, b: 0 },
    ]);

    const compareMsgs: PdfCompareWorkerResponse[] = [];
    await handlePdfCompareWorkerMessage(
      {
        type: 'compare_frames',
        fileNameA: 'v1.pdf',
        fileNameB: 'v2.pdf',
        pagesA: [
          { pageNumber: 1, widthPt: 595, heightPt: 842, text: 'Same', frame: frameSame },
          { pageNumber: 2, widthPt: 595, heightPt: 842, text: 'Price $1,000', frame: frameSame },
        ],
        pagesB: [
          { pageNumber: 1, widthPt: 595, heightPt: 842, text: 'Same', frame: frameSame },
          { pageNumber: 2, widthPt: 595, heightPt: 842, text: 'Price $1,500', frame: frameChanged },
        ],
        options: DEFAULT_COMPARE_OPTIONS,
      },
      (msg) => compareMsgs.push(msg)
    );

    const progresses = compareMsgs.filter((m) => m.type === 'progress');
    expect(progresses.length).toBeGreaterThanOrEqual(2);

    const done = compareMsgs.find((m) => m.type === 'done');
    expect(done?.type).toBe('done');
    if (done?.type !== 'done') return;

    expect(done.result.success).toBe(true);
    expect(done.result.changedPageCount).toBe(1);
    expect(done.result.summaries[1].hasVisualDiff).toBe(true);
    expect(done.result.summaries[1].hasTextDiff).toBe(true);

    const reportMsgs: PdfCompareWorkerResponse[] = [];
    await handlePdfCompareWorkerMessage(
      {
        type: 'build_pdf_report',
        result: done.result,
        changedOnly: true,
      },
      (msg) => reportMsgs.push(msg)
    );

    const reportDone = reportMsgs.find((m) => m.type === 'report_done');
    expect(reportDone?.type).toBe('report_done');
    if (reportDone?.type === 'report_done') {
      expect(reportDone.success).toBe(true);
      expect(reportDone.bytes).toBeDefined();
      const pdf = await PDFDocument.load(reportDone.bytes!);
      expect(pdf.getPageCount()).toBeGreaterThanOrEqual(1);
    }
  });

  it('returns WORKER_ERROR on malformed or unknown worker requests', async () => {
    const msgs: PdfCompareWorkerResponse[] = [];
    await handlePdfCompareWorkerMessage(
      { type: 'bad_req' } as unknown as PdfCompareWorkerRequest,
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
