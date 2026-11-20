export type FunnelScoopMode = 'air_vented_funnel' | 'measuring_scoop';
export type ScoopAspectPreset = 'shallow_wide' | 'balanced' | 'deep_narrow';
export type ScoopUnit = 'ml' | 'tablespoons' | 'cups' | 'coffeeGrams';

export interface FunnelScoopOptions {
  mode: FunnelScoopMode;
  wallThicknessMm: number;
  spoutOuterDiameterMm: number;
  mouthDiameterMm: number;
  spoutLengthMm: number;
  coneOverhangDeg: number;
  ventRibCount: number;
  includeHangingTab: boolean;
  targetVolumeMl: number;
  scoopAspect: ScoopAspectPreset;
  handleLengthMm: number;
  includeVolumeLabel: boolean;
  customLabelText: string;
  bodyColorHex: string;
  labelColorHex: string;
}

export const DEFAULT_FUNNEL_SCOOP_OPTIONS: FunnelScoopOptions = {
  mode: 'air_vented_funnel',
  wallThicknessMm: 1.8,
  spoutOuterDiameterMm: 14,
  mouthDiameterMm: 80,
  spoutLengthMm: 35,
  coneOverhangDeg: 45,
  ventRibCount: 4,
  includeHangingTab: true,
  targetVolumeMl: 30,
  scoopAspect: 'balanced',
  handleLengthMm: 85,
  includeVolumeLabel: true,
  customLabelText: '',
  bodyColorHex: '#276a78',
  labelColorHex: '#f3c279',
};

export const SCOOP_PRESETS = [5, 15, 30, 50, 120] as const;
export const ML_PER_UNIT: Record<ScoopUnit, number> = {
  ml: 1,
  tablespoons: 14.78676478125,
  cups: 236.5882365,
  coffeeGrams: 1 / 0.35,
};

export interface FunnelScoopMetrics {
  innerFlowBoreMm: number;
  solvedVolumeMl: number;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  triangleCount: number;
  estimatedWeightG: number;
  estimatedPrintTimeHours: number;
}
