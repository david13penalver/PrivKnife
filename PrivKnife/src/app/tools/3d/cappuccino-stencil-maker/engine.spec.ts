import { describe, expect, it } from 'vitest';
import {
  validateStencilOptions,
  generateStencilMesh,
  generateStencilSvg,
  exportStencilSTL,
  processStencil,
} from './engine';
import {
  DEFAULT_STENCIL_OPTIONS,
  MINIMAL_STENCIL_OPTIONS,
  MAXIMUM_STENCIL_OPTIONS,
} from './test-fixtures';
import { StencilMotif } from './types';

describe('Cappuccino Stencil & Airbrush Template Maker Engine (Seam 1)', () => {
  describe('Parameter Validation & Guardrails', () => {
    it('should validate default options successfully', () => {
      const result = validateStencilOptions(DEFAULT_STENCIL_OPTIONS);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject null or undefined options', () => {
      const result = validateStencilOptions(null as any);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should enforce stencil diameter boundaries [60mm, 150mm]', () => {
      expect(
        validateStencilOptions({ ...DEFAULT_STENCIL_OPTIONS, stencilDiameterMm: 45 }).valid
      ).toBe(false);
      expect(
        validateStencilOptions({ ...DEFAULT_STENCIL_OPTIONS, stencilDiameterMm: 200 }).valid
      ).toBe(false);
      expect(
        validateStencilOptions({ ...DEFAULT_STENCIL_OPTIONS, stencilDiameterMm: 90 }).valid
      ).toBe(true);
    });

    it('should enforce stencil thickness boundaries [0.6mm, 4.0mm]', () => {
      expect(
        validateStencilOptions({ ...DEFAULT_STENCIL_OPTIONS, stencilThicknessMm: 0.3 }).valid
      ).toBe(false);
      expect(
        validateStencilOptions({ ...DEFAULT_STENCIL_OPTIONS, stencilThicknessMm: 5.5 }).valid
      ).toBe(false);
      expect(
        validateStencilOptions({ ...DEFAULT_STENCIL_OPTIONS, stencilThicknessMm: 1.5 }).valid
      ).toBe(true);
    });

    it('should enforce handle length boundaries [10mm, 100mm]', () => {
      expect(
        validateStencilOptions({ ...DEFAULT_STENCIL_OPTIONS, handleLengthMm: 5 }).valid
      ).toBe(false);
      expect(
        validateStencilOptions({ ...DEFAULT_STENCIL_OPTIONS, handleLengthMm: 120 }).valid
      ).toBe(false);
      expect(
        validateStencilOptions({ ...DEFAULT_STENCIL_OPTIONS, handleLengthMm: 35 }).valid
      ).toBe(true);
    });

    it('should enforce bridge width boundaries [0.8mm, 5.0mm]', () => {
      expect(
        validateStencilOptions({ ...DEFAULT_STENCIL_OPTIONS, bridgeWidthMm: 0.4 }).valid
      ).toBe(false);
      expect(
        validateStencilOptions({ ...DEFAULT_STENCIL_OPTIONS, bridgeWidthMm: 7.0 }).valid
      ).toBe(false);
      expect(
        validateStencilOptions({ ...DEFAULT_STENCIL_OPTIONS, bridgeWidthMm: 2.0 }).valid
      ).toBe(true);
    });

    it('should reject empty custom text when motif is custom_text', () => {
      expect(
        validateStencilOptions({
          ...DEFAULT_STENCIL_OPTIONS,
          motif: 'custom_text',
          customText: '   ',
        }).valid
      ).toBe(false);
      expect(
        validateStencilOptions({
          ...DEFAULT_STENCIL_OPTIONS,
          motif: 'custom_text',
          customText: 'COFFEE',
        }).valid
      ).toBe(true);
    });
  });

  describe('3D Stencil Procedural Mesh Generation', () => {
    it('should generate stencil mesh for default heart motif', () => {
      const result = generateStencilMesh(DEFAULT_STENCIL_OPTIONS);
      expect(result.stencilGeometry).toBeDefined();
      expect(result.metrics.totalTriangles).toBeGreaterThan(50);
      expect(result.metrics.diameterMm).toBe(95);
      expect(result.metrics.totalLengthWithHandleMm).toBeGreaterThan(95);
      expect(result.metrics.foodSafetyTips.length).toBeGreaterThan(0);
    });

    it('should support all standard handle types (thumb_tab, extended_rod, dual_ear)', () => {
      const handles = ['thumb_tab', 'extended_rod', 'dual_ear'] as const;
      for (const h of handles) {
        const res = generateStencilMesh({ ...DEFAULT_STENCIL_OPTIONS, handleType: h });
        expect(res.metrics.totalTriangles).toBeGreaterThan(0);
        expect(res.metrics.totalLengthWithHandleMm).toBeGreaterThanOrEqual(95);
      }
    });

    it('should support all built-in motifs without crashing', () => {
      const motifs: StencilMotif[] = [
        'heart',
        'coffee_bean',
        'coffee_cup',
        'leaf_rosetta',
        'cat_paw',
        'star_burst',
        'custom_text',
      ];

      for (const m of motifs) {
        const res = generateStencilMesh({ ...DEFAULT_STENCIL_OPTIONS, motif: m });
        expect(res.metrics.totalTriangles).toBeGreaterThan(0);
        expect(res.svgContent).toContain('<svg');
      }
    });

    it('should generate bridge tabs when autoBridgeIslands is enabled', () => {
      const resWithBridge = generateStencilMesh({
        ...DEFAULT_STENCIL_OPTIONS,
        motif: 'custom_text',
        customText: 'O',
        autoBridgeIslands: true,
      });
      expect(resWithBridge.metrics.bridgeTabCount).toBeGreaterThan(0);
    });

    it('should support minimal options without crashing', () => {
      const result = generateStencilMesh(MINIMAL_STENCIL_OPTIONS);
      expect(result.metrics.diameterMm).toBe(60);
      expect(result.metrics.totalTriangles).toBeGreaterThan(30);
    });

    it('should support maximum options with extended rod handle', () => {
      const result = generateStencilMesh(MAXIMUM_STENCIL_OPTIONS);
      expect(result.metrics.diameterMm).toBe(140);
      expect(result.metrics.totalLengthWithHandleMm).toBeGreaterThan(180);
    });
  });

  describe('Vector SVG Generation', () => {
    it('should generate clean vector SVG markup for laser cutting', () => {
      const svg = generateStencilSvg(DEFAULT_STENCIL_OPTIONS);
      expect(svg).toContain('<svg');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('viewBox=');
      expect(svg).toContain('<path');
      expect(svg).toContain('</svg>');
    });

    it('should sample circular arcs and emit full 360-degree contours and multi-point holes (DEFECT-40-01)', () => {
      const svg = generateStencilSvg({
        ...DEFAULT_STENCIL_OPTIONS,
        stencilDiameterMm: 95,
        handleHole: true,
      });

      // Extract path commands
      const pathMatches = svg.match(/d="([^"]+)"/);
      expect(pathMatches).toBeTruthy();
      const pathD = pathMatches![1];

      // Extract all (x, y) coordinates
      const coords: { x: number; y: number }[] = [];
      const regex = /[ML]\s+([\d.-]+)\s+([\d.-]+)/g;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(pathD)) !== null) {
        coords.push({ x: parseFloat(match[1]), y: parseFloat(match[2]) });
      }

      // Outer disc + tab must have >= 60 vertices (dense arc sampling)
      expect(coords.length).toBeGreaterThanOrEqual(60);

      // Verify the contour spans the full 95mm disc:
      // Left edge of disc should reach x < 20 mm (center ~57.5, radius 47.5 => x_left ~ 10.0)
      const minX = Math.min(...coords.map((c) => c.x));
      const maxX = Math.max(...coords.map((c) => c.x));
      expect(minX).toBeLessThan(20);
      expect(maxX).toBeGreaterThan(95);

      // Verify handle hole is included and sampled with multiple points (not degenerate point-to-point)
      const subpaths = pathD.trim().split('Z').filter((sp) => sp.trim().length > 0);
      expect(subpaths.length).toBeGreaterThanOrEqual(2); // Outer + handle hole + motif
      for (const sp of subpaths) {
        const spCoords = Array.from(sp.matchAll(/[ML]\s+([\d.-]+)\s+([\d.-]+)/g));
        expect(spCoords.length).toBeGreaterThan(2); // Non-degenerate
      }
    });
  });

  describe('Procedural Geometry Modifiers (DEFECT-40-03)', () => {
    it('should modify geometry and reduce cutout area when autoBridgeIslands is enabled', () => {
      const resWithoutBridge = generateStencilMesh({
        ...DEFAULT_STENCIL_OPTIONS,
        motif: 'custom_text',
        customText: 'O',
        autoBridgeIslands: false,
        bridgeWidthMm: 2.0,
      });

      const resWithBridge = generateStencilMesh({
        ...DEFAULT_STENCIL_OPTIONS,
        motif: 'custom_text',
        customText: 'O',
        autoBridgeIslands: true,
        bridgeWidthMm: 2.0,
      });

      expect(resWithBridge.metrics.bridgeTabCount).toBeGreaterThan(0);
      expect(resWithBridge.metrics.cutoutAreaMm2).toBeLessThan(
        resWithoutBridge.metrics.cutoutAreaMm2
      );

      const posWithout = resWithoutBridge.stencilGeometry.getAttribute('position');
      const posWith = resWithBridge.stencilGeometry.getAttribute('position');
      expect(posWith.count).not.toBe(posWithout.count);
    });

    it('should increase triangle count and enable chamfer when rimBevel is true', () => {
      const resFlat = generateStencilMesh({
        ...DEFAULT_STENCIL_OPTIONS,
        rimBevel: false,
      });

      const resBevel = generateStencilMesh({
        ...DEFAULT_STENCIL_OPTIONS,
        rimBevel: true,
      });

      expect(resBevel.metrics.totalTriangles).toBeGreaterThan(resFlat.metrics.totalTriangles);
    });
  });

  describe('File Serialization & Export (STL & SVG)', () => {
    it('should encode a stencil into valid binary STL buffer with 80-byte header', () => {
      const { stencilGeometry } = generateStencilMesh(DEFAULT_STENCIL_OPTIONS);
      const stlBuffer = exportStencilSTL(stencilGeometry);
      expect(stlBuffer).toBeInstanceOf(ArrayBuffer);
      expect(stlBuffer.byteLength).toBeGreaterThan(84);

      const view = new DataView(stlBuffer);
      const triangleCount = view.getUint32(80, true);
      expect(triangleCount).toBeGreaterThan(0);
      expect(stlBuffer.byteLength).toBe(84 + triangleCount * 50);
    });

    it('should execute end-to-end processStencil for STL export', async () => {
      const result = await processStencil(DEFAULT_STENCIL_OPTIONS, 'stl');
      expect(result.success).toBe(true);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.fileName).toContain('.stl');
      expect(result.fileSize).toBeGreaterThan(500);
      expect(result.mimeType).toBe('model/stl');
    });

    it('should execute end-to-end processStencil for SVG export', async () => {
      const result = await processStencil(DEFAULT_STENCIL_OPTIONS, 'svg');
      expect(result.success).toBe(true);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.fileName).toContain('.svg');
      expect(result.fileSize).toBeGreaterThan(200);
      expect(result.mimeType).toBe('image/svg+xml');
      expect(result.svgContent).toContain('<svg');
    });
  });
});
