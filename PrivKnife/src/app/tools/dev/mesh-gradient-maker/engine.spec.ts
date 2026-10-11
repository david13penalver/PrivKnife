import { describe, expect, it } from 'vitest';
import {
  exportMeshPngBlob,
  generatePureCss,
  generateTailwindCss,
  randomizeMeshPoints,
  renderMeshToCanvas,
} from './engine';
import {
  DEFAULT_GLASS_CONFIG,
  DEFAULT_MESH_CONFIG,
} from './test-fixtures';

describe('MeshGradientEngine (Seam 1: CSS Generators, Canvas Compositing & Export)', () => {
  describe('generatePureCss', () => {
    it('should generate valid multi-radial mesh background and glassmorphism card CSS', () => {
      const css = generatePureCss(DEFAULT_MESH_CONFIG, DEFAULT_GLASS_CONFIG);

      expect(css).toContain(`background-color: ${DEFAULT_MESH_CONFIG.baseColor};`);
      expect(css).toContain('radial-gradient(');
      expect(css).toContain('.glass-card {');
      expect(css).toContain(`backdrop-filter: blur(${DEFAULT_GLASS_CONFIG.blur}px);`);
      expect(css).toContain(`-webkit-backdrop-filter: blur(${DEFAULT_GLASS_CONFIG.blur}px);`);
      expect(css).toContain(`border-radius: ${DEFAULT_GLASS_CONFIG.borderRadius}px;`);
      expect(css).toContain('box-shadow:');
    });

    it('should include surface reflection shine when enabled in glass config', () => {
      const cssWithReflection = generatePureCss(DEFAULT_MESH_CONFIG, {
        ...DEFAULT_GLASS_CONFIG,
        reflection: true,
      });
      expect(cssWithReflection).toContain('linear-gradient(');

      const cssWithoutReflection = generatePureCss(DEFAULT_MESH_CONFIG, {
        ...DEFAULT_GLASS_CONFIG,
        reflection: false,
      });
      expect(cssWithoutReflection).not.toContain('/* Reflection Highlight */');
    });
  });

  describe('generateTailwindCss', () => {
    it('should generate standard Tailwind utility classes for glass card container', () => {
      const tailwind = generateTailwindCss(DEFAULT_MESH_CONFIG, DEFAULT_GLASS_CONFIG);

      expect(tailwind).toContain('backdrop-blur-');
      expect(tailwind).toContain('border');
      expect(tailwind).toContain('rounded-');
      expect(tailwind).toContain('shadow-');
    });
  });

  describe('renderMeshToCanvas & exportMeshPngBlob', () => {
    it('should render mesh gradient to canvas matching specified dimensions', async () => {
      const canvas = await renderMeshToCanvas(DEFAULT_MESH_CONFIG, undefined, 1200, 800);

      expect(canvas).toBeDefined();
      expect(canvas.width).toBe(1200);
      expect(canvas.height).toBe(800);
    });

    it('should export full-resolution PNG blob of the mesh gradient', async () => {
      const blob = await exportMeshPngBlob(DEFAULT_MESH_CONFIG, 1200, 800);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe('randomizeMeshPoints', () => {
    it('should generate randomized points with valid coordinates and hex colors', () => {
      const randomPoints = randomizeMeshPoints();

      expect(randomPoints.length).toBeGreaterThanOrEqual(3);
      expect(randomPoints.length).toBeLessThanOrEqual(6);

      for (const pt of randomPoints) {
        expect(pt.x).toBeGreaterThanOrEqual(5);
        expect(pt.x).toBeLessThanOrEqual(95);
        expect(pt.y).toBeGreaterThanOrEqual(5);
        expect(pt.y).toBeLessThanOrEqual(95);
        expect(pt.color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(pt.radius).toBeGreaterThan(20);
      }
    });
  });
});
