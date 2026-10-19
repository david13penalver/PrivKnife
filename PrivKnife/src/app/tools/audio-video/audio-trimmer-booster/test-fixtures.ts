import { AudioBufferLike, AudioTrimmerBoosterOptions } from './types';

/**
 * Creates a synthetic AudioBuffer-like object with sine wave PCM data.
 */
export function createSyntheticAudioBuffer(
  durationSec = 2.0,
  sampleRate = 44100,
  channels = 2,
  freq = 440
): AudioBufferLike {
  const length = Math.floor(durationSec * sampleRate);
  const channelData: Float32Array[] = [];

  for (let ch = 0; ch < channels; ch++) {
    const data = new Float32Array(length);
    const phaseOffset = ch * (Math.PI / 4); // slight stereo separation
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // 0.5 amplitude sine wave with gentle envelope
      data[i] = 0.5 * Math.sin(2 * Math.PI * freq * t + phaseOffset);
    }
    channelData.push(data);
  }

  return {
    sampleRate,
    numberOfChannels: channels,
    duration: durationSec,
    length,
    getChannelData: (ch: number) => channelData[ch] || new Float32Array(0),
  };
}

export const SYNTHETIC_AUDIO_BUFFER = createSyntheticAudioBuffer(2.0, 44100, 2, 440);

export const DEFAULT_AUDIO_TRIMMER_OPTIONS: AudioTrimmerBoosterOptions = {
  audioBuffer: SYNTHETIC_AUDIO_BUFFER,
  startTimeSec: 0.5,
  endTimeSec: 1.5,
  volumeGainMultiplier: 1.0,
  fadeInSec: 0.1,
  fadeOutSec: 0.1,
  exportFormat: 'wav',
  mp3BitrateKbps: 192,
  normalizeAudio: false,
  originalFileName: 'test_sample.wav',
};

export const BOOSTED_MP3_OPTIONS: AudioTrimmerBoosterOptions = {
  audioBuffer: SYNTHETIC_AUDIO_BUFFER,
  startTimeSec: 0.2,
  endTimeSec: 1.8,
  volumeGainMultiplier: 2.5, // +150% volume boost
  fadeInSec: 0.2,
  fadeOutSec: 0.2,
  exportFormat: 'mp3',
  mp3BitrateKbps: 256,
  normalizeAudio: true,
  originalFileName: 'rock_anthem.mp3',
};

export const RINGTONE_M4R_OPTIONS: AudioTrimmerBoosterOptions = {
  audioBuffer: SYNTHETIC_AUDIO_BUFFER,
  startTimeSec: 0.0,
  endTimeSec: 1.0,
  volumeGainMultiplier: 1.2,
  fadeInSec: 0.05,
  fadeOutSec: 0.1,
  exportFormat: 'm4r_ringtone',
  mp3BitrateKbps: 192,
  normalizeAudio: false,
  originalFileName: 'custom_ringtone.m4a',
};

export const INVALID_NEGATIVE_START_OPTIONS: AudioTrimmerBoosterOptions = {
  audioBuffer: SYNTHETIC_AUDIO_BUFFER,
  startTimeSec: -1.0,
  endTimeSec: 1.0,
  volumeGainMultiplier: 1.0,
  fadeInSec: 0,
  fadeOutSec: 0,
  exportFormat: 'wav',
  mp3BitrateKbps: 192,
  normalizeAudio: false,
};

export const INVALID_START_AFTER_END_OPTIONS: AudioTrimmerBoosterOptions = {
  audioBuffer: SYNTHETIC_AUDIO_BUFFER,
  startTimeSec: 2.0,
  endTimeSec: 0.5,
  volumeGainMultiplier: 1.0,
  fadeInSec: 0,
  fadeOutSec: 0,
  exportFormat: 'wav',
  mp3BitrateKbps: 192,
  normalizeAudio: false,
};

export const INVALID_ZERO_GAIN_OPTIONS: AudioTrimmerBoosterOptions = {
  audioBuffer: SYNTHETIC_AUDIO_BUFFER,
  startTimeSec: 0.0,
  endTimeSec: 1.0,
  volumeGainMultiplier: 0.0,
  fadeInSec: 0,
  fadeOutSec: 0,
  exportFormat: 'wav',
  mp3BitrateKbps: 192,
  normalizeAudio: false,
};
