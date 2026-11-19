export type ExportFormat = 'xlsx' | 'csv' | 'json';

export type PdfTableExtractorErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_PDF'
  | 'ENCRYPTED_PDF'
  | 'WORKER_ERROR';

export interface PdfTextToken {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageIndex: number;
}

export interface TableRegionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfTableExtractorOptions {
  pageRange: string;
  rowToleranceFactor: number;
  minColumnGapPt: number;
  manualColumnSplitsX?: number[];
  region?: TableRegionRect;
  firstRowAsHeader: boolean;
  mergeAllPages: boolean;
  stripRepeatedHeaders: boolean;
  detectNumericTypes: boolean;
  decimalSeparator: '.' | ',';
  sanitizeCsvFormulas: boolean;
}

export interface ExtractedTable {
  pageIndex: number;
  headers: string[];
  rows: Array<Array<string | number>>;
  columnSplitsX: number[];
}

export interface ExtractedPdfTokensResult {
  pageCount: number;
  pageSizes: Array<{ width: number; height: number }>;
  tokens: PdfTextToken[];
}

export interface PdfTableExtractorResult {
  success: boolean;
  tables: ExtractedTable[];
  isScannedFallbackNeeded: boolean;
  totalRows: number;
  errorCode?: PdfTableExtractorErrorCode;
  error?: string;
}

export interface TableExportArtifact {
  success: boolean;
  blob?: Blob;
  bytes?: Uint8Array;
  text?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  error?: string;
}

export interface PdfTableExtractorDeps {
  onProgress?: (percent: number, stage: string) => void;
  extractTokens?: (bytes: Uint8Array) => Promise<ExtractedPdfTokensResult>;
}

export type PdfTableWorkerRequest =
  | {
      type: 'cluster';
      tokens: PdfTextToken[];
      pageCount: number;
      options: PdfTableExtractorOptions;
    }
  | {
      type: 'export';
      tables: ExtractedTable[];
      format: ExportFormat;
      baseFileName: string;
      sanitizeCsvFormulas: boolean;
    };

export type PdfTableWorkerResponse =
  | { type: 'progress'; percent: number; stage: string }
  | { type: 'cluster_done'; result: PdfTableExtractorResult }
  | { type: 'export_done'; artifact: TableExportArtifact };
