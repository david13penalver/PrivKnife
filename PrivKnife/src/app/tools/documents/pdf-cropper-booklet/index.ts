import { ToolDefinition } from '../../../core/models/tool.model';

export const pdfCropperBookletTool: ToolDefinition = {
  id: 'pdf-cropper-booklet',
  name: 'PDF Margin Cropper, Resizer & N-Up Booklet Maker',
  category: 'documents',
  description:
    'Auto-trim scanner borders, crop PDF margins with Odd/Even mirror support, standardize mixed page sizes to A4/Letter, and generate 2-up/4-up/6-up handouts or saddle-stitch booklets locally.',
  keywords: [
    'crop pdf',
    'trim pdf margins',
    'resize pdf a4 letter',
    'pdf booklet maker',
    'saddle stitch pdf',
    '2-up 4-up pdf',
  ],
  icon: 'crop',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./pdf-cropper-booklet.component').then(
      (m) => m.PdfCropperBookletComponent
    ),
};

export * from './types';
