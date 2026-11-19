import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  buildHtmlDiffReport,
  buildPagePairs,
  buildPdfDiffReport,
  compareExtractedDocuments,
  comparePdfDocuments,
  computeVisualPixelDiff,
  computeWordTextDiff,
  escapeHtml,
  reconstructLinesFromTextItems,
} from './engine';
import {
  createContractPdfPair,
  createCorruptPdfBytes,
  createNonPdfBytes,
  createSyntheticRgbaFrame,
  createTextPagesPdf,
  DEFAULT_COMPARE_OPTIONS,
} from './test-fixtures';
import { PdfVisualCompareResult } from './types';

describe('Visual PDF Comparison & Overlay Diff Engine (Seam 1)', () => {
  describe('Slice 1: YIQ Pixel Diff, Page Pairing, Spatial Text Reconstruction, Myers Diff & XSS Escaping', () => {
    it('detects identical frames cleanly, colors removed/added regions in crimson/emerald, handles size mismatches, and respects sensitivity', () => {
      const base = createSyntheticRgbaFrame(100, 100, [
        { x: 10, y: 10, w: 20, h: 20, r: 0, g: 0, b: 0 },
      ]);

      const identical = computeVisualPixelDiff(base, base, {
        pixelSensitivity: 0.15,
        overlayStyle: 'overlay',
      });
      expect(identical.changedPixels).toBe(0);
      expect(identical.visualChangePercent).toBe(0);
      expect(identical.dimensionMismatch).toBe(false);
      expect(identical.clusters).toEqual([]);

      // Frame B adds a dark block at (50, 50) -> emerald (5, 150, 105)
      // and removes the dark block at (10, 10) -> crimson (220, 38, 38)
      const modified = createSyntheticRgbaFrame(100, 100, [
        { x: 50, y: 50, w: 20, h: 20, r: 0, g: 0, b: 0 },
      ]);
      const diff = computeVisualPixelDiff(base, modified, {
        pixelSensitivity: 0.15,
        overlayStyle: 'overlay',
      });
      expect(diff.changedPixels).toBe(800);
      expect(diff.visualChangePercent).toBeCloseTo(8, 2);
      expect(diff.clusters.length).toBeGreaterThanOrEqual(2);

      const removedIdx = (15 * 100 + 15) * 4;
      expect(diff.rgba[removedIdx]).toBe(220);
      expect(diff.rgba[removedIdx + 1]).toBe(38);

      const addedIdx = (55 * 100 + 55) * 4;
      expect(diff.rgba[addedIdx]).toBe(5);
      expect(diff.rgba[addedIdx + 1]).toBe(150);

      // Dimension mismatch normalization (100x100 vs 120x100)
      const wider = createSyntheticRgbaFrame(120, 100, [
        { x: 10, y: 10, w: 20, h: 20, r: 0, g: 0, b: 0 },
      ]);
      const mismatched = computeVisualPixelDiff(base, wider, {
        pixelSensitivity: 0.15,
        overlayStyle: 'overlay',
      });
      expect(mismatched.width).toBe(120);
      expect(mismatched.height).toBe(100);
      expect(mismatched.dimensionMismatch).toBe(true);
      expect(mismatched.changedPixels).toBe(0);

      // Perceptual sensitivity threshold check: rgb(235,235,235) vs rgb(255,255,255) (~7.8%)
      const white = createSyntheticRgbaFrame(40, 40);
      const subtle = createSyntheticRgbaFrame(40, 40, [
        { x: 5, y: 5, w: 10, h: 10, r: 235, g: 235, b: 235 },
      ]);
      expect(
        computeVisualPixelDiff(white, subtle, {
          pixelSensitivity: 0.05,
          overlayStyle: 'overlay',
        }).changedPixels
      ).toBe(100);
      expect(
        computeVisualPixelDiff(white, subtle, {
          pixelSensitivity: 0.35,
          overlayStyle: 'overlay',
        }).changedPixels
      ).toBe(0);
    });

    it('aligns page pairs accurately across unequal lengths and positive/negative offsets', () => {
      expect(buildPagePairs(2, 3, 0)).toEqual([
        { pairIndex: 1, pageA: 1, pageB: 1 },
        { pairIndex: 2, pageA: 2, pageB: 2 },
        { pairIndex: 3, pageA: null, pageB: 3 },
      ]);

      expect(buildPagePairs(2, 3, 1)).toEqual([
        { pairIndex: 1, pageA: null, pageB: 1 },
        { pairIndex: 2, pageA: 1, pageB: 2 },
        { pairIndex: 3, pageA: 2, pageB: 3 },
      ]);

      expect(buildPagePairs(3, 2, -1)).toEqual([
        { pairIndex: 1, pageA: 1, pageB: null },
        { pairIndex: 2, pageA: 2, pageB: 1 },
        { pairIndex: 3, pageA: 3, pageB: 2 },
      ]);
    });

    it('reconstructs reading lines from spatial PDF text items top-to-bottom and left-to-right', () => {
      const reconstructed = reconstructLinesFromTextItems([
        { str: 'World', x: 110, y: 700 },
        { str: 'Line2', x: 50, y: 650 },
        { str: 'Hello', x: 50, y: 701 },
      ]);
      expect(reconstructed).toBe('Hello World\nLine2');
    });

    it('computes accurate word-level diffs with ignoreWhitespace/ignoreCase and safe large-text fallback', () => {
      const same = computeWordTextDiff('Clause A\n$1,000 USD', 'Clause   A  $1,000   USD', {
        ignoreWhitespace: true,
        ignoreCase: false,
      });
      expect(same.hasDiff).toBe(false);
      expect(same.additions).toBe(0);
      expect(same.deletions).toBe(0);

      const priceChange = computeWordTextDiff(
        'Total Fee: $1,000 USD',
        'Total Fee: $1,500 USD',
        { ignoreWhitespace: true, ignoreCase: false }
      );
      expect(priceChange.hasDiff).toBe(true);
      expect(priceChange.deletions).toBe(1);
      expect(priceChange.additions).toBe(1);
      expect(priceChange.tokens.some((t) => t.type === 'removed' && t.text === '$1,000')).toBe(
        true
      );
      expect(priceChange.tokens.some((t) => t.type === 'added' && t.text === '$1,500')).toBe(
        true
      );

      const caseInsensitive = computeWordTextDiff('CONFIDENTIAL', 'confidential', {
        ignoreWhitespace: true,
        ignoreCase: true,
      });
      expect(caseInsensitive.hasDiff).toBe(false);

      // Large input > 2500 words uses line fallback without crashing
      const bigA = Array.from({ length: 1600 }, (_, i) => `word${i}`).join(' ');
      const bigB = bigA + ' extraword';
      const bigDiff = computeWordTextDiff(bigA, bigB, {
        ignoreWhitespace: false,
        ignoreCase: false,
      });
      expect(bigDiff.hasDiff).toBe(true);
    });

    it('strictly escapes HTML/XSS payloads inside exported HTML diff reports', () => {
      expect(escapeHtml('<script>alert(1)</script> & "x"')).toBe(
        '&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;'
      );

      const maliciousResult: PdfVisualCompareResult = {
        success: true,
        fileNameA: '<img src=x onerror=alert(1)>.pdf',
        fileNameB: '<script>evil()</script>.pdf',
        totalPairs: 1,
        changedPageCount: 1,
        pagesA: 1,
        pagesB: 1,
        summaries: [
          {
            pairIndex: 1,
            pageA: 1,
            pageB: 1,
            hasVisualDiff: true,
            hasTextDiff: true,
            visualChangePercent: 2.5,
            textAdditions: 1,
            textDeletions: 0,
            dimensionMismatch: false,
            textTokens: [
              { type: 'added', text: '<script>alert(1)</script>' },
            ],
            clusters: [],
          },
        ],
      };

      const html = buildHtmlDiffReport(maliciousResult);
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    });
  });

  describe('Slice 2: Real PDF.js Contract Comparison, Mismatched Pages, PDF Report & Guards', () => {
    it('reports zero diffs when comparing identical multi-page PDFs (Test Vector 1)', async () => {
      const pdfBytes = await createTextPagesPdf([
        'Page 1 identical terms',
        'Page 2 identical clauses',
        'Page 3 identical signatures',
      ]);

      const res = await comparePdfDocuments(
        pdfBytes,
        pdfBytes,
        'a.pdf',
        'b.pdf',
        DEFAULT_COMPARE_OPTIONS
      );

      expect(res.success).toBe(true);
      expect(res.totalPairs).toBe(3);
      expect(res.changedPageCount).toBe(0);
      for (const s of res.summaries) {
        expect(s.visualChangePercent).toBe(0);
        expect(s.textAdditions).toBe(0);
        expect(s.textDeletions).toBe(0);
        expect(s.hasTextDiff).toBe(false);
      }
    });

    it('detects single price change on page 2 only in 3-page contract pair (Test Vector 2)', async () => {
      const { pdfA, pdfB } = await createContractPdfPair();
      const progressEvents: number[] = [];

      const res = await comparePdfDocuments(
        pdfA,
        pdfB,
        'contract-v1.pdf',
        'contract-v2.pdf',
        DEFAULT_COMPARE_OPTIONS,
        { onProgress: (pct) => progressEvents.push(pct) }
      );

      expect(res.success).toBe(true);
      expect(res.totalPairs).toBe(3);
      expect(res.changedPageCount).toBe(1);
      expect(progressEvents.at(-1)).toBe(100);

      expect(res.summaries[0].hasTextDiff).toBe(false);
      expect(res.summaries[1].hasTextDiff).toBe(true);
      expect(res.summaries[1].textAdditions).toBe(1);
      expect(res.summaries[1].textDeletions).toBe(1);
      expect(res.summaries[2].hasTextDiff).toBe(false);
    });

    it('handles unequal page counts cleanly and escapes XSS payloads in HTML + builds valid PDF report (Test Vectors 3 & 4)', async () => {
      const pdf2 = await createTextPagesPdf(['Cover page', 'Body clause']);
      const pdf3 = await createTextPagesPdf([
        'Cover page',
        'Body clause',
        'Appendix <script>alert(1)</script>',
      ]);

      const res = await comparePdfDocuments(
        pdf2,
        pdf3,
        'v1.pdf',
        'v2.pdf',
        DEFAULT_COMPARE_OPTIONS
      );

      expect(res.success).toBe(true);
      expect(res.totalPairs).toBe(3);
      expect(res.changedPageCount).toBe(1);
      expect(res.summaries[2].pageA).toBeNull();
      expect(res.summaries[2].pageB).toBe(3);
      expect(res.summaries[2].hasTextDiff).toBe(true);

      const html = buildHtmlDiffReport(res);
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');

      const pdfReport = await buildPdfDiffReport(res, true);
      expect(pdfReport.success).toBe(true);
      expect(pdfReport.bytes).toBeDefined();
      const reloaded = await PDFDocument.load(pdfReport.bytes!);
      expect(reloaded.getPageCount()).toBeGreaterThanOrEqual(1);
    });

    it('combines RGBA pixel diff + text diff via compareExtractedDocuments and rejects invalid inputs', () => {
      const frameA = createSyntheticRgbaFrame(80, 80);
      const frameB = createSyntheticRgbaFrame(80, 80, [
        { x: 10, y: 10, w: 20, h: 20, r: 0, g: 0, b: 0 },
      ]);

      const extracted = compareExtractedDocuments(
        'a.pdf',
        'b.pdf',
        [{ pageNumber: 1, widthPt: 80, heightPt: 80, text: 'Same', frame: frameA }],
        [{ pageNumber: 1, widthPt: 80, heightPt: 80, text: 'Same', frame: frameB }],
        DEFAULT_COMPARE_OPTIONS
      );
      expect(extracted.success).toBe(true);
      expect(extracted.changedPageCount).toBe(1);
      expect(extracted.summaries[0].hasVisualDiff).toBe(true);
      expect(extracted.summaries[0].hasTextDiff).toBe(false);
    });

    it('rejects empty, non-PDF, and corrupt buffers safely', async () => {
      const valid = await createTextPagesPdf(['OK']);

      const empty = await comparePdfDocuments(
        new Uint8Array(0),
        valid,
        'a.pdf',
        'b.pdf',
        DEFAULT_COMPARE_OPTIONS
      );
      expect(empty.success).toBe(false);
      expect(empty.errorCode).toBe('INVALID_INPUT');

      const nonPdf = await comparePdfDocuments(
        valid,
        createNonPdfBytes(),
        'a.pdf',
        'b.pdf',
        DEFAULT_COMPARE_OPTIONS
      );
      expect(nonPdf.success).toBe(false);
      expect(nonPdf.errorCode).toBe('INVALID_PDF');

      const corrupt = await comparePdfDocuments(
        createCorruptPdfBytes(),
        valid,
        'a.pdf',
        'b.pdf',
        DEFAULT_COMPARE_OPTIONS
      );
      expect(corrupt.success).toBe(false);
      expect(corrupt.errorCode).toBe('INVALID_PDF');
    });
  });
});
