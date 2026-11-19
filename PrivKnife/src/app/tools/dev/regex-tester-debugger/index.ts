import { ToolDefinition } from '../../../core/models/tool.model';

export const regexTesterDebuggerTool: ToolDefinition = {
  id: 'regex-tester-debugger',
  name: 'Interactive Regex Tester, Debugger & Explainer',
  category: 'dev',
  description:
    'Test regular expressions against sensitive logs locally with ReDoS watchdog protection, capture-group inspection, AST explanations, and 5-language code export.',
  keywords: [
    'regex tester',
    'regex debugger',
    'regex explainer',
    'redos safe',
    'javascript regexp',
    'offline regex',
  ],
  icon: 'regex',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./regex-tester-debugger.component').then(
      (m) => m.RegexTesterDebuggerComponent
    ),
};

export * from './types';
