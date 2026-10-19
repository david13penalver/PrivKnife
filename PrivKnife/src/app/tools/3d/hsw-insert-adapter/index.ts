import { ToolDefinition } from '../../../core/models/tool.model';

export const hswInsertAdapterTool: ToolDefinition = {
  id: 'hsw-insert-adapter',
  name: 'Honeycomb Storage Wall (HSW) Insert & Adapter',
  category: '3d',
  description:
    'Generate dimensionally accurate snap-fit inserts, captive nut pockets (M3/M4/M5), neodymium magnet holders, utility hooks, and can loops for the open-source Honeycomb Storage Wall standard.',
  keywords: [
    'honeycomb storage wall insert generator stl 3d print hsw adapter',
    'hsw insert 3d print',
    'honeycomb storage wall hook stl',
    'hsw magnet insert',
    'hsw nut pocket 3d print',
    'hsw parametric adapter',
  ],
  icon: 'grid',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./hsw-insert-adapter.component').then(
      (m) => m.HswInsertAdapterComponent
    ),
};

export { HswInsertAdapterComponent } from './hsw-insert-adapter.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
