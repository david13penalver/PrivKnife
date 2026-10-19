import { describe, expect, it } from 'vitest';
import {
  exportSignatureHtmlBlob,
  generatePlainTextSignature,
  generateSignatureHtml,
  sanitizeSignatureConfig,
} from './engine';
import {
  COMPACT_SIGNATURE_CONFIG,
  CORPORATE_SIGNATURE_CONFIG,
  DEFAULT_SIGNATURE_CONFIG,
  MALICIOUS_SIGNATURE_CONFIG,
  MINIMAL_SIGNATURE_CONFIG,
  TWO_COLUMN_SIGNATURE_CONFIG,
} from './test-fixtures';

describe('Email Signature Generator Engine (engine.ts)', () => {
  describe('HTML Table Generator (generateSignatureHtml)', () => {
    it('should generate valid email table markup with inline styles for Modern template', () => {
      const html = generateSignatureHtml(DEFAULT_SIGNATURE_CONFIG);

      expect(html).toContain('<table');
      expect(html).toContain('cellpadding="0"');
      expect(html).toContain('cellspacing="0"');
      expect(html).toContain('border="0"');
      expect(html).toContain('border-collapse: collapse');
      expect(html).toContain('Alex Morgan');
      expect(html).toContain('Senior Software Engineer');
      expect(html).toContain('Apex Cloud Solutions');
      expect(html).toContain('alex.morgan@apexcloud.io');
      expect(html).toContain('+1 (555) 019-2834');
      expect(html).toContain('https://apexcloud.io');
      expect(html).toContain('https://linkedin.com/in/alexmorgan');
      expect(html).toContain('border-radius: 50%'); // round avatar
      expect(html).not.toContain('<style>');
      expect(html).not.toContain('display: flex');
      expect(html).not.toContain('display: grid');
    });

    it('should generate compliant markup for Compact template', () => {
      const html = generateSignatureHtml(COMPACT_SIGNATURE_CONFIG);

      expect(html).toContain('Liam Chen');
      expect(html).toContain('Product Designer');
      expect(html).toContain('Studio Pixel');
      expect(html).toContain('liam@studiopixel.design');
      expect(html).toContain('https://studiopixel.design');
      expect(html).toContain('Helvetica, sans-serif');
      expect(html).toContain('cellpadding="0"');
    });

    it('should generate compliant markup for Corporate template with disclaimer and logo', () => {
      const html = generateSignatureHtml(CORPORATE_SIGNATURE_CONFIG);

      expect(html).toContain('Eleanor Vance');
      expect(html).toContain('Chief Compliance Officer');
      expect(html).toContain('Vance & Sterling Partners');
      expect(html).toContain('CONFIDENTIALITY NOTICE');
      expect(html).toContain('Georgia, serif');
      expect(html).toContain('data:image/svg+xml'); // Logo
      expect(html).toContain('border-radius: 8px'); // rounded avatar
    });

    it('should generate compliant markup for Minimal template', () => {
      const html = generateSignatureHtml(MINIMAL_SIGNATURE_CONFIG);

      expect(html).toContain('Sophia Martinez');
      expect(html).toContain('Independent Journalist & Essayist');
      expect(html).toContain('sophia@sundaydispatch.org');
      expect(html).toContain('London, United Kingdom');
      expect(html).toContain('Times New Roman');
    });

    it('should generate compliant markup for Two-Column template', () => {
      const html = generateSignatureHtml(TWO_COLUMN_SIGNATURE_CONFIG);

      expect(html).toContain('Marcus Brody');
      expect(html).toContain('VP of Engineering');
      expect(html).toContain('Nexus Tech Labs');
      expect(html).toContain('marcus@nexustech.dev');
      expect(html).toContain('https://youtube.com/@marcusbrody');
      expect(html).toContain('Verdana, sans-serif');
    });

    it('should include branding link only when includeBranding is true', () => {
      const withoutBranding = generateSignatureHtml({
        ...DEFAULT_SIGNATURE_CONFIG,
        style: { ...DEFAULT_SIGNATURE_CONFIG.style, includeBranding: false },
      });
      expect(withoutBranding).not.toContain('PrivKnife');

      const withBranding = generateSignatureHtml({
        ...DEFAULT_SIGNATURE_CONFIG,
        style: { ...DEFAULT_SIGNATURE_CONFIG.style, includeBranding: true },
      });
      expect(withBranding).toContain('PrivKnife');
    });

    it('should handle square avatar shape correctly', () => {
      const squareConfig = {
        ...DEFAULT_SIGNATURE_CONFIG,
        images: {
          ...DEFAULT_SIGNATURE_CONFIG.images,
          avatarShape: 'square' as const,
        },
      };
      const html = generateSignatureHtml(squareConfig);
      expect(html).toContain('border-radius: 0px');
    });
  });

  describe('Plain Text Generator (generatePlainTextSignature)', () => {
    it('should format clean ASCII plain text signature', () => {
      const text = generatePlainTextSignature(DEFAULT_SIGNATURE_CONFIG);

      expect(text).toContain('Alex Morgan');
      expect(text).toContain('Senior Software Engineer | Apex Cloud Solutions');
      expect(text).toContain('Email: alex.morgan@apexcloud.io');
      expect(text).toContain('Phone: +1 (555) 019-2834');
      expect(text).toContain('Website: https://apexcloud.io');
      expect(text).toContain('LinkedIn: https://linkedin.com/in/alexmorgan');
    });

    it('should include disclaimer in plain text if present', () => {
      const text = generatePlainTextSignature(CORPORATE_SIGNATURE_CONFIG);

      expect(text).toContain('Eleanor Vance');
      expect(text).toContain('CONFIDENTIALITY NOTICE');
    });
  });

  describe('Input Sanitization & Security (sanitizeSignatureConfig)', () => {
    it('should strip script tags and unsafe javascript: protocols from config', () => {
      const sanitized = sanitizeSignatureConfig(MALICIOUS_SIGNATURE_CONFIG);

      expect(sanitized.personal.fullName).not.toContain('<script>');
      expect(sanitized.personal.jobTitle).not.toContain('<img');
      expect(sanitized.personal.jobTitle).not.toContain('onerror');
      expect(sanitized.contact.website).toBe(''); // unsafe protocol removed
      expect(sanitized.social.linkedin).toBe(''); // unsafe protocol removed
      expect(sanitized.images.avatarUrl).toBe(''); // unsafe protocol removed
      expect(sanitized.style.disclaimerText).not.toContain('<script>');
      expect(sanitized.style.disclaimerText).toContain('Standard legal notice');
    });

    it('should permit safe URLs (https, http, mailto, tel, safe data:image)', () => {
      const safeDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const config = {
        ...DEFAULT_SIGNATURE_CONFIG,
        images: {
          ...DEFAULT_SIGNATURE_CONFIG.images,
          avatarUrl: safeDataUri,
        },
      };
      const sanitized = sanitizeSignatureConfig(config);
      expect(sanitized.images.avatarUrl).toBe(safeDataUri);
    });
  });

  describe('Blob Exporter (exportSignatureHtmlBlob)', () => {
    it('should export valid text/html Blob', async () => {
      const html = generateSignatureHtml(DEFAULT_SIGNATURE_CONFIG);
      const blob = exportSignatureHtmlBlob(html);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/html;charset=utf-8');
      expect(blob.size).toBeGreaterThan(100);
      const text = await blob.text();
      expect(text).toContain('Alex Morgan');
    });
  });
});
