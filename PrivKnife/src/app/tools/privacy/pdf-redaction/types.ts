export type RedactionColor = 'black' | 'white';

export interface RedactionBox {
  id: string;
  x: number; // In PDF points from bottom-left or canvas coords
  y: number;
  width: number;
  height: number;
  color: RedactionColor;
}

export interface PageRedaction {
  pageIndex: number;
  boxes: RedactionBox[];
}

export interface RedactionPageInfo {
  pageIndex: number;
  displayNumber: number;
  width: number;
  height: number;
}

export interface RedactionDocument {
  id: string;
  name: string;
  pageCount: number;
  pages: RedactionPageInfo[];
  buffer: ArrayBuffer;
}

export interface SanitizationOptions {
  stripMetadata: boolean;
}
