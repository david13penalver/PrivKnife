import * as THREE from 'three';
import JSZip from 'jszip';
import {
  LithophaneMakerOptions,
  LithophaneMakerResult,
  LithophaneMetrics,
} from './types';

/**
 * Validates lithophane generation configuration options.
 */
export function validateLithophaneOptions(options: LithophaneMakerOptions): {
  valid: boolean;
  error?: string;
} {
  if (!options) {
    return { valid: false, error: 'Options are required' };
  }

  if (typeof options.widthMm !== 'number' || options.widthMm <= 0 || options.widthMm > 500) {
    return { valid: false, error: 'Width must be between 1 and 500 mm' };
  }

  if (typeof options.heightMm !== 'number' || options.heightMm <= 0 || options.heightMm > 500) {
    return { valid: false, error: 'Height must be between 1 and 500 mm' };
  }

  if (
    typeof options.minThicknessMm !== 'number' ||
    options.minThicknessMm < 0.2 ||
    options.minThicknessMm > 5.0
  ) {
    return { valid: false, error: 'Min thickness must be between 0.2 and 5.0 mm' };
  }

  if (
    typeof options.maxThicknessMm !== 'number' ||
    options.maxThicknessMm <= options.minThicknessMm ||
    options.maxThicknessMm > 10.0
  ) {
    return { valid: false, error: 'Max thickness must be strictly greater than min thickness and <= 10.0 mm' };
  }

  if (options.geometryType === 'curve_arc') {
    if (typeof options.arcDegrees !== 'number' || options.arcDegrees < 10 || options.arcDegrees > 360) {
      return { valid: false, error: 'Arc degrees must be between 10 and 360' };
    }
  }

  return { valid: true };
}

/**
 * Computes ITU-R BT.601 normalized grayscale luminance from RGB [0-255].
 * Formula: (0.299*R + 0.587*G + 0.114*B) / 255.0
 */
export function computeLuminance(r: number, g: number, b: number): number {
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
  return Math.max(0, Math.min(1, lum));
}

/**
 * Samples luminance from raw image data at normalized coordinates (u, v) in [0, 1].
 */
export function sampleImageLuminance(
  imageData: { width: number; height: number; data: Uint8ClampedArray | Uint8Array } | null | undefined,
  u: number,
  v: number,
  contrastFactor = 1.0,
  invertLuminance = false
): number {
  let lum = 0.5;

  if (imageData && imageData.width > 0 && imageData.height > 0) {
    const clampedU = Math.max(0, Math.min(1, u));
    const clampedV = Math.max(0, Math.min(1, v));

    const px = Math.min(imageData.width - 1, Math.floor(clampedU * (imageData.width - 1)));
    const py = Math.min(imageData.height - 1, Math.floor(clampedV * (imageData.height - 1)));

    const idx = (py * imageData.width + px) * 4;
    const r = imageData.data[idx];
    const g = imageData.data[idx + 1];
    const b = imageData.data[idx + 2];

    lum = computeLuminance(r, g, b);
  } else {
    // Fallback procedural soft vignette gradient
    const dx = u - 0.5;
    const dy = v - 0.5;
    const dist = Math.sqrt(dx * dx + dy * dy);
    lum = Math.max(0.1, Math.min(0.9, 0.5 + (0.5 - dist) * 0.6));
  }

  // Apply contrast
  if (contrastFactor !== 1.0) {
    lum = (lum - 0.5) * contrastFactor + 0.5;
    lum = Math.max(0, Math.min(1, lum));
  }

  // If invertLuminance: high luminance becomes low
  if (invertLuminance) {
    lum = 1.0 - lum;
  }

  return lum;
}

/**
 * Calculates local wall thickness in mm at normalized (u, v) position.
 */
