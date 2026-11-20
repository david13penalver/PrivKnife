import { listenForWorkshopRequests, makeWorkshopHandler } from '../shared/workshop-worker';
import {
  calculateFunnelScoopMetrics, exportTo3mf, exportToBinaryStl,
  generateFunnelScoopParts, validateFunnelScoopOptions,
} from './engine';
import { ML_PER_UNIT, ScoopUnit, FunnelScoopOptions } from './types';

interface FunnelScoopRequestOptions extends FunnelScoopOptions {
  upright?: boolean;
  unit?: ScoopUnit;
  volume?: number;
}

function normalize(options: FunnelScoopRequestOptions): FunnelScoopOptions {
  if (options?.unit !== undefined) {
    return { ...options, targetVolumeMl: (options.volume ?? NaN) * ML_PER_UNIT[options.unit] };
  }
  return options;
}

export const handleFunnelScoopWorkerMessage = makeWorkshopHandler<FunnelScoopRequestOptions>({
  validate: (options) => validateFunnelScoopOptions(normalize(options)),
  generate: (options) => generateFunnelScoopParts(normalize(options)),
  metrics: (options, parts) => ({ ...calculateFunnelScoopMetrics(normalize(options), parts) }),
  stl: exportToBinaryStl,
  threeMf: exportTo3mf,
  preview(options, parts) {
    if (options.mode !== 'air_vented_funnel' || !options.upright) return;
    for (const { geometry } of parts) {
      geometry.rotateX(Math.PI);
      geometry.computeBoundingBox();
      geometry.translate(0, 0, -(geometry.boundingBox?.min.z ?? 0));
    }
  },
});

listenForWorkshopRequests(handleFunnelScoopWorkerMessage);
