import * as THREE from 'three';

export type ToolHolderPreset =
  | 'metric_drills'
  | 'imperial_drills'
  | 'hex_bits_quarter'
  | 'allen_keys'
  | 'printer_nozzles'
  | 'custom';

export type RackFormFactor = 'stepped_bench' | 'flat_tray' | 'skadis_wall';

export interface ToolSlotItem {
  label: string;
  diameterMm: number;
  shape: 'round' | 'hex' | 'allen_slot';
}

export interface ToolBitHolderOptions {
  preset: ToolHolderPreset;
  formFactor: RackFormFactor;
  customSpecText: string;
  hexBitCount: number; // 6..40 (used in hex_bits_quarter)
  rows: number; // 1..4
  holeToleranceMm: number; // 0.15..0.60
  holeDepthMm: number; // 10..40
  slotSpacingMm: number; // 3.0..12.0
  stepRiseMm: number; // 0..18
  includeBottomMagnets: boolean;
  includeEmbossedLabels: boolean;
  bodyColorHex: string;
  labelColorHex: string;
}

export interface ToolHolderMetrics {
  slotCount: number;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  triangleCount: number;
  estimatedWeightG: number;
  estimatedPrintTimeHours: number;
  exceedsStandardBed: boolean;
}

export interface ToolHolderValidationResult {
  valid: boolean;
  error?: string;
}

export interface ToolHolderParts {
  bodyGeometry: THREE.BufferGeometry;
  labelGeometry: THREE.BufferGeometry | null;
  slots: ToolSlotItem[];
  widthMm: number;
  depthMm: number;
  heightMm: number;
  tierHeightsMm: number[];
  effectiveHoleDepthMm: number;
  minFloorMm: number;
  hexCircumradiusMm: number | null;
  magnetCount: number;
  dispose(): void;
}

export interface ToolHolderWorkerRequest {
  id: number;
  type: 'export-stl' | 'export-3mf';
  options: ToolBitHolderOptions;
}

export interface ToolHolderWorkerResponse {
  id: number;
  type: 'progress' | 'result' | 'error';
  percent?: number;
  buffer?: ArrayBuffer;
  fileName?: string;
  mimeType?: string;
  metrics?: ToolHolderMetrics;
  error?: string;
}

export const STANDARD_BED_SIZE_MM = 220;

export const HEX_BIT_FLAT_TO_FLAT_MM = 6.35;

export const PRESET_DEFAULT_SPECS: Record<ToolHolderPreset, string> = {
  metric_drills: '1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 8.0, 9.0, 10.0',
  imperial_drills: '1/16, 5/64, 3/32, 7/64, 1/8, 9/64, 5/32, 3/16, 7/32, 1/4, 5/16, 3/8',
  hex_bits_quarter: 'PH1, PH2, PZ1, PZ2, T10, T15, T20, T25, H3, H4, H5, H6',
  allen_keys: '1.5, 2, 2.5, 3, 4, 5, 6, 8, 10',
  printer_nozzles: '0.2:7.2, 0.4:7.2, 0.4:7.2, 0.6:7.2, 0.8:7.2, 1.0:7.2',
  custom: '2.0, 3.2, 4.5, 6.35, 8.0, 10.0',
};

export const DEFAULT_TOOL_HOLDER_OPTIONS: ToolBitHolderOptions = {
  preset: 'metric_drills',
  formFactor: 'stepped_bench',
  customSpecText: PRESET_DEFAULT_SPECS.metric_drills,
  hexBitCount: 12,
  rows: 2,
  holeToleranceMm: 0.35,
  holeDepthMm: 22,
  slotSpacingMm: 5.0,
  stepRiseMm: 12,
  includeBottomMagnets: false,
  includeEmbossedLabels: true,
  bodyColorHex: '#2563eb',
  labelColorHex: '#f8fafc',
};
