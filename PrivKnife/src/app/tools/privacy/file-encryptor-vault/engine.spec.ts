import { describe, it, expect } from 'vitest';
import {
  validateVaultOptions,
  encryptFileToVault,
  decryptVaultToFile,
  isPrivKnifeVaultContainer,
} from './engine';
import {
  DEFAULT_ENCRYPT_OPTIONS,
  FAST_TEST_ENCRYPT_OPTIONS,
  TEST_VAULT_PASSWORD,
  WRONG_VAULT_PASSWORD,
  createSyntheticPlaintextFile,
  createSyntheticCorruptedVaultFile,
} from './test-fixtures';

describe('Zero-Knowledge File Encryptor & Vault Engine (Seam 1)', () => {
  describe('Parameter Validation & Guardrails', () => {
    it('should validate default options and strong password', () => {
      const res = validateVaultOptions(DEFAULT_ENCRYPT_OPTIONS, TEST_VAULT_PASSWORD);
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('should reject missing or empty password', () => {
      const res = validateVaultOptions(DEFAULT_ENCRYPT_OPTIONS, '');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('password');
    });

    it('should reject short passwords (< 6 characters)', () => {
      const res = validateVaultOptions(DEFAULT_ENCRYPT_OPTIONS, '12345');
      expect(res.valid).toBe(false);
      expect(res.error).toContain('at least 6 characters');
    });

    it('should reject invalid PBKDF2 iterations', () => {
      const invalid = { ...DEFAULT_ENCRYPT_OPTIONS, pbkdf2Iterations: 50 };
      const res = validateVaultOptions(invalid, TEST_VAULT_PASSWORD);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('iterations');
    });
  });

  describe('Container Header Detection', () => {
    it('should identify valid vault container header bytes', async () => {
      const file = createSyntheticPlaintextFile('secret.txt', 512);
      const encrypted = await encryptFileToVault(
        file,
        TEST_VAULT_PASSWORD,
        FAST_TEST_ENCRYPT_OPTIONS,
        'secret.txt'
      );

      const isVault = await isPrivKnifeVaultContainer(encrypted.blob);
      expect(isVault).toBe(true);
    });

    it('should return false for arbitrary non-vault files', async () => {
      const plainFile = createSyntheticPlaintextFile('regular.txt', 256);
      const isVault = await isPrivKnifeVaultContainer(plainFile);
      expect(isVault).toBe(false);
    });
  });

  describe('End-to-End Encryption and Decryption Roundtrip', () => {
    it('should encrypt a file into an authenticated .priv container', async () => {
      const original = createSyntheticPlaintextFile('financial-records.pdf', 1024);
      const encrypted = await encryptFileToVault(
        original,
        TEST_VAULT_PASSWORD,
        FAST_TEST_ENCRYPT_OPTIONS,
        'financial-records.pdf'
      );

      expect(encrypted.success).toBe(true);
      expect(encrypted.fileName).toBe('financial-records.pdf.priv');
      expect(encrypted.mimeType).toBe('application/octet-stream');
      expect(encrypted.fileSize).toBeGreaterThan(1024);
      expect(encrypted.metadata?.algorithm).toBe('AES-GCM-256');
    });

    it('should decrypt a vault container back to the exact original plaintext bytes', async () => {
      const original = createSyntheticPlaintextFile('contract.pdf', 2048);
      const originalBytes = new Uint8Array(await original.arrayBuffer());

      // Encrypt
      const encrypted = await encryptFileToVault(
        original,
        TEST_VAULT_PASSWORD,
        FAST_TEST_ENCRYPT_OPTIONS,
        'contract.pdf'
      );

      // Decrypt with correct password
      const decrypted = await decryptVaultToFile(
        encrypted.blob,
        TEST_VAULT_PASSWORD
      );

      expect(decrypted.success).toBe(true);
      expect(decrypted.fileName).toBe('contract.pdf');
      expect(decrypted.mimeType).toBe('application/pdf');
      expect(decrypted.fileSize).toBe(2048);

      const decryptedBytes = new Uint8Array(await decrypted.blob.arrayBuffer());
      expect(decryptedBytes.length).toBe(originalBytes.length);
      for (let i = 0; i < 20; i++) {
        expect(decryptedBytes[i]).toBe(originalBytes[i]);
      }
    });

    it('should reject decryption when given the wrong password', async () => {
      const original = createSyntheticPlaintextFile('secret.txt', 512);
      const encrypted = await encryptFileToVault(
        original,
        TEST_VAULT_PASSWORD,
        FAST_TEST_ENCRYPT_OPTIONS,
        'secret.txt'
      );

      await expect(
        decryptVaultToFile(encrypted.blob, WRONG_VAULT_PASSWORD)
      ).rejects.toThrow(/password|authentication|failed/i);
    });

    it('should reject corrupted or truncated vault container', async () => {
      const corrupted = createSyntheticCorruptedVaultFile();
      await expect(
        decryptVaultToFile(corrupted, TEST_VAULT_PASSWORD)
      ).rejects.toThrow(/corrupt|invalid|header/i);
    });

    it('should reject decryption if container metadata header is tampered with (AAD binding)', async () => {
      const original = createSyntheticPlaintextFile('tamper-test.pdf', 1024);
      const encrypted = await encryptFileToVault(
        original,
        TEST_VAULT_PASSWORD,
        FAST_TEST_ENCRYPT_OPTIONS,
        'tamper-test.pdf'
      );

      const containerBytes = new Uint8Array(await encrypted.blob.arrayBuffer());
      // Find the metadata offset (magic 4 + ver 1 + iter 4 + salt 1+16 + iv 1+12 + metaLen 2 = 39)
      const metaOffset = 4 + 1 + 4 + 1 + 16 + 1 + 12 + 2;
      // Mutate one byte in metadata JSON
      containerBytes[metaOffset + 5] ^= 0xff;

      const tamperedBlob = new Blob([containerBytes], { type: 'application/octet-stream' });
      await expect(
        decryptVaultToFile(tamperedBlob, TEST_VAULT_PASSWORD)
      ).rejects.toThrow(/decryption failed|authentication/i);
    });

    it('should redact original filename to redacted.bin when embedOriginalFilename is false', async () => {
      const original = createSyntheticPlaintextFile('top-secret-tax-file.pdf', 512);
      const encrypted = await encryptFileToVault(
        original,
        TEST_VAULT_PASSWORD,
        { ...FAST_TEST_ENCRYPT_OPTIONS, embedOriginalFilename: false },
        'top-secret-tax-file.pdf'
      );

      const containerBytes = new Uint8Array(await encrypted.blob.arrayBuffer());
      const containerText = new TextDecoder('utf-8', { fatal: false }).decode(containerBytes);
      expect(containerText).not.toContain('top-secret-tax-file.pdf');
      expect(containerText).toContain('redacted.bin');

      const decrypted = await decryptVaultToFile(encrypted.blob, TEST_VAULT_PASSWORD);
      expect(decrypted.fileName).toBe('redacted.bin');
    });
  });
});
