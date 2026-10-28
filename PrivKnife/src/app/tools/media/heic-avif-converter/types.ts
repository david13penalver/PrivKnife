export type OutputFormat = 'jpeg' | 'png' | 'webp';

export interface HeicAvifConverterOptions {
  outputFormat: OutputFormat;
  jpegQuality: number; // 0.1 to 1.0 (default 0.92)
  stripMetadata: boolean;
  maxDimensionPx: number; // 0 = original, or 800, 1080, 1920, 2560, 3840
  filenameSuffix: string;
  packageAsZip: boolean;
}

export interface ConvertedImageItem {
  id: string;
  originalFile: File | Blob;
  originalName: string;
  originalSize: number;
  originalMimeType: string;
  convertedBlob?: Blob;
  convertedName?: string;
  convertedSize?: number;
  convertedMimeType?: string;
  width?: number;
  height?: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  errorMessage?: string;
}

export interface HeicAvifConverterResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metadata?: {
    totalImages: number;
    totalOriginalBytes: number;
    totalConvertedBytes: number;
    compressionRatio: number;
  };
}

export interface HeicAvifBatchStats {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  totalOriginalSize: number;
  totalConvertedSize: number;
  savedBytes: number;
  savingsPercentage: number;
}

export interface HeicAvifWorkerRequest {
  type: 'convert';
  files: (File | Blob)[];
  itemIds?: string[];
  options: HeicAvifConverterOptions;
}

export interface HeicAvifWorkerProgressResponse {
  type: 'progress';
  progressPercent: number;
  item: ConvertedImageItem;
}

export interface HeicAvifWorkerDoneResponse {
  type: 'done';
  success: boolean;
  result?: HeicAvifConverterResult;
  error?: string;
}

export type HeicAvifWorkerResponse =
  | HeicAvifWorkerProgressResponse
  | HeicAvifWorkerDoneResponse;
