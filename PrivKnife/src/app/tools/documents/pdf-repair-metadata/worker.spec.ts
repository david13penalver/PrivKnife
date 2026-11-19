import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCorruptedXrefAndGarbagePdf,
  createFakePngBytes,
  createJavaScriptActionPdf,
} from './test-fixtures';
import {
  DEFAULT_PDF_REPAIR_OPTIONS,
  PdfRepairWorkerRequest,
  PdfRepairWorkerResponse,
} from './types';
import { handlePdfRepairWorkerMessage } from './worker';

describe('PDF Repair, Metadata & PDF/A Worker (Seam 2)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
  });

  it('handles inspect request on damaged PDF and reports 32-byte leading garbage + XRef warnings', async () => {
    const messages: PdfRepairWorkerResponse[] = [];
    const brokenBytes = await createCorruptedXrefAndGarbagePdf();

    await handlePdfRepairWorkerMessage(
      { type: 'inspect', pdfBytes: brokenBytes },
      (msg) => messages.push(msg)
    );

    expect(messages).toHaveLength(1);
    const first = messages[0];
    expect(first.type).toBe('inspected');
    if (first.type === 'inspected') {
      expect(first.report.leadingGarbageBytes).toBe(32);
      expect(first.report.hasXrefWarnings).toBe(true);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
  });

  it('handles process request in pdfa mode with monotonic progress, transferable buffer, and archivalChecklist', async () => {
    const messages: PdfRepairWorkerResponse[] = [];
    const transferredList: Transferable[][] = [];
    const jsBytes = await createJavaScriptActionPdf();

    await handlePdfRepairWorkerMessage(
      {
        type: 'process',
        pdfBytes: jsBytes,
        fileName: 'policy.pdf',
        options: {
          ...DEFAULT_PDF_REPAIR_OPTIONS,
          mode: 'pdfa',
          stripJavaScriptAndActions: true,
        },
      },
      (msg, transfer) => {
        messages.push(msg);
        if (transfer) transferredList.push(transfer);
      }
    );

    const progressMsgs = messages.filter((m) => m.type === 'progress');
    expect(progressMsgs.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < progressMsgs.length; i++) {
      if (progressMsgs[i].type === 'progress' && progressMsgs[i - 1].type === 'progress') {
        expect(progressMsgs[i].percent).toBeGreaterThanOrEqual(
          progressMsgs[i - 1].percent
        );
      }
    }

    const doneMsg = messages.find((m) => m.type === 'done');
    expect(doneMsg?.type).toBe('done');
    if (doneMsg?.type === 'done') {
      expect(doneMsg.result.success).toBe(true);
      expect(doneMsg.pdfBuffer).toBeInstanceOf(ArrayBuffer);
      const sig = new TextDecoder().decode(
        new Uint8Array(doneMsg.pdfBuffer!).subarray(0, 5)
      );
      expect(sig).toBe('%PDF-');
      expect(transferredList.some((t) => t.includes(doneMsg.pdfBuffer!))).toBe(true);
      expect(doneMsg.result.archivalChecklist?.length).toBeGreaterThanOrEqual(4);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns error worker message cleanly for non-PDF PNG bytes and invalid worker payloads', async () => {
    const pngMessages: PdfRepairWorkerResponse[] = [];
    await handlePdfRepairWorkerMessage(
      { type: 'inspect', pdfBytes: createFakePngBytes() },
      (msg) => pngMessages.push(msg)
    );
    expect(pngMessages[0]?.type).toBe('error');

    const badMessages: PdfRepairWorkerResponse[] = [];
    await handlePdfRepairWorkerMessage(
      { type: 'invalid' } as unknown as PdfRepairWorkerRequest,
      (msg) => badMessages.push(msg)
    );
    expect(badMessages[0]?.type).toBe('error');
  });
});
