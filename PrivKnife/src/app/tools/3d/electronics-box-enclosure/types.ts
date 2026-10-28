export type ClosureType = 'snap_fit' | 'm3_screws' | 'slide_lid';
export type PcbPresetType = 'custom' | 'arduino_uno' | 'esp32_dev' | 'rpi_pico';

export interface ElectronicsBoxEnclosureOptions {
  innerLengthMm: number; // 20 - 300 mm
  innerWidthMm: number; // 15 - 200 mm
  innerHeightMm: number; // 10 - 150 mm
  wallThicknessMm: number; // 1.2 - 4.0 mm
  cornerRadiusMm: number; // 0 - 15 mm
  closureType: ClosureType; // 'snap_fit' | 'm3_screws' | 'slide_lid'
  pcbPreset: PcbPresetType;
  standoffHeightMm: number; // 2 - 20 mm
  cableSlot: boolean; // Cable pass-through or USB port cutout
  cableSlotDiameterMm: number; // 4 - 20 mm
  ventilationGrille: boolean; // Top cooling slots
  explodedView?: boolean; // For 3D preview visualization
}

export interface ElectronicsBoxMetrics {
  outerLengthMm: number;
  outerWidthMm: number;
  outerHeightMm: number;
  baseTriangleCount: number;
  lidTriangleCount: number;
  totalTriangles: number;
  estimatedGrams: number;
  estimatedPrintTimeHours: number;
  slicerTips: string[];
}

export interface ElectronicsBoxEnclosureResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metrics: ElectronicsBoxMetrics;
  error?: string;
}

export interface PresetEnclosure {
  id: string;
  name: string;
  description: string;
  options: Partial<ElectronicsBoxEnclosureOptions>;
}

export interface ElectronicsBoxWorkerRequest {
  id: number;
  options: ElectronicsBoxEnclosureOptions;
  format: 'stl' | '3mf';
}

export interface ElectronicsBoxWorkerResponse {
  id: number;
  type: 'progress' | 'result' | 'error';
  percent?: number;
  buffer?: ArrayBuffer;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  metrics?: ElectronicsBoxMetrics;
  error?: string;
}
