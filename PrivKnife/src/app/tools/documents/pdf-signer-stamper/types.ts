export type SignatureInkColor = 'black' | 'dark_blue';
export type DateFormat = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'MMM D, YYYY';
export type StampType = 'signature' | 'date' | 'initials' | 'text';

export interface PlacedStamp {
  id: string;
  type: StampType;
  pageIndex: number;
  x: number; // PDF points
  y: number; // PDF points
  width: number;
  height: number;
  text?: string;
  imageDataUrl?: string; // PNG base64 data URL
  color?: string;
  fontSize?: number;
}

export interface PdfSignerStamperOptions {
  signatureInkColor: SignatureInkColor;
  signaturePenWidth: number; // 1 to 5, default 2
  dateFormat: DateFormat;
  customDateString: string;
  initialsText: string;
  flattenAnnotations: boolean;
  stamps?: PlacedStamp[];
}

export interface PdfSignerStamperResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metadata?: {
    pageCount: number;
    stampsPlaced: number;
    flattened: boolean;
  };
}

export interface PdfDocumentSummary {
  name: string;
  size: number;
  pageCount: number;
  pages: { pageIndex: number; width: number; height: number }[];
}
