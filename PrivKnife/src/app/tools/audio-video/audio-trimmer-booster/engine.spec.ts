import { describe, it, expect } from 'vitest';
import {
  validateAudioOptions,
  processAudioTrimmer,
  generateWaveformPreview,
  sliceAndProcessAudio,
  encodeWav,
} from './engine';
import {
  BOOSTED_MP3_OPTIONS,
  DEFAULT_AUDIO_TRIMMER_OPTIONS,
  INVALID_NEGATIVE_START_OPTIONS,
  INVALID_START_AFTER_END_OPTIONS,
  INVALID_ZERO_GAIN_OPTIONS,
  RINGTONE_M4R_OPTIONS,
  SYNTHETIC_AUDIO_BUFFER,
  createSyntheticAudioBuffer,
} from './test-fixtures';

describe('AudioTrimmerBooster Engine (Seam 1)', () => {
  describe('validateAudioOptions', () => {
    it('should validate valid default options', () => {
      const result = validateAudioOptions(DEFAULT_AUDIO_TRIMMER_OPTIONS);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject negative start time', () => {
      const result = validateAudioOptions(INVALID_NEGATIVE_START_OPTIONS);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/start time cannot be negative/i);
    });

    it('should reject start time >= end time', () => {
      const result = validateAudioOptions(INVALID_START_AFTER_END_OPTIONS);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/start time must be less than end time/i);
    });

    it('should reject non-positive volume gain multiplier', () => {
      const result = validateAudioOptions(INVALID_ZERO_GAIN_OPTIONS);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/volume gain multiplier must be greater than zero/i);
    });

    it('should reject negative fade times', () => {
      const result = validateAudioOptions({
        ...DEFAULT_AUDIO_TRIMMER_OPTIONS,
        fadeInSec: -0.5,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/fade times cannot be negative/i);
    });

    it('should reject missing audio data', () => {
      const result = validateAudioOptions({
        ...DEFAULT_AUDIO_TRIMMER_OPTIONS,
        audioBuffer: undefined,
        channelData: undefined,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/no audio data provided/i);
    });
  });

  describe('sliceAndProcessAudio', () => {
    it('should slice audio to the specified duration and apply fade curves', () => {
      const ch0 = SYNTHETIC_AUDIO_BUFFER.getChannelData(0);
      const ch1 = SYNTHETIC_AUDIO_BUFFER.getChannelData(1);
      const sampleRate = SYNTHETIC_AUDIO_BUFFER.sampleRate;

      const { processedChannels, peakBefore, peakAfter } = sliceAndProcessAudio(
        [ch0, ch1],
        sampleRate,
        {
          startTimeSec: 0.5,
          endTimeSec: 1.5,
          volumeGainMultiplier: 1.0,
          fadeInSec: 0.1,
          fadeOutSec: 0.1,
          normalizeAudio: false,
        }
      );

      expect(processedChannels.length).toBe(2);
      // Length should equal ~1.0 second * 44100
      expect(processedChannels[0].length).toBe(44100);
      expect(processedChannels[1].length).toBe(44100);

      // First sample should be attenuated near 0 due to fade-in
      expect(Math.abs(processedChannels[0][0])).toBeLessThan(0.05);
      // Last sample should be attenuated near 0 due to fade-out
      expect(Math.abs(processedChannels[0][processedChannels[0].length - 1])).toBeLessThan(0.05);

      expect(peakBefore).toBeGreaterThan(0);
      expect(peakAfter).toBeGreaterThan(0);
    });

    it('should boost volume and apply soft-knee saturation to prevent harsh clipping', () => {
      const monoBuffer = createSyntheticAudioBuffer(1.0, 44100, 1, 440);
      const ch0 = monoBuffer.getChannelData(0);

      const { processedChannels, clipped } = sliceAndProcessAudio(
        [ch0],
        monoBuffer.sampleRate,
        {
          startTimeSec: 0,
          endTimeSec: 1.0,
          volumeGainMultiplier: 3.5, // 350% boost
          fadeInSec: 0,
          fadeOutSec: 0,
          normalizeAudio: false,
        }
      );

      // Verify no sample exceeds 1.0 in magnitude
      for (let i = 0; i < processedChannels[0].length; i++) {
        expect(Math.abs(processedChannels[0][i])).toBeLessThanOrEqual(1.0);
      }
      expect(clipped).toBe(true);
    });

    it('should normalize peak amplitude to 0.98 when normalizeAudio is enabled', () => {
      // Quiet buffer with 0.1 max amplitude
      const quietBuffer = createSyntheticAudioBuffer(1.0, 44100, 1, 440);
      const ch0 = quietBuffer.getChannelData(0).map((v) => v * 0.2); // 0.1 peak

      const { peakAfter } = sliceAndProcessAudio(
        [ch0],
        quietBuffer.sampleRate,
        {
          startTimeSec: 0,
          endTimeSec: 1.0,
          volumeGainMultiplier: 1.0,
          fadeInSec: 0,
          fadeOutSec: 0,
          normalizeAudio: true,
        }
      );

      expect(peakAfter).toBeCloseTo(0.98, 2);
    });
  });

  describe('encodeWav', () => {
    it('should encode PCM channels to standard 16-bit RIFF WAVE binary', () => {
      const mono = new Float32Array([0.0, 0.5, -0.5, 0.0]);
      const bytes = encodeWav([mono], 44100);

      expect(bytes.length).toBeGreaterThan(44);
      // Header check
      const textDecoder = new TextDecoder('ascii');
      const riff = textDecoder.decode(bytes.slice(0, 4));
      const wave = textDecoder.decode(bytes.slice(8, 12));
      const fmt = textDecoder.decode(bytes.slice(12, 16));
      const data = textDecoder.decode(bytes.slice(36, 40));

      expect(riff).toBe('RIFF');
      expect(wave).toBe('WAVE');
      expect(fmt).toBe('fmt ');
      expect(data).toBe('data');
    });
  });

  describe('processAudioTrimmer', () => {
    it('should process default options and produce a valid WAV result', async () => {
      const result = await processAudioTrimmer(DEFAULT_AUDIO_TRIMMER_OPTIONS);

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('audio/wav');
      expect(result.fileName).toMatch(/\.wav$/);
      expect(result.blob.size).toBeGreaterThan(1000);
      expect(result.metadata?.trimmedDurationSec).toBeCloseTo(1.0, 1);
      expect(result.metadata?.channels).toBe(2);
      expect(result.metadata?.format).toBe('wav');
    });

    it('should encode boosted audio to MP3 format', async () => {
      const result = await processAudioTrimmer(BOOSTED_MP3_OPTIONS);

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('audio/mpeg');
      expect(result.fileName).toMatch(/\.mp3$/);
      expect(result.blob.size).toBeGreaterThan(500);
      expect(result.metadata?.format).toBe('mp3');
      expect(result.metadata?.gainApplied).toBe(2.5);
    });

    it('should export iPhone M4R ringtone with max duration cap and ftypM4A box container header (DEFECT-51-03)', async () => {
      const result = await processAudioTrimmer(RINGTONE_M4R_OPTIONS);

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('audio/x-m4r');
      expect(result.fileName).toMatch(/\.m4r$/);
      expect(result.blob.size).toBeGreaterThan(500);
      expect(result.metadata?.format).toBe('m4r_ringtone');

      const arrayBuffer = await result.blob.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      const headerStr = String.fromCharCode(...uint8.slice(4, 12));
      expect(headerStr).toBe('ftypM4A ');
    });

    it('should handle mono audio input properly', async () => {
      const monoBuffer = createSyntheticAudioBuffer(1.5, 44100, 1, 440);
      const result = await processAudioTrimmer({
        ...DEFAULT_AUDIO_TRIMMER_OPTIONS,
        audioBuffer: monoBuffer,
        startTimeSec: 0.1,
        endTimeSec: 1.0,
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.channels).toBe(1);
      expect(result.metadata?.trimmedDurationSec).toBeCloseTo(0.9, 1);
    });

    it('should return error result when options are invalid', async () => {
      const result = await processAudioTrimmer(INVALID_NEGATIVE_START_OPTIONS);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.blob.size).toBe(0);
    });
  });

  describe('generateWaveformPreview', () => {
    it('should generate normalized visual bar amplitudes between 0 and 1', () => {
      const ch = SYNTHETIC_AUDIO_BUFFER.getChannelData(0);
      const bars = generateWaveformPreview(ch, 50);

      expect(bars.length).toBe(50);
      for (const bar of bars) {
        expect(bar).toBeGreaterThanOrEqual(0);
        expect(bar).toBeLessThanOrEqual(1.0);
      }
    });

    it('should return fallback bar array for empty input', () => {
      const bars = generateWaveformPreview(new Float32Array(0), 30);
      expect(bars.length).toBe(30);
    });
  });
});
