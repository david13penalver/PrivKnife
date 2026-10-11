export type PaperFormat = 'a4' | 'letter';
export type TentFoldType = 'bi-fold' | 'tri-fold';
export type Orientation = 'portrait' | 'landscape';
export type FontFamily = 'helvetica' | 'times' | 'courier';
export type TextAlignment = 'center' | 'left';

export interface ThemeColors {
  id: string;
  name: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
}

export interface PanelContent {
  title: string;
  subtitle: string;
  body: string;
  tableNumber?: string;
  qrUrl?: string;
  qrLabel?: string;
  logoDataUri?: string;
}

export interface TableTentConfig {
  paperFormat: PaperFormat;
  orientation: Orientation;
  foldType: TentFoldType;
  mirrorPanels: boolean;
  frontPanel: PanelContent;
  backPanel: PanelContent;
  theme: ThemeColors;
  fontFamily: FontFamily;
  alignment: TextAlignment;
  showFoldLines: boolean;
  showCutMarks: boolean;
  showTableNumberBadge: boolean;
  includeQrCode: boolean;
}

export interface PanelGeometry {
  index: number;
  label: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  rotationDeg: number;
  isBaseFlap?: boolean;
}

export interface FoldLineGeometry {
  yMm: number;
  label: string;
}

export interface TentGeometry {
  pageWidthMm: number;
  pageHeightMm: number;
  panels: PanelGeometry[];
  foldLines: FoldLineGeometry[];
}

export interface TableTentPreset {
  id: string;
  name: string;
  description: string;
  config: Partial<TableTentConfig>;
}
