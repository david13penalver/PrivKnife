/// <reference lib="webworker" />
import { processFontSubset } from './engine';
import { FontSubsetWorkerRequest, FontSubsetWorkerResponse } from './types';

addEventListener('message', (event: MessageEvent<FontSubsetWorkerRequest>) => {
  const { id, buffer, options } = event.data;
  try {
    const result = processFontSubset(buffer, options);
    postMessage({ id, result } satisfies FontSubsetWorkerResponse);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    postMessage({
      id,
      result: {
        success: false,
        blob: new Blob([], { type: 'font/woff2' }),
        fileName: 'font.woff2',
        fileSize: 0,
        mimeType: 'font/woff2',
        cssSnippet: '',
        unicodeRange: '',
        stats: {
          originalBytes: buffer ? buffer.byteLength : 0,
          subsetBytes: 0,
          savingsBytes: 0,
          savingsPercent: 0,
          retainedGlyphCount: 0,
          totalGlyphCount: 0,
        },
        error: errorMsg,
      },
    } satisfies FontSubsetWorkerResponse);
  }
});
