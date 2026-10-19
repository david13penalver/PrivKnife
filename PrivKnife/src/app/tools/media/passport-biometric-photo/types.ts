export type CountryPreset =
  | 'us_2x2_inch'
  | 'eu_schengen_35x45mm'
  | 'uk_35x45mm'
  | 'canada_50x70mm'
  | 'japan_30x40mm'
  | 'china_33x48mm';

export type PrintSheetSize = '4x6_inches' | 'a4' | 'a6' | 'single_digital';

export type BackgroundColorOption =
  | 'original'
  | 'pure_white'
  | 'off_white'
  | 'light_grey'
  | 'light_blue';

export type PassportExportFormat = 'jpg' | 'pdf' | 'png';

export interface PassportBiometricPhotoOptions {
  countryPreset: CountryPreset;
  printSheetSize: PrintSheetSize;
  backgroundColor: BackgroundColorOption;
  cutGuideLines: boolean;
  exportDpi: number; // 150 - 600, default 300
  zoomLevel: number; // 0.5 - 3.0, default 1.0
  tiltAngleDeg: number; // -15 to +15, default 0
  brightness: number; // -50 to +50, default 0
  contrast: number; // -50 to +50, default 0
  panX: number; // -200 to +200, default 0
  panY: number; // -200 to +200, default 0
}

export interface PassportSpecification {
  name: string;
  country: string;
  widthMm: number;
  heightMm: number;
  widthPx300Dpi: number;
  heightPx300Dpi: number;
  minHeadHeightMm: number;
  maxHeadHeightMm: number;
  complianceNotes: string[];
}

export interface PassportMetrics {
  photoWidthMm: number;
  photoHeightMm: number;
  photoWidthPx: number;
  photoHeightPx: number;
  sheetWidthMm: number;
  sheetHeightMm: number;
  sheetWidthPx: number;
  sheetHeightPx: number;
  photosPerSheet: number;
  exportDpi: number;
  complianceNotes: string[];
}

export interface PassportBiometricPhotoResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metrics: PassportMetrics;
  error?: string;
}

export interface PassportPreset {
  id: string;
  name: string;
  description: string;
  options: Partial<PassportBiometricPhotoOptions>;
}
