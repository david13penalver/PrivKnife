import { ToolDefinition } from '../../../core/models/tool.model';

export const csvVectorChartBuilderTool: ToolDefinition = {
  id: 'csv-vector-chart-builder',
  name: 'CSV / Paste to Vector Chart & Infographic Builder',
  i18nKey: 'csvVectorChartBuilder',
  category: 'dev',
  description:
    'Convert copied spreadsheet tables or CSV files into publication-grade vector charts (bar, line, stacked area, donut) with designer color palettes and SVG/PNG/PDF downloads.',
  keywords: [
    'csv to vector chart maker free infographic generator svg pdf presentation chart',
    'csv to chart',
    'vector chart builder',
    'infographic generator',
    'svg chart maker',
    'bar chart maker',
    'donut chart generator',
    'spreadsheet to chart',
  ],
  icon: 'bar-chart-2',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./csv-vector-chart-builder.component').then(
      (m) => m.CsvVectorChartBuilderComponent
    ),
};

export * from './types';
export * from './engine';
export * from './csv-vector-chart-builder.component';
