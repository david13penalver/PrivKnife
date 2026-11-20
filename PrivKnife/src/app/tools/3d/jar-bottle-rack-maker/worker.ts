import { listenForWorkshopRequests, makeWorkshopHandler } from '../shared/workshop-worker';
import {
  calculateJarRackMetrics, exportTo3mf, exportToBinaryStl, generateJarRackParts, validateJarRackOptions,
} from './engine';
import type { JarBottleRackOptions } from './types';

type RackWorkshopOptions = JarBottleRackOptions & { mode?: JarBottleRackOptions['topology'] };

function normalize(options: RackWorkshopOptions): JarBottleRackOptions {
  return options?.mode ? { ...options, topology: options.mode } : options;
}

export const handleJarRackWorkerMessage = makeWorkshopHandler<RackWorkshopOptions>({
  validate: (options) => validateJarRackOptions(normalize(options)),
  generate: (options) => generateJarRackParts(normalize(options)),
  metrics: (options, parts) => ({ ...calculateJarRackMetrics(normalize(options), parts) }),
  stl: exportToBinaryStl,
  threeMf: exportTo3mf,
});

listenForWorkshopRequests(handleJarRackWorkerMessage);
