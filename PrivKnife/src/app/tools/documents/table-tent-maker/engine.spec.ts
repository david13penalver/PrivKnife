import { describe, expect, it } from 'vitest';
import {
  calculateTentGeometry,
  generateQrDataUri,
  generateTableTentPdf,
  getPageDimensionsMm,
} from './engine';
import { DEFAULT_TENT_CONFIG } from './test-fixtures';
import { TableTentConfig } from './types';

describe('TableTentEngine (Seam 1: Geometry Calculations, QR Rendering & PDF Output)', () => {
  describe('getPageDimensionsMm', () => {
    it('should return correct millimeters for A4 portrait and landscape', () => {
      const portrait = getPageDimensionsMm('a4', 'portrait');
      expect(portrait.width).toBe(210);
      expect(portrait.height).toBe(297);

      const landscape = getPageDimensionsMm('a4', 'landscape');
      expect(landscape.width).toBe(297);
      expect(landscape.height).toBe(210);
    });

    it('should return correct millimeters for US Letter portrait and landscape', () => {
      const portrait = getPageDimensionsMm('letter', 'portrait');
      expect(portrait.width).toBeCloseTo(215.9, 1);
      expect(portrait.height).toBeCloseTo(279.4, 1);

      const landscape = getPageDimensionsMm('letter', 'landscape');
      expect(landscape.width).toBeCloseTo(279.4, 1);
      expect(landscape.height).toBeCloseTo(215.9, 1);
    });
  });

  describe('calculateTentGeometry', () => {
    it('should calculate bi-fold geometry splitting the sheet into 2 equal panels with 1 fold line', () => {
      const config: TableTentConfig = {
        ...DEFAULT_TENT_CONFIG,
        paperFormat: 'a4',
        orientation: 'portrait',
        foldType: 'bi-fold',
      };

      const geo = calculateTentGeometry(config);
      expect(geo.pageWidthMm).toBe(210);
      expect(geo.pageHeightMm).toBe(297);
      expect(geo.panels.length).toBe(2);

      // Panel 0: Face A (Inverted 180°)
      expect(geo.panels[0].index).toBe(0);
      expect(geo.panels[0].rotationDeg).toBe(180);
      expect(geo.panels[0].yMm).toBe(0);
      expect(geo.panels[0].heightMm).toBeCloseTo(148.5, 1);

      // Panel 1: Face B (Upright 0°)
      expect(geo.panels[1].index).toBe(1);
      expect(geo.panels[1].rotationDeg).toBe(0);
      expect(geo.panels[1].yMm).toBeCloseTo(148.5, 1);
      expect(geo.panels[1].heightMm).toBeCloseTo(148.5, 1);

      // Fold lines
      expect(geo.foldLines.length).toBe(1);
      expect(geo.foldLines[0].yMm).toBeCloseTo(148.5, 1);
    });

    it('should calculate tri-fold geometry with Face A, Face B, and a Base Flap with 2 fold lines', () => {
      const config: TableTentConfig = {
        ...DEFAULT_TENT_CONFIG,
        paperFormat: 'a4',
        orientation: 'portrait',
        foldType: 'tri-fold',
      };

      const geo = calculateTentGeometry(config);
      expect(geo.panels.length).toBe(3);

      // Face A (Inverted 180°)
      expect(geo.panels[0].rotationDeg).toBe(180);
      expect(geo.panels[0].isBaseFlap).toBeFalsy();

      // Face B (Upright 0°)
      expect(geo.panels[1].rotationDeg).toBe(0);
      expect(geo.panels[1].isBaseFlap).toBeFalsy();

      // Base Flap (Upright 0°)
      expect(geo.panels[2].isBaseFlap).toBe(true);

      expect(geo.foldLines.length).toBe(2);
      expect(geo.foldLines[0].yMm).toBeLessThan(geo.foldLines[1].yMm);
    });
  });

  describe('generateQrDataUri', () => {
    it('should render a valid QR Code PNG data URI', async () => {
      const dataUri = await generateQrDataUri('https://privknife.com/menu');
      expect(dataUri).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('generateTableTentPdf', () => {
    it('should compile a valid vector PDF for bi-fold table tent', async () => {
      const result = await generateTableTentPdf(DEFAULT_TENT_CONFIG);

      expect(result).toBeDefined();
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob.type).toBe('application/pdf');
      expect(result.buffer.byteLength).toBeGreaterThan(1000);
      expect(result.dataUri).toContain('data:application/pdf');
    });

    it('should compile a valid vector PDF for tri-fold with base flap and fold marks', async () => {
      const config: TableTentConfig = {
        ...DEFAULT_TENT_CONFIG,
        foldType: 'tri-fold',
        showFoldLines: true,
        showCutMarks: true,
      };

      const result = await generateTableTentPdf(config);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.buffer.byteLength).toBeGreaterThan(1000);
    });

    it('should handle unmirrored independent front and back panels', async () => {
      const config: TableTentConfig = {
        ...DEFAULT_TENT_CONFIG,
        mirrorPanels: false,
        frontPanel: {
          title: 'Happy Hour Specials',
          subtitle: '4PM - 7PM Daily',
          body: '$5 Craft Beers & Half-Price Wings',
        },
        backPanel: {
          title: 'Guest Wi-Fi Access',
          subtitle: 'High Speed Fiber',
          body: 'Password: Cheers2026',
          qrUrl: 'WIFI:S:Guest;P:Cheers2026;;',
        },
      };

      const result = await generateTableTentPdf(config);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.buffer.byteLength).toBeGreaterThan(1000);
    });
  });
});
