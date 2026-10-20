import { SeamlessTextureGeneratorOptions, TextureImageData } from './types';

export const DEFAULT_TEXTURE_OPTIONS: SeamlessTextureGeneratorOptions = {
  blendMode: 'linear_crossfade',
  edgeOverlapPercentage: 20,
  generateNormalMap: true,
  normalMapStrength: 2.5,
  invertNormalY: false,
  previewTilingMultiplier: 3,
  outputResolutionPx: 256,
};

/**
 * Creates synthetic image data (e.g., checker/gradient surface) for pure mathematical testing
 */
export function createSyntheticSurface(width = 64, height = 64): TextureImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Procedural stone/brick pattern
      const isStripe = (x % 16 < 2) || (y % 16 < 2);
      const intensity = isStripe ? 50 : 150 + ((x * y) % 70);

      data[idx] = intensity;     // R
      data[idx + 1] = intensity; // G
      data[idx + 2] = intensity; // B
      data[idx + 3] = 255;       // A
    }
  }

  return { width, height, data };
}
