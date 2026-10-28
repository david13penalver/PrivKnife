export type CurveType = 'spline' | 'conical' | 'hourglass' | 'bulbous' | 'scurve';
export type RibProfile = 'sine' | 'pleat' | 'scallop' | 'gear' | 'voronoi';
export type RibWaveType = RibProfile;
export type PrintMode = 'shell' | 'vase';
export type SocketPreset = 'e27' | 'e14' | 'ikea' | 'custom' | 'none';
export type MountPosition = 'bottom' | 'top';

export interface LampConfig {
  // Silhouette & Dimensions
  curveType: CurveType;
  height: number; // 60 - 320 mm
  bottomRadius: number; // 25 - 140 mm
  midRadius: number; // 25 - 140 mm
  topRadius: number; // 20 - 120 mm
  waistRatio: number; // 0.15 - 0.85
  radialSegs: number; // 24 - 240
  heightSegs: number; // 16 - 160

  // Ribs, Twist & Surface
  ribProfile: RibProfile;
  ribCount: number; // 0 - 64
  ribDepth: number; // 0 - 25 mm
  twistAngle: number; // -360 - 360 deg
  vWaveFreq: number; // 0 - 10
  vWaveAmp: number; // 0 - 15 mm

  // 3D Print & Socket Engineering
  printMode: PrintMode;
  wallThickness: number; // 0.8 - 4.0 mm
  socketPreset: SocketPreset;
  socketDia: number; // 15 - 60 mm
  mountPos: MountPosition;
  spokeCount: number; // 2 - 8
  spokeWidth: number; // 3 - 12 mm
  collarWidth: number; // 3 - 12 mm
  collarHeight: number; // 3 - 15 mm

  // Filament styling
  filamentId: string;
}

export interface FilamentOption {
  id: string;
  name: string;
  baseColor: number;
  glowColor: number;
  deepColor: number;
  roughness: number;
  transmissionStrength: number;
}

export interface LampMetrics {
  dimensionsMm: {
    width: number;
    depth: number;
    height: number;
  };
  triangleCount: number;
  vertexCount: number;
  estimatedVolumeCm3: number;
  estimatedGrams: number;
  estimatedPrintTimeHours: number;
  slicerTips: string[];
}

export interface PresetLampShade {
  id: string;
  name: string;
  description: string;
  config: Partial<LampConfig>;
}

export interface ParametricLampDesignerResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metrics: LampMetrics;
}

export interface LampWorkerRequest {
  id: number;
  type: 'export-stl' | 'export-3mf' | 'generate-mesh';
  config: LampConfig;
}

export interface LampWorkerResponse {
  id: number;
  type: 'progress' | 'result' | 'error';
  percent?: number;
  buffer?: ArrayBuffer;
  blob?: Blob;
  error?: string;
}
