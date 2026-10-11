import { ToolDefinition } from '../../../core/models/tool.model';

export const batchImageCompressorTool: ToolDefinition = {
  id: 'batch-image-compressor',
  name: 'Batch Image Compressor & WebP Converter',
  category: 'media',
  description:
    'Losslessly compress hundreds of photos and convert them to modern WebP with zero upload limits.',
  keywords: [
    'bulk image compressor no upload',
    'batch image compressor',
    'convert png to webp batch',
    'offline bulk image compressor',
    'compress images in browser',
    'client side webp converter',
    'batch photo optimizer',
  ],
  icon: 'image',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./batch-compressor.component').then((m) => m.BatchCompressorComponent),
};

export { BatchCompressorComponent } from './batch-compressor.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
