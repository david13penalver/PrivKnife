import {
  BpmAnalysisResult,
  KeyResult,
  PitchResult,
  TapState,
  WaveformPeaks,
} from './types';

export const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

// Krumhansl-Kessler 12-semitone key profiles
const MAJOR_PROFILE = [
  6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88,
];
const MINOR_PROFILE = [
  6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17,
];

// Camelot Wheel notation mappings
const CAMELOT_MAJOR: Record<string, string> = {
  C: '8B',
  'C#': '3B',
  Db: '3B',
  D: '10B',
  'D#': '5B',
  Eb: '5B',
  E: '12B',
  F: '7B',
  'F#': '2B',
  Gb: '2B',
  G: '9B',
  'G#': '4B',
  Ab: '4B',
  A: '11B',
  'A#': '6B',
  Bb: '6B',
  B: '1B',
};

const CAMELOT_MINOR: Record<string, string> = {
  C: '5A',
  'C#': '12A',
  Db: '12A',
  D: '7A',
  'D#': '2A',
  Eb: '2A',
  E: '9A',
  F: '4A',
  'F#': '11A',
  Gb: '11A',
  G: '6A',
  'G#': '1A',
  Ab: '1A',
  A: '8A',
  'A#': '3A',
  Bb: '3A',
  B: '10A',
};

/**
 * Returns tempo marking and typical modern music genre for a given BPM.
 */
export function getTempoDescription(bpm: number): {
  tempoName: string;
  genreTag: string;
} {
  if (bpm <= 0) return { tempoName: 'Unknown', genreTag: '-' };
  if (bpm < 60) return { tempoName: 'Largo', genreTag: 'Ambient / Slow' };
  if (bpm < 76) return { tempoName: 'Adagio', genreTag: 'Chillout / Downtempo' };
  if (bpm < 108) return { tempoName: 'Andante', genreTag: 'Lo-Fi / Hip Hop' };
  if (bpm <= 124) return { tempoName: 'Moderato', genreTag: 'Deep House / R&B' };
  if (bpm <= 156) return { tempoName: 'Allegro', genreTag: 'House / Techno / Pop' };
  if (bpm <= 176) return { tempoName: 'Vivace', genreTag: 'Trance / Dubstep' };
  return { tempoName: 'Presto', genreTag: 'Drum & Bass / Hardstyle' };
}

/**
 * Calculates current BPM and tap statistics from an array of millisecond timestamps.
 * Automatically resets if the gap between taps exceeds 2500ms.
 */
export function calculateTapBpm(
  timestamps: number[],
  resetThresholdMs = 2500
): TapState {
  if (timestamps.length === 0) {
    return {
      bpm: 0,
      tapCount: 0,
      lastTapTimestamp: null,
      intervals: [],
      tempoName: 'Tap to start',
      genreTag: '-',
    };
  }

  // Filter to the most recent continuous tapping run
  const activeTaps: number[] = [timestamps[0]];
  for (let i = 1; i < timestamps.length; i++) {
    const diff = timestamps[i] - timestamps[i - 1];
    if (diff > resetThresholdMs) {
      activeTaps.length = 0; // reset
    }
    activeTaps.push(timestamps[i]);
  }

  const lastTap = activeTaps[activeTaps.length - 1];
  const tapCount = activeTaps.length;

  if (tapCount < 2) {
    return {
      bpm: 0,
      tapCount,
      lastTapTimestamp: lastTap,
      intervals: [],
      tempoName: 'Tap again...',
      genreTag: '-',
    };
  }

  const intervals: number[] = [];
  for (let i = 1; i < tapCount; i++) {
    intervals.push(activeTaps[i] - activeTaps[i - 1]);
  }

  const avgInterval =
    intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  const rawBpm = avgInterval > 0 ? 60000 / avgInterval : 0;
  const bpm = Math.round(rawBpm * 10) / 10;
  const tempo = getTempoDescription(bpm);

  return {
    bpm,
    tapCount,
    lastTapTimestamp: lastTap,
    intervals,
    tempoName: tempo.tempoName,
    genreTag: tempo.genreTag,
  };
}

/**
 * Adjusts BPM with discrete modifier actions (+1, -1, +5, -5, x2, /2) clamped within [20, 320].
 */
