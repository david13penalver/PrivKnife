import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleOfficeToPdfWorkerMessage } from './worker';
import {
  createMultiSheetXlsxBytes,
  createSampleDocxBytes,
  MALICIOUS_EXFIL_HTML,
} from './test-fixtures';
import {
  OfficeToPdfWorkerRequest,
  OfficeToPdfWorkerResponse,
} from './types';

describe('Office & HTML to PDF Web Worker (Seam 2)', () => {
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

  it('handles inspect request for .xlsx and reports sheetNames, landscape recommendation, and previewPages', async () => {
    const messages: OfficeToPdfWorkerResponse[] = [];
    const xlsxBytes = createMultiSheetXlsxBytes(30, 8);

    await handleOfficeToPdfWorkerMessage(
      {
        type: 'inspect',
        input: {
          kind: 'binary',
          bytes: xlsxBytes,
          fileName: 'workbook.xlsx',
        },
        options: {},
      },
      (msg) => messages.push(msg)
    );

    expect(messages).toHaveLength(1);
    const msg = messages[0];
    expect(msg.type).toBe('inspected');
    if (msg.type === 'inspected') {
      expect(msg.result.success).toBe(true);
      expect(msg.result.diagnostics.sheetNames).toEqual(['Ledger', 'WideMatrix']);
      expect(msg.result.diagnostics.recommendedOrientation).toBe('landscape');
      expect(msg.result.previewPages.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('handles convert request for .docx with monotonic progress and transferable ArrayBuffer', async () => {
    const messages: OfficeToPdfWorkerResponse[] = [];
    const transferredList: Transferable[][] = [];
    const docxBytes = await createSampleDocxBytes({ includeImage: true });

    await handleOfficeToPdfWorkerMessage(
      {
        type: 'convert',
        input: {
          kind: 'binary',
          bytes: docxBytes,
          fileName: 'brief.docx',
        },
        options: { includePageNumbers: true },
      },
      (msg, transfer) => {
        messages.push(msg);
        if (transfer) transferredList.push(transfer);
      }
    );

    const progressMsgs = messages.filter((m) => m.type === 'progress');
    expect(progressMsgs.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < progressMsgs.length; i++) {
      if (progressMsgs[i].type === 'progress' && progressMsgs[i - 1].type === 'progress') {
        expect(progressMsgs[i].percent).toBeGreaterThanOrEqual(
          progressMsgs[i - 1].percent
        );
      }
    }

    const doneMsg = messages.find((m) => m.type === 'converted');
    expect(doneMsg).toBeDefined();
    if (doneMsg?.type === 'converted') {
      expect(doneMsg.result.success).toBe(true);
      expect(doneMsg.pdfBuffer).toBeInstanceOf(ArrayBuffer);
      const header = new TextDecoder().decode(
        new Uint8Array(doneMsg.pdfBuffer!).subarray(0, 5)
      );
      expect(header).toBe('%PDF-');
      expect(doneMsg.result.previewPages.length).toBeGreaterThanOrEqual(1);
      expect(transferredList.some((t) => t.includes(doneMsg.pdfBuffer!))).toBe(true);
    }
  });

  it('converts malicious HTML inside worker with blockedRemoteUrls >= 3 and zero network calls', async () => {
    const messages: OfficeToPdfWorkerResponse[] = [];
    await handleOfficeToPdfWorkerMessage(
      {
        type: 'convert',
        input: {
          kind: 'text',
          content: MALICIOUS_EXFIL_HTML,
          fileName: 'email.html',
          format: 'html',
        },
        options: {},
      },
      (msg) => messages.push(msg)
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
    const converted = messages.find((m) => m.type === 'converted');
    expect(converted?.type === 'converted').toBe(true);
    if (converted?.type === 'converted') {
      expect(converted.result.success).toBe(true);
      expect(converted.result.diagnostics.blockedRemoteUrls).toBeGreaterThanOrEqual(3);
      expect(converted.result.previewHtml.toLowerCase()).not.toContain('evil.test');
    }
  });

  it('returns error worker message cleanly on corrupt input or unsupported request payload', async () => {
    const messages: OfficeToPdfWorkerResponse[] = [];
    await handleOfficeToPdfWorkerMessage(
      {
        type: 'convert',
        input: {
          kind: 'binary',
          bytes: new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
          fileName: 'old.doc',
        },
        options: {},
      },
      (msg) => messages.push(msg)
    );

    const err1 = messages.find((m) => m.type === 'error');
    expect(err1?.type).toBe('error');

    const badMessages: OfficeToPdfWorkerResponse[] = [];
    await handleOfficeToPdfWorkerMessage(
      { type: 'unknown' } as unknown as OfficeToPdfWorkerRequest,
      (msg) => badMessages.push(msg)
    );
    expect(badMessages[0]?.type).toBe('error');
  });
});
