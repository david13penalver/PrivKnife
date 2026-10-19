import { describe, it, expect } from 'vitest';
import {
  validateNutritionOptions,
  calculateDailyValues,
  generateNutritionLabelSvg,
  processNutritionLabel,
} from './engine';
import {
  DEFAULT_FDA_OPTIONS,
  DUAL_COLUMN_OPTIONS,
  EU_1169_OPTIONS,
  INVALID_CALORIES_OPTIONS,
  INVALID_EMPTY_SERVING_OPTIONS,
  SUPPLEMENT_FACTS_OPTIONS,
} from './test-fixtures';

describe('NutritionLabelMaker Engine (Seam 1)', () => {
  describe('validateNutritionOptions', () => {
    it('should validate valid default FDA options', () => {
      const res = validateNutritionOptions(DEFAULT_FDA_OPTIONS);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('should reject negative calories', () => {
      const res = validateNutritionOptions(INVALID_CALORIES_OPTIONS);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/calories cannot be negative/i);
    });

    it('should reject empty serving size text', () => {
      const res = validateNutritionOptions(INVALID_EMPTY_SERVING_OPTIONS);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/serving size is required/i);
    });

    it('should reject negative nutrient amounts', () => {
      const res = validateNutritionOptions({
        ...DEFAULT_FDA_OPTIONS,
        totalFatG: -5,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/nutrient amounts cannot be negative/i);
    });
  });

  describe('calculateDailyValues', () => {
    it('should compute exact regulatory Daily Value percentages', () => {
      const dvs = calculateDailyValues(DEFAULT_FDA_OPTIONS);

      // Total Fat: 8g / 78g = 10.25% -> 10%
      expect(dvs.totalFatDV).toBe(10);
      // Saturated Fat: 1g / 20g = 5%
      expect(dvs.saturatedFatDV).toBe(5);
      // Sodium: 160mg / 2300mg = 6.95% -> 7%
      expect(dvs.sodiumDV).toBe(7);
      // Total Carbs: 37g / 275g = 13.45% -> 13%
      expect(dvs.totalCarbsDV).toBe(13);
      // Dietary Fiber: 4g / 28g = 14.28% -> 14%
      expect(dvs.dietaryFiberDV).toBe(14);
      // Added Sugars: 10g / 50g = 20%
      expect(dvs.addedSugarsDV).toBe(20);
      // Vitamin D: 2mcg / 20mcg = 10%
      expect(dvs.vitaminDDV).toBe(10);
      // Calcium: 260mg / 1300mg = 20%
      expect(dvs.calciumDV).toBe(20);
      // Iron: 8mg / 18mg = 44%
      expect(dvs.ironDV).toBe(44);
      // Potassium: 240mg / 4700mg = 5.1% -> 5%
      expect(dvs.potassiumDV).toBe(5);
    });
  });

  describe('generateNutritionLabelSvg', () => {
    it('should generate valid FDA 2016 vector SVG panel', () => {
      const svg = generateNutritionLabelSvg(DEFAULT_FDA_OPTIONS);

      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('Nutrition Facts');
      expect(svg).toContain('Calories');
      expect(svg).toContain('230');
      expect(svg).toContain('% Daily Value*');
      expect(svg).toContain('2/3 cup (55g)');
      expect(svg).toContain('Total Fat');
      expect(svg).toContain('8g');
      expect(svg).toContain('Sodium');
      expect(svg).toContain('160mg');
      expect(svg).toContain('Daily Value (DV)');
    });

    it('should generate EU 1169 compliant table SVG', () => {
      const svg = generateNutritionLabelSvg(EU_1169_OPTIONS);

      expect(svg).toContain('<svg');
      expect(svg).toContain('Nutrition Declaration');
      expect(svg).toContain('Energy');
      expect(svg).toContain('kJ');
      expect(svg).toContain('kcal');
      expect(svg).toContain('Salt');
    });

    it('should generate Supplement Facts SVG panel', () => {
      const svg = generateNutritionLabelSvg(SUPPLEMENT_FACTS_OPTIONS);

      expect(svg).toContain('<svg');
      expect(svg).toContain('Supplement Facts');
      expect(svg).toContain('Serving Size 2 Capsules');
      expect(svg).toContain('Amount Per Serving');
    });

    it('should generate Dual Column FDA Nutrition Facts SVG', () => {
      const svg = generateNutritionLabelSvg(DUAL_COLUMN_OPTIONS);

      expect(svg).toContain('<svg');
      expect(svg).toContain('Per serving');
      expect(svg).toContain('Per container');
    });
  });

  describe('processNutritionLabel', () => {
    it('should export crisp vector SVG deliverable', async () => {
      const res = await processNutritionLabel({
        ...DEFAULT_FDA_OPTIONS,
        exportFormat: 'svg',
      });

      expect(res.success).toBe(true);
      expect(res.mimeType).toBe('image/svg+xml');
      expect(res.fileName).toMatch(/\.svg$/);
      expect(res.blob.size).toBeGreaterThan(500);
      expect(res.svgString).toContain('Nutrition Facts');
    });

    it('should export PDF deliverable with valid PDF header', async () => {
      const res = await processNutritionLabel({
        ...DEFAULT_FDA_OPTIONS,
        exportFormat: 'pdf',
      });

      expect(res.success).toBe(true);
      expect(res.mimeType).toBe('application/pdf');
      expect(res.fileName).toMatch(/\.pdf$/);
      expect(res.blob.size).toBeGreaterThan(1000);

      const buffer = await res.blob.arrayBuffer();
      const header = new TextDecoder().decode(new Uint8Array(buffer, 0, 5));
      expect(header).toBe('%PDF-');
    });

    it('should return error when options are invalid', async () => {
      const res = await processNutritionLabel(INVALID_CALORIES_OPTIONS);

      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.blob.size).toBe(0);
    });
  });
});
