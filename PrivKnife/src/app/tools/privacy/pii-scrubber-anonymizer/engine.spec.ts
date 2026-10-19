import { describe, it, expect } from 'vitest';
import {
  validateScrubberOptions,
  luhnCheck,
  scrubPiiText,
  processPiiScrub,
} from './engine';
import {
  DEFAULT_SCRUBBER_OPTIONS,
  MASK_SCRUBBER_OPTIONS,
  PSEUDONYM_SCRUBBER_OPTIONS,
  SAMPLE_SERVER_LOG,
  SAMPLE_CSV_DATA,
  createSyntheticLogFile,
  createSyntheticCsvFile,
} from './test-fixtures';
import { PiiScrubberAnonymizerOptions } from './types';

describe('PII Log & CSV Scrubber Engine (Seam 1)', () => {
  describe('Parameter Validation & Guardrails', () => {
    it('should validate default options successfully', () => {
      const res = validateScrubberOptions(DEFAULT_SCRUBBER_OPTIONS);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('should reject null or undefined options', () => {
      const res = validateScrubberOptions(
        null as unknown as PiiScrubberAnonymizerOptions
      );
      expect(res.valid).toBe(false);
      expect(res.error).toContain('required');
    });

    it('should reject invalid redaction modes', () => {
      const invalid = { ...DEFAULT_SCRUBBER_OPTIONS, redactionMode: 'magic' as any };
      const res = validateScrubberOptions(invalid);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('redaction mode');
    });

    it('should require customSalt when salted_hash_pseudonym mode is selected', () => {
      const invalid = {
        ...DEFAULT_SCRUBBER_OPTIONS,
        redactionMode: 'salted_hash_pseudonym' as const,
        customSalt: '',
      };
      const res = validateScrubberOptions(invalid);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('salt');
    });
  });

  describe('Luhn Credit Card Verification Checksum', () => {
    it('should accept valid credit card numbers', () => {
      expect(luhnCheck('4111111111111111')).toBe(true);
      expect(luhnCheck('4532123456789014')).toBe(true);
    });

    it('should reject invalid credit card numbers', () => {
      expect(luhnCheck('4532123456789011')).toBe(false);
      expect(luhnCheck('1234567890123456')).toBe(false);
    });
  });

  describe('PII Redaction Modes', () => {
    it('should scrub PII using replacement_tag mode', async () => {
      const { sanitized, stats } = await scrubPiiText(
        SAMPLE_SERVER_LOG,
        DEFAULT_SCRUBBER_OPTIONS
      );

      expect(sanitized).toContain('[EMAIL_REDACTED]');
      expect(sanitized).toContain('[IP_REDACTED]');
      expect(sanitized).toContain('[PHONE_REDACTED]');
      expect(sanitized).toContain('[SSN_REDACTED]');
      expect(sanitized).toContain('[API_KEY_REDACTED]');
      expect(sanitized).not.toContain('alice@acme.corp');
      expect(sanitized).not.toContain('192.168.1.45');
      expect(sanitized).not.toContain('123-45-6789');

      expect(stats.emailsRedacted).toBe(2);
      expect(stats.ipsRedacted).toBe(2);
      expect(stats.phonesRedacted).toBe(1);
      expect(stats.ssnsRedacted).toBe(1);
      expect(stats.apiTokensRedacted).toBe(1);
      expect(stats.totalRedactions).toBeGreaterThanOrEqual(7);
    });

    it('should scrub PII using mask_characters mode', async () => {
      const { sanitized } = await scrubPiiText(
        SAMPLE_SERVER_LOG,
        MASK_SCRUBBER_OPTIONS
      );

      expect(sanitized).toContain('***-**-6789');
      expect(sanitized).not.toContain('alice@acme.corp');
      expect(sanitized).not.toContain('123-45-6789');
    });

    it('should scrub PII using salted_hash_pseudonym mode consistently', async () => {
      const { sanitized } = await scrubPiiText(
        SAMPLE_SERVER_LOG,
        PSEUDONYM_SCRUBBER_OPTIONS
      );

      expect(sanitized).not.toContain('alice@acme.corp');
      expect(sanitized).not.toContain('192.168.1.45');
      expect(sanitized).toMatch(/USER_[0-9a-f]{8}/);
      expect(sanitized).toMatch(/IP_[0-9a-f]{8}/);
    });
  });

  describe('Deliverable Export Serialization (processPiiScrub)', () => {
    it('should scrub log file and produce deliverable text result', async () => {
      const file = createSyntheticLogFile();
      const result = await processPiiScrub(
        file,
        DEFAULT_SCRUBBER_OPTIONS,
        'access.log'
      );

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('access-sanitized.txt');
      expect(result.mimeType).toBe('text/plain');
      expect(result.blob.size).toBeGreaterThan(0);
      expect(result.auditStats.totalRedactions).toBeGreaterThan(0);
    });

    it('should scrub CSV file and produce deliverable CSV result', async () => {
      const file = createSyntheticCsvFile();
      const result = await processPiiScrub(
        file,
        { ...DEFAULT_SCRUBBER_OPTIONS, outputFormat: 'csv' },
        'customers.csv'
      );

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('customers-sanitized.csv');
      expect(result.mimeType).toBe('text/csv');
      expect(result.sanitizedText).toContain('id,name,email,ip,phone');
      expect(result.sanitizedText).not.toContain('alice@acme.corp');
    });

    it('should support JSON output format with audit report', async () => {
      const file = createSyntheticLogFile();
      const result = await processPiiScrub(
        file,
        { ...DEFAULT_SCRUBBER_OPTIONS, outputFormat: 'json' },
        'app.log'
      );

      expect(result.success).toBe(true);
      expect(result.fileName).toBe('app-sanitized.json');
      expect(result.mimeType).toBe('application/json');

      const json = JSON.parse(result.sanitizedText);
      expect(json.sanitizedContent).toBeDefined();
      expect(json.auditStats).toBeDefined();
    });
  });
});
