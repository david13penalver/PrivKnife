import { ToolDefinition } from '../../../core/models/tool.model';

export const exifStripperTool: ToolDefinition = {
  id: 'exif-stripper',
  name: 'EXIF & Privacy Metadata Stripper',
  category: 'privacy',
  description:
    'Purge hidden GPS location, camera model, and device timestamps from your photos 100% locally in your browser.',
  keywords: [
    'exif stripper',
    'remove exif data',
    'photo metadata cleaner',
    'remove gps from photo',
    'privacy image tool',
  ],
  icon: 'shield-check',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./exif-stripper.component').then((m) => m.ExifStripperComponent),
};

export { ExifStripperComponent } from './exif-stripper.component';
export * from './types';
export * from './engine';
