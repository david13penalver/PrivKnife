import { ToolDefinition } from '../../../core/models/tool.model';

export const videoGifTrimmerTool: ToolDefinition = {
  id: 'video-to-gif',
  name: 'Video to GIF & Clip Trimmer',
  category: 'audio-video',
  description:
    'Trim video clips and convert them into lightweight animated GIFs or trimmed video clips directly in your browser with zero file uploads, zero wait queues, and zero size caps.',
  keywords: [
    'convert video to gif without upload',
    'free video to gif offline',
    'trim video in browser free',
    'video to gif maker no watermark',
    'video clip trimmer online',
    'client side video to gif converter',
    'video trimmer no upload',
  ],
  icon: 'film',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./video-gif-trimmer.component').then(
      (m) => m.VideoGifTrimmerComponent
    ),
};

export { VideoGifTrimmerComponent } from './video-gif-trimmer.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
