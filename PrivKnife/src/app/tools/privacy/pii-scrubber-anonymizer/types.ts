export type RedactionMode =
  | 'replacement_tag'
  | 'mask_characters'
  | 'salted_hash_pseudonym';

export type OutputFormat = 'txt' | 'csv' | 'json';

export interface PiiScrubberAnonymizerOptions {
  scrubEmails: boolean;
  scrubPhoneNumbers: boolean;
  scrubIpAddresses: boolean;
  scrubCreditCards: boolean;
  scrubSsnNationalIds: boolean;
  scrubApiTokens: boolean;
  redactionMode: RedactionMode;
  customSalt: string;
  customRegexPatterns?: string;
  outputFormat?: OutputFormat;
}

export interface RedactionAuditStats {
  emailsRedacted: number;
  phonesRedacted: number;
  ipsRedacted: number;
  creditCardsRedacted: number;
  ssnsRedacted: number;
  apiTokensRedacted: number;
  customMatchesRedacted: number;
  totalRedactions: number;
}

export interface PiiScrubberAnonymizerResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  sanitizedText: string;
  auditStats: RedactionAuditStats;
  metadata?: {
    originalLength: number;
    sanitizedLength: number;
    redactionMode: RedactionMode;
    format: OutputFormat;
    timestamp: number;
  };
}
