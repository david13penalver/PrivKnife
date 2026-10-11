import { ToolDefinition } from '../../../core/models/tool.model';

export const gridPaperTool: ToolDefinition = {
  id: 'graph-dot-grid-paper',
  name: 'Custom Printable Graph & Dot Grid Paper',
  category: 'documents',
  description:
    'Generate high-precision vector grid, dot, isometric, hexagonal, and ruled paper customized for printing.',
  keywords: [
    'printable dot grid paper pdf',
    'custom graph paper generator',
    'a4 dot grid pdf download',
    'printable isometric paper 5mm',
    'bullet journal refill printable pdf',
    'hexagonal grid printable',
    'ruled paper pdf',
  ],
  icon: 'grid',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./grid-paper.component').then((m) => m.GridPaperComponent),
};

export { GridPaperComponent } from './grid-paper.component';
export * from './types';
export * from './engine';
