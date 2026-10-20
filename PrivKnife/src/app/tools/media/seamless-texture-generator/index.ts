import { ToolDefinition } from '../../../core/models/tool.model';

export const seamlessTextureGeneratorTool: ToolDefinition = {
  id: 'seamless-texture-generator',
  name: 'Seamless Tileable Texture & Pattern Generator',
  i18nKey: 'seamlessTextureGenerator',
  category: 'media',
  description:
    'Transform ordinary photos into seamless repeating 3D textures with edge crossfading, Sobel normal map generation, and live tiled viewport preview.',
  keywords: [
    'seamless texture generator online tileable pattern normal map 3d texture',
    'seamless texture',
    'tileable texture',
    'texture generator',
    'normal map generator',
    'pattern maker',
    '3d texture maker',
    'seamless pattern',
  ],
  icon: 'grid',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./seamless-texture-generator.component').then(
      (m) => m.SeamlessTextureGeneratorComponent
    ),
};

export * from './types';
export * from './engine';
export * from './seamless-texture-generator.component';
