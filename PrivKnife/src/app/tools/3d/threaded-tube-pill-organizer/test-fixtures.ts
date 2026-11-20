import { DEFAULT_CONTAINER_OPTIONS, ThreadedTubePillOptions } from './types';
export const tube = DEFAULT_CONTAINER_OPTIONS;
export const pod: ThreadedTubePillOptions = { ...tube, mode: 'desiccant_pod', spoolPreset: 'bambu', internalHeightMm: 40 };
export const pill: ThreadedTubePillOptions = { ...tube, mode: 'pill_organizer' };
export const splitPill = { ...pill, pillDoubleAmPm: true };
export const oversizeSlit = { ...pod, desiccantSlitWidthMm: 2.8 };
