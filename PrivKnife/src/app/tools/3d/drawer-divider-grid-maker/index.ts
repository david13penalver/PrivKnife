import { ToolDefinition } from '../../../core/models/tool.model';

export const drawerDividerGridMakerTool: ToolDefinition = {
  id: 'drawer-divider-grid-maker',
  i18nKey: 'drawerDividerGridMaker',
  name: 'Parametric Custom Drawer Divider & Interlocking Grid Maker',
  category: '3d',
  description:
    'Design wall-to-wall interlocking half-lap drawer dividers with custom compartment ratios and automatic dovetail bed splits as flat .STL, .3MF & plate .ZIP locally.',
  keywords: [
    'drawer divider stl',
    'interlocking grid 3d print',
    'dovetail drawer partition generator',
    'custom drawer organizer 3mf',
    'half lap divider 3d print',
  ],
  icon: '📐',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./drawer-divider-grid-maker.component').then(
      (m) => m.DrawerDividerGridMakerComponent
    ),
};
