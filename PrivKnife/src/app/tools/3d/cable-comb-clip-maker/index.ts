import { ToolDefinition } from '../../../core/models/tool.model';

export const cableCombClipMakerTool: ToolDefinition = {
  id: 'cable-comb-clip-maker',
  name: 'Parametric Cable Comb, Travel Cord Winder & Wall Clip Maker',
  category: '3d',
  description:
    'Size wire-gauge-calibrated desk cable combs, two-piece travel USB-C cord winders, and batch wall P-clip arrays with teardrop snap detents as .STL & .3MF.',
  keywords: [
    'cable comb',
    'cord winder',
    'wall p-clip',
    'cable organizer',
    'usb spool',
    '3d print',
    'stl',
    '3mf',
  ],
  icon: '🧵',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./cable-comb-clip-maker.component').then(
      (m) => m.CableCombClipMakerComponent
    ),
};
