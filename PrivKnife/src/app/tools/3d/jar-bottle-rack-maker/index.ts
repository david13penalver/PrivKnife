import type { ToolDefinition } from '../../../core/models/tool.model';

export const jarBottleRackMakerTool: ToolDefinition = {
  id: 'jar-bottle-rack-maker',
  name: "Spice Jar, Paint Bottle & Coffee Pod Rack Maker",
  category: '3d',
  description: "Size stepped stands, honeycomb trays, and slide-in pod tracks. Export STL or modular 3MF.",
  keywords: ["spice rack", "paint bottle", "coffee pod", "STL", "3MF"],
  icon: '🧴',
  isFullyClientSide: true,
  loadComponent: () => import('./jar-bottle-rack-maker.component').then((m) => m.JarBottleRackMakerComponent),
};
