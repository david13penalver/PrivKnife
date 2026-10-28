/// <reference lib="webworker" />
import { computeDiff } from './engine';
import { DiffWorkerRequest, DiffWorkerResponse } from './types';

addEventListener('message', (event: MessageEvent<DiffWorkerRequest>) => {
  const { requestId, originalText, modifiedText, options } = event.data;
  try {
    const result = computeDiff(originalText, modifiedText, options);
    postMessage({ requestId, result } satisfies DiffWorkerResponse);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    postMessage({
      requestId,
      result: {
        success: false,
        lines: [],
        stats: {
          leftTotalLines: 0,
          rightTotalLines: 0,
          addedLines: 0,
          removedLines: 0,
          modifiedLines: 0,
          unchangedLines: 0,
        },
        patch: '',
        htmlReport: '',
        blob: new Blob([], { type: 'text/x-diff' }),
        fileName: 'diff_report.patch',
        fileSize: 0,
        mimeType: 'text/x-diff',
        error: errorMsg,
      },
    } satisfies DiffWorkerResponse);
  }
});
