import * as THREE from 'three';

export type CradleStyle = 'slide_rails_pair' | 'u_wrap_cradle' | 'remote_pocket';

export type MountFlangePlacement = 'external_ears' | 'internal_floor' | 'adhesive_flat';

export interface DeviceWallCradleOptions {
  cradleStyle: CradleStyle;
  deviceWidthMm: number; // 30..280
  deviceThicknessMm: number; // 14..90
  mountSpanMm: number; // 25..180
  wallThicknessMm: number; // 2.8..6.0
  fitClearanceMm: number; // 0.4..2.0
  railShelfWidthMm: number; // 10..28 (used in slide_rails_pair)
  includeBackstop: boolean;
  includeThermalVents: boolean;
  mountFlangePlacement: MountFlangePlacement;
  screwDiameterMm: number; // 3.2..5.5
  filamentColorHex: string;
}

export interface DeviceCradleMetrics {
  partCount: number;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  innerOpeningWidthMm: number;
  innerOpeningHeightMm: number;
  triangleCount: number;
  estimatedWeightG: number;
  estimatedPrintTimeHours: number;
  exceedsStandardBed: boolean;
}

export interface DeviceCradleValidationResult {
  valid: boolean;
  error?: string;
}

export interface DeviceCradlePartEntry {
  name: string;
  geometry: THREE.BufferGeometry;
}

export interface DeviceCradleParts {
  partGeometries: DeviceCradlePartEntry[];
  mergedGeometry: THREE.BufferGeometry;
  innerOpeningWidthMm: number;
  innerOpeningHeightMm: number;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  screwHoleCount: number;
  ventSlotCount: number;
  dispose(): void;
}

export interface DeviceCradleWorkerRequest {
  id: number;
  type: 'export-stl' | 'export-3mf';
  options: DeviceWallCradleOptions;
}

export interface DeviceCradleWorkerResponse {
  id: number;
  type: 'progress' | 'result' | 'error';
  percent?: number;
  buffer?: ArrayBuffer;
  fileName?: string;
  mimeType?: string;
  metrics?: DeviceCradleMetrics;
  error?: string;
}

export const STANDARD_BED_SIZE_MM = 220;

export const DEFAULT_DEVICE_CRADLE_OPTIONS: DeviceWallCradleOptions = {
  cradleStyle: 'u_wrap_cradle',
  deviceWidthMm: 75,
  deviceThicknessMm: 32,
  mountSpanMm: 65,
  wallThicknessMm: 3.6,
  fitClearanceMm: 0.8,
  railShelfWidthMm: 16,
  includeBackstop: true,
  includeThermalVents: true,
  mountFlangePlacement: 'external_ears',
  screwDiameterMm: 4.2,
  filamentColorHex: '#2563eb',
};
