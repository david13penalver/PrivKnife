import { ToolDefinition } from '../../../core/models/tool.model';

export const faviconAppIconSuiteTool: ToolDefinition = {
  id: 'favicon-app-icon-suite',
  name: 'App Icon & Favicon Suite Generator',
  category: 'media',
  description:
    'Turn a single logo into a complete package of multi-size favicons, Apple touch icons, and web manifests.',
  keywords: [
    'favicon generator',
    'app icon generator',
    'favicon.ico maker',
    'apple-touch-icon generator',
    'pwa icons',
    'site.webmanifest generator',
    'browser favicon generator offline',
  ],
  icon: 'palette',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./favicon-generator.component').then(
      (m) => m.FaviconGeneratorComponent
    ),
};

export { FaviconGeneratorComponent } from './favicon-generator.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
