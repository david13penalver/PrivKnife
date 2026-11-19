import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { createNonPdfBytes, createSyntheticPdf, DEFAULT_PROTECT_OPTIONS } from './test-fixtures';
import { PdfPasswordWorkerRequest, PdfPasswordWorkerResponse } from './types';
import { handlePdfPasswordWorkerMessage } from './worker';

describe('PDF Password Protector & Unlocker Worker (Seam 2)', () => {
  it('handles inspect requests for valid unencrypted PDFs and rejects invalid buffers', async () => {
    const srcBytes = await createSyntheticPdf(2);
    const messages: PdfPasswordWorkerResponse[] = [];

    await handlePdfPasswordWorkerMessage(
      { type: 'inspect', pdfBytes: srcBytes },
      (msg) => messages.push(msg)
    );

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      type: 'inspect_done',
      info: {
        isEncrypted: false,
        requiresUserPassword: false,
        algorithm: 'none',
        pageCount: 2,
      },
    });

    const badMessages: PdfPasswordWorkerResponse[] = [];
    await handlePdfPasswordWorkerMessage(
      { type: 'inspect', pdfBytes: createNonPdfBytes() },
      (msg) => badMessages.push(msg)
    );

    expect(badMessages).toHaveLength(1);
    expect(badMessages[0].type).toBe('inspect_done');
    if (badMessages[0].type === 'inspect_done') {
      expect(badMessages[0].errorCode).toBe('INVALID_PDF');
      expect(badMessages[0].error).toBeTruthy();
    }
  });

  it('handles protect -> unlock -> WRONG_PASSWORD via worker message handler', async () => {
    const srcBytes = await createSyntheticPdf(2);
    const protectMsgs: PdfPasswordWorkerResponse[] = [];

    await handlePdfPasswordWorkerMessage(
      {
        type: 'protect',
        pdfBytes: srcBytes,
        fileName: 'secret.pdf',
        options: {
          ...DEFAULT_PROTECT_OPTIONS,
          userPassword: 'WorkerPass!2026',
          ownerPassword: 'OwnerPass!2026',
        },
      },
      (msg) => protectMsgs.push(msg)
    );

    const progressMsgs = protectMsgs.filter((m) => m.type === 'progress');
    expect(progressMsgs.length).toBeGreaterThanOrEqual(2);
    const doneProtect = protectMsgs.find((m) => m.type === 'done');
    expect(doneProtect?.type).toBe('done');
    if (doneProtect?.type !== 'done') return;

    expect(doneProtect.result.success).toBe(true);
    expect(doneProtect.result.fileName).toBe('secret-protected.pdf');
    expect(doneProtect.result.resultingInfo?.algorithm).toBe('AES-256');
    const encryptedBytes = doneProtect.result.bytes!;

    const wrongUnlockMsgs: PdfPasswordWorkerResponse[] = [];
    await handlePdfPasswordWorkerMessage(
      {
        type: 'unlock',
        pdfBytes: encryptedBytes,
        fileName: 'secret-protected.pdf',
        options: { password: 'WrongPassword' },
      },
      (msg) => wrongUnlockMsgs.push(msg)
    );
    const doneWrong = wrongUnlockMsgs.find((m) => m.type === 'done');
    expect(doneWrong?.type).toBe('done');
    if (doneWrong?.type === 'done') {
      expect(doneWrong.result.success).toBe(false);
      expect(doneWrong.result.errorCode).toBe('WRONG_PASSWORD');
    }

    const okUnlockMsgs: PdfPasswordWorkerResponse[] = [];
    await handlePdfPasswordWorkerMessage(
      {
        type: 'unlock',
        pdfBytes: encryptedBytes,
        fileName: 'secret-protected.pdf',
        options: { password: 'WorkerPass!2026' },
      },
      (msg) => okUnlockMsgs.push(msg)
    );
    const doneOk = okUnlockMsgs.find((m) => m.type === 'done');
    expect(doneOk?.type).toBe('done');
    if (doneOk?.type === 'done') {
      expect(doneOk.result.success).toBe(true);
      expect(doneOk.result.fileName).toBe('secret-protected-unlocked.pdf');
      const reloaded = await PDFDocument.load(doneOk.result.bytes!);
      expect(reloaded.getPageCount()).toBe(2);
    }
  });

  it('returns WORKER_ERROR on malformed or unsupported worker request payloads', async () => {
    const messages: PdfPasswordWorkerResponse[] = [];

    await handlePdfPasswordWorkerMessage(
      { type: 'unknown' } as unknown as PdfPasswordWorkerRequest,
      (msg) => messages.push(msg)
    );

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      type: 'done',
      result: {
        success: false,
        errorCode: 'WORKER_ERROR',
      },
    });
  });
});
