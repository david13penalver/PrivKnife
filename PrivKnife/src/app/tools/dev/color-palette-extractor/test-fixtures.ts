import { ExtractedColor } from './types';

export const SAMPLE_EXTRACTED_PALETTE: ExtractedColor[] = [
  {
    id: 'color-1',
    hex: '#0f172a',
    rgb: { r: 15, g: 23, b: 42 },
    hsl: { h: 222, s: 47, l: 11 },
    luminance: 0.0108,
    name: 'Deep Slate',
  },
  {
    id: 'color-2',
    hex: '#2563eb',
    rgb: { r: 37, g: 99, b: 235 },
    hsl: { h: 221, s: 83, l: 53 },
    luminance: 0.1601,
    name: 'Royal Blue',
  },
  {
    id: 'color-3',
    hex: '#10b981',
    rgb: { r: 16, g: 185, b: 129 },
    hsl: { h: 160, s: 84, l: 39 },
    luminance: 0.3804,
    name: 'Emerald Green',
  },
  {
    id: 'color-4',
    hex: '#f59e0b',
    rgb: { r: 245, g: 158, b: 11 },
    hsl: { h: 38, s: 92, l: 50 },
    luminance: 0.4578,
    name: 'Amber Orange',
  },
  {
    id: 'color-5',
    hex: '#ef4444',
    rgb: { r: 239, g: 68, b: 68 },
    hsl: { h: 0, s: 84, l: 60 },
    luminance: 0.2185,
    name: 'Coral Red',
  },
  {
    id: 'color-6',
    hex: '#ffffff',
    rgb: { r: 255, g: 255, b: 255 },
    hsl: { h: 0, s: 0, l: 100 },
    luminance: 1.0,
    name: 'Pure White',
  },
];

export function createMockImageFile(
  name = 'sample-branding.png',
  type = 'image/png',
  sizeBytes = 4000
): File {
  const content = new Uint8Array(sizeBytes);
  content[0] = 0x89;
  content[1] = 0x50;
  content[2] = 0x4e;
  content[3] = 0x47;
  return new File([content], name, { type });
}

export function createMockImageData(
  width = 10,
  height = 10
): { data: Uint8ClampedArray; width: number; height: number } {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    // Generate some colored pixels: alternating between blue, green, and dark
    if (i % 12 === 0) {
      data[i] = 37;
      data[i + 1] = 99;
      data[i + 2] = 235;
      data[i + 3] = 255;
    } else if (i % 8 === 0) {
      data[i] = 16;
      data[i + 1] = 185;
      data[i + 2] = 129;
      data[i + 3] = 255;
    } else {
      data[i] = 15;
      data[i + 1] = 23;
      data[i + 2] = 42;
      data[i + 3] = 255;
    }
  }
  return { data, width, height };
}
