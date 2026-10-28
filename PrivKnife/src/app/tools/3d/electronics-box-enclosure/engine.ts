import * as THREE from 'three';
import JSZip from 'jszip';
import {
  ElectronicsBoxEnclosureOptions,
  ElectronicsBoxEnclosureResult,
  ElectronicsBoxMetrics,
} from './types';

/**
 * Validates enclosure configuration parameters.
 */
export function validateEnclosureOptions(options: ElectronicsBoxEnclosureOptions): {
  valid: boolean;
  error?: string;
} {
  if (!options) {
    return { valid: false, error: 'Options are required' };
  }

  if (typeof options.innerLengthMm !== 'number' || options.innerLengthMm < 15 || options.innerLengthMm > 500) {
    return { valid: false, error: 'Inner length must be between 15 and 500 mm' };
  }

  if (typeof options.innerWidthMm !== 'number' || options.innerWidthMm < 10 || options.innerWidthMm > 500) {
    return { valid: false, error: 'Inner width must be between 10 and 500 mm' };
  }

  if (typeof options.innerHeightMm !== 'number' || options.innerHeightMm < 8 || options.innerHeightMm > 300) {
    return { valid: false, error: 'Inner height must be between 8 and 300 mm' };
  }

  if (typeof options.wallThicknessMm !== 'number' || options.wallThicknessMm < 1.0 || options.wallThicknessMm > 8.0) {
    return { valid: false, error: 'Wall thickness must be between 1.0 and 8.0 mm' };
  }

  if (
    typeof options.standoffHeightMm === 'number' &&
    (options.standoffHeightMm < 1.0 || options.standoffHeightMm > options.innerHeightMm)
  ) {
    return { valid: false, error: 'Standoff height must be between 1.0mm and inner height' };
  }

  return { valid: true };
}

/**
 * Generates separate and combined 3D BufferGeometries for the base and lid.
 */
