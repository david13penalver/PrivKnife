import { listenForWorkshopRequests, makeWorkshopHandler } from '../shared/workshop-worker';
import {
  calculateCalibrationMetrics, exportTo3mf, exportToBinaryStl, generateCalibrationParts, validateCalibrationOptions,
} from './engine';
import type { CalibrationToleranceOptions } from './types';

export const handleCalibrationWorkerMessage = makeWorkshopHandler<CalibrationToleranceOptions>({
  validate: validateCalibrationOptions,
  generate: generateCalibrationParts,
  metrics: (options, parts) => ({ ...calculateCalibrationMetrics(options, parts) }),
  stl: exportToBinaryStl,
  threeMf: exportTo3mf,
});

listenForWorkshopRequests(handleCalibrationWorkerMessage);
