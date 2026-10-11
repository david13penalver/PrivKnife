import { describe, expect, it } from 'vitest';
import { getToolById, getToolsByCategory, TOOL_REGISTRY } from './tool-registry';

describe('ToolRegistry (Seam 3: Catalog & Architecture Verification)', () => {
  it('should have registered tools', () => {
    expect(TOOL_REGISTRY.length).toBeGreaterThan(0);
  });

  it('should verify all registered tools are 100% client side', () => {
    for (const tool of TOOL_REGISTRY) {
      expect(tool.isFullyClientSide).toBe(true);
      expect(tool.id).toBeTruthy();
      expect(tool.name).toBeTruthy();
      expect(tool.category).toBeTruthy();
      expect(typeof tool.loadComponent).toBe('function');
    }
  });

  it('should find exif-stripper tool by id', () => {
    const tool = getToolById('exif-stripper');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('EXIF & Privacy Metadata Stripper');
    expect(tool?.category).toBe('privacy');
  });

  it('should find crypto-hash-uuid tool by id', () => {
    const tool = getToolById('crypto-hash-uuid');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Cryptographic Hash & UUID Batch Generator');
    expect(tool?.category).toBe('privacy');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find csv-to-sql-json tool by id', () => {
    const tool = getToolById('csv-to-sql-json');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('CSV / Excel to JSON, SQL & Markdown');
    expect(tool?.category).toBe('dev');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find pdf-merger-splitter tool by id', () => {
    const tool = getToolById('pdf-merger-splitter');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('PDF Merger, Splitter & Page Organizer');
    expect(tool?.category).toBe('documents');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find pdf-redaction tool by id', () => {
    const tool = getToolById('pdf-redaction');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('PDF Redaction & Anonymizer');
    expect(tool?.category).toBe('privacy');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find tools by category', () => {
    const privacyTools = getToolsByCategory('privacy');
    expect(privacyTools.length).toBeGreaterThan(0);
    expect(privacyTools.some((t) => t.id === 'exif-stripper')).toBe(true);
    expect(privacyTools.some((t) => t.id === 'crypto-hash-uuid')).toBe(true);
    expect(privacyTools.some((t) => t.id === 'pdf-redaction')).toBe(true);

    const devTools = getToolsByCategory('dev');
    expect(devTools.length).toBeGreaterThan(0);
    expect(devTools.some((t) => t.id === 'csv-to-sql-json')).toBe(true);

    const docTools = getToolsByCategory('documents');
    expect(docTools.length).toBeGreaterThan(0);
    expect(docTools.some((t) => t.id === 'pdf-merger-splitter')).toBe(true);
  });
});
