import { ToolDefinition } from '../../../core/models/tool.model';

export const pdfTableExtractorTool: ToolDefinition = {
  id: 'pdf-table-extractor',
  name: 'PDF to Excel, CSV & JSON Table Extractor',
  category: 'documents',
  description:
    'Extract structured tables from PDF ledgers, statements, and reports into multi-sheet .xlsx, .csv, .json, or clipboard TSV with interactive column split tuning and formula safety.',
  keywords: [
    'pdf to excel',
    'pdf to csv',
    'extract pdf tables',
    'pdf table extractor offline',
    'bank ledger to xlsx',
  ],
  icon: 'table-2',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./pdf-table-extractor.component').then(
      (m) => m.PdfTableExtractorComponent
    ),
};

export * from './types';
