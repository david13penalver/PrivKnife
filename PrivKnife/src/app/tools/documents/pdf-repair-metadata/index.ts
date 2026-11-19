import { ToolDefinition } from '../../../core/models/tool.model';

export const pdfRepairMetadataTool: ToolDefinition = {
  id: 'pdf-repair-metadata',
  name: 'PDF Structural Repair, Metadata Editor & PDF/A Archiver',
  category: 'documents',
  description:
    'Repair corrupted PDF XRefs, linearize for Fast Web View, strip JavaScript actions, scrub hidden metadata/XMP, and package PDF/A-2b archives locally via QPDF WASM.',
  keywords: [
    'repair corrupted pdf',
    'pdf to pdf/a',
    'edit pdf metadata',
    'scrub pdf xmp',
    'linearize pdf',
    'remove pdf javascript',
  ],
  icon: 'wrench',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./pdf-repair-metadata.component').then(
      (m) => m.PdfRepairMetadataComponent
    ),
};

export * from './types';
