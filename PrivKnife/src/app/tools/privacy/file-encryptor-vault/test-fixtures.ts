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
