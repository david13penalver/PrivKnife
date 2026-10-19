import { ToolDefinition } from '../../../core/models/tool.model';

export const bankStatementConverterTool: ToolDefinition = {
  id: 'bank-statement-converter',
  name: 'Bank Statement CSV & OFX to Excel & QIF Converter',
  i18nKey: 'bankStatementConverter',
  category: 'dev',
  description:
    'Normalize chaotic bank exports, credit card statements, and OFX/QFX files into clean CSVs, Excel spreadsheets, and Quicken QIF exports 100% locally.',
  keywords: [
    'convert bank statement csv to excel ofx to qif converter free quickbooks',
    'bank statement converter',
    'ofx to excel',
    'qfx to csv',
    'csv to qif',
    'normalize bank statement',
    'clean bank csv',
  ],
  icon: 'credit-card',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./bank-statement-converter.component').then(
      (m) => m.BankStatementConverterComponent
    ),
};

export * from './types';
export * from './engine';
export * from './bank-statement-converter.component';
