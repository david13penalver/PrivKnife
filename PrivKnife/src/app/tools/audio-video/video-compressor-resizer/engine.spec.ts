import { describe, it, expect } from 'vitest';
import {
  validateVideoOptions,
  calculateVideoBitrateAndBudget,
  calculateCropAndDimensions,
  generateCompressionPlan,
  processVideoCompressor,
} from './engine';
import {
  CUSTOM_PORTRAIT_OPTIONS,
  DEFAULT_VIDEO_COMPRESS_OPTIONS,
  INVALID_CUSTOM_SIZE_OPTIONS,
  INVALID_ZERO_DURATION_OPTIONS,
  SQUARE_MUTED_WEBM_OPTIONS,
  TIKTOK_REELS_OPTIONS,
} from './test-fixtures';

describe('VideoCompressorResizer Engine (Seam 1)', () => {
  describe('validateVideoOptions', () => {
    it('should validate valid default options', () => {
      const res = validateVideoOptions(DEFAULT_VIDEO_COMPRESS_OPTIONS);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('should reject non-positive duration', () => {
      const res = validateVideoOptions(INVALID_ZERO_DURATION_OPTIONS);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/duration must be greater than zero/i);
    });

    it('should reject invalid custom size when custom_mb preset is chosen', () => {
      const res = validateVideoOptions(INVALID_CUSTOM_SIZE_OPTIONS);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/custom target size must be greater than zero/i);
    });

    it('should reject non-positive source dimensions', () => {
      const res = validateVideoOptions({
        ...DEFAULT_VIDEO_COMPRESS_OPTIONS,
        sourceWidth: 0,
        sourceHeight: 1080,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/dimensions must be greater than zero/i);
    });
  });

  describe('calculateVideoBitrateAndBudget', () => {
    it('should calculate bitrate for Discord 8MB target with 5% safety margin', () => {
      const durationSec = 45;
      const targetMb = 8;
      const budget = calculateVideoBitrateAndBudget(targetMb, durationSec, false);

      expect(budget.targetSizeBytes).toBe(8 * 1024 * 1024);
      // Expected total bits ~ 8 * 8 * 1024 * 1024 * 0.95 = 63,753,420 bits
      // Per sec total ~ 1,416,742 bps (~1416 kbps)
      // Minus 96 kbps audio ~ 1320 kbps
      expect(budget.videoBitrateBps).toBeGreaterThan(1000000);
      expect(budget.videoBitrateBps).toBeLessThan(1500000);
      expect(budget.audioBitrateBps).toBe(96000);
    });

    it('should allocate 100% of bit budget to video when audio is muted', () => {
      const durationSec = 45;
      const targetMb = 8;
      const unmuted = calculateVideoBitrateAndBudget(targetMb, durationSec, false);
      const muted = calculateVideoBitrateAndBudget(targetMb, durationSec, true);

      expect(muted.audioBitrateBps).toBe(0);
      expect(muted.videoBitrateBps).toBeGreaterThan(unmuted.videoBitrateBps);
      expect(muted.videoBitrateBps).toBe(muted.totalBitrateBps);
    });

    it('should clamp to minimum acceptable bitrate on long videos with tiny target size', () => {
      const durationSec = 3600; // 1 hour
      const targetMb = 5; // 5 MB
      const budget = calculateVideoBitrateAndBudget(targetMb, durationSec, false);

      expect(budget.videoBitrateBps).toBeGreaterThanOrEqual(150000); // min 150 kbps
    });
  });

  describe('calculateCropAndDimensions', () => {
    it('should maintain even integer dimensions for original aspect ratio', () => {
      const dims = calculateCropAndDimensions(1920, 1080, 'original', '720p');

      expect(dims.targetWidth % 2).toBe(0);
      expect(dims.targetHeight % 2).toBe(0);
      expect(dims.targetHeight).toBe(720);
      expect(dims.targetWidth).toBe(1280);
      expect(dims.cropX).toBe(0);
      expect(dims.cropY).toBe(0);
      expect(dims.cropWidth).toBe(1920);
      expect(dims.cropHeight).toBe(1080);
    });

    it('should compute centered 9:16 vertical crop for TikTok / Reels', () => {
      const dims = calculateCropAndDimensions(1920, 1080, '9:16_vertical', '1080p');

      // In 1920x1080 landscape: crop height is 1080, crop width is 1080 * 9 / 16 = 607.5 -> 606 (even)
      expect(dims.cropWidth % 2).toBe(0);
      expect(dims.cropHeight).toBe(1080);
      expect(dims.cropX).toBeGreaterThan(0); // centered horizontally
      expect(dims.cropY).toBe(0);
      expect(dims.targetWidth % 2).toBe(0);
      expect(dims.targetHeight % 2).toBe(0);
      expect(dims.targetHeight).toBe(1080);
    });

    it('should compute centered 1:1 square crop', () => {
      const dims = calculateCropAndDimensions(1920, 1080, '1:1_square', '480p');

      expect(dims.cropHeight).toBe(1080);
      expect(dims.cropWidth).toBe(1080);
      expect(dims.cropX).toBe((1920 - 1080) / 2);
      expect(dims.cropY).toBe(0);
      expect(dims.targetWidth).toBe(480);
      expect(dims.targetHeight).toBe(480);
    });

    it('should compute centered 4:5 portrait crop for Instagram', () => {
      const dims = calculateCropAndDimensions(1920, 1080, '4:5_portrait', '720p');

      expect(dims.cropWidth % 2).toBe(0);
      expect(dims.cropHeight % 2).toBe(0);
      expect(dims.cropX).toBeGreaterThan(0);
      expect(dims.targetWidth % 2).toBe(0);
      expect(dims.targetHeight % 2).toBe(0);
    });
  });

  describe('generateCompressionPlan', () => {
    it('should build a complete compression plan', () => {
      const plan = generateCompressionPlan(DEFAULT_VIDEO_COMPRESS_OPTIONS);

      expect(plan.targetSizeBytes).toBe(8 * 1024 * 1024);
      expect(plan.targetWidth).toBe(1280);
      expect(plan.targetHeight).toBe(720);
      expect(plan.estimatedOutputMb).toBeCloseTo(8, 0);
      expect(plan.resolutionLabel).toContain('1280x720');
    });
  });

  describe('processVideoCompressor', () => {
    it('should process default options and produce a valid MP4 compressed deliverable', async () => {
      const result = await processVideoCompressor(DEFAULT_VIDEO_COMPRESS_OPTIONS);

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('video/mp4');
      expect(result.fileName).toMatch(/\.mp4$/);
      expect(result.blob.size).toBeGreaterThan(0);
      expect(result.metadata?.durationSec).toBe(45);
      expect(result.metadata?.dimensions).toBe('1280x720');
      expect(result.metadata?.audioMuted).toBe(false);
      expect(result.metadata?.format).toBe('mp4');
    });

    it('should process TikTok 9:16 vertical video', async () => {
      const result = await processVideoCompressor(TIKTOK_REELS_OPTIONS);

      expect(result.success).toBe(true);
      expect(result.metadata?.aspectRatio).toBe('9:16_vertical');
      expect(result.fileName).toMatch(/\.mp4$/);
    });

    it('should process muted square WebM video', async () => {
      const result = await processVideoCompressor(SQUARE_MUTED_WEBM_OPTIONS);

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('video/webm');
      expect(result.fileName).toMatch(/\.webm$/);
      expect(result.metadata?.audioMuted).toBe(true);
      expect(result.metadata?.format).toBe('webm');
    });

    it('should process custom portrait video', async () => {
      const result = await processVideoCompressor(CUSTOM_PORTRAIT_OPTIONS);

      expect(result.success).toBe(true);
      expect(result.metadata?.aspectRatio).toBe('4:5_portrait');
    });

    it('should return error when options are invalid', async () => {
      const result = await processVideoCompressor(INVALID_ZERO_DURATION_OPTIONS);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.blob.size).toBe(0);
    });
  });
});
