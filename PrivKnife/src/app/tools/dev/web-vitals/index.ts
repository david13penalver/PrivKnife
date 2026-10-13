import { ToolDefinition } from '../../../core/models/tool.model';

export const webVitalsTool: ToolDefinition = {
  id: 'web-vitals',
  name: 'Website Performance & Core Web Vitals Checker',
  category: 'dev',
  description:
    'Audit page loading speed, inspect official Google Core Web Vitals (LCP, INP, CLS, FCP, TTFB), and receive actionable developer diagnostics directly from your browser.',
  keywords: [
    'check website speed online',
    'core web vitals checker',
    'free page speed test',
    'lighthouse audit online',
    'lcp cls inp checker',
    'website performance test',
    'mobile speed test online',
    'google pagespeed insights free',
  ],
  icon: 'gauge',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./web-vitals.component').then((m) => m.WebVitalsComponent),
};

export { WebVitalsComponent } from './web-vitals.component';
export * from './types';
export * from './engine';
export * from './test-fixtures';
