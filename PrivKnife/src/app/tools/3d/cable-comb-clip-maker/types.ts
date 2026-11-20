import * as THREE from 'three';

export type CableToolMode = 'cable_comb' | 'travel_winder' | 'p_clip_array';

export type ClipMountStyle = 'screw_hole' | 'adhesive_flat';

export interface CableCombClipOptions {
  mode: CableToolMode;
  cableDiameterMm: number; // 2.5..12.0
  slotCount: number; // 3..14 (cable_comb) or 1..3 (p_clip_array channels)
  ascendingSlotGradation: boolean;
  entryPinchRatio: number; // 0.78..0.92
  mountStyle: ClipMountStyle;
  // Travel Winder
  winderOuterDiameterMm: number; // 45..95
  winderCordLengthM: number; // 0.5..3.0
  winderCoreDiameterMm: number; // 22..40
  // Plate Batch
  clipQuantity: number; // 1..12
  clipDepthMm: number; // 10..28
  filamentColorHex: string;
}

export interface CableToolMetrics {
  entryMouthWidthMm: number;
  cavityDiameterMm: number;
  maxRecommendedCordM: number;
  cordCapacityOk: boolean;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  triangleCount: number;
  estimatedWeightG: number;
  estimatedPrintTimeHours: number;
}

export interface CableToolValidationResult {
  valid: boolean;
  error?: string;
}

export interface CableToolPartEntry {
  name: string;
  geometry: THREE.BufferGeometry;
}

export interface CableToolParts {
  partGeometries: CableToolPartEntry[];
  mergedGeometry: THREE.BufferGeometry;
  entryMouthWidthMm: number;
  cavityDiameterMm: number;
  maxRecommendedCordM: number;
  cordCapacityOk: boolean;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  dispose(): void;
}

export interface CableToolWorkerRequest {
  id: number;
  type: 'export-stl' | 'export-3mf';
  options: CableCombClipOptions;
}

export interface CableToolWorkerResponse {
  id: number;
  type: 'progress' | 'result' | 'error';
  percent?: number;
  buffer?: ArrayBuffer;
  fileName?: string;
  mimeType?: string;
  metrics?: CableToolMetrics;
  error?: string;
}

export interface CableGaugeSpec {
  id: string;
  label: string;
  diameterMm: number;
}

export const CABLE_GAUGE_PRESETS: CableGaugeSpec[] = [
  { id: 'usb_c_3_5', label: 'USB-C (3.5mm)', diameterMm: 3.5 },
  { id: 'hdmi_cat6_5_5', label: 'HDMI / Cat6 (5.5mm)', diameterMm: 5.5 },
  { id: 'ac_mains_8_0', label: 'AC Power (8.0mm)', diameterMm: 8.0 },
];

export const DEFAULT_CABLE_TOOL_OPTIONS: CableCombClipOptions = {
  mode: 'cable_comb',
  cableDiameterMm: 6.0,
  slotCount: 6,
  ascendingSlotGradation: true,
  entryPinchRatio: 0.82,
  mountStyle: 'screw_hole',
  winderOuterDiameterMm: 74,
  winderCordLengthM: 1.8,
  winderCoreDiameterMm: 26,
  clipQuantity: 6,
  clipDepthMm: 16,
  filamentColorHex: '#2563eb',
};
