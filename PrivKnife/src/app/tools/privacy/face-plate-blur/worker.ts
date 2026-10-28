/// <reference lib="webworker" />

import { censorImageBuffer, detectPrivacyRegions } from './engine';
import { FacePlateBlurWorkerRequest, FacePlateBlurWorkerResponse } from './types';

addEventListener('message', async (event: MessageEvent<FacePlateBlurWorkerRequest>) => {
  const { type, id, imageData, regions, options } = event.data;

  try {
    if (type === 'detect') {
      if (!imageData) {
        throw new Error('Image data is required for detection');
      }
      postMessage({
        type: 'progress',
        id,
        progress: 50,
      } as FacePlateBlurWorkerResponse);

      const detectedRegions = await detectPrivacyRegions(imageData);

      postMessage({
        type: 'detect',
        id,
        success: true,
        detectedRegions,
        progress: 100,
      } as FacePlateBlurWorkerResponse);
    } else if (type === 'censor') {
      if (!imageData || !options) {
        throw new Error('Image data and options are required for censoring');
      }
      postMessage({
        type: 'progress',
        id,
        progress: 30,
      } as FacePlateBlurWorkerResponse);

      const censored = censorImageBuffer(imageData, regions || [], options);

      postMessage({
        type: 'censor',
        id,
        success: true,
        imageData: censored,
        progress: 100,
      } as FacePlateBlurWorkerResponse);
    }
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : 'Worker processing failed';
    postMessage({
      type: type,
      id,
      success: false,
      error: errorMsg,
    } as FacePlateBlurWorkerResponse);
  }
});
