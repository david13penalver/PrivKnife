import { ToolDefinition } from '../../../core/models/tool.model';

export const pdfRedactionTool: ToolDefinition = {
  id: 'pdf-redaction',
  name: 'PDF Redaction & Anonymizer',
  category: 'privacy',
  description:
    'Black out confidential paragraphs and flatten documents to destroy un-rendered text layers permanently.',
  keywords: [
    'pdf',
    'redact',
    'anonymize',
    'black out',
    'privacy',
    'flatten',
    'redact pdf online safe',
  ],
  icon: 'file-text',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./pdf-redaction.component').then((m) => m.PdfRedactionComponent),
};

export { PdfRedactionComponent } from './pdf-redaction.component';
export * from './types';
export * from './engine';
