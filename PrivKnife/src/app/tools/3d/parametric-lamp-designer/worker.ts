/// <reference lib="webworker" />

import { exportBinarySTL, export3mf, generateLampShadeGeometry } from './engine';
import { LampWorkerRequest, LampWorkerResponse } from './types';

addEventListener('message', async (event: MessageEvent<LampWorkerRequest>) => {
  const { id, type, config } = event.data;

  try {
    postMessage({ id, type: 'progress', percent: 20 } as LampWorkerResponse);

    if (type === 'export-stl') {
      postMessage({ id, type: 'progress', percent: 60 } as LampWorkerResponse);
      const geom = generateLampShadeGeometry(config);
      const baseName = `PrivKnife_Shade_${config.curveType}_${config.height}mm_${config.socketPreset.toUpperCase()}`;
      const buffer = exportBinarySTL(geom, baseName);
      geom.dispose();

      postMessage({ id, type: 'progress', percent: 100 } as LampWorkerResponse);
      postMessage(
        { id, type: 'result', buffer } as LampWorkerResponse,
        [buffer]
      );
    } else if (type === 'export-3mf') {
      postMessage({ id, type: 'progress', percent: 60 } as LampWorkerResponse);
      const geom = generateLampShadeGeometry(config);
      const blob = await export3mf(geom, config);
      geom.dispose();
      const buffer = await blob.arrayBuffer();

      postMessage({ id, type: 'progress', percent: 100 } as LampWorkerResponse);
      postMessage(
        { id, type: 'result', buffer } as LampWorkerResponse,
        [buffer]
      );
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Worker generation failed';
    postMessage({
      id,
      type: 'error',
      error: errorMsg,
    } as LampWorkerResponse);
  }
});
