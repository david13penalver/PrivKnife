export type CompareViewMode =
  | 'overlay'
  | 'side_by_side'
  | 'curtain_slider'
  | 'text_diff';

export type OverlayRenderStyle = 'overlay' | 'highlight';

export type PdfVisualCompareErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_PDF'
  | 'ENCRYPTED_PDF'
  | 'WORKER_ERROR';

export interface PdfCompareOptions {
  viewMode: CompareViewMode;
  overlayStyle: OverlayRenderStyle;
  renderScale: number;
  pixelSensitivity: number;
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  pageOffsetB: number;
  showChangedOnly: boolean;
}

export interface TextDiffToken {
  type: 'equal' | 'added' | 'removed';
  text: string;
}

export interface DiffClusterRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageRgbaFrame {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface VisualDiffOutput {
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  changedPixels: number;
  totalPixels: number;
  visualChangePercent: number;
  dimensionMismatch: boolean;
  clusters: DiffClusterRect[];
}

export interface ExtractedPageData {
  pageNumber: number;
  widthPt: number;
  heightPt: number;
  text: string;
  frame?: PageRgbaFrame;
}

export interface PageDiffDetail {
  pairIndex: number;
  pageA: number | null;
  pageB: number | null;
  hasVisualDiff: boolean;
  hasTextDiff: boolean;
  visualChangePercent: number;
  textAdditions: number;
  textDeletions: number;
  dimensionMismatch: boolean;
  textTokens: TextDiffToken[];
  clusters: DiffClusterRect[];
  overlayFrame?: PageRgbaFrame;
}

export interface PdfVisualCompareResult {
  success: boolean;
  fileNameA: string;
  fileNameB: string;
  totalPairs: number;
  changedPageCount: number;
  pagesA: number;
  pagesB: number;
  summaries: PageDiffDetail[];
  errorCode?: PdfVisualCompareErrorCode;
  error?: string;
}

export interface PdfVisualCompareDeps {
  onProgress?: (percent: number, stage: string) => void;
  extractPages?: (bytes: Uint8Array) => Promise<ExtractedPageData[]>;
}

export type PdfCompareWorkerRequest =
  | {
      type: 'compare_frames';
      fileNameA: string;
      fileNameB: string;
      pagesA: ExtractedPageData[];
      pagesB: ExtractedPageData[];
      options: PdfCompareOptions;
    }
  | {
      type: 'build_pdf_report';
      result: PdfVisualCompareResult;
      changedOnly: boolean;
    };

export type PdfCompareWorkerResponse =
  | { type: 'progress'; percent: number; stage: string }
  | { type: 'done'; result: PdfVisualCompareResult }
  | {
      type: 'report_done';
      success: boolean;
      blob?: Blob;
      bytes?: Uint8Array;
      fileName: string;
      error?: string;
    };
