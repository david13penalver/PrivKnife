import { ToolDefinition } from '../../../core/models/tool.model';

export const geometricPlantPotTool: ToolDefinition = {
  id: 'geometric-plant-pot',
  name: 'Geometric Plant Pot & Self-Watering Planter',
  category: '3d',
  description:
    'Generate modern faceted, twisted, or ribbed plant pots with sub-irrigation reservoir inserts, wick slots, and matching drip saucers.',
  keywords: [
    'geometric plant pot 3d print stl self watering planter',
    'twisted vase mode plant pot 3d print',
    'self watering planter stl generator',
    'faceted geometric succulent planter 3d print',
    'plant pot with saucer stl',
    'sub irrigation plant pot 3mf',
    'custom planter generator 3d print',
  ],
  icon: 'flower',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./geometric-plant-pot.component').then(
      (m) => m.GeometricPlantPotComponent
    ),
};

export { GeometricPlantPotComponent } from './geometric-plant-pot.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
