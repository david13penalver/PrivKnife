import { describe, it, expect } from 'vitest';
import {
  makeSeamlessTexture,
  generateNormalMap,
  generateCssBackgroundSnippet,
  processTexture,
} from './engine';
import {
  DEFAULT_TEXTURE_OPTIONS,
  createSyntheticSurface,
} from './test-fixtures';

describe('TextureEngine (engine.ts) - Seam 1', () => {
  describe('makeSeamlessTexture', () => {
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
  });

  describe('generateNormalMap', () => {
    it('should compute valid RGB normal map with blue-dominant neutral normals', () => {
      // 16x16 flat surface
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

      // On a completely flat surface, normal vector is (0, 0, 1) -> R=128, G=128, B=255
      const centerIdx = (8 * 16 + 8) * 4;
      expect(Math.abs(normalMap.data[centerIdx] - 128)).toBeLessThanOrEqual(2);
      expect(Math.abs(normalMap.data[centerIdx + 1] - 128)).toBeLessThanOrEqual(2);
      expect(normalMap.data[centerIdx + 2]).toBeGreaterThanOrEqual(250);
    });

    it('should invert Y axis green channel when invertNormalY is true', () => {
      const surface = createSyntheticSurface(16, 16);
      const normalOpenGL = generateNormalMap(surface, 3.0, false);
      const normalDirectX = generateNormalMap(surface, 3.0, true);

      // Green channel in DirectX must invert relative to 128
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
      const css = generateCssBackgroundSnippet('texture_seamless.png');

      expect(css).toContain('background-image: url("texture_seamless.png");');
      expect(css).toContain('background-repeat: repeat;');
      expect(css).toContain('background-size: auto;');
    });
  });

  describe('processTexture', () => {
    it('should process synthetic surface and export Blobs and CSS', async () => {
      const surface = createSyntheticSurface(32, 32);
      const result = await processTexture(surface, DEFAULT_TEXTURE_OPTIONS);

      expect(result.success).toBe(true);
      expect(result.diffuseBlob).toBeInstanceOf(Blob);
      expect(result.diffuseBlob.size).toBeGreaterThan(0);
      expect(result.normalMapBlob).toBeInstanceOf(Blob);
      expect(result.zipBlob).toBeInstanceOf(Blob);
      expect(result.cssSnippet).toContain('background-repeat');
      expect(result.fileName).toContain('.zip');
    });

    it('should handle invalid or zero-dimension input gracefully', async () => {
      const emptySurface = { width: 0, height: 0, data: new Uint8ClampedArray(0) };
      const result = await processTexture(emptySurface, DEFAULT_TEXTURE_OPTIONS);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
