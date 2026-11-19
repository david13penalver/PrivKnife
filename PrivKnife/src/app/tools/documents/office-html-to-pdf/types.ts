export type SupportedOfficeFormat = 'docx' | 'xlsx' | 'csv' | 'html' | 'md';

export type OfficePaperSize = 'a4' | 'letter' | 'legal';

export type OfficeOrientation = 'portrait' | 'landscape';

export interface OfficeToPdfOptions {
  paperSize: OfficePaperSize;
  orientation: OfficeOrientation;
  marginMm: number; // 10 | 18 | 25
  baseFontSizePt: number; // 9..14
  selectedSheets: string[]; // For .xlsx multi-sheet filtering; empty => all sheets
  showTableGridlines: boolean;
  tableZebraStriping: boolean;
  repeatTableHeaders: boolean;
  includePageNumbers: boolean;
  headerText: string;
  outputFileName: string;
}

export const DEFAULT_OFFICE_TO_PDF_OPTIONS: OfficeToPdfOptions = {
  paperSize: 'a4',
  orientation: 'portrait',
  marginMm: 18,
  baseFontSizePt: 11,
  selectedSheets: [],
  showTableGridlines: true,
  tableZebraStriping: true,
  repeatTableHeaders: true,
  includePageNumbers: true,
  headerText: '',
  outputFileName: 'converted-document.pdf',
};

export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
  strike?: boolean;
}

export type PdfRenderBlock =
  | {
      type: 'heading';
      level: 1 | 2 | 3 | 4 | 5 | 6;
      runs: TextRun[];
      text: string;
    }
  | {
      type: 'paragraph';
      runs: TextRun[];
      text: string;
    }
  | {
      type: 'list';
      ordered: boolean;
      items: TextRun[][];
    }
  | {
      type: 'blockquote';
      runs: TextRun[];
      text: string;
    }
  | {
      type: 'code_block';
      language?: string;
      code: string;
    }
  | {
      type: 'table';
      title?: string;
      headers: string[];
      rows: string[][];
    }
  | {
      type: 'image';
      dataUri: string;
      format: 'PNG' | 'JPEG' | 'WEBP';
      alt?: string;
    }
  | {
      type: 'hr';
    };

export interface RenderStatsCounts {
  paragraphs: number;
  headings: number;
  tables: number;
  images: number;
  lists: number;
  codeBlocks: number;
}

export interface PdfRenderModel {
  sourceFormat: SupportedOfficeFormat;
  title: string;
  blocks: PdfRenderBlock[];
  sheetNames: string[];
  recommendedOrientation: OfficeOrientation;
  maxTableColumns: number;
  blockedRemoteUrls: number;
  warnings: string[];
  counts: RenderStatsCounts;
}

export interface PaginatedPreviewPage {
  pageNumber: number;
  totalPages: number;
  headerText: string;
  footerText: string;
  blocks: PdfRenderBlock[];
}

export interface OfficeToPdfDiagnostics {
  sourceFormat: SupportedOfficeFormat;
  pageCount: number;
  tableCount: number;
  paragraphCount: number;
  imageCount: number;
  blockedRemoteUrls: number;
  recommendedOrientation: OfficeOrientation;
  sheetNames: string[];
  maxTableColumns: number;
  warnings: string[];
}

export interface OfficeToPdfInspectResult {
  success: boolean;
  model?: PdfRenderModel;
  previewHtml: string;
  previewPages: PaginatedPreviewPage[];
  diagnostics: OfficeToPdfDiagnostics;
  error?: string;
}

export interface OfficeToPdfResult {
  success: boolean;
  blob?: Blob;
  pdfBytes?: Uint8Array;
  fileName: string;
  fileSize: number;
  previewHtml: string;
  previewPages: PaginatedPreviewPage[];
  diagnostics: OfficeToPdfDiagnostics;
  error?: string;
}

export type OfficeToPdfInput =
  | {
      kind: 'binary';
      bytes: Uint8Array;
      fileName: string;
      hintFormat?: SupportedOfficeFormat;
    }
  | {
      kind: 'text';
      content: string;
      fileName: string;
      format: 'html' | 'md' | 'csv';
    };

export type OfficeToPdfWorkerRequest =
  | {
      type: 'inspect';
      input: OfficeToPdfInput;
      options: Partial<OfficeToPdfOptions>;
    }
  | {
      type: 'convert';
      input: OfficeToPdfInput;
      options: Partial<OfficeToPdfOptions>;
    };

export type OfficeToPdfWorkerResponse =
  | {
      type: 'progress';
      percent: number;
      stage: string;
    }
  | {
      type: 'inspected';
      result: OfficeToPdfInspectResult;
    }
  | {
      type: 'converted';
      pdfBuffer?: ArrayBuffer;
      result: OfficeToPdfResult;
    }
  | {
      type: 'error';
      error: string;
    };

export interface OfficeToPdfWorkerDeps {
  onProgress?: (percent: number, stage: string) => void;
}
