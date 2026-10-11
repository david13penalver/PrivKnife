export type PaperSize = 'a4' | 'letter';
export type Orientation = 'portrait' | 'landscape';
export type ColumnCount = 2 | 3 | 4;

export type CheatsheetPresetKey = 'python' | 'git' | 'javascript' | 'math';

export interface CheatsheetConfig {
  title: string;
  subtitle: string;
  markdownContent: string;
  paperSize: PaperSize;
  orientation: Orientation;
  columns: ColumnCount;
  fontSizePt: number;
  accentColor: string;
  includeFooter: boolean;
}
