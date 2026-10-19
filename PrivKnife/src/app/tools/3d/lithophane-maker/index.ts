import { ToolDefinition } from '../../../core/models/tool.model';

export const lithophaneMakerTool: ToolDefinition = {
  id: 'lithophane-maker',
  name: 'Curved & Flat 3D Lithophane Maker',
  category: '3d',
  description:
    'Turn digital photos into high-detail 3D printable lithophanes with flat, curved arc, 360° cylindrical, and nightlight geometries with real-time backlit preview.',
  keywords: [
    'lithophane stl generator online free 3d print curved',
    'curved lithophane generator',
    'cylinder lithophane maker 3d print',
    'nightlight lithophane stl',
    'photo to 3d print stl',
    'bambu lithophane generator',
    'prusa lithophane maker',
    'backlit 3d photo print',
  ],
  icon: 'image',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./lithophane-maker.component').then(
      (m) => m.LithophaneMakerComponent
    ),
};

export { LithophaneMakerComponent } from './lithophane-maker.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
