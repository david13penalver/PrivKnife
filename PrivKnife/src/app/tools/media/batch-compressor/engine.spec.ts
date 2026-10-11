import { describe, expect, it } from 'vitest';
import {
  calculateBatchStats,
  calculateTargetDimensions,
  createBatchZip,
  formatBytes,
  getNewFileName,
  processBatchImages,
  resolveTargetMimeType,
} from './engine';
import { createMockImageFile, DEFAULT_COMPRESSION_OPTIONS } from './test-fixtures';
import { ImageQueueItem } from './types';

describe('BatchCompressorEngine (Seam 1: Dimensions, Encoding, Batch Queue & ZIP)', () => {
  describe('calculateTargetDimensions', () => {
    it('should keep original dimensions when resize preset is none', () => {
      const dims = calculateTargetDimensions(3840, 2160, {
        ...DEFAULT_COMPRESSION_OPTIONS,
        resizePreset: 'none',
      });
      expect(dims.width).toBe(3840);
      expect(dims.height).toBe(2160);
    });

    it('should scale down preserving aspect ratio when image exceeds max preset', () => {
      const dims = calculateTargetDimensions(4000, 2000, {
        ...DEFAULT_COMPRESSION_OPTIONS,
        resizePreset: '1920',
      });
      expect(dims.width).toBe(1920);
      expect(dims.height).toBe(960);
    });

    it('should scale portrait images using the larger dimension', () => {
      const dims = calculateTargetDimensions(1000, 3000, {
        ...DEFAULT_COMPRESSION_OPTIONS,
        resizePreset: '1280',
      });
      expect(dims.height).toBe(1280);
      expect(dims.width).toBeCloseTo(427, 0);
    });

    it('should never upscale images smaller than the preset', () => {
      const dims = calculateTargetDimensions(800, 600, {
        ...DEFAULT_COMPRESSION_OPTIONS,
        resizePreset: '1920',
      });
      expect(dims.width).toBe(800);
      expect(dims.height).toBe(600);
    });
  });

  describe('resolveTargetMimeType & getNewFileName', () => {
    it('should resolve correct target MIME types', () => {
      expect(resolveTargetMimeType('webp', 'image/png')).toBe('image/webp');
      expect(resolveTargetMimeType('jpeg', 'image/png')).toBe('image/jpeg');
      expect(resolveTargetMimeType('png', 'image/jpeg')).toBe('image/png');
      expect(resolveTargetMimeType('original', 'image/png')).toBe('image/png');
    });

    it('should generate appropriate output file extensions', () => {
      expect(getNewFileName('vacation.jpg', 'webp')).toBe('vacation.webp');
      expect(getNewFileName('screenshot.PNG', 'webp')).toBe('screenshot.webp');
      expect(getNewFileName('graphic.webp', 'jpeg')).toBe('graphic.jpg');
      expect(getNewFileName('logo.svg', 'png')).toBe('logo.png');
      expect(getNewFileName('banner.png', 'original')).toBe('banner.png');
    });
  });

  describe('formatBytes', () => {
    it('should format byte amounts accurately with appropriate units', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(512)).toBe('512 B');
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(2048 * 1024)).toBe('2.0 MB');
    });
  });

  describe('calculateBatchStats', () => {
    it('should calculate total original, compressed, and percentage savings accurately', () => {
      const mockItems: ImageQueueItem[] = [
        {
          id: '1',
          file: createMockImageFile('a.png', 'image/png', 1000),
          name: 'a.png',
          originalSize: 1000,
          originalWidth: 100,
          originalHeight: 100,
          originalMimeType: 'image/png',
          originalPreviewUrl: '',
          status: 'done',
          progress: 100,
          compressedSize: 400,
          savedBytes: 600,
          savingsPercent: 60,
        },
        {
          id: '2',
          file: createMockImageFile('b.png', 'image/png', 2000),
          name: 'b.png',
          originalSize: 2000,
          originalWidth: 100,
          originalHeight: 100,
          originalMimeType: 'image/png',
          originalPreviewUrl: '',
          status: 'done',
          progress: 100,
          compressedSize: 800,
          savedBytes: 1200,
          savingsPercent: 60,
        },
      ];

      const stats = calculateBatchStats(mockItems);
      expect(stats.totalFiles).toBe(2);
      expect(stats.processedFiles).toBe(2);
      expect(stats.totalOriginalBytes).toBe(3000);
      expect(stats.totalCompressedBytes).toBe(1200);
      expect(stats.totalSavedBytes).toBe(1800);
      expect(stats.totalSavingsPercent).toBe(60);
    });
  });

  describe('createBatchZip', () => {
    it('should compile an in-memory ZIP Blob containing all compressed images', async () => {
      const file1 = new Blob(['sample-compressed-webp-data-1'], { type: 'image/webp' });
      const file2 = new Blob(['sample-compressed-webp-data-2'], { type: 'image/webp' });

      const zipBlob = await createBatchZip([
        { name: 'photo-1.webp', blob: file1 },
        { name: 'photo-2.webp', blob: file2 },
      ]);

      expect(zipBlob).toBeInstanceOf(Blob);
      expect(zipBlob.size).toBeGreaterThan(0);
    });
  });

  describe('processBatchImages', () => {
    it('should process queue items with concurrency throttling and progress callbacks', async () => {
      const mockItems: ImageQueueItem[] = [
        {
          id: '1',
          file: createMockImageFile('photo-1.jpg', 'image/jpeg', 5000),
          name: 'photo-1.jpg',
          originalSize: 5000,
          originalWidth: 800,
          originalHeight: 600,
          originalMimeType: 'image/jpeg',
          originalPreviewUrl: '',
          status: 'queued',
          progress: 0,
        },
        {
          id: '2',
          file: createMockImageFile('photo-2.jpg', 'image/jpeg', 8000),
          name: 'photo-2.jpg',
          originalSize: 8000,
          originalWidth: 1200,
          originalHeight: 800,
          originalMimeType: 'image/jpeg',
          originalPreviewUrl: '',
          status: 'queued',
          progress: 0,
        },
      ];

      let progressCount = 0;
      const results = await processBatchImages(
        mockItems,
        DEFAULT_COMPRESSION_OPTIONS,
        (processed, total) => {
          progressCount = processed;
        }
      );

      expect(results.length).toBe(2);
      expect(progressCount).toBe(2);
      expect(results[0].status).toBe('done');
      expect(results[1].status).toBe('done');
      expect(results[0].compressedBlob).toBeDefined();
    });
  });
});
