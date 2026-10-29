import { ToolDefinition } from '../../../core/models/tool.model';

export const localOcrTextExtractorTool: ToolDefinition = {
  id: 'local-ocr-text-extractor',
  name: 'Local OCR Image & Scanned PDF to Text & Word',
  i18nKey: 'localOcrTextExtractor',
  category: 'documents',
  description:
    'Extract editable text, tables, and paragraphs from photos, invoices, and scanned multi-page PDFs locally in your browser with zero server uploads.',
  keywords: [
    'ocr image to text free offline client side scanned pdf to word',
    'ocr pdf to text',
    'image to text converter',
    'offline ocr',
    'scanned pdf to docx',
    'extract text from photo',
    'private ocr',
  ],
  icon: 'file-text',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./local-ocr-text-extractor.component').then(
      (m) => m.LocalOcrTextExtractorComponent
    ),
};

export * from './types';
export * from './engine';
export * from './local-ocr-text-extractor.component';
