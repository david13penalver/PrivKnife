export type CompressionPreset = 'extreme' | 'recommended' | 'high_quality' | 'custom';
export type CompressionMode = 'smart_stream' | 'rasterize_pages';

export type PdfCompressorErrorCode =
  | 'INVALID_INPUT'
  | 'ENCRYPTED_PDF'
  | 'CORRUPT_PDF'
  | 'INVALID_OPTIONS'
  | 'WORKER_ERROR';

export interface PdfCompressorOptions {
  preset: CompressionPreset;
  mode: CompressionMode;
  targetDpi: number;
  maxImageDimensionPx: number;
  jpegQuality: number;
  convertToGrayscale: boolean;
  stripMetadata: boolean;
  removeThumbnails: boolean;
}

export interface PdfCompressionMetrics {
  originalBytes: number;
  compressedBytes: number;
  savedBytes: number;
  savingsPercent: number;
  pageCount: number;
  imagesOptimized: number;
  imagesSkipped: number;
  usedOriginalFallback: boolean;
  durationMs: number;
}

export interface PdfCompressorFileInput {
  fileName: string;
  bytes: Uint8Array;
}

export interface PdfCompressorFileResult {
  fileName: string;
  outputFileName: string;
  blob: Blob;
  bytes: Uint8Array;
  metrics: PdfCompressionMetrics;
}

export interface PdfCompressorResult {
  success: boolean;
  files: PdfCompressorFileResult[];
  bundleZipBlob?: Blob;
  bundleZipFileName?: string;
  error?: string;
  errorCode?: PdfCompressorErrorCode;
}

export interface ImageReencodeRequest {
  bytes: Uint8Array;
  mimeType: 'image/jpeg' | 'image/png';
  width: number;
  height: number;
  targetWidth: number;
  targetHeight: number;
  quality: number;
  grayscale: boolean;
}

export type ImageReencoderFn = (req: ImageReencodeRequest) => Promise<Uint8Array | null>;

export interface RasterizedPageImage {
  jpegBytes: Uint8Array;
  widthPt: number;
  heightPt: number;
}

export type PageRasterizerFn = (
  bytes: Uint8Array,
  options: PdfCompressorOptions,
  onProgress?: (done: number, total: number) => void
) => Promise<RasterizedPageImage[]>;

export interface PdfCompressorDeps {
  reencodeImage?: ImageReencoderFn;
  rasterizePages?: PageRasterizerFn;
  onProgress?: (percent: number, stage: string) => void;
}

export interface PdfCompressorWorkerRequest {
  type: 'compress';
  files: PdfCompressorFileInput[];
  options: PdfCompressorOptions;
}

export type PdfCompressorWorkerResponse =
  | { type: 'progress'; percent: number; stage: string }
  | { type: 'done'; result: PdfCompressorResult };
