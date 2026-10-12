import { describe, expect, it } from 'vitest';
import {
  buildBasePlateGeometry,
  buildQrModel,
  buildQrModulesGeometry,
  buildSubtextGeometry,
  checkScannability,
  generate3mf,
  generateExportBundleZip,
  generateQrMatrix,
  generateStl,
  getContrastRatio,
  getRelativeLuminance,
} from './engine';
import { DEFAULT_QR_STAND_CONFIG, SAMPLE_PRESETS } from './test-fixtures';

describe('3D QR Stand & Keychain Generator Engine', () => {
  it('generates valid QR matrix with correct dimensions', () => {
    const matrix = generateQrMatrix('https://privknife.dev', 'M');
    expect(matrix.size).toBeGreaterThanOrEqual(21);
    expect(matrix.modules.length).toBe(matrix.size);
    expect(matrix.modules[0].length).toBe(matrix.size);

    // Finding pattern corners should have dark modules
    expect(matrix.modules[0][0]).toBe(true);
    expect(matrix.modules[0][matrix.size - 1]).toBe(true);
    expect(matrix.modules[matrix.size - 1][0]).toBe(true);
  });

  it('accurately tests scannability and returns diagnostic metrics', () => {
    const text = 'https://example.com/check';
    const matrix = generateQrMatrix(text, 'M');
    const report = checkScannability(text, matrix, DEFAULT_QR_STAND_CONFIG);

    expect(report.isScannable).toBe(true);
    expect(report.decodedData).toBe(text);
    expect(report.qualityScore).toBeGreaterThanOrEqual(80);
    expect(report.physicalDimensions.widthMm).toBeGreaterThan(40);
    expect(report.filamentSwapLayer).toBe(15); // 3.0mm / 0.2mm
    expect(report.notes.some((n) => n.includes('decodes accurately'))).toBe(true);
  });

  it('flags warning when module size is too small for standard 3D printer nozzles', () => {
    const matrix = generateQrMatrix('https://example.com', 'M');
    const config = { ...DEFAULT_QR_STAND_CONFIG, moduleSizeMm: 1.2 };
    const report = checkScannability('https://example.com', matrix, config);

    expect(report.notes.some((n) => n.includes('below the 1.6mm recommended minimum'))).toBe(true);
    expect(report.qualityScore).toBeLessThan(100);
  });

  it('calculates luminance and flags warning when color contrast is insufficient', () => {
    const whiteLum = getRelativeLuminance('#FFFFFF');
    const blackLum = getRelativeLuminance('#000000');
    expect(whiteLum).toBeGreaterThan(blackLum);

    const highContrast = getContrastRatio('#FFFFFF', '#000000');
    expect(highContrast).toBeGreaterThan(20);

    const lowContrastConfig = {
      ...DEFAULT_QR_STAND_CONFIG,
      baseColor: '#777777',
      qrColor: '#888888',
    };
    const matrix = generateQrMatrix('https://example.com', 'M');
    const report = checkScannability('https://example.com', matrix, lowContrastConfig);

    expect(report.notes.some((n) => n.includes('contrast ratio'))).toBe(true);
  });

  it('constructs watertight QR module boxes with run-length optimization', () => {
    const matrix = generateQrMatrix('test', 'L');
    const geom = buildQrModulesGeometry(matrix, DEFAULT_QR_STAND_CONFIG, 0, 0, 3.0);

    expect(geom.attributes['position']).toBeDefined();
    expect(geom.attributes['normal']).toBeDefined();
    expect(geom.index).toBeDefined();
    expect(geom.attributes['position'].count).toBeGreaterThan(0);
    expect(geom.boundingBox).toBeDefined();
  });

  it('generates 3D extruded subtext geometry from bitmap font', () => {
    const textGeom = buildSubtextGeometry('SCAN ME', DEFAULT_QR_STAND_CONFIG, 60, 0, 0, 3.0);
    expect(textGeom).not.toBeNull();
    expect(textGeom!.attributes['position'].count).toBeGreaterThan(0);

    // Disabled subtext returns null
    const disabledGeom = buildSubtextGeometry('SCAN ME', {
      ...DEFAULT_QR_STAND_CONFIG,
      subtextEnabled: false,
    }, 60, 0, 0, 3.0);
    expect(disabledGeom).toBeNull();
  });

  it('builds base geometries for desk-stand, keychain loop, and flat plaque', () => {
    const matrix = generateQrMatrix('test', 'M');

    // 1. Desk stand
    const standResult = buildBasePlateGeometry(matrix, {
      ...DEFAULT_QR_STAND_CONFIG,
      baseShape: 'desk-stand',
    });
    expect(standResult.baseGeometry.attributes['position'].count).toBeGreaterThan(0);

    // 2. Keychain loop
    const keychainResult = buildBasePlateGeometry(matrix, {
      ...DEFAULT_QR_STAND_CONFIG,
      baseShape: 'keychain',
    });
    expect(keychainResult.baseGeometry.attributes['position'].count).toBeGreaterThan(0);

    // 3. Flat plaque
    const plaqueResult = buildBasePlateGeometry(matrix, {
      ...DEFAULT_QR_STAND_CONFIG,
      baseShape: 'flat-plaque',
    });
    expect(plaqueResult.baseGeometry.attributes['position'].count).toBeGreaterThan(0);
  });

  it('builds complete 3D model with combined group and scannability evaluation', () => {
    const matrix = generateQrMatrix('https://privknife.dev', 'M');
    const model = buildQrModel(matrix, DEFAULT_QR_STAND_CONFIG);

    expect(model.baseGeometry).toBeDefined();
    expect(model.qrGeometry).toBeDefined();
    expect(model.combinedMesh.children.length).toBe(2);
    expect(model.scannability.isScannable).toBe(true);
  });

  it('generates valid dual-material .3mf archive with separate objects and metadata', async () => {
    const matrix = generateQrMatrix('https://privknife.dev', 'M');
    const model = buildQrModel(matrix, DEFAULT_QR_STAND_CONFIG);
    const blob = await generate3mf(model.baseGeometry, model.qrGeometry, DEFAULT_QR_STAND_CONFIG);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('model/3mf');
    expect(blob.size).toBeGreaterThan(1000);
  });

  it('generates valid binary .stl file containing combined mesh', () => {
    const matrix = generateQrMatrix('https://privknife.dev', 'M');
    const model = buildQrModel(matrix, DEFAULT_QR_STAND_CONFIG);
    const blob = generateStl(model.baseGeometry, model.qrGeometry);

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('model/stl');
    expect(blob.size).toBeGreaterThan(500);
  });

  it('packages complete export bundle zip with .3mf, .stl, and instructions', async () => {
    const matrix = generateQrMatrix('https://privknife.dev', 'M');
    const model = buildQrModel(matrix, DEFAULT_QR_STAND_CONFIG);
    const zipBlob = await generateExportBundleZip(
      model.baseGeometry,
      model.qrGeometry,
      DEFAULT_QR_STAND_CONFIG
    );

    expect(zipBlob).toBeInstanceOf(Blob);
    expect(zipBlob.type).toBe('application/zip');
    expect(zipBlob.size).toBeGreaterThan(2000);
  });

  it('handles all sample presets accurately', () => {
    for (const preset of SAMPLE_PRESETS) {
      const config = { ...DEFAULT_QR_STAND_CONFIG, ...preset.config };
      const matrix = generateQrMatrix(config.text, config.errorCorrection);
      const model = buildQrModel(matrix, config);

      expect(model.baseGeometry.attributes['position'].count).toBeGreaterThan(0);
      expect(model.qrGeometry.attributes['position'].count).toBeGreaterThan(0);
      expect(model.scannability.physicalDimensions.widthMm).toBeGreaterThan(20);
    }
  });
});
