export type SegmentationMode =
  | 'auto-subject' // Detect perimeter background & keep center/prominent subject
  | 'chroma-key' // Transparent target color (e.g. green screen, studio white/black)
  | 'light-bg' // High luminance background removal (e.g. e-commerce studio white)
  | 'dark-bg'; // Low luminance background removal (e.g. black velvet / dark backdrop)

export type BackdropMode =
  | 'transparent' // Standard transparent PNG checkerboard
  | 'solid' // Solid color (e.g. #FFFFFF, #000000)
  | 'gradient' // Subtle studio spotlight gradient
  | 'mask-only'; // Black & white alpha matte

export interface BackgroundRemoverConfig {
  mode: SegmentationMode;
  tolerance: number; // 5 to 100 (color difference sensitivity)
  featherRadius: number; // 0 to 10 px (edge softness / anti-aliasing)
  defringeRadius: number; // 0 to 5 px (color bleeding / halo de-contamination)
  targetColor: string; // Hex color for chroma-key / color key (e.g. #FFFFFF)
  backdropMode: BackdropMode;
  backdropColor: string; // Hex color when backdropMode is 'solid'
  backdropGradientFrom: string; // Hex color for studio gradient
  backdropGradientTo: string;
  zoomLevel: number; // 0.5 to 3.0
  splitPosition: number; // 0 to 100 (percentage for before/after split slider)
}

export interface RemovalMetrics {
  originalWidth: number;
  originalHeight: number;
  transparentPixelCount: number;
  foregroundPixelCount: number;
  transparencyPercent: number;
  processingTimeMs: number;
  fileSizeBytes: number;
}

export interface PresetSampleImage {
  id: string;
  name: string;
  description: string;
  category: 'product' | 'portrait' | 'graphic';
  width: number;
  height: number;
  svgDataUri: string;
  recommendedConfig: Partial<BackgroundRemoverConfig>;
}
