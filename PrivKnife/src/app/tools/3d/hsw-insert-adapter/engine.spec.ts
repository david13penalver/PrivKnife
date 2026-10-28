import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import JSZip from 'jszip';
import {
  validateHswOptions,
  generateHswMesh,
  exportHswSTL,
  exportHsw3MF,
  processHsw,
} from './engine';
import {
  DEFAULT_HSW_OPTIONS,
  MINIMAL_HSW_OPTIONS,
  MAXIMUM_HSW_OPTIONS,
  HSW_PRESETS,
} from './test-fixtures';
import { HswInsertType, MetricNutSize } from './types';

describe('Honeycomb Storage Wall (HSW) Insert & Adapter Engine (Seam 1)', () => {
  describe('Parameter Validation & Guardrails', () => {
    it('should validate default options successfully', () => {
      const result = validateHswOptions(DEFAULT_HSW_OPTIONS);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject null or undefined options', () => {
      expect(validateHswOptions(null as any).valid).toBe(false);
      expect(validateHswOptions(undefined as any).valid).toBe(false);
    });

    it('should enforce magnet diameter boundaries [5.0mm, 15.0mm]', () => {
      expect(validateHswOptions({ ...DEFAULT_HSW_OPTIONS, magnetDiameterMm: 4.0 }).valid).toBe(false);
      expect(validateHswOptions({ ...DEFAULT_HSW_OPTIONS, magnetDiameterMm: 16.0 }).valid).toBe(false);
    });

    it('should enforce magnet depth boundaries [1.5mm, 5.0mm]', () => {
      expect(validateHswOptions({ ...DEFAULT_HSW_OPTIONS, magnetDepthMm: 1.0 }).valid).toBe(false);
      expect(validateHswOptions({ ...DEFAULT_HSW_OPTIONS, magnetDepthMm: 5.5 }).valid).toBe(false);
    });

    it('should enforce hook length boundaries [15mm, 70mm]', () => {
      expect(validateHswOptions({ ...DEFAULT_HSW_OPTIONS, hookLengthMm: 10 }).valid).toBe(false);
      expect(validateHswOptions({ ...DEFAULT_HSW_OPTIONS, hookLengthMm: 75 }).valid).toBe(false);
    });

    it('should enforce hook angle boundaries [0°, 60°]', () => {
      expect(validateHswOptions({ ...DEFAULT_HSW_OPTIONS, hookAngleDeg: -5 }).valid).toBe(false);
      expect(validateHswOptions({ ...DEFAULT_HSW_OPTIONS, hookAngleDeg: 65 }).valid).toBe(false);
    });

    it('should enforce ring diameter boundaries [15mm, 60mm]', () => {
      expect(validateHswOptions({ ...DEFAULT_HSW_OPTIONS, ringDiameterMm: 12 }).valid).toBe(false);
      expect(validateHswOptions({ ...DEFAULT_HSW_OPTIONS, ringDiameterMm: 65 }).valid).toBe(false);
    });

    it('should enforce tightness tolerance boundaries [-0.2mm, +0.3mm]', () => {
      expect(validateHswOptions({ ...DEFAULT_HSW_OPTIONS, tightnessToleranceMm: -0.3 }).valid).toBe(false);
      expect(validateHswOptions({ ...DEFAULT_HSW_OPTIONS, tightnessToleranceMm: 0.4 }).valid).toBe(false);
    });

    it('should enforce plug depth boundaries [6.0mm, 12.0mm]', () => {
      expect(validateHswOptions({ ...DEFAULT_HSW_OPTIONS, plugDepthMm: 5.0 }).valid).toBe(false);
      expect(validateHswOptions({ ...DEFAULT_HSW_OPTIONS, plugDepthMm: 13.0 }).valid).toBe(false);
    });
  });

  describe('3D HSW Procedural Mesh Generation', () => {
    it('should generate plug meshes and valid metrics for default options', () => {
      const result = generateHswMesh(DEFAULT_HSW_OPTIONS);
      expect(result.plugGeometry).toBeInstanceOf(THREE.BufferGeometry);
      expect(result.attachmentGeometry).toBeInstanceOf(THREE.BufferGeometry);

      expect(result.metrics.acrossFlatsMm).toBeCloseTo(20.0, 1);
      expect(result.metrics.plugDepthMm).toBe(DEFAULT_HSW_OPTIONS.plugDepthMm);
      expect(result.metrics.totalTriangles).toBeGreaterThan(0);
      expect(result.metrics.estimatedGrams).toBeGreaterThan(0);
      expect(result.metrics.hswPrintingTips.length).toBeGreaterThan(0);

      result.plugGeometry.dispose();
      result.attachmentGeometry.dispose();
    });

    it('should generate all supported insert types without throwing', () => {
      const types: HswInsertType[] = [
        'empty_plug',
        'hex_nut_pocket',
        'threaded_post',
        'magnet_holder',
        'tool_hook',
        'storage_ring',
      ];

      for (const t of types) {
        const result = generateHswMesh({
          ...DEFAULT_HSW_OPTIONS,
          insertType: t,
        });

        expect(result.plugGeometry.getAttribute('position')).toBeDefined();
        expect(result.attachmentGeometry.getAttribute('position')).toBeDefined();
        expect(result.metrics.totalTriangles).toBeGreaterThan(0);

        result.plugGeometry.dispose();
        result.attachmentGeometry.dispose();
      }
    });

    it('should generate all supported metric nut sizes (M3, M4, M5)', () => {
      const nutSizes: MetricNutSize[] = ['M3', 'M4', 'M5'];
      for (const size of nutSizes) {
        const result = generateHswMesh({
          ...DEFAULT_HSW_OPTIONS,
          insertType: 'hex_nut_pocket',
          nutSize: size,
        });

        expect(result.plugGeometry).toBeInstanceOf(THREE.BufferGeometry);
        result.plugGeometry.dispose();
        result.attachmentGeometry.dispose();
      }
    });

    it('should generate retention click-tabs when retentionTabs is true', () => {
      const withTabs = generateHswMesh({ ...DEFAULT_HSW_OPTIONS, retentionTabs: true });
      const withoutTabs = generateHswMesh({ ...DEFAULT_HSW_OPTIONS, retentionTabs: false });

      expect(withTabs.metrics.plugTriangles).toBeGreaterThanOrEqual(withoutTabs.metrics.plugTriangles);

      withTabs.plugGeometry.dispose();
      withTabs.attachmentGeometry.dispose();
      withoutTabs.plugGeometry.dispose();
      withoutTabs.attachmentGeometry.dispose();
    });

    it('should support minimal options without crashing', () => {
      const result = generateHswMesh(MINIMAL_HSW_OPTIONS);
      expect(result.plugGeometry).toBeInstanceOf(THREE.BufferGeometry);
      result.plugGeometry.dispose();
      result.attachmentGeometry.dispose();
    });

    it('should support maximum options without crashing', () => {
      const result = generateHswMesh(MAXIMUM_HSW_OPTIONS);
      expect(result.plugGeometry).toBeInstanceOf(THREE.BufferGeometry);
      result.plugGeometry.dispose();
      result.attachmentGeometry.dispose();
    });

    it('should not intrude into storage_ring inner aperture (DEFECT-42-01)', () => {
      const ringDia = 30.0;
      const ringInnerR = ringDia / 2;
      const ringWall = 3.5;
      const ringOuterDia = ringDia + ringWall * 2;
      const standOff = ringOuterDia / 2 + 2.0;

      const result = generateHswMesh({
        ...DEFAULT_HSW_OPTIONS,
        insertType: 'storage_ring',
        ringDiameterMm: ringDia,
      });

      const pos = result.attachmentGeometry.getAttribute('position');
      expect(pos).toBeDefined();

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const distToCenter = Math.sqrt(x * x + (y - standOff) * (y - standOff));
        // No vertex may lie strictly inside the inner hole
        expect(distToCenter).toBeGreaterThanOrEqual(ringInnerR - 0.05);
      }

      result.plugGeometry.dispose();
      result.attachmentGeometry.dispose();
    });

    it('should place tool_hook gusset entirely in front of the plug face (DEFECT-42-01)', () => {
      const result = generateHswMesh({
        ...DEFAULT_HSW_OPTIONS,
        insertType: 'tool_hook',
        plugDepthMm: 8.0,
        flangeRim: true,
      });

      result.attachmentGeometry.computeBoundingBox();
      const box = result.attachmentGeometry.boundingBox!;
      const frontZ = 8.0 + 1.6; // depth + flange

      expect(box.min.z).toBeGreaterThanOrEqual(frontZ - 0.01);

      result.plugGeometry.dispose();
      result.attachmentGeometry.dispose();
    });

    it('should match totalTriangles between metrics and binary STL for empty_plug (DEFECT-42-01)', () => {
      const result = generateHswMesh({
        ...DEFAULT_HSW_OPTIONS,
        insertType: 'empty_plug',
      });

      const buffer = exportHswSTL(result.plugGeometry, result.attachmentGeometry);
      const dv = new DataView(buffer);
      const stlTriCount = dv.getUint32(80, true);

      expect(result.metrics.totalTriangles).toBe(stlTriCount);

      result.plugGeometry.dispose();
      result.attachmentGeometry.dispose();
    });

    it('should reflect tightness tolerance in acrossFlatsMm metric (DEFECT-42-03)', () => {
      const result = generateHswMesh({
        ...DEFAULT_HSW_OPTIONS,
        tightnessToleranceMm: 0.15,
      });

      expect(result.metrics.acrossFlatsMm).toBe(20.15);

      result.plugGeometry.dispose();
      result.attachmentGeometry.dispose();
    });

    it('should generate ganged multi-cell HSW plugs at canonical pitch for 2x1 and 2x2 grids (DEFECT-42-03)', () => {
      const result2x1 = generateHswMesh({
        ...DEFAULT_HSW_OPTIONS,
        cellGrid: '2x1',
      });

      result2x1.plugGeometry.computeBoundingBox();
      const box2x1 = result2x1.plugGeometry.boundingBox!;
      const width2x1 = box2x1.max.x - box2x1.min.x;
      // Canonical pitch 23.6mm + across flats ~20mm -> width >= 40mm
      expect(width2x1).toBeGreaterThanOrEqual(40.0);

      const result2x2 = generateHswMesh({
        ...DEFAULT_HSW_OPTIONS,
        cellGrid: '2x2',
      });

      result2x2.plugGeometry.computeBoundingBox();
      const box2x2 = result2x2.plugGeometry.boundingBox!;
      const width2x2 = box2x2.max.x - box2x2.min.x;
      const height2x2 = box2x2.max.y - box2x2.min.y;
      expect(width2x2).toBeGreaterThanOrEqual(40.0);
      expect(height2x2).toBeGreaterThanOrEqual(38.0);

      result2x1.plugGeometry.dispose();
      result2x1.attachmentGeometry.dispose();
      result2x2.plugGeometry.dispose();
      result2x2.attachmentGeometry.dispose();
    });
  });

  describe('File Serialization & Export (STL & 3MF)', () => {
    it('should encode insert into valid binary STL buffer with 80-byte header', () => {
      const { plugGeometry, attachmentGeometry } = generateHswMesh(DEFAULT_HSW_OPTIONS);
      const buffer = exportHswSTL(plugGeometry, attachmentGeometry);

      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(84);

      const dv = new DataView(buffer);
      const triangleCount = dv.getUint32(80, true);
      expect(triangleCount).toBeGreaterThan(0);
      expect(buffer.byteLength).toBe(84 + triangleCount * 50);

      plugGeometry.dispose();
      attachmentGeometry.dispose();
    });

    it('should package multi-part 3MF archive with 3D model XML and rels', async () => {
      const { plugGeometry, attachmentGeometry } = generateHswMesh(DEFAULT_HSW_OPTIONS);
      const blob = await exportHsw3MF(
        plugGeometry,
        attachmentGeometry,
        DEFAULT_HSW_OPTIONS
      );

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('model/3mf');
      expect(blob.size).toBeGreaterThan(100);

      const arrayBuf = await blob.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuf);

      expect(zip.file('3D/3dmodel.model')).not.toBeNull();
      expect(zip.file('[Content_Types].xml')).not.toBeNull();
      expect(zip.file('_rels/.rels')).not.toBeNull();

      const modelXml = await zip.file('3D/3dmodel.model')!.async('text');
      expect(modelXml).toContain('<model');
      expect(modelXml).toContain('object id="1" name="HSW Hex Plug"');

      plugGeometry.dispose();
      attachmentGeometry.dispose();
    });

    it('should execute end-to-end processHsw for STL export', async () => {
      const result = await processHsw(DEFAULT_HSW_OPTIONS, 'stl');
      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('model/stl');
      expect(result.fileName).toMatch(/\.stl$/);
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.metrics.totalTriangles).toBeGreaterThan(0);
    });

    it('should execute end-to-end processHsw for 3MF export', async () => {
      const result = await processHsw(DEFAULT_HSW_OPTIONS, '3mf');
      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('model/3mf');
      expect(result.fileName).toMatch(/\.3mf$/);
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.metrics.totalTriangles).toBeGreaterThan(0);
    });
  });
});
