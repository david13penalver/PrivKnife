import { describe, expect, it, vi } from 'vitest';
import { handlePdfCompressorWorkerMessage } from './worker';
import {
  createCorruptPdfBytes,
  createMockReencoder,
  createSyntheticImagePdf,
  DEFAULT_COMPRESSOR_OPTIONS,
} from './test-fixtures';
import { PdfCompressorWorkerResponse } from './types';

describe('PDF Compressor Web Worker (Seam 2)', () => {
  it('streams progress events and emits final done result for valid single and batch inputs', async () => {
    const docA = await createSyntheticImagePdf({ streamByteSize: 24000 });
    const docB = await createSyntheticImagePdf({ streamByteSize: 26000 });
    const messages: PdfCompressorWorkerResponse[] = [];

    await handlePdfCompressorWorkerMessage(
      {
        type: 'compress',
        files: [
          { fileName: 'alpha.pdf', bytes: docA },
          { fileName: 'beta.pdf', bytes: docB },
        ],
        options: DEFAULT_COMPRESSOR_OPTIONS,
      },
      (msg) => messages.push(msg),
      { reencodeImage: createMockReencoder(1200) }
    );

    const progressMsgs = messages.filter((m) => m.type === 'progress');
    const doneMsgs = messages.filter((m) => m.type === 'done');

    expect(progressMsgs.length).toBeGreaterThan(0);
    expect(doneMsgs).toHaveLength(1);
    const done = doneMsgs[0];
    if (done.type !== 'done') throw new Error('Expected done message');
    expect(done.result.success).toBe(true);
    expect(done.result.files).toHaveLength(2);
    expect(done.result.bundleZipBlob).toBeInstanceOf(Blob);
  });

  it('emits structured CORRUPT_PDF error result without throwing on corrupt PDF input', async () => {
    const messages: PdfCompressorWorkerResponse[] = [];

    await handlePdfCompressorWorkerMessage(
      {
        type: 'compress',
        files: [{ fileName: 'bad.pdf', bytes: createCorruptPdfBytes() }],
        options: DEFAULT_COMPRESSOR_OPTIONS,
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

  it('handles unknown/malformed worker request payloads safely without unhandled exceptions', async () => {
    const postSpy = vi.fn();

    await handlePdfCompressorWorkerMessage(
      { type: 'unknown' } as any,
      postSpy
    );

    expect(postSpy).toHaveBeenCalledTimes(1);
    const payload = postSpy.mock.calls[0][0] as PdfCompressorWorkerResponse;
    expect(payload.type).toBe('done');
    if (payload.type === 'done') {
      expect(payload.result.success).toBe(false);
      expect(payload.result.errorCode).toBe('WORKER_ERROR');
    }
  });
});
