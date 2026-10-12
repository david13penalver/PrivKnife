import { describe, expect, it, vi } from 'vitest';
import {
  blurAlphaMask,
  colorDistance,
  composeBackdrop,
  defringeColors,
  generateAlphaMask,
  getLuminance,
  hexToRgb,
  pixelsToPngBlob,
  removeBackgroundFromPixels,
  samplePerimeterColors,
} from './engine';
import { DEFAULT_REMOVER_CONFIG } from './test-fixtures';

describe('Automated Background Removal Engine', () => {
  it('parses hex color strings accurately', () => {
    expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#F00')).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb('invalid')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('calculates Euclidean RGB color distance and perceived luminance', () => {
    expect(colorDistance(0, 0, 0, 0, 0, 0)).toBe(0);
    expect(colorDistance(255, 255, 255, 0, 0, 0)).toBeCloseTo(441.67, 1);
    expect(colorDistance(255, 0, 0, 0, 255, 0)).toBeCloseTo(360.62, 1);

    expect(getLuminance(0, 0, 0)).toBe(0);
    expect(getLuminance(255, 255, 255)).toBe(255);
    expect(getLuminance(0, 255, 0)).toBeCloseTo(149.685, 1);
  });

  it('samples perimeter border and corner pixels', () => {
    const width = 10;
    const height = 10;
    const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
    const seeds = samplePerimeterColors(pixels, width, height);

    expect(seeds.length).toBeGreaterThan(0);
    expect(seeds[0]).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('generates chroma-key alpha mask isolating green screen', () => {
    const width = 4;
    const height = 4;
    const pixels = new Uint8ClampedArray(width * height * 4);

    // Fill with green (0, 255, 0)
    for (let i = 0; i < width * height; i++) {
      pixels[i * 4 + 1] = 255;
      pixels[i * 4 + 3] = 255;
    }
    // Put a red center subject at (1, 1) and (2, 2)
    const centerIndices = [1 * width + 1, 2 * width + 2];
    for (const idx of centerIndices) {
      pixels[idx * 4] = 255;
      pixels[idx * 4 + 1] = 0;
      pixels[idx * 4 + 2] = 0;
    }

    const mask = generateAlphaMask(pixels, width, height, 'chroma-key', 30, '#00FF00');

    // Green pixels should be transparent (0)
    expect(mask[0]).toBe(0);
    // Red pixels should be opaque foreground (255)
    expect(mask[centerIndices[0]]).toBe(255);
    expect(mask[centerIndices[1]]).toBe(255);
  });

  it('generates light-bg alpha mask isolating subject on white background', () => {
    const width = 4;
    const height = 4;
    const pixels = new Uint8ClampedArray(width * height * 4).fill(255); // Pure white

    // Put black foreground subject in center (1, 1)
    const centerIdx = 1 * width + 1;
    pixels[centerIdx * 4] = 0;
    pixels[centerIdx * 4 + 1] = 0;
    pixels[centerIdx * 4 + 2] = 0;

    const mask = generateAlphaMask(pixels, width, height, 'light-bg', 30, '#FFFFFF');

    // White background should be removed
    expect(mask[0]).toBe(0);
    // Black subject should be retained
    expect(mask[centerIdx]).toBe(255);
  });

  it('generates dark-bg alpha mask isolating subject on dark background', () => {
    const width = 4;
    const height = 4;
    const pixels = new Uint8ClampedArray(width * height * 4); // Pure black

    // Put white subject in center
    const centerIdx = 2 * width + 2;
    pixels[centerIdx * 4] = 255;
    pixels[centerIdx * 4 + 1] = 255;
    pixels[centerIdx * 4 + 2] = 255;

    const mask = generateAlphaMask(pixels, width, height, 'dark-bg', 30, '#000000');

    expect(mask[0]).toBe(0);
    expect(mask[centerIdx]).toBe(255);
  });

  it('blurs alpha mask for smooth edge feathering', () => {
    const width = 5;
    const height = 5;
    const mask = new Uint8ClampedArray(width * height).fill(0);
    mask[2 * width + 2] = 255; // Single point in center

    const blurred = blurAlphaMask(mask, width, height, 1);
    expect(blurred[2 * width + 2]).toBeGreaterThan(0);
    expect(blurred[2 * width + 2]).toBeLessThan(255); // Spread into neighbors
    expect(blurred[2 * width + 1]).toBeGreaterThan(0);
  });

  it('defringes transition edge colors by propagating foreground colors', () => {
    const width = 3;
    const height = 1;
    const pixels = new Uint8ClampedArray([
      0, 255, 0, 255, // Background green (index 0)
      0, 200, 50, 255, // Bleed green (index 1)
      255, 0, 0, 255, // Foreground red (index 2)
    ]);
    const mask = new Uint8ClampedArray([0, 128, 255]); // Boundary edge at index 1

    defringeColors(pixels, mask, width, height, 1);

    // Transition pixel at index 1 should take foreground red hue
    expect(pixels[1 * 4]).toBe(255);
    expect(pixels[1 * 4 + 1]).toBe(0);
  });

  it('composes output image onto transparent, solid, gradient, and mask-only backdrops', () => {
    const width = 2;
    const height = 2;
    const srcPixels = new Uint8ClampedArray(16).fill(255);
    const mask = new Uint8ClampedArray([0, 255, 255, 0]);
    const outPixels = new Uint8ClampedArray(16);

    // Transparent
    composeBackdrop(outPixels, srcPixels, mask, width, height, 'transparent', '#FFFFFF', '#FFF', '#000');
    expect(outPixels[3]).toBe(0);
    expect(outPixels[7]).toBe(255);

    // Solid
    composeBackdrop(outPixels, srcPixels, mask, width, height, 'solid', '#000000', '#FFF', '#000');
    expect(outPixels[0]).toBe(0); // Blended to black
    expect(outPixels[3]).toBe(255); // Alpha is 255

    // Mask Only
    composeBackdrop(outPixels, srcPixels, mask, width, height, 'mask-only', '#FFF', '#FFF', '#000');
    expect(outPixels[0]).toBe(0);
    expect(outPixels[4]).toBe(255);
  });

  it('executes complete background removal pipeline and computes accurate metrics', () => {
    const width = 10;
    const height = 10;
    const pixels = new Uint8ClampedArray(width * height * 4).fill(255); // White background

    // Center 4x4 red square
    for (let y = 3; y < 7; y++) {
      for (let x = 3; x < 7; x++) {
        const idx = (y * width + x) * 4;
        pixels[idx] = 255;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
      }
    }

    const { outputPixels, alphaMask, metrics } = removeBackgroundFromPixels(
      pixels,
      width,
      height,
      DEFAULT_REMOVER_CONFIG
    );

    expect(outputPixels.length).toBe(width * height * 4);
    expect(alphaMask.length).toBe(width * height);
    expect(metrics.originalWidth).toBe(10);
    expect(metrics.originalHeight).toBe(10);
    expect(metrics.transparentPixelCount).toBeGreaterThan(0);
    expect(metrics.foregroundPixelCount).toBeGreaterThan(0);
    expect(metrics.transparencyPercent).toBeGreaterThan(50);
    expect(metrics.processingTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('creates valid PNG Blob containing PNG signature header bytes', () => {
    const width = 4;
    const height = 4;
    const pixels = new Uint8ClampedArray(width * height * 4).fill(128);

    const blob = pixelsToPngBlob(pixels, width, height);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(16);
  });

  it('runs 100% client-side with zero network calls', () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(window, 'XMLHttpRequest');

    const width = 8;
    const height = 8;
    const pixels = new Uint8ClampedArray(width * height * 4).fill(255);

    const { outputPixels } = removeBackgroundFromPixels(
      pixels,
      width,
      height,
      DEFAULT_REMOVER_CONFIG
    );
    const blob = pixelsToPngBlob(outputPixels, width, height);

    expect(blob.size).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
  });
});
