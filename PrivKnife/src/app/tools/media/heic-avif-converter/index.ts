import { ToolDefinition } from '../../../core/models/tool.model';

export const heicAvifConverterTool: ToolDefinition = {
  id: 'heic-avif-converter',
  name: 'HEIC & AVIF to JPG/PNG Batch Converter',
  category: 'media',
  description:
    'Convert Apple HEIC/HEIF photos and modern AVIF files into universal JPEG, PNG, or WebP formats locally in browser memory. Up to 100 images in parallel with zero server uploads.',
  keywords: [
    'convert heic to jpg online batch free avif to png no upload',
    'heic to jpg batch converter',
    'heic to png converter free',
    'avif to jpg converter',
    'avif to png client side',
    'apple heic converter private',
  ],
  icon: 'images',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./heic-avif-converter.component').then(
      (m) => m.HeicAvifConverterComponent
    ),
};

export { HeicAvifConverterComponent } from './heic-avif-converter.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
