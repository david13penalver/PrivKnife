export type GridStyle = 'dot' | 'square' | 'isometric' | 'hexagonal' | 'ruled';
export type PaperSize = 'a4' | 'letter' | 'legal' | 'a3' | 'a5' | 'custom';
export type PaperOrientation = 'portrait' | 'landscape';
export type GridUnit = 'mm' | 'cm' | 'in';

export interface PaperColorPreset {
  id: string;
  name: string;
  hex: string;
}

export const PAPER_COLOR_PRESETS: PaperColorPreset[] = [
  { id: 'slate', name: 'Muted Slate', hex: '#94a3b8' },
  { id: 'light-gray', name: 'Light Gray (Subtle)', hex: '#cbd5e1' },
  { id: 'blueprint', name: 'Blueprint Cyan', hex: '#0284c7' },
  { id: 'sepia', name: 'Warm Sepia', hex: '#a16207' },
  { id: 'charcoal', name: 'Dark Charcoal', hex: '#334155' },
  { id: 'black', name: 'Deep Black', hex: '#0f172a' },
];

export interface GridPaperOptions {
  gridStyle: GridStyle;
  paperSize: PaperSize;
  customWidth: number; // in mm
  customHeight: number; // in mm
  orientation: PaperOrientation;
  spacing: number; // in mm
  strokeColor: string; // hex
  strokeOpacity: number; // 0.1 to 1.0
  strokeWidth: number; // in pt (0.1 to 3)
  dotRadius: number; // in mm (0.1 to 1.5)
  marginTop: number; // in mm
  marginBottom: number; // in mm
  marginLeft: number; // in mm
  marginRight: number; // in mm
  accentMajorLines: boolean;
  majorInterval: number; // e.g. every 5th line
  majorStrokeWidth: number; // in pt
  marginLine: boolean; // vertical margin guide line for ruled paper
}

export interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isMajor?: boolean;
}

export interface GridPoint {
  x: number;
  y: number;
}

export interface GridGeometry {
  paperWidthMm: number;
  paperHeightMm: number;
  printableX: number;
  printableY: number;
  printableWidth: number;
  printableHeight: number;
  dots: GridPoint[];
  lines: LineSegment[];
}

export interface PaperPreset {
  id: string;
  name: string;
  description: string;
  options: Partial<GridPaperOptions>;
}
