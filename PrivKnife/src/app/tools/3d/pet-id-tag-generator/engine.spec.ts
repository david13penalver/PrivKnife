import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import JSZip from 'jszip';
import {
  validatePetTagOptions,
  generatePetTagMesh,
  exportPetTagSTL,
  exportPetTag3MF,
  processPetTag,
} from './engine';
import {
  DEFAULT_PET_TAG_OPTIONS,
  MINIMAL_PET_TAG_OPTIONS,
  MAXIMUM_PET_TAG_OPTIONS,
  SLIDE_ON_PET_TAG_OPTIONS,
} from './test-fixtures';
import { CharmShape, EmergencyIcon } from './types';

describe('Pet ID Tag & Collar Slide-On Generator Engine (Seam 1)', () => {
  describe('Parameter Validation & Guardrails', () => {
    it('should validate default options successfully', () => {
      const result = validatePetTagOptions(DEFAULT_PET_TAG_OPTIONS);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject null or undefined options', () => {
      expect(validatePetTagOptions(null as any).valid).toBe(false);
      expect(validatePetTagOptions(undefined as any).valid).toBe(false);
    });

    it('should enforce tag width boundaries [20mm, 70mm]', () => {
      expect(validatePetTagOptions({ ...DEFAULT_PET_TAG_OPTIONS, tagWidthMm: 18 }).valid).toBe(false);
      expect(validatePetTagOptions({ ...DEFAULT_PET_TAG_OPTIONS, tagWidthMm: 75 }).valid).toBe(false);
    });

    it('should enforce tag height boundaries [15mm, 50mm]', () => {
      expect(validatePetTagOptions({ ...DEFAULT_PET_TAG_OPTIONS, tagHeightMm: 12 }).valid).toBe(false);
      expect(validatePetTagOptions({ ...DEFAULT_PET_TAG_OPTIONS, tagHeightMm: 55 }).valid).toBe(false);
    });

    it('should enforce tag thickness boundaries [1.5mm, 5.0mm]', () => {
      expect(validatePetTagOptions({ ...DEFAULT_PET_TAG_OPTIONS, tagThicknessMm: 1.0 }).valid).toBe(false);
      expect(validatePetTagOptions({ ...DEFAULT_PET_TAG_OPTIONS, tagThicknessMm: 6.0 }).valid).toBe(false);
    });

    it('should enforce collar width boundaries [12mm, 45mm] for collar slide-on', () => {
      expect(
        validatePetTagOptions({
          ...DEFAULT_PET_TAG_OPTIONS,
          tagFormat: 'collar_slide_on',
          collarWidthMm: 10,
        }).valid
      ).toBe(false);
      expect(
        validatePetTagOptions({
          ...DEFAULT_PET_TAG_OPTIONS,
          tagFormat: 'collar_slide_on',
          collarWidthMm: 50,
        }).valid
      ).toBe(false);
    });

    it('should enforce raised text height boundaries [0.4mm, 2.0mm]', () => {
      expect(validatePetTagOptions({ ...DEFAULT_PET_TAG_OPTIONS, raisedTextHeightMm: 0.2 }).valid).toBe(false);
      expect(validatePetTagOptions({ ...DEFAULT_PET_TAG_OPTIONS, raisedTextHeightMm: 2.5 }).valid).toBe(false);
    });

    it('should reject empty pet name', () => {
      expect(validatePetTagOptions({ ...DEFAULT_PET_TAG_OPTIONS, petName: '' }).valid).toBe(false);
      expect(validatePetTagOptions({ ...DEFAULT_PET_TAG_OPTIONS, petName: '   ' }).valid).toBe(false);
    });

    it('should reject excessively long pet name (> 20 chars)', () => {
      expect(
        validatePetTagOptions({ ...DEFAULT_PET_TAG_OPTIONS, petName: 'BARTHOLOMEW THE THIRD JR' }).valid
      ).toBe(false);
    });
  });

  describe('3D Pet Tag Procedural Mesh Generation', () => {
    it('should generate tag meshes and valid metrics for default options', () => {
      const result = generatePetTagMesh(DEFAULT_PET_TAG_OPTIONS);
      expect(result.baseGeometry).toBeInstanceOf(THREE.BufferGeometry);
      expect(result.textGeometry).toBeInstanceOf(THREE.BufferGeometry);
      expect(result.iconGeometry).toBeInstanceOf(THREE.BufferGeometry);

      expect(result.metrics.widthMm).toBe(DEFAULT_PET_TAG_OPTIONS.tagWidthMm);
      expect(result.metrics.heightMm).toBe(DEFAULT_PET_TAG_OPTIONS.tagHeightMm);
      expect(result.metrics.thicknessMm).toBe(DEFAULT_PET_TAG_OPTIONS.tagThicknessMm);
      expect(result.metrics.totalTriangles).toBeGreaterThan(0);
      expect(result.metrics.estimatedGrams).toBeGreaterThan(0);
      expect(result.metrics.petSafetyTips.length).toBeGreaterThan(0);

      result.baseGeometry.dispose();
      result.textGeometry.dispose();
      result.iconGeometry.dispose();
    });

    it('should generate all supported charm shapes without throwing', () => {
      const shapes: CharmShape[] = ['bone', 'circle', 'heart', 'shield', 'hexagon'];
      for (const shape of shapes) {
        const result = generatePetTagMesh({
          ...DEFAULT_PET_TAG_OPTIONS,
          tagFormat: 'hanging_charm',
          charmShape: shape,
        });

        expect(result.baseGeometry.getAttribute('position')).toBeDefined();
        expect(result.metrics.totalTriangles).toBeGreaterThan(0);

        result.baseGeometry.dispose();
        result.textGeometry.dispose();
        result.iconGeometry.dispose();
      }
    });

    it('should generate collar slide-on format with slots and curvature', () => {
      const result = generatePetTagMesh(SLIDE_ON_PET_TAG_OPTIONS);
      expect(result.baseGeometry).toBeInstanceOf(THREE.BufferGeometry);
      expect(result.metrics.widthMm).toBe(SLIDE_ON_PET_TAG_OPTIONS.tagWidthMm);
      expect(result.metrics.totalTriangles).toBeGreaterThan(0);

      result.baseGeometry.dispose();
      result.textGeometry.dispose();
      result.iconGeometry.dispose();
    });

    it('should generate all emergency icons without throwing', () => {
      const icons: EmergencyIcon[] = ['none', 'medical_cross', 'microchip', 'paw', 'heart'];
      for (const icon of icons) {
        const result = generatePetTagMesh({
          ...DEFAULT_PET_TAG_OPTIONS,
          emergencyIcon: icon,
        });

        expect(result.baseGeometry).toBeInstanceOf(THREE.BufferGeometry);
        result.baseGeometry.dispose();
        result.textGeometry.dispose();
        result.iconGeometry.dispose();
      }
    });

    it('should support minimal options without crashing', () => {
      const result = generatePetTagMesh(MINIMAL_PET_TAG_OPTIONS);
      expect(result.baseGeometry).toBeInstanceOf(THREE.BufferGeometry);
      result.baseGeometry.dispose();
      result.textGeometry.dispose();
      result.iconGeometry.dispose();
    });

    it('should support maximum options without crashing', () => {
      const result = generatePetTagMesh(MAXIMUM_PET_TAG_OPTIONS);
      expect(result.baseGeometry).toBeInstanceOf(THREE.BufferGeometry);
      result.baseGeometry.dispose();
      result.textGeometry.dispose();
      result.iconGeometry.dispose();
    });
  });

  describe('File Serialization & Export (STL & 3MF)', () => {
    it('should encode tag into valid binary STL buffer with 80-byte header', () => {
      const { baseGeometry, textGeometry, iconGeometry } = generatePetTagMesh(DEFAULT_PET_TAG_OPTIONS);
      const buffer = exportPetTagSTL(baseGeometry, textGeometry, iconGeometry);

      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThan(84);

      const dv = new DataView(buffer);
      const triangleCount = dv.getUint32(80, true);
      expect(triangleCount).toBeGreaterThan(0);
      expect(buffer.byteLength).toBe(84 + triangleCount * 50);

      baseGeometry.dispose();
      textGeometry.dispose();
      iconGeometry.dispose();
    });

    it('should package multi-color 3MF archive with 3D model XML and rels', async () => {
      const { baseGeometry, textGeometry, iconGeometry } = generatePetTagMesh(DEFAULT_PET_TAG_OPTIONS);
      const blob = await exportPetTag3MF(
        baseGeometry,
        textGeometry,
        iconGeometry,
        DEFAULT_PET_TAG_OPTIONS
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
      expect(modelXml).toContain('object id="1" name="Base Plate"');
      expect(modelXml).toContain('object id="2" name="Text Lettering (LUNA)"');

      baseGeometry.dispose();
      textGeometry.dispose();
      iconGeometry.dispose();
    });

    it('should execute end-to-end processPetTag for 3MF export', async () => {
      const result = await processPetTag(DEFAULT_PET_TAG_OPTIONS, '3mf_multicolor');
      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('model/3mf');
      expect(result.fileName).toMatch(/\.3mf$/);
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.metrics.totalTriangles).toBeGreaterThan(0);
    });

    it('should execute end-to-end processPetTag for STL export', async () => {
      const result = await processPetTag(DEFAULT_PET_TAG_OPTIONS, 'stl_unified');
      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('model/stl');
      expect(result.fileName).toMatch(/\.stl$/);
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.metrics.totalTriangles).toBeGreaterThan(0);
    });
  });
});
