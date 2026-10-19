import { ToolDefinition } from '../../../core/models/tool.model';

export const pdfSignerStamperTool: ToolDefinition = {
  id: 'pdf-signer-stamper',
  name: 'Client-Side PDF Signer, Date Stamper & Initials',
  category: 'documents',
  description:
    'Sign contracts, NDAs, and forms privately in your browser. Draw pressure-smoothed signatures, place date stamps and initials, and permanently flatten annotations.',
  keywords: [
    'sign pdf online free client side date stamp initials contract',
    'sign pdf online free no upload',
    'private pdf signer',
    'pdf date stamper free',
    'pdf initials tool client side',
    'flatten pdf signature',
  ],
  icon: 'file-signature',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./pdf-signer-stamper.component').then(
      (m) => m.PdfSignerStamperComponent
    ),
};

export { PdfSignerStamperComponent } from './pdf-signer-stamper.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
