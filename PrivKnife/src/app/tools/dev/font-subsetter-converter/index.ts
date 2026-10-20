import { ToolDefinition } from '../../../core/models/tool.model';

export const fontSubsetterConverterTool: ToolDefinition = {
  id: 'font-subsetter-converter',
  name: 'Web Font Subsetter & TTF/OTF to WOFF2 Converter',
  i18nKey: 'fontSubsetterConverter',
  category: 'dev',
  description:
    'Compress heavy desktop typography into ultra-compact WOFF2 web fonts by stripping unused glyphs and layout tables, cutting font payloads by up to 95%.',
  keywords: [
    'font subsetter online convert ttf to woff2 compress webfont reduce font size',
    'font subsetter',
    'ttf to woff2',
    'otf to woff2',
    'compress web font',
    'reduce font size',
    'woff2 converter',
    'glyph stripper',
  ],
  icon: 'type',
  isFullyClientSide: true,
  loadComponent: () =>
    import('./font-subsetter-converter.component').then(
      (m) => m.FontSubsetterConverterComponent
    ),
};

export * from './types';
export * from './engine';
export * from './font-subsetter-converter.component';