export function adjustBpm(
  currentBpm: number,
  action: 'plus1' | 'minus1' | 'plus5' | 'minus5' | 'double' | 'half'
): number {
  let next = currentBpm;
  switch (action) {
    case 'plus1':
      next += 1;
      break;
    case 'minus1':
      next -= 1;
      break;
    case 'plus5':
      next += 5;
      break;
    case 'minus5':
      next -= 5;
      break;
    case 'double':
      next *= 2;
      break;
    case 'half':
      next /= 2;
      break;
  }
  return Math.min(320, Math.max(20, Math.round(next * 10) / 10));
}

/**
 * Maps a frequency in Hz to closest musical note, octave, and cents detune.
 */
export function frequencyToMusicalNote(frequencyHz: number): PitchResult {
  if (frequencyHz <= 0 || !isFinite(frequencyHz)) {
    return {
      frequencyHz: 0,
      noteName: '-',
      octave: 0,
      fullNote: '-',
      centsDetune: 0,
      confidence: 0,
    };
  }

  // MIDI standard: A4 = 440 Hz = MIDI 69
  const midiExact = 69 + 12 * (Math.log(frequencyHz / 440) / Math.LN2);
  const midiRound = Math.round(midiExact);
  const noteIndex = ((midiRound % 12) + 12) % 12;
  const noteName = NOTE_NAMES[noteIndex];
  const octave = Math.floor(midiRound / 12) - 1;
  const fullNote = `${noteName}${octave}`;

  const refFreq = 440 * Math.pow(2, (midiRound - 69) / 12);
  const centsDetune = Math.round(
    1200 * (Math.log(frequencyHz / refFreq) / Math.LN2)
  );

  return {
    frequencyHz: Math.round(frequencyHz * 10) / 10,
    noteName,
    octave,
    fullNote,
    centsDetune,
    confidence: 1.0,
  };
}

/**
 * Estimates the fundamental pitch of an audio PCM buffer using autocorrelation.
 */
export function detectPitchFromPcm(
  buffer: Float32Array,
  sampleRate: number
): PitchResult {
  if (buffer.length === 0 || sampleRate <= 0) {
    return frequencyToMusicalNote(0);
  }

  // Use up to 4096 samples around middle of buffer for fast responsive pitch detection
  const start = Math.floor(Math.max(0, buffer.length / 2 - 2048));
  const length = Math.min(4096, buffer.length - start);
  const segment = buffer.subarray(start, start + length);

  // Search range: 60 Hz to 1200 Hz
  const minLag = Math.floor(sampleRate / 1200);
  const maxLag = Math.floor(sampleRate / 60);

  const corrArray = new Float32Array(maxLag + 1);
  let globalMax = -1;

  for (let lag = minLag; lag <= maxLag && lag < length; lag++) {
    let sum = 0;
    let norm1 = 0;
    let norm2 = 0;
    const count = length - lag;

    for (let i = 0; i < count; i++) {
      const a = segment[i];
      const b = segment[i + lag];
      sum += a * b;
      norm1 += a * a;
      norm2 += b * b;
    }

    const norm = Math.sqrt(norm1 * norm2);
    const corr = norm > 0 ? sum / norm : 0;
    corrArray[lag] = corr;
    if (corr > globalMax) {
      globalMax = corr;
    }
  }

  if (globalMax < 0.3) {
    return {
      frequencyHz: 0,
      noteName: '-',
      octave: 0,
      fullNote: '-',
      centsDetune: 0,
      confidence: 0,
    };
  }

  // Find the first local maximum whose correlation is at least 85% of globalMax (fundamental period)
  let chosenLag = 0;
  const threshold = 0.85 * globalMax;

  for (let lag = minLag + 1; lag < maxLag; lag++) {
    const prev = corrArray[lag - 1];
    const curr = corrArray[lag];
    const next = corrArray[lag + 1];

    if (curr > prev && curr >= next && curr >= threshold) {
      // Parabolic interpolation for sub-sample accuracy
      const denom = 2 * (2 * curr - prev - next);
      const delta = denom !== 0 ? (next - prev) / denom : 0;
      chosenLag = lag + delta;
      break;
    }
  }

  // Fallback to max correlation if no peak found
  if (chosenLag <= 0) {
    for (let lag = minLag; lag <= maxLag; lag++) {
      if (corrArray[lag] === globalMax) {
        chosenLag = lag;
        break;
      }
    }
  }

  const f0 = sampleRate / chosenLag;
  const note = frequencyToMusicalNote(f0);
  return {
    ...note,
    confidence: Math.round(globalMax * 100) / 100,
  };
}

