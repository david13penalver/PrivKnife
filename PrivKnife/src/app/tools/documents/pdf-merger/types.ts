export type RotationAngle = 0 | 90 | 180 | 270;

export interface DocumentPage {
  id: string; // Unique UI ID for tracking/sorting
  documentId: string;
  documentName: string;
  pageIndex: number; // 0-indexed in original document
  displayPageNumber: number; // 1-indexed for display
  rotation: RotationAngle;
  width: number;
  height: number;
  selected?: boolean;
  thumbnailUrl?: string;
}

export interface LoadedPdfDocument {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  buffer: ArrayBuffer;
  pages: DocumentPage[];
}

export interface PdfMergeOptions {
  outputFileName?: string;
}

export interface SplitPdfResult {
  fileName: string;
  bytes: Uint8Array;
  pageCount: number;
}
