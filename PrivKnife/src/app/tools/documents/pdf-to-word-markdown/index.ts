import { ToolDefinition } from '../../../core/models/tool.model';

export const pdfToWordMarkdownTool: ToolDefinition = {
  id: 'pdf-to-word-markdown',
  name: 'PDF to Word (DOCX) & Markdown Layout Converter',
  category: 'documents',
  description:
    'Convert digital PDFs into editable Word (.docx) documents, structured Markdown (.md), and clean text with heading, list, and paragraph reflow 100% locally.',
  keywords: [
    'pdf to word',
    'pdf to docx',
    'pdf to markdown',
    'convert pdf to word offline',
    'extract pdf to obsidian markdown',
  ],
  icon: 'file-type',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./pdf-to-word-markdown.component').then(
      (m) => m.PdfToWordMarkdownComponent
    ),
};

export * from './types';
