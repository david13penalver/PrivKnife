/**
 * Programmatic audio test fixtures for testing DSP algorithms
 * without depending on external binary audio files or network requests.
 */

export const SAMPLE_RATE = 22050; // Standard testing sample rate

/**
 * Generates a Float32Array PCM buffer of a pure sine wave.
 */
export function createSineWavePcm(
  frequencyHz: number,
  durationSec = 1.0,
  sampleRate = SAMPLE_RATE
): Float32Array {
  const totalSamples = Math.floor(durationSec * sampleRate);
  const buffer = new Float32Array(totalSamples);
  const angularFreq = 2 * Math.PI * frequencyHz;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    buffer[i] = Math.sin(angularFreq * t) * 0.8;
  }

  return buffer;
}

/**
 * Generates a Float32Array PCM buffer of a musical chord (sum of frequencies).
 */
export function createChordPcm(
  frequencies: number[],
  durationSec = 2.0,
  sampleRate = SAMPLE_RATE
): Float32Array {
  const totalSamples = Math.floor(durationSec * sampleRate);
  const buffer = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;
    for (const freq of frequencies) {
      sample += Math.sin(2 * Math.PI * freq * t);
    }
    buffer[i] = (sample / frequencies.length) * 0.8;
  }

  return buffer;
}

/**
 * Generates a Float32Array PCM buffer with synthetic transient clicks at a target BPM.
 * Uses an exponential decay envelope simulating kick drums/woodblock clicks.
 */
export function createClickTrainPcm(
  bpm: number,
  durationSec = 6.0,
  sampleRate = SAMPLE_RATE
): Float32Array {
  const totalSamples = Math.floor(durationSec * sampleRate);
  const buffer = new Float32Array(totalSamples);
  const beatIntervalSamples = Math.floor((60 / bpm) * sampleRate);
  const clickDurationSamples = Math.floor(0.05 * sampleRate); // 50ms click

  for (let start = 0; start < totalSamples; start += beatIntervalSamples) {
    for (let j = 0; j < clickDurationSamples && start + j < totalSamples; j++) {
      const t = j / sampleRate;
      // 100 Hz kick transient with exponential decay
      const envelope = Math.exp(-j / (0.015 * sampleRate));
      buffer[start + j] = Math.sin(2 * Math.PI * 100 * t) * envelope * 0.9;
    }
  }

  return buffer;
}

// C Major chord frequencies: C4 (261.63), E4 (329.63), G4 (392.00)
export const C_MAJOR_FREQUENCIES = [261.63, 329.63, 392.0];

// A Minor chord frequencies: A4 (440.00), C5 (523.25), E5 (659.25)
export const A_MINOR_FREQUENCIES = [440.0, 523.25, 659.25];

// Tap timestamp sequences
export const TAPS_120_BPM = [1000, 1500, 2000, 2500, 3000, 3500]; // 500ms intervals = 120 BPM
export const TAPS_140_BPM = [1000, 1428.6, 1857.1, 2285.7, 2714.3]; // ~428.6ms intervals = 140 BPM
export const TAPS_WITH_RESET = [1000, 1500, 2000, 6000, 6500, 7000]; // Gap > 2500ms between 2000 and 6000