export function generateEnclosureGeometries(
  options: ElectronicsBoxEnclosureOptions,
  exploded = false
): {
  baseGeometry: THREE.BufferGeometry;
  lidGeometry: THREE.BufferGeometry;
  combinedGeometry: THREE.BufferGeometry;
} {
  const {
    innerLengthMm,
    innerWidthMm,
    innerHeightMm,
    wallThicknessMm,
    cornerRadiusMm = 0,
    closureType,
    pcbPreset,
    standoffHeightMm = 5.0,
    cableSlot,
    cableSlotDiameterMm = 8.0,
    ventilationGrille,
  } = options;

  const wallT = Math.max(1.0, wallThicknessMm);
  const outerL = innerLengthMm + 2 * wallT;
  const outerW = innerWidthMm + 2 * wallT;
  const baseH = innerHeightMm + wallT;
  const lidH = wallT;

  const halfL = outerL / 2;
  const halfW = outerW / 2;
  const halfInnerL = innerLengthMm / 2;
  const halfInnerW = innerWidthMm / 2;

  // Helper to append a box into position and index arrays
  function pushBox(
    positions: number[],
    normals: number[],
    indices: number[],
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    minZ: number,
    maxZ: number
  ): void {
    function addQuad(
      v0: [number, number, number],
      v1: [number, number, number],
      v2: [number, number, number],
      v3: [number, number, number]
    ): void {
      const startIdx = positions.length / 3;
      positions.push(...v0, ...v1, ...v2, ...v3);
      normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);
      indices.push(startIdx, startIdx + 1, startIdx + 2);
      indices.push(startIdx, startIdx + 2, startIdx + 3);
    }

    // Bottom
    addQuad([minX, minY, minZ], [maxX, minY, minZ], [maxX, maxY, minZ], [minX, maxY, minZ]);
    // Top
    addQuad([minX, maxY, maxZ], [maxX, maxY, maxZ], [maxX, minY, maxZ], [minX, minY, maxZ]);
    // Front (-Y)
    addQuad([minX, minY, minZ], [minX, minY, maxZ], [maxX, minY, maxZ], [maxX, minY, minZ]);
    // Back (+Y)
    addQuad([maxX, maxY, minZ], [maxX, maxY, maxZ], [minX, maxY, maxZ], [minX, maxY, minZ]);
    // Left (-X)
    addQuad([minX, maxY, minZ], [minX, maxY, maxZ], [minX, minY, maxZ], [minX, minY, minZ]);
    // Right (+X)
    addQuad([maxX, minY, minZ], [maxX, minY, maxZ], [maxX, maxY, maxZ], [maxX, maxY, minZ]);
  }

  // --- 1. BASE TUB GEOMETRY ---
  const basePos: number[] = [];
  const baseNorm: number[] = [];
  const baseIdx: number[] = [];

  // Bottom plate
  pushBox(basePos, baseNorm, baseIdx, -halfL, halfL, -halfW, halfW, 0, wallT);

  // Outer walls (Left & Right)
  pushBox(basePos, baseNorm, baseIdx, -halfL, -halfInnerL, -halfW, halfW, wallT, baseH);
  pushBox(basePos, baseNorm, baseIdx, halfInnerL, halfL, -halfW, halfW, wallT, baseH);

  // Front & Back walls (with optional cable slot on front wall)
  if (cableSlot) {
    const slotW = Math.min(innerLengthMm * 0.4, Math.max(4, cableSlotDiameterMm));
    const slotH = Math.min(innerHeightMm * 0.7, slotW);

    // Front left segment
    pushBox(basePos, baseNorm, baseIdx, -halfInnerL, -slotW / 2, -halfW, -halfInnerW, wallT, baseH);
    // Front right segment
    pushBox(basePos, baseNorm, baseIdx, slotW / 2, halfInnerL, -halfW, -halfInnerW, wallT, baseH);
    // Front upper arch above slot
    pushBox(basePos, baseNorm, baseIdx, -slotW / 2, slotW / 2, -halfW, -halfInnerW, wallT + slotH, baseH);
  } else {
    pushBox(basePos, baseNorm, baseIdx, -halfInnerL, halfInnerL, -halfW, -halfInnerW, wallT, baseH);
  }

  // Back wall
  pushBox(basePos, baseNorm, baseIdx, -halfInnerL, halfInnerL, halfInnerW, halfW, wallT, baseH);

  // Standoff pillars
  const soH = Math.min(innerHeightMm - 2, Math.max(2, standoffHeightMm));
  const soSize = 6.0;

  let standoffPositions: [number, number][] = [];
  if (pcbPreset === 'arduino_uno') {
    // Standard Arduino Uno hole offsets
    standoffPositions = [
      [-26, -20],
      [24, -22],
      [-24, 18],
      [24, 18],
    ];
  } else if (pcbPreset === 'esp32_dev') {
    standoffPositions = [
      [-22, -11],
      [22, -11],
      [-22, 11],
      [22, 11],
    ];
  } else if (pcbPreset === 'rpi_pico') {
    standoffPositions = [
      [-23.5, -5.7],
      [23.5, -5.7],
      [-23.5, 5.7],
      [23.5, 5.7],
    ];
  } else {
    // Generic 4 corner posts
    const offsetX = halfInnerL - 7;
    const offsetY = halfInnerW - 7;
    standoffPositions = [
      [-offsetX, -offsetY],
      [offsetX, -offsetY],
      [-offsetX, offsetY],
      [offsetX, offsetY],
    ];
  }

  for (const [sx, sy] of standoffPositions) {
    if (Math.abs(sx) < halfInnerL - 2 && Math.abs(sy) < halfInnerW - 2) {
      pushBox(
        basePos,
        baseNorm,
        baseIdx,
        sx - soSize / 2,
        sx + soSize / 2,
        sy - soSize / 2,
        sy + soSize / 2,
        wallT,
        wallT + soH
      );
    }
  }

  // Corner screw bosses if M3 screws selected
  if (closureType === 'm3_screws') {
    const bossSize = 8.0;
    const corners: [number, number][] = [
      [-halfInnerL, -halfInnerW],
      [halfInnerL - bossSize, -halfInnerW],
      [-halfInnerL, halfInnerW - bossSize],
      [halfInnerL - bossSize, halfInnerW - bossSize],
    ];
    for (const [bx, by] of corners) {
      pushBox(basePos, baseNorm, baseIdx, bx, bx + bossSize, by, by + bossSize, wallT, baseH);
    }
  }

  // Corner radius / bevel reinforcements on base
  const cr = Math.min(6, Math.min(halfInnerL, halfInnerW), Math.max(0, cornerRadiusMm || 0));
  if (cr > 0) {
    pushBox(basePos, baseNorm, baseIdx, -halfL, -halfL + cr, -halfW, -halfW + cr, 0, baseH);
    pushBox(basePos, baseNorm, baseIdx, halfL - cr, halfL, -halfW, -halfW + cr, 0, baseH);
    pushBox(basePos, baseNorm, baseIdx, halfL - cr, halfL, halfW - cr, halfW, 0, baseH);
    pushBox(basePos, baseNorm, baseIdx, -halfL, -halfL + cr, halfW - cr, halfW, 0, baseH);
  }

  const baseGeometry = new THREE.BufferGeometry();
  baseGeometry.setAttribute('position', new THREE.Float32BufferAttribute(basePos, 3));
  baseGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(baseNorm, 3));
  baseGeometry.setIndex(baseIdx);
  baseGeometry.computeVertexNormals();

  // --- 2. LID GEOMETRY ---
  const lidPos: number[] = [];
  const lidNorm: number[] = [];
  const lidIdx: number[] = [];

  // When print-bed mode (exploded === false), lid outer top face sits at z = 0 with lip pointing +Z.
  // When exploded === true, lid hovers above base at z = baseH + 20 with lip pointing -Z into tub.
  const plateZ0 = exploded ? baseH + 20 : 0;
  const plateZ1 = plateZ0 + lidH;

  // Main lid top cover plate (solid or through-slotted)
  if (!ventilationGrille) {
    pushBox(lidPos, lidNorm, lidIdx, -halfL, halfL, -halfW, halfW, plateZ0, plateZ1);
  } else {
    // True through-slots across lid thickness
    const slotCount = Math.min(8, Math.max(3, Math.floor(innerLengthMm / 12)));
    const slotW = 2.4;
    const slotL = Math.min(innerWidthMm * 0.6, 30);
    const spacing = innerLengthMm / (slotCount + 1);

    // Front solid frame border
    pushBox(lidPos, lidNorm, lidIdx, -halfL, halfL, -halfW, -slotL / 2, plateZ0, plateZ1);
    // Rear solid frame border
    pushBox(lidPos, lidNorm, lidIdx, -halfL, halfL, slotL / 2, halfW, plateZ0, plateZ1);

    const firstSlotX = -halfInnerL + 1 * spacing;
    const lastSlotX = -halfInnerL + slotCount * spacing;

    // Left end solid frame
    pushBox(lidPos, lidNorm, lidIdx, -halfL, firstSlotX - slotW / 2, -slotL / 2, slotL / 2, plateZ0, plateZ1);
    // Right end solid frame
    pushBox(lidPos, lidNorm, lidIdx, lastSlotX + slotW / 2, halfL, -slotL / 2, slotL / 2, plateZ0, plateZ1);

    // Solid slats between slots
    for (let i = 1; i < slotCount; i++) {
      const gxCurr = -halfInnerL + i * spacing;
      const gxNext = -halfInnerL + (i + 1) * spacing;
      const slatMinX = gxCurr + slotW / 2;
      const slatMaxX = gxNext - slotW / 2;
      if (slatMaxX > slatMinX) {
        pushBox(lidPos, lidNorm, lidIdx, slatMinX, slatMaxX, -slotL / 2, slotL / 2, plateZ0, plateZ1);
      }
    }
  }

  // Corner radius / bevel reinforcements on lid
  if (cr > 0) {
    pushBox(lidPos, lidNorm, lidIdx, -halfL, -halfL + cr, -halfW, -halfW + cr, plateZ0, plateZ1);
    pushBox(lidPos, lidNorm, lidIdx, halfL - cr, halfL, -halfW, -halfW + cr, plateZ0, plateZ1);
    pushBox(lidPos, lidNorm, lidIdx, halfL - cr, halfL, halfW - cr, halfW, plateZ0, plateZ1);
    pushBox(lidPos, lidNorm, lidIdx, -halfL, -halfL + cr, halfW - cr, halfW, plateZ0, plateZ1);
  }

  // Inner interlocking lip (with 0.2mm 3D print clearance)
  const clear = 0.2;
  const lipProtrusion = closureType === 'snap_fit' ? 4.0 : 2.5;
  const lipT = 1.0;
  const lipL = halfInnerL - clear;
  const lipW = halfInnerW - clear;

  const lipZ0 = exploded ? baseH + 20 - lipProtrusion : plateZ1;
  const lipZ1 = exploded ? baseH + 20 : plateZ1 + lipProtrusion;

  // Interlocking rim
  pushBox(lidPos, lidNorm, lidIdx, -lipL, -lipL + lipT, -lipW, lipW, lipZ0, lipZ1);
  pushBox(lidPos, lidNorm, lidIdx, lipL - lipT, lipL, -lipW, lipW, lipZ0, lipZ1);
  pushBox(lidPos, lidNorm, lidIdx, -lipL + lipT, lipL - lipT, -lipW, -lipW + lipT, lipZ0, lipZ1);
  pushBox(lidPos, lidNorm, lidIdx, -lipL + lipT, lipL - lipT, lipW - lipT, lipW, lipZ0, lipZ1);

  // Snap-fit tabs
  if (closureType === 'snap_fit') {
    const tabW = Math.min(20, innerLengthMm * 0.3);
    const tabH = 1.2;
    const snapZ0 = exploded ? lipZ0 : lipZ1 - 1.5;
    const snapZ1 = exploded ? lipZ0 + 1.5 : lipZ1;
    // Left & Right snap overhangs
    pushBox(lidPos, lidNorm, lidIdx, -lipL - tabH, -lipL, -tabW / 2, tabW / 2, snapZ0, snapZ1);
    pushBox(lidPos, lidNorm, lidIdx, lipL, lipL + tabH, -tabW / 2, tabW / 2, snapZ0, snapZ1);
  }

  const lidGeometry = new THREE.BufferGeometry();
  lidGeometry.setAttribute('position', new THREE.Float32BufferAttribute(lidPos, 3));
  lidGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(lidNorm, 3));
  lidGeometry.setIndex(lidIdx);
  lidGeometry.computeVertexNormals();

  // --- 3. COMBINED GEOMETRY (PRINT BED LAYOUT OR EXPLODED VIEW) ---
  const combPos: number[] = [];
  const combNorm: number[] = [];
  const combIdx: number[] = [];

  // Append base
  const basePosAttr = baseGeometry.getAttribute('position');
  const baseNormAttr = baseGeometry.getAttribute('normal');
  const baseIdxAttr = baseGeometry.getIndex()!;

  // Shift base slightly left for print bed layout
  const bedOffset = exploded ? 0 : halfL + 6.0;

  for (let i = 0; i < basePosAttr.count; i++) {
    combPos.push(basePosAttr.getX(i) - (exploded ? 0 : bedOffset), basePosAttr.getY(i), basePosAttr.getZ(i));
    combNorm.push(baseNormAttr.getX(i), baseNormAttr.getY(i), baseNormAttr.getZ(i));
  }
  for (let i = 0; i < baseIdxAttr.count; i++) {
    combIdx.push(baseIdxAttr.getX(i));
  }

  // Append lid
  const lidOffsetStart = combPos.length / 3;
  const lidPosAttr = lidGeometry.getAttribute('position');
  const lidNormAttr = lidGeometry.getAttribute('normal');
  const lidIdxAttr = lidGeometry.getIndex()!;

  const lidX = exploded ? 0 : bedOffset;

  for (let i = 0; i < lidPosAttr.count; i++) {
    combPos.push(lidPosAttr.getX(i) + lidX, lidPosAttr.getY(i), lidPosAttr.getZ(i));
    combNorm.push(lidNormAttr.getX(i), lidNormAttr.getY(i), lidNormAttr.getZ(i));
  }
  for (let i = 0; i < lidIdxAttr.count; i++) {
    combIdx.push(lidOffsetStart + lidIdxAttr.getX(i));
  }
  for (let i = 0; i < lidIdxAttr.count; i++) {
    combIdx.push(lidOffsetStart + lidIdxAttr.getX(i));
  }

  const combinedGeometry = new THREE.BufferGeometry();
  combinedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(combPos, 3));
  combinedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(combNorm, 3));
  combinedGeometry.setIndex(combIdx);
  combinedGeometry.computeVertexNormals();

  return {
    baseGeometry,
    lidGeometry,
    combinedGeometry,
  };
}

