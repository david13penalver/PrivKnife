export type AnchorPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type NumberingAnchor =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export type PdfStandardFontChoice = 'helvetica' | 'times' | 'courier';

export type PdfWatermarkErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_OPTIONS'
  | 'INVALID_RANGE'
  | 'INVALID_IMAGE'
  | 'ENCRYPTED_PDF'
  | 'CORRUPT_PDF'
  | 'WORKER_ERROR';

export interface WatermarkConfig {
  enabled: boolean;
  kind: 'text' | 'image';
  text: string;
  fontFamily: PdfStandardFontChoice;
  fontSizePt: number;
  colorHex: string;
  opacity: number;
  rotationDeg: number;
  layout: 'single' | 'tiled';
  anchor: AnchorPosition;
  tileGapPt: number;
  layer: 'over' | 'under';
  imageBytes?: Uint8Array;
  imageMimeType?: 'image/png' | 'image/jpeg';
  imageScalePercent: number;
  marginPt: number;
}

export interface PageNumberingConfig {
  enabled: boolean;
  mode: 'page_numbers' | 'bates';
  template: string;
  anchor: NumberingAnchor;
  startNumber: number;
  skipFirstPages: number;
  mirrorFacingPages: boolean;
  fontFamily: PdfStandardFontChoice;
  fontSizePt: number;
  colorHex: string;
  marginPt: number;
  opaqueBackdrop: boolean;
}

export interface PdfWatermarkNumberingOptions {
  pageRange: string;
  watermark: WatermarkConfig;
  numbering: PageNumberingConfig;
}

export interface PdfWatermarkNumberingResult {
  success: boolean;
  blob?: Blob;
  bytes?: Uint8Array;
  fileName: string;
  fileSize: number;
  pagesStamped: number;
  totalPages: number;
  winAnsiSubstitutions: number;
  errorCode?: PdfWatermarkErrorCode;
  error?: string;
}

export interface PdfWatermarkDeps {
  onProgress?: (percent: number, stage: string) => void;
}

export interface PdfWatermarkWorkerRequest {
  type: 'stamp';
  pdfBytes: Uint8Array;
  fileName: string;
  options: PdfWatermarkNumberingOptions;
}

export type PdfWatermarkWorkerResponse =
  | { type: 'progress'; percent: number; stage: string }
  | { type: 'done'; result: PdfWatermarkNumberingResult };
