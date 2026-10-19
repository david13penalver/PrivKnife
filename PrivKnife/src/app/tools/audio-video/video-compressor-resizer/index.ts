import { ToolDefinition } from '../../../core/models/tool.model';

export const videoCompressorResizerTool: ToolDefinition = {
  id: 'video-compressor-resizer',
  name: 'Client-Side Video Compressor & Social Resizer',
  category: 'audio-video',
  description:
    'Compress MP4 and WebM videos to fit Discord 8MB/25MB/50MB, WhatsApp, and email size limits with automatic social cropping for TikTok (9:16), Instagram (1:1, 4:5), and YouTube (16:9) 100% locally in your browser.',
  keywords: [
    'compress video online free no upload discord video resize reels tiktok',
    'discord video compressor 8mb',
    'compress video client side',
    'resize video for tiktok',
    'instagram video resizer',
    'reduce mp4 file size',
    'video compressor no watermark',
    'webm compressor',
  ],
  icon: 'video',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./video-compressor-resizer.component').then(
      (m) => m.VideoCompressorResizerComponent
    ),
};
export * from './types';
export * from './engine';
export * from './video-compressor-resizer.component';
