import { ToolDefinition } from '../../../core/models/tool.model';

export const pdfCompressorTool: ToolDefinition = {
  id: 'pdf-compressor',
  name: 'Client-Side PDF Compressor & Image Downsampler',
  category: 'documents',
  description:
    'Shrink bloated PDF files by up to 80% directly in your browser. Downsample embedded images while keeping selectable vector text and zero server uploads.',
  keywords: [
    'compress pdf',
    'reduce pdf file size',
    'pdf compressor no upload',
    'downsample pdf images',
    'client side pdf compressor',
    'shrink pdf offline',
  ],
  icon: 'file-down',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./pdf-compressor.component').then((m) => m.PdfCompressorComponent),
};

export * from './types';