export function getLocalThickness(
  options: LithophaneMakerOptions,
  u: number,
  v: number
): number {
  const {
    widthMm,
    heightMm,
    minThicknessMm,
    maxThicknessMm,
    frameBorderWidthMm,
    frameBorderDepthMm,
    invertLuminance,
    contrastFactor,
    imageData,
  } = options;

  // Frame border check
  if (frameBorderWidthMm > 0) {
    const borderU = frameBorderWidthMm / widthMm;
    const borderV = frameBorderWidthMm / heightMm;

    if (u < borderU || u > 1 - borderU || v < borderV || v > 1 - borderV) {
      return frameBorderDepthMm;
    }
  }

  const lum = sampleImageLuminance(imageData, u, v, contrastFactor, invertLuminance);

  // In 3D lithophane printing:
  // Bright areas (high lum) = thinner plastic (lets light through).
  // Dark areas (low lum) = thicker plastic (blocks light).
  return maxThicknessMm - lum * (maxThicknessMm - minThicknessMm);
}

/**
 * Generates a watertight 3D mesh BufferGeometry with position, normal, and simulated backlight vertex colors.
 */
export function generateLithophaneGeometry(
  options: LithophaneMakerOptions
): THREE.BufferGeometry {
  const nx = Math.max(20, Math.min(240, options.resolution || 60));
  const ny = Math.max(
    16,
    Math.min(240, Math.round(nx * (options.heightMm / options.widthMm)))
  );

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const isCylinder = options.geometryType === 'cylinder';
  const isCurved = options.geometryType === 'curve_arc';
  const isNightlight = options.geometryType === 'nightlight_panel';

  const arcRad = isCylinder
    ? 2 * Math.PI
    : isCurved
      ? (options.arcDegrees * Math.PI) / 180
      : 0;

  const R = isCylinder
    ? options.widthMm / (2 * Math.PI)
    : isCurved
      ? options.widthMm / arcRad
      : 0;

  // Calculate 3D vertex coordinate helper
  function computeCoord(
    u: number,
    v: number,
    thickness: number,
    isFront: boolean
  ): [number, number, number] {
    const y = (v - 0.5) * options.heightMm;

    if (isCylinder) {
      const theta = u * 2 * Math.PI;
      const radius = isFront ? R + thickness : R;
      const x = radius * Math.sin(theta);
      const z = radius * Math.cos(theta);
      return [x, y, z];
    } else if (isCurved) {
      const theta = (u - 0.5) * arcRad;
      const radius = isFront ? R + thickness : R;
      const x = radius * Math.sin(theta);
      const z = radius * Math.cos(theta) - R;
      return [x, y, z];
    } else {
      // Flat or Nightlight panel
      const x = (u - 0.5) * options.widthMm;
      const z = isFront ? thickness : 0;
      return [x, y, z];
    }
  }

  // 1. FRONT SURFACE VERTICES
  const frontGrid: number[][] = [];
  for (let j = 0; j <= ny; j++) {
    const row: number[] = [];
    const v = j / ny;
    for (let i = 0; i <= nx; i++) {
      const u = i / nx;
      const thickness = getLocalThickness(options, u, v);
      const [x, y, z] = computeCoord(u, v, thickness, true);

      const vIdx = positions.length / 3;
      positions.push(x, y, z);
      normals.push(0, 0, 1); // placeholder, computed at end

      // Backlight color simulation:
      // Thinner areas = brighter warm white / amber.
      // Thicker areas = darker warm sepia / shadow.
      const tNorm =
        (thickness - options.minThicknessMm) /
        Math.max(0.1, options.maxThicknessMm - options.minThicknessMm);
      const brightness = Math.max(0.15, Math.min(1.0, 1.0 - tNorm * 0.75));
      colors.push(brightness, brightness * 0.94, brightness * 0.82);

      row.push(vIdx);
    }
    frontGrid.push(row);
  }

  // 2. BACK SURFACE VERTICES
  const backGrid: number[][] = [];
  for (let j = 0; j <= ny; j++) {
    const row: number[] = [];
    const v = j / ny;
    for (let i = 0; i <= nx; i++) {
      const u = i / nx;
      const [x, y, z] = computeCoord(u, v, 0, false);

      const vIdx = positions.length / 3;
      positions.push(x, y, z);
      normals.push(0, 0, -1);
      colors.push(0.9, 0.9, 0.9); // neutral plastic back
      row.push(vIdx);
    }
    backGrid.push(row);
  }

  // 3. FRONT FACES (CCW)
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = frontGrid[j][i];
      const b = frontGrid[j][i + 1];
      const c = frontGrid[j + 1][i + 1];
      const d = frontGrid[j + 1][i];
      indices.push(a, b, c);
      indices.push(a, c, d);
    }
  }

  // 4. BACK FACES (CW from front perspective to point outwards from solid)
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = backGrid[j][i];
      const b = backGrid[j][i + 1];
      const c = backGrid[j + 1][i + 1];
      const d = backGrid[j + 1][i];
      indices.push(a, c, b);
      indices.push(a, d, c);
    }
  }

  // 5. CONNECT PERIMETER SIDES (Watertight manifold enclosure)
  // Bottom Edge (j = 0)
  for (let i = 0; i < nx; i++) {
    const fA = frontGrid[0][i];
    const fB = frontGrid[0][i + 1];
    const bA = backGrid[0][i];
    const bB = backGrid[0][i + 1];
    indices.push(fA, bA, bB);
    indices.push(fA, bB, fB);
  }

  // Top Edge (j = ny)
  for (let i = 0; i < nx; i++) {
    const fA = frontGrid[ny][i];
    const fB = frontGrid[ny][i + 1];
    const bA = backGrid[ny][i];
    const bB = backGrid[ny][i + 1];
    indices.push(fA, bB, bA);
    indices.push(fA, fB, bB);
  }

  // If not a seamless cylinder, connect Left (i = 0) and Right (i = nx) edges
  if (!isCylinder) {
    // Left Edge (i = 0)
    for (let j = 0; j < ny; j++) {
      const fA = frontGrid[j][0];
      const fB = frontGrid[j + 1][0];
      const bA = backGrid[j][0];
      const bB = backGrid[j + 1][0];
      indices.push(fA, bB, bA);
      indices.push(fA, fB, bB);
    }

    // Right Edge (i = nx)
    for (let j = 0; j < ny; j++) {
      const fA = frontGrid[j][nx];
      const fB = frontGrid[j + 1][nx];
      const bA = backGrid[j][nx];
      const bB = backGrid[j + 1][nx];
      indices.push(fA, bA, bB);
      indices.push(fA, bB, fB);
    }
  }

  // 6. OPTIONAL BASE STAND / STABILIZING FOOT
  // If baseStandSlot is enabled, add a sturdy bottom foot plate so the lithophane stands firmly upright
  if (options.baseStandSlot) {
    const footDepth = options.baseStandWidthMm || 14;
    const footHeight = isNightlight ? 15 : 4;
    const halfWidth = options.widthMm / 2;

    const baseStartVIdx = positions.length / 3;

    // 8 vertices of a rectangular foot block at the bottom
    const baseYMin = -options.heightMm / 2 - (isNightlight ? footHeight : 0);
    const baseYMax = -options.heightMm / 2 + (isNightlight ? 0 : footHeight);
    const baseZMin = -footDepth / 2;
    const baseZMax = footDepth / 2;
    const baseXMin = -halfWidth * (isNightlight ? 0.4 : 0.9);
    const baseXMax = halfWidth * (isNightlight ? 0.4 : 0.9);

    const corners = [
      [baseXMin, baseYMin, baseZMin], // 0: LBB
      [baseXMax, baseYMin, baseZMin], // 1: RBB
      [baseXMax, baseYMin, baseZMax], // 2: RFB
      [baseXMin, baseYMin, baseZMax], // 3: LFB
      [baseXMin, baseYMax, baseZMin], // 4: LBT
      [baseXMax, baseYMax, baseZMin], // 5: RBT
      [baseXMax, baseYMax, baseZMax], // 6: RFT
      [baseXMin, baseYMax, baseZMax], // 7: LFT
    ];

    for (const [x, y, z] of corners) {
      positions.push(x, y, z);
      normals.push(0, -1, 0);
      colors.push(0.85, 0.85, 0.85);
    }

    // Cube indices for base foot
    const cubeFaces = [
      [0, 2, 1], [0, 3, 2], // Bottom
      [4, 5, 6], [4, 6, 7], // Top
      [0, 1, 5], [0, 5, 4], // Back
      [3, 7, 6], [3, 6, 2], // Front
      [0, 4, 7], [0, 7, 3], // Left
      [1, 2, 6], [1, 6, 5], // Right
    ];

    for (const [a, b, c] of cubeFaces) {
      indices.push(baseStartVIdx + a, baseStartVIdx + b, baseStartVIdx + c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Calculates print telemetry metrics and slicer recommendations.
 */
export function calculateLithophaneMetrics(
  geometry: THREE.BufferGeometry,
  options: LithophaneMakerOptions
): LithophaneMetrics {
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;
  const widthMm = Math.max(1, bbox.max.x - bbox.min.x);
  const heightMm = Math.max(1, bbox.max.y - bbox.min.y);
  const depthMm = Math.max(1, bbox.max.z - bbox.min.z);

  const triangleCount = geometry.getIndex() ? geometry.getIndex()!.count / 3 : 0;
  const vertexCount = geometry.getAttribute('position')
    ? geometry.getAttribute('position').count
    : 0;

  // Approximate solid volume in cm³ (average thickness * width * height)
  const avgThickness = (options.minThicknessMm + options.maxThicknessMm) / 2;
  const volumeMm3 = options.widthMm * options.heightMm * avgThickness;
  const estimatedVolumeCm3 = Math.max(1.0, volumeMm3 / 1000.0);

  // PLA density ~ 1.24 g/cm3
  const estimatedGrams = Math.round(estimatedVolumeCm3 * 1.24 * 10) / 10;

  // Print speed estimation assuming 0.12mm layer height and 45mm/s speed
  const layerHeight = 0.12;
  const totalLayers = Math.round(heightMm / layerHeight);
  const estimatedPrintTimeHours = Math.round((totalLayers * 0.05 + estimatedGrams * 0.1) * 10) / 10;

  const slicerTips: string[] = [
    'Orientation: Print standing vertically (on edge) along the Y-axis for maximum photorealistic resolution.',
    'Infill: Use 100% infill (rectilinear). Any hollow or low-density pattern will create grid artifacts when backlit.',
    'Layer Height: Set to 0.12mm (fine) or 0.16mm for crisp optical depth and smooth gradient transitions.',
    'Filament: Pure White or Warm White PLA yields the highest optical contrast and luminosity.',
    'Brim / Adhesion: Use a 5mm outer brim to prevent tall lithophanes from wobbling or detaching during rapid printing.',
  ];

  return {
    triangleCount,
    vertexCount,
    widthMm: Math.round(widthMm * 10) / 10,
    heightMm: Math.round(heightMm * 10) / 10,
    depthMm: Math.round(depthMm * 10) / 10,
    minThicknessMm: options.minThicknessMm,
    maxThicknessMm: options.maxThicknessMm,
    estimatedPrintTimeHours,
    estimatedGrams,
    slicerTips,
  };
}

/**
 * Encodes BufferGeometry into binary STL ArrayBuffer.
 */
export function exportLithophaneSTL(geometry: THREE.BufferGeometry): ArrayBuffer {
  const index = geometry.getIndex();
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');

  const triangleCount = index ? index.count / 3 : position.count / 3;
  const bufferSize = 84 + triangleCount * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const dataView = new DataView(buffer);

  // 80-byte header
  const headerStr = 'PrivKnife 3D Lithophane Maker - Client-Side STL Export';
  for (let i = 0; i < 80; i++) {
    dataView.setUint8(i, i < headerStr.length ? headerStr.charCodeAt(i) : 0);
  }

  // 4-byte unsigned int triangle count
  dataView.setUint32(80, triangleCount, true);

  let offset = 84;
  for (let i = 0; i < triangleCount; i++) {
    const idx0 = index ? index.getX(i * 3) : i * 3;
    const idx1 = index ? index.getX(i * 3 + 1) : i * 3 + 1;
    const idx2 = index ? index.getX(i * 3 + 2) : i * 3 + 2;

    const nX = normal ? normal.getX(idx0) : 0;
    const nY = normal ? normal.getY(idx0) : 0;
    const nZ = normal ? normal.getZ(idx0) : 0;

    // Normal vector
    dataView.setFloat32(offset, nX, true);
    dataView.setFloat32(offset + 4, nY, true);
    dataView.setFloat32(offset + 8, nZ, true);

    // Vertex 1
    dataView.setFloat32(offset + 12, position.getX(idx0), true);
    dataView.setFloat32(offset + 16, position.getY(idx0), true);
    dataView.setFloat32(offset + 20, position.getZ(idx0), true);

    // Vertex 2
    dataView.setFloat32(offset + 24, position.getX(idx1), true);
    dataView.setFloat32(offset + 28, position.getY(idx1), true);
    dataView.setFloat32(offset + 32, position.getZ(idx1), true);

    // Vertex 3
    dataView.setFloat32(offset + 36, position.getX(idx2), true);
    dataView.setFloat32(offset + 40, position.getY(idx2), true);
    dataView.setFloat32(offset + 44, position.getZ(idx2), true);

    // 2-byte attribute byte count
    dataView.setUint16(offset + 48, 0, true);

    offset += 50;
  }

  return buffer;
}

/**
 * Exports BufferGeometry into a Microsoft 3MF specification zip container.
 */
export async function exportLithophane3MF(
  geometry: THREE.BufferGeometry,
  options: LithophaneMakerOptions
): Promise<Blob> {
  const index = geometry.getIndex();
  const position = geometry.getAttribute('position');

  const vertexCount = position.count;
  const triangleCount = index ? index.count / 3 : vertexCount / 3;

  let verticesXml = '';
  for (let i = 0; i < vertexCount; i++) {
    const x = position.getX(i).toFixed(3);
    const y = position.getY(i).toFixed(3);
    const z = position.getZ(i).toFixed(3);
    verticesXml += `      <vertex x="${x}" y="${y}" z="${z}" />\n`;
  }

  let trianglesXml = '';
  for (let i = 0; i < triangleCount; i++) {
    const v1 = index ? index.getX(i * 3) : i * 3;
    const v2 = index ? index.getX(i * 3 + 1) : i * 3 + 1;
    const v3 = index ? index.getX(i * 3 + 2) : i * 3 + 2;
    trianglesXml += `      <triangle v1="${v1}" v2="${v2}" v3="${v3}" />\n`;
  }

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">PrivKnife Lithophane (${options.geometryType})</metadata>
  <metadata name="Application">PrivKnife Client-Side 3D Studio</metadata>
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
${verticesXml}        </vertices>
        <triangles>
${trianglesXml}        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1" />
  </build>
</model>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypesXml);
  zip.file('_rels/.rels', relsXml);
  zip.file('3D/3dmodel.model', modelXml);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'model/3mf',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

/**
 * End-to-end processing pipeline: executes validation, 3D mesh generation, metrics calculation,
 * and binary export serialization with zero server interaction.
 */
export async function processLithophane(
  options: LithophaneMakerOptions,
  format: 'stl' | '3mf' = 'stl'
): Promise<LithophaneMakerResult> {
  const validation = validateLithophaneOptions(options);
  if (!validation.valid) {
    return {
      success: false,
      blob: new Blob([], { type: 'application/octet-stream' }),
      fileName: '',
      fileSize: 0,
      mimeType: 'application/octet-stream',
      metrics: {
        triangleCount: 0,
        vertexCount: 0,
        widthMm: 0,
        heightMm: 0,
        depthMm: 0,
        minThicknessMm: 0,
        maxThicknessMm: 0,
        estimatedPrintTimeHours: 0,
        estimatedGrams: 0,
        slicerTips: [],
      },
      error: validation.error,
    };
  }

  const geometry = generateLithophaneGeometry(options);
  const metrics = calculateLithophaneMetrics(geometry, options);

  const baseFileName = `privknife-lithophane-${options.geometryType}-${Math.round(options.widthMm)}x${Math.round(options.heightMm)}mm`;

  let blob: Blob;
  let fileName: string;
  let mimeType: string;

  if (format === '3mf') {
    blob = await exportLithophane3MF(geometry, options);
    fileName = `${baseFileName}.3mf`;
    mimeType = 'model/3mf';
  } else {
    const stlBuffer = exportLithophaneSTL(geometry);
    blob = new Blob([stlBuffer], { type: 'model/stl' });
    fileName = `${baseFileName}.stl`;
    mimeType = 'model/stl';
  }

  geometry.dispose();

  return {
    success: true,
    blob,
    fileName,
    fileSize: blob.size,
    mimeType,
    metrics,
  };
}
