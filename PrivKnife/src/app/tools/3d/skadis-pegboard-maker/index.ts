import { ToolDefinition } from '../../../core/models/tool.model';

export const skadisPegboardMakerTool: ToolDefinition = {
  id: 'skadis-pegboard-maker',
  name: 'IKEA Skadis & Pegboard Hook & Holder Maker',
  category: '3d',
  description:
    'Generate precision 3D printable hooks, prongs, tool holsters, and shelf brackets with custom mounting lugs for IKEA Skådis slots or standard 1/4" pegboards.',
  keywords: [
    'ikea skadis hook generator 3d print pegboard stl holder',
    'skadis custom hook 3d print',
    'ikea skadis tool holder generator',
    '3d printable pegboard hooks stl',
    'standard pegboard shelf bracket 3d model',
    'skadis caliper holster 3mf',
    'dual prong pegboard hook generator',
    'skadis parts cup 3d print',
  ],
  icon: 'grid',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./skadis-pegboard-maker.component').then(
      (m) => m.SkadisPegboardMakerComponent
    ),
};

export { SkadisPegboardMakerComponent } from './skadis-pegboard-maker.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
