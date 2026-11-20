import * as THREE from 'three';

export type HingeType = 'print_in_place' | 'm3_screw' | 'filament_pin';

export type LatchType = 'snap_compliant' | 'friction_slide';

export type DividerMode = 'none' | 'molded_fixed' | 'removable_tray';

export interface RuggedHingedBoxOptions {
  innerLengthMm: number; // 60..240
  innerWidthMm: number; // 50..200
  baseDepthMm: number; // 18..110
  lidDepthMm: number; // 10..60
  wallThicknessMm: number; // 2.0..5.0
  cornerRadiusMm: number; // 3.0..14.0
  ribCountPerSide: number; // 0..6
  hingeType: HingeType;
  hingeClearanceMm: number; // 0.25..0.50
  latchType: LatchType;
  includeGasketChannel: boolean;
  dividerMode: DividerMode;
  dividerCols: number; // 1..8
  dividerRows: number; // 1..6
  frontLabelText: string;
  bodyColorHex: string;
  accentColorHex: string;
  previewOpen: boolean;
}

export interface RuggedBoxMetrics {
  outerWidthMm: number;
  outerDepthMm: number;
  closedHeightMm: number;
  flatPlateWidthMm: number;
  flatPlateDepthMm: number;
  triangleCount: number;
  estimatedVolumeCm3: number;
  estimatedWeightG: number;
  estimatedPrintTimeHours: number;
  exceedsStandardBed: boolean;
}

export interface RuggedBoxLayoutMeta {
  outerWidthMm: number;
  outerDepthMm: number;
  closedHeightMm: number;
  innerCavityVolumeCm3: number;
  hingeCenterYMm: number;
  latchCount: 1 | 2;
  estimatedVolumeCm3: number;
}

export interface RuggedBoxParts {
  baseGeometry: THREE.BufferGeometry;
  lidGeometry: THREE.BufferGeometry;
  latchesGeometry: THREE.BufferGeometry;
  dividersGeometry: THREE.BufferGeometry | null;
  gasketGeometry: THREE.BufferGeometry | null;
  labelGeometry: THREE.BufferGeometry | null;
  layoutMeta: RuggedBoxLayoutMeta;
  dispose: () => void;
}

export interface RuggedBoxValidationResult {
  valid: boolean;
  error?: string;
}

export interface RuggedBoxPreset {
  id: string;
  name: string;
  description: string;
  options: RuggedHingedBoxOptions;
}

export interface RuggedBoxWorkerRequest {
  id: number;
  type: 'export-stl' | 'export-3mf';
  options: RuggedHingedBoxOptions;
}

export interface RuggedBoxWorkerResponse {
  id: number;
  type: 'progress' | 'result' | 'error';
  percent?: number;
  buffer?: ArrayBuffer;
  fileName?: string;
  mimeType?: string;
  metrics?: RuggedBoxMetrics;
  error?: string;
}

export const STANDARD_BED_SIZE_MM = 220;

export const DEFAULT_RUGGED_BOX_OPTIONS: RuggedHingedBoxOptions = {
  innerLengthMm: 120,
  innerWidthMm: 80,
  baseDepthMm: 35,
  lidDepthMm: 18,
  wallThicknessMm: 3.0,
  cornerRadiusMm: 6.0,
  ribCountPerSide: 2,
  hingeType: 'm3_screw',
  hingeClearanceMm: 0.35,
  latchType: 'snap_compliant',
  includeGasketChannel: true,
  dividerMode: 'molded_fixed',
  dividerCols: 4,
  dividerRows: 2,
  frontLabelText: 'M3 SCREWS',
  bodyColorHex: '#3b82f6',
  accentColorHex: '#f97316',
  previewOpen: true,
};
