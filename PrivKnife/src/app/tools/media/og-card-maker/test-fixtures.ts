import { OgCardConfig } from './types';

export const DEFAULT_OG_CONFIG: OgCardConfig = {
  template: 'modern-tech',
  title: 'Building Privacy-First Web Apps with Modern Angular',
  subtitle:
    'Zero backend servers, zero telemetry, and 100% in-browser processing for ultimate privacy.',
  authorName: 'Alex Mercer',
  domain: 'privknife.com',
  badgeText: 'Angular 20 • Web Crypto',
  readingTime: '5 min read',
  codeSnippet: `import { WebWorker } from './worker';\n\nexport function computeHash(data: string) {\n  return crypto.subtle.digest('SHA-256', data);\n}`,
  codeLanguage: 'TypeScript',
  theme: 'dark',
  primaryColor: '#3b82f6',
  accentColor: '#8b5cf6',
  backgroundColor: '#0f172a',
  backgroundStyle: 'gradient',
  gradientAngle: 135,
  fontFamily: 'sans-serif',
  fontSize: 54,
};

export const BLOG_OG_CONFIG: OgCardConfig = {
  ...DEFAULT_OG_CONFIG,
  template: 'article-blog',
  title: 'Why Client-Side Web Utilities Are Replacing Cloud SaaS',
  subtitle: 'A deep dive into browser WebAssembly, Web Workers, and local computation paradigms.',
  badgeText: 'Architecture & Privacy',
  readingTime: '8 min read',
};

export const STARTUP_OG_CONFIG: OgCardConfig = {
  ...DEFAULT_OG_CONFIG,
  template: 'product-hunt',
  title: 'PrivKnife — The In-Browser Swiss Army Knife',
  subtitle: '29+ everyday tools running completely in your browser without telemetry or servers.',
  badgeText: '🚀 Featured on Product Hunt',
};

export const CODE_OG_CONFIG: OgCardConfig = {
  ...DEFAULT_OG_CONFIG,
  template: 'code-snippet',
  title: 'In-Memory Windows .ico Packager in TypeScript',
  subtitle: 'Compile multi-resolution binary ICO files directly with DataView and Uint8Array.',
  badgeText: 'Code Tutorial',
};

export function createMockImageFile(
  name = 'avatar.png',
  type = 'image/png',
  sizeBytes = 2048
): File {
  const content = new Uint8Array(sizeBytes);
  content[0] = 0x89;
  content[1] = 0x50;
  content[2] = 0x4e;
  content[3] = 0x47;
  return new File([content], name, { type });
}
