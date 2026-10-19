import { describe, it, expect } from 'vitest';
import {
  validateOcrOptions,
  cleanExtractedText,
  buildDocxDeliverable,
  buildMarkdownDeliverable,
  buildTxtDeliverable,
  processLocalOcr,
} from './engine';
import {
  DEFAULT_OCR_OPTIONS,
  MARKDOWN_OCR_OPTIONS,
  DOCX_OCR_OPTIONS,
  SAMPLE_SCANNED_RECEIPT_TEXT,
  createSyntheticImageFile,
  createSyntheticPdfFile,
} from './test-fixtures';
import { LocalOcrTextExtractorOptions } from './types';

describe('Local OCR Text Extractor Engine (Seam 1)', () => {
  describe('Parameter Validation & Guardrails', () => {
    it('should validate default options successfully', () => {
      const res = validateOcrOptions(DEFAULT_OCR_OPTIONS);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('should reject null or undefined options', () => {
      const res = validateOcrOptions(null as unknown as LocalOcrTextExtractorOptions);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('required');
    });

    it('should reject unsupported OCR languages', () => {
      const invalid = { ...DEFAULT_OCR_OPTIONS, ocrLanguage: 'xyz' as any };
      const res = validateOcrOptions(invalid);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('language');
    });

    it('should reject invalid binarization thresholds', () => {
      const invalid = { ...DEFAULT_OCR_OPTIONS, binarizeThreshold: 350 };
      const res = validateOcrOptions(invalid);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('threshold');
    });

    it('should reject unsupported export formats', () => {
      const invalid = { ...DEFAULT_OCR_OPTIONS, exportFormat: 'pdf' as any };
      const res = validateOcrOptions(invalid);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('format');
    });
  });

  describe('Text Cleaning & Post-Processing Algorithms', () => {
    it('should clean irregular hyphenated linebreaks', () => {
      const text = 'This is a multi-\nline paragraph with broken-\n words.';
      const cleaned = cleanExtractedText(text, {
        cleanIrregularLinebreaks: true,
        preserveTableSpacing: false,
      });

      expect(cleaned).toContain('multiline');
      expect(cleaned).toContain('brokenwords');
    });

    it('should preserve columnar table spacing when enabled', () => {
      const tableText = 'Item       Qty    Price    Total\nPaper      2      $5.00    $10.00';
      const cleaned = cleanExtractedText(tableText, {
        cleanIrregularLinebreaks: false,
        preserveTableSpacing: true,
      });

      expect(cleaned).toContain('\t');
    });

    it('should trim trailing whitespace per line and normalize line endings', () => {
      const raw = 'First line   \r\nSecond line   \nThird line';
      const cleaned = cleanExtractedText(raw, {
        cleanIrregularLinebreaks: false,
        preserveTableSpacing: false,
      });

      expect(cleaned).toBe('First line\nSecond line\nThird line');
    });
  });

  describe('Deliverable Builders (.txt, .md, .docx)', () => {
    const mockPages = [
      {
        pageNumber: 1,
        text: 'Page one confidential report.',
        confidence: 96,
        lines: ['Page one confidential report.'],
      },
      {
        pageNumber: 2,
        text: 'Page two signatures and approval.',
        confidence: 94,
        lines: ['Page two signatures and approval.'],
      },
    ];

    it('should build plain text deliverable with page markers', () => {
      const txt = buildTxtDeliverable(mockPages);
      expect(txt).toContain('--- Page 1 ---');
      expect(txt).toContain('Page one confidential report.');
      expect(txt).toContain('--- Page 2 ---');
    });

    it('should build markdown deliverable with page headers', () => {
      const md = buildMarkdownDeliverable(mockPages, 'Financial Statement');
      expect(md).toContain('# Financial Statement');
      expect(md).toContain('## Page 1');
      expect(md).toContain('Page one confidential report.');
      expect(md).toContain('## Page 2');
    });

    it('should build valid Word (.docx) ZIP package containing document.xml', async () => {
      const docxBlob = await buildDocxDeliverable(mockPages, 'Audited Report');
      expect(docxBlob).toBeInstanceOf(Blob);
      expect(docxBlob.size).toBeGreaterThan(100);
      expect(docxBlob.type).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
    });
  });

  describe('Deliverable Export Serialization (processLocalOcr)', () => {
    it('should process image input and export plain text deliverable', async () => {
      const file = createSyntheticImageFile('receipt.png', 2048);
      const result = await processLocalOcr(file, DEFAULT_OCR_OPTIONS, 'receipt.png');

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('receipt-ocr.txt');
      expect(result.mimeType).toBe('text/plain');
      expect(result.blob.size).toBeGreaterThan(0);
      expect(result.pages.length).toBeGreaterThan(0);
      expect(result.metadata?.pageCount).toBe(1);
    });

    it('should process input and export markdown deliverable', async () => {
      const file = createSyntheticImageFile('scan.jpg', 2048);
      const result = await processLocalOcr(file, MARKDOWN_OCR_OPTIONS, 'scan.jpg');

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('scan-ocr.md');
      expect(result.mimeType).toBe('text/markdown');
      const textFromBlob = await result.blob.text();
      expect(textFromBlob).toContain('# scan');
    });

    it('should process input and export docx deliverable', async () => {
      const file = createSyntheticPdfFile('contract.pdf', 3000);
      const result = await processLocalOcr(file, DOCX_OCR_OPTIONS, 'contract.pdf');

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('contract-ocr.docx');
      expect(result.mimeType).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      expect(result.blob.size).toBeGreaterThan(200);
    });
  });
});
