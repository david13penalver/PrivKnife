export type PegboardSystem =
  | 'ikea_skadis'
  | 'standard_pegboard_1_inch'
  | 'standard_pegboard_half_inch';

export type HolderStyle =
  | 'single_hook'
  | 'dual_prong'
  | 'shelf_bracket'
  | 'tool_holster'
  | 'cylinder_cup';

export interface SkadisPegboardMakerOptions {
  pegboardSystem: PegboardSystem;
  holderStyle: HolderStyle;
  hookLengthMm: number; // 15 - 150 mm
  hookAngleDeg: number; // 0 - 30 degrees upward
  lipHeightMm: number; // 3 - 30 mm
  bracketWidthMm: number; // 20 - 120 mm
  toolDiameterMm: number; // 10 - 80 mm
  reinforceRib: boolean;
  lockingWedge: boolean;
  wallMountPreview?: boolean; // For visual board simulation in preview
}

export interface SkadisPegboardMetrics {
  totalWidthMm: number;
  totalDepthMm: number;
  totalHeightMm: number;
  prongCount: number;
  triangleCount: number;
  estimatedGrams: number;
  estimatedPrintTimeHours: number;
  slicerTips: string[];
}

export interface SkadisPegboardMakerResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metrics: SkadisPegboardMetrics;
  error?: string;
}

export interface PresetHolder {
  id: string;
  name: string;
  description: string;
  options: Partial<SkadisPegboardMakerOptions>;
}

export interface SkadisPegboardWorkerRequest {
  id: number;
  options: SkadisPegboardMakerOptions;
  format: 'stl' | '3mf';
}

export interface SkadisPegboardWorkerResponse {
  id: number;
  type: 'progress' | 'result' | 'error';
  percent?: number;
  buffer?: ArrayBuffer;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  metrics?: SkadisPegboardMetrics;
  error?: string;
}
