import { ToolDefinition } from '../../../core/models/tool.model';

export const electronicsBoxEnclosureTool: ToolDefinition = {
  id: 'electronics-box-enclosure',
  name: 'Parametric Electronics Box & Snap-Fit Enclosure',
  category: '3d',
  description:
    'Generate custom two-part 3D printable enclosures for DIY electronics, microcontrollers (Arduino, ESP32, Raspberry Pi Pico), and PCBs with snap-fit or screw joints.',
  keywords: [
    'parametric electronics box stl 3d print enclosure snap fit',
    '3d printed project box generator',
    'arduino uno enclosure 3d print',
    'esp32 case generator stl',
    'raspberry pi pico snap fit case',
    'custom pcb enclosure 3d model',
    'bambu electronics enclosure 3mf',
    'screw boss standoff electronics box',
  ],
  icon: 'cpu',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./electronics-box-enclosure.component').then(
      (m) => m.ElectronicsBoxEnclosureComponent
    ),
};

export { ElectronicsBoxEnclosureComponent } from './electronics-box-enclosure.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