/**
 * Computes a 12-class chromagram profile from PCM buffer using discrete Fourier transforms.
 */
function extractChromagram(
  buffer: Float32Array,
  sampleRate: number
): number[] {
  const chroma = new Array(12).fill(0);
  const totalLength = Math.min(buffer.length, sampleRate * 4); // Analyze up to 4 seconds
  if (totalLength === 0) return chroma;

  // Test across octaves 2 to 6 (C2 ~65Hz to B6 ~1975Hz)
  const octaves = [2, 3, 4, 5, 6];

  for (let semitone = 0; semitone < 12; semitone++) {
    let semitoneEnergy = 0;

    for (const oct of octaves) {
      const midiNote = (oct + 1) * 12 + semitone;
      const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
      const omega = (2 * Math.PI * freq) / sampleRate;

      // Goertzel / discrete sum over downsampled samples
      const step = 4;
      let real = 0;
      let imag = 0;
      let count = 0;

      for (let i = 0; i < totalLength; i += step) {
        const val = buffer[i];
        real += val * Math.cos(omega * i);
        imag -= val * Math.sin(omega * i);
        count++;
      }

      const mag = Math.sqrt(real * real + imag * imag) / (count || 1);
      semitoneEnergy += mag;
    }

    chroma[semitone] = semitoneEnergy;
  }

  // Normalize chromagram
  const sum = chroma.reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (let i = 0; i < 12; i++) {
      chroma[i] = chroma[i] / sum;
    }
  }

  return chroma;
}

/**
 * Calculates Pearson correlation coefficient between two numeric vectors of identical length.
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  return den > 0 ? num / den : 0;
}

/**
 * Detects the musical key (root + major/minor + Camelot notation)
 * using the Krumhansl-Schmuckler cognitive key-finding algorithm.
 */
export function detectKeyFromPcm(
  buffer: Float32Array,
  sampleRate: number
): KeyResult {
  const chroma = extractChromagram(buffer, sampleRate);

  let bestScore = -Infinity;
  let secondBestScore = -Infinity;
  let bestRoot = 'C';
  let bestScale: 'major' | 'minor' = 'major';

  for (let rootIndex = 0; rootIndex < 12; rootIndex++) {
    // Shift major profile to root
    const rotatedMajor = new Array(12);
    const rotatedMinor = new Array(12);

    for (let i = 0; i < 12; i++) {
      rotatedMajor[i] = MAJOR_PROFILE[(i - rootIndex + 12) % 12];
      rotatedMinor[i] = MINOR_PROFILE[(i - rootIndex + 12) % 12];
    }

    const majorCorr = pearsonCorrelation(chroma, rotatedMajor);
    const minorCorr = pearsonCorrelation(chroma, rotatedMinor);

    if (majorCorr > bestScore) {
      secondBestScore = bestScore;
      bestScore = majorCorr;
      bestRoot = NOTE_NAMES[rootIndex];
      bestScale = 'major';
    } else if (majorCorr > secondBestScore) {
      secondBestScore = majorCorr;
    }

    if (minorCorr > bestScore) {
      secondBestScore = bestScore;
      bestScore = minorCorr;
      bestRoot = NOTE_NAMES[rootIndex];
      bestScale = 'minor';
    } else if (minorCorr > secondBestScore) {
      secondBestScore = minorCorr;
    }
  }

  const scaleName = bestScale === 'major' ? 'Major' : 'Minor';
  const fullKey = `${bestRoot} ${scaleName}`;
  const camelot =
    bestScale === 'major'
      ? CAMELOT_MAJOR[bestRoot] || '8B'
      : CAMELOT_MINOR[bestRoot] || '8A';

  const confidence = Math.max(
    0,
    Math.min(1, Math.round((bestScore - secondBestScore + 0.3) * 100) / 100)
  );

  return {
    key: fullKey,
    root: bestRoot,
    scale: bestScale,
    camelot,
    correlation: Math.round(bestScore * 100) / 100,
    confidence,
  };
}

/**
 * Detects the tempo (BPM) from an audio PCM buffer using low-pass filtering,
 * onset energy envelope extraction, and autocorrelation.
 */
