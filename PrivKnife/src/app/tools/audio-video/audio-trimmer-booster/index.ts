import { ToolDefinition } from '../../../core/models/tool.model';

export const audioTrimmerBoosterTool: ToolDefinition = {
  id: 'audio-trimmer-booster',
  name: 'Audio Trimmer, Volume Booster & Ringtone Maker',
  category: 'audio-video',
  description:
    'Trim audio with millisecond precision, boost volume up to 400% with soft-knee limiting, apply fade in/out curves, and export to MP3, WAV, or iPhone M4R ringtone format 100% locally in your browser.',
  keywords: [
    'audio trimmer online free volume booster mp3 ringtone maker m4r',
    'audio trimmer',
    'volume booster online',
    'mp3 cutter',
    'ringtone maker m4r',
    'boost audio volume',
    'cut wav file',
    'client side audio editor',
  ],
  icon: 'scissors',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./audio-trimmer-booster.component').then(
      (m) => m.AudioTrimmerBoosterComponent
    ),
};
export * from './types';
export * from './engine';
export * from './audio-trimmer-booster.component';
