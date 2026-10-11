import { describe, expect, it } from 'vitest';
import {
  calculateGridGeometry,
  createDefaultOptions,
  generatePaperPdf,
  generatePaperSvg,
  getPaperDimensionsMm,
} from './engine';
import {
  DEFAULT_GRID_PAPER_OPTIONS,
  ENGINEERING_GRAPH_OPTIONS,
  HEXAGONAL_GRID_OPTIONS,
  ISOMETRIC_GRID_OPTIONS,
  RULED_PAPER_OPTIONS,
} from './test-fixtures';

describe('GridPaperEngine (Seam 1: Geometry, SVG & jsPDF Vector Output)', () => {
  describe('getPaperDimensionsMm', () => {
    it('should return exact millimeter dimensions for standard paper sizes in portrait and landscape', () => {
      // A4
      const a4Portrait = getPaperDimensionsMm('a4', 'portrait');
      expect(a4Portrait.width).toBe(210);
      expect(a4Portrait.height).toBe(297);

      const a4Landscape = getPaperDimensionsMm('a4', 'landscape');
      expect(a4Landscape.width).toBe(297);
      expect(a4Landscape.height).toBe(210);

      // Letter
      const letter = getPaperDimensionsMm('letter', 'portrait');
      expect(letter.width).toBeCloseTo(215.9, 1);
      expect(letter.height).toBeCloseTo(279.4, 1);

      // A5
      const a5 = getPaperDimensionsMm('a5', 'portrait');
      expect(a5.width).toBe(148);
      expect(a5.height).toBe(210);

      // Custom
      const custom = getPaperDimensionsMm('custom', 'portrait', { width: 180, height: 250 });
      expect(custom.width).toBe(180);
      expect(custom.height).toBe(250);
    });
  });

  describe('calculateGridGeometry', () => {
    it('should compute dot grid with all coordinates strictly contained within margins', () => {
      const geometry = calculateGridGeometry(DEFAULT_GRID_PAPER_OPTIONS);

      expect(geometry.dots.length).toBeGreaterThan(0);
      expect(geometry.printableWidth).toBe(
        210 - DEFAULT_GRID_PAPER_OPTIONS.marginLeft - DEFAULT_GRID_PAPER_OPTIONS.marginRight
      );
      expect(geometry.printableHeight).toBe(
        297 - DEFAULT_GRID_PAPER_OPTIONS.marginTop - DEFAULT_GRID_PAPER_OPTIONS.marginBottom
      );

      for (const dot of geometry.dots) {
        expect(dot.x).toBeGreaterThanOrEqual(DEFAULT_GRID_PAPER_OPTIONS.marginLeft - 0.001);
        expect(dot.x).toBeLessThanOrEqual(210 - DEFAULT_GRID_PAPER_OPTIONS.marginRight + 0.001);
        expect(dot.y).toBeGreaterThanOrEqual(DEFAULT_GRID_PAPER_OPTIONS.marginTop - 0.001);
        expect(dot.y).toBeLessThanOrEqual(297 - DEFAULT_GRID_PAPER_OPTIONS.marginBottom + 0.001);
      }
    });

    it('should compute square graph with horizontal/vertical lines and major line flags', () => {
      const geometry = calculateGridGeometry(ENGINEERING_GRAPH_OPTIONS);

      expect(geometry.lines.length).toBeGreaterThan(0);
      const majorLines = geometry.lines.filter((l) => l.isMajor);
      expect(majorLines.length).toBeGreaterThan(0);

      for (const line of geometry.lines) {
        expect(line.x1).toBeGreaterThanOrEqual(ENGINEERING_GRAPH_OPTIONS.marginLeft - 0.001);
        expect(line.x2).toBeLessThanOrEqual(210 - ENGINEERING_GRAPH_OPTIONS.marginRight + 0.001);
        expect(line.y1).toBeGreaterThanOrEqual(ENGINEERING_GRAPH_OPTIONS.marginTop - 0.001);
        expect(line.y2).toBeLessThanOrEqual(297 - ENGINEERING_GRAPH_OPTIONS.marginBottom + 0.001);
      }
    });

    it('should compute isometric lines intersecting at proper angles within bounds', () => {
      const geometry = calculateGridGeometry(ISOMETRIC_GRID_OPTIONS);
      expect(geometry.lines.length).toBeGreaterThan(0);

      // Verify lines do not exceed paper bounds
      for (const line of geometry.lines) {
        expect(line.x1).toBeGreaterThanOrEqual(ISOMETRIC_GRID_OPTIONS.marginLeft - 0.01);
        expect(line.x2).toBeLessThanOrEqual(geometry.paperWidthMm - ISOMETRIC_GRID_OPTIONS.marginRight + 0.01);
        expect(line.y1).toBeGreaterThanOrEqual(ISOMETRIC_GRID_OPTIONS.marginTop - 0.01);
        expect(line.y2).toBeLessThanOrEqual(geometry.paperHeightMm - ISOMETRIC_GRID_OPTIONS.marginBottom + 0.01);
      }
    });

    it('should compute hexagonal tessellation lines within bounds', () => {
      const geometry = calculateGridGeometry(HEXAGONAL_GRID_OPTIONS);
      expect(geometry.lines.length).toBeGreaterThan(0);
    });

    it('should compute ruled paper with horizontal lines and margin guide line', () => {
      const geometry = calculateGridGeometry(RULED_PAPER_OPTIONS);
      expect(geometry.lines.length).toBeGreaterThan(0);

      // Ruled paper should have horizontal lines
      const horizontalLines = geometry.lines.filter((l) => Math.abs(l.y1 - l.y2) < 0.001);
      expect(horizontalLines.length).toBeGreaterThan(0);

      // Margin line should be vertical
      const verticalLines = geometry.lines.filter((l) => Math.abs(l.x1 - l.x2) < 0.001);
      expect(verticalLines.length).toBeGreaterThan(0);
    });
  });

  describe('generatePaperSvg', () => {
    it('should generate valid SVG string with correct viewBox and elements for dot grid', () => {
      const svg = generatePaperSvg(DEFAULT_GRID_PAPER_OPTIONS);
      expect(svg).toContain('<svg');
      expect(svg).toContain('viewBox="0 0 210 297"');
      expect(svg).toContain('<circle');
      expect(svg).toContain('</svg>');
    });

    it('should generate valid SVG for engineering graph paper with line elements', () => {
      const svg = generatePaperSvg(ENGINEERING_GRAPH_OPTIONS);
      expect(svg).toContain('<svg');
      expect(svg).toContain('<line');
      expect(svg).toContain('stroke="rgba(2, 132, 199, 0.6)"');
    });
  });

  describe('generatePaperPdf', () => {
    it('should generate a valid vector PDF blob for dot grid paper', async () => {
      const result = await generatePaperPdf(DEFAULT_GRID_PAPER_OPTIONS);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob.type).toBe('application/pdf');
      expect(result.buffer.byteLength).toBeGreaterThan(100);

      const header = new TextDecoder().decode(result.buffer.slice(0, 5));
      expect(header).toBe('%PDF-');
    });

    it('should generate a valid vector PDF for square graph with major lines', async () => {
      const result = await generatePaperPdf(ENGINEERING_GRAPH_OPTIONS);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.buffer.byteLength).toBeGreaterThan(100);

      const header = new TextDecoder().decode(result.buffer.slice(0, 5));
      expect(header).toBe('%PDF-');
    });

    it('should generate a valid vector PDF for isometric grid and ruled paper', async () => {
      const isoResult = await generatePaperPdf(ISOMETRIC_GRID_OPTIONS);
      expect(isoResult.blob).toBeInstanceOf(Blob);

      const ruledResult = await generatePaperPdf(RULED_PAPER_OPTIONS);
      expect(ruledResult.blob).toBeInstanceOf(Blob);
    });
  });

  describe('createDefaultOptions', () => {
    it('should return valid initial options matching defaults', () => {
      const options = createDefaultOptions();
      expect(options.gridStyle).toBe('dot');
      expect(options.paperSize).toBe('a4');
      expect(options.spacing).toBe(5);
    });
  });
});
