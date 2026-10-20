export type MeasurementUnit = 'metric_meters' | 'imperial_feet';
export type BlueprintScale = '1:20' | '1:50' | '1:100';
export type ThemeColor = 'blueprint_blue' | 'classic_cad_dark' | 'clean_white';

export interface Point2D {
  x: number; // in centimeters
  y: number; // in centimeters
}

export interface Wall {
  id: string;
  start: Point2D;
  end: Point2D;
  thicknessCm: number;
  isExterior?: boolean;
}

export interface Door {
  id: string;
  x: number;
  y: number;
  widthCm: number;
  rotationDeg: number;
  swingDirection: 'left' | 'right';
  isOpenInward: boolean;
  wallId?: string;
}

export interface WindowOpening {
  id: string;
  x: number;
  y: number;
  widthCm: number;
  depthCm?: number;
  rotationDeg: number;
  wallId?: string;
}

export type FurnitureCategory =
  | 'seating'
  | 'bedroom'
  | 'office'
  | 'tables'
  | 'storage'
  | 'kitchen'
  | 'bathroom';

export type FurnitureType =
  | 'bed_single'
  | 'bed_double'
  | 'bed_king'
  | 'desk_office'
  | 'desk_corner'
  | 'sofa_2seat'
  | 'sofa_3seat'
  | 'armchair'
  | 'dining_table_4'
  | 'dining_table_6'
  | 'dining_chair'
  | 'wardrobe'
  | 'bookshelf'
  | 'bathtub'
  | 'shower'
  | 'toilet'
  | 'sink'
  | 'kitchen_counter'
  | 'refrigerator'
  | 'custom';

export interface FurnitureTemplate {
  type: FurnitureType;
  category: FurnitureCategory;
  name: string;
  defaultWidthCm: number;
  defaultDepthCm: number;
  icon?: string;
}

export interface FurnitureItem {
  id: string;
  type: FurnitureType;
  name: string;
  x: number;
  y: number;
  widthCm: number;
  depthCm: number;
  rotationDeg: number;
  color?: string;
}

export interface Room {
  id: string;
  name: string;
  points: Point2D[];
}

export interface FloorPlanOptions {
  measurementUnit: MeasurementUnit;
  blueprintScale: BlueprintScale;
  gridSnapStepCm: number;
  wallThicknessCm: number;
  showDimensions: boolean;
  showAreaReadouts: boolean;
  showFurniture: boolean;
  showGrid: boolean;
  themeColor: ThemeColor;
  projectName: string;
  designerName: string;
}

export interface FloorPlanProject {
  version: string;
  name: string;
  options: FloorPlanOptions;
  walls: Wall[];
  doors: Door[];
  windows: WindowOpening[];
  furniture: FurnitureItem[];
  rooms: Room[];
}

export interface ClearanceWarning {
  itemId1: string;
  itemId2: string;
  item1Name: string;
  item2Name: string;
  type: 'overlap' | 'tight_clearance';
  distanceCm: number;
}

export interface FloorPlanExportResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metadata?: Record<string, unknown>;
}
