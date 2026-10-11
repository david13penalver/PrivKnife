import { FrameData } from './test-fixtures';
import { GifEncoderOptions } from './types';

export interface QuantizedResult {
  palette: number[][]; // RGB arrays [[r, g, b], ...]
  indexedPixels: Uint8Array;
}

/**
 * Quantizes RGBA pixels into an indexed color palette (up to maxColors)
 * using frequency sampling and Euclidean color distance matching.
 */
export function quantizePalette(
  pixels: Uint8ClampedArray,
  maxColors = 256
): QuantizedResult {
  const pixelCount = pixels.length / 4;
  const colorMap = new Map<number, { r: number; g: number; b: number; count: number }>();

  // Quantize 8-bit to 5-bit for histogram grouping
  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);

    const existing = colorMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      colorMap.set(key, { r, g, b, count: 1 });
    }
  }

  // Sort by frequency
  const sorted = Array.from(colorMap.values()).sort((a, b) => b.count - a.count);

  // Pick top unique colors up to maxColors
  const targetColors = Math.min(maxColors, sorted.length);
  const rawPalette: number[][] = [];

  for (let i = 0; i < targetColors; i++) {
    rawPalette.push([sorted[i].r, sorted[i].g, sorted[i].b]);
  }

  // Ensure palette size is a power of 2 between 4 and 256
  let pSize = 4;
  while (pSize < rawPalette.length && pSize < 256) {
    pSize *= 2;
  }
  while (rawPalette.length < pSize) {
    rawPalette.push([0, 0, 0]); // pad with black
  }

  // Map each pixel to closest palette index
  const indexedPixels = new Uint8Array(pixelCount);
  const cache = new Map<number, number>();

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    const key = (r << 16) | (g << 8) | b;

    let bestIdx = cache.get(key);
    if (bestIdx === undefined) {
      let minDist = Infinity;
      bestIdx = 0;

      for (let p = 0; p < rawPalette.length; p++) {
        const pr = rawPalette[p][0];
        const pg = rawPalette[p][1];
        const pb = rawPalette[p][2];
        const dr = r - pr;
        const dg = g - pg;
        const db = b - pb;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < minDist) {
          minDist = dist;
          bestIdx = p;
          if (dist === 0) break;
        }
      }
      cache.set(key, bestIdx);
    }

    indexedPixels[i] = bestIdx;
  }

  return { palette: rawPalette, indexedPixels };
}

/**
 * Encodes an array of video frame buffers into an animated GIF89a binary Uint8Array.
 */
