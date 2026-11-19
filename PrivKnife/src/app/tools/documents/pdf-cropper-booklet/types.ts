export type CropBookletMode = 'crop' | 'resize' | 'nup' | 'booklet';
export type MeasurementUnit = 'pt' | 'mm' | 'in';
export type CropScope = 'all' | 'current' | 'odd_even_mirrored' | 'range';
export type TargetPaperPreset = 'a4' | 'letter' | 'legal' | 'a5' | 'custom';
export type PaperOrientation = 'auto' | 'portrait' | 'landscape';
export type ResizeScaleMode = 'contain' | 'stretch' | 'no_scale';

export type PdfCropBookletErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_PDF'
  | 'ENCRYPTED_PDF'
  | 'INVALID_INSETS'
  | 'INVALID_OPTIONS'
  | 'WORKER_ERROR';

export interface MarginInsetsPt {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PdfBoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfCropConfig {
  insetsPt: MarginInsetsPt;
  scope: CropScope;
  currentPage: number;
  pageRange: string;
  autoTrimPaddingPt: number;
  whiteThreshold: number;
}

export interface PdfResizeConfig {
  targetPaper: TargetPaperPreset;
  orientation: PaperOrientation;
  customWidthPt?: number;
  customHeightPt?: number;
  scaleMode: ResizeScaleMode;
  gutterMarginPt: number;
}

export interface PdfNupBookletConfig {
  pagesPerSheet: 2 | 4 | 6;
  targetPaper: 'a4' | 'letter';
  sheetOrientation: PaperOrientation;
  outerMarginPt: number;
  cellGapPt: number;
  drawCutGuides: boolean;
  readingDirection: 'ltr' | 'rtl';
}

export interface PdfCropperBookletOptions {
  mode: CropBookletMode;
  crop: PdfCropConfig;
  resize: PdfResizeConfig;
  nup: PdfNupBookletConfig;
}

export interface ImpositionSheetEntry {
  sheet: number;
  side: 'front' | 'back';
  pages: Array<number | null>;
}

export interface WhitespaceScanResult {
  insetsPt: MarginInsetsPt;
  isBlank: boolean;
}

export interface PdfCropperBookletResult {
  success: boolean;
  mode: CropBookletMode;
  blob?: Blob;
  bytes?: Uint8Array;
  fileName: string;
  fileSize: number;
  outputPageCount: number;
  impositionMap?: ImpositionSheetEntry[];
  errorCode?: PdfCropBookletErrorCode;
  error?: string;
}

export interface PdfCropperBookletDeps {
  onProgress?: (percent: number, stage: string) => void;
}

export type PdfCropperWorkerRequest = {
  type: 'process';
  pdfBytes: Uint8Array;
  fileName: string;
  options: PdfCropperBookletOptions;
};

export type PdfCropperWorkerResponse =
  | { type: 'progress'; percent: number; stage: string }
  | { type: 'done'; result: PdfCropperBookletResult };
