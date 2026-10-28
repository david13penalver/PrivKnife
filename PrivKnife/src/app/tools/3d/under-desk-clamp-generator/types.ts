export type AccessoryType = 'headphone_hanger' | 'cable_raceway' | 'power_strip_holder' | 'cup_holder';

export interface UnderDeskClampGeneratorOptions {
  deskThicknessMm: number; // 10 - 80 mm (actual desk board thickness)
  maxClampGapMm: number; // 20 - 120 mm (internal opening between top jaw and bottom thread boss)
  throatDepthMm: number; // 30 - 150 mm (depth the clamp reaches inward)
  frameThicknessMm: number; // 6 - 20 mm (structural wall/back spine thickness)
  frameWidthMm: number; // 20 - 60 mm (clamp width across the edge)
  accessoryType: AccessoryType;
  racewaySlots: number; // 1 - 6 slots (for cable_raceway)
  racewaySlotDiameterMm: number; // 4 - 15 mm
  screwDiameterMm: number; // 12 - 30 mm (trapezoidal thread diameter)
  screwPitchMm: number; // 2 - 6 mm (thread pitch)
  swivelFootPad: boolean; // protective swivel pad on screw tip
  boltClearanceMm?: number; // tolerance clearance, e.g. 0.4 mm
  explodedView?: boolean; // visual offset for 3D inspection
}

export interface UnderDeskClampMetrics {
  totalWidthMm: number;
  totalDepthMm: number;
  totalHeightMm: number;
  clampTriangleCount: number;
  boltTriangleCount: number;
  footPadTriangleCount: number;
  accessoryTriangleCount: number;
  totalTriangles: number;
  estimatedGrams: number;
  estimatedPrintTimeHours: number;
  slicerTips: string[];
}

export interface UnderDeskClampGeneratorResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metrics: UnderDeskClampMetrics;
  error?: string;
}

export interface PresetClamp {
  id: string;
  name: string;
  description: string;
  options: Partial<UnderDeskClampGeneratorOptions>;
}

export interface UnderDeskClampWorkerRequest {
  id: number;
  options: UnderDeskClampGeneratorOptions;
  format: 'stl' | '3mf';
}

export interface UnderDeskClampWorkerResponse {
  id: number;
  type: 'progress' | 'result' | 'error';
  percent?: number;
  buffer?: ArrayBuffer;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  metrics?: UnderDeskClampMetrics;
  error?: string;
}
