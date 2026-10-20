export type PaperFormat = 'a4' | 'us_letter';

export interface EmergencyRecoveryKitOptions {
  paperFormat: PaperFormat;
  kitTitle: string;
  vaultCustodian: string;
  includeMasterVaultSection: boolean;
  includeTwoFaCodesSection: boolean;
  includeSeedPhraseSection: boolean;
  seedPhraseWordCount: 12 | 24;
  includeEmergencyContacts: boolean;
  includeTamperFoldSeals: boolean;
  includeOfflineChecksumQr: boolean;
  highContrastMonochrome: boolean;
  additionalInstructions: string;
}

export interface EmergencyRecoveryKitResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  checksumSha256: string;
  metadata?: Record<string, unknown>;
}

export interface PageDimensionsMm {
  width: number;
  height: number;
}