export function detectBpmFromPcm(
  buffer: Float32Array,
  sampleRate: number
): BpmAnalysisResult {
  const durationSeconds =
    sampleRate > 0 ? Math.round((buffer.length / sampleRate) * 10) / 10 : 0;

  if (buffer.length === 0 || sampleRate <= 0) {
    return {
      bpm: 0,
      confidence: 0,
      sampleRate,
      durationSeconds: 0,
      tempoName: '-',
      genreTag: '-',
    };
  }

  // 1. Low-Pass Filter (~150 Hz cutoff) to isolate percussive kicks and low-end transients
  const rc = 1.0 / (2 * Math.PI * 150);
  const dt = 1.0 / sampleRate;
  const alpha = dt / (rc + dt);

  const filtered = new Float32Array(buffer.length);
  let lastFiltered = 0;
  for (let i = 0; i < buffer.length; i++) {
    lastFiltered = lastFiltered + alpha * (buffer[i] - lastFiltered);
    filtered[i] = lastFiltered;
  }

  // 2. Downsampled Onset Energy Envelope (hop size = 10ms -> 100 Hz frame rate)
  const hopSize = Math.max(1, Math.floor(sampleRate * 0.01)); // 10ms
  const frameCount = Math.floor(filtered.length / hopSize);
  const envelope = new Float32Array(frameCount);

  let prevEnergy = 0;
  for (let f = 0; f < frameCount; f++) {
    let energy = 0;
    const start = f * hopSize;
    for (let j = 0; j < hopSize; j++) {
      const s = filtered[start + j];
      energy += s * s;
    }
    // Rectified spectral flux / positive energy derivative
    const diff = energy - prevEnergy;
    envelope[f] = diff > 0 ? diff : 0;
    prevEnergy = energy;
  }

  // 3. Autocorrelation over the BPM search range: 60 BPM to 200 BPM
  const envelopeSampleRate = sampleRate / hopSize;
  const minLag = Math.floor((60 / 200) * envelopeSampleRate); // 200 BPM
  const maxLag = Math.floor((60 / 60) * envelopeSampleRate); // 60 BPM

  let bestLag = minLag;
  let maxCorrelation = -1;
  let sumCorr = 0;
  let countCorr = 0;

  for (let lag = minLag; lag <= maxLag && lag < frameCount; lag++) {
    let corr = 0;
    const count = frameCount - lag;
    for (let i = 0; i < count; i++) {
      corr += envelope[i] * envelope[i + lag];
    }
    corr = count > 0 ? corr / count : 0;
    sumCorr += corr;
    countCorr++;

    if (corr > maxCorrelation) {
      maxCorrelation = corr;
      bestLag = lag;
    }
  }

  const rawBpm = (60 * envelopeSampleRate) / bestLag;
  const bpm = Math.round(rawBpm * 10) / 10;
  const meanCorr = countCorr > 0 ? sumCorr / countCorr : 1;
  const confidence = Math.min(
    1,
    Math.max(0, Math.round(((maxCorrelation - meanCorr) / (maxCorrelation || 1)) * 100) / 100)
  );

  const tempo = getTempoDescription(bpm);

  return {
    bpm,
    confidence,
    sampleRate,
    durationSeconds,
    tempoName: tempo.tempoName,
    genreTag: tempo.genreTag,
  };
}

/**
 * Extracts normalized peak amplitudes from a PCM buffer for waveform visualization on HTML5 canvas.
 */
export function extractWaveformPeaks(
  buffer: Float32Array,
  numberOfBuckets: number
): WaveformPeaks {
  const peaks = new Float32Array(numberOfBuckets);
  if (buffer.length === 0 || numberOfBuckets <= 0) {
    return { peaks, length: numberOfBuckets };
  }

  const bucketSize = buffer.length / numberOfBuckets;
  let maxAbs = 0;

  for (let i = 0; i < numberOfBuckets; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.floor((i + 1) * bucketSize);
    let peak = 0;

    for (let j = start; j < end && j < buffer.length; j++) {
      const abs = Math.abs(buffer[j]);
      if (abs > peak) peak = abs;
    }

    peaks[i] = peak;
    if (peak > maxAbs) maxAbs = peak;
  }

  if (maxAbs > 0) {
    for (let i = 0; i < numberOfBuckets; i++) {
      peaks[i] = peaks[i] / maxAbs;
    }
  }

  return { peaks, length: numberOfBuckets };
}
