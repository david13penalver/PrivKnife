import { describe, expect, it, vi } from 'vitest';
import { handlePdfWatermarkWorkerMessage } from './worker';
import {
  createCorruptPdfBytes,
  createSyntheticPdf,
  DEFAULT_WATERMARK_OPTIONS,
} from './test-fixtures';
import { PdfWatermarkWorkerResponse } from './types';

describe('PDF Watermark & Bates Stamper Web Worker (Seam 2)', () => {
  it('streams progress events and emits final done result for valid PDF input', async () => {
    const pdfBytes = await createSyntheticPdf(3);
    const messages: PdfWatermarkWorkerResponse[] = [];

    await handlePdfWatermarkWorkerMessage(
      {
        type: 'stamp',
        pdfBytes,
        fileName: 'agreement.pdf',
        options: DEFAULT_WATERMARK_OPTIONS,
      },
      (msg) => messages.push(msg)
    );

    const progressMsgs = messages.filter((m) => m.type === 'progress');
    const doneMsgs = messages.filter((m) => m.type === 'done');

    expect(progressMsgs.length).toBeGreaterThan(0);
    expect(doneMsgs).toHaveLength(1);
    const done = doneMsgs[0];
    if (done.type !== 'done') throw new Error('Expected done payload');
    expect(done.result.success).toBe(true);
    expect(done.result.fileName).toBe('agreement-stamped.pdf');
    expect(done.result.pagesStamped).toBe(3);
    expect(done.result.blob).toBeInstanceOf(Blob);
  });

  it('emits structured CORRUPT_PDF error result without throwing on corrupt PDF input', async () => {
    const messages: PdfWatermarkWorkerResponse[] = [];

    await handlePdfWatermarkWorkerMessage(
      {
        type: 'stamp',
        pdfBytes: createCorruptPdfBytes(),
        fileName: 'broken.pdf',
        options: DEFAULT_WATERMARK_OPTIONS,
      },
      (msg) => messages.push(msg)
    );

    expect(messages).toHaveLength(1);
    const done = messages[0];
    expect(done.type).toBe('done');
    if (done.type === 'done') {
      expect(done.result.success).toBe(false);
      expect(done.result.errorCode).toBe('CORRUPT_PDF');
    }
  });

  it('handles unknown/malformed worker request payloads safely', async () => {
    const postSpy = vi.fn();
    await handlePdfWatermarkWorkerMessage({ type: 'invalid' } as any, postSpy);

    expect(postSpy).toHaveBeenCalledTimes(1);
    const msg = postSpy.mock.calls[0][0] as PdfWatermarkWorkerResponse;
    expect(msg.type).toBe('done');
    if (msg.type === 'done') {
      expect(msg.result.success).toBe(false);
      expect(msg.result.errorCode).toBe('WORKER_ERROR');
    }
  });
});
