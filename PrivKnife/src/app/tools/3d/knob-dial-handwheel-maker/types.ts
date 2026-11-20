import * as THREE from 'three';

export type KnobGripStyle = 'knurled' | 'fluted' | 'star_handwheel' | 'pointer_wing';

export type ShaftDriveType =
  | 'd_shaft'
  | 'splined'
  | 'captive_hex_nut'
  | 'captive_hex_bolt'
  | 'set_screw_round';

export type KnobHardwarePreset = 'custom' | 'M3' | 'M4' | 'M5' | 'M6' | 'M8' | 'quarter_20';

export interface KnobDialHandwheelOptions {
  gripStyle: KnobGripStyle;
  gripDiameterMm: number; // 14..90
  gripHeightMm: number; // 10..45
  neckDiameterMm: number; // 10..40
  neckHeightMm: number; // 0..15
  knurlOrLobeCount: number; // 3..48
  topBevelMm: number; // 0.4..4.0
  driveType: ShaftDriveType;
  hardwarePreset: KnobHardwarePreset;
  shaftDiameterMm: number; // 3.0..12.0
  dFlatThicknessMm: number; // 2.0..10.0
  flatRotationDeg: 0 | 90 | 180 | 270;
  splineTeethCount: number; // 12..24
  socketDepthMm: number; // 6..35
  fitToleranceMm: number; // 0.10..0.45
  sacrificialBridgeLayer: boolean;
  includeIndicatorMark: boolean;
  bodyColorHex: string;
  indicatorColorHex: string;
  sectionCutaway: boolean;
}

export interface KnobDialMetrics {
  outerDiameterMm: number;
  totalHeightMm: number;
  minHubWallMm: number;
  triangleCount: number;
  estimatedWeightG: number;
  estimatedPrintTimeHours: number;
}

export interface KnobValidationResult {
  valid: boolean;
  error?: string;
}

export interface KnobParts {
  bodyGeometry: THREE.BufferGeometry;
  indicatorGeometry: THREE.BufferGeometry | null;
  outerDiameterMm: number;
  totalHeightMm: number;
  minHubWallMm: number;
  hexSocketCircumradiusMm: number | null;
  dispose(): void;
}

export interface KnobWorkerRequest {
  id: number;
  type: 'export-stl' | 'export-3mf';
  options: KnobDialHandwheelOptions;
}

export interface KnobWorkerResponse {
  id: number;
  type: 'progress' | 'result' | 'error';
  percent?: number;
  buffer?: ArrayBuffer;
  fileName?: string;
  mimeType?: string;
  metrics?: KnobDialMetrics;
  error?: string;
}

export interface KnobHardwareStandard {
  id: Exclude<KnobHardwarePreset, 'custom'>;
  label: string;
  acrossFlatsMm: number;
  boltClearanceMm: number;
  nutHeightMm: number;
  boltHeadHeightMm: number;
}

export const KNOB_HARDWARE_STANDARDS: Record<
  Exclude<KnobHardwarePreset, 'custom'>,
  KnobHardwareStandard
> = {
  M3: { id: 'M3', label: 'M3 (AF 5.5mm)', acrossFlatsMm: 5.5, boltClearanceMm: 3.4, nutHeightMm: 2.4, boltHeadHeightMm: 2.0 },
  M4: { id: 'M4', label: 'M4 (AF 7.0mm)', acrossFlatsMm: 7.0, boltClearanceMm: 4.4, nutHeightMm: 3.2, boltHeadHeightMm: 2.8 },
  M5: { id: 'M5', label: 'M5 (AF 8.0mm)', acrossFlatsMm: 8.0, boltClearanceMm: 5.4, nutHeightMm: 4.0, boltHeadHeightMm: 3.5 },
  M6: { id: 'M6', label: 'M6 (AF 10.0mm)', acrossFlatsMm: 10.0, boltClearanceMm: 6.4, nutHeightMm: 5.0, boltHeadHeightMm: 4.0 },
  M8: { id: 'M8', label: 'M8 (AF 13.0mm)', acrossFlatsMm: 13.0, boltClearanceMm: 8.5, nutHeightMm: 6.5, boltHeadHeightMm: 5.3 },
  quarter_20: {
    id: 'quarter_20',
    label: '1/4"-20 (AF 11.1mm)',
    acrossFlatsMm: 11.1,
    boltClearanceMm: 6.7,
    nutHeightMm: 5.6,
    boltHeadHeightMm: 4.4,
  },
};

export const DEFAULT_KNOB_OPTIONS: KnobDialHandwheelOptions = {
  gripStyle: 'knurled',
  gripDiameterMm: 28,
  gripHeightMm: 18,
  neckDiameterMm: 16,
  neckHeightMm: 4,
  knurlOrLobeCount: 28,
  topBevelMm: 1.4,
  driveType: 'd_shaft',
  hardwarePreset: 'M6',
  shaftDiameterMm: 6.0,
  dFlatThicknessMm: 4.5,
  flatRotationDeg: 0,
  splineTeethCount: 18,
  socketDepthMm: 15,
  fitToleranceMm: 0.2,
  sacrificialBridgeLayer: true,
  includeIndicatorMark: true,
  bodyColorHex: '#2563eb',
  indicatorColorHex: '#f8fafc',
  sectionCutaway: false,
};
