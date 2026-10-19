import { ToolDefinition } from '../../../core/models/tool.model';

export const keycapSwitchTesterMakerTool: ToolDefinition = {
  id: 'keycap-switch-tester-maker',
  name: 'Custom Mechanical Keycap & Switch Tester Maker',
  category: '3d',
  description:
    'Parametrically generate Cherry, OEM, DSA, and SA mechanical keycaps with custom legends and calibrated MX stems, or modular snap-in switch tester desk trays.',
  keywords: [
    'custom keycap stl 3d print mechanical keyboard switch tester',
    'cherry mx keycap 3d print',
    'switch tester stl',
    'custom keycap maker 3mf',
    'dsa keycap 3d print',
    'oem profile keycap stl',
    'artisan keycap 3d model generator',
  ],
  icon: 'keyboard',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./keycap-switch-tester-maker.component').then(
      (m) => m.KeycapSwitchTesterMakerComponent
    ),
};

export { KeycapSwitchTesterMakerComponent } from './keycap-switch-tester-maker.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
