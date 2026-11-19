import { describe, expect, it } from 'vitest';
import { createSyntheticPdf, DEFAULT_CROPPER_OPTIONS } from './test-fixtures';
import { PdfCropperWorkerRequest, PdfCropperWorkerResponse } from './types';
import { handlePdfCropperWorkerMessage } from './worker';

describe('PDF Cropper, Resizer & N-Up Booklet Worker (Seam 2)', () => {
  it('handles crop and booklet requests with monotonic progress updates', async () => {
    const srcBytes = await createSyntheticPdf(6, { width: 595, height: 842 });
    const cropMsgs: PdfCropperWorkerResponse[] = [];

    await handlePdfCropperWorkerMessage(
      {
        type: 'process',
        pdfBytes: srcBytes,
        fileName: 'report.pdf',
        options: {
          ...DEFAULT_CROPPER_OPTIONS,
          mode: 'crop',
          crop: {
            ...DEFAULT_CROPPER_OPTIONS.crop,
            insetsPt: { top: 20, right: 20, bottom: 20, left: 20 },
          },
        },
      },
      (msg) => cropMsgs.push(msg)
    );

    const progresses = cropMsgs.filter((m) => m.type === 'progress');
    expect(progresses.length).toBeGreaterThanOrEqual(2);
    const doneCrop = cropMsgs.find((m) => m.type === 'done');
    expect(doneCrop?.type).toBe('done');
    if (doneCrop?.type === 'done') {
      expect(doneCrop.result.success).toBe(true);
      expect(doneCrop.result.outputPageCount).toBe(6);
      expect(doneCrop.result.fileName).toBe('report-cropped.pdf');
    }

    const bookletMsgs: PdfCropperWorkerResponse[] = [];
    await handlePdfCropperWorkerMessage(
      {
        type: 'process',
        pdfBytes: srcBytes,
        fileName: 'zine.pdf',
        options: {
          ...DEFAULT_CROPPER_OPTIONS,
          mode: 'booklet',
        },
      },
      (msg) => bookletMsgs.push(msg)
    );
    const doneBooklet = bookletMsgs.find((m) => m.type === 'done');
    expect(doneBooklet?.type).toBe('done');
    if (doneBooklet?.type === 'done') {
      expect(doneBooklet.result.success).toBe(true);
      expect(doneBooklet.result.outputPageCount).toBe(4);
      expect(doneBooklet.result.impositionMap).toEqual([
        { sheet: 1, side: 'front', pages: [null, 1] },
        { sheet: 1, side: 'back', pages: [2, null] },
        { sheet: 2, side: 'front', pages: [6, 3] },
        { sheet: 2, side: 'back', pages: [4, 5] },
      ]);
    }
  });

  it('returns INVALID_INSETS cleanly on degenerate crop boxes', async () => {
    const srcBytes = await createSyntheticPdf(1, { width: 200, height: 200 });
    const msgs: PdfCropperWorkerResponse[] = [];

    await handlePdfCropperWorkerMessage(
      {
        type: 'process',
        pdfBytes: srcBytes,
        fileName: 'small.pdf',
        options: {
          ...DEFAULT_CROPPER_OPTIONS,
          mode: 'crop',
          crop: {
            ...DEFAULT_CROPPER_OPTIONS.crop,
            insetsPt: { top: 0, right: 120, bottom: 0, left: 100 },
          },
        },
      },
      (msg) => msgs.push(msg)
    );

    const done = msgs.find((m) => m.type === 'done');
    expect(done?.type).toBe('done');
    if (done?.type === 'done') {
      expect(done.result.success).toBe(false);
      expect(done.result.errorCode).toBe('INVALID_INSETS');
    }
  });

  it('returns WORKER_ERROR on malformed or unsupported worker payloads', async () => {
    const msgs: PdfCropperWorkerResponse[] = [];

    await handlePdfCropperWorkerMessage(
      { type: 'invalid_action' } as unknown as PdfCropperWorkerRequest,
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
