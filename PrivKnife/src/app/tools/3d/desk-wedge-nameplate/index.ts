import { ToolDefinition } from '../../../core/models/tool.model';

export const deskWedgeNameplateTool: ToolDefinition = {
  id: 'desk-wedge-nameplate',
  name: 'Parametric Desk Wedge & Nameplate Maker',
  category: '3d',
  description:
    'Design bespoke executive, technical, and medical desk signs with crisp parametric bevels and dual-color typography. Dual-material .3mf and .stl exports.',
  keywords: [
    'custom desk nameplate 3d print stl',
    'desk wedge 3d model generator',
    'dual color desk nameplate 3mf',
    '3d print office name plate free',
    'parametric desk sign generator',
    'bambu lab multi color desk wedge',
    'prusa mmu desk nameplate stl',
    'custom 3d printed office sign',
  ],
  icon: 'tag',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./desk-wedge-nameplate.component').then(
      (m) => m.DeskWedgeNameplateComponent
    ),
};
