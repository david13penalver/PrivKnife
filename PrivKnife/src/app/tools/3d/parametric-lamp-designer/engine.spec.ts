import { describe, it, expect } from 'vitest';
import {
  validateLampConfig,
  evaluateBaseRadius,
  evaluateRibWave,
  evaluateOuterRadius,
  generateLampShadeGeometry,
  computeLampMetrics,
  exportBinarySTL,
  export3mf,
  processLampDesign,
} from './engine';
import { DEFAULT_LAMP_CONFIG, SAMPLE_LAMP_PRESETS } from './test-fixtures';
import { LampConfig } from './types';

describe('LampDesignerEngine (Seam 1: Pure Processing Boundary)', () => {
  describe('validateLampConfig', () => {
    it('should validate a correct default configuration', () => {
      const result = validateLampConfig(DEFAULT_LAMP_CONFIG);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid dimensions or negative values', () => {
      const invalid: LampConfig = {
        ...DEFAULT_LAMP_CONFIG,
        height: -10,
        bottomRadius: 0,
        topRadius: -5,
      };
      const result = validateLampConfig(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Mathematical Profile Evaluations', () => {
    it('should evaluate base radius across different curve types', () => {
      const curveTypes: LampConfig['curveType'][] = [
        'spline',
        'conical',
        'hourglass',
        'bulbous',
        'scurve',
      ];
      for (const curve of curveTypes) {
        const config = { ...DEFAULT_LAMP_CONFIG, curveType: curve };
        const rBottom = evaluateBaseRadius(0, config);
        const rMid = evaluateBaseRadius(config.waistRatio, config);
        const rTop = evaluateBaseRadius(1, config);

        expect(rBottom).toBeCloseTo(config.bottomRadius, 0);
        expect(rTop).toBeCloseTo(config.topRadius, 0);
        expect(rMid).toBeGreaterThan(0);
      }
    });

    it('should evaluate rib waves correctly for all profiles', () => {
      const profiles: LampConfig['ribProfile'][] = ['sine', 'pleat', 'scallop', 'gear'];
      for (const prof of profiles) {
        const val0 = evaluateRibWave(0, prof);
        const valPi = evaluateRibWave(Math.PI, prof);
        expect(val0).toBeGreaterThanOrEqual(-1.1);
        expect(val0).toBeLessThanOrEqual(1.1);
        expect(valPi).toBeGreaterThanOrEqual(-1.1);
        expect(valPi).toBeLessThanOrEqual(1.1);
      }
    });

    it('should evaluate outer radius with rib and wave modulation', () => {
      const config = { ...DEFAULT_LAMP_CONFIG, ribCount: 16, ribDepth: 5 };
      const rOuter = evaluateOuterRadius(0.5, 0.5, config);
      expect(rOuter).toBeGreaterThan(config.bottomRadius * 0.5);
    });
  });

  describe('generateLampShadeGeometry', () => {
    it('should generate valid watertight BufferGeometry for shell mode', () => {
      // Use lower segments for fast unit test
      const testConfig: LampConfig = {
        ...DEFAULT_LAMP_CONFIG,
        radialSegs: 32,
        heightSegs: 16,
      };
      const geom = generateLampShadeGeometry(testConfig);
      expect(geom).toBeDefined();

      const posAttr = geom.getAttribute('position');
      expect(posAttr).toBeDefined();
      expect(posAttr.count).toBeGreaterThan(100);

      const colorAttr = geom.getAttribute('color');
      expect(colorAttr).toBeDefined();
      expect(colorAttr.count).toBe(posAttr.count);

      geom.computeBoundingBox();
      const bbox = geom.boundingBox!;
      expect(bbox.max.y - bbox.min.y).toBeCloseTo(testConfig.height, 0);
      geom.dispose();
    });

    it('should generate geometry for vase print mode', () => {
      const vaseConfig: LampConfig = {
        ...DEFAULT_LAMP_CONFIG,
        printMode: 'vase',
        radialSegs: 32,
        heightSegs: 16,
      };
      const geom = generateLampShadeGeometry(vaseConfig);
      expect(geom).toBeDefined();
      expect(geom.getAttribute('position').count).toBeGreaterThan(0);
      geom.dispose();
    });

    it('should generate geometry with top mount socket', () => {
      const topMountConfig: LampConfig = {
        ...DEFAULT_LAMP_CONFIG,
        mountPos: 'top',
        socketPreset: 'e14',
        socketDia: 28,
        radialSegs: 32,
        heightSegs: 16,
      };
      const geom = generateLampShadeGeometry(topMountConfig);
      expect(geom).toBeDefined();
      expect(geom.getAttribute('position').count).toBeGreaterThan(0);
      geom.dispose();
    });

    it('should generate geometry when socket preset is none', () => {
      const noSocketConfig: LampConfig = {
        ...DEFAULT_LAMP_CONFIG,
        socketPreset: 'none',
        radialSegs: 32,
        heightSegs: 16,
      };
      const geom = generateLampShadeGeometry(noSocketConfig);
      expect(geom).toBeDefined();
      expect(geom.getAttribute('position').count).toBeGreaterThan(0);
      geom.dispose();
    });

    it('should generate all curated presets successfully', () => {
      for (const preset of SAMPLE_LAMP_PRESETS) {
        const fullConfig: LampConfig = {
          ...DEFAULT_LAMP_CONFIG,
          ...preset.config,
          radialSegs: 24,
          heightSegs: 16,
        };
        const geom = generateLampShadeGeometry(fullConfig);
        expect(geom.getAttribute('position').count).toBeGreaterThan(0);
        geom.dispose();
      }
    });
  });

  describe('computeLampMetrics', () => {
    it('should compute realistic volume, weight, and slicer advice', () => {
      const config: LampConfig = {
        ...DEFAULT_LAMP_CONFIG,
        radialSegs: 32,
        heightSegs: 16,
      };
      const geom = generateLampShadeGeometry(config);
      const metrics = computeLampMetrics(geom, config);

      expect(metrics.triangleCount).toBeGreaterThan(0);
      expect(metrics.vertexCount).toBeGreaterThan(0);
      expect(metrics.dimensionsMm.height).toBeCloseTo(config.height, 0);
      expect(metrics.estimatedGrams).toBeGreaterThan(10);
      expect(metrics.estimatedPrintTimeHours).toBeGreaterThan(0);
      expect(metrics.slicerTips.length).toBeGreaterThan(0);
      geom.dispose();
    });
  });

  describe('Binary STL Export', () => {
    it('should export binary STL with standard 80-byte header and 50-byte facets', () => {
      const config: LampConfig = {
        ...DEFAULT_LAMP_CONFIG,
        radialSegs: 24,
        heightSegs: 12,
      };
      const geom = generateLampShadeGeometry(config);
      const buffer = exportBinarySTL(geom, 'TestShade');

      expect(buffer).toBeInstanceOf(ArrayBuffer);
      const triCount = geom.getAttribute('position').count / 3;
      const expectedByteLength = 84 + triCount * 50;
      expect(buffer.byteLength).toBe(expectedByteLength);

      // Verify header ASCII start
      const headerBytes = new Uint8Array(buffer, 0, 80);
      const headerStr = String.fromCharCode(...headerBytes);
      expect(headerStr).toContain('PrivKnife');

      geom.dispose();
    });
  });

  describe('3MF Export', () => {
    it('should export valid 3MF archive blob with correct MIME type', async () => {
      const config: LampConfig = {
        ...DEFAULT_LAMP_CONFIG,
        radialSegs: 24,
        heightSegs: 12,
      };
      const geom = generateLampShadeGeometry(config);
      const blob = await export3mf(geom, config);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(100);
      expect(blob.type).toBe('application/vnd.ms-package.3dmanufacturing-3dmodel+xml');
      geom.dispose();
    });
  });

  describe('processLampDesign', () => {
    it('should process default design and produce download result', async () => {
      const config: LampConfig = {
        ...DEFAULT_LAMP_CONFIG,
        radialSegs: 24,
        heightSegs: 12,
      };
      const result = await processLampDesign(config, 'stl');
      expect(result.success).toBe(true);
      expect(result.fileName).toContain('.stl');
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.blob).toBeInstanceOf(Blob);
    });
  });
});
