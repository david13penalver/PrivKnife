import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyStampsToPdf,
  formatDateString,
  inspectPdfDocument,
  processSignedPdf,
  validateSignerOptions,
} from './engine';
import {
  DEFAULT_SIGNER_OPTIONS,
  MINIMAL_SIGNER_OPTIONS,
  SAMPLE_PLACED_STAMPS,
  createSyntheticPdfBytes,
} from './test-fixtures';

describe('Client-Side PDF Signer, Date Stamper & Initials Engine (Seam 1)', () => {
  let samplePdfBytes: Uint8Array;

  beforeEach(async () => {
    samplePdfBytes = await createSyntheticPdfBytes(2, 'Master Service Agreement');
  });

  describe('Parameter Validation & Guardrails', () => {
    it('should validate default options successfully', () => {
      const res = validateSignerOptions(DEFAULT_SIGNER_OPTIONS);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('should reject null or undefined options', () => {
      expect(validateSignerOptions(null as any).valid).toBe(false);
      expect(validateSignerOptions(undefined as any).valid).toBe(false);
    });

    it('should enforce pen width boundaries [1, 10]', () => {
      expect(
        validateSignerOptions({ ...DEFAULT_SIGNER_OPTIONS, signaturePenWidth: 0 })
          .valid
      ).toBe(false);
      expect(
        validateSignerOptions({ ...DEFAULT_SIGNER_OPTIONS, signaturePenWidth: 15 })
          .valid
      ).toBe(false);
      expect(
        validateSignerOptions({ ...DEFAULT_SIGNER_OPTIONS, signaturePenWidth: 3 })
          .valid
      ).toBe(true);
    });
  });

  describe('Date Formatting Helpers', () => {
    const fixedDate = new Date(2026, 9, 19); // Oct 19, 2026

    it('should format date as YYYY-MM-DD', () => {
      expect(formatDateString('YYYY-MM-DD', fixedDate)).toBe('2026-10-19');
    });

    it('should format date as MM/DD/YYYY', () => {
      expect(formatDateString('MM/DD/YYYY', fixedDate)).toBe('10/19/2026');
    });

    it('should format date as DD/MM/YYYY', () => {
      expect(formatDateString('DD/MM/YYYY', fixedDate)).toBe('19/10/2026');
    });

    it('should format date as MMM D, YYYY', () => {
      expect(formatDateString('MMM D, YYYY', fixedDate)).toBe('Oct 19, 2026');
    });
  });

  describe('PDF Document Inspection', () => {
    it('should inspect page count and dimensions of synthetic PDF', async () => {
      const summary = await inspectPdfDocument(samplePdfBytes.buffer as ArrayBuffer, 'contract.pdf');
      expect(summary.name).toBe('contract.pdf');
      expect(summary.pageCount).toBe(2);
      expect(summary.pages.length).toBe(2);
      expect(summary.pages[0].width).toBeCloseTo(595.28, 1);
      expect(summary.pages[0].height).toBeCloseTo(841.89, 1);
    });
  });

  describe('Stamp Embedding & Flattening Execution', () => {
    it('should apply signature, date, and initials stamps onto PDF pages', async () => {
      const signedBytes = await applyStampsToPdf(
        samplePdfBytes.buffer as ArrayBuffer,
        SAMPLE_PLACED_STAMPS,
        DEFAULT_SIGNER_OPTIONS
      );

      expect(signedBytes).toBeDefined();
      expect(signedBytes.byteLength).toBeGreaterThan(samplePdfBytes.byteLength);
    });

    it('should execute end-to-end processSignedPdf and return valid result', async () => {
      const options = {
        ...DEFAULT_SIGNER_OPTIONS,
        stamps: SAMPLE_PLACED_STAMPS,
      };

      const result = await processSignedPdf(
        samplePdfBytes.buffer as ArrayBuffer,
        options,
        'contract.pdf'
      );

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('contract-signed.pdf');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.blob.size).toBeGreaterThan(0);
      expect(result.metadata?.pageCount).toBe(2);
      expect(result.metadata?.stampsPlaced).toBe(3);
    });

    it('should handle zero stamps gracefully without corrupting document', async () => {
      const result = await processSignedPdf(
        samplePdfBytes.buffer as ArrayBuffer,
        { ...DEFAULT_SIGNER_OPTIONS, stamps: [] },
        'document.pdf'
      );

      expect(result.success).toBe(true);
      expect(result.blob.size).toBeGreaterThan(0);
      expect(result.metadata?.stampsPlaced).toBe(0);
    });
  });
});
