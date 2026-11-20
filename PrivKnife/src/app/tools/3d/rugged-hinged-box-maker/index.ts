import { ToolDefinition } from '../../../core/models/tool.model';

export const ruggedHingedBoxMakerTool: ToolDefinition = {
  id: 'rugged-hinged-box-maker',
  i18nKey: 'ruggedHingedBoxMaker',
  name: 'Parametric Rugged Hinged Storage Box & Parts Organizer',
  category: '3d',
  description:
    'Design custom rugged hinged cases with exterior ribs, M3/print-in-place hinges, compliant snap latches, divider grids, and TPU gaskets as .STL and multi-material .3MF.',
  keywords: [
    'rugged box 3d print',
    'hinged parts organizer stl',
    'waterproof 3d printed case tpu gasket',
    'parametric storage box 3mf',
    'm3 screw hinge case generator',
  ],
  icon: '🧰',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./rugged-hinged-box-maker.component').then(
      (m) => m.RuggedHingedBoxMakerComponent
    ),
};
