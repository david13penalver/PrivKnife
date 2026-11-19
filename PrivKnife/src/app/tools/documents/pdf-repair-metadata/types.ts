export type RepairToolMode = 'repair' | 'metadata' | 'pdfa';

export interface PdfMetadataFields {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
}

export const EMPTY_PDF_METADATA: PdfMetadataFields = {
  title: '',
  author: '',
  subject: '',
  keywords: '',
  creator: '',
  producer: '',
};

export interface PdfHealthReport {
  pdfVersion: string;
  pageCount: number;
  isLinearized: boolean;
  isEncrypted: boolean;
  hasXrefWarnings: boolean;
  hasJavaScriptOrActions: boolean;
  leadingGarbageBytes: number;
  metadata: PdfMetadataFields;
  rawXmpBytes: number;
  qpdfDiagnostics: string[];
  healthStatus: 'healthy' | 'recoverable' | 'corrupted';
  hasPieceInfo: boolean;
  unembeddedFontsCount: number;
}

export interface PdfRepairMetadataOptions {
  mode: RepairToolMode;
  linearizeFastWebView: boolean;
  stripJavaScriptAndActions: boolean;
  scrubAllMetadata: boolean;
  metadataOverrides: PdfMetadataFields;
  pdfaConformance: '2b_vector' | '2b_strict_flattened';
  pdfaFlattenDpi: 200 | 300;
}

export const DEFAULT_PDF_REPAIR_OPTIONS: PdfRepairMetadataOptions = {
  mode: 'repair',
  linearizeFastWebView: true,
  stripJavaScriptAndActions: true,
  scrubAllMetadata: false,
  metadataOverrides: { ...EMPTY_PDF_METADATA },
  pdfaConformance: '2b_vector',
  pdfaFlattenDpi: 200,
};

export interface ArchivalCheckItem {
  id: string;
  labelKey: string;
  passed: boolean;
  detail?: string;
}

export interface PdfRepairMetadataResult {
  success: boolean;
  blob?: Blob;
  pdfBytes?: Uint8Array;
  fileName: string;
  fileSize: number;
  repairedWarningsCount: number;
  archivalChecklist?: ArchivalCheckItem[];
  reportAfter?: PdfHealthReport;
  actionLog?: string[];
  error?: string;
}

export interface RenderedArchivalPageImage {
  bytes: Uint8Array;
  format: 'PNG' | 'JPEG';
  widthPt: number;
  heightPt: number;
}

export interface PdfRepairDeps {
  onProgress?: (percent: number, stage: string) => void;
  renderPageToImage?: (
    pdfBytes: Uint8Array,
    pageNumber: number,
    dpi: 200 | 300
  ) => Promise<RenderedArchivalPageImage>;
}

export type PdfRepairWorkerRequest =
  | {
      type: 'inspect';
      pdfBytes: Uint8Array;
    }
  | {
      type: 'process';
      pdfBytes: Uint8Array;
      fileName: string;
      options: PdfRepairMetadataOptions;
    };

export type PdfRepairWorkerResponse =
  | {
      type: 'progress';
      percent: number;
      stage: string;
    }
  | {
      type: 'inspected';
      report: PdfHealthReport;
    }
  | {
      type: 'done';
      pdfBuffer?: ArrayBuffer;
      result: PdfRepairMetadataResult;
    }
  | {
      type: 'error';
      error: string;
    };
