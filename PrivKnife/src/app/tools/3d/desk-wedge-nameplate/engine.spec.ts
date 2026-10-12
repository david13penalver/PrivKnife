import { describe, expect, it, vi } from 'vitest';
import {
  build3dTextGeometry,
  buildNameplateAssembly,
  buildWedgeBaseGeometry,
  generateDualColor3mf,
  generateNameplateZipBundle,
  generateStlFiles,
} from './engine';
import { DEFAULT_NAMEPLATE_CONFIG, SAMPLE_NAMEPLATE_PRESETS } from './test-fixtures';

describe('Parametric Desk Wedge & Nameplate Maker Engine', () => {
  it('constructs parametric wedge base geometry with specified dimensions', () => {
    const { wedgeGeom, faceMetrics } = buildWedgeBaseGeometry(DEFAULT_NAMEPLATE_CONFIG);

    expect(wedgeGeom.attributes['position']).toBeDefined();
    expect(wedgeGeom.attributes['position'].count).toBeGreaterThan(0);
    expect(wedgeGeom.boundingBox).toBeDefined();

    const box = wedgeGeom.boundingBox!;
    const width = box.max.x - box.min.x;
    const height = box.max.y - box.min.y;
    const depth = box.max.z - box.min.z;

    expect(width).toBeCloseTo(DEFAULT_NAMEPLATE_CONFIG.wedgeWidthMm, 0);
    expect(height).toBeCloseTo(DEFAULT_NAMEPLATE_CONFIG.wedgeHeightMm, 0);
    expect(depth).toBeCloseTo(DEFAULT_NAMEPLATE_CONFIG.baseDepthMm, 0);

    expect(faceMetrics.faceAngleRad).toBeGreaterThan(0);
    expect(faceMetrics.faceLengthMm).toBeGreaterThan(0);
  });

  it('builds extruded 3D text geometry with deterministic bitmap glyph fallback', () => {
    const textGeom = build3dTextGeometry(
      'DIRECTOR',
      DEFAULT_NAMEPLATE_CONFIG.primaryFontSizeMm,
      DEFAULT_NAMEPLATE_CONFIG.reliefDepthMm,
      DEFAULT_NAMEPLATE_CONFIG.wedgeWidthMm - 20,
      'center'
    );

    expect(textGeom).not.toBeNull();
    expect(textGeom!.attributes['position']).toBeDefined();
    expect(textGeom!.attributes['position'].count).toBeGreaterThan(0);
    expect(textGeom!.boundingBox).toBeDefined();

    const box = textGeom!.boundingBox!;
    expect(box.max.x).toBeGreaterThan(box.min.x);
    expect(box.max.y).toBeGreaterThan(box.min.y);
  });

  it('handles left, center, and right text alignment configurations', () => {
    const leftGeom = build3dTextGeometry(
      'LEFT TEXT',
      12,
      1.5,
      140,
      'left'
    );
    expect(leftGeom).not.toBeNull();
    expect(leftGeom!.attributes['position'].count).toBeGreaterThan(0);

    const rightGeom = build3dTextGeometry(
      'RIGHT TEXT',
      12,
      1.5,
      140,
      'right'
    );
    expect(rightGeom).not.toBeNull();
    expect(rightGeom!.attributes['position'].count).toBeGreaterThan(0);

    const emptyGeom = build3dTextGeometry('', 12, 1.5, 140, 'center');
    expect(emptyGeom).toBeNull();
  });

  it('constructs complete nameplate assembly for embossed lettering with accurate metrics', () => {
    const assembly = buildNameplateAssembly(DEFAULT_NAMEPLATE_CONFIG);

    expect(assembly.wedgeGeom).toBeDefined();
    expect(assembly.textGeom).toBeDefined();
    expect(assembly.combinedGroup).toBeDefined();

    // Check meshes inside group
    const baseMesh = assembly.combinedGroup.getObjectByName('wedge-base');
    const textMesh = assembly.combinedGroup.getObjectByName('wedge-text');
    expect(baseMesh).toBeDefined();
    expect(textMesh).toBeDefined();

    // Verify metrics
    expect(assembly.metrics.dimensionsMm.width).toBeCloseTo(DEFAULT_NAMEPLATE_CONFIG.wedgeWidthMm, 0);
    expect(assembly.metrics.dimensionsMm.height).toBeCloseTo(DEFAULT_NAMEPLATE_CONFIG.wedgeHeightMm, 0);
    expect(assembly.metrics.inclineAngleDeg).toBeGreaterThan(30);
    expect(assembly.metrics.inclineAngleDeg).toBeLessThan(80);
    expect(assembly.metrics.estimatedFilamentGrams).toBeGreaterThan(0);
    expect(assembly.metrics.filamentSwapLayer).toBeGreaterThan(100);
  });

  it('supports single line inscription when secondary text is disabled', () => {
    const config = {
      ...DEFAULT_NAMEPLATE_CONFIG,
      secondaryEnabled: false,
    };
    const assembly = buildNameplateAssembly(config);

    expect(assembly.wedgeGeom.attributes['position'].count).toBeGreaterThan(0);
    expect(assembly.textGeom.attributes['position'].count).toBeGreaterThan(0);
  });

  it('constructs debossed assembly with CSG subtraction or cavity carving', () => {
    const debossedPreset = SAMPLE_NAMEPLATE_PRESETS.find((p) => p.id === 'debossed-modern')!;
    const config = {
      ...DEFAULT_NAMEPLATE_CONFIG,
      ...debossedPreset.config,
    };

    const assembly = buildNameplateAssembly(config);
    expect(assembly.wedgeGeom.attributes['position'].count).toBeGreaterThan(0);
    expect(assembly.textGeom.attributes['position'].count).toBeGreaterThan(0);
  });

  it('generates a valid multi-material 3MF archive with base and text objects', async () => {
    const assembly = buildNameplateAssembly(DEFAULT_NAMEPLATE_CONFIG);
    const threeMfBlob = await generateDualColor3mf(
      assembly.wedgeGeom,
      assembly.textGeom,
      DEFAULT_NAMEPLATE_CONFIG
    );

    expect(threeMfBlob).toBeInstanceOf(Blob);
    expect(threeMfBlob.type).toBe('model/3mf');
    expect(threeMfBlob.size).toBeGreaterThan(500);

    const buf = await threeMfBlob.arrayBuffer();
    const text = new TextDecoder().decode(new Uint8Array(buf));
    expect(text).toContain('3D/3dmodel.model');
  });

  it('exports individual binary STLs for unified, base, and text models', () => {
    const assembly = buildNameplateAssembly(DEFAULT_NAMEPLATE_CONFIG);
    const { unifiedStl, baseStl, textStl } = generateStlFiles(
      assembly.wedgeGeom,
      assembly.textGeom
    );

    expect(unifiedStl).toBeInstanceOf(Blob);
    expect(unifiedStl.type).toBe('model/stl');
    expect(unifiedStl.size).toBeGreaterThan(84); // Minimum STL header size

    expect(baseStl).toBeInstanceOf(Blob);
    expect(baseStl.type).toBe('model/stl');
    expect(baseStl.size).toBeGreaterThan(84);

    expect(textStl).toBeInstanceOf(Blob);
    expect(textStl.type).toBe('model/stl');
    expect(textStl.size).toBeGreaterThan(84);
  });

  it('packages full zip bundle with dual-color 3MF, STLs, and printing guide', async () => {
    const assembly = buildNameplateAssembly(DEFAULT_NAMEPLATE_CONFIG);
    const mockPreview = new Blob(['preview-png'], { type: 'image/png' });

    const zipBlob = await generateNameplateZipBundle(
      assembly.wedgeGeom,
      assembly.textGeom,
      DEFAULT_NAMEPLATE_CONFIG,
      mockPreview
    );

    expect(zipBlob).toBeInstanceOf(Blob);
    expect(zipBlob.type).toBe('application/zip');
    expect(zipBlob.size).toBeGreaterThan(1000);
  });

  it('operates 100% client-side without any network calls', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch');
    const xhrSpy = vi.spyOn(window, 'XMLHttpRequest');

    const assembly = buildNameplateAssembly(DEFAULT_NAMEPLATE_CONFIG);
    const zipBlob = await generateNameplateZipBundle(
      assembly.wedgeGeom,
      assembly.textGeom,
      DEFAULT_NAMEPLATE_CONFIG
    );

    expect(zipBlob.size).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
    xhrSpy.mockRestore();
  });
});
