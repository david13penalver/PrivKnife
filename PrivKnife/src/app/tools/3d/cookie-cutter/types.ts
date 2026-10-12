export interface Point2D {
  x: number;
  y: number;
}

export type ViewMode = 'assembly' | 'cutter-only' | 'stamp-only' | 'side-by-side';

export interface CookieCutterConfig {
  targetSizeMm: number; // e.g. 75mm (longest dimension)
  bladeHeightMm: number; // e.g. 15mm
  bladeWallMm: number; // e.g. 1.0mm
  flangeWidthMm: number; // e.g. 5.0mm (finger pressing flange)
  flangeThicknessMm: number; // e.g. 2.5mm
  stampBaseThicknessMm: number; // e.g. 2.5mm
  stampDetailHeightMm: number; // e.g. 2.0mm
  stampClearanceMm: number; // e.g. 1.0mm (gap so stamp glides inside cutter)
  stampHandleEnabled: boolean; // rear grip handle
  threshold: number; // 0-255 image binarization threshold
  invertImage: boolean;
  cutterColor: string; // hex #E11D48
  stampColor: string; // hex #F59E0B
}

export interface ContourData {
  outerContour: Point2D[];
  innerContours: Point2D[][];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
  };
}

export interface PresetShape {
  id: string;
  name: string;
  icon: string;
  description: string;
  outerContour: Point2D[];
  innerDetails: Point2D[][];
}

export interface ModelMetrics {
  cutterDimensionsMm: { width: number; height: number; depth: number };
  stampDimensionsMm: { width: number; height: number; depth: number };
  estimatedFilamentGrams: number;
  outerVertexCount: number;
  innerDetailLoops: number;
}
