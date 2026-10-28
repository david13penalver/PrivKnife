import { FileEncryptorVaultOptions } from './types';

export const DEFAULT_ENCRYPT_OPTIONS: FileEncryptorVaultOptions = {
  operationMode: 'encrypt',
  encryptionAlgorithm: 'AES-GCM-256',
  pbkdf2Iterations: 100000,
  saltLengthBytes: 16,
  ivLengthBytes: 12,
  embedOriginalFilename: true,
  containerFormat: 'priv',
};

export const FAST_TEST_ENCRYPT_OPTIONS: FileEncryptorVaultOptions = {
  operationMode: 'encrypt',
  encryptionAlgorithm: 'AES-GCM-256',
  pbkdf2Iterations: 1000, // Speed up tests
  saltLengthBytes: 16,
  ivLengthBytes: 12,
  embedOriginalFilename: true,
  containerFormat: 'priv',
};

export const DEFAULT_DECRYPT_OPTIONS: FileEncryptorVaultOptions = {
  operationMode: 'decrypt',
  encryptionAlgorithm: 'AES-GCM-256',
  pbkdf2Iterations: 100000,
  saltLengthBytes: 16,
  ivLengthBytes: 12,
  embedOriginalFilename: true,
  containerFormat: 'priv',
};

export const TEST_VAULT_PASSWORD = 'CorrectHorseBatteryStaple#2026!';
export const WRONG_VAULT_PASSWORD = 'InvalidIncorrectPassword999';

export const SAMPLE_CONFIDENTIAL_PAYLOAD = `CONFIDENTIAL CLIENT FINANCIAL DISCLOSURE #2026-048
Prepared for: ACME Privacy & Wealth Advisory
Date: 2026-10-28

PORTFOLIO SUMMARY:
1. Swiss Franc Liquid Reserve:       CHF 2,450,000.00
2. Sovereign Bond Holdings (AAA):    EUR 5,800,000.00
3. Cold-Storage Cryptographic Keys:  BTC 124.50000000

SECURITY CLASSIFICATION: TOP SECRET // ZERO KNOWLEDGE`;

export function createSampleConfidentialFile(): File {
  return new File([SAMPLE_CONFIDENTIAL_PAYLOAD], 'secret-financials.json', {
    type: 'application/json',
  });
}

export function createSyntheticPlaintextFile(
  name: string = 'confidential-records.pdf',
  byteSize: number = 2048
): File {
  const bytes = new Uint8Array(byteSize);
  for (let i = 0; i < byteSize; i++) {
    bytes[i] = (i * 17 + 42) % 256;
  }
  return new File([bytes], name, { type: 'application/pdf' });
}

export function createSyntheticCorruptedVaultFile(
  name: string = 'corrupted-vault.priv'
): File {
  const bytes = new Uint8Array([0x50, 0x52, 0x49, 0x56, 0x01, 0x00, 0x00]);
  return new File([bytes], name, { type: 'application/octet-stream' });
}
