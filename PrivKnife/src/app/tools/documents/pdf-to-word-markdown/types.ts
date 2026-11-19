export type PreviewTab = 'word' | 'markdown' | 'plaintext';

export type PdfToWordErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_PDF'
  | 'ENCRYPTED_PDF'
  | 'WORKER_ERROR';

export interface PdfStyledSpan {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  bold: boolean;
  italic: boolean;
  pageIndex: number;
}

export interface ExtractedStyledDocument {
  pageCount: number;
  pageSizes: Array<{ width: number; height: number }>;
  spans: PdfStyledSpan[];
}

export interface InlineTextRun {
  text: string;
  bold: boolean;
  italic: boolean;
  code?: boolean;
}

export type DocumentBlock =
  | {
      type: 'heading';
      level: 1 | 2 | 3;
      runs: InlineTextRun[];
      pageIndex: number;
    }
  | { type: 'paragraph'; runs: InlineTextRun[]; pageIndex: number }
  | {
      type: 'list_item';
      ordered: boolean;
      marker: string;
      runs: InlineTextRun[];
      pageIndex: number;
    }
  | { type: 'page_break'; pageIndex: number };

export interface PdfToWordMarkdownOptions {
  pageRange: string;
  detectMultiColumn: boolean;
  stripHeadersFooters: boolean;
  dehyphenateWords: boolean;
  preserveInlineStyles: boolean;
  includePageBreaks: boolean;
}

export interface PdfToWordMarkdownResult {
  success: boolean;
  blocks: DocumentBlock[];
  markdown: string;
  plainText: string;
  sanitizedHtml: string;
  docxBlob?: Blob;
  docxBytes?: Uint8Array;
  fileName: string;
  wordCount: number;
  headingCount: number;
  isScannedFallbackNeeded: boolean;
  errorCode?: PdfToWordErrorCode;
  error?: string;
}

export interface PdfToWordDeps {
  onProgress?: (percent: number, stage: string) => void;
  extractSpans?: (bytes: Uint8Array) => Promise<ExtractedStyledDocument>;
}

export type PdfToWordWorkerRequest = {
  type: 'convert';
  spans: PdfStyledSpan[];
  pageSizes: Array<{ width: number; height: number }>;
  fileName: string;
  options: PdfToWordMarkdownOptions;
};

export type PdfToWordWorkerResponse =
  | { type: 'progress'; percent: number; stage: string }
  | { type: 'done'; result: PdfToWordMarkdownResult };
