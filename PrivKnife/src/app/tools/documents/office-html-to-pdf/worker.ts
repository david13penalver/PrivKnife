/// <reference lib="webworker" />

import { convertOfficeToPdf, inspectOfficeInput } from './engine';
import {
  OfficeToPdfWorkerDeps,
  OfficeToPdfWorkerRequest,
  OfficeToPdfWorkerResponse,
} from './types';

export async function handleOfficeToPdfWorkerMessage(
  data: OfficeToPdfWorkerRequest,
  post: (msg: OfficeToPdfWorkerResponse, transfer?: Transferable[]) => void,
  deps: OfficeToPdfWorkerDeps = {}
): Promise<void> {
  if (!data || (data.type !== 'inspect' && data.type !== 'convert')) {
    post({
      type: 'error',
      error: 'Unsupported Office-to-PDF worker request payload.',
    });
    return;
  }

  try {
    if (data.type === 'inspect') {
      const inspectRes = await inspectOfficeInput(data.input, data.options);
      if (!inspectRes.success) {
        post({
          type: 'error',
          error: inspectRes.error || 'Unable to inspect document.',
        });
        return;
      }
      post({ type: 'inspected', result: inspectRes });
      return;
    }

    const result = await convertOfficeToPdf(
      data.input,
      data.options,
      (percent, stage) => {
        deps.onProgress?.(percent, stage);
        post({ type: 'progress', percent, stage });
      }
    );

    if (!result.success || !result.pdfBytes) {
      post({
        type: 'error',
        error: result.error || 'Client-side PDF conversion failed.',
      });
      return;
    }

    const pdfBuffer = result.pdfBytes.slice().buffer;
    post(
      {
        type: 'converted',
        pdfBuffer,
        result: {
          ...result,
          blob: undefined,
          pdfBytes: undefined,
        },
      },
      [pdfBuffer]
    );
  } catch (err: unknown) {
    post({
      type: 'error',
      error:
        err instanceof Error
          ? err.message
          : 'Office-to-PDF worker execution failed.',
    });
  }
}

if (
  typeof WorkerGlobalScope !== 'undefined' &&
  typeof self !== 'undefined' &&
  self instanceof WorkerGlobalScope
) {
  addEventListener('message', (event: MessageEvent<OfficeToPdfWorkerRequest>) => {
    void handleOfficeToPdfWorkerMessage(event.data, (msg, transfer) => {
      if (transfer && transfer.length > 0) {
        postMessage(msg, transfer);
      } else {
        postMessage(msg);
      }
    });
  });
}
