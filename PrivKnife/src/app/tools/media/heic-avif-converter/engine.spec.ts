import { describe, it, expect, vi } from 'vitest';
import {
  calculateBatchStats,
  calculateResizedDimensions,
  convertSingleImage,
  generateOutputFilename,
  isHeicContainer,
  packageBatchAsZip,
  processBatch,
  resolveMimeType,
  validateConverterOptions,
} from './engine';
import {
  DEFAULT_CONVERTER_OPTIONS,
  MINIMAL_CONVERTER_OPTIONS,
  SAMPLE_AVIF_FILE,
  SAMPLE_HEIC_FILE,
  SAMPLE_PNG_FILE,
  createSyntheticFile,
} from './test-fixtures';
import { ConvertedImageItem } from './types';

describe('HEIC & AVIF to JPG_PNG Batch Converter Engine (Seam 1)', () => {
  describe('Parameter Validation & Guardrails', () => {
    it('should validate default options successfully', () => {
      const res = validateConverterOptions(DEFAULT_CONVERTER_OPTIONS);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('should reject null or undefined options', () => {
      expect(validateConverterOptions(null as any).valid).toBe(false);
      expect(validateConverterOptions(undefined as any).valid).toBe(false);
    });

    it('should enforce JPEG quality boundaries [0.1, 1.0]', () => {
      expect(
        validateConverterOptions({ ...DEFAULT_CONVERTER_OPTIONS, jpegQuality: 0.05 })
          .valid
      ).toBe(false);
      expect(
        validateConverterOptions({ ...DEFAULT_CONVERTER_OPTIONS, jpegQuality: 1.05 })
          .valid
      ).toBe(false);
      expect(
        validateConverterOptions({ ...DEFAULT_CONVERTER_OPTIONS, jpegQuality: 0.85 })
          .valid
      ).toBe(true);
    });

    it('should enforce maxDimension boundaries [0, 10000]', () => {
      expect(
        validateConverterOptions({ ...DEFAULT_CONVERTER_OPTIONS, maxDimensionPx: -10 })
          .valid
      ).toBe(false);
      expect(
        validateConverterOptions({
          ...DEFAULT_CONVERTER_OPTIONS,
          maxDimensionPx: 12000,
        }).valid
      ).toBe(false);
      expect(
        validateConverterOptions({
          ...DEFAULT_CONVERTER_OPTIONS,
          maxDimensionPx: 1920,
        }).valid
      ).toBe(true);
    });
  });

  describe('Dimension & Filename Calculations', () => {
    it('should preserve original dimensions when maxDimension is 0', () => {
      const dim = calculateResizedDimensions(4032, 3024, 0);
      expect(dim.width).toBe(4032);
      expect(dim.height).toBe(3024);
    });

    it('should not upscale images smaller than maxDimension', () => {
      const dim = calculateResizedDimensions(800, 600, 1920);
      expect(dim.width).toBe(800);
      expect(dim.height).toBe(600);
    });

    it('should proportionally downscale landscape photos', () => {
      const dim = calculateResizedDimensions(4000, 2000, 2000);
      expect(dim.width).toBe(2000);
      expect(dim.height).toBe(1000);
    });

    it('should proportionally downscale portrait photos', () => {
      const dim = calculateResizedDimensions(2000, 4000, 1000);
      expect(dim.width).toBe(500);
      expect(dim.height).toBe(1000);
    });

    it('should generate output filename with replaced extension and suffix', () => {
      expect(generateOutputFilename('photo.heic', 'jpeg', '')).toBe('photo.jpg');
      expect(generateOutputFilename('photo.HEIC', 'png', '')).toBe('photo.png');
      expect(generateOutputFilename('photo.avif', 'jpeg', '-converted')).toBe(
        'photo-converted.jpg'
      );
      expect(generateOutputFilename('photo.heif', 'webp', '_web')).toBe('photo_web.webp');
    });

    it('should resolve correct MIME types for formats', () => {
      expect(resolveMimeType('jpeg')).toBe('image/jpeg');
      expect(resolveMimeType('png')).toBe('image/png');
      expect(resolveMimeType('webp')).toBe('image/webp');
    });
  });

  describe('HEIC & HEIF Container Detection (DEFECT-44-01)', () => {
    it('should detect HEIC and HEIF files by filename extension', () => {
      expect(isHeicContainer('photo.heic')).toBe(true);
      expect(isHeicContainer('photo.HEIC')).toBe(true);
      expect(isHeicContainer('photo.heif')).toBe(true);
      expect(isHeicContainer('photo.HEIF')).toBe(true);
      expect(isHeicContainer('photo.heifs')).toBe(true);
      expect(isHeicContainer('photo.heicp')).toBe(true);
      expect(isHeicContainer('photo.jpg')).toBe(false);
      expect(isHeicContainer('photo.png')).toBe(false);
      expect(isHeicContainer('photo.avif')).toBe(false);
    });

    it('should detect HEIC and HEIF files by MIME type', () => {
      const fileHeic = new File([], 'image.bin', { type: 'image/heic' });
      const fileHeif = new File([], 'image.bin', { type: 'image/heif' });
      const fileJpg = new File([], 'image.bin', { type: 'image/jpeg' });

      expect(isHeicContainer(fileHeic)).toBe(true);
      expect(isHeicContainer(fileHeif)).toBe(true);
      expect(isHeicContainer(fileJpg)).toBe(false);
    });

    it('should detect HEIC by ISO-BMFF ftyp header bytes', () => {
      const ftypHeicBytes = new Uint8Array([
        0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, // size 24, 'ftyp'
        0x68, 0x65, 0x69, 0x63, 0x00, 0x00, 0x00, 0x00, // 'heic', 0
        0x6d, 0x69, 0x66, 0x31, 0x68, 0x65, 0x69, 0x63, // 'mif1', 'heic'
      ]);
      expect(isHeicContainer(ftypHeicBytes)).toBe(true);
      expect(isHeicContainer(ftypHeicBytes.buffer)).toBe(true);

      const randomBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
      expect(isHeicContainer(randomBytes)).toBe(false);
    });
  });

  describe('ImageBitmap Resource Hygiene (DEFECT-44-03)', () => {
    it('should call close() on ImageBitmap after rendering to prevent GPU leaks', async () => {
      const closeSpy = vi.fn();
      const mockBitmap = {
        width: 100,
        height: 100,
        close: closeSpy,
      };

      const originalCreateBitmap = (globalThis as any).createImageBitmap;
      (globalThis as any).createImageBitmap = vi.fn().mockResolvedValue(mockBitmap);

      try {
        const item = await convertSingleImage(SAMPLE_PNG_FILE, DEFAULT_CONVERTER_OPTIONS);
        expect(item.status).toBe('done');
        expect(closeSpy).toHaveBeenCalledOnce();
      } finally {
        (globalThis as any).createImageBitmap = originalCreateBitmap;
      }
    });
  });

  describe('Batch Statistics Calculation', () => {
    it('should correctly calculate batch stats for empty queue', () => {
      const stats = calculateBatchStats([]);
      expect(stats.totalFiles).toBe(0);
      expect(stats.completedFiles).toBe(0);
      expect(stats.failedFiles).toBe(0);
      expect(stats.savingsPercentage).toBe(0);
    });

    it('should aggregate converted sizes and savings percentage', () => {
      const queue: ConvertedImageItem[] = [
        {
          id: '1',
          originalFile: SAMPLE_HEIC_FILE,
          originalName: '1.heic',
          originalSize: 1000,
          originalMimeType: 'image/heic',
          convertedSize: 600,
          status: 'done',
        },
        {
          id: '2',
          originalFile: SAMPLE_AVIF_FILE,
          originalName: '2.avif',
          originalSize: 2000,
          originalMimeType: 'image/avif',
          convertedSize: 1400,
          status: 'done',
        },
        {
          id: '3',
          originalFile: SAMPLE_PNG_FILE,
          originalName: '3.png',
          originalSize: 500,
          originalMimeType: 'image/png',
          status: 'error',
          errorMessage: 'Corrupt file',
        },
      ];

      const stats = calculateBatchStats(queue);
      expect(stats.totalFiles).toBe(3);
      expect(stats.completedFiles).toBe(2);
      expect(stats.failedFiles).toBe(1);
      expect(stats.totalOriginalSize).toBe(3500);
      expect(stats.totalConvertedSize).toBe(2000);
      expect(stats.savedBytes).toBe(1000); // 3000 (done original) - 2000 (done converted) = 1000
      expect(stats.savingsPercentage).toBeCloseTo(33.33, 1);
    });
  });

  describe('Single File & Batch Conversion Execution', () => {
    it('should convert single image item and return valid blob', async () => {
      const item = await convertSingleImage(SAMPLE_HEIC_FILE, DEFAULT_CONVERTER_OPTIONS);
      expect(item.status).toBe('done');
      expect(item.convertedBlob).toBeDefined();
      expect(item.convertedBlob?.size).toBeGreaterThan(0);
      expect(item.convertedName).toBe('IMG_20241019_001.jpg');
      expect(item.convertedMimeType).toBe('image/jpeg');
    });

    it('should package multiple items into a valid JSZip archive', async () => {
      const item1 = await convertSingleImage(SAMPLE_HEIC_FILE, DEFAULT_CONVERTER_OPTIONS);
      const item2 = await convertSingleImage(SAMPLE_AVIF_FILE, DEFAULT_CONVERTER_OPTIONS);

      const zipBlob = await packageBatchAsZip([item1, item2]);
      expect(zipBlob).toBeDefined();
      expect(zipBlob.type).toBe('application/zip');
      expect(zipBlob.size).toBeGreaterThan(0);
    });

    it('should process batch of single file returning standalone image deliverable', async () => {
      const result = await processBatch([SAMPLE_HEIC_FILE], DEFAULT_CONVERTER_OPTIONS);
      expect(result.success).toBe(true);
      expect(result.fileName).toBe('IMG_20241019_001.jpg');
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.blob.size).toBeGreaterThan(0);
      expect(result.metadata?.totalImages).toBe(1);
    });

    it('should process batch with packageAsZip returning zip deliverable', async () => {
      const result = await processBatch(
        [SAMPLE_HEIC_FILE, SAMPLE_AVIF_FILE],
        { ...DEFAULT_CONVERTER_OPTIONS, packageAsZip: true }
      );
      expect(result.success).toBe(true);
      expect(result.fileName.endsWith('.zip')).toBe(true);
      expect(result.mimeType).toBe('application/zip');
      expect(result.blob.size).toBeGreaterThan(0);
      expect(result.metadata?.totalImages).toBe(2);
    });
  });
});
