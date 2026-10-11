import { ToolDefinition } from '../../../core/models/tool.model';

export const cssMeshGradientMakerTool: ToolDefinition = {
  id: 'css-mesh-gradient-maker',
  name: 'CSS Mesh Gradient & Glassmorphism Code Maker',
  category: 'dev',
  description:
    'Design fluid multi-point radial mesh gradients and frosted glassmorphism UI cards with copy-ready Pure CSS and Tailwind code.',
  keywords: [
    'css mesh gradient generator',
    'glassmorphism generator',
    'css backdrop-filter blur tool',
    'tailwind glassmorphism classes',
    'mesh gradient to png export',
    'fluid gradient maker offline',
    'client side css gradient designer',
  ],
  icon: 'layers',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./mesh-gradient-maker.component').then(
      (m) => m.MeshGradientMakerComponent
    ),
};

export { MeshGradientMakerComponent } from './mesh-gradient-maker.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
