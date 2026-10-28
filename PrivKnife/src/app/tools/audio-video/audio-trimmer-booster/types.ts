export type AudioExportFormat = 'mp3' | 'wav' | 'm4r_ringtone';

export interface AudioBufferLike {
  sampleRate: number;
  numberOfChannels: number;
  duration: number;
  length?: number;
  getChannelData(channel: number): Float32Array;
}

export interface AudioTrimmerBoosterOptions {
  audioBuffer?: AudioBufferLike;
  channelData?: Float32Array[];
  sampleRate?: number;
  startTimeSec: number;
  endTimeSec: number;
  volumeGainMultiplier: number;
  fadeInSec: number;
  fadeOutSec: number;
  exportFormat: AudioExportFormat;
  mp3BitrateKbps: number;
  normalizeAudio: boolean;
  originalFileName?: string;
}

export interface AudioMetadata {
  durationSec: number;
  sampleRate: number;
  channels: number;
  trimmedDurationSec: number;
  peakAmplitudeBefore: number;
  peakAmplitudeAfter: number;
  gainApplied: number;
  clippedPrevented: boolean;
  format: AudioExportFormat;
}

export interface AudioTrimmerBoosterResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metadata?: AudioMetadata;
  error?: string;
}

export interface AudioTrimmerWorkerRequest {
  id: number;
  options: AudioTrimmerBoosterOptions;
}

export interface AudioTrimmerWorkerResponse {
  id: number;
  result?: AudioTrimmerBoosterResult;
  error?: string;
}
