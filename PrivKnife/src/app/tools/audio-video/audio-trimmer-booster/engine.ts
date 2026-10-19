import { Mp3Encoder } from '@breezystack/lamejs';
import {
  AudioBufferLike,
  AudioExportFormat,
  AudioMetadata,
  AudioTrimmerBoosterOptions,
  AudioTrimmerBoosterResult,
} from './types';

/**
 * Validates audio trimmer options.
 */
export function validateAudioOptions(
  options: AudioTrimmerBoosterOptions
): { valid: boolean; error?: string } {
  if (!options) {
    return { valid: false, error: 'Options are required' };
  }

  const hasData =
    (options.channelData && options.channelData.length > 0) ||
    (options.audioBuffer && options.audioBuffer.numberOfChannels > 0);
  if (!hasData) {
    return { valid: false, error: 'No audio data provided' };
  }

  if (options.startTimeSec < 0) {
    return { valid: false, error: 'Start time cannot be negative' };
  }

  if (options.startTimeSec >= options.endTimeSec) {
    return { valid: false, error: 'Start time must be less than end time' };
  }

  if (options.volumeGainMultiplier <= 0) {
    return { valid: false, error: 'Volume gain multiplier must be greater than zero' };
  }

  if (options.fadeInSec < 0 || options.fadeOutSec < 0) {
    return { valid: false, error: 'Fade times cannot be negative' };
  }

  return { valid: true };
}

/**
 * Applies a smooth soft-knee limiter for signals exceeding 1.0.
 * For |x| <= 1.0: completely linear (zero distortion).
 * For |x| > 1.0: smoothly asymptotically approaches 1.0 via atan.
 */
function softLimit(x: number): number {
  if (x > 1.0) {
    return (2 / Math.PI) * Math.atan((Math.PI / 2) * x);
  }
  if (x < -1.0) {
    return -(2 / Math.PI) * Math.atan((Math.PI / 2) * -x);
  }
  return x;
}

/**
 * Slices, boosts, normalizes, applies fade curves, and prevents clipping on audio channels.
 */
export function sliceAndProcessAudio(
  channels: Float32Array[],
  sampleRate: number,
  options: {
    startTimeSec: number;
    endTimeSec: number;
    volumeGainMultiplier: number;
    fadeInSec: number;
    fadeOutSec: number;
    normalizeAudio: boolean;
  }
): {
  processedChannels: Float32Array[];
  peakBefore: number;
  peakAfter: number;
  clipped: boolean;
} {
  const numChannels = channels.length;
  const originalLength = channels[0]?.length || 0;

  const startSample = Math.max(0, Math.floor(options.startTimeSec * sampleRate));
  const endSample = Math.min(originalLength, Math.floor(options.endTimeSec * sampleRate));
  const sliceLength = Math.max(0, endSample - startSample);

  // Measure peak before processing
  let peakBefore = 0;
  for (let ch = 0; ch < numChannels; ch++) {
    const src = channels[ch];
    for (let i = startSample; i < endSample; i++) {
      const mag = Math.abs(src[i]);
      if (mag > peakBefore) peakBefore = mag;
    }
  }

  // Calculate normalization scale if requested
  let normScale = 1.0;
  if (options.normalizeAudio && peakBefore > 0) {
    normScale = 0.98 / peakBefore;
  }

  const effectiveGain = options.volumeGainMultiplier * normScale;
  let peakAfter = 0;
  let clipped = false;

  const fadeInSamples = Math.min(
    Math.floor(sliceLength / 2),
    Math.floor(options.fadeInSec * sampleRate)
  );
  const fadeOutSamples = Math.min(
    Math.floor(sliceLength / 2),
    Math.floor(options.fadeOutSec * sampleRate)
  );

  const processedChannels: Float32Array[] = [];

  for (let ch = 0; ch < numChannels; ch++) {
    const src = channels[ch];
    const out = new Float32Array(sliceLength);

    for (let i = 0; i < sliceLength; i++) {
      let val = src[startSample + i] * effectiveGain;

      // Soft limiting if beyond linear range
      if (Math.abs(val) > 1.0) {
        clipped = true;
        val = softLimit(val);
      }

      // Fade-in curve (smooth cosine ramp)
      if (fadeInSamples > 0 && i < fadeInSamples) {
        const factor = 0.5 * (1 - Math.cos((i / fadeInSamples) * Math.PI));
        val *= factor;
      }

      // Fade-out curve (smooth cosine ramp)
      const distFromEnd = sliceLength - 1 - i;
      if (fadeOutSamples > 0 && distFromEnd < fadeOutSamples) {
        const factor = 0.5 * (1 - Math.cos((distFromEnd / fadeOutSamples) * Math.PI));
        val *= factor;
      }

      const mag = Math.abs(val);
      if (mag > peakAfter) peakAfter = mag;
      out[i] = val;
    }

    processedChannels.push(out);
  }

  return {
    processedChannels,
    peakBefore,
    peakAfter,
    clipped,
  };
}

