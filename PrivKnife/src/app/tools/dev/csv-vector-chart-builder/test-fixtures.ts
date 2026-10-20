import { CsvVectorChartBuilderOptions } from './types';

export const DEFAULT_CHART_OPTIONS: CsvVectorChartBuilderOptions = {
  chartType: 'vertical_bar',
  colorPalette: 'electric_indigo',
  chartTitle: 'Quarterly Revenue Performance ($)',
  chartSubtitle: 'Comparative analysis of 2024 Actual vs 2025 Projected',
  showLegend: true,
  showDataLabels: true,
  showGridLines: true,
  aspectRatio: '16:9',
  valueFormat: 'currency',
  exportDpi: 300,
};

export const SAMPLE_REVENUE_CSV = `Quarter,2024 Actual,2025 Projected
Q1,120000,165000
Q2,145000,190000
Q3,180000,240000
Q4,220000,310000`;

export const SAMPLE_MARKET_SHARE_CSV = `Browser,Market Share (%)
Chrome,65.2
Safari,18.8
Edge,5.4
Firefox,3.1
Other,7.5`;

export const SAMPLE_TRAFFIC_CSV = `Month,Visitors,Signups
Jan,4500,320
Feb,5200,410
Mar,6100,540
Apr,7300,680
May,8900,820
Jun,10500,990`;
