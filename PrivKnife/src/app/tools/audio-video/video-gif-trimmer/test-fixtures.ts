import { TrimmerConfig, VideoMetadata } from './types';

export const DEFAULT_TRIMMER_CONFIG: TrimmerConfig = {
  startTimeSec: 0,
  endTimeSec: 4.0,
  outputFormat: 'gif',
  resolution: '480p',
  fps: 10,
  playbackSpeed: 1.0,
  gifQuality: 128,
  isReverse: false,
  loopCount: 0,
};

export const DEFAULT_VIDEO_METADATA: VideoMetadata = {
  fileName: 'demo-screencast.mp4',
  fileSizeBytes: 8420100, // ~8.4 MB
  durationSeconds: 12.0,
  width: 1920,
  height: 1080,
  aspectRatio: 16 / 9,
};

export interface FrameData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * Creates a synthetic frame buffer for unit tests without DOM Canvas dependencies.
 */
export function createSyntheticFrame(
  width = 64,
  height = 64,
  colorRgb: [number, number, number] = [255, 0, 0]
): FrameData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    data[idx] = colorRgb[0]; // R
    data[idx + 1] = colorRgb[1]; // G
    data[idx + 2] = colorRgb[2]; // B
    data[idx + 3] = 255; // Alpha
  }
  return { data, width, height };
}

/**
 * Creates a sequence of synthetic frames with cycling colors.
 */
export function createSyntheticFrameSequence(
  frameCount = 3,
  width = 32,
  height = 32
): FrameData[] {
  const colors: [number, number, number][] = [
    [255, 0, 0], // Red
    [0, 255, 0], // Green
    [0, 0, 255], // Blue
    [255, 255, 0], // Yellow
  ];

  const frames: FrameData[] = [];
  for (let i = 0; i < frameCount; i++) {
    const color = colors[i % colors.length];
    frames.push(createSyntheticFrame(width, height, color));
  }
  return frames;
}
