import { ToolDefinition } from '../../../core/models/tool.model';

export const cookieCutterTool: ToolDefinition = {
  id: 'cookie-cutter-3d',
  name: 'Custom Cookie Cutter & Stamp 3D Maker',
  category: '3d',
  description:
    'Transform black-and-white silhouettes, custom logos, or artwork into dual-part 3D-printable cookie cutters and matching impression stamps. 100% in-browser.',
  keywords: [
    'custom cookie cutter stl maker',
    '3d print cookie cutter generator',
    'image to cookie cutter stl',
    'free custom stamp stl generator',
    'convert picture to cookie cutter',
    'cookie cutter 3mf',
    'baking 3d print stl',
  ],
  icon: 'cookie',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./cookie-cutter.component').then((m) => m.CookieCutterComponent),
};

export { CookieCutterComponent } from './cookie-cutter.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
