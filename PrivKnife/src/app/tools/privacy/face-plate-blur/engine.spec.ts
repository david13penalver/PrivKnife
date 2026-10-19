import { describe, it, expect } from 'vitest';
import {
  applyBlackoutBox,
  applyMosaicPixelation,
  censorCanvasRegions,
  processPrivacyBlur,
  validateBlurOptions,
} from './engine';
import {
  DEFAULT_BLUR_OPTIONS,
  DUMMY_IMAGE_DATA_URL,
  MINIMAL_BLUR_OPTIONS,
  SAMPLE_BLUR_REGIONS,
} from './test-fixtures';

describe('Face & License Plate Privacy Blur Tool Engine (Seam 1)', () => {
  describe('Parameter Validation & Guardrails', () => {
    it('should validate default options successfully', () => {
      const res = validateBlurOptions(DEFAULT_BLUR_OPTIONS);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('should reject null or undefined options', () => {
      expect(validateBlurOptions(null as any).valid).toBe(false);
      expect(validateBlurOptions(undefined as any).valid).toBe(false);
    });

    it('should enforce mosaic block size boundaries [2, 100]', () => {
      expect(
        validateBlurOptions({ ...DEFAULT_BLUR_OPTIONS, mosaicBlockSize: 1 })
          .valid
      ).toBe(false);
      expect(
        validateBlurOptions({ ...DEFAULT_BLUR_OPTIONS, mosaicBlockSize: 150 })
          .valid
      ).toBe(false);
      expect(
        validateBlurOptions({ ...DEFAULT_BLUR_OPTIONS, mosaicBlockSize: 24 })
          .valid
      ).toBe(true);
    });

    it('should enforce blur radius boundaries [1, 100]', () => {
      expect(
        validateBlurOptions({ ...DEFAULT_BLUR_OPTIONS, blurRadiusPx: 0 })
          .valid
      ).toBe(false);
      expect(
        validateBlurOptions({ ...DEFAULT_BLUR_OPTIONS, blurRadiusPx: 120 })
          .valid
      ).toBe(false);
      expect(
        validateBlurOptions({ ...DEFAULT_BLUR_OPTIONS, blurRadiusPx: 16 })
          .valid
      ).toBe(true);
    });

    it('should enforce export quality boundaries [0.1, 1.0]', () => {
      expect(
        validateBlurOptions({ ...DEFAULT_BLUR_OPTIONS, exportQuality: 0.05 })
          .valid
      ).toBe(false);
      expect(
        validateBlurOptions({ ...DEFAULT_BLUR_OPTIONS, exportQuality: 1.1 })
          .valid
      ).toBe(false);
      expect(
        validateBlurOptions({ ...DEFAULT_BLUR_OPTIONS, exportQuality: 0.85 })
          .valid
      ).toBe(true);
    });
  });

  describe('Canvas Censor Algorithms (Mosaic, Blackout, Blur)', () => {
    it('should execute censorCanvasRegions without throwing', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 400;

      expect(() => {
        censorCanvasRegions(canvas, SAMPLE_BLUR_REGIONS, DEFAULT_BLUR_OPTIONS);
      }).not.toThrow();
    });

    it('should apply blackout box censor directly to 2D context', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        expect(() => {
          applyBlackoutBox(ctx, 10, 10, 50, 50);
        }).not.toThrow();
      }
    });

    it('should apply mosaic pixelation to 2D context', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        expect(() => {
          applyMosaicPixelation(ctx, 10, 10, 50, 50, 8);
        }).not.toThrow();
      }
    });
  });

  describe('Deliverable Export Serialization (JPG, PNG)', () => {
    it('should process image and produce sanitized JPEG deliverable', async () => {
      const options = {
        ...DEFAULT_BLUR_OPTIONS,
        regions: SAMPLE_BLUR_REGIONS,
        exportFormat: 'jpeg' as const,
      };

      const result = await processPrivacyBlur(
        DUMMY_IMAGE_DATA_URL,
        options,
        'license-plate.jpg'
      );

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('license-plate-sanitized.jpg');
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.blob.size).toBeGreaterThan(0);
      expect(result.metadata?.regionsCensored).toBe(2);
      expect(result.metadata?.exifStripped).toBe(true);
    });

    it('should process image and produce sanitized PNG deliverable', async () => {
      const options = {
        ...DEFAULT_BLUR_OPTIONS,
        regions: SAMPLE_BLUR_REGIONS,
        exportFormat: 'png' as const,
      };

      const result = await processPrivacyBlur(
        DUMMY_IMAGE_DATA_URL,
        options,
        'car-photo.png'
      );

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('car-photo-sanitized.png');
      expect(result.mimeType).toBe('image/png');
      expect(result.blob.size).toBeGreaterThan(0);
      expect(result.metadata?.regionsCensored).toBe(2);
    });

    it('should handle zero regions by stripping metadata and re-exporting image', async () => {
      const result = await processPrivacyBlur(
        DUMMY_IMAGE_DATA_URL,
        { ...DEFAULT_BLUR_OPTIONS, regions: [] },
        'avatar.jpg'
      );

      expect(result.success).toBe(true);
      expect(result.metadata?.regionsCensored).toBe(0);
      expect(result.metadata?.exifStripped).toBe(true);
    });
  });
});
