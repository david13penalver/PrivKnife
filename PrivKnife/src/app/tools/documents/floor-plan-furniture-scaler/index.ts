import { ToolDefinition } from '../../../core/models/tool.model';

export const floorPlanFurnitureScalerTool: ToolDefinition = {
  id: 'floor-plan-furniture-scaler',
  name: 'Interactive 2D Floor Plan & Room Furniture Scaler',
  i18nKey: 'floorPlanFurnitureScaler',
  category: 'documents',
  description:
    'Draft scaled architectural walls, position real-dimension furniture items, verify clearance zones, and export print-ready blueprints or vector SVGs.',
  keywords: [
    '2d floor plan maker free online room layout furniture scale blueprint pdf',
    'floor plan maker',
    'room furniture scaler',
    'blueprint creator',
    'floor plan scaler',
    'architectural blueprint',
    'room layout planner',
  ],
  icon: 'layout',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./floor-plan-furniture-scaler.component').then(
      (m) => m.FloorPlanFurnitureScalerComponent
    ),
};

export * from './types';
export * from './engine';
export * from './floor-plan-furniture-scaler.component';
