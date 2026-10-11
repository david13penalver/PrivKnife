export type OgCardTemplate =
  | 'modern-tech'
  | 'article-blog'
  | 'product-hunt'
  | 'code-snippet';

export type BackgroundStyle = 'solid' | 'gradient' | 'mesh' | 'custom-image';

export type CardFontFamily = 'sans-serif' | 'serif' | 'monospace';

export interface OgCardConfig {
  template: OgCardTemplate;
  title: string;
  subtitle: string;
  authorName: string;
  domain: string;
  badgeText: string;
  readingTime: string;
  codeSnippet: string;
  codeLanguage: string;
  theme: 'dark' | 'light';
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  backgroundStyle: BackgroundStyle;
  gradientAngle: number;
  fontFamily: CardFontFamily;
  fontSize: number;
}

export interface CardExportResult {
  blob: Blob;
  mimeType: 'image/png' | 'image/webp';
  fileName: string;
  width: number;
  height: number;
}
