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
import { emailSignatureGeneratorTool } from './dev/email-signature-generator';
import { cssMeshGradientMakerTool } from './dev/mesh-gradient-maker';
import { robotsSitemapBuilderTool } from './dev/robots-sitemap-builder';
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
];

export function getToolById(id: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.find((tool) => tool.id === id);
}

export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return TOOL_REGISTRY.filter((tool) => tool.category === category);
}
