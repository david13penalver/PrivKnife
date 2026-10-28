export type FontSubsetPreset =
  | 'basic_latin_ascii'
  | 'latin_supplement'
  | 'numbers_punctuation_only'
  | 'custom_characters';

export type FontOutputFormat = 'woff2' | 'woff' | 'ttf';

export interface FontSubsetterConverterOptions {
  subsetPreset: FontSubsetPreset;
  customCharacters: string;
  keepKerningTables: boolean;
  dropLayoutFeatures: boolean;
  outputFormat: FontOutputFormat;
  fontFamilyName: string;
}

export interface FontMetadata {
  family: string;
  style?: string;
  numGlyphs?: number;
  tables: string[];
  originalSize: number;
  isTrueType: boolean;
  isOpenType: boolean;
}

export interface FontSubsetStats {
  originalBytes: number;
  subsetBytes: number;
  savingsBytes: number;
  savingsPercent: number;
  retainedGlyphCount: number;
  totalGlyphCount: number;
}

export interface FontSubsetterConverterResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  cssSnippet: string;
  unicodeRange: string;
  stats: FontSubsetStats;
  metadata?: FontMetadata;
  error?: string;
}

export interface FontSubsetWorkerRequest {
  id: number;
  buffer: ArrayBuffer;
  options: FontSubsetterConverterOptions;
}

export interface FontSubsetWorkerResponse {
  id: number;
  result: FontSubsetterConverterResult;
}
