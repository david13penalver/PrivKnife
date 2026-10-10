import { ToolDefinition } from '../../../core/models/tool.model';

export const csvConverterTool: ToolDefinition = {
  id: 'csv-to-sql-json',
  name: 'CSV / Excel to JSON, SQL & Markdown',
  category: 'dev',
  description:
    'Convert spreadsheets into structured JSON, SQL INSERT scripts, or Markdown tables offline with zero server roundtrips.',
  keywords: [
    'csv to json',
    'csv to sql',
    'excel to json',
    'csv to markdown',
    'excel to sql insert',
    'client side csv converter',
  ],
  icon: 'table',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./csv-converter.component').then((m) => m.CsvConverterComponent),
};

export { CsvConverterComponent } from './csv-converter.component';
export * from './types';
export * from './engine';
