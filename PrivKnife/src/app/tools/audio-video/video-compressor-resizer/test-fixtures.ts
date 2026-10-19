import { VideoCompressorResizerOptions } from './types';

/**
 * Creates a synthetic mock video blob with container header.
 */
export function createSyntheticVideoBlob(sizeBytes = 2048, type = 'video/mp4'): Blob {
  const bytes = new Uint8Array(sizeBytes);
  // Write minimal ftyp box for MP4
  if (type === 'video/mp4') {
    const ftyp = [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d];
    for (let i = 0; i < ftyp.length; i++) {
      bytes[i] = ftyp[i];
    }
  } else {
    // EBML header for WebM
    const ebml = [0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x1f, 0x42, 0x86, 0x81, 0x01];
    for (let i = 0; i < ebml.length; i++) {
      bytes[i] = ebml[i];
    }
  }
  return new Blob([bytes], { type });
}

export const SYNTHETIC_VIDEO_BLOB = createSyntheticVideoBlob(4096, 'video/mp4');

export const DEFAULT_VIDEO_COMPRESS_OPTIONS: VideoCompressorResizerOptions = {
  compressionPreset: 'target_size_8mb',
  customTargetSizeMb: 8,
  aspectRatio: 'original',
  maxResolution: '720p',
  audioMute: false,
  outputFormat: 'mp4',
  originalFileName: 'gameplay_highlight.mp4',
  originalSizeBytes: 48 * 1024 * 1024, // 48 MB
  durationSec: 45.0,
  sourceWidth: 1920,
  sourceHeight: 1080,
  videoBlob: SYNTHETIC_VIDEO_BLOB,
};

export const TIKTOK_REELS_OPTIONS: VideoCompressorResizerOptions = {
  compressionPreset: 'target_size_25mb',
  customTargetSizeMb: 25,
  aspectRatio: '9:16_vertical',
  maxResolution: '1080p',
  audioMute: false,
  outputFormat: 'mp4',
  originalFileName: 'vlog_horizontal.mov',
  originalSizeBytes: 85 * 1024 * 1024, // 85 MB
  durationSec: 30.0,
  sourceWidth: 1920,
  sourceHeight: 1080,
  videoBlob: SYNTHETIC_VIDEO_BLOB,
};

export const SQUARE_MUTED_WEBM_OPTIONS: VideoCompressorResizerOptions = {
  compressionPreset: 'target_size_8mb',
  customTargetSizeMb: 8,
  aspectRatio: '1:1_square',
  maxResolution: '480p',
  audioMute: true,
  outputFormat: 'webm',
  originalFileName: 'demo_screen.webm',
  originalSizeBytes: 32 * 1024 * 1024,
  durationSec: 20.0,
  sourceWidth: 1280,
  sourceHeight: 720,
  videoBlob: createSyntheticVideoBlob(2048, 'video/webm'),
};

export const CUSTOM_PORTRAIT_OPTIONS: VideoCompressorResizerOptions = {
  compressionPreset: 'custom_mb',
  customTargetSizeMb: 15,
  aspectRatio: '4:5_portrait',
  maxResolution: '720p',
  audioMute: false,
  outputFormat: 'mp4',
  originalFileName: 'portrait_interview.mp4',
  originalSizeBytes: 50 * 1024 * 1024,
  durationSec: 60.0,
  sourceWidth: 1920,
  sourceHeight: 1080,
  videoBlob: SYNTHETIC_VIDEO_BLOB,
};

export const INVALID_ZERO_DURATION_OPTIONS: VideoCompressorResizerOptions = {
  ...DEFAULT_VIDEO_COMPRESS_OPTIONS,
  durationSec: 0,
};

export const INVALID_CUSTOM_SIZE_OPTIONS: VideoCompressorResizerOptions = {
  ...DEFAULT_VIDEO_COMPRESS_OPTIONS,
  compressionPreset: 'custom_mb',
  customTargetSizeMb: 0,
};
