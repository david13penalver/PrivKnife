/// <reference lib="webworker" />

import { processSignedPdf } from './engine';
import { PdfSignerWorkerRequest, PdfSignerWorkerResponse } from './types';

addEventListener('message', async (event: MessageEvent<PdfSignerWorkerRequest>) => {
  const { pdfBuffer, options, originalFileName } = event.data;

  try {
    const result = await processSignedPdf(pdfBuffer, options, originalFileName);
    postMessage({
      type: 'done',
      success: true,
      result,
    } as PdfSignerWorkerResponse);
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : 'PDF signing failed in worker';
    postMessage({
      type: 'done',
      success: false,
      error: errorMsg,
    } as PdfSignerWorkerResponse);
  }
});
