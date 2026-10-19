export type CensorMode = 'mosaic_pixelate' | 'gaussian_blur' | 'blackout_box';
export type SelectionMode = 'manual_rect' | 'brush_stroke' | 'auto_detect_faces';
export type ExportImageFormat = 'jpeg' | 'png';

export interface BlurRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  mode: CensorMode;
  blockSize?: number;
  blurRadius?: number;
}

export interface FacePlateBlurOptions {
  censorMode: CensorMode;
  mosaicBlockSize: number; // 4 - 40, default 16
  blurRadiusPx: number; // 2 - 30, default 12
  selectionMode: SelectionMode;
  brushRadiusPx: number; // 5 - 50, default 20
  exportQuality: number; // 0.5 - 1.0, default 0.92
  exportFormat: ExportImageFormat; // default 'jpeg'
  stripExif: boolean;
  regions?: BlurRegion[];
}

export interface FacePlateBlurResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metadata?: {
    width: number;
    height: number;
    regionsCensored: number;
    exifStripped: boolean;
  };
}
