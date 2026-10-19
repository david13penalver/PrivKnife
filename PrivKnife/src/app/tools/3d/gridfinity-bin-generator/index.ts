import { ToolDefinition } from '../../../core/models/tool.model';

export const gridfinityBinGeneratorTool: ToolDefinition = {
  id: 'gridfinity-bin-generator',
  name: 'Gridfinity & Modular Drawer Bin Generator',
  category: '3d',
  description:
    'Parametric 3D printable bins conforming to Zack Freedman’s open-source Gridfinity standard. Custom unit sizes, internal dividers, scoops, and label tabs.',
  keywords: [
    'gridfinity bin generator stl 3d print modular drawer',
    'custom gridfinity bins',
    'gridfinity generator online',
    '3d printable drawer organizer',
    'zack freedman gridfinity stl',
    'gridfinity divider bin 3mf',
    'bambu gridfinity generator',
    'modular workshop storage 3d print',
  ],
  icon: 'box',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./gridfinity-bin-generator.component').then(
      (m) => m.GridfinityBinGeneratorComponent
    ),
};

export { GridfinityBinGeneratorComponent } from './gridfinity-bin-generator.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
