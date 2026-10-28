export type KeycapItemType = 'keycap' | 'switch_tester_tray';

export type KeycapProfile = 'cherry' | 'oem' | 'dsa' | 'xda' | 'sa';

export type KeyUnitSize = '1u' | '1.25u' | '1.75u' | '2u' | '2.25u' | '6.25u';

export type LegendStyle = 'embossed' | 'inlaid_multicolor' | 'blank';

export type KeycapExportFormat = '3mf_multicolor' | 'stl_unified';

export interface KeycapSwitchTesterMakerOptions {
  itemType: KeycapItemType;
  keycapProfile: KeycapProfile;
  keyUnitSize: KeyUnitSize;
  legendText: string;
  legendStyle: LegendStyle;
  stemToleranceOffsetMm: number; // 0.0 to 0.4 mm
  dishDepthMm: number; // 0.2 to 1.5 mm
  wallThicknessMm: number; // 1.0 to 2.5 mm
  trayRows: number; // 1 to 6
  trayCols: number; // 1 to 6
  trayTiltAngleDeg: number; // 0 to 20 deg
  trayWallThicknessMm: number; // 2.0 to 6.0 mm
}

export interface KeycapMetrics {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  shellTriangles: number;
  stemTriangles: number;
  legendTriangles: number;
  totalTriangles: number;
  estimatedGrams: number;
  estimatedPrintTimeHours: number;
  slicerTips: string[];
}

export interface KeycapSwitchTesterMakerResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metrics: KeycapMetrics;
  error?: string;
}

export interface KeycapPreset {
  id: string;
  name: string;
  description: string;
  options: Partial<KeycapSwitchTesterMakerOptions>;
}

export interface KeycapWorkerRequest {
  id: number;
  options: KeycapSwitchTesterMakerOptions;
  format: KeycapExportFormat;
}

export interface KeycapWorkerResponse {
  id: number;
  type: 'progress' | 'result' | 'error';
  percent?: number;
  buffer?: ArrayBuffer;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  metrics?: KeycapMetrics;
  error?: string;
}
