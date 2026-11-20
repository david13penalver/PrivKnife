import type { ToolDefinition } from '../../../core/models/tool.model';

export const threadedTubePillOrganizerTool: ToolDefinition = {
  id: 'threaded-tube-pill-organizer',
  name: "Threaded Tube, Desiccant Pod & Pill Organizer",
  category: '3d',
  description: "Design screw-top tubes, ventilated spool pods, and sliding weekly organizers in STL and 3MF.",
  keywords: ["threaded tube", "desiccant pod", "pill organizer", "STL", "3MF"],
  icon: '🫙',
  isFullyClientSide: true,
  loadComponent: () => import('./threaded-tube-pill-organizer.component').then((m) => m.ThreadedTubePillOrganizerComponent),
};
