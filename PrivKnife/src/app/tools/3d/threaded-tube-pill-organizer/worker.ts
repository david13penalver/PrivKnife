import { listenForWorkshopRequests, makeWorkshopHandler } from '../shared/workshop-worker';
import {
  calculateContainerMetrics, exportTo3mf, exportToBinaryStl, generateContainerParts,
  positionContainerPreview, validateContainerOptions,
} from './engine';
import type { ThreadedTubePillOptions } from './types';

export const handleContainerWorkerMessage = makeWorkshopHandler<ThreadedTubePillOptions>({
  validate: validateContainerOptions,
  generate: generateContainerParts,
  metrics: (options, parts) => ({ ...calculateContainerMetrics(options, parts) }),
  stl: exportToBinaryStl,
  threeMf: exportTo3mf,
  preview: positionContainerPreview,
});

listenForWorkshopRequests(handleContainerWorkerMessage);
