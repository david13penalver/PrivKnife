import { describe, expect, it, vi } from 'vitest';
import { handlePdfImageConverterWorkerMessage } from './worker';
import {
  createMockPageRenderer,
  createSyntheticPdf,
  DEFAULT_IMAGES_TO_PDF_OPTIONS,
  DEFAULT_PDF_TO_IMAGES_OPTIONS,
  LANDSCAPE_PNG_BYTES,
  PORTRAIT_PNG_BYTES,
} from './test-fixtures';
import { PdfImageWorkerResponse } from './types';

describe('PDF Image Converter Web Worker (Seam 2)', () => {
  it('handles images_to_pdf with progress updates and returns valid PDF Blob', async () => {
    const messages: PdfImageWorkerResponse[] = [];

    await handlePdfImageConverterWorkerMessage(
      {
        type: 'images_to_pdf',
        images: [
          {
            id: '1',
            fileName: 'p1.png',
            bytes: LANDSCAPE_PNG_BYTES,
            mimeType: 'image/png',
            rotationDeg: 0,
            scanFilter: 'none',
          },
          {
            id: '2',
            fileName: 'p2.png',
            bytes: PORTRAIT_PNG_BYTES,
            mimeType: 'image/png',
            rotationDeg: 0,
            scanFilter: 'none',
          },
        ],
        options: DEFAULT_IMAGES_TO_PDF_OPTIONS,
      },
      (msg) => messages.push(msg)
    );

    expect(messages.some((m) => m.type === 'progress')).toBe(true);
    const done = messages.find((m) => m.type === 'done');
    expect(done).toBeDefined();
    if (done?.type === 'done') {
      expect(done.result.success).toBe(true);
      expect(done.result.itemCount).toBe(2);
      expect(done.result.mimeType).toBe('application/pdf');
      expect(done.result.blob).toBeInstanceOf(Blob);
    }
  });

  it('handles pdf_to_images with injected renderer and propagates INVALID_IMAGE error on corrupt images', async () => {
    const pdfBytes = await createSyntheticPdf(2);
    const pdfMsgs: PdfImageWorkerResponse[] = [];
    await handlePdfImageConverterWorkerMessage(
      {
        type: 'pdf_to_images',
        pdfBytes,
        fileName: 'deck.pdf',
        options: { ...DEFAULT_PDF_TO_IMAGES_OPTIONS, selectedPages: [1, 2] },
      },
      (msg) => pdfMsgs.push(msg),
      { renderPages: createMockPageRenderer('image/png') }
    );

    const pdfDone = pdfMsgs.find((m) => m.type === 'done');
    if (pdfDone?.type !== 'done') throw new Error('Expected done message');
    expect(pdfDone.result.success).toBe(true);
    expect(pdfDone.result.mimeType).toBe('application/zip');

    const errMsgs: PdfImageWorkerResponse[] = [];
    await handlePdfImageConverterWorkerMessage(
      {
        type: 'images_to_pdf',
        images: [
          {
            id: 'bad',
            fileName: 'broken.png',
            bytes: Uint8Array.from('BAD', (c) => c.charCodeAt(0)),
            mimeType: 'image/png',
            rotationDeg: 0,
            scanFilter: 'none',
          },
        ],
        options: DEFAULT_IMAGES_TO_PDF_OPTIONS,
      },
      (msg) => errMsgs.push(msg)
    );

    const errDone = errMsgs.find((m) => m.type === 'done');
    if (errDone?.type !== 'done') throw new Error('Expected done message');
    expect(errDone.result.success).toBe(false);
    expect(errDone.result.errorCode).toBe('INVALID_IMAGE');
  });

  it('handles unknown worker request payloads cleanly', async () => {
    const postSpy = vi.fn();
    await handlePdfImageConverterWorkerMessage({ type: 'noop' } as any, postSpy);

    expect(postSpy).toHaveBeenCalledTimes(1);
    const msg = postSpy.mock.calls[0][0] as PdfImageWorkerResponse;
    expect(msg.type).toBe('done');
    if (msg.type === 'done') {
      expect(msg.result.success).toBe(false);
      expect(msg.result.errorCode).toBe('WORKER_ERROR');
    }
  });
});
