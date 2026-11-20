export type CalibrationTestMode =
  | 'clearance_gauge' | 'fastener_fit_block' | 'bridge_overhang_test' | 'first_layer_sheet';
export type CalibrationBoltSize = 'M2' | 'M2.5' | 'M3' | 'M4' | 'M5' | 'M6' | 'M8';
export type SaeBoltSize = '#4' | '#6' | '#8' | '#10' | '1/4';

export interface CalibrationToleranceOptions {
  mode: CalibrationTestMode;
  nozzleDiameterMm: number;
  layerHeightMm: number;
  clearanceValuesText: string;
  boltSize: CalibrationBoltSize | SaeBoltSize;
  includeBridges: boolean;
  includeOverhangs: boolean;
  bedWidthMm: number;
  bedDepthMm: number;
  bedMarginMm: number;
  patchCount: 0 | 5 | 9;
  includeGaugeLabels: boolean;
  bodyColorHex: string;
  labelColorHex: string;
}

interface FastenerSize {
  diameterMm: number;
  nutAcrossFlatsMm: number;
  nutThicknessMm: number;
}

export const FASTENERS: Readonly<Record<CalibrationBoltSize | SaeBoltSize, FastenerSize>> = {
  M2: { diameterMm: 2, nutAcrossFlatsMm: 4, nutThicknessMm: 1.6 },
  'M2.5': { diameterMm: 2.5, nutAcrossFlatsMm: 5, nutThicknessMm: 2 },
  M3: { diameterMm: 3, nutAcrossFlatsMm: 5.5, nutThicknessMm: 2.4 },
  M4: { diameterMm: 4, nutAcrossFlatsMm: 7, nutThicknessMm: 3.2 },
  M5: { diameterMm: 5, nutAcrossFlatsMm: 8, nutThicknessMm: 4 },
  M6: { diameterMm: 6, nutAcrossFlatsMm: 10, nutThicknessMm: 5 },
  M8: { diameterMm: 8, nutAcrossFlatsMm: 13, nutThicknessMm: 6.5 },
  '#4': { diameterMm: 2.8448, nutAcrossFlatsMm: 6.35, nutThicknessMm: 2.38 },
  '#6': { diameterMm: 3.5052, nutAcrossFlatsMm: 7.9375, nutThicknessMm: 2.78 },
  '#8': { diameterMm: 4.1656, nutAcrossFlatsMm: 8.73125, nutThicknessMm: 3.18 },
  '#10': { diameterMm: 4.826, nutAcrossFlatsMm: 9.525, nutThicknessMm: 3.18 },
  '1/4': { diameterMm: 6.35, nutAcrossFlatsMm: 11.1125, nutThicknessMm: 5.56 },
};

export const FASTENER_OFFSETS_MM = [-0.1, 0, 0.1, 0.2, 0.35] as const;
export const BRIDGE_SPANS_MM = [20, 40, 60, 80, 100] as const;
export const OVERHANG_ANGLES_DEG = [35, 45, 55, 65, 75] as const;
export const BED_PRESETS_MM = [180, 220, 256, 300] as const;
export const NOZZLE_PRESETS_MM = [0.4, 0.6] as const;

export const DEFAULT_CALIBRATION_OPTIONS: CalibrationToleranceOptions = {
  mode: 'clearance_gauge',
  nozzleDiameterMm: 0.4,
  layerHeightMm: 0.2,
  clearanceValuesText: '0.10, 0.15, 0.20, 0.25, 0.30, 0.40',
  boltSize: 'M4',
  includeBridges: true,
  includeOverhangs: false,
  bedWidthMm: 220,
  bedDepthMm: 220,
  bedMarginMm: 10,
  patchCount: 5,
  includeGaugeLabels: true,
  bodyColorHex: '#466e85',
  labelColorHex: '#f5bb68',
};

export interface CalibrationMetrics {
  testFeatureCount: number;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  triangleCount: number;
  estimatedWeightG: number;
  estimatedPrintTimeMinutes: number;
  layerCount: number;
}
