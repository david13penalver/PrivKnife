import { describe, expect, it } from 'vitest';
import {
  exportBatch,
  formatUuid,
  generateUuidBatch,
  hashBatch,
  hashText,
} from './engine';
import {
  KNOWN_HASH_VECTORS,
  UUID_V4_NO_HYPHENS_REGEX,
  UUID_V4_REGEX,
} from './test-vectors';

describe('CryptoEngine (Seam 1: Pure Cryptographic & UUID Processing)', () => {
  describe('UUID Generation & Formatting', () => {
    it('should generate valid RFC 4122 UUIDv4 strings', () => {
      const uuids = generateUuidBatch({
        quantity: 10,
        casing: 'lowercase',
        includeHyphens: true,
        quotes: 'none',
        delimiter: '\n',
      });

      expect(uuids).toHaveLength(10);
      for (const id of uuids) {
        expect(id).toMatch(UUID_V4_REGEX);
      }
      // Ensure generated IDs are unique
      const uniqueSet = new Set(uuids);
      expect(uniqueSet.size).toBe(10);
    });

    it('should format UUIDs with uppercase casing', () => {
      const raw = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const formatted = formatUuid(raw, {
        casing: 'uppercase',
        includeHyphens: true,
        quotes: 'none',
      });

      expect(formatted).toBe('F47AC10B-58CC-4372-A567-0E02B2C3D479');
    });

    it('should format UUIDs without hyphens', () => {
      const raw = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const formatted = formatUuid(raw, {
        casing: 'lowercase',
        includeHyphens: false,
        quotes: 'none',
      });

      expect(formatted).toBe('f47ac10b58cc4372a5670e02b2c3d479');
      expect(formatted).toMatch(UUID_V4_NO_HYPHENS_REGEX);
    });

    it('should format UUIDs with single and double quotes', () => {
      const raw = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const singleQuoted = formatUuid(raw, {
        casing: 'lowercase',
        includeHyphens: true,
        quotes: 'single',
      });
      const doubleQuoted = formatUuid(raw, {
        casing: 'lowercase',
        includeHyphens: true,
        quotes: 'double',
      });

      expect(singleQuoted).toBe("'f47ac10b-58cc-4372-a567-0e02b2c3d479'");
      expect(doubleQuoted).toBe('"f47ac10b-58cc-4372-a567-0e02b2c3d479"');
    });

    it('should format UUIDs with custom prefix and suffix', () => {
      const raw = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      const formatted = formatUuid(raw, {
        casing: 'lowercase',
        includeHyphens: true,
        quotes: 'none',
        prefix: 'usr_',
        suffix: '_pk',
      });

      expect(formatted).toBe('usr_f47ac10b-58cc-4372-a567-0e02b2c3d479_pk');
    });
  });

  describe('Cryptographic Hashing (NIST & RFC Test Vectors)', () => {
    it('should compute exact SHA-256 digests matching NIST test vectors', async () => {
      for (const vector of KNOWN_HASH_VECTORS) {
        const result = await hashText(vector.input, 'SHA-256');
        expect(result).toBe(vector.sha256);
      }
    });

    it('should compute exact SHA-512 digests matching NIST test vectors', async () => {
      for (const vector of KNOWN_HASH_VECTORS) {
        const result = await hashText(vector.input, 'SHA-512');
        expect(result).toBe(vector.sha512);
      }
    });

    it('should compute exact SHA-1 digests matching NIST test vectors', async () => {
      for (const vector of KNOWN_HASH_VECTORS) {
        const result = await hashText(vector.input, 'SHA-1');
        expect(result).toBe(vector.sha1);
      }
    });

    it('should compute exact MD5 digests matching RFC 1321 test vectors', async () => {
      for (const vector of KNOWN_HASH_VECTORS) {
        const result = await hashText(vector.input, 'MD5');
        expect(result).toBe(vector.md5);
      }
    });

    it('should compute batch hashes asynchronously', async () => {
      const inputs = ['apple', 'banana', 'cherry'];
      const results = await hashBatch(inputs, { algorithm: 'SHA-256', casing: 'lowercase' });

      expect(results).toHaveLength(3);
      expect(results[0].input).toBe('apple');
      expect(results[0].algorithm).toBe('SHA-256');
      expect(results[0].hash).toMatch(/^[0-9a-f]{64}$/);
      expect(results[1].input).toBe('banana');
      expect(results[2].input).toBe('cherry');
    });
  });

  describe('Export Serialization', () => {
    const sampleUuids = ['id-1', 'id-2', 'id-3'];

    it('should serialize string list to Plain Text', () => {
      const txt = exportBatch(sampleUuids, 'txt', { delimiter: '\n' });
      expect(txt).toBe('id-1\nid-2\nid-3');
    });

    it('should serialize string list to CSV with custom header', () => {
      const csv = exportBatch(sampleUuids, 'csv', { csvHeader: 'uuid' });
      expect(csv).toBe('uuid\nid-1\nid-2\nid-3');
    });

    it('should serialize string list to JSON array', () => {
      const json = exportBatch(sampleUuids, 'json');
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(['id-1', 'id-2', 'id-3']);
    });
  });
});
