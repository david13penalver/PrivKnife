import { describe, it, expect } from 'vitest';
import {
  makeSeamlessTexture,
  generateNormalMap,
  generateCssBackgroundSnippet,
  processTexture,
  processSeamlessTexture,
  pixelDataToPngBytes,
  resamplePixelData,
  computeSeamAlpha,
} from './engine';
import {
  DEFAULT_TEXTURE_OPTIONS,
  createSyntheticSurface,
} from './test-fixtures';
import { TextureImageData } from './types';

describe('TextureEngine (engine.ts) - Seam 1', () => {
  describe('makeSeamlessTexture (DEFECT-57-01)', () => {
    it('should transform synthetic surface into seamless texture with matching edge bounds (mirror_repeat)', () => {
      const src = createSyntheticSurface(32, 32);
      const seamless = makeSeamlessTexture(src, {
        ...DEFAULT_TEXTURE_OPTIONS,
        blendMode: 'mirror_repeat',
      });

      expect(seamless.width).toBe(src.width);
      expect(seamless.height).toBe(src.height);

      // In mirror_repeat, outer opposite edges must match exactly
      const w = seamless.width;
      const h = seamless.height;
      for (let y = 0; y < h; y++) {
        const leftIdx = (y * w + 0) * 4;
        const rightIdx = (y * w + (w - 1)) * 4;
        expect(seamless.data[leftIdx]).toBe(seamless.data[rightIdx]);
      }
      for (let x = 0; x < w; x++) {
        const topIdx = (0 * w + x) * 4;
        const bottomIdx = ((h - 1) * w + x) * 4;
        expect(seamless.data[topIdx]).toBe(seamless.data[bottomIdx]);
      }
    });

    it('should blend edges with linear_crossfade and preserve dimensions', () => {
      const src = createSyntheticSurface(32, 32);
      const seamless = makeSeamlessTexture(src, {
        ...DEFAULT_TEXTURE_OPTIONS,
        blendMode: 'linear_crossfade',
        edgeOverlapPercentage: 25,
      });

      expect(seamless.width).toBe(src.width);
      expect(seamless.height).toBe(src.height);
      expect(seamless.data.length).toBe(src.data.length);
    });

    it('should blend edges with poisson_blend without NaN or infinite values', () => {
      const src = createSyntheticSurface(32, 32);
      const seamless = makeSeamlessTexture(src, {
        ...DEFAULT_TEXTURE_OPTIONS,
        blendMode: 'poisson_blend',
      });

      for (let i = 0; i < seamless.data.length; i++) {
        expect(isNaN(seamless.data[i])).toBe(false);
      }
    });

    it('should smoothly blend vertical seam at y = 0 outside center box on horizontal step gradient', () => {
      const w = 64;
      const h = 64;
      const data = new Uint8ClampedArray(w * h * 4);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const val = Math.round((x / (w - 1)) * 255);
          data[idx] = val;
          data[idx + 1] = val;
          data[idx + 2] = val;
          data[idx + 3] = 255;
        }
      }
      const stepImg: TextureImageData = { width: w, height: h, data };

      const result = makeSeamlessTexture(stepImg, {
        ...DEFAULT_TEXTURE_OPTIONS,
        blendMode: 'linear_crossfade',
        edgeOverlapPercentage: 25,
      });

      // At y = 0, check discontinuity across x = 31 and x = 32
      const idx31 = (0 * w + 31) * 4;
      const idx32 = (0 * w + 32) * 4;
      const diffTop = Math.abs(result.data[idx32] - result.data[idx31]);
      // In old bug, diff was 255 (full step jump). With two-pass crossfade, it should be smooth (< 30)
      expect(diffTop).toBeLessThan(30);

      // Check bottom row as well (y = 63)
      const idxBottom31 = ((h - 1) * w + 31) * 4;
      const idxBottom32 = ((h - 1) * w + 32) * 4;
      const diffBottom = Math.abs(result.data[idxBottom32] - result.data[idxBottom31]);
      expect(diffBottom).toBeLessThan(30);
    });

    it('should smoothly blend horizontal seam at x = 0 outside center box on vertical step gradient', () => {
      const w = 64;
      const h = 64;
      const data = new Uint8ClampedArray(w * h * 4);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const val = Math.round((y / (h - 1)) * 255);
          data[idx] = val;
          data[idx + 1] = val;
          data[idx + 2] = val;
          data[idx + 3] = 255;
        }
      }
      const stepImg: TextureImageData = { width: w, height: h, data };

      const result = makeSeamlessTexture(stepImg, {
        ...DEFAULT_TEXTURE_OPTIONS,
        blendMode: 'linear_crossfade',
        edgeOverlapPercentage: 25,
      });

      // At x = 0, check discontinuity across y = 31 and y = 32
      const idx31 = (31 * w + 0) * 4;
      const idx32 = (32 * w + 0) * 4;
      const diffLeft = Math.abs(result.data[idx32] - result.data[idx31]);
      expect(diffLeft).toBeLessThan(30);

      // Check right column as well (x = 63)
      const idxRight31 = (31 * w + (w - 1)) * 4;
      const idxRight32 = (32 * w + (w - 1)) * 4;
      const diffRight = Math.abs(result.data[idxRight32] - result.data[idxRight31]);
      expect(diffRight).toBeLessThan(30);
    });
  });

  describe('pixelDataToPngBytes & Purity (DEFECT-57-03)', () => {
    it('should generate valid PNG bytes with PNG signature without DOM canvas', () => {
      const surface = createSyntheticSurface(16, 16);
      const pngBytes = pixelDataToPngBytes(surface);

      expect(pngBytes).toBeInstanceOf(Uint8Array);
      expect(pngBytes.length).toBeGreaterThan(50);
      // Signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
      expect(Array.from(pngBytes.subarray(0, 8))).toEqual([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
    });
  });

  describe('resamplePixelData & Output Resolution (DEFECT-57-04)', () => {
    it('should resample pixel data to target dimensions using bilinear interpolation', () => {
      const surface = createSyntheticSurface(32, 32);
      const resampled = resamplePixelData(surface, 64, 64);

      expect(resampled.width).toBe(64);
      expect(resampled.height).toBe(64);
      expect(resampled.data.length).toBe(64 * 64 * 4);
    });

    it('should return identical data if target dimensions match source', () => {
      const surface = createSyntheticSurface(32, 32);
      const resampled = resamplePixelData(surface, 32, 32);
      expect(resampled).toBe(surface);
    });
  });

  describe('generateNormalMap', () => {
    it('should compute valid RGB normal map with blue-dominant neutral normals', () => {
      const flat = createSyntheticSurface(16, 16);
      for (let i = 0; i < flat.data.length; i += 4) {
        flat.data[i] = 128;
        flat.data[i + 1] = 128;
        flat.data[i + 2] = 128;
        flat.data[i + 3] = 255;
      }

      const normalMap = generateNormalMap(flat, 2.5, false);

      expect(normalMap.width).toBe(16);
      expect(normalMap.height).toBe(16);

      const centerIdx = (8 * 16 + 8) * 4;
      expect(Math.abs(normalMap.data[centerIdx] - 128)).toBeLessThanOrEqual(2);
      expect(Math.abs(normalMap.data[centerIdx + 1] - 128)).toBeLessThanOrEqual(2);
      expect(normalMap.data[centerIdx + 2]).toBeGreaterThanOrEqual(250);
    });

    it('should invert Y axis green channel when invertNormalY is true', () => {
      const surface = createSyntheticSurface(16, 16);
      const normalOpenGL = generateNormalMap(surface, 3.0, false);
      const normalDirectX = generateNormalMap(surface, 3.0, true);

      let differenceFound = false;
      for (let i = 1; i < normalOpenGL.data.length; i += 4) {
        if (normalOpenGL.data[i] !== 128) {
          expect(normalDirectX.data[i]).not.toBe(normalOpenGL.data[i]);
          differenceFound = true;
          break;
        }
      }
      expect(differenceFound).toBe(true);
    });
  });

  describe('generateCssBackgroundSnippet', () => {
    it('should generate valid CSS rule with background-repeat: repeat', () => {
      const css = generateCssBackgroundSnippet('diffuse_seamless.png');

      expect(css).toContain('background-image: url("diffuse_seamless.png");');
      expect(css).toContain('background-repeat: repeat;');
      expect(css).toContain('background-size: auto;');
    });
  });

  describe('processTexture & processSeamlessTexture (DEFECT-57-03 & DEFECT-57-04)', () => {
    it('should process synthetic surface and return diffusePixels and normalPixels', async () => {
      const surface = createSyntheticSurface(32, 32);
      const result = await processSeamlessTexture(surface, {
        ...DEFAULT_TEXTURE_OPTIONS,
        outputResolutionPx: 64,
      });

      expect(result.success).toBe(true);
      expect(result.diffuseBlob).toBeInstanceOf(Blob);
      expect(result.diffuseBlob.size).toBeGreaterThan(0);
      expect(result.normalMapBlob).toBeInstanceOf(Blob);
      expect(result.zipBlob).toBeInstanceOf(Blob);
      expect(result.cssSnippet).toContain('background-repeat');
      expect(result.fileName).toContain('.zip');
      expect(result.diffusePixels).toBeDefined();
      expect(result.diffusePixels?.width).toBe(64);
      expect(result.diffusePixels?.height).toBe(64);
      expect(result.normalPixels).toBeDefined();
      expect(result.normalPixels?.width).toBe(64);
      expect(result.normalPixels?.height).toBe(64);
      expect(result.diffuseDataUrl).toContain('data:image/png;base64,');
    });

    it('should handle invalid or zero-dimension input gracefully', async () => {
      const emptySurface = { width: 0, height: 0, data: new Uint8ClampedArray(0) };
      const result = await processTexture(emptySurface, DEFAULT_TEXTURE_OPTIONS);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
