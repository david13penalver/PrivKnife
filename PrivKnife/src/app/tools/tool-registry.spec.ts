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

  it('should find tools by category', () => {
    const privacyTools = getToolsByCategory('privacy');
    expect(privacyTools.length).toBeGreaterThan(0);
    expect(privacyTools.some((t) => t.id === 'exif-stripper')).toBe(true);
  });
});
