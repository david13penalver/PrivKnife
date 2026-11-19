import { ToolDefinition } from '../../../core/models/tool.model';

export const pdfPasswordSecurityTool: ToolDefinition = {
  id: 'pdf-password-security',
  name: 'PDF Password Protector & Unlocker',
  category: 'documents',
  description:
    'Lock PDFs with AES-256 encryption and granular print/copy permissions, or unlock your own password-protected PDFs 100% locally via QPDF WebAssembly.',
  keywords: [
    'protect pdf',
    'encrypt pdf aes 256',
    'unlock pdf',
    'remove pdf password',
    'pdf permissions offline',
    'qpdf wasm',
  ],
  icon: 'lock',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./pdf-password-security.component').then(
      (m) => m.PdfPasswordSecurityComponent
    ),
};

export * from './types';
