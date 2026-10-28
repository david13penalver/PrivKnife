export type StencilHandleType = 'thumb_tab' | 'extended_rod' | 'dual_ear';

export type StencilMotif =
  | 'heart'
  | 'coffee_bean'
  | 'coffee_cup'
  | 'leaf_rosetta'
  | 'cat_paw'
  | 'star_burst'
  | 'custom_text';

export type StencilExportFormat = 'stl' | 'svg';

export interface CappuccinoStencilMakerOptions {
  stencilDiameterMm: number; // 60 - 150 mm
  stencilThicknessMm: number; // 0.8 - 3.0 mm
  handleType: StencilHandleType;
  handleHole: boolean;
  handleLengthMm: number; // 15 - 80 mm
  motif: StencilMotif;
  customText: string;
  contrastThreshold: number; // 50 - 200
  autoBridgeIslands: boolean;
  bridgeWidthMm: number; // 1.0 - 4.0 mm
  invertCutout: boolean;
  rimBevel: boolean;
}

export interface StencilMetrics {
  diameterMm: number;
  totalLengthWithHandleMm: number;
  thicknessMm: number;
  cutoutAreaMm2: number;
  bridgeTabCount: number;
  totalTriangles: number;
  estimatedGrams: number;
  estimatedPrintTimeHours: number;
  foodSafetyTips: string[];
}

export interface CappuccinoStencilMakerResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metrics: StencilMetrics;
  svgContent?: string;
  error?: string;
}

export interface StencilPreset {
  id: string;
  name: string;
  description: string;
  options: Partial<CappuccinoStencilMakerOptions>;
}

export interface StencilWorkerRequest {
  id: number;
  options: CappuccinoStencilMakerOptions;
  format: StencilExportFormat;
}

export interface StencilWorkerResponse {
  id: number;
  type: 'progress' | 'result' | 'error';
  percent?: number;
  buffer?: ArrayBuffer;
  svgContent?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  metrics?: StencilMetrics;
  error?: string;
}
