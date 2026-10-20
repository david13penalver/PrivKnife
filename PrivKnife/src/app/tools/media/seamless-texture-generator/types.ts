export type TextureBlendMode = 'linear_crossfade' | 'mirror_repeat' | 'poisson_blend';

export interface SeamlessTextureGeneratorOptions {
  blendMode: TextureBlendMode;
  edgeOverlapPercentage: number;
  generateNormalMap: boolean;
  normalMapStrength: number;
  invertNormalY: boolean;
  previewTilingMultiplier: number;
  outputResolutionPx: number;
}

export interface TextureImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export interface SeamlessTextureGeneratorResult {
  success: boolean;
  diffuseBlob: Blob;
  normalMapBlob?: Blob;
  zipBlob?: Blob;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  diffuseDataUrl: string;
  normalMapDataUrl?: string;
  cssSnippet: string;
  metadata?: Record<string, unknown>;
  error?: string;
}
