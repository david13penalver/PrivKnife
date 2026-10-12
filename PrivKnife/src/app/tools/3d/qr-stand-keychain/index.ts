import { ToolDefinition } from '../../../core/models/tool.model';

export const qrStandKeychainTool: ToolDefinition = {
  id: '3d-qr-stand',
  name: '3D QR Stand & Keychain Generator',
  category: '3d',
  description:
    'Generate slice-ready dual-color .3mf and .stl models of functional tabletop QR code stands, keychain loops, and plaques for 3D printing. 100% in-browser.',
  keywords: [
    'qr code 3d print generator',
    '3d printable qr code stand',
    'custom wifi qr keychain stl',
    'bambu lab multi color qr code generator',
    'dual color qr 3mf',
    'tabletop qr stand 3d print',
    '3mf qr generator',
  ],
  icon: 'box',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./qr-stand-keychain.component').then((m) => m.QrStandKeychainComponent),
};

export { QrStandKeychainComponent } from './qr-stand-keychain.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
