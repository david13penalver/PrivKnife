export type BaseShape = 'desk-stand' | 'keychain' | 'flat-plaque';
export type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrStandConfig {
  text: string;
  errorCorrection: QrErrorCorrectionLevel;
  baseShape: BaseShape;
  subtext: string;
  subtextEnabled: boolean;
  moduleSizeMm: number; // e.g. 2.0mm
  baseThicknessMm: number; // e.g. 3.0mm
  qrReliefMm: number; // e.g. 1.2mm
  standAngleDeg: number; // e.g. 70°
  keychainHoleDiameterMm: number; // e.g. 4.5mm
  baseColor: string; // hex #FFFFFF
  qrColor: string; // hex #0F172A
  cornerRadiusMm: number; // e.g. 3.0mm
  marginMm: number; // e.g. 4.0mm
}

export interface QrMatrix {
  size: number;
  modules: boolean[][];
}

export interface PhysicalDimensions {
  widthMm: number;
  heightMm: number;
  depthMm: number;
}

export interface ScannabilityReport {
  isScannable: boolean;
  decodedData: string | null;
  moduleCount: number;
  physicalDimensions: PhysicalDimensions;
  minimumFeatureMm: number;
  qualityScore: number; // 0 - 100
  filamentSwapLayer: number; // Layer index at standard 0.20mm layer height
  notes: string[];
}

export interface PresetModel {
  id: string;
  name: string;
  description: string;
  config: Partial<QrStandConfig>;
}

export interface ColorPreset {
  name: string;
  baseColor: string;
  qrColor: string;
}
