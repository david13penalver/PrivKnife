import { describe, expect, it } from 'vitest';
import {
  calculateTrimBounds,
  formatVideoTime,
  scaleDimensions,
} from './engine';
import { encodeGifFrames, quantizePalette } from './gif-encoder';
import {
  createSyntheticFrame,
  createSyntheticFrameSequence,
} from './test-fixtures';

describe('Video to GIF & Clip Trimmer Engine', () => {
  describe('GIF89a Binary Encoder', () => {
    it('generates a valid binary GIF89a with proper header, Netscape loop block, and trailer', () => {
      const frames = createSyntheticFrameSequence(3, 32, 32);
      const gifBytes = encodeGifFrames(frames, {
        width: 32,
        height: 32,
        fps: 10,
        loopCount: 0,
      });

      expect(gifBytes).toBeInstanceOf(Uint8Array);
      expect(gifBytes.length).toBeGreaterThan(100);

      // Verify GIF89a header: 'G' 'I' 'F' '8' '9' 'a'
      const headerStr = String.fromCharCode(...gifBytes.subarray(0, 6));
      expect(headerStr).toBe('GIF89a');

      // Verify Netscape 2.0 extension exists for looping
      let hasNetscape = false;
      const fullText = String.fromCharCode(...gifBytes);
      if (fullText.includes('NETSCAPE2.0')) {
        hasNetscape = true;
      }
      expect(hasNetscape).toBe(true);

      // Verify trailer byte: 0x3B (';')
      expect(gifBytes[gifBytes.length - 1]).toBe(0x3b);
    });

    it('quantizes colors and produces indexed pixels correctly', () => {
      const frame = createSyntheticFrame(16, 16, [128, 64, 32]);
      const { palette, indexedPixels } = quantizePalette(frame.data, 64);

      expect(palette.length).toBeGreaterThan(0);
      expect(palette.length).toBeLessThanOrEqual(64);
      expect(indexedPixels.length).toBe(16 * 16);

      for (let i = 0; i < indexedPixels.length; i++) {
        expect(indexedPixels[i]).toBeLessThan(palette.length);
      }
    });
  });

  describe('Dimension Scaler & Aspect Ratio Math', () => {
    it('scales 1080p landscape video preserving 16:9 aspect ratio', () => {
      expect(scaleDimensions(1920, 1080, 'original')).toEqual({
        width: 1920,
        height: 1080,
      });

      const res720 = scaleDimensions(1920, 1080, '720p');
      expect(res720.height).toBe(720);
      expect(res720.width).toBe(1280);

      const res480 = scaleDimensions(1920, 1080, '480p');
      expect(res480.height).toBe(480);
      expect(Math.abs(res480.width - 854)).toBeLessThanOrEqual(2);

      const res360 = scaleDimensions(1920, 1080, '360p');
      expect(res360.height).toBe(360);
      expect(res360.width).toBe(640);
    });

    it('scales vertical 9:16 mobile videos preserving aspect ratio', () => {
      const res480 = scaleDimensions(1080, 1920, '480p');
      expect(res480.height).toBe(480);
      expect(Math.abs(res480.width - 270)).toBeLessThanOrEqual(2);
    });

    it('clamps odd dimensions to even numbers for video/GIF encoders', () => {
      const res = scaleDimensions(1001, 501, '480p');
      expect(res.width % 2).toBe(0);
      expect(res.height % 2).toBe(0);
    });
  });

  describe('Timeline Bounds & Time Formatter', () => {
    it('validates and clamps trim start and end times within duration', () => {
      const bounds1 = calculateTrimBounds(10.0, 2.0, 7.5);
      expect(bounds1.validStart).toBe(2.0);
      expect(bounds1.validEnd).toBe(7.5);
      expect(bounds1.duration).toBe(5.5);

      // Clamping out-of-range bounds
      const bounds2 = calculateTrimBounds(10.0, -3.0, 15.0);
      expect(bounds2.validStart).toBe(0.0);
      expect(bounds2.validEnd).toBe(10.0);
      expect(bounds2.duration).toBe(10.0);

      // Inverted start and end
      const bounds3 = calculateTrimBounds(10.0, 8.0, 4.0);
      expect(bounds3.validStart).toBe(4.0);
      expect(bounds3.validEnd).toBe(8.0);
    });

    it('formats seconds into readable MM:SS.ms timestamps', () => {
      expect(formatVideoTime(0)).toBe('00:00.0');
      expect(formatVideoTime(74.5)).toBe('01:14.5');
      expect(formatVideoTime(3665.2)).toBe('01:01:05.2');
    });
  });
});
