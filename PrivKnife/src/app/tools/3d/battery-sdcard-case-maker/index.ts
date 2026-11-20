import { ToolDefinition } from '../../../core/models/tool.model';

export const batterySdcardCaseMakerTool: ToolDefinition = {
  id: 'battery-sdcard-case-maker',
  i18nKey: 'batterySdcardCaseMaker',
  name: 'Parametric Battery Dispenser & Memory Card Case Maker',
  category: '3d',
  description:
    'Generate support-free gravity battery dispensers (AAA–21700) and custom SD, MicroSD, CFexpress, Switch & USB cases as manifold .STL and dual-color .3MF files locally.',
  keywords: [
    'battery dispenser stl',
    '18650 dispenser 3d print',
    '21700 battery rack',
    'sd card case 3d print',
    'microsd organizer 3mf',
    'parametric 3d print case',
  ],
  icon: '🔋',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./battery-sdcard-case-maker.component').then(
      (m) => m.BatterySdcardCaseMakerComponent
    ),
};
