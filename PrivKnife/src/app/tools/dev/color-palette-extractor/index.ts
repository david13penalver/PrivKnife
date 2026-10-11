import { ToolDefinition } from '../../../core/models/tool.model';

export const colorPaletteExtractorTool: ToolDefinition = {
  id: 'color-palette-extractor',
  name: 'Color Palette Extractor & Contrast Checker',
  category: 'dev',
  description:
    'Extract dominant color palettes from any photo and verify WCAG 2.1 AA text readability ratios instantly.',
  keywords: [
    'extract palette from image',
    'wcag color matrix generator',
    'extract color palette to ase',
    'image color accessibility checker',
    'bulk contrast ratio check',
    'color contrast matrix',
    'client side palette extractor',
    'offline color eyedropper tool',
  ],
  icon: 'palette',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./color-palette-extractor.component').then(
      (m) => m.ColorPaletteExtractorComponent
    ),
};

export { ColorPaletteExtractorComponent } from './color-palette-extractor.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
