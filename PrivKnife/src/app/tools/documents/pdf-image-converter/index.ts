import { ToolDefinition } from '../../../core/models/tool.model';

export const pdfImageConverterTool: ToolDefinition = {
  id: 'pdf-image-converter',
  name: 'PDF to Images & Images to PDF Studio',
  category: 'documents',
  description:
    'Convert PDF pages to high-DPI PNG, JPG, or WebP images—or combine and reorder photos with scan enhancement into a PDF—100% locally.',
  keywords: [
    'pdf to jpg',
    'pdf to png',
    'pdf to webp',
    'images to pdf',
    'jpg to pdf',
    'scan to pdf',
    'client side pdf converter',
  ],
  icon: 'images',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./pdf-image-converter.component').then(
      (m) => m.PdfImageConverterComponent
    ),
};

export * from './types';
