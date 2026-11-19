export type ConverterDirection = 'pdf_to_images' | 'images_to_pdf';
export type OutputImageFormat = 'image/png' | 'image/jpeg' | 'image/webp';
export type PageSizePreset = 'fit_to_image' | 'a4' | 'letter' | 'legal';
export type PageOrientation = 'auto' | 'portrait' | 'landscape';
export type ScanFilterPreset = 'none' | 'enhanced_color' | 'bw_document';

export type PdfImageConverterErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_OPTIONS'
  | 'INVALID_RANGE'
  | 'INVALID_IMAGE'
  | 'ENCRYPTED_PDF'
  | 'CORRUPT_PDF'
  | 'CANCELLED'
  | 'WORKER_ERROR';

export interface PdfToImagesOptions {
  format: OutputImageFormat;
  dpi: number;
  quality: number;
  selectedPages: number[];
  transparentBackground: boolean;
}

export interface ImagePageInput {
  id: string;
  fileName: string;
  bytes: Uint8Array;
  mimeType: string;
  rotationDeg: 0 | 90 | 180 | 270;
  scanFilter: ScanFilterPreset;
}

export interface ImagesToPdfOptions {
  pageSize: PageSizePreset;
  orientation: PageOrientation;
  marginPt: number;
  jpegQuality: number;
  outputFileName: string;
}

export interface PdfImageConverterResult {
  success: boolean;
  blob?: Blob;
  bytes?: Uint8Array;
  fileName: string;
  fileSize: number;
  mimeType: string;
  itemCount: number;
  warnings: string[];
  errorCode?: PdfImageConverterErrorCode;
  error?: string;
}

export interface RenderedPageAsset {
  pageNumber: number;
  bytes: Uint8Array;
  mimeType: OutputImageFormat;
  wasClamped: boolean;
}

export type PdfPageImageRendererFn = (
  pdfBytes: Uint8Array,
  pageNumbers: number[],
  options: PdfToImagesOptions,
  hooks?: {
    onProgress?: (done: number, total: number) => void;
    signal?: AbortSignal;
  }
) => Promise<RenderedPageAsset[]>;

export interface NormalizedImageAsset {
  bytes: Uint8Array;
  format: 'png' | 'jpeg';
  widthPx: number;
  heightPx: number;
  appliedRotation?: boolean;
}

export type ImageNormalizerFn = (
  input: ImagePageInput,
  jpegQuality: number
) => Promise<NormalizedImageAsset>;

export interface PdfImageConverterDeps {
  renderPages?: PdfPageImageRendererFn;
  normalizeImage?: ImageNormalizerFn;
  onProgress?: (percent: number, stage: string) => void;
  signal?: AbortSignal;
}

export type PdfImageWorkerRequest =
  | {
      type: 'pdf_to_images';
      pdfBytes: Uint8Array;
      fileName: string;
      options: PdfToImagesOptions;
    }
  | {
      type: 'images_to_pdf';
      images: ImagePageInput[];
      options: ImagesToPdfOptions;
    };

export type PdfImageWorkerResponse =
  | { type: 'progress'; percent: number; stage: string }
  | { type: 'done'; result: PdfImageConverterResult };
