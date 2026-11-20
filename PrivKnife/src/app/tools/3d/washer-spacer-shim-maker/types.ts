import * as THREE from 'three';

export type HardwarePartType =
  | 'washer_spacer'
  | 'flanged_bushing'
  | 'hex_standoff'
  | 'leveling_wedge'
  | 'u_slot_shim';

export type MetricBoltPreset =
  | 'custom'
  | 'M2'
  | 'M2.5'
  | 'M3'
  | 'M4'
  | 'M5'
  | 'M6'
  | 'M8'
  | 'M10';

export interface WasherSpacerShimOptions {
  partType: HardwarePartType;
  boltPreset: MetricBoltPreset;
  outerDiameterMm: number; // 6..120 (or width for shim/wedge)
  flangeDiameterMm: number; // 8..140 (flanged_bushing only)
  flangeHeightMm: number; // 0.8..20 (flanged_bushing only)
  innerDiameterMm: number; // 1.8..90
  heightMm: number; // 0.4..80
  chamferMm: number; // 0..3.0
  wedgeLengthMm: number; // 25..150
  wedgeMinHeightMm: number; // 0.4..10
  includeWedgeRibs: boolean;
  includeScrewSlot: boolean;
  holeToleranceMm: number; // 0..0.50
  quantity: number; // 1..24
  includeBrimTabs: boolean;
  partColorHex: string;
}

export interface HardwarePartMetrics {
  widthMm: number;
  depthMm: number;
  heightMm: number;
  radialWallMm: number;
  highAspectWarning: boolean;
  triangleCount: number;
  estimatedWeightG: number;
  estimatedPrintTimeHours: number;
  exceedsStandardBed: boolean;
}

export interface HardwareValidationResult {
  valid: boolean;
  error?: string;
}

export interface HardwarePlateParts {
  singleGeometry: THREE.BufferGeometry;
  partGeometries: THREE.BufferGeometry[];
  mergedGeometry: THREE.BufferGeometry;
  partWidthMm: number;
  partDepthMm: number;
  partHeightMm: number;
  plateWidthMm: number;
  plateDepthMm: number;
  radialWallMm: number;
  effectiveChamferMm: number;
  quantity: number;
  cols: number;
  rows: number;
  dispose(): void;
}

export interface HardwareWorkerRequest {
  id: number;
  type: 'export-stl' | 'export-3mf';
  options: WasherSpacerShimOptions;
}

export interface HardwareWorkerResponse {
  id: number;
  type: 'progress' | 'result' | 'error';
  percent?: number;
  buffer?: ArrayBuffer;
  fileName?: string;
  mimeType?: string;
  metrics?: HardwarePartMetrics;
  error?: string;
}

export interface MetricBoltSpec {
  id: Exclude<MetricBoltPreset, 'custom'>;
  label: string;
  boreMm: number;
  recommendedOdMm: number;
}

export const STANDARD_BED_SIZE_MM = 220;
export const PART_ARRAY_GAP_MM = 6.0;

export const METRIC_BOLT_PRESETS: Record<Exclude<MetricBoltPreset, 'custom'>, MetricBoltSpec> = {
  M2: { id: 'M2', label: 'M2 (Ø2.2)', boreMm: 2.2, recommendedOdMm: 6 },
  'M2.5': { id: 'M2.5', label: 'M2.5 (Ø2.7)', boreMm: 2.7, recommendedOdMm: 7 },
  M3: { id: 'M3', label: 'M3 (Ø3.2)', boreMm: 3.2, recommendedOdMm: 8 },
  M4: { id: 'M4', label: 'M4 (Ø4.3)', boreMm: 4.3, recommendedOdMm: 10 },
  M5: { id: 'M5', label: 'M5 (Ø5.3)', boreMm: 5.3, recommendedOdMm: 12 },
  M6: { id: 'M6', label: 'M6 (Ø6.4)', boreMm: 6.4, recommendedOdMm: 18 },
  M8: { id: 'M8', label: 'M8 (Ø8.4)', boreMm: 8.4, recommendedOdMm: 20 },
  M10: { id: 'M10', label: 'M10 (Ø10.5)', boreMm: 10.5, recommendedOdMm: 24 },
};

export const DEFAULT_HARDWARE_OPTIONS: WasherSpacerShimOptions = {
  partType: 'washer_spacer',
  boltPreset: 'M6',
  outerDiameterMm: 18,
  flangeDiameterMm: 24,
  flangeHeightMm: 2.5,
  innerDiameterMm: 6.4,
  heightMm: 5,
  chamferMm: 0.6,
  wedgeLengthMm: 65,
  wedgeMinHeightMm: 1.0,
  includeWedgeRibs: true,
  includeScrewSlot: false,
  holeToleranceMm: 0.25,
  quantity: 4,
  includeBrimTabs: false,
  partColorHex: '#2563eb',
};
