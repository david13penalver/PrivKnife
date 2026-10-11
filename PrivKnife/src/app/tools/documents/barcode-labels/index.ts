import { ToolDefinition } from '../../../core/models/tool.model';

export const averyBarcodeSheetTool: ToolDefinition = {
  id: 'avery-barcode-sheet',
  name: 'Avery Barcode & Label Sheet Generator',
  category: 'documents',
  description:
    'Design and print standard barcode label sheets (UPC, Code128, QR) mapped to exact Avery template sizes with zero backend.',
  keywords: [
    'avery 5160 barcode generator',
    'barcode label sheet generator',
    'print barcodes on avery labels',
    'free avery label template with barcodes',
    'generate avery 5163 barcode stickers',
    'sequential barcode sticker sheet',
    'client side barcode generator',
  ],
  icon: 'tag',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./barcode-labels.component').then((m) => m.BarcodeLabelsComponent),
};

export { BarcodeLabelsComponent } from './barcode-labels.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
