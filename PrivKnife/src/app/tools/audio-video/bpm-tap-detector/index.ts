import { ToolDefinition } from '../../../core/models/tool.model';

export const bpmTapDetectorTool: ToolDefinition = {
  id: 'audio-bpm-detector',
  name: 'Audio BPM, Pitch & Key Tap Detector',
  category: 'audio-video',
  description:
    'Detect tempo, musical key, and pitch tuning directly in your browser. Drag and drop audio tracks for offline DSP analysis or tap along with an audible synthesized metronome click track.',
  keywords: [
    'find bpm of song online',
    'tap tempo online',
    'detect key of song online',
    'free bpm analyzer no upload',
    'audio pitch detector web',
    'camelot wheel key detector',
    'online metronome tap tempo',
    'client side audio bpm',
  ],
  icon: 'music',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./bpm-tap-detector.component').then(
      (m) => m.BpmTapDetectorComponent
    ),
};

export { BpmTapDetectorComponent } from './bpm-tap-detector.component';
export * from './types';
export * from './engine';
export * from './metronome';
export * from './test-fixtures';
