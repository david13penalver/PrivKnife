export type BarcodeSymbology = 'CODE128' | 'EAN13' | 'UPC' | 'CODE39' | 'QR';
export type DataInputMode = 'single' | 'sequence' | 'csv';
export type PaperFormat = 'letter' | 'a4' | 'custom';

export interface LabelTemplate {
  id: string;
  name: string;
  description: string;
  paperFormat: PaperFormat;
  paperWidthMm: number;
  paperHeightMm: number;
  columns: number;
  rows: number;
  labelWidthMm: number;
  labelHeightMm: number;
  marginTopMm: number;
  marginLeftMm: number;
  pitchHorizontalMm: number;
  pitchVerticalMm: number;
}

export interface LabelItem {
  value: string;
  title?: string;
  subtext?: string;
}

export interface LabelPosition {
  index: number;
  row: number;
  col: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface SequenceConfig {
  prefix: string;
  startNumber: number;
  count: number;
  digits: number;
  suffix: string;
}

export interface LabelSheetConfig {
  template: LabelTemplate;
  symbology: BarcodeSymbology;
  dataMode: DataInputMode;
  items: LabelItem[];
  singleItem: LabelItem;
  sequenceConfig: SequenceConfig;
  startOffsetIndex: number;
  showGuideLines: boolean;
  showHumanReadableBarcode: boolean;
  titleFontSize: number;
  subtextFontSize: number;
}