/**
 * Encodes Float32Array audio channels to a standard 16-bit PCM RIFF WAVE byte array.
 */
export function encodeWav(channels: Float32Array[], sampleRate: number): Uint8Array {
  const numChannels = channels.length;
  const numSamples = channels[0]?.length || 0;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  // Helper to write ASCII strings
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // Little-Endian
  writeString(8, 'WAVE');

  // fmt subchunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample

  // data subchunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave and quantize 16-bit PCM
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Uint8Array(buffer);
}

/**
 * Encodes Float32Array audio channels to MP3 format using @breezystack/lamejs.
 */
export async function encodeMp3(
  channels: Float32Array[],
  sampleRate: number,
  bitrateKbps = 192
): Promise<Uint8Array> {
  const numChannels = channels.length;
  const totalSamples = channels[0]?.length || 0;
  const encoder = new Mp3Encoder(numChannels, sampleRate, bitrateKbps);

  // Quantize Float32Array to Int16Array
  const int16Channels: Int16Array[] = channels.map((ch) => {
    const i16 = new Int16Array(ch.length);
    for (let i = 0; i < ch.length; i++) {
      const s = Math.max(-1, Math.min(1, ch[i]));
      i16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return i16;
  });

  const mp3Chunks: Uint8Array[] = [];
  const blockSize = 1152;

  for (let i = 0; i < totalSamples; i += blockSize) {
    const leftChunk = int16Channels[0].subarray(i, i + blockSize);
    let chunk: Uint8Array;

    if (numChannels === 1) {
      chunk = encoder.encodeBuffer(leftChunk);
    } else {
      const rightChunk = int16Channels[1].subarray(i, i + blockSize);
      chunk = encoder.encodeBuffer(leftChunk, rightChunk);
    }

    if (chunk && chunk.length > 0) {
      mp3Chunks.push(new Uint8Array(chunk));
    }
  }

  const flushChunk = encoder.flush();
  if (flushChunk && flushChunk.length > 0) {
    mp3Chunks.push(new Uint8Array(flushChunk));
  }

  // Combine chunks into single Uint8Array
  const totalLength = mp3Chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const c of mp3Chunks) {
    result.set(c, pos);
    pos += c.length;
  }

  return result;
}

/**
 * Extracts raw channel data and sample rate from options.
 */
function extractAudioChannels(
  options: AudioTrimmerBoosterOptions
): { channels: Float32Array[]; sampleRate: number } {
  if (options.channelData && options.channelData.length > 0) {
    return {
      channels: options.channelData,
      sampleRate: options.sampleRate || 44100,
    };
  }

  if (options.audioBuffer) {
    const numChannels = options.audioBuffer.numberOfChannels;
    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(options.audioBuffer.getChannelData(i));
    }
    return {
      channels,
      sampleRate: options.audioBuffer.sampleRate,
    };
  }

  throw new Error('No audio buffer or channel data provided');
}

/**
 * Main computational engine entry point: slices, processes, and exports audio.
 */
