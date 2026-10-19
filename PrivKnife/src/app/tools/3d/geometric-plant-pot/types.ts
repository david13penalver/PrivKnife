export type AestheticStyle =
  | 'low_poly_faceted'
  | 'twisted_polygon'
  | 'vertical_flutes'
  | 'smooth_minimal';

export type PlanterType =
  | 'decorative_cover'
  | 'drainage_with_saucer'
  | 'self_watering_insert';

export interface GeometricPlantPotOptions {
  aestheticStyle: AestheticStyle;
  polygonSides: number; // 3 - 16
  twistAngleDeg: number; // -180 to 180 deg
  topDiameterMm: number; // 40 - 250 mm
  bottomDiameterMm: number; // 30 - 200 mm
  heightMm: number; // 40 - 250 mm
  wallThicknessMm: number; // 1.6 - 5.0 mm
  planterType: PlanterType;
  wickHoleDiameterMm: number; // 4 - 16 mm
  waterSpoutOpening: boolean;
  explodedView?: boolean;
}

export interface GeometricPlantPotMetrics {
  outerDiameterMm: number;
  totalHeightMm: number;
  reservoirCapacityMl: number;
  potTriangleCount: number;
  insertTriangleCount: number;
  saucerTriangleCount: number;
  totalTriangles: number;
  estimatedGrams: number;
  estimatedPrintTimeHours: number;
  slicerTips: string[];
}

export interface GeometricPlantPotResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metrics: GeometricPlantPotMetrics;
  error?: string;
}

export interface PresetPlanter {
  id: string;
  name: string;
  description: string;
  options: Partial<GeometricPlantPotOptions>;
}