/**
 * Calculates physical, slicing, and mass metrics for the enclosure.
 */
export function calculateEnclosureMetrics(
  baseGeom: THREE.BufferGeometry,
  lidGeom: THREE.BufferGeometry,
  options: ElectronicsBoxEnclosureOptions
): ElectronicsBoxMetrics {
  const outerLengthMm = options.innerLengthMm + 2 * options.wallThicknessMm;
  const outerWidthMm = options.innerWidthMm + 2 * options.wallThicknessMm;
  const outerHeightMm = options.innerHeightMm + 2 * options.wallThicknessMm;

  const baseTriangleCount = baseGeom.getIndex() ? baseGeom.getIndex()!.count / 3 : 0;
  const lidTriangleCount = lidGeom.getIndex() ? lidGeom.getIndex()!.count / 3 : 0;
  const totalTriangles = baseTriangleCount + lidTriangleCount;

  // Approximate solid shell volume (base + lid)
  const baseVolumeMm3 =
    (outerLengthMm * outerWidthMm * options.wallThicknessMm) + // floor
    (2 * (outerLengthMm + outerWidthMm) * options.innerHeightMm * options.wallThicknessMm); // walls
  const lidVolumeMm3 = outerLengthMm * outerWidthMm * options.wallThicknessMm;
  const totalVolumeCm3 = Math.max(1.0, (baseVolumeMm3 + lidVolumeMm3) / 1000.0);

  // PLA density ~ 1.24 g/cm3
  const estimatedGrams = Math.round(totalVolumeCm3 * 1.24 * 10) / 10;

  // Print speed estimation
  const estimatedPrintTimeHours =
    Math.round((options.innerHeightMm * 0.04 + estimatedGrams * 0.06) * 10) / 10;

  const slicerTips: string[] = [
    'Print Orientation: Both base tub and lid are pre-arranged flat on the print bed with 0° overhangs.',
    'Clearance Tolerance: Snap-fit cantilevers and lid rim include 0.20mm calibrated printer tolerance.',
    'Perimeters / Walls: Use 3 wall perimeters (1.2mm - 1.6mm) for sturdy screw bosses and snap tabs.',
    'Infill: Set infill to 20% (Gyroid or Rectilinear) for optimal rigidity under clamping force.',
    'Bed Adhesion: Clean textured PEI bed with warm soapy water for pristine flat lid surface finish.',
  ];

  return {
    outerLengthMm,
    outerWidthMm,
    outerHeightMm,
    baseTriangleCount,
    lidTriangleCount,
    totalTriangles,
    estimatedGrams,
    estimatedPrintTimeHours,
    slicerTips,
  };
}

