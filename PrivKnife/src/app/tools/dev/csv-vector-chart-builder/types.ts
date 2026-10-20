export type ChartType =
  | 'vertical_bar'
  | 'horizontal_bar'
  | 'smooth_line'
  | 'stacked_area'
  | 'donut_pie';

export type ColorPalette =
  | 'corporate_slate'
  | 'electric_indigo'
  | 'emerald_growth'
  | 'sunset_gradient'
  | 'monochrome';

export type AspectRatio = '16:9' | '1:1' | '4:3';

export type ValueFormat = 'number' | 'currency' | 'percentage';

export interface CsvVectorChartBuilderOptions {
  chartType: ChartType;
  colorPalette: ColorPalette;
  chartTitle: string;
  chartSubtitle: string;
  showLegend: boolean;
  showDataLabels: boolean;
  showGridLines: boolean;
  aspectRatio: AspectRatio;
  valueFormat: ValueFormat;
  exportDpi: number;
}

export interface ChartSeries {
  name: string;
  values: number[];
}

export interface ParsedChartData {
  categories: string[];
  series: ChartSeries[];
  minValue: number;
  maxValue: number;
}

export interface CsvVectorChartBuilderResult {
  success: boolean;
  blob: Blob;
  fileName: string;
  fileSize: number;
  mimeType: string;
  metadata?: Record<string, unknown>;
}
