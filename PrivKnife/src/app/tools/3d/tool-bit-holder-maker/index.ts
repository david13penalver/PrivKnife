import { ToolDefinition } from '../../../core/models/tool.model';

export const toolBitHolderMakerTool: ToolDefinition = {
  id: 'tool-bit-holder-maker',
  name: 'Parametric Tool, Drill Bit, Hex Key & Nozzle Organizer Maker',
  category: '3d',
  description:
    'Design stepped drill bit, 1/4" hex bit, Allen key, and 3D printer nozzle racks with tolerance calibration, magnet pockets, and dual-color labels as .STL & .3MF.',
  keywords: [
    'drill bit holder',
    'hex bit rack',
    'allen key holder',
    'nozzle organizer',
    'skadis',
    '3d print',
    'stl',
    '3mf',
  ],
  icon: '🔧',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./tool-bit-holder-maker.component').then((m) => m.ToolBitHolderMakerComponent),
};
