import { ToolDefinition } from '../../../core/models/tool.model';

export const deviceWallCradleMakerTool: ToolDefinition = {
  id: 'device-wall-cradle-maker',
  name: 'Parametric Device Wall Mount & Power-Brick Cradle Maker',
  category: '3d',
  description:
    'Design ventilated under-desk slide rails, U-wrap power brick cradles, and remote wall pockets with countersunk wood-screw flanges as support-free .STL & .3MF.',
  keywords: [
    'under desk mount',
    'power brick cradle',
    'mini pc bracket',
    'router wall mount',
    'countersunk',
    '3d print',
    'stl',
    '3mf',
  ],
  icon: '🔌',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./device-wall-cradle-maker.component').then(
      (m) => m.DeviceWallCradleMakerComponent
    ),
};
