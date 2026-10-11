import { ToolDefinition } from '../../../core/models/tool.model';

export const soundwaveArtMakerTool: ToolDefinition = {
  id: 'soundwave-art-maker',
  name: 'Spotify Code & Soundwave Art Maker',
  category: 'audio-video',
  description:
    'Turn favorite songs, wedding vows, or voice notes into physical soundwave art. Export laser-cut vectors (.svg), printable high-DPI posters (.pdf), and dual-color 3D printable models (.stl).',
  keywords: [
    'soundwave art generator stl',
    'spotify code 3d print',
    'custom soundwave stl maker',
    'voice note 3d print generator',
    'printable soundwave art pdf',
    'wedding vows soundwave maker',
    'client side soundwave svg',
  ],
  icon: 'waveform',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./soundwave-art-maker.component').then(
      (m) => m.SoundwaveArtMakerComponent
    ),
};

export { SoundwaveArtMakerComponent } from './soundwave-art-maker.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
