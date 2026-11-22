import { describe, expect, it } from 'vitest';
import {
  flattenPdfPages,
  loadPdfForRedaction,
  renderPagePreview,
  sanitizePdf,
} from './engine';
import { createSensitiveTestPdfBuffer } from './test-fixtures';

describe('RedactionEngine (Seam 1: Pure PDF Redaction Burning & Sanitization)', () => {
  it('should load and inspect sensitive PDF extracting dimensions and page info', async () => {
    const buffer = await createSensitiveTestPdfBuffer();
    const doc = await loadPdfForRedaction(buffer, 'w2-form.pdf');

    expect(doc.name).toBe('w2-form.pdf');
    expect(doc.pageCount).toBe(1);
    expect(doc.pages).toHaveLength(1);
    expect(doc.pages[0].width).toBe(600);
    expect(doc.pages[0].height).toBe(800);
  });

  it('rejects a sanitized export when raster rendering fails', async () => {
    const buffer = await createSensitiveTestPdfBuffer();
    await expect(flattenPdfPages(buffer, [{
      pageIndex: 0,
      boxes: [{ id: 'full', x: 0, y: 0, width: 600, height: 800, color: 'black' }],
    }])).rejects.toThrow();
  });

  it('rejects attempts to export overlay-only redactions', async () => {
    const buffer = await createSensitiveTestPdfBuffer();
    await expect(sanitizePdf(buffer, [], { flattenRaster: false })).rejects.toThrow();
  });

  it('should safely execute renderPagePreview returning undefined or data URL in headless environment', async () => {
    const buffer = await createSensitiveTestPdfBuffer();
    const preview = await renderPagePreview(buffer, 0, 300);
    expect(preview === undefined || preview.url.startsWith('data:image/png')).toBe(true);
  });
});
