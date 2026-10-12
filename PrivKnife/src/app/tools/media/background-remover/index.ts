import { ToolDefinition } from '../../../core/models/tool.model';

export const backgroundRemoverTool: ToolDefinition = {
  id: 'background-remover',
  name: 'Automated Background Removal (High Quality)',
  category: 'media',
  description:
    'Instant, client-side background removal producing clean transparent .png cutouts. 100% in-browser with zero server uploads and zero watermarks.',
  keywords: [
    'remove background free',
    'remove background from product photo',
    'remove background free no watermark',
    'transparent png converter',
    'car photo background remover',
    'client side background remover',
    'free background eraser',
    'chroma key background remover',
    'ecommerce photo cut out free',
  ],
  icon: 'scissors',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./background-remover.component').then(
      (m) => m.BackgroundRemoverComponent
    ),
};
