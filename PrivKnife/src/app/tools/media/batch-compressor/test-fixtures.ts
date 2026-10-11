import { CompressionOptions } from './types';

export const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  format: 'webp',
  quality: 80,
  resizePreset: 'none',
  preserveAspectRatio: true,
};

// 1x1 transparent PNG data
export const MOCK_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Helper to create mock File in tests
export function createMockImageFile(
  name = 'sample-image.png',
  type = 'image/png',
  sizeBytes = 2048
): File {
  const content = new Uint8Array(sizeBytes);
  // Simple mock image bytes
  content[0] = 0x89;
  content[1] = 0x50;
  content[2] = 0x4e;
  content[3] = 0x47;
  return new File([content], name, { type });
}
