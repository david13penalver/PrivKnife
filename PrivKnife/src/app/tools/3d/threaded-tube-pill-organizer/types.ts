export type ContainerToolMode = 'knurled_tube' | 'desiccant_pod' | 'pill_organizer';
export type SpoolBrandPreset = 'bambu' | 'prusa' | 'sunlu' | 'generic' | 'custom';

export interface ThreadedTubePillOptions {
  mode: ContainerToolMode;
  spoolPreset: SpoolBrandPreset;
  outerDiameterMm: number;
  internalHeightMm: number;
  wallThicknessMm: number;
  threadPitchMm: number;
  threadClearanceMm: number;
  includeKnurling: boolean;
  desiccantSlitWidthMm: number;
  includeAirflowChimney: boolean;
  pillDoubleAmPm: boolean;
  pillSlotWidthMm: number;
  pillSlotDepthMm: number;
  includeDayLabels: boolean;
  layoutFlatPlate: boolean;
  cutaway: boolean;
  bodyColorHex: string;
  accentColorHex: string;
}

export const SPOOL_HUBS = { bambu: 53, prusa: 51, sunlu: 53, generic: 55 } as const;

export const DEFAULT_CONTAINER_OPTIONS: ThreadedTubePillOptions = {
  mode: 'knurled_tube',
  spoolPreset: 'custom',
  outerDiameterMm: 45,
  internalHeightMm: 60,
  wallThicknessMm: 2.4,
  threadPitchMm: 3,
  threadClearanceMm: 0.28,
  includeKnurling: true,
  desiccantSlitWidthMm: 1.4,
  includeAirflowChimney: false,
  pillDoubleAmPm: false,
  pillSlotWidthMm: 21,
  pillSlotDepthMm: 23,
  includeDayLabels: true,
  layoutFlatPlate: true,
  cutaway: false,
  bodyColorHex: '#3a697d',
  accentColorHex: '#e8b663',
};

export interface ContainerToolMetrics {
  usableInternalDiameterMm: number;
  neckWallRemainingMm: number;
  internalVolumeMl: number;
  pocketCount: number;
  ventCount: number;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  triangleCount: number;
  estimatedWeightG: number;
  estimatedPrintTimeHours: number;
}
