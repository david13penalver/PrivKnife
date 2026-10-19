import { ConvertedImageItem, HeicAvifConverterOptions } from './types';

export const DEFAULT_CONVERTER_OPTIONS: HeicAvifConverterOptions = {
  outputFormat: 'jpeg',
  jpegQuality: 0.92,
  stripMetadata: true,
  maxDimensionPx: 0, // original
  filenameSuffix: '',
  packageAsZip: false,
};

export const MINIMAL_CONVERTER_OPTIONS: HeicAvifConverterOptions = {
  outputFormat: 'png',
  jpegQuality: 0.5,
  stripMetadata: false,
  maxDimensionPx: 800,
  filenameSuffix: '-converted',
  packageAsZip: true,
};

export const MAXIMAL_CONVERTER_OPTIONS: HeicAvifConverterOptions = {
  outputFormat: 'jpeg',
  jpegQuality: 1.0,
  stripMetadata: true,
  maxDimensionPx: 3840,
  filenameSuffix: '_hq',
  packageAsZip: true,
};

export function createSyntheticFile(
  name: string,
  mimeType: string,
  byteSize: number = 1024
): File {
  const bytes = new Uint8Array(byteSize);
  for (let i = 0; i < byteSize; i++) {
    bytes[i] = i % 256;
  }
  return new File([bytes], name, { type: mimeType });
}

export const SAMPLE_HEIC_FILE = createSyntheticFile('IMG_20241019_001.heic', 'image/heic', 4096);
export const SAMPLE_HEIF_FILE = createSyntheticFile('IMG_20241019_002.heif', 'image/heif', 3072);
export const SAMPLE_AVIF_FILE = createSyntheticFile('photo-landscape.avif', 'image/avif', 2048);
export const SAMPLE_PNG_FILE = createSyntheticFile('screenshot.png', 'image/png', 5120);

export const SAMPLE_BATCH_FILES: File[] = [
  SAMPLE_HEIC_FILE,
  SAMPLE_HEIF_FILE,
  SAMPLE_AVIF_FILE,
  SAMPLE_PNG_FILE,
];

export const SAMPLE_QUEUE_ITEMS: ConvertedImageItem[] = [
  {
    id: 'item-1',
    originalFile: SAMPLE_HEIC_FILE,
    originalName: SAMPLE_HEIC_FILE.name,
    originalSize: SAMPLE_HEIC_FILE.size,
    originalMimeType: SAMPLE_HEIC_FILE.type,
    status: 'pending',
  },
  {
    id: 'item-2',
    originalFile: SAMPLE_AVIF_FILE,
    originalName: SAMPLE_AVIF_FILE.name,
    originalSize: SAMPLE_AVIF_FILE.size,
    originalMimeType: SAMPLE_AVIF_FILE.type,
    status: 'pending',
  },
];
