export type RackBottlePreset =
  | 'spice_jar' | 'vallejo_17ml' | 'citadel_pot' | 'essential_oil'
  | 'nespresso_original' | 'nespresso_vertuo' | 'k_cup' | 'custom';

export type RackTopology = 'stepped_stadium' | 'honeycomb_tray' | 'capsule_track';

export interface JarBottleRackOptions {
  preset: RackBottlePreset;
  topology: RackTopology;
  bottleDiameterMm: number;
  fitClearanceMm: number;
  webWallThicknessMm: number;
  columns: number;
  rows: number;
  wellDepthMm: number;
  stepRiseMm: number;
  includeLabelCutout: boolean;
  includeSideDovetails: boolean;
  hollowVaultUnderside: boolean;
  splitForBed: boolean;
  invertedBottleWells: boolean;
  includeMountHoles: boolean;
  filamentColorHex: string;
}

export interface JarRackMetrics {
  totalCapacityCount: number;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  triangleCount: number;
  estimatedWeightG: number;
  estimatedPrintTimeHours: number;
  exceedsStandardBed: boolean;
  moduleCount: number;
  multiplePlates: boolean;
}

export const BOTTLE_PRESETS: Record<Exclude<RackBottlePreset, 'custom'>,
  { label: string; diameter: number; topology: RackTopology }> = {
  spice_jar: { label: 'spice_jar', diameter: 48, topology: 'stepped_stadium' },
  vallejo_17ml: { label: 'Vallejo 17 mL', diameter: 25.2, topology: 'honeycomb_tray' },
  citadel_pot: { label: 'Citadel', diameter: 33, topology: 'stepped_stadium' },
  essential_oil: { label: 'essential_oil', diameter: 28, topology: 'honeycomb_tray' },
  nespresso_original: { label: 'Nespresso Original', diameter: 37.2, topology: 'capsule_track' },
  nespresso_vertuo: { label: 'Nespresso Vertuo', diameter: 58.5, topology: 'capsule_track' },
  k_cup: { label: 'K-Cup', diameter: 51, topology: 'capsule_track' },
};

export const DEFAULT_JAR_RACK_OPTIONS: JarBottleRackOptions = {
  preset: 'spice_jar',
  topology: 'stepped_stadium',
  bottleDiameterMm: BOTTLE_PRESETS.spice_jar.diameter,
  fitClearanceMm: 0.6,
  webWallThicknessMm: 2.4,
  columns: 3,
  rows: 3,
  wellDepthMm: 15,
  stepRiseMm: 24,
  includeLabelCutout: true,
  includeSideDovetails: false,
  hollowVaultUnderside: true,
  splitForBed: false,
  invertedBottleWells: false,
  includeMountHoles: false,
  filamentColorHex: '#406c81',
};
