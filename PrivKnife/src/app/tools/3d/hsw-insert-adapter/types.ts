export type HswInsertType =
  | 'empty_plug'
  | 'hex_nut_pocket'
  | 'threaded_post'
  | 'magnet_holder'
  | 'tool_hook'
  | 'storage_ring';

export type MetricNutSize = 'M3' | 'M4' | 'M5';

export type HswCellGrid = '1x1' | '2x1' | '2x2';

export type HswExportFormat = 'stl' | '3mf';

export interface HswInsertAdapterOptions {
  insertType: HswInsertType;
  nutSize: MetricNutSize;
  magnetDiameterMm: number; // 5.0 - 15.0 mm
  magnetDepthMm: number; // 1.5 - 5.0 mm
  hookLengthMm: number; // 15 - 70 mm
  hookAngleDeg: number; // 0 - 60 degrees
  ringDiameterMm: number; // 15 - 60 mm
  tightnessToleranceMm: number; // -0.2 - +0.3 mm
  retentionTabs: boolean;
  plugDepthMm: number; // 6.0 - 12.0 mm
  flangeRim: boolean;
  cellGrid?: HswCellGrid;
}

export interface HswMetrics {
  acrossFlatsMm: number;
  plugDepthMm: number;
  totalLengthMm: number;
  totalHeightMm: number;
  plugTriangles: number;
  attachmentTriangles: number;
  totalTriangles: number;
  estimatedGrams: number;
  estimatedPrintTimeHours: number;
  hswPrintingTips: string[];
}

export interface HswInsertAdapterResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metrics: HswMetrics;
  error?: string;
}

export interface HswPreset {
  id: string;
  name: string;
  description: string;
  options: Partial<HswInsertAdapterOptions>;
}

export interface HswWorkerRequest {
  options: HswInsertAdapterOptions;
  format: HswExportFormat;
}

export interface HswWorkerResponse {
  success: boolean;
  blob?: Blob;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  metrics?: HswMetrics;
  error?: string;
}
