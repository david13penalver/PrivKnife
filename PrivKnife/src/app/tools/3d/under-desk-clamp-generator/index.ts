import { ToolDefinition } from '../../../core/models/tool.model';

export const underDeskClampGeneratorTool: ToolDefinition = {
  id: 'under-desk-clamp-generator',
  name: 'Under-Desk Clamp & Cable Management Generator',
  category: '3d',
  description:
    'Generate heavy-duty parametric C-clamps with 3D-printable trapezoidal screw threads, clamping bolt knobs, and customizable attachments for headphones, cable raceways, power strips, and beverages.',
  keywords: [
    'under desk clamp 3d print generator stl cable raceway headphone hook',
    '3d printed desk clamp stl',
    'headphone hanger clamp generator',
    'cable management raceway under desk 3d print',
    'parametric c clamp threaded bolt 3d model',
    'power strip under desk mount 3mf',
    'desk edge cup holder 3d print',
    'trapezoidal thread 3d printable screw bolt',
  ],
  icon: 'wrench',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./under-desk-clamp-generator.component').then(
      (m) => m.UnderDeskClampGeneratorComponent
    ),
};

export { UnderDeskClampGeneratorComponent } from './under-desk-clamp-generator.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
