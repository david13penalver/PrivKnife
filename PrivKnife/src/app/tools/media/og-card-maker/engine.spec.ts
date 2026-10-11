import { describe, expect, it } from 'vitest';
import {
  exportCanvasBlob,
  generateOgMetaSnippet,
  renderOgCardToCanvas,
  wrapText,
} from './engine';
import {
  BLOG_OG_CONFIG,
  CODE_OG_CONFIG,
  DEFAULT_OG_CONFIG,
  STARTUP_OG_CONFIG,
} from './test-fixtures';

describe('OgCardEngine (Seam 1: Text Wrapping, Canvas Rendering & Meta Snippets)', () => {
  describe('wrapText', () => {
    it('should split text into lines without exceeding max lines', () => {
      // Mock 2D context measureText
      const mockCtx = {
        measureText: (text: string) => ({ width: text.length * 10 }),
      } as unknown as CanvasRenderingContext2D;

      const longText =
        'This is a comprehensive title about building ultra-private offline web utilities';
      const lines = wrapText(mockCtx, longText, 250, 3);

      expect(lines.length).toBeGreaterThan(1);
      expect(lines.length).toBeLessThanOrEqual(3);
    });

    it('should add ellipsis when text exceeds max lines', () => {
      const mockCtx = {
        measureText: (text: string) => ({ width: text.length * 10 }),
      } as unknown as CanvasRenderingContext2D;

      const veryLongText =
        'One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen';
      const lines = wrapText(mockCtx, veryLongText, 100, 2);

      expect(lines.length).toBe(2);
      expect(lines[1].endsWith('...')).toBe(true);
    });
  });

  describe('generateOgMetaSnippet', () => {
    it('should produce standard Open Graph and Twitter summary_large_image meta tags', () => {
      const snippet = generateOgMetaSnippet(
        DEFAULT_OG_CONFIG,
        'https://privknife.com/images/og-preview.png'
      );

      expect(snippet).toContain('<meta property="og:type" content="website">');
      expect(snippet).toContain(
        `<meta property="og:title" content="${DEFAULT_OG_CONFIG.title}">`
      );
      expect(snippet).toContain(
        `<meta property="og:description" content="${DEFAULT_OG_CONFIG.subtitle}">`
      );
      expect(snippet).toContain(
        '<meta property="og:image" content="https://privknife.com/images/og-preview.png">'
      );
      expect(snippet).toContain(
        '<meta name="twitter:card" content="summary_large_image">'
      );
      expect(snippet).toContain(
        `<meta name="twitter:title" content="${DEFAULT_OG_CONFIG.title}">`
      );
      expect(snippet).toContain(
        '<meta name="twitter:image" content="https://privknife.com/images/og-preview.png">'
      );
    });
  });

  describe('renderOgCardToCanvas', () => {
    it('should render modern-tech template without errors', async () => {
      const canvas = await renderOgCardToCanvas(DEFAULT_OG_CONFIG);
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(1200);
      expect(canvas.height).toBe(630);
    });

    it('should render article-blog template with reading time and author tag', async () => {
      const canvas = await renderOgCardToCanvas(BLOG_OG_CONFIG);
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(1200);
      expect(canvas.height).toBe(630);
    });

    it('should render product-hunt template with badge and radial highlight', async () => {
      const canvas = await renderOgCardToCanvas(STARTUP_OG_CONFIG);
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(1200);
      expect(canvas.height).toBe(630);
    });

    it('should render code-snippet template with terminal box mockup', async () => {
      const canvas = await renderOgCardToCanvas(CODE_OG_CONFIG);
      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(1200);
      expect(canvas.height).toBe(630);
    });
  });

  describe('exportCanvasBlob', () => {
    it('should export canvas as PNG blob', async () => {
      const canvas = await renderOgCardToCanvas(DEFAULT_OG_CONFIG);
      const pngBlob = await exportCanvasBlob(canvas, 'image/png');

      expect(pngBlob).toBeInstanceOf(Blob);
      expect(pngBlob.type).toBe('image/png');
      expect(pngBlob.size).toBeGreaterThan(0);
    });

    it('should export canvas as WebP blob', async () => {
      const canvas = await renderOgCardToCanvas(DEFAULT_OG_CONFIG);
      const webpBlob = await exportCanvasBlob(canvas, 'image/webp', 0.85);

      expect(webpBlob).toBeInstanceOf(Blob);
      expect(webpBlob.type).toBe('image/webp');
      expect(webpBlob.size).toBeGreaterThan(0);
    });
  });
});
