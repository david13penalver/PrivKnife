import { ToolDefinition } from '../../../core/models/tool.model';

export const subtitlesShifterTool: ToolDefinition = {
  id: 'subtitles-shifter',
  name: 'Subtitles Timestamp Shifter & SRT/VTT Converter',
  category: 'media',
  description:
    'Shift subtitle delays in milliseconds or seconds, apply FPS conversion scaling, and convert between SRT and WebVTT formats offline.',
  keywords: [
    'shift srt subtitles online',
    'sync srt files',
    'convert srt to vtt free',
    'fix subtitle delay online',
    'vtt time offset tool',
    'adjust subtitle fps 24 to 25',
    'client side subtitle shifter',
    'offline srt vtt converter',
  ],
  icon: 'message-square',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./subtitles-shifter.component').then(
      (m) => m.SubtitlesShifterComponent
    ),
};

export { SubtitlesShifterComponent } from './subtitles-shifter.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
