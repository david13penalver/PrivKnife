export type OcrLanguage = 'eng' | 'spa' | 'fra' | 'deu' | 'ita' | 'por';
export type PageSegmentationMode = 'auto' | 'single_block' | 'single_line';
export type ExportOcrFormat = 'txt' | 'markdown' | 'docx';

export interface LocalOcrTextExtractorOptions {
  ocrLanguage: OcrLanguage;
  pageSegmentationMode: PageSegmentationMode;
  cleanIrregularLinebreaks: boolean;
  preserveTableSpacing: boolean;
  exportFormat: ExportOcrFormat;
  binarizeThreshold?: number; // 0 - 255, default 128
  enhanceContrast?: boolean;
}

export interface ExtractedPageResult {
  pageNumber: number;
  text: string;
  confidence: number;
  lines: string[];
}

export interface LocalOcrTextExtractorResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  extractedText: string;
  pages: ExtractedPageResult[];
  metadata?: {
    pageCount: number;
    averageConfidence: number;
    wordCount: number;
    characterCount: number;
    language: string;
    format: ExportOcrFormat;
  };
}
