import { ToolDefinition } from '../../../core/models/tool.model';

export const petIdTagGeneratorTool: ToolDefinition = {
  id: 'pet-id-tag-generator',
  name: 'Pet ID Tag & Collar Slide-On Generator',
  category: '3d',
  description:
    'Generate stylish, rattle-free 3D printable pet tags in traditional hanging charm shapes or curved silent collar slide-on bands with high-contrast dual-color typography.',
  keywords: [
    'pet id tag 3d print stl dog tag generator collar slide on',
    'custom dog tag 3d print',
    'collar slide on pet tag stl',
    'silent pet id tag 3mf',
    'dual color pet tag 3d model',
    'cat id tag 3d print',
  ],
  icon: 'tag',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./pet-id-tag-generator.component').then(
      (m) => m.PetIdTagGeneratorComponent
    ),
};

export { PetIdTagGeneratorComponent } from './pet-id-tag-generator.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
