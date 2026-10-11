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

  it('should find invoice-receipt-maker tool by id', () => {
    const tool = getToolById('invoice-receipt-maker');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Instant Client-Side Invoice & Receipt Maker');
    expect(tool?.category).toBe('documents');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find graph-dot-grid-paper tool by id', () => {
    const tool = getToolById('graph-dot-grid-paper');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Custom Printable Graph & Dot Grid Paper');
    expect(tool?.category).toBe('documents');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find avery-barcode-sheet tool by id', () => {
    const tool = getToolById('avery-barcode-sheet');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Avery Barcode & Label Sheet Generator');
    expect(tool?.category).toBe('documents');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find table-tent-maker tool by id', () => {
    const tool = getToolById('table-tent-maker');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Foldable Table Tent & Counter Sign Maker');
    expect(tool?.category).toBe('documents');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find batch-image-compressor tool by id', () => {
    const tool = getToolById('batch-image-compressor');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Batch Image Compressor & WebP Converter');
    expect(tool?.category).toBe('media');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find favicon-app-icon-suite tool by id', () => {
    const tool = getToolById('favicon-app-icon-suite');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('App Icon & Favicon Suite Generator');
    expect(tool?.category).toBe('media');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find og-card-maker tool by id', () => {
    const tool = getToolById('og-card-maker');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Social Share (Open Graph) Card Maker');
    expect(tool?.category).toBe('media');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find color-palette-extractor tool by id', () => {
    const tool = getToolById('color-palette-extractor');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Color Palette Extractor & Contrast Checker');
    expect(tool?.category).toBe('dev');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find css-mesh-gradient-maker tool by id', () => {
    const tool = getToolById('css-mesh-gradient-maker');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('CSS Mesh Gradient & Glassmorphism Code Maker');
    expect(tool?.category).toBe('dev');
    expect(tool?.isFullyClientSide).toBe(true);
  });

  it('should find subtitles-shifter tool by id', () => {
    const tool = getToolById('subtitles-shifter');
    expect(tool).toBeDefined();
    expect(tool?.name).toBe('Subtitles Timestamp Shifter & SRT/VTT Converter');
    expect(tool?.category).toBe('media');
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
    expect(devTools.some((t) => t.id === 'color-palette-extractor')).toBe(true);
    expect(devTools.some((t) => t.id === 'css-mesh-gradient-maker')).toBe(true);

    const docTools = getToolsByCategory('documents');
    expect(docTools.length).toBeGreaterThan(0);
    expect(docTools.some((t) => t.id === 'pdf-merger-splitter')).toBe(true);
    expect(docTools.some((t) => t.id === 'invoice-receipt-maker')).toBe(true);
    expect(docTools.some((t) => t.id === 'graph-dot-grid-paper')).toBe(true);
    expect(docTools.some((t) => t.id === 'avery-barcode-sheet')).toBe(true);
    expect(docTools.some((t) => t.id === 'table-tent-maker')).toBe(true);

    const mediaTools = getToolsByCategory('media');
    expect(mediaTools.length).toBeGreaterThan(0);
    expect(mediaTools.some((t) => t.id === 'batch-image-compressor')).toBe(true);
    expect(mediaTools.some((t) => t.id === 'favicon-app-icon-suite')).toBe(true);
    expect(mediaTools.some((t) => t.id === 'og-card-maker')).toBe(true);
    expect(mediaTools.some((t) => t.id === 'subtitles-shifter')).toBe(true);
  });
});
