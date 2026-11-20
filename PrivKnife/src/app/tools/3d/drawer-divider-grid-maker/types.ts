import * as THREE from 'three';

export type DividerViewMode = 'assembled' | 'flat_plates';

export interface DrawerDividerGridOptions {
  drawerWidthMm: number; // 80..900
  drawerDepthMm: number; // 80..700
  dividerHeightMm: number; // 20..140
  bladeThicknessMm: number; // 2.4..5.0
  edgeClearanceMm: number; // 0.5..3.0
  notchClearanceMm: number; // 0.15..0.40
  colCount: number; // 1..10
  rowCount: number; // 1..10
  customColRatios: string;
  customRowRatios: string;
  printerBedMm: number; // 180..350
  includeBaseFeet: boolean;
  includePieceLabels: boolean;
  viewMode: DividerViewMode;
  filamentColorHex: string;
}

export interface DrawerGridMetrics {
  usableWidthMm: number;
  usableDepthMm: number;
  totalSlatsCount: number;
  dovetailSplitCount: number;
  buildPlateCount: number;
  triangleCount: number;
  estimatedVolumeCm3: number;
  estimatedWeightG: number;
  estimatedPrintTimeHours: number;
}

export interface SlatSegmentPlan {
  startMm: number;
  endMm: number;
  lengthMm: number;
  hasLeftFemale: boolean;
  hasRightMale: boolean;
  splitLeftMm?: number;
  splitRightMm?: number;
}

export interface DrawerSlatSegment {
  id: string;
  axis: 'x' | 'y';
  slatIndex: number;
  segmentIndex: number;
  plateIndex: number;
  lengthMm: number;
  flatGeometry: THREE.BufferGeometry;
  assembledGeometry: THREE.BufferGeometry;
  labelFlatGeometry: THREE.BufferGeometry | null;
  labelAssembledGeometry: THREE.BufferGeometry | null;
  notchPositionsMm: number[];
  splitPositionsMm: number[];
}

export interface DrawerGridParts {
  segments: DrawerSlatSegment[];
  usableWidthMm: number;
  usableDepthMm: number;
  colRatios: number[];
  rowRatios: number[];
  xNotchPositionsMm: number[];
  yNotchPositionsMm: number[];
  dovetailSplitCount: number;
  buildPlateCount: number;
  estimatedVolumeCm3: number;
  dispose: () => void;
}

export interface DrawerGridValidationResult {
  valid: boolean;
  error?: string;
}

export interface BedPreset {
  label: string;
  sizeMm: number;
}

export const BED_PRESETS: BedPreset[] = [
  { label: 'Prusa Mini (180×180 mm)', sizeMm: 180 },
  { label: 'Ender 3 / MK4 (220×220 mm)', sizeMm: 220 },
  { label: 'Bambu X1/P1/A1 (256×256 mm)', sizeMm: 256 },
  { label: 'Voron / CR-10 (300×300 mm)', sizeMm: 300 },
];

export interface DrawerGridPreset {
  id: string;
  name: string;
  description: string;
  options: DrawerDividerGridOptions;
}

export interface DrawerGridWorkerRequest {
  id: number;
  type: 'export-stl' | 'export-3mf' | 'export-zip';
  options: DrawerDividerGridOptions;
}

export interface DrawerGridWorkerResponse {
  id: number;
  type: 'progress' | 'result' | 'error';
  percent?: number;
  buffer?: ArrayBuffer;
  fileName?: string;
  mimeType?: string;
  metrics?: DrawerGridMetrics;
  error?: string;
}

export const DEFAULT_DRAWER_GRID_OPTIONS: DrawerDividerGridOptions = {
  drawerWidthMm: 280,
  drawerDepthMm: 200,
  dividerHeightMm: 45,
  bladeThicknessMm: 3.0,
  edgeClearanceMm: 1.0,
  notchClearanceMm: 0.25,
  colCount: 3,
  rowCount: 2,
  customColRatios: '1, 2, 1',
  customRowRatios: '1, 1',
  printerBedMm: 256,
  includeBaseFeet: false,
  includePieceLabels: true,
  viewMode: 'assembled',
  filamentColorHex: '#10b981',
};
