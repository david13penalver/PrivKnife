import { ToolDefinition } from '../../../core/models/tool.model';

export const pdfVisualCompareTool: ToolDefinition = {
  id: 'pdf-visual-compare',
  name: 'Visual PDF Comparison & Overlay Diff Tool',
  category: 'documents',
  description:
    'Spot altered figures, shifted graphics, and modified clauses between two PDFs with perceptual pixel overlay, curtain slider, and semantic word diff 100% locally.',
  keywords: [
    'compare pdf',
    'pdf diff tool',
    'visual pdf overlay',
    'compare contracts offline',
    'pdf redline diff',
  ],
  icon: 'git-compare',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./pdf-visual-compare.component').then(
      (m) => m.PdfVisualCompareComponent
    ),
};

export * from './types';
