import { ToolCategory, ToolDefinition } from '../core/models/tool.model';
import { csvConverterTool } from './dev/csv-converter';
import { pdfMergerTool } from './documents/pdf-merger';
import { cryptoHashUuidTool } from './privacy/crypto-hash-uuid';
import { exifStripperTool } from './privacy/exif-stripper';
import { pdfRedactionTool } from './privacy/pdf-redaction';

export const TOOL_REGISTRY: ToolDefinition[] = [
  exifStripperTool,
  cryptoHashUuidTool,
  csvConverterTool,
  pdfMergerTool,
  pdfRedactionTool,
];

export function getToolById(id: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.find((tool) => tool.id === id);
}

export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return TOOL_REGISTRY.filter((tool) => tool.category === category);
}