/**
 * Encodes BufferGeometry into binary STL ArrayBuffer.
 */
export function exportEnclosureSTL(geometry: THREE.BufferGeometry): ArrayBuffer {
  const index = geometry.getIndex();
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');

  const triangleCount = index ? index.count / 3 : position.count / 3;
  const bufferSize = 84 + triangleCount * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const dataView = new DataView(buffer);

  const headerStr = 'PrivKnife Electronics Box Enclosure - Client-Side STL Export';
  for (let i = 0; i < 80; i++) {
    dataView.setUint8(i, i < headerStr.length ? headerStr.charCodeAt(i) : 0);
  }

  dataView.setUint32(80, triangleCount, true);

  let offset = 84;
  for (let i = 0; i < triangleCount; i++) {
    const idx0 = index ? index.getX(i * 3) : i * 3;
    const idx1 = index ? index.getX(i * 3 + 1) : i * 3 + 1;
    const idx2 = index ? index.getX(i * 3 + 2) : i * 3 + 2;

    const nX = normal ? normal.getX(idx0) : 0;
    const nY = normal ? normal.getY(idx0) : 0;
    const nZ = normal ? normal.getZ(idx0) : 0;

    dataView.setFloat32(offset, nX, true);
    dataView.setFloat32(offset + 4, nY, true);
    dataView.setFloat32(offset + 8, nZ, true);

    dataView.setFloat32(offset + 12, position.getX(idx0), true);
    dataView.setFloat32(offset + 16, position.getY(idx0), true);
    dataView.setFloat32(offset + 20, position.getZ(idx0), true);

    dataView.setFloat32(offset + 24, position.getX(idx1), true);
    dataView.setFloat32(offset + 28, position.getY(idx1), true);
    dataView.setFloat32(offset + 32, position.getZ(idx1), true);

    dataView.setFloat32(offset + 36, position.getX(idx2), true);
    dataView.setFloat32(offset + 40, position.getY(idx2), true);
    dataView.setFloat32(offset + 44, position.getZ(idx2), true);

    dataView.setUint16(offset + 48, 0, true);
    offset += 50;
  }

  return buffer;
}

