import { ToolDefinition } from '../../../core/models/tool.model';

export const invoiceMakerTool: ToolDefinition = {
  id: 'invoice-receipt-maker',
  name: 'Instant Client-Side Invoice & Receipt Maker',
  category: 'documents',
  description:
    'Draft professional PDF invoices and printable receipts without storing financial records on third-party servers.',
  keywords: [
    'free invoice generator no sign up',
    'invoice generator',
    'receipt maker',
    'billing',
    'pdf invoice',
    'client side invoice',
    'private invoice maker',
  ],
  icon: 'receipt',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./invoice-maker.component').then((m) => m.InvoiceMakerComponent),
};

export { InvoiceMakerComponent } from './invoice-maker.component';
export * from './types';
export * from './engine';
