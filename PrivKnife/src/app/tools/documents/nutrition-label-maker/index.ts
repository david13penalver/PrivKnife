import { ToolDefinition } from '../../../core/models/tool.model';

export const nutritionLabelMakerTool: ToolDefinition = {
  id: 'nutrition-label-maker',
  name: 'FDA & EU Nutrition Facts & Supplement Label Maker',
  category: 'documents',
  description:
    'Generate FDA 2016, EU Regulation 1169/2011, and Supplement Facts nutrition panels with real-time Daily Value % calculations, exporting pixel-perfect vector SVG and PDF files 100% locally in your browser.',
  keywords: [
    'nutrition facts label maker fda eu compliant free svg pdf supplement label',
    'fda nutrition facts generator',
    'nutrition label maker free',
    'eu nutrition table generator',
    'supplement facts maker',
    'nutrition facts vector svg',
    'nutrition facts to pdf',
    'client side nutrition label',
  ],
  icon: 'file-text',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./nutrition-label-maker.component').then(
      (m) => m.NutritionLabelMakerComponent
    ),
};
export * from './types';
export * from './engine';
export * from './nutrition-label-maker.component';
