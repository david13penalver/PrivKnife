import { ToolDefinition } from '../../../core/models/tool.model';

export const officeHtmlToPdfTool: ToolDefinition = {
  id: 'office-html-to-pdf',
  name: 'Office & HTML to PDF Local Converter',
  category: 'documents',
  description:
    'Convert Word (.docx), Excel (.xlsx), CSV, Markdown, and HTML files into searchable print-ready PDFs inside your browser with zero uploads or tracking leaks.',
  keywords: [
    'word to pdf',
    'docx to pdf',
    'excel to pdf',
    'xlsx to pdf',
    'html to pdf',
    'markdown to pdf',
    'offline converter',
  ],
  icon: 'file-text',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./office-html-to-pdf.component').then(
      (m) => m.OfficeHtmlToPdfComponent
    ),
};

export * from './types';