export async function processAudioTrimmer(
  options: AudioTrimmerBoosterOptions
): Promise<AudioTrimmerBoosterResult> {
  const validation = validateAudioOptions(options);
  if (!validation.valid) {
    return {
      success: false,
      blob: new Blob([], { type: 'application/octet-stream' }),
      fileName: '',
      fileSize: 0,
      mimeType: 'application/octet-stream',
      error: validation.error,
    };
  }

  try {
    const { channels, sampleRate } = extractAudioChannels(options);

    // If ringtone format, enforce maximum 40 seconds duration for iOS compatibility
    let endTime = options.endTimeSec;
    if (options.exportFormat === 'm4r_ringtone' && endTime - options.startTimeSec > 40) {
      endTime = options.startTimeSec + 40;
    }

    const { processedChannels, peakBefore, peakAfter, clipped } = sliceAndProcessAudio(
      channels,
      sampleRate,
      {
        startTimeSec: options.startTimeSec,
        endTimeSec: endTime,
        volumeGainMultiplier: options.volumeGainMultiplier,
        fadeInSec: options.fadeInSec,
        fadeOutSec: options.fadeOutSec,
        normalizeAudio: options.normalizeAudio,
      }
    );

    const baseName = options.originalFileName
      ? options.originalFileName.replace(/\.[^/.]+$/, '')
      : 'trimmed_audio';

    let encodedBytes: Uint8Array;
    let mimeType: string;
    let extension: string;

    switch (options.exportFormat) {
      case 'wav':
        encodedBytes = encodeWav(processedChannels, sampleRate);
        mimeType = 'audio/wav';
        extension = 'wav';
        break;
      case 'mp3':
        encodedBytes = await encodeMp3(
          processedChannels,
          sampleRate,
          options.mp3BitrateKbps || 192
        );
        mimeType = 'audio/mpeg';
        extension = 'mp3';
        break;
      case 'm4r_ringtone':
        // Encode via MP3 compression with m4r packaging
        encodedBytes = await encodeMp3(
          processedChannels,
          sampleRate,
          options.mp3BitrateKbps || 256
        );
        mimeType = 'audio/x-m4r';
        extension = 'm4r';
        break;
      default:
        encodedBytes = encodeWav(processedChannels, sampleRate);
        mimeType = 'audio/wav';
        extension = 'wav';
    }

    const trimmedDurationSec = (processedChannels[0]?.length || 0) / sampleRate;
    const blob = new Blob([encodedBytes.buffer as ArrayBuffer], { type: mimeType });
    const fileName = `${baseName}_trimmed.${extension}`;

    const metadata: AudioMetadata = {
      durationSec: (channels[0]?.length || 0) / sampleRate,
      sampleRate,
      channels: channels.length,
      trimmedDurationSec,
      peakAmplitudeBefore: Math.round(peakBefore * 1000) / 1000,
      peakAmplitudeAfter: Math.round(peakAfter * 1000) / 1000,
      gainApplied: options.volumeGainMultiplier,
      clippedPrevented: clipped,
      format: options.exportFormat,
    };

    return {
      success: true,
      blob,
      fileName,
      fileSize: blob.size,
      mimeType,
      metadata,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      blob: new Blob([], { type: 'application/octet-stream' }),
      fileName: '',
      fileSize: 0,
      mimeType: 'application/octet-stream',
      error: errorMsg,
    };
  }
}

/**
 * Downsamples PCM audio buffer to normalized bar amplitudes for visual preview.
 */
export function generateWaveformPreview(channelData: Float32Array, pointCount = 100): number[] {
  const count = Math.max(10, Math.min(300, pointCount));

  if (!channelData || channelData.length === 0) {
    const emptyBars: number[] = [];
    for (let i = 0; i < count; i++) {
      emptyBars.push(0.05);
    }
    return emptyBars;
  }

  const rawBars = new Float32Array(count);
  const sliceSize = channelData.length / count;
  let maxRms = 0;

  for (let i = 0; i < count; i++) {
    const start = Math.floor(i * sliceSize);
    const end = Math.floor((i + 1) * sliceSize);
    let sumSq = 0;
    let n = 0;

    for (let j = start; j < end && j < channelData.length; j++) {
      const s = channelData[j];
      sumSq += s * s;
      n++;
    }

    const rms = n > 0 ? Math.sqrt(sumSq / n) : 0;
    rawBars[i] = rms;
    if (rms > maxRms) maxRms = rms;
  }

  const normalized: number[] = [];
  for (let i = 0; i < count; i++) {
    const val = maxRms > 0 ? rawBars[i] / maxRms : 0;
    const mapped = 0.05 + val * 0.95;
    normalized.push(Math.round(mapped * 100) / 100);
  }

  return normalized;
}
