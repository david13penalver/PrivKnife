import { ToolDefinition } from '../../../core/models/tool.model';

export const svgOptimizerCleanerTool: ToolDefinition = {
  id: 'svg-optimizer-cleaner',
  name: 'SVG Optimizer, Path Cleaner & React/Vue Exporter',
  i18nKey: 'svgOptimizerCleaner',
  category: 'dev',
  description:
    'Minify bloated SVGs, strip metadata and editor attributes, round coordinates, and convert to React JSX/TSX or Vue 3 SFC components locally.',
  keywords: [
    'svg optimizer online path cleaner convert svg to react vue jsx component',
    'svg optimizer',
    'svg minifier',
    'svg to react',
    'svg to jsx',
    'svg to vue',
    'clean svg path',
    'svgo online',
  ],
  icon: 'code',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./svg-optimizer-cleaner.component').then(
      (m) => m.SvgOptimizerCleanerComponent
    ),
};

export * from './types';
export * from './engine';
export * from './svg-optimizer-cleaner.component';
