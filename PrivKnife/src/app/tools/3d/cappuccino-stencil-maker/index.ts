import { ToolDefinition } from '../../../core/models/tool.model';

export const cappuccinoStencilMakerTool: ToolDefinition = {
  id: 'cappuccino-stencil-maker',
  name: 'Cappuccino Stencil & Airbrush Template Maker',
  category: '3d',
  description:
    'Turn coffee art motifs, pet silhouettes, and custom text into food-safe 3D printable stencils and laser-cut vector templates with automatic island bridging.',
  keywords: [
    'cappuccino stencil generator 3d print stl svg coffee template',
    'latte art stencil 3d print',
    'food safe coffee stencil stl',
    'laser cut stencil svg',
    'airbrush template generator',
    'cappuccino duster stencil maker',
  ],
  icon: 'coffee',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./cappuccino-stencil-maker.component').then(
      (m) => m.CappuccinoStencilMakerComponent
    ),
};

export { CappuccinoStencilMakerComponent } from './cappuccino-stencil-maker.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
