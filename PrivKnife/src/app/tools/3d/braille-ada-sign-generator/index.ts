import { ToolDefinition } from '../../../core/models/tool.model';

export const brailleAdaSignGeneratorTool: ToolDefinition = {
  id: 'braille-ada-sign-generator',
  name: 'Braille & ADA Tactile Door Sign Generator',
  category: '3d',
  description:
    'Generate 100% ADA-compliant room signage featuring 1/32" raised tactile lettering, Grade 2 contracted Braille domes, standard pictograms, and multi-color 3MF slicer layers.',
  keywords: [
    'ada braille sign generator 3d print stl 3mf tactile door sign',
    '3d printable braille door sign stl',
    'ada compliant room sign generator',
    'tactile door sign 3mf bambu',
    'grade 2 braille sign 3d print',
    'restroom sign with braille stl',
    'accessible wheelchair sign 3d print',
  ],
  icon: 'type',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./braille-ada-sign-generator.component').then(
      (m) => m.BrailleAdaSignGeneratorComponent
    ),
};

export { BrailleAdaSignGeneratorComponent } from './braille-ada-sign-generator.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
