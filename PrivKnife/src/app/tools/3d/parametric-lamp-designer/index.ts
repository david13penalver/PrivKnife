import { ToolDefinition } from '../../../core/models/tool.model';

export const parametricLampDesignerTool: ToolDefinition = {
  id: 'parametric-lamp-designer',
  name: '3D Parametric Lamp & Lampshade Designer',
  category: '3d',
  description:
    'Design custom spiral, ribbed, fluted, and organic lampshades with standard E27/E14 socket mounts. Watertight shell and spiralize vase mode STL & 3MF exports.',
  keywords: [
    '3d printed lamp shade generator parametric stl',
    'custom lampshade 3d print',
    'spiral vase mode lamp shade stl',
    'e27 socket lampshade generator',
    'parametric lighting 3d print',
    'bambu lab lampshade 3mf',
    'prusa vase mode lamp',
    'organic fluted lampshade 3d model',
  ],
  icon: 'sun',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./parametric-lamp-designer.component').then(
      (m) => m.ParametricLampDesignerComponent
    ),
};

export { ParametricLampDesignerComponent } from './parametric-lamp-designer.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
