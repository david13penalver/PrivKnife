import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
  assemblePdf,
  createSplitZip,
  loadPdfDocument,
  renderPageThumbnail,
  rotateAllPages,
  rotatePage,
  splitPdfIntoSinglePages,
} from './engine';
import { createTestPdfBuffer } from './test-fixtures';

describe('PdfEngine (Seam 1: Pure PDF Assembly, Reordering & Merging)', () => {
  it('should inspect and load a PDF document extracting pages and dimensions', async () => {
    const buffer = await createTestPdfBuffer(2, 'Invoice');
    const loaded = await loadPdfDocument(buffer, 'invoice.pdf');

    expect(loaded.name).toBe('invoice.pdf');
    expect(loaded.pageCount).toBe(2);
    expect(loaded.pages).toHaveLength(2);
    expect(loaded.pages[0].displayPageNumber).toBe(1);
    expect(loaded.pages[0].rotation).toBe(0);
    expect(loaded.pages[0].width).toBeGreaterThan(0);
    expect(loaded.pages[0].height).toBeGreaterThan(0);
  });

  it('should rotate individual pages clockwise by 90 degrees', async () => {
    const buffer = await createTestPdfBuffer(1, 'Single');
    const loaded = await loadPdfDocument(buffer, 'single.pdf');

    const rotated90 = rotatePage(loaded.pages[0]);
    expect(rotated90.rotation).toBe(90);

    const rotated180 = rotatePage(rotated90);
    expect(rotated180.rotation).toBe(180);

    const rotated270 = rotatePage(rotated180);
    expect(rotated270.rotation).toBe(270);

    const rotated360 = rotatePage(rotated270);
    expect(rotated360.rotation).toBe(0);
  });

  it('should rotate all pages in bulk', async () => {
    const buffer = await createTestPdfBuffer(3, 'Multi');
    const loaded = await loadPdfDocument(buffer, 'multi.pdf');

    const rotated = rotateAllPages(loaded.pages);
    for (const page of rotated) {
      expect(page.rotation).toBe(90);
    }
  });

  it('should merge pages from multiple documents into a single compiled PDF', async () => {
    const doc1Buffer = await createTestPdfBuffer(2, 'Doc 1');
    const doc2Buffer = await createTestPdfBuffer(1, 'Doc 2');

    const doc1 = await loadPdfDocument(doc1Buffer, 'doc1.pdf');
    const doc2 = await loadPdfDocument(doc2Buffer, 'doc2.pdf');

    // Combine in custom order: doc2 page 1, doc1 page 2, doc1 page 1 (with rotation)
    const pageToRotate = rotatePage(doc1.pages[0]); // 90 deg
    const pagesToMerge = [doc2.pages[0], doc1.pages[1], pageToRotate];

    const sourceDocuments = new Map<string, ArrayBuffer>([
      [doc1.id, doc1.buffer],
      [doc2.id, doc2.buffer],
    ]);

    const compiledBytes = await assemblePdf(pagesToMerge, sourceDocuments);
    expect(compiledBytes).toBeInstanceOf(Uint8Array);
    expect(compiledBytes.length).toBeGreaterThan(0);

    // Verify compiled PDF structure with pdf-lib
    const verifiedPdf = await PDFDocument.load(compiledBytes);
    expect(verifiedPdf.getPageCount()).toBe(3);

    // Page 3 was rotated 90 degrees
    const lastPage = verifiedPdf.getPage(2);
    expect(lastPage.getRotation().angle).toBe(90);
  });

  it('should split document into separate individual PDF files', async () => {
    const buffer = await createTestPdfBuffer(3, 'SplitDoc');
    const doc = await loadPdfDocument(buffer, 'splitdoc.pdf');
    const sourceMap = new Map<string, ArrayBuffer>([[doc.id, doc.buffer]]);

    const splitResults = await splitPdfIntoSinglePages(doc.pages, sourceMap);
    expect(splitResults).toHaveLength(3);
    expect(splitResults[0].fileName).toBe('splitdoc-p1.pdf');
    expect(splitResults[1].fileName).toBe('splitdoc-p2.pdf');
    expect(splitResults[2].fileName).toBe('splitdoc-p3.pdf');

    // Verify each result is a valid 1-page PDF
    for (const item of splitResults) {
      const parsed = await PDFDocument.load(item.bytes);
      expect(parsed.getPageCount()).toBe(1);
    }
  });

  it('should bundle split PDFs into a valid .zip archive Blob', async () => {
    const buffer = await createTestPdfBuffer(2, 'ZipDoc');
    const doc = await loadPdfDocument(buffer, 'zipdoc.pdf');
    const sourceMap = new Map<string, ArrayBuffer>([[doc.id, doc.buffer]]);

    const splitResults = await splitPdfIntoSinglePages(doc.pages, sourceMap);
    const zipBlob = await createSplitZip(splitResults);

    expect(zipBlob).toBeInstanceOf(Blob);
    expect(zipBlob.size).toBeGreaterThan(0);
  });

  it('should handle renderPageThumbnail safely', async () => {
    const buffer = await createTestPdfBuffer(1, 'Thumb');
    const thumb = await renderPageThumbnail(buffer, 0);
    // In headless test environments without canvas 2D, returns undefined safely
    expect(thumb === undefined || typeof thumb === 'string').toBe(true);
  });
});
