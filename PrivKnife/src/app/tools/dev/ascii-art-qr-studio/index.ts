import { ToolDefinition } from '../../../core/models/tool.model';

export const asciiArtQrStudioTool: ToolDefinition = {
  id: 'ascii-art-qr-studio',
  i18nKey: 'asciiArtQrStudio',
  name: 'ASCII Art, Braille & Static QR/Barcode Studio',
  category: 'dev',
  description:
    'Generate 6-font ASCII banners, Unicode Braille image art, permanent static QR SVGs/PNGs, and 1D barcodes locally.',
  keywords: ['ascii banner', 'image to braille', 'qr generator', 'wifi qr', 'barcode'],
  icon: '📱',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./ascii-art-qr-studio.component').then(
      (m) => m.AsciiArtQrStudioComponent,
    ),
};
