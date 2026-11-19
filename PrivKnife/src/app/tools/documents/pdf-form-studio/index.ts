import { ToolDefinition } from '../../../core/models/tool.model';

export const pdfFormStudioTool: ToolDefinition = {
  id: 'pdf-form-studio',
  name: 'Interactive PDF Form Filler, Creator & Flattener',
  category: 'documents',
  description:
    'Fill existing AcroForm PDFs, add new fillable text/checkbox/dropdown fields to flat PDFs, or permanently flatten answers 100% locally in browser memory.',
  keywords: [
    'fill pdf form',
    'create fillable pdf',
    'flatten pdf form',
    'acroform editor offline',
    'pdf form studio',
  ],
  icon: 'file-pen',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./pdf-form-studio.component').then(
      (m) => m.PdfFormStudioComponent
    ),
};

export * from './types';
