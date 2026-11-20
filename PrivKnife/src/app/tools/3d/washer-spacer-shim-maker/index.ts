import { ToolDefinition } from '../../../core/models/tool.model';

export const washerSpacerShimMakerTool: ToolDefinition = {
  id: 'washer-spacer-shim-maker',
  name: 'Parametric Washer, Spacer, Standoff, Shim & Bushing Maker',
  category: '3d',
  description:
    'Print exact caliper-dimensioned washers, flanged bushings, PCB/VESA hex standoffs, leveling wedges, and U-slot shims with multi-copy plates as .STL & .3MF.',
  keywords: [
    'washer generator',
    'spacer',
    'standoff',
    'bushing',
    'leveling wedge',
    'u-slot shim',
    '3d print',
    'stl',
    '3mf',
  ],
  icon: '🔩',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./washer-spacer-shim-maker.component').then((m) => m.WasherSpacerShimMakerComponent),
};