export function encodeGifFrames(
  frames: FrameData[],
  options: GifEncoderOptions
): Uint8Array {
  if (frames.length === 0) {
    throw new Error('Cannot encode GIF without frames');
  }

  const { width, height, fps, loopCount = 0 } = options;
  const maxColors = options.maxColors || 128;
  const delayHundredths = Math.max(1, Math.round(100 / (fps || 10)));

  // 1. Compute Global Color Palette from the first frame
  const { palette } = quantizePalette(frames[0].data, maxColors);
  const paletteColorCount = palette.length; // power of 2
  const colorTableSizeExp = Math.round(Math.log2(paletteColorCount)) - 1; // 0..7

  const output: number[] = [];

  // Helper write functions
  function writeByte(b: number): void {
    output.push(b & 0xff);
  }

  function writeWord(w: number): void {
    output.push(w & 0xff);
    output.push((w >> 8) & 0xff);
  }

  function writeString(s: string): void {
    for (let i = 0; i < s.length; i++) {
      output.push(s.charCodeAt(i));
    }
  }

  // --- Header: GIF89a ---
  writeString('GIF89a');

  // --- Logical Screen Descriptor (7 bytes) ---
  writeWord(width);
  writeWord(height);
  // Packed: Global Color Table Flag (1), Color Res (7), Sort (0), Size (colorTableSizeExp)
  writeByte(0x80 | 0x70 | colorTableSizeExp);
  writeByte(0); // Background Color Index
  writeByte(0); // Pixel Aspect Ratio

  // --- Global Color Table ---
  for (let i = 0; i < paletteColorCount; i++) {
    writeByte(palette[i][0]);
    writeByte(palette[i][1]);
    writeByte(palette[i][2]);
  }

  // --- Netscape 2.0 Application Extension (for looping) ---
  writeByte(0x21); // Extension Introducer
  writeByte(0xff); // Application Extension
  writeByte(11); // Block size
  writeString('NETSCAPE2.0');
  writeByte(3); // Sub-block size
  writeByte(1); // Loop sub-block ID
  writeWord(loopCount); // Loop count (0 = infinite)
  writeByte(0); // Block Terminator

  // --- Frame Blocks ---
  for (let f = 0; f < frames.length; f++) {
    const frame = frames[f];
    const { indexedPixels } = quantizePalette(frame.data, paletteColorCount);

    // Graphic Control Extension (8 bytes)
    writeByte(0x21);
    writeByte(0xf9);
    writeByte(4); // Block size
    writeByte(0x04); // Disposal method 1 (do not dispose)
    writeWord(delayHundredths); // Delay time
    writeByte(0); // Transparent color index
    writeByte(0); // Block Terminator

    // Image Descriptor (10 bytes)
    writeByte(0x2c); // Image Separator
    writeWord(0); // Left
    writeWord(0); // Top
    writeWord(width);
    writeWord(height);
    writeByte(0); // No local color table

    // Image Data (LZW compressed)
    const minCodeSize = Math.max(2, colorTableSizeExp + 1);
    writeByte(minCodeSize);

    // LZW compression
    const lzwBytes = lzwCompress(indexedPixels, minCodeSize);

    // Write sub-blocks (max 255 bytes each)
    let offset = 0;
    while (offset < lzwBytes.length) {
      const chunkSize = Math.min(255, lzwBytes.length - offset);
      writeByte(chunkSize);
      for (let c = 0; c < chunkSize; c++) {
        writeByte(lzwBytes[offset + c]);
      }
      offset += chunkSize;
    }
    writeByte(0); // Sub-block terminator
  }

  // --- Trailer ---
  writeByte(0x3b); // Trailer byte ';'

  return new Uint8Array(output);
}

/**
 * Standard LZW Compression for GIF image streams.
 */
function lzwCompress(pixels: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;

  let codeSize = minCodeSize + 1;
  let nextCode = eoiCode + 1;
  const maxCode = 4096;

  // LZW Dictionary using Map: prefixCode << 8 | nextPixel -> code
  const dict = new Map<number, number>();

  function resetDict(): void {
    dict.clear();
    codeSize = minCodeSize + 1;
    nextCode = eoiCode + 1;
  }

  const outBytes: number[] = [];
  let curAccum = 0;
  let curBits = 0;

  function writeBits(code: number, numBits: number): void {
    curAccum |= code << curBits;
    curBits += numBits;
    while (curBits >= 8) {
      outBytes.push(curAccum & 0xff);
      curAccum >>= 8;
      curBits -= 8;
    }
  }

  function flushBits(): void {
    if (curBits > 0) {
      outBytes.push(curAccum & 0xff);
      curAccum = 0;
      curBits = 0;
    }
  }

  // Start with Clear Code
  writeBits(clearCode, codeSize);
  resetDict();

  if (pixels.length === 0) {
    writeBits(eoiCode, codeSize);
    flushBits();
    return new Uint8Array(outBytes);
  }

  let prefix = pixels[0];

  for (let i = 1; i < pixels.length; i++) {
    const k = pixels[i];
    const key = (prefix << 8) | k;

    if (dict.has(key)) {
      prefix = dict.get(key)!;
    } else {
      writeBits(prefix, codeSize);

      if (nextCode < maxCode) {
        dict.set(key, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) {
          codeSize++;
        }
      } else {
        // Dictionary full, send clear code and reset
        writeBits(clearCode, codeSize);
        resetDict();
      }

      prefix = k;
    }
  }

  // Flush remaining prefix and EOI code
  writeBits(prefix, codeSize);
  writeBits(eoiCode, codeSize);
  flushBits();

  return new Uint8Array(outBytes);
}
