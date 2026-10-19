import { describe, it, expect } from 'vitest';
import {
  calculateBatchStats,
  calculateResizedDimensions,
  convertSingleImage,
  generateOutputFilename,
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
