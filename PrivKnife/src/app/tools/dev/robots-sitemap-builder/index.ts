import { ToolDefinition } from '../../../core/models/tool.model';

export const robotsSitemapBuilderTool: ToolDefinition = {
  id: 'robots-sitemap-builder',
  name: 'Robots.txt & XML Sitemap Builder',
  category: 'dev',
  description:
    'Generate standard search crawler directives (robots.txt) and valid XML sitemaps client-side with AI bot blocking, bulk URL parsing, and instant export.',
  keywords: [
    'robots txt generator tool',
    'xml sitemap builder free',
    'bulk sitemap generator',
    'block ai scrapers robots txt',
    'gptbot claudebot robots txt',
    'sitemap xml validator',
    'client side robots txt maker',
  ],
  icon: 'file-text',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./robots-sitemap-builder.component').then(
      (m) => m.RobotsSitemapBuilderComponent
    ),
};

export { RobotsSitemapBuilderComponent } from './robots-sitemap-builder.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
