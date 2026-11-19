import { ToolDefinition } from '../../../core/models/tool.model';

export const pdfWatermarkNumberingTool: ToolDefinition = {
  id: 'pdf-watermark-numbering',
  name: 'PDF Watermark, Page Numbers & Bates Stamper',
  category: 'documents',
  description:
    'Stamp diagonal or tiled watermarks, page numbers, and sequential legal Bates identifiers onto PDFs 100% locally in your browser.',
  keywords: [
    'watermark pdf',
    'add page numbers to pdf',
    'bates numbering pdf',
    'stamp pdf confidential',
    'client side pdf watermark',
  ],
  icon: 'stamp',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./pdf-watermark-numbering.component').then(
      (m) => m.PdfWatermarkNumberingComponent
    ),
};

export * from './types';
