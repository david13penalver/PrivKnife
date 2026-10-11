export type SubtitleFormat = 'srt' | 'vtt';

export type TimeUnit = 'ms' | 's' | 'm';

export type ShiftDirection = 'forward' | 'backward';

export interface SubtitleCue {
  index: number;
  id?: string;
  startMs: number;
  endMs: number;
  text: string;
  rawSettings?: string;
}

export interface FpsPreset {
  id: string;
  name: string;
  fromFps: number;
  toFps: number;
}

export interface ShiftOptions {
  offsetMs: number;
  fpsScale?: {
    fromFps: number;
    toFps: number;
  };
}

export interface ParsedSubtitleFile {
  format: SubtitleFormat;
  cues: SubtitleCue[];
  filename?: string;
  headerNote?: string;
}
