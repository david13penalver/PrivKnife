/// <reference lib="webworker" />

import { preprocessImageBuffer, processLocalOcr } from './engine';
import { LocalOcrWorkerRequest, LocalOcrWorkerResponse } from './types';

addEventListener('message', async (event: MessageEvent<LocalOcrWorkerRequest>) => {
  const { type, id, fileBuffer, imageData, options, originalFileName } = event.data;

  try {
    if (type === 'preprocess') {
      if (!imageData) {
        throw new Error('Image data is required for preprocessing');
      }
      postMessage({
        type: 'progress',
        id,
        progress: 50,
      } as LocalOcrWorkerResponse);

      preprocessImageBuffer(imageData.data, imageData.width, imageData.height, {
        enhanceContrast: options.enhanceContrast,
        binarizeThreshold: options.binarizeThreshold,
      });

      postMessage({
        type: 'preprocess',
        id,
        success: true,
        imageData,
        progress: 100,
      } as LocalOcrWorkerResponse);
    } else if (type === 'ocr') {
      postMessage({
        type: 'progress',
        id,
        progress: 5,
      } as LocalOcrWorkerResponse);

      if (!fileBuffer?.byteLength) throw new Error('decodeError');
      const source = new Blob([fileBuffer]);

      const result = await processLocalOcr(source, options, originalFileName, (progress) => {
        postMessage({ type: 'progress', id, progress } satisfies LocalOcrWorkerResponse);
      });

      postMessage({
        type: 'ocr',
        id,
        success: true,
        result,
        progress: 100,
      } as LocalOcrWorkerResponse);
    }
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : 'OCR extraction worker failed';
    postMessage({
      type: type,
      id,
      success: false,
      error: errorMsg,
    } as LocalOcrWorkerResponse);
  }
});
