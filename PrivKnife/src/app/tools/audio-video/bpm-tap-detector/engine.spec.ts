import { describe, expect, it } from 'vitest';
import {
  calculateTapBpm,
  adjustBpm,
  frequencyToMusicalNote,
  detectPitchFromPcm,
  detectKeyFromPcm,
  detectBpmFromPcm,
  extractWaveformPeaks,
  getTempoDescription,
} from './engine';
import {
  A_MINOR_FREQUENCIES,
  C_MAJOR_FREQUENCIES,
  createChordPcm,
  createClickTrainPcm,
  createSineWavePcm,
  SAMPLE_RATE,
  TAPS_120_BPM,
  TAPS_140_BPM,
  TAPS_WITH_RESET,
} from './test-fixtures';

describe('BPM Tap Detector Engine', () => {
  describe('Tap Tempo Math', () => {
    it('returns 0 BPM for empty or single tap', () => {
      expect(calculateTapBpm([]).bpm).toBe(0);
      expect(calculateTapBpm([1000]).bpm).toBe(0);
      expect(calculateTapBpm([1000]).tapCount).toBe(1);
    });

    it('calculates 120 BPM accurately from 500ms tap intervals', () => {
      const result = calculateTapBpm(TAPS_120_BPM);
      expect(result.bpm).toBeCloseTo(120, 0);
      expect(result.tapCount).toBe(6);
      expect(result.tempoName).toContain('Moderato');
      expect(result.genreTag).toBeDefined();
    });

    it('calculates 140 BPM accurately from ~428.6ms tap intervals', () => {
      const result = calculateTapBpm(TAPS_140_BPM);
      expect(result.bpm).toBeCloseTo(140, 0);
      expect(result.tapCount).toBe(5);
      expect(result.tempoName).toContain('Allegro');
    });

    it('automatically resets tap history when time since previous tap exceeds 2.5s', () => {
      const result = calculateTapBpm(TAPS_WITH_RESET);
      // Taps after the 4-second gap are [6000, 6500, 7000] (2 intervals of 500ms = 120 BPM)
      expect(result.bpm).toBeCloseTo(120, 0);
      expect(result.tapCount).toBe(3);
    });

    it('adjusts BPM correctly with modifiers and enforces clamps', () => {
      expect(adjustBpm(120, 'plus1')).toBe(121);
      expect(adjustBpm(120, 'minus1')).toBe(119);
      expect(adjustBpm(120, 'plus5')).toBe(125);
      expect(adjustBpm(120, 'minus5')).toBe(115);
      expect(adjustBpm(120, 'double')).toBe(240);
      expect(adjustBpm(120, 'half')).toBe(60);

      // Clamping limits
      expect(adjustBpm(318, 'plus5')).toBe(320);
      expect(adjustBpm(22, 'minus5')).toBe(20);
    });

    it('returns tempo descriptions across the BPM range', () => {
      expect(getTempoDescription(50).tempoName).toBe('Largo');
      expect(getTempoDescription(70).tempoName).toBe('Adagio');
      expect(getTempoDescription(90).tempoName).toBe('Andante');
      expect(getTempoDescription(115).tempoName).toBe('Moderato');
      expect(getTempoDescription(130).tempoName).toBe('Allegro');
      expect(getTempoDescription(165).tempoName).toBe('Vivace');
      expect(getTempoDescription(185).tempoName).toBe('Presto');
    });
  });

  describe('Pitch and Note Detection', () => {
    it('maps frequencies to correct musical notes, octaves, and cents detune', () => {
      const a4 = frequencyToMusicalNote(440.0);
      expect(a4.noteName).toBe('A');
      expect(a4.octave).toBe(4);
      expect(a4.fullNote).toBe('A4');
      expect(Math.abs(a4.centsDetune)).toBeLessThanOrEqual(1);

      const c4 = frequencyToMusicalNote(261.63);
      expect(c4.noteName).toBe('C');
      expect(c4.octave).toBe(4);
      expect(c4.fullNote).toBe('C4');
      expect(Math.abs(c4.centsDetune)).toBeLessThanOrEqual(2);

      const sharpDetuned = frequencyToMusicalNote(445.0);
      expect(sharpDetuned.noteName).toBe('A');
      expect(sharpDetuned.octave).toBe(4);
      expect(sharpDetuned.centsDetune).toBeGreaterThan(15);
      expect(sharpDetuned.centsDetune).toBeLessThan(25);
    });

    it('detects fundamental frequency from a 440 Hz synthetic sine wave', () => {
      const pcm = createSineWavePcm(440.0, 1.0, SAMPLE_RATE);
      const pitch = detectPitchFromPcm(pcm, SAMPLE_RATE);

      expect(pitch.frequencyHz).toBeCloseTo(440, -1); // within ~5 Hz
      expect(pitch.noteName).toBe('A');
      expect(pitch.octave).toBe(4);
      expect(pitch.fullNote).toBe('A4');
      expect(pitch.confidence).toBeGreaterThan(0.7);
    });

    it('detects fundamental frequency from a 261.6 Hz (C4) synthetic sine wave', () => {
      const pcm = createSineWavePcm(261.63, 1.0, SAMPLE_RATE);
      const pitch = detectPitchFromPcm(pcm, SAMPLE_RATE);

      expect(pitch.frequencyHz).toBeCloseTo(261.6, -1);
      expect(pitch.noteName).toBe('C');
      expect(pitch.octave).toBe(4);
      expect(pitch.fullNote).toBe('C4');
      expect(pitch.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Musical Key Detection (Krumhansl-Schmuckler)', () => {
    it('identifies C Major key and Camelot 8B for C Major triad', () => {
      const chord = createChordPcm(C_MAJOR_FREQUENCIES, 2.0, SAMPLE_RATE);
      const result = detectKeyFromPcm(chord, SAMPLE_RATE);

      expect(result.key).toBe('C Major');
      expect(result.root).toBe('C');
      expect(result.scale).toBe('major');
      expect(result.camelot).toBe('8B');
      expect(result.confidence).toBeGreaterThan(0.3);
    });

    it('identifies A Minor key and Camelot 8A for A Minor triad', () => {
      const chord = createChordPcm(A_MINOR_FREQUENCIES, 2.0, SAMPLE_RATE);
      const result = detectKeyFromPcm(chord, SAMPLE_RATE);

      expect(result.key).toBe('A Minor');
      expect(result.root).toBe('A');
      expect(result.scale).toBe('minor');
      expect(result.camelot).toBe('8A');
      expect(result.confidence).toBeGreaterThan(0.3);
    });
  });

  describe('BPM Detection from Audio PCM (Peak Onset & Autocorrelation)', () => {
    it('detects 120 BPM from a synthetic 120 BPM click train', () => {
      const pcm = createClickTrainPcm(120, 6.0, SAMPLE_RATE);
      const analysis = detectBpmFromPcm(pcm, SAMPLE_RATE);

      expect(analysis.bpm).toBeCloseTo(120, 0); // within 1 BPM
      expect(analysis.confidence).toBeGreaterThan(0.5);
      expect(analysis.durationSeconds).toBeCloseTo(6.0, 1);
      expect(analysis.tempoName).toContain('Moderato');
    });

    it('detects 140 BPM from a synthetic 140 BPM click train', () => {
      const pcm = createClickTrainPcm(140, 6.0, SAMPLE_RATE);
      const analysis = detectBpmFromPcm(pcm, SAMPLE_RATE);

      expect(analysis.bpm).toBeCloseTo(140, 0); // within 1.5 BPM
      expect(analysis.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Waveform Peak Extraction', () => {
    it('downsamples PCM buffer to requested bucket count with normalized peak amplitudes', () => {
      const pcm = createSineWavePcm(440, 1.0, SAMPLE_RATE);
      const waveform = extractWaveformPeaks(pcm, 100);

      expect(waveform.length).toBe(100);
      expect(waveform.peaks.length).toBe(100);
      for (let i = 0; i < waveform.length; i++) {
        expect(waveform.peaks[i]).toBeGreaterThanOrEqual(0);
        expect(waveform.peaks[i]).toBeLessThanOrEqual(1.0);
      }
    });
  });
});
