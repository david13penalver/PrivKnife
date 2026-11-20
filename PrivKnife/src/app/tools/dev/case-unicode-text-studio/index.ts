import { ToolDefinition } from '../../../core/models/tool.model';

export const caseUnicodeTextStudioTool: ToolDefinition = {
  id: 'case-unicode-text-studio',
  i18nKey: 'caseUnicodeTextStudio',
  name: 'String Case, Text Transform & Unicode Studio',
  category: 'dev',
  description:
    'Convert identifiers across 13 cases, map 16 Unicode styles, glitch/clean Zalgo, and search 150+ Kaomojis locally.',
  keywords: ['case converter', 'unicode font', 'zalgo', 'kaomoji', 'slugify'],
  icon: '🔤',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./case-unicode-text-studio.component').then(
      (m) => m.CaseUnicodeTextStudioComponent,
    ),
};
