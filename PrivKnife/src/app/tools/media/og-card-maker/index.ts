import { ToolDefinition } from '../../../core/models/tool.model';

export const ogCardMakerTool: ToolDefinition = {
  id: 'og-card-maker',
  name: 'Social Share (Open Graph) Card Maker',
  category: 'media',
  description:
    'Generate high-CTR 1200×630 Open Graph preview cards for Twitter, Facebook, and LinkedIn in seconds.',
  keywords: [
    'og image generator online',
    'open graph card maker',
    'twitter card generator 1200x630',
    'github social preview generator',
    'linkedin card builder',
    'social share preview card',
    'client side social card generator',
  ],
  icon: 'image',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./og-card-maker.component').then((m) => m.OgCardMakerComponent),
};

export { OgCardMakerComponent } from './og-card-maker.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
