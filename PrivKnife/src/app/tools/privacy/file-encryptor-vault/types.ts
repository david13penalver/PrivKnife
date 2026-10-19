export type VaultOperationMode = 'encrypt' | 'decrypt';
export type VaultEncryptionAlgorithm = 'AES-GCM-256';
export type ContainerFormat = 'priv' | 'enc';

export interface FileEncryptorVaultOptions {
  operationMode: VaultOperationMode;
  encryptionAlgorithm: VaultEncryptionAlgorithm;
  pbkdf2Iterations: number; // 50,000 to 600,000, default 100,000
  saltLengthBytes: number; // 16 or 32, default 16
  ivLengthBytes: number; // 12 (standard GCM)
  embedOriginalFilename: boolean;
  containerFormat?: ContainerFormat;
}

export interface ContainerMetadata {
  originalName: string;
  originalSize: number;
  mimeType: string;
  encryptedAt: number;
}

export interface FileEncryptorVaultResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  operation: VaultOperationMode;
  metadata?: {
    originalFileName?: string;
    algorithm?: string;
    iterations?: number;
    saltHex?: string;
    ivHex?: string;
    authTagVerified?: boolean;
  };
}
