export type GridfinityLipStyle = 'standard' | 'flat' | 'none';

export interface GridfinityBinGeneratorOptions {
  gridX: number; // 1 - 6 units (42mm per unit)
  gridY: number; // 1 - 6 units
  heightUnits: number; // 2 - 16 units (7mm per unit, e.g. 3U = 21mm, 6U = 42mm)
  subdivisionsX: number; // 1 - 6 compartments along X
  subdivisionsY: number; // 1 - 6 compartments along Y
  lipStyle: GridfinityLipStyle; // Stacking rim style
  fingerScoop: boolean; // Curved bottom scoop for small parts
  fingerScoopRadiusMm: number; // 6 - 20 mm
  labelTab: boolean; // Angled label maker tab
  labelTabWidthMm: number; // 12 - 42 mm
  labelAngleDeg: number; // 30 - 60 degrees (45 standard)
  baseMagnetHoles: boolean; // 6x2mm neodymium magnet pockets
  baseScrewHoles: boolean; // M3 screw mounting holes
  wallThicknessMm?: number; // default 1.2 mm
}

export interface GridfinityBinMetrics {
  totalWidthMm: number;
  totalLengthMm: number;
  totalHeightMm: number;
  internalCompartments: number;
  triangleCount: number;
  vertexCount: number;
  estimatedVolumeCm3: number;
  estimatedGrams: number;
  estimatedPrintTimeHours: number;
  slicerTips: string[];
}

export interface GridfinityBinGeneratorResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metrics: GridfinityBinMetrics;
  error?: string;
}

export interface PresetGridfinityBin {
  id: string;
  name: string;
  description: string;
  options: Partial<GridfinityBinGeneratorOptions>;
}
