import { ToolDefinition } from '../../../core/models/tool.model';

export const diffCheckerTool: ToolDefinition = {
  id: 'diff-checker',
  name: 'Side-by-Side Code & Contract Diff Checker',
  i18nKey: 'diffChecker',
  category: 'dev',
  description:
    'Private, high-speed code, text, and legal contract comparison with word-level differences and unified patch export.',
  keywords: [
    'side by side diff checker online code compare contract difference text compare',
    'diff checker',
    'code diff',
    'text compare',
    'contract diff checker',
    'online diff checker',
    'unified diff',
    'file comparison',
  ],
  icon: 'git-compare',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./diff-checker.component').then((m) => m.DiffCheckerComponent),
};

export * from './types';
export * from './engine';
export * from './diff-checker.component';
