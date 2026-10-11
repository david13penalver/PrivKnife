export type MetronomeSoundType = 'woodblock' | 'beep' | 'hihat';

export interface TapState {
  bpm: number;
  tapCount: number;
  lastTapTimestamp: number | null;
  intervals: number[];
  tempoName: string;
  genreTag: string;
}

export interface PitchResult {
  frequencyHz: number;
  noteName: string; // e.g. "A"
  octave: number; // e.g. 4
  fullNote: string; // e.g. "A4"
  centsDetune: number; // e.g. +2 cents (-50 to +50)
  confidence: number; // 0 to 1
}

export interface KeyResult {
  key: string; // e.g. "C Major", "A Minor"
  root: string; // e.g. "C", "A"
  scale: 'major' | 'minor';
  camelot: string; // e.g. "8B", "8A"
  correlation: number; // Pearson r score
  confidence: number; // 0 to 1
}

export interface BpmAnalysisResult {
  bpm: number;
  confidence: number; // 0 to 1
  sampleRate: number;
  durationSeconds: number;
  tempoName: string;
  genreTag: string;
  key?: KeyResult;
  pitch?: PitchResult;
}

export interface WaveformPeaks {
  peaks: Float32Array;
  length: number;
}

export interface MetronomeConfig {
  bpm: number;
  soundType: MetronomeSoundType;
  volume: number; // 0.0 to 1.0
  isPlaying: boolean;
  timeSignature: number; // e.g. 4 for 4/4
}
