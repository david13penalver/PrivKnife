export type HashAlgorithm = 'SHA-256' | 'SHA-512' | 'SHA-1' | 'MD5';
export type ExportFormat = 'txt' | 'csv' | 'json';
export type CasingOption = 'lowercase' | 'uppercase';
export type QuoteOption = 'none' | 'single' | 'double';

export interface UuidFormatOptions {
  casing: CasingOption;
  includeHyphens: boolean;
  quotes: QuoteOption;
  prefix?: string;
  suffix?: string;
}

export interface UuidBatchOptions extends UuidFormatOptions {
  quantity: number;
  delimiter: string;
}

export interface HashResultItem {
  input: string;
  hash: string;
  algorithm: HashAlgorithm;
}

export interface HashBatchOptions {
  algorithm: HashAlgorithm;
  casing: CasingOption;
}

export interface ExportOptions {
  delimiter?: string;
  csvHeader?: string;
}
