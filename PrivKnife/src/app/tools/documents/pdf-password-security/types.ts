export type PdfSecurityMode = 'protect' | 'unlock';
export type PdfPrintPermission = 'full' | 'low' | 'none';
export type PdfModifyPermission = 'all' | 'annotate' | 'form' | 'assembly' | 'none';
export type PdfEncryptionAlgorithm =
  | 'none'
  | 'RC4-40'
  | 'RC4-128'
  | 'AES-128'
  | 'AES-256'
  | 'unknown';

export type PdfSecurityErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_OPTIONS'
  | 'WRONG_PASSWORD'
  | 'ALREADY_UNENCRYPTED'
  | 'INVALID_PDF'
  | 'WASM_LOAD_ERROR'
  | 'WORKER_ERROR';

export interface PdfEncryptionInfo {
  isEncrypted: boolean;
  requiresUserPassword: boolean;
  algorithm: PdfEncryptionAlgorithm;
  pageCount?: number;
}

export interface PasswordStrengthReport {
  entropyBits: number;
  grade: 'empty' | 'weak' | 'fair' | 'strong' | 'excellent';
  scorePercent: number;
}

export interface PdfProtectOptions {
  userPassword: string;
  ownerPassword: string;
  keyLength: 128 | 256;
  allowPrint: PdfPrintPermission;
  allowModify: PdfModifyPermission;
  allowExtractText: boolean;
  allowAccessibility: boolean;
}

export interface PdfUnlockOptions {
  password: string;
}

export interface PdfPasswordSecurityResult {
  success: boolean;
  mode: PdfSecurityMode;
  blob?: Blob;
  bytes?: Uint8Array;
  fileName: string;
  fileSize: number;
  resultingInfo?: PdfEncryptionInfo;
  errorCode?: PdfSecurityErrorCode;
  error?: string;
}

export interface PdfSecurityDeps {
  onProgress?: (percent: number, stage: string) => void;
}

export type PdfPasswordWorkerRequest =
  | { type: 'inspect'; pdfBytes: Uint8Array }
  | {
      type: 'protect';
      pdfBytes: Uint8Array;
      fileName: string;
      options: PdfProtectOptions;
    }
  | {
      type: 'unlock';
      pdfBytes: Uint8Array;
      fileName: string;
      options: PdfUnlockOptions;
    };

export type PdfPasswordWorkerResponse =
  | { type: 'progress'; percent: number; stage: string }
  | { type: 'inspect_done'; info?: PdfEncryptionInfo; error?: string; errorCode?: PdfSecurityErrorCode }
  | { type: 'done'; result: PdfPasswordSecurityResult };
