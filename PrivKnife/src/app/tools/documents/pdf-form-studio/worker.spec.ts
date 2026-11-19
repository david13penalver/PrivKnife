import { describe, expect, it } from 'vitest';
import {
  createNonPdfBytes,
  createSampleAcroFormPdf,
  DEFAULT_COMPILE_OPTIONS,
} from './test-fixtures';
import { PdfFormWorkerRequest, PdfFormWorkerResponse } from './types';
import { handlePdfFormWorkerMessage } from './worker';

describe('Interactive PDF Form Studio Worker (Seam 2)', () => {
  it('inspects valid AcroForm PDFs and reports INVALID_PDF on non-PDF buffers', async () => {
    const sampleBytes = await createSampleAcroFormPdf();
    const okMsgs: PdfFormWorkerResponse[] = [];

    await handlePdfFormWorkerMessage(
      { type: 'inspect', pdfBytes: sampleBytes },
      (msg) => okMsgs.push(msg)
    );

    expect(okMsgs).toHaveLength(1);
    expect(okMsgs[0].type).toBe('inspect_done');
    if (okMsgs[0].type === 'inspect_done') {
      expect(okMsgs[0].inspection?.fields).toHaveLength(7);
      expect(okMsgs[0].inspection?.pageCount).toBe(2);
    }

    const badMsgs: PdfFormWorkerResponse[] = [];
    await handlePdfFormWorkerMessage(
      { type: 'inspect', pdfBytes: createNonPdfBytes() },
      (msg) => badMsgs.push(msg)
    );
    expect(badMsgs[0].type).toBe('inspect_done');
    if (badMsgs[0].type === 'inspect_done') {
      expect(badMsgs[0].errorCode).toBe('INVALID_PDF');
    }
  });

  it('compiles editable and flattened forms via worker with progress updates', async () => {
    const sampleBytes = await createSampleAcroFormPdf();
    const inspectMsgs: PdfFormWorkerResponse[] = [];
    await handlePdfFormWorkerMessage(
      { type: 'inspect', pdfBytes: sampleBytes },
      (msg) => inspectMsgs.push(msg)
    );
    const inspection =
      inspectMsgs[0].type === 'inspect_done'
        ? inspectMsgs[0].inspection!
        : undefined;
    expect(inspection).toBeDefined();

    const edited = inspection!.fields.map((f) =>
      f.name === 'full_name' ? { ...f, value: 'Worker Tester' } : f
    );

    const compileMsgs: PdfFormWorkerResponse[] = [];
    await handlePdfFormWorkerMessage(
      {
        type: 'compile',
        pdfBytes: sampleBytes,
        fields: edited,
        options: {
          ...DEFAULT_COMPILE_OPTIONS,
          flatten: true,
          outputFileName: 'tax.pdf',
        },
      },
      (msg) => compileMsgs.push(msg)
    );

    const progresses = compileMsgs.filter((m) => m.type === 'progress');
    expect(progresses.length).toBeGreaterThanOrEqual(2);
    const done = compileMsgs.find((m) => m.type === 'done');
    expect(done?.type).toBe('done');
    if (done?.type === 'done') {
      expect(done.result.success).toBe(true);
      expect(done.result.flattened).toBe(true);
      expect(done.result.fileName).toBe('tax-flattened.pdf');
      expect(done.result.fieldsPopulated).toBeGreaterThan(0);
    }
  });

  it('returns WORKER_ERROR on malformed or unknown worker request payloads', async () => {
    const msgs: PdfFormWorkerResponse[] = [];

    await handlePdfFormWorkerMessage(
      { type: 'bad_req' } as unknown as PdfFormWorkerRequest,
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