/**
 * Encodes Base and Lid Geometries into a multi-object Microsoft 3MF specification package.
 */
export async function exportEnclosure3MF(
  baseGeom: THREE.BufferGeometry,
  lidGeom: THREE.BufferGeometry,
  options: ElectronicsBoxEnclosureOptions
): Promise<Blob> {
  function serializeMeshXml(geom: THREE.BufferGeometry, id: number, name: string): string {
    const index = geom.getIndex();
    const pos = geom.getAttribute('position');
    const vCount = pos.count;
    const tCount = index ? index.count / 3 : vCount / 3;

    let vXml = '';
    for (let i = 0; i < vCount; i++) {
      vXml += `        <vertex x="${pos.getX(i).toFixed(3)}" y="${pos.getY(i).toFixed(3)}" z="${pos.getZ(i).toFixed(3)}" />\n`;
    }

    let tXml = '';
    for (let i = 0; i < tCount; i++) {
      const v1 = index ? index.getX(i * 3) : i * 3;
      const v2 = index ? index.getX(i * 3 + 1) : i * 3 + 1;
      const v3 = index ? index.getX(i * 3 + 2) : i * 3 + 2;
      tXml += `        <triangle v1="${v1}" v2="${v2}" v3="${v3}" />\n`;
    }

    return `    <object id="${id}" name="${name}" type="model">
      <mesh>
        <vertices>
${vXml}        </vertices>
        <triangles>
${tXml}        </triangles>
      </mesh>
    </object>\n`;
  }

  const baseXml = serializeMeshXml(baseGeom, 1, 'Base Enclosure');
  const lidXml = serializeMeshXml(lidGeom, 2, 'Lid Cover');

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">PrivKnife Electronics Enclosure (${options.closureType})</metadata>
  <metadata name="Application">PrivKnife Client-Side 3D Studio</metadata>
  <resources>
${baseXml}${lidXml}  </resources>
  <build>
    <item objectid="1" />
    <item objectid="2" transform="1 0 0 0 1 0 0 0 1 ${options.innerLengthMm + 15} 0 0" />
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
export async function processEnclosure(
  options: ElectronicsBoxEnclosureOptions,
  format: 'stl' | '3mf' = 'stl'
): Promise<ElectronicsBoxEnclosureResult> {
  const validation = validateEnclosureOptions(options);
  if (!validation.valid) {
    return {
      success: false,
      blob: new Blob([], { type: 'application/octet-stream' }),
      fileName: '',
      fileSize: 0,
      mimeType: 'application/octet-stream',
      metrics: {
        outerLengthMm: 0,
        outerWidthMm: 0,
        outerHeightMm: 0,
        baseTriangleCount: 0,
        lidTriangleCount: 0,
        totalTriangles: 0,
        estimatedGrams: 0,
        estimatedPrintTimeHours: 0,
        slicerTips: [],
      },
      error: validation.error,
    };
  }

  const { baseGeometry, lidGeometry, combinedGeometry } = generateEnclosureGeometries(options);
  const metrics = calculateEnclosureMetrics(baseGeometry, lidGeometry, options);

  const baseFileName = `electronics-box-${options.innerLengthMm}x${options.innerWidthMm}x${options.innerHeightMm}mm`;

  let blob: Blob;
  let fileName: string;
  let mimeType: string;

  if (format === '3mf') {
    blob = await exportEnclosure3MF(baseGeometry, lidGeometry, options);
    fileName = `${baseFileName}.3mf`;
    mimeType = 'model/3mf';
  } else {
    const stlBuffer = exportEnclosureSTL(combinedGeometry);
    blob = new Blob([stlBuffer], { type: 'model/stl' });
    fileName = `${baseFileName}.stl`;
    mimeType = 'model/stl';
  }

  baseGeometry.dispose();
  lidGeometry.dispose();
  combinedGeometry.dispose();

  return {
    success: true,
    blob,
    fileName,
    fileSize: blob.size,
    mimeType,
    metrics,
  };
}
