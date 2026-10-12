import { describe, expect, it } from 'vitest';
import {
  buildCookieCutterAssembly,
  buildCutterGeometry,
  buildStampGeometry,
  ensureCCW,
  generateCutterZipBundle,
  generateDualPart3mf,
  generateStlFiles,
  getSignedArea,
  offsetPolygon,
  scalePolygon,
  traceImageContours,
} from './engine';
import { DEFAULT_COOKIE_CUTTER_CONFIG, SAMPLE_COOKIE_PRESETS } from './test-fixtures';

describe('Custom Cookie Cutter & Stamp 3D Maker Engine', () => {
  const squarePoly = [
    { x: -20, y: -20 },
    { x: 20, y: -20 },
    { x: 20, y: 20 },
    { x: -20, y: 20 },
  ];

  it('calculates polygon area and ensures counter-clockwise orientation', () => {
    const area = getSignedArea(squarePoly);
    expect(area).toBe(1600); // 40 x 40

    const cwSquare = [...squarePoly].reverse();
    expect(getSignedArea(cwSquare)).toBe(-1600);

    const ccwResult = ensureCCW(cwSquare);
    expect(getSignedArea(ccwResult)).toBe(1600);
  });

  it('accurately offsets polygons outwards and inwards', () => {
    const outward = offsetPolygon(squarePoly, 2.0);
    expect(outward.length).toBe(4);
    expect(outward[0].x).toBeCloseTo(-22, 0);
    expect(outward[0].y).toBeCloseTo(-22, 0);
    expect(outward[1].x).toBeCloseTo(22, 0);

    const inward = offsetPolygon(squarePoly, -1.0);
    expect(inward[0].x).toBeCloseTo(-19, 0);
    expect(inward[0].y).toBeCloseTo(-19, 0);
  });

  it('scales polygon to match target size in millimeters centered at origin', () => {
    const { scaled, width, height, scaleFactor } = scalePolygon(squarePoly, 80);
    expect(width).toBe(80);
    expect(height).toBe(80);
    expect(scaleFactor).toBe(2);
    expect(scaled[0].x).toBe(-40);
    expect(scaled[0].y).toBe(-40);
  });

  it('constructs watertight 3D cutter blade geometry with top press flange', () => {
    const cutterGeom = buildCutterGeometry(squarePoly, DEFAULT_COOKIE_CUTTER_CONFIG);
    expect(cutterGeom.attributes['position']).toBeDefined();
    expect(cutterGeom.attributes['position'].count).toBeGreaterThan(0);
    expect(cutterGeom.boundingBox).toBeDefined();

    const zMin = cutterGeom.boundingBox!.min.z;
    const zMax = cutterGeom.boundingBox!.max.z;
    expect(zMin).toBeCloseTo(0, 1);
    expect(zMax).toBeCloseTo(DEFAULT_COOKIE_CUTTER_CONFIG.bladeHeightMm, 1);
  });

  it('constructs 3D impression stamp geometry with clearance and rear handle', () => {
    const innerDetails = [
      [
        { x: -5, y: -5 },
        { x: 5, y: -5 },
        { x: 5, y: 5 },
        { x: -5, y: 5 },
      ],
    ];

    const stampGeom = buildStampGeometry(
      squarePoly,
      innerDetails,
      DEFAULT_COOKIE_CUTTER_CONFIG
    );

    expect(stampGeom.attributes['position']).toBeDefined();
    expect(stampGeom.attributes['position'].count).toBeGreaterThan(0);
    expect(stampGeom.boundingBox).toBeDefined();

    // Check handle extends below Z=0
    expect(stampGeom.boundingBox!.min.z).toBeLessThan(0);
  });

  it('builds complete assembly and calculates model dimensions and filament metrics', () => {
    const preset = SAMPLE_COOKIE_PRESETS[0]; // Gingerbread Man
    const { cutterGeom, stampGeom, metrics, combinedGroup } = buildCookieCutterAssembly(
      preset,
      DEFAULT_COOKIE_CUTTER_CONFIG
    );

    expect(cutterGeom).toBeDefined();
    expect(stampGeom).toBeDefined();
    expect(combinedGroup.children.length).toBe(2);
    expect(metrics.cutterDimensionsMm.width).toBeGreaterThan(30);
    expect(metrics.estimatedFilamentGrams).toBeGreaterThan(5);
    expect(metrics.outerVertexCount).toBe(preset.outerContour.length);
  });

  it('generates multi-part .3mf archive with discrete cutter and stamp objects', async () => {
    const preset = SAMPLE_COOKIE_PRESETS[1]; // Five Star
    const { cutterGeom, stampGeom } = buildCookieCutterAssembly(
      preset,
      DEFAULT_COOKIE_CUTTER_CONFIG
    );

    const blob = await generateDualPart3mf(
      cutterGeom,
      stampGeom,
      DEFAULT_COOKIE_CUTTER_CONFIG
    );

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('model/3mf');
    expect(blob.size).toBeGreaterThan(1000);
  });

  it('generates STL files for cutter, stamp, and combined assembly', () => {
    const preset = SAMPLE_COOKIE_PRESETS[2]; // Sweet Heart
    const { cutterGeom, stampGeom } = buildCookieCutterAssembly(
      preset,
      DEFAULT_COOKIE_CUTTER_CONFIG
    );

    const { unifiedStl, cutterStl, stampStl } = generateStlFiles(cutterGeom, stampGeom);

    expect(unifiedStl).toBeInstanceOf(Blob);
    expect(cutterStl).toBeInstanceOf(Blob);
    expect(stampStl).toBeInstanceOf(Blob);
    expect(unifiedStl.size).toBeGreaterThan(1000);
    expect(cutterStl.size).toBeGreaterThan(500);
    expect(stampStl.size).toBeGreaterThan(500);
  });

  it('packages complete cookie cutter bundle into a .zip archive', async () => {
    const preset = SAMPLE_COOKIE_PRESETS[3]; // Cat
    const { cutterGeom, stampGeom } = buildCookieCutterAssembly(
      preset,
      DEFAULT_COOKIE_CUTTER_CONFIG
    );

    const zipBlob = await generateCutterZipBundle(
      cutterGeom,
      stampGeom,
      DEFAULT_COOKIE_CUTTER_CONFIG
    );

    expect(zipBlob).toBeInstanceOf(Blob);
    expect(zipBlob.type).toBe('application/zip');
    expect(zipBlob.size).toBeGreaterThan(3000);
  });

  it('handles fallback image contour extraction when no image is loaded', () => {
    const contourData = traceImageContours(null, 128, false);
    expect(contourData.outerContour.length).toBeGreaterThanOrEqual(16);
    expect(contourData.bounds.width).toBeGreaterThan(0);
  });

  it('verifies all sample presets build valid cutter and stamp meshes', () => {
    for (const preset of SAMPLE_COOKIE_PRESETS) {
      const { cutterGeom, stampGeom, metrics } = buildCookieCutterAssembly(
        preset,
        DEFAULT_COOKIE_CUTTER_CONFIG
      );
      expect(cutterGeom.attributes['position'].count).toBeGreaterThan(0);
      expect(stampGeom.attributes['position'].count).toBeGreaterThan(0);
      expect(metrics.cutterDimensionsMm.width).toBeGreaterThan(20);
    }
  });
});
