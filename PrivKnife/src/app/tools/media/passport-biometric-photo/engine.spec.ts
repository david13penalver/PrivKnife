import { describe, it, expect } from 'vitest';
import {
  validatePassportOptions,
  calculatePassportMetrics,
  renderPassportSheet,
  exportPassportPDF,
  processPassportPhoto,
} from './engine';
import {
  DEFAULT_PASSPORT_OPTIONS,
  MINIMAL_PASSPORT_OPTIONS,
  MAXIMUM_PASSPORT_OPTIONS,
  DUMMY_PORTRAIT_DATA_URL,
} from './test-fixtures';
import { CountryPreset, PrintSheetSize } from './types';

describe('Passport, Visa & ID Biometric Photo Maker Engine (Seam 1)', () => {
  describe('Parameter Validation & Guardrails', () => {
    it('should validate default options successfully', () => {
      const result = validatePassportOptions(DEFAULT_PASSPORT_OPTIONS);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject null or undefined options', () => {
      expect(validatePassportOptions(null as any).valid).toBe(false);
      expect(validatePassportOptions(undefined as any).valid).toBe(false);
    });

    it('should enforce export DPI boundaries [150, 600]', () => {
      expect(validatePassportOptions({ ...DEFAULT_PASSPORT_OPTIONS, exportDpi: 100 }).valid).toBe(false);
      expect(validatePassportOptions({ ...DEFAULT_PASSPORT_OPTIONS, exportDpi: 800 }).valid).toBe(false);
    });

    it('should enforce zoom level boundaries [0.5, 3.0]', () => {
      expect(validatePassportOptions({ ...DEFAULT_PASSPORT_OPTIONS, zoomLevel: 0.3 }).valid).toBe(false);
      expect(validatePassportOptions({ ...DEFAULT_PASSPORT_OPTIONS, zoomLevel: 3.5 }).valid).toBe(false);
    });

    it('should enforce tilt angle boundaries [-15°, +15°]', () => {
      expect(validatePassportOptions({ ...DEFAULT_PASSPORT_OPTIONS, tiltAngleDeg: -20 }).valid).toBe(false);
      expect(validatePassportOptions({ ...DEFAULT_PASSPORT_OPTIONS, tiltAngleDeg: 25 }).valid).toBe(false);
    });

    it('should enforce brightness boundaries [-50, +50]', () => {
      expect(validatePassportOptions({ ...DEFAULT_PASSPORT_OPTIONS, brightness: -60 }).valid).toBe(false);
      expect(validatePassportOptions({ ...DEFAULT_PASSPORT_OPTIONS, brightness: 70 }).valid).toBe(false);
    });

    it('should enforce contrast boundaries [-50, +50]', () => {
      expect(validatePassportOptions({ ...DEFAULT_PASSPORT_OPTIONS, contrast: -70 }).valid).toBe(false);
      expect(validatePassportOptions({ ...DEFAULT_PASSPORT_OPTIONS, contrast: 80 }).valid).toBe(false);
    });
  });

  describe('Biometric Specifications & Metrics Calculations', () => {
    it('should calculate metrics for US 2x2 inch on 4x6 inch sheet', () => {
      const metrics = calculatePassportMetrics(DEFAULT_PASSPORT_OPTIONS);
      expect(metrics.photoWidthMm).toBeCloseTo(50.8, 1);
      expect(metrics.photoHeightMm).toBeCloseTo(50.8, 1);
      expect(metrics.photoWidthPx).toBe(600);
      expect(metrics.photoHeightPx).toBe(600);
      expect(metrics.sheetWidthMm).toBeCloseTo(152.4, 1);
      expect(metrics.sheetHeightMm).toBeCloseTo(101.6, 1);
      expect(metrics.photosPerSheet).toBe(4); // 2 columns x 2 rows
      expect(metrics.complianceNotes.length).toBeGreaterThan(0);
    });

    it('should calculate metrics for EU Schengen 35x45mm on 4x6 inch sheet', () => {
      const metrics = calculatePassportMetrics({
        ...DEFAULT_PASSPORT_OPTIONS,
        countryPreset: 'eu_schengen_35x45mm',
      });
      expect(metrics.photoWidthMm).toBe(35.0);
      expect(metrics.photoHeightMm).toBe(45.0);
      expect(metrics.photoWidthPx).toBe(413);
      expect(metrics.photoHeightPx).toBe(531);
      expect(metrics.photosPerSheet).toBe(6); // 3 columns x 2 rows
    });

    it('should calculate metrics for single digital photo', () => {
      const metrics = calculatePassportMetrics({
        ...DEFAULT_PASSPORT_OPTIONS,
        printSheetSize: 'single_digital',
      });
      expect(metrics.photosPerSheet).toBe(1);
      expect(metrics.sheetWidthMm).toBe(metrics.photoWidthMm);
      expect(metrics.sheetHeightMm).toBe(metrics.photoHeightMm);
    });

    it('should support all standard country presets without throwing', () => {
      const presets: CountryPreset[] = [
        'us_2x2_inch',
        'eu_schengen_35x45mm',
        'uk_35x45mm',
        'canada_50x70mm',
        'japan_30x40mm',
        'china_33x48mm',
      ];

      for (const preset of presets) {
        const metrics = calculatePassportMetrics({
          ...DEFAULT_PASSPORT_OPTIONS,
          countryPreset: preset,
        });
        expect(metrics.photoWidthMm).toBeGreaterThan(0);
        expect(metrics.photoHeightMm).toBeGreaterThan(0);
      }
    });

    it('should support all print sheet sizes without throwing', () => {
      const sheetSizes: PrintSheetSize[] = ['4x6_inches', 'a4', 'a6', 'single_digital'];
      for (const sheet of sheetSizes) {
        const metrics = calculatePassportMetrics({
          ...DEFAULT_PASSPORT_OPTIONS,
          printSheetSize: sheet,
        });
        expect(metrics.sheetWidthMm).toBeGreaterThan(0);
        expect(metrics.sheetHeightMm).toBeGreaterThan(0);
        expect(metrics.photosPerSheet).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Canvas Composition & Image Rendering', () => {
    it('should render passport sheet to canvas and produce valid image blob', async () => {
      const { canvas, metrics } = await renderPassportSheet(
        DUMMY_PORTRAIT_DATA_URL,
        DEFAULT_PASSPORT_OPTIONS
      );

      expect(canvas).toBeDefined();
      expect(canvas.width).toBeGreaterThan(0);
      expect(canvas.height).toBeGreaterThan(0);
      expect(metrics.photosPerSheet).toBe(4);
    });

    it('should render single digital photo without throwing', async () => {
      const { canvas, metrics } = await renderPassportSheet(DUMMY_PORTRAIT_DATA_URL, {
        ...DEFAULT_PASSPORT_OPTIONS,
        printSheetSize: 'single_digital',
      });

      expect(canvas.width).toBe(600);
      expect(canvas.height).toBe(600);
      expect(metrics.photosPerSheet).toBe(1);
    });
  });

  describe('Deliverable Export Serialization (JPG, PDF, PNG)', () => {
    it('should export print-ready PDF using jsPDF', async () => {
      const { canvas, metrics } = await renderPassportSheet(
        DUMMY_PORTRAIT_DATA_URL,
        DEFAULT_PASSPORT_OPTIONS
      );
      const pdfBlob = await exportPassportPDF(canvas, metrics);

      expect(pdfBlob).toBeInstanceOf(Blob);
      expect(pdfBlob.type).toBe('application/pdf');
      expect(pdfBlob.size).toBeGreaterThan(100);
    });

    it('should execute end-to-end processPassportPhoto for JPG export', async () => {
      const result = await processPassportPhoto(
        DUMMY_PORTRAIT_DATA_URL,
        DEFAULT_PASSPORT_OPTIONS,
        'jpg'
      );
      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.fileName).toMatch(/\.jpg$/);
      expect(result.fileSize).toBeGreaterThan(0);
    });

    it('should execute end-to-end processPassportPhoto for PNG export', async () => {
      const result = await processPassportPhoto(
        DUMMY_PORTRAIT_DATA_URL,
        DEFAULT_PASSPORT_OPTIONS,
        'png'
      );
      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('image/png');
      expect(result.fileName).toMatch(/\.png$/);
      expect(result.fileSize).toBeGreaterThan(0);
    });

    it('should execute end-to-end processPassportPhoto for PDF export', async () => {
      const result = await processPassportPhoto(
        DUMMY_PORTRAIT_DATA_URL,
        DEFAULT_PASSPORT_OPTIONS,
        'pdf'
      );
      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('application/pdf');
      expect(result.fileName).toMatch(/\.pdf$/);
      expect(result.fileSize).toBeGreaterThan(0);
    });
  });
});
