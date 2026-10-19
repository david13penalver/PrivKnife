import { ToolDefinition } from '../../../core/models/tool.model';

export const facePlateBlurTool: ToolDefinition = {
  id: 'face-plate-blur',
  name: 'Face & License Plate Privacy Blur Tool',
  i18nKey: 'facePlateBlur',
  category: 'privacy',
  description:
    'Permanently pixelate or blackout faces, street signs, and vehicle license plates with client-side canvas censoring and 100% EXIF/GPS metadata stripping.',
  keywords: [
    'face blur',
    'license plate blur',
    'privacy censor',
    'pixelate face',
    'blackout photo',
    'strip exif',
    'blur photo online',
  ],
  icon: 'shield-alert',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./face-plate-blur.component').then((m) => m.FacePlateBlurComponent),
};

export * from './types';
export * from './engine';
export * from './face-plate-blur.component';
