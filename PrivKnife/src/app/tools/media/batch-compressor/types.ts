export type OutputFormat = 'webp' | 'jpeg' | 'png' | 'original';
export type ResizePreset = 'none' | '3840' | '1920' | '1280' | '800' | 'custom';
export type QueueItemStatus = 'queued' | 'processing' | 'done' | 'error';

export interface CompressionOptions {
  format: OutputFormat;
  quality: number; // 1 to 100
  resizePreset: ResizePreset;
  customMaxDimension?: number;
  preserveAspectRatio: boolean;
}

export interface ImageQueueItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  originalWidth: number;
  originalHeight: number;
  originalMimeType: string;
  originalPreviewUrl: string;

  // Processed Output
  status: QueueItemStatus;
  progress: number;
  compressedBlob?: Blob;
  compressedSize?: number;
  compressedWidth?: number;
  compressedHeight?: number;
  compressedPreviewUrl?: string;
  compressedFileName?: string;
  savedBytes?: number;
  savingsPercent?: number;
  errorMessage?: string;
}

export interface BatchCompressionStats {
  totalFiles: number;
  processedFiles: number;
  totalOriginalBytes: number;
  totalCompressedBytes: number;
  totalSavedBytes: number;
  totalSavingsPercent: number;
}
