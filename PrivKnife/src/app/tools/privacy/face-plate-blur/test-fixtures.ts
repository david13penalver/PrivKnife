import { BlurRegion, FacePlateBlurOptions } from './types';

export const DEFAULT_BLUR_OPTIONS: FacePlateBlurOptions = {
  censorMode: 'mosaic_pixelate',
  mosaicBlockSize: 16,
  blurRadiusPx: 12,
  selectionMode: 'manual_rect',
  brushRadiusPx: 20,
  exportQuality: 0.92,
  exportFormat: 'jpeg',
  stripExif: true,
  regions: [],
};

export const MINIMAL_BLUR_OPTIONS: FacePlateBlurOptions = {
  censorMode: 'blackout_box',
  mosaicBlockSize: 8,
  blurRadiusPx: 6,
  selectionMode: 'manual_rect',
  brushRadiusPx: 10,
  exportQuality: 0.8,
  exportFormat: 'png',
  stripExif: true,
  regions: [],
};

export const SAMPLE_BLUR_REGIONS: BlurRegion[] = [
  {
    id: 'region-1',
    x: 100,
    y: 80,
    width: 120,
    height: 140,
    mode: 'mosaic_pixelate',
    blockSize: 16,
  },
  {
    id: 'region-2',
    x: 250,
    y: 300,
    width: 180,
    height: 60,
    mode: 'blackout_box',
  },
];

// 1x1 transparent pixel base64 PNG data URL for test fixtures
export const DUMMY_IMAGE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export function createSyntheticImageFile(
  name: string = 'car-sale-photo.jpg',
  byteSize: number = 2048
): File {
  const bytes = new Uint8Array(byteSize);
  for (let i = 0; i < byteSize; i++) {
    bytes[i] = i % 256;
  }
  return new File([bytes], name, { type: 'image/jpeg' });
}
