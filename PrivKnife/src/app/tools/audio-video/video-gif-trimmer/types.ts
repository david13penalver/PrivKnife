export type OutputFormat = 'gif' | 'video';

export type ResolutionPreset = 'original' | '720p' | '480p' | '360p' | '240p';

export interface TrimmerConfig {
  startTimeSec: number;
  endTimeSec: number;
  outputFormat: OutputFormat;
  resolution: ResolutionPreset;
  fps: number; // 5, 10, 15, 20, 24, 30
  playbackSpeed: number; // 0.5, 1.0, 1.5, 2.0
  gifQuality: 64 | 128 | 256; // max colors
  isReverse: boolean;
  loopCount: number; // 0 = infinite loop
}

export interface VideoMetadata {
  fileName: string;
  fileSizeBytes: number;
  durationSeconds: number;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface ConversionProgress {
  isConverting: boolean;
  percentage: number; // 0 to 100
  stage: string;
  elapsedSeconds: number;
}

export interface ConvertedOutput {
  blob: Blob;
  url: string;
  fileName: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  durationSeconds: number;
  format: OutputFormat;
}

export interface GifEncoderOptions {
  width: number;
  height: number;
  fps: number;
  loopCount?: number;
  maxColors?: number;
}
