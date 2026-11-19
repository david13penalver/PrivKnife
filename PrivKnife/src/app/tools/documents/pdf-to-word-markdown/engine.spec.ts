import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import {
  buildDocxPackage,
  buildMarkdown,
  buildSanitizedHtmlPreview,
  convertPdfToWordMarkdown,
  escapeXmlText,
  reconstructDocumentAst,
} from './engine';
import {
  createCorruptPdfBytes,
  createNonPdfBytes,
  createScannedBlankPdf,
  createStructuredSamplePdf,
  createThreePageRunningHeaderPdf,
  DEFAULT_PDF_TO_WORD_OPTIONS,
} from './test-fixtures';
import { DocumentBlock, PdfStyledSpan } from './types';

describe('PDF to Word (DOCX) & Markdown Layout Converter Engine (Seam 1)', () => {
  describe('Slice 1: XML Escaping, Typography AST, 2-Column Ordering, Markdown, DOMPurify & OOXML', () => {
    it('strips illegal XML control characters and escapes all 5 XML entities', () => {
      const sanitized = escapeXmlText('A & B < C > "D" \'E\'\u0000\u0007\u000B\u001F');
      expect(sanitized).toBe('A &amp; B &lt; C &gt; &quot;D&quot; &apos;E&apos;');
    });

    it('infers H1/H2/H3, paragraphs with dehyphenation, lists, running header strip, and 2-column order', () => {
      const bodyParagraph = (y: number, text: string, x = 48): PdfStyledSpan => ({
        text,
        x,
        y,
        width: Math.max(40, text.length * 5.2),
        height: 11,
        fontSize: 11,
        bold: false,
        italic: false,
        pageIndex: 0,
      });

      const spans: PdfStyledSpan[] = [
        {
          text: 'Document Title',
          x: 48,
          y: 770,
          width: 210,
          height: 24,
          fontSize: 24,
          bold: true,
          italic: false,
          pageIndex: 0,
        },
        {
          text: 'Section Heading',
          x: 48,
          y: 735,
          width: 140,
          height: 14,
          fontSize: 14,
          bold: true,
          italic: false,
          pageIndex: 0,
        },
        bodyParagraph(708, 'Systems keep confidential docu-'),
        bodyParagraph(694, 'ments inside local memory.'),
        bodyParagraph(664, '- Bullet item one', 56),
        bodyParagraph(648, '1. Ordered item one', 56),
      ];

      const blocks = reconstructDocumentAst(
        spans,
        [{ width: 595, height: 842 }],
        DEFAULT_PDF_TO_WORD_OPTIONS
      );

      expect(blocks[0]).toMatchObject({ type: 'heading', level: 1 });
      expect(blocks[1]).toMatchObject({ type: 'heading', level: 2 });
      expect(blocks[2].type).toBe('paragraph');
      const paraText =
        blocks[2].type === 'paragraph'
          ? blocks[2].runs.map((r) => r.text).join('')
          : '';
      expect(paraText).toContain('documents inside local memory.');
      expect(blocks[3]).toMatchObject({ type: 'list_item', ordered: false });
      expect(blocks[4]).toMatchObject({ type: 'list_item', ordered: true });

      // 2-column reading order check (Left column top-to-bottom BEFORE Right column)
      const twoColSpans: PdfStyledSpan[] = [
        { ...bodyParagraph(700, 'Left line 1', 48), width: 180 },
        { ...bodyParagraph(700, 'Right line 1', 330), width: 180 },
        { ...bodyParagraph(684, 'Left line 2', 48), width: 180 },
        { ...bodyParagraph(684, 'Right line 2', 330), width: 180 },
        { ...bodyParagraph(668, 'Left line 3', 48), width: 180 },
        { ...bodyParagraph(668, 'Right line 3', 330), width: 180 },
      ];
      const twoColBlocks = reconstructDocumentAst(
        twoColSpans,
        [{ width: 595, height: 842 }],
        DEFAULT_PDF_TO_WORD_OPTIONS
      );
      const twoColMd = buildMarkdown(twoColBlocks, true);
      expect(twoColMd.indexOf('Left line 3')).toBeLessThan(
        twoColMd.indexOf('Right line 1')
      );
    });

    it('serializes Markdown and neutralizes HTML XSS payloads safely via DOMPurify', () => {
      const blocks: DocumentBlock[] = [
        {
          type: 'heading',
          level: 1,
          runs: [{ text: 'Title & Security', bold: true, italic: false }],
          pageIndex: 0,
        },
        {
          type: 'paragraph',
          runs: [
            { text: 'Normal ', bold: false, italic: false },
            { text: 'bold', bold: true, italic: false },
            { text: ' ', bold: false, italic: false },
            { text: '<img src=x onerror=alert(1)>', bold: false, italic: true },
          ],
          pageIndex: 0,
        },
      ];

      const md = buildMarkdown(blocks, true);
      expect(md).toContain('# Title & Security');
      expect(md).toContain('**bold**');

      const safeHtml = buildSanitizedHtmlPreview(blocks);
      const parsed = new DOMParser().parseFromString(safeHtml, 'text/html');
      expect(parsed.querySelector('img')).toBeNull();
      expect(parsed.querySelector('script')).toBeNull();
      expect(safeHtml).not.toMatch(/<img\b/i);
      expect(safeHtml).toContain('&lt;img');
    });

    it('builds valid OOXML .docx ZIP with well-formed XML parsed cleanly by DOMParser', async () => {
      const blocks: DocumentBlock[] = [
        {
          type: 'heading',
          level: 1,
          runs: [{ text: 'Privacy Report A & B < C > "D"\u0007', bold: true, italic: false }],
          pageIndex: 0,
        },
        {
          type: 'paragraph',
          runs: [
            { text: 'Regular text and ', bold: false, italic: false },
            { text: 'italic text', bold: false, italic: true },
          ],
          pageIndex: 0,
        },
        {
          type: 'list_item',
          ordered: false,
          marker: '-',
          runs: [{ text: 'Bullet point', bold: false, italic: false }],
          pageIndex: 0,
        },
        { type: 'page_break', pageIndex: 0 },
      ];

      const pkg = await buildDocxPackage(blocks);
      const zip = await JSZip.loadAsync(pkg.bytes);

      expect(zip.file('[Content_Types].xml')).not.toBeNull();
      expect(zip.file('_rels/.rels')).not.toBeNull();
      expect(zip.file('word/_rels/document.xml.rels')).not.toBeNull();
      expect(zip.file('word/styles.xml')).not.toBeNull();
      expect(zip.file('word/numbering.xml')).not.toBeNull();

      const docXml = await zip.file('word/document.xml')!.async('string');
      expect(docXml).toContain('A &amp; B &lt; C &gt; &quot;D&quot;');

      const parsed = new DOMParser().parseFromString(docXml, 'application/xml');
      expect(parsed.querySelector('parsererror')).toBeNull();
    });
  });

  describe('Slice 2: Real PDF.js Typography Conversion, Running Header Strip & Scanned Guards', () => {
    it('converts structured PDF to OOXML .docx and GFM Markdown with headings, reflowed paragraph, lists, and XSS safety', async () => {
      const pdfBytes = await createStructuredSamplePdf();
      const progressEvents: number[] = [];

      const res = await convertPdfToWordMarkdown(
        pdfBytes,
        'architecture-report.pdf',
        DEFAULT_PDF_TO_WORD_OPTIONS,
        { onProgress: (pct) => progressEvents.push(pct) }
      );

      expect(res.success).toBe(true);
      expect(res.isScannedFallbackNeeded).toBe(false);
      expect(res.fileName).toBe('architecture-report.docx');
      expect(res.headingCount).toBeGreaterThanOrEqual(2);
      expect(res.wordCount).toBeGreaterThan(20);
      expect(progressEvents.at(-1)).toBe(100);

      expect(res.markdown).toContain('# Annual Privacy Architecture Report');
      expect(res.markdown).toContain('## Executive Summary');
      expect(res.markdown).toContain('confidential documents remain solely');
      expect(res.markdown).toContain('- End-to-end local browser execution');
      expect(res.markdown).toContain('1. Verify client-side containment');

      const htmlDoc = new DOMParser().parseFromString(res.sanitizedHtml, 'text/html');
      expect(htmlDoc.querySelector('img')).toBeNull();
      expect(res.sanitizedHtml).toContain('&lt;img');

      const zip = await JSZip.loadAsync(res.docxBytes!);
      const docXml = await zip.file('word/document.xml')!.async('string');
      const xmlDoc = new DOMParser().parseFromString(docXml, 'application/xml');
      expect(xmlDoc.querySelector('parsererror')).toBeNull();
    });

    it('strips repeated running headers and footers across multi-page PDFs when enabled', async () => {
      const threePageBytes = await createThreePageRunningHeaderPdf();

      const stripped = await convertPdfToWordMarkdown(
        threePageBytes,
        'book.pdf',
        { ...DEFAULT_PDF_TO_WORD_OPTIONS, stripHeadersFooters: true }
      );
      expect(stripped.success).toBe(true);
      expect(stripped.markdown).toContain('Chapter 1 Body Content Section');
      expect(stripped.markdown).not.toContain('Confidential Draft');
      expect(stripped.markdown).not.toContain('Page 1 of 3');

      const kept = await convertPdfToWordMarkdown(
        threePageBytes,
        'book.pdf',
        { ...DEFAULT_PDF_TO_WORD_OPTIONS, stripHeadersFooters: false }
      );
      expect(kept.markdown).toContain('Confidential Draft');
      expect(kept.markdown).toContain('Page 1 of 3');
    });

    it('detects scanned blank PDFs cleanly and rejects empty/non-PDF/corrupt buffers', async () => {
      const scannedBytes = await createScannedBlankPdf();
      const scanned = await convertPdfToWordMarkdown(
        scannedBytes,
        'scan.pdf',
        DEFAULT_PDF_TO_WORD_OPTIONS
      );
      expect(scanned.success).toBe(true);
      expect(scanned.isScannedFallbackNeeded).toBe(true);
      expect(scanned.blocks).toEqual([]);

      const empty = await convertPdfToWordMarkdown(
        new Uint8Array(0),
        'empty.pdf',
        DEFAULT_PDF_TO_WORD_OPTIONS
      );
      expect(empty.success).toBe(false);
      expect(empty.errorCode).toBe('INVALID_INPUT');

      const nonPdf = await convertPdfToWordMarkdown(
        createNonPdfBytes(),
        'fake.pdf',
        DEFAULT_PDF_TO_WORD_OPTIONS
      );
      expect(nonPdf.success).toBe(false);
      expect(nonPdf.errorCode).toBe('INVALID_PDF');

      const corrupt = await convertPdfToWordMarkdown(
        createCorruptPdfBytes(),
        'corrupt.pdf',
        DEFAULT_PDF_TO_WORD_OPTIONS
      );
      expect(corrupt.success).toBe(false);
      expect(corrupt.errorCode).toBe('INVALID_PDF');
    });
  });
});
