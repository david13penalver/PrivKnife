import type { ToolDefinition } from '../../../core/models/tool.model';

export const funnelScoopMakerTool: ToolDefinition = {
  id: 'funnel-scoop-maker',
  name: "Vented Funnel & Measuring Scoop Maker",
  category: '3d',
  description: "Fit a funnel to your bottle or size a scoop by volume. Export STL and 3MF for 3D printing.",
  keywords: ["funnel", "scoop", "measuring", "STL", "3MF"],
  icon: '🥄',
  isFullyClientSide: true,
  loadComponent: () => import('./funnel-scoop-maker.component').then((m) => m.FunnelScoopMakerComponent),
};
