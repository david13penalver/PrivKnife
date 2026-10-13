import { ToolCategory, ToolDefinition } from '../core/models/tool.model';
import { cookieCutterTool } from './3d/cookie-cutter';
import { deskWedgeNameplateTool } from './3d/desk-wedge-nameplate';
import { qrStandKeychainTool } from './3d/qr-stand-keychain';
import { bpmTapDetectorTool } from './audio-video/bpm-tap-detector';
import { soundwaveArtMakerTool } from './audio-video/soundwave-art-maker';
import { videoGifTrimmerTool } from './audio-video/video-gif-trimmer';
import { calendarLinkerTool } from './dev/calendar-linker';
import { colorPaletteExtractorTool } from './dev/color-palette-extractor';
import { csvConverterTool } from './dev/csv-converter';
import { dnsCheckerTool } from './dev/dns-checker';
import { emailSignatureGeneratorTool } from './dev/email-signature-generator';
import { cssMeshGradientMakerTool } from './dev/mesh-gradient-maker';
import { robotsSitemapBuilderTool } from './dev/robots-sitemap-builder';
import { webVitalsTool } from './dev/web-vitals';
import { averyBarcodeSheetTool } from './documents/barcode-labels';
import { gridPaperTool } from './documents/grid-paper';
import { invoiceMakerTool } from './documents/invoice-maker';
import { markdownCheatsheetTool } from './documents/markdown-cheatsheet';
import { pdfMergerTool } from './documents/pdf-merger';
import { tableTentMakerTool } from './documents/table-tent-maker';
import { backgroundRemoverTool } from './media/background-remover';
import { batchImageCompressorTool } from './media/batch-compressor';
import { faviconAppIconSuiteTool } from './media/favicon-generator';
import { ogCardMakerTool } from './media/og-card-maker';
import { screenshotMockupTool } from './media/screenshot-mockup';
import { subtitlesShifterTool } from './media/subtitles-shifter';
import { cryptoHashUuidTool } from './privacy/crypto-hash-uuid';
import { exifStripperTool } from './privacy/exif-stripper';
import { pdfRedactionTool } from './privacy/pdf-redaction';

export const TOOL_REGISTRY: ToolDefinition[] = [
  exifStripperTool,
  cryptoHashUuidTool,
  csvConverterTool,
  colorPaletteExtractorTool,
  cssMeshGradientMakerTool,
  calendarLinkerTool,
  emailSignatureGeneratorTool,
  robotsSitemapBuilderTool,
  pdfMergerTool,
  pdfRedactionTool,
  invoiceMakerTool,
  gridPaperTool,
  averyBarcodeSheetTool,
  tableTentMakerTool,
  markdownCheatsheetTool,
  batchImageCompressorTool,
  faviconAppIconSuiteTool,
  ogCardMakerTool,
  screenshotMockupTool,
  subtitlesShifterTool,
  bpmTapDetectorTool,
  soundwaveArtMakerTool,
  videoGifTrimmerTool,
  qrStandKeychainTool,
  cookieCutterTool,
  deskWedgeNameplateTool,
  backgroundRemoverTool,
  dnsCheckerTool,
  webVitalsTool,
];

export function getToolById(id: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.find((tool) => tool.id === id);
}

export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return TOOL_REGISTRY.filter((tool) => tool.category === category);
}

export const TOOL_I18N_MAP: Record<string, string> = {
  'exif-stripper': 'exifStripper',
  'crypto-hash-uuid': 'cryptoHash',
  'csv-to-sql-json': 'csvConverter',
  'csv-json-sql': 'csvConverter',
  'color-palette-extractor': 'colorPalette',
  'css-mesh-gradient-maker': 'meshGradient',
  'calendar-linker': 'calendarLinker',
  'email-signature-generator': 'emailSignature',
  'robots-sitemap-builder': 'robotsSitemap',
  'pdf-merger-splitter': 'pdfMerger',
  'pdf-redaction': 'pdfRedaction',
  'invoice-receipt-maker': 'invoiceMaker',
  'graph-dot-grid-paper': 'gridPaper',
  'avery-barcode-sheet': 'barcodeLabels',
  'table-tent-maker': 'tableTentMaker',
  'markdown-cheatsheet': 'markdownCheatsheet',
  'batch-image-compressor': 'batchCompressor',
  'favicon-app-icon-suite': 'faviconGenerator',
  'og-card-maker': 'ogCardMaker',
  'screenshot-mockup': 'screenshotMockup',
  'subtitles-shifter': 'subtitlesShifter',
  'audio-bpm-detector': 'bpmTapDetector',
  'bpm-tap-detector': 'bpmTapDetector',
  'soundwave-art-maker': 'soundwaveArt',
  'video-to-gif': 'videoGifTrimmer',
  'video-gif-trimmer': 'videoGifTrimmer',
  '3d-qr-stand': 'qrStandKeychain',
  'cookie-cutter-3d': 'cookieCutter',
  'cookie-cutter': 'cookieCutter',
  'desk-wedge-nameplate': 'deskWedge',
  'background-remover': 'backgroundRemover',
  'dns-checker': 'dnsChecker',
  'web-vitals': 'webVitals',
};

export function getToolI18nKey(id: string): string | undefined {
  return TOOL_I18N_MAP[id];
}

export function getLocalizedTool(
  tool: ToolDefinition,
  i18n: { t: (key: string) => string }
): ToolDefinition {
  const i18nKey = tool.i18nKey || TOOL_I18N_MAP[tool.id];
  if (!i18nKey) return tool;

  const translatedName = i18n.t(`tools.${i18nKey}.name`);
  const translatedDesc = i18n.t(`tools.${i18nKey}.description`);

  return {
    ...tool,
    i18nKey,
    name: translatedName !== `tools.${i18nKey}.name` ? translatedName : tool.name,
    description:
      translatedDesc !== `tools.${i18nKey}.description` ? translatedDesc : tool.description,
  };
}

export function getLocalizedToolById(
  id: string,
  i18n: { t: (key: string) => string }
): ToolDefinition | undefined {
  const tool = getToolById(id);
  return tool ? getLocalizedTool(tool, i18n) : undefined;
}
