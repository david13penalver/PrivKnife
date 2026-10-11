import { ToolCategory, ToolDefinition } from '../core/models/tool.model';
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
import { batchImageCompressorTool } from './media/batch-compressor';
import { faviconAppIconSuiteTool } from './media/favicon-generator';
import { ogCardMakerTool } from './media/og-card-maker';
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
  subtitlesShifterTool,
];

export function getToolById(id: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.find((tool) => tool.id === id);
}

export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return TOOL_REGISTRY.filter((tool) => tool.category === category);
}
