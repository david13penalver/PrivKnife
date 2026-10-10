import { ToolDefinition } from '../../../core/models/tool.model';

export const pdfMergerTool: ToolDefinition = {
  id: 'pdf-merger-splitter',
  name: 'PDF Merger, Splitter & Page Organizer',
  category: 'documents',
  description:
    'Combine multiple PDF files, delete sensitive pages, or rotate sheets 100% locally in browser memory with zero upload limits.',
  keywords: [
    'merge pdf',
    'combine pdf',
    'split pdf',
    'organize pdf pages',
    'rotate pdf',
    'client side pdf merger',
  ],
  icon: 'files',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./pdf-merger.component').then((m) => m.PdfMergerComponent),
};

export { PdfMergerComponent } from './pdf-merger.component';
export * from './types';
export * from './engine';
