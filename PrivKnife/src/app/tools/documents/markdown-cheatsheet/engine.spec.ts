import { describe, expect, it } from 'vitest';
import {
  exportCheatsheetPdfBlob,
  generateCheatsheetPdf,
  generateCheatsheetPreviewHtml,
  renderMarkdownToHtml,
} from './engine';
import {
  DEFAULT_CHEATSHEET_CONFIG,
  GIT_CHEATSHEET_CONFIG,
  JAVASCRIPT_CHEATSHEET_CONFIG,
  MALICIOUS_MARKDOWN,
} from './test-fixtures';

describe('Markdown Cheatsheet Engine (engine.ts)', () => {
  describe('Markdown Parser & Sanitizer (renderMarkdownToHtml)', () => {
    it('should parse markdown elements into valid HTML', () => {
      const html = renderMarkdownToHtml(DEFAULT_CHEATSHEET_CONFIG.markdownContent);

      expect(html).toContain('<h2>Core Data Structures</h2>');
      expect(html).toContain('<pre><code');
      expect(html).toContain('<table>');
      expect(html).toContain('>Data Structure</th>');
      expect(html).toContain('<blockquote>');
      expect(html).toContain('<strong>Pro Tip</strong>');
    });

    it('should sanitize dangerous HTML and script injections', () => {
      const html = renderMarkdownToHtml(MALICIOUS_MARKDOWN);

      expect(html).not.toContain('<script>');
      expect(html).not.toContain('onerror');
      expect(html).not.toContain('javascript:alert');
    });
  });

  describe('Multi-Column Preview HTML (generateCheatsheetPreviewHtml)', () => {
    it('should generate preview HTML with correct column styles and accent colors', () => {
      const previewHtml = generateCheatsheetPreviewHtml(DEFAULT_CHEATSHEET_CONFIG);

      expect(previewHtml).toContain('column-count: 2');
      expect(previewHtml).toContain('Python 3 &amp; Algorithms Quick Reference');
      expect(previewHtml).toContain('Essential data structures');
      expect(previewHtml).toContain(DEFAULT_CHEATSHEET_CONFIG.accentColor);
      expect(previewHtml).toContain('PrivKnife'); // footer
    });

    it('should support 3 columns and landscape orientation in preview', () => {
      const previewHtml = generateCheatsheetPreviewHtml(GIT_CHEATSHEET_CONFIG);

      expect(previewHtml).toContain('column-count: 3');
      expect(previewHtml).toContain('Git &amp; Terminal CLI Cheatsheet');
      expect(previewHtml).toContain('#059669');
    });

    it('should omit footer when includeFooter is false', () => {
      const previewHtml = generateCheatsheetPreviewHtml(JAVASCRIPT_CHEATSHEET_CONFIG);

      expect(previewHtml).not.toContain('Generated with PrivKnife');
    });
  });

  describe('Vector jsPDF Engine (generateCheatsheetPdf)', () => {
    it('should generate a valid jsPDF instance for A4 portrait', () => {
      const pdf = generateCheatsheetPdf(DEFAULT_CHEATSHEET_CONFIG);

      expect(pdf).toBeDefined();
      expect(pdf.internal.pageSize.getWidth()).toBeCloseTo(210, 0); // A4 width mm
      expect(pdf.internal.pageSize.getHeight()).toBeCloseTo(297, 0); // A4 height mm
      expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    });

    it('should generate a valid jsPDF instance for Letter landscape', () => {
      const pdf = generateCheatsheetPdf(GIT_CHEATSHEET_CONFIG);

      expect(pdf).toBeDefined();
      // Letter landscape: 279.4 x 215.9 mm
      expect(pdf.internal.pageSize.getWidth()).toBeCloseTo(279.4, 0);
      expect(pdf.internal.pageSize.getHeight()).toBeCloseTo(215.9, 0);
    });
  });

  describe('PDF Blob Exporter (exportCheatsheetPdfBlob)', () => {
    it('should export a non-empty application/pdf Blob', async () => {
      const blob = exportCheatsheetPdfBlob(DEFAULT_CHEATSHEET_CONFIG);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(500);
    });
  });
});
