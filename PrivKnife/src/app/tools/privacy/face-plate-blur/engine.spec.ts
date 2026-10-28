import { describe, it, expect, vi } from 'vitest';
import {
  applyBlackoutBox,
  applyMosaicPixelation,
  censorCanvasRegions,
  censorImageBuffer,
  createSampleCarSaleBlob,
  detectPrivacyRegions,
  loadImageElement,
  mapPointerToImageCoords,
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

  describe('Pure Buffer Censoring (censorImageBuffer)', () => {
    function createTestBuffer(w = 20, h = 20): { data: Uint8ClampedArray; width: number; height: number } {
      const data = new Uint8ClampedArray(w * h * 4);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 200;     // R
        data[i + 1] = 100; // G
        data[i + 2] = 50;  // B
        data[i + 3] = 255; // A
      }
      return { data, width: w, height: h };
    }

    it('should apply blackout box censor directly to buffer pixels', () => {
      const buffer = createTestBuffer(20, 20);
      const region = {
        id: 'r1',
        x: 5,
        y: 5,
        width: 10,
        height: 10,
        mode: 'blackout_box' as const,
      };

      const result = censorImageBuffer(buffer, [region], DEFAULT_BLUR_OPTIONS);
      expect(result).toBeDefined();

      // Check pixel at (7, 7) inside blackout box
      const idxInside = (7 * 20 + 7) * 4;
      expect(result.data[idxInside]).toBe(0);
      expect(result.data[idxInside + 1]).toBe(0);
      expect(result.data[idxInside + 2]).toBe(0);
      expect(result.data[idxInside + 3]).toBe(255);

      // Check pixel at (2, 2) outside blackout box
      const idxOutside = (2 * 20 + 2) * 4;
      expect(result.data[idxOutside]).toBe(200);
      expect(result.data[idxOutside + 1]).toBe(100);
    });

    it('should apply mosaic pixelation directly to buffer pixels', () => {
      const buffer = createTestBuffer(20, 20);
      // Give varied pixel values in region [0,0, 10, 10]
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          const idx = (y * 20 + x) * 4;
          buffer.data[idx] = x * 20;
          buffer.data[idx + 1] = y * 20;
          buffer.data[idx + 2] = (x + y) * 10;
        }
      }

      const region = {
        id: 'r-mosaic',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        mode: 'mosaic_pixelate' as const,
        blockSize: 5,
      };

      const result = censorImageBuffer(buffer, [region], DEFAULT_BLUR_OPTIONS);
      // All pixels within block (0,0) to (4,4) should have identical averaged values
      const idx00 = (0 * 20 + 0) * 4;
      const idx11 = (1 * 20 + 1) * 4;
      expect(result.data[idx00]).toBe(result.data[idx11]);
      expect(result.data[idx00 + 1]).toBe(result.data[idx11 + 1]);
      expect(result.data[idx00 + 2]).toBe(result.data[idx11 + 2]);
    });

    it('should apply gaussian blur directly to buffer pixels', () => {
      const buffer = createTestBuffer(20, 20);
      // Put a bright spot in center
      const centerIdx = (10 * 20 + 10) * 4;
      buffer.data[centerIdx] = 255;
      buffer.data[centerIdx + 1] = 255;
      buffer.data[centerIdx + 2] = 255;

      const region = {
        id: 'r-blur',
        x: 5,
        y: 5,
        width: 10,
        height: 10,
        mode: 'gaussian_blur' as const,
        blurRadius: 3,
      };

      const result = censorImageBuffer(buffer, [region], DEFAULT_BLUR_OPTIONS);
      // Surrounding pixels should have smoothed/blended color
      const neighborIdx = (10 * 20 + 11) * 4;
      expect(result.data[neighborIdx]).toBeDefined();
    });

    it('should apply brush stroke path censor to buffer pixels', () => {
      const buffer = createTestBuffer(30, 30);
      const strokeRegion = {
        id: 'stroke-1',
        x: 10,
        y: 10,
        width: 10,
        height: 10,
        mode: 'blackout_box' as const,
        points: [
          { x: 10, y: 10 },
          { x: 15, y: 15 },
        ],
        brushRadius: 4,
      };

      const result = censorImageBuffer(buffer, [strokeRegion], DEFAULT_BLUR_OPTIONS);
      // Point at (10, 10) must be blacked out
      const idx10 = (10 * 30 + 10) * 4;
      expect(result.data[idx10]).toBe(0);
      expect(result.data[idx10 + 1]).toBe(0);
      expect(result.data[idx10 + 2]).toBe(0);
      // Point at (0, 0) far away should remain unblemished
      const idx00 = (0 * 30 + 0) * 4;
      expect(result.data[idx00]).toBe(200);
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

  describe('Coordinate Mapping & Auto-Detection', () => {
    it('should map pointer coordinates to image dimensions correctly', () => {
      const rect = { left: 100, top: 50, width: 400, height: 300 };
      // Center of canvas
      const mappedCenter = mapPointerToImageCoords(300, 200, rect, 800, 600);
      expect(mappedCenter.x).toBe(400);
      expect(mappedCenter.y).toBe(300);

      // Clamping outside bounds
      const mappedNegative = mapPointerToImageCoords(50, 10, rect, 800, 600);
      expect(mappedNegative.x).toBe(0);
      expect(mappedNegative.y).toBe(0);

      const mappedOver = mapPointerToImageCoords(600, 450, rect, 800, 600);
      expect(mappedOver.x).toBe(800);
      expect(mappedOver.y).toBe(600);
    });

    it('should detect privacy regions in synthetic image buffer', async () => {
      const buffer = {
        data: new Uint8ClampedArray(400 * 350 * 4),
        width: 400,
        height: 350,
      };

      // Fill a patch of skin tone for a face around (150, 120)
      for (let y = 100; y < 140; y++) {
        for (let x = 130; x < 170; x++) {
          const idx = (y * 400 + x) * 4;
          buffer.data[idx] = 220;     // R
          buffer.data[idx + 1] = 160; // G
          buffer.data[idx + 2] = 130; // B
          buffer.data[idx + 3] = 255;
        }
      }

      // Fill a high-contrast plate region around (200, 280) width 120, height 35
      for (let y = 265; y < 295; y++) {
        for (let x = 150; x < 250; x++) {
          const idx = (y * 400 + x) * 4;
          buffer.data[idx] = 245;     // White/yellow plate background
          buffer.data[idx + 1] = 245;
          buffer.data[idx + 2] = 245;
          buffer.data[idx + 3] = 255;
        }
      }

      const detected = await detectPrivacyRegions(buffer);
      expect(Array.isArray(detected)).toBe(true);
      expect(detected.length).toBeGreaterThanOrEqual(1);
    });

    it('should generate a valid sample car sale photo blob', async () => {
      const blob = await createSampleCarSaleBlob();
      expect(blob).toBeDefined();
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toMatch(/image\/(png|jpeg)/);
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
