export type LithophaneGeometryType = 'flat' | 'curve_arc' | 'cylinder' | 'nightlight_panel';
export type BacklightColorMode = 'warm' | 'cool' | 'candle';

export interface LithophaneMakerOptions {
  geometryType: LithophaneGeometryType;
  arcDegrees: number; // 30 - 180 deg (for curve_arc)
  widthMm: number; // 40 - 250 mm
  heightMm: number; // 40 - 250 mm
  minThicknessMm: number; // 0.4 - 2.0 mm (bright areas / highlights)
  maxThicknessMm: number; // 1.5 - 5.0 mm (dark areas / shadows)
  frameBorderWidthMm: number; // 0 - 15 mm (solid border around image)
  frameBorderDepthMm: number; // 1.5 - 6.0 mm (depth of border)
  invertLuminance: boolean; // false = standard negative (dark=thick), true = inverted
  contrastFactor: number; // 0.5 - 2.5 (1.0 = normal)
  baseStandSlot: boolean; // Add bottom stabilizing foot / nightlight lip
  baseStandWidthMm?: number; // 5 - 25 mm
  resolution?: number; // Sampling grid along width (e.g. 50 - 200)
  imageData?: { width: number; height: number; data: Uint8ClampedArray | Uint8Array } | null;
}

export interface LithophaneMetrics {
  triangleCount: number;
  vertexCount: number;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  minThicknessMm: number;
  maxThicknessMm: number;
  estimatedPrintTimeHours: number;
  estimatedGrams: number;
  slicerTips: string[];
}

export interface LithophaneMakerResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metrics: LithophaneMetrics;
  error?: string;
}

export interface PresetLithophane {
  id: string;
  name: string;
  description: string;
  geometryType: LithophaneGeometryType;
  options: Partial<LithophaneMakerOptions>;
}

export interface LithophaneWorkerRequest {
  id: number;
  options: LithophaneMakerOptions;
  format: 'stl' | '3mf';
}

export interface LithophaneWorkerResponse {
  id: number;
  type: 'progress' | 'result' | 'error';
  percent?: number;
  buffer?: ArrayBuffer;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  metrics?: LithophaneMetrics;
  error?: string;
}
