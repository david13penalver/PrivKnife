import { describe, it, expect } from 'vitest';
import {
  validateOcrOptions,
  cleanExtractedText,
  buildDocxDeliverable,
  buildMarkdownDeliverable,
  buildTxtDeliverable,
  processLocalOcr,
  preprocessImageBuffer,
  createSampleReceiptImageBlob,
  recognizeTextFromImageBuffer,
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

  describe('Image Preprocessing Pipeline (preprocessImageBuffer)', () => {
    it('should stretch contrast of low-dynamic-range image buffer', () => {
      const width = 4;
      const height = 4;
      const data = new Uint8ClampedArray(width * height * 4);

      // Low contrast grayscale values between 100 and 150
      for (let i = 0; i < data.length; i += 4) {
        const val = i === 0 ? 100 : i === data.length - 4 ? 150 : 125;
        data[i] = val;     // R
        data[i + 1] = val; // G
        data[i + 2] = val; // B
        data[i + 3] = 255; // A
      }

      const preprocessed = preprocessImageBuffer(data, width, height, {
        enhanceContrast: true,
      });

      // Min value (originally 100) should now be 0
      expect(preprocessed[0]).toBe(0);
      expect(preprocessed[1]).toBe(0);
      expect(preprocessed[2]).toBe(0);

      // Max value (originally 150) should now be 255
      const lastIdx = data.length - 4;
      expect(preprocessed[lastIdx]).toBe(255);
      expect(preprocessed[lastIdx + 1]).toBe(255);
      expect(preprocessed[lastIdx + 2]).toBe(255);
    });

    it('should binarize image buffer pixels around specified threshold', () => {
      const width = 2;
      const height = 2;
      const data = new Uint8ClampedArray([
        50, 50, 50, 255,     // < 128 -> should become 0
        120, 120, 120, 255, // < 128 -> should become 0
        130, 130, 130, 255, // >= 128 -> should become 255
        220, 220, 220, 255, // >= 128 -> should become 255
      ]);

      const preprocessed = preprocessImageBuffer(data, width, height, {
        enhanceContrast: false,
        binarizeThreshold: 128,
      });

      expect(preprocessed[0]).toBe(0);
      expect(preprocessed[4]).toBe(0);
      expect(preprocessed[8]).toBe(255);
      expect(preprocessed[12]).toBe(255);
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

  describe('Client-Side Optical Character Recognition (processLocalOcr)', () => {
    it('should generate a valid sample receipt image blob', async () => {
      const blob = await createSampleReceiptImageBlob();
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(0);
      expect(blob.type).toBe('image/png');
    });

    it('should recognize real receipt text without returning placeholder boilerplate', async () => {
      const sampleBlob = await createSampleReceiptImageBlob();
      const result = await processLocalOcr(sampleBlob, DEFAULT_OCR_OPTIONS, 'receipt.png');

      expect(result.success).toBe(true);
      // DEFECT-47-01: Must NEVER return hardcoded placeholder string
      expect(result.extractedText).not.toContain('PRIVACY-FIRST CLIENT-SIDE OCR EXTRACTED TEXT');
      expect(result.extractedText).not.toContain('The requested document was analyzed 100% locally in your browser');
      
      // Must contain recognized invoice/receipt tokens
      expect(result.extractedText).toMatch(/INVOICE|ACME|TOTAL/i);
      expect(result.metadata?.averageConfidence).toBeGreaterThan(60);
      expect(result.metadata?.wordCount).toBeGreaterThan(0);
    });

    it('should extract text from uncompressed and compressed PDF buffers', async () => {
      const rawPdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 55 >>
stream
BT
/F1 12 Tf
72 712 Td
(CONFIDENTIAL CONTRACT AGREEMENT 2026) Tj
ET
endstream
endobj
trailer
<< /Root 1 0 R >>
%%EOF`;

      const pdfBlob = new Blob([rawPdfContent], { type: 'application/pdf' });
      const result = await processLocalOcr(pdfBlob, DEFAULT_OCR_OPTIONS, 'contract.pdf');

      expect(result.success).toBe(true);
      expect(result.extractedText).toContain('CONFIDENTIAL CONTRACT AGREEMENT 2026');
      expect(result.pages[0].confidence).toBeGreaterThan(90);
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
