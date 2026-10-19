export type CompressionPreset =
  | 'target_size_8mb'
  | 'target_size_25mb'
  | 'target_size_50mb'
  | 'custom_mb';

export type SocialAspectRatio =
  | 'original'
  | '9:16_vertical'
  | '1:1_square'
  | '4:5_portrait'
  | '16:9_landscape';

export type MaxResolutionPreset = '1080p' | '720p' | '480p' | '360p';

export type VideoOutputFormat = 'mp4' | 'webm';

export interface VideoCompressorResizerOptions {
  compressionPreset: CompressionPreset;
  customTargetSizeMb: number;
  aspectRatio: SocialAspectRatio;
  maxResolution: MaxResolutionPreset;
  audioMute: boolean;
  outputFormat: VideoOutputFormat;
  originalFileName?: string;
  originalSizeBytes?: number;
  durationSec?: number;
  sourceWidth?: number;
  sourceHeight?: number;
  videoBlob?: Blob;
}

export interface VideoCompressionPlan {
  targetSizeBytes: number;
  targetBitrateBps: number;
  audioBitrateBps: number;
  videoBitrateBps: number;
  targetWidth: number;
  targetHeight: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  estimatedOutputMb: number;
  resolutionLabel: string;
}

export interface VideoCompressorMetadata {
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatio: number;
  durationSec: number;
  dimensions: string;
  bitrateKbps: number;
  format: VideoOutputFormat;
  aspectRatio: SocialAspectRatio;
  audioMuted: boolean;
}

export interface VideoCompressorResizerResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metadata?: VideoCompressorMetadata;
  error?: string;
}
