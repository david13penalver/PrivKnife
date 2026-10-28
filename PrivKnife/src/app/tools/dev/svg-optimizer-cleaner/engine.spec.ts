import { describe, it, expect } from 'vitest';
import { optimizeSvg, validateSvg, generateExportCode } from './engine';
import {
  DEFAULT_SVG_OPTIONS,
  SAMPLE_BLOATED_SVG,
  SAMPLE_SIMPLE_SVG,
  SAMPLE_INVALID_SVG,
} from './test-fixtures';

describe('SvgOptimizerEngine (engine.ts) - Seam 1', () => {
  describe('validateSvg', () => {
    it('should validate standard SVG markup successfully', () => {
      const res = validateSvg(SAMPLE_SIMPLE_SVG);
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('should fail on empty or non-svg string', () => {
      expect(validateSvg('').isValid).toBe(false);
      expect(validateSvg('   ').isValid).toBe(false);
      expect(validateSvg(SAMPLE_INVALID_SVG).isValid).toBe(false);
    });

    it('should fail on malformed XML that is not SVG', () => {
      const invalidXml = '<div><p>Hello</p></div>';
      const res = validateSvg(invalidXml);
      expect(res.isValid).toBe(false);
    });
  });

  describe('optimizeSvg processing', () => {
    it('should optimize a bloated SVG and reduce size', () => {
      const result = optimizeSvg(SAMPLE_BLOATED_SVG, DEFAULT_SVG_OPTIONS);

      expect(result.success).toBe(true);
      expect(result.optimizedSvg).toContain('<svg');
      expect(result.stats.originalBytes).toBeGreaterThan(result.stats.optimizedBytes);
      expect(result.stats.savingsPercent).toBeGreaterThan(0);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob.type).toBe('image/svg+xml');
    });

    it('should strip metadata, comments, and editor namespaces', () => {
      const result = optimizeSvg(SAMPLE_BLOATED_SVG, {
        ...DEFAULT_SVG_OPTIONS,
        stripMetadataComments: true,
      });

      expect(result.optimizedSvg).not.toContain('Adobe Illustrator');
      expect(result.optimizedSvg).not.toContain('<metadata>');
      expect(result.optimizedSvg).not.toContain('<rdf:RDF>');
      expect(result.optimizedSvg).not.toContain('<desc>');
      expect(result.optimizedSvg).not.toContain('xmlns:sketch');
      expect(result.optimizedSvg).not.toContain('xmlns:inkscape');
    });

    it('should round coordinates to specified floatPrecision', () => {
      const result = optimizeSvg(SAMPLE_BLOATED_SVG, {
        ...DEFAULT_SVG_OPTIONS,
        floatPrecision: 1,
      });

      // Original path has 10.123456 -> should be 10.1
      expect(result.optimizedSvg).not.toContain('10.123456');
      expect(result.optimizedSvg).toContain('10.1');
      // Original circle r="40.555555" -> 40.6
      expect(result.optimizedSvg).not.toContain('40.555555');
      expect(result.optimizedSvg).toContain('40.6');
    });

    it('should remove width and height when viewBox is present if removeDimensionsForViewBox is true', () => {
      const result = optimizeSvg(SAMPLE_BLOATED_SVG, {
        ...DEFAULT_SVG_OPTIONS,
        removeDimensionsForViewBox: true,
      });

      expect(result.optimizedSvg).toContain('viewBox');
      // Root svg should not have width="200.000000px"
      expect(result.optimizedSvg).not.toContain('width="200');
    });

    it('should collapse useless nested groups with no attributes', () => {
      const result = optimizeSvg(SAMPLE_BLOATED_SVG, {
        ...DEFAULT_SVG_OPTIONS,
        collapseUselessGroups: true,
      });

      expect(result.optimizedSvg).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should convert rgb colors to compact hex (#ffffff -> #fff)', () => {
      const result = optimizeSvg(SAMPLE_BLOATED_SVG, {
        ...DEFAULT_SVG_OPTIONS,
        convertColorsToHex: true,
      });

      expect(result.optimizedSvg).not.toContain('rgb(255, 255, 255)');
      expect(result.optimizedSvg).toContain('#fff');
    });

    it('should handle boundary precision values (0 to 5)', () => {
      const res0 = optimizeSvg(SAMPLE_BLOATED_SVG, {
        ...DEFAULT_SVG_OPTIONS,
        floatPrecision: 0,
      });
      expect(res0.success).toBe(true);
      expect(res0.optimizedSvg).toContain('10');

      const res5 = optimizeSvg(SAMPLE_BLOATED_SVG, {
        ...DEFAULT_SVG_OPTIONS,
        floatPrecision: 5,
      });
      expect(res5.success).toBe(true);
    });

    it('should gracefully handle invalid SVG input with an error result', () => {
      const result = optimizeSvg('not valid', DEFAULT_SVG_OPTIONS);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.fileSize).toBe(0);
    });

    it('should strip XSS payloads (<script>, <foreignObject>, on* handlers, and javascript: urls) from optimized SVG (DEFECT-54-01)', () => {
      const maliciousSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" onload="alert('xss1')">
        <script>alert('xss2')</script>
        <foreignObject width="100" height="100">
          <body xmlns="http://www.w3.org/1999/xhtml">
            <script>alert('xss3')</script>
          </body>
        </foreignObject>
        <a href="javascript:alert('xss4')">
          <circle cx="50" cy="50" r="40" onclick="alert('xss5')" onmouseover="alert('xss6')" />
        </a>
      </svg>`;

      const result = optimizeSvg(maliciousSvg, DEFAULT_SVG_OPTIONS);
      expect(result.success).toBe(true);
      expect(result.optimizedSvg).not.toContain('<script');
      expect(result.optimizedSvg).not.toContain('foreignObject');
      expect(result.optimizedSvg).not.toContain('onload');
      expect(result.optimizedSvg).not.toContain('onclick');
      expect(result.optimizedSvg).not.toContain('onmouseover');
      expect(result.optimizedSvg).not.toContain('javascript:');
      expect(result.optimizedSvg).toContain('<circle');
    });

    it('should strip unreferenced OuterGroup and InnerUselessGroup IDs and collapse redundant <g> wrappers in SAMPLE_BLOATED_SVG (DEFECT-54-03)', () => {
      const result = optimizeSvg(SAMPLE_BLOATED_SVG, {
        ...DEFAULT_SVG_OPTIONS,
        cleanupIds: true,
        collapseUselessGroups: true,
      });

      expect(result.success).toBe(true);
      expect(result.optimizedSvg).not.toContain('OuterGroup');
      expect(result.optimizedSvg).not.toContain('InnerUselessGroup');
      // Both redundant <g> groups should be collapsed so no <g> tag remains
      expect(result.optimizedSvg).not.toContain('<g');
    });
  });

  describe('generateExportCode', () => {
    it('should export raw optimized SVG', () => {
      const code = generateExportCode(SAMPLE_SIMPLE_SVG, 'svg', 'MyIcon');
      expect(code).toBe(SAMPLE_SIMPLE_SVG);
    });

    it('should export React TSX component with props and camelCase attributes', () => {
      const svgWithAttrs = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" stroke-width="2" fill-rule="evenodd" class="icon"><path d="M0 0"/></svg>`;
      const code = generateExportCode(svgWithAttrs, 'react_tsx', 'ShieldIcon');

      expect(code).toContain("import React from 'react';");
      expect(code).toContain('export const ShieldIcon: React.FC<React.SVGProps<SVGSVGElement>>');
      expect(code).toContain('{...props}');
      expect(code).toContain('strokeWidth="2"');
      expect(code).toContain('fillRule="evenodd"');
      expect(code).toContain('className="icon"');
      expect(code).toContain('export default ShieldIcon;');
    });

    it('should export Vue 3 SFC component', () => {
      const code = generateExportCode(SAMPLE_SIMPLE_SVG, 'vue_sfc', 'ShieldIcon');
      expect(code).toContain('<template>');
      expect(code).toContain('<script setup lang="ts">');
      expect(code).toContain('// Component: ShieldIcon');
      expect(code).toContain('</template>');
    });

    it('should export Svelte component', () => {
      const code = generateExportCode(SAMPLE_SIMPLE_SVG, 'svelte', 'ShieldIcon');
      expect(code).toContain('{...$$restProps}');
    });

    it('should export Data URI', () => {
      const code = generateExportCode(SAMPLE_SIMPLE_SVG, 'data_uri', 'ShieldIcon');
      expect(code.startsWith('data:image/svg+xml')).toBe(true);
    });
  });
});
