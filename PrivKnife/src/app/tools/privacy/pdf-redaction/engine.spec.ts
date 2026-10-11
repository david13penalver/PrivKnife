import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { burnRedactions, loadPdfForRedaction } from './engine';
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

  it('should burn opaque blackout and whiteout boxes over confidential coordinates', async () => {
    const buffer = await createSensitiveTestPdfBuffer();

    const redactions = [
      {
        pageIndex: 0,
        boxes: [
          // Blackout over SSN
          {
            id: 'box-1',
            x: 45,
            y: 690,
            width: 250,
            height: 25,
            color: 'black' as const,
          },
          // Whiteout over Salary
          {
            id: 'box-2',
            x: 45,
            y: 650,
            width: 200,
            height: 25,
            color: 'white' as const,
          },
        ],
      },
    ];

    const sanitizedBytes = await burnRedactions(buffer, redactions, { stripMetadata: true });
    expect(sanitizedBytes).toBeInstanceOf(Uint8Array);
    expect(sanitizedBytes.length).toBeGreaterThan(0);

    // Verify output structure and metadata stripping
    const sanitizedPdf = await PDFDocument.load(sanitizedBytes);
    expect(sanitizedPdf.getPageCount()).toBe(1);
    expect(sanitizedPdf.getTitle() || '').toBe('');
    expect(sanitizedPdf.getAuthor() || '').toBe('');
    // Original producer 'IRS Tax Form Generator' was purged
    expect(sanitizedPdf.getProducer()).not.toContain('IRS');
  });
});
