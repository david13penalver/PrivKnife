import { ToolDefinition } from '../../../core/models/tool.model';

export const passportBiometricPhotoTool: ToolDefinition = {
  id: 'passport-biometric-photo',
  name: 'Passport, Visa & ID Biometric Photo Maker',
  category: 'media',
  description:
    'Turn any portrait into compliant biometric passport, visa, and ID photos with official country sizing guidelines and print-ready tiled photo sheets.',
  keywords: [
    'passport photo maker 2x2 35x45 printable sheet 4x6 100 client side',
    'passport photo generator free printable',
    'us passport photo online 2x2',
    'schengen visa photo 35x45 mm print sheet',
    'id photo maker 4x6 photo paper',
    'biometric passport photo cutter',
  ],
  icon: 'camera',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./passport-biometric-photo.component').then(
      (m) => m.PassportBiometricPhotoComponent
    ),
};

export { PassportBiometricPhotoComponent } from './passport-biometric-photo.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
