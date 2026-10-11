import { ToolDefinition } from '../../../core/models/tool.model';

export const markdownCheatsheetTool: ToolDefinition = {
  id: 'markdown-cheatsheet',
  name: 'Markdown to Academic & Tech PDF Cheatsheet',
  category: 'documents',
  description:
    'Convert raw Markdown into compact, multi-column print-ready reference sheets. Real-time preview with CSS columns, code syntax blocks, and instant vector PDF export.',
  keywords: [
    'markdown to cheatsheet pdf',
    'python cheat sheet pdf generator',
    '2 column markdown pdf converter',
    'printable cs cheat sheet generator',
    'markdown to exam reference sheet',
    'multi column markdown pdf',
    'client side markdown to pdf',
  ],
  icon: 'file-text',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./markdown-cheatsheet.component').then(
      (m) => m.MarkdownCheatsheetComponent
    ),
};

export { MarkdownCheatsheetComponent } from './markdown-cheatsheet.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
