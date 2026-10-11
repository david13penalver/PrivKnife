import { describe, expect, it } from 'vitest';
import {
  calculateLabelPositions,
  generateBarcodeDataUri,
  generateLabelSheetPdf,
  generateSequenceItems,
  getPresetTemplate,
  parseCsvItems,
} from './engine';
import { AVERY_5160, AVERY_5163, DEFAULT_SHEET_CONFIG } from './test-fixtures';

describe('BarcodeLabelEngine (Seam 1: Barcode Rendering, Grid Calculations & PDF Output)', () => {
  describe('getPresetTemplate', () => {
    it('should retrieve standard Avery templates by id', () => {
      const t5160 = getPresetTemplate('avery-5160');
      expect(t5160.columns).toBe(3);
      expect(t5160.rows).toBe(10);
      expect(t5160.paperFormat).toBe('letter');

      const t5163 = getPresetTemplate('avery-5163');
      expect(t5163.columns).toBe(2);
      expect(t5163.rows).toBe(5);
    });

    it('should fallback to Avery 5160 if id is unknown', () => {
      const fallback = getPresetTemplate('non-existent');
      expect(fallback.id).toBe('avery-5160');
    });
  });

  describe('calculateLabelPositions', () => {
    it('should calculate exact millimeter coordinates for Avery 5160 (3x10 grid)', () => {
      const positions = calculateLabelPositions(AVERY_5160);
      expect(positions.length).toBe(30);

      // Label 0 (top-left)
      expect(positions[0].row).toBe(0);
      expect(positions[0].col).toBe(0);
      expect(positions[0].xMm).toBeCloseTo(AVERY_5160.marginLeftMm, 2);
      expect(positions[0].yMm).toBeCloseTo(AVERY_5160.marginTopMm, 2);

      // Label 1 (row 0, col 1)
      expect(positions[1].row).toBe(0);
      expect(positions[1].col).toBe(1);
      expect(positions[1].xMm).toBeCloseTo(
        AVERY_5160.marginLeftMm + AVERY_5160.pitchHorizontalMm,
        2
      );

      // Label 3 (row 1, col 0)
      expect(positions[3].row).toBe(1);
      expect(positions[3].col).toBe(0);
      expect(positions[3].yMm).toBeCloseTo(
        AVERY_5160.marginTopMm + AVERY_5160.pitchVerticalMm,
        2
      );
    });

    it('should calculate positions for Avery 5163 (2x5 grid)', () => {
      const positions = calculateLabelPositions(AVERY_5163);
      expect(positions.length).toBe(10);
    });
  });

  describe('generateSequenceItems', () => {
    it('should generate formatted sequential items with zero padding', () => {
      const items = generateSequenceItems('SKU-', 1, 3, 4, '-US');
      expect(items.length).toBe(3);
      expect(items[0].value).toBe('SKU-0001-US');
      expect(items[1].value).toBe('SKU-0002-US');
      expect(items[2].value).toBe('SKU-0003-US');
    });
  });

  describe('parseCsvItems', () => {
    it('should parse valid CSV text with value, title, and subtext columns', () => {
      const csv = `Title,SKU,Price\nWidget A,SKU-100,$10.00\nWidget B,SKU-101,$15.50`;
      const items = parseCsvItems(csv);
      expect(items.length).toBe(2);
      expect(items[0].value).toBe('SKU-100');
      expect(items[0].title).toBe('Widget A');
      expect(items[0].subtext).toBe('$10.00');
    });

    it('should parse simple list of barcode values', () => {
      const list = `ITEM-1\nITEM-2\nITEM-3`;
      const items = parseCsvItems(list);
      expect(items.length).toBe(3);
      expect(items[0].value).toBe('ITEM-1');
    });
  });

  describe('generateBarcodeDataUri', () => {
    it('should render a valid Code128 barcode data URI', async () => {
      const dataUri = await generateBarcodeDataUri('SKU-9901', 'CODE128');
      expect(dataUri).toBeDefined();
      expect(dataUri).toMatch(/^data:image\/(png|svg\+xml);base64/);
    });

    it('should render a valid QR Code data URI', async () => {
      const qrUri = await generateBarcodeDataUri('https://privknife.com', 'QR');
      expect(qrUri).toBeDefined();
      expect(qrUri).toContain('data:image/png;base64');
    });

    it('should render Code39 barcodes', async () => {
      const c39Uri = await generateBarcodeDataUri('CODE39TEST', 'CODE39');
      expect(c39Uri).toBeDefined();
      expect(c39Uri).toContain('data:image/');
    });
  });

  describe('generateLabelSheetPdf', () => {
    it('should compile a valid vector PDF sheet for Avery 5160', async () => {
      const result = await generateLabelSheetPdf(DEFAULT_SHEET_CONFIG);
      expect(result).toBeDefined();
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob.type).toBe('application/pdf');
      expect(result.buffer.byteLength).toBeGreaterThan(100);

      const header = new TextDecoder().decode(result.buffer.slice(0, 5));
      expect(header).toBe('%PDF-');
    });

    it('should compile PDF sheet with starting index offset without crashing', async () => {
      const offsetConfig = {
        ...DEFAULT_SHEET_CONFIG,
        startOffsetIndex: 5, // skip first 5 labels
      };

      const result = await generateLabelSheetPdf(offsetConfig);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.buffer.byteLength).toBeGreaterThan(100);
    });
  });
});
