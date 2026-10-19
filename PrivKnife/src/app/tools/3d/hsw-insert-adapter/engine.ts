import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import JSZip from 'jszip';
import {
  HswExportFormat,
  HswInsertAdapterOptions,
  HswInsertAdapterResult,
  HswInsertType,
  HswMetrics,
  MetricNutSize,
} from './types';

// -------------------------------------------------------------
// 1. Parameter Validation
// -------------------------------------------------------------
export function validateHswOptions(options: HswInsertAdapterOptions): {
  valid: boolean;
  error?: string;
} {
  if (!options) {
    return { valid: false, error: 'Options are required' };
  }

  if (
    typeof options.magnetDiameterMm !== 'number' ||
    options.magnetDiameterMm < 5.0 ||
    options.magnetDiameterMm > 15.0
  ) {
    return { valid: false, error: 'Magnet diameter must be between 5.0 and 15.0 mm' };
  }

  if (
    typeof options.magnetDepthMm !== 'number' ||
    options.magnetDepthMm < 1.5 ||
    options.magnetDepthMm > 5.0
  ) {
    return { valid: false, error: 'Magnet depth must be between 1.5 and 5.0 mm' };
  }

  if (
    typeof options.hookLengthMm !== 'number' ||
    options.hookLengthMm < 15 ||
    options.hookLengthMm > 70
  ) {
    return { valid: false, error: 'Hook length must be between 15 and 70 mm' };
  }

  if (
    typeof options.hookAngleDeg !== 'number' ||
    options.hookAngleDeg < 0 ||
    options.hookAngleDeg > 60
  ) {
    return { valid: false, error: 'Hook angle must be between 0 and 60 degrees' };
  }

  if (
    typeof options.ringDiameterMm !== 'number' ||
    options.ringDiameterMm < 15 ||
    options.ringDiameterMm > 60
  ) {
    return { valid: false, error: 'Ring diameter must be between 15 and 60 mm' };
  }

  if (
    typeof options.tightnessToleranceMm !== 'number' ||
    options.tightnessToleranceMm < -0.2 ||
    options.tightnessToleranceMm > 0.3
  ) {
    return { valid: false, error: 'Tightness tolerance must be between -0.2 and +0.3 mm' };
  }

  if (
    typeof options.plugDepthMm !== 'number' ||
    options.plugDepthMm < 6.0 ||
    options.plugDepthMm > 12.0
  ) {
    return { valid: false, error: 'Plug depth must be between 6.0 and 12.0 mm' };
  }

  return { valid: true };
}

// -------------------------------------------------------------
// 2. Safe Buffer Geometry Merging
// -------------------------------------------------------------
function safeMergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geometries.length === 0) return new THREE.BufferGeometry();
  if (geometries.length === 1) return geometries[0].clone();

  const normalized = geometries.map((geom) => {
    let g = geom.index ? geom.toNonIndexed() : geom.clone();
    const attrs = Object.keys(g.attributes);
    for (const attr of attrs) {
      if (attr !== 'position' && attr !== 'normal') {
        g.deleteAttribute(attr);
      }
    }
    if (!g.getAttribute('normal')) {
      g.computeVertexNormals();
    }
    return g;
  });

  const merged = BufferGeometryUtils.mergeGeometries(normalized, false);
  normalized.forEach((g) => g.dispose());
  return merged || new THREE.BufferGeometry();
}

// -------------------------------------------------------------
// 3. Hexagonal Shape Helpers
// -------------------------------------------------------------
function createHexagonShape(acrossFlatsMm: number): THREE.Shape {
  // Radius from center to vertices: R = acrossFlats / sqrt(3)
  const radius = acrossFlatsMm / Math.sqrt(3);
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    // 30 degree offset so flat faces align vertically and horizontally
    const angle = (i * Math.PI) / 3 + Math.PI / 6;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

// -------------------------------------------------------------
// 4. Procedural 3D HSW Mesh Generation
// -------------------------------------------------------------
export interface HswMeshResult {
  plugGeometry: THREE.BufferGeometry;
  attachmentGeometry: THREE.BufferGeometry;
  metrics: HswMetrics;
}

export function generateHswMesh(options: HswInsertAdapterOptions): HswMeshResult {
  const standardAcrossFlats = 20.0;
  const effAcrossFlats = standardAcrossFlats + options.tightnessToleranceMm;
  const depth = options.plugDepthMm;

  // --- 1. Base Hexagonal Plug Body ---
  const plugGeometries: THREE.BufferGeometry[] = [];
  const baseHexShape = createHexagonShape(effAcrossFlats);

  // If hex_nut_pocket, subtract central screw hole from plug
  if (options.insertType === 'hex_nut_pocket') {
    const screwHoleR = options.nutSize === 'M3' ? 1.6 : options.nutSize === 'M4' ? 2.15 : 2.65;
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, screwHoleR, 0, Math.PI * 2, true);
    baseHexShape.holes.push(holePath);
  } else if (options.insertType === 'empty_plug') {
    // Center wiring / pry slot hole (Ø 5mm)
    const centerHole = new THREE.Path();
    centerHole.absarc(0, 0, 2.5, 0, Math.PI * 2, true);
    baseHexShape.holes.push(centerHole);
  }

  const hexBodyGeom = new THREE.ExtrudeGeometry(baseHexShape, {
    depth,
    bevelEnabled: false,
  });
  plugGeometries.push(hexBodyGeom);

  // Front Flange Stop Rim (resting flush on front surface of HSW panel)
  if (options.flangeRim) {
    const flangeShape = createHexagonShape(effAcrossFlats + 3.0);
    if (baseHexShape.holes.length > 0) {
      flangeShape.holes.push(...baseHexShape.holes);
    }
    const flangeGeom = new THREE.ExtrudeGeometry(flangeShape, {
      depth: 1.6,
      bevelEnabled: false,
    });
    flangeGeom.translate(0, 0, depth);
    plugGeometries.push(flangeGeom);
  }

  // Retention Snap Click-Tabs
  if (options.retentionTabs) {
    // Small locking ridge bumps on 2 opposing flats
    const tabWidth = 4.5;
    const tabHeight = 0.45;
    const tabLength = 1.6;
    const tabDist = effAcrossFlats / 2;

    const tabGeom1 = new THREE.BoxGeometry(tabWidth, tabHeight * 2, tabLength);
    tabGeom1.translate(0, tabDist, depth * 0.5);

    const tabGeom2 = new THREE.BoxGeometry(tabWidth, tabHeight * 2, tabLength);
    tabGeom2.translate(0, -tabDist, depth * 0.5);

    plugGeometries.push(tabGeom1, tabGeom2);
  }

  const plugGeometry = safeMergeGeometries(plugGeometries);
  plugGeometries.forEach((g) => g.dispose());

  // --- 2. Functional Attachment Geometry ---
  const attachGeometries: THREE.BufferGeometry[] = [];
  const frontZ = depth + (options.flangeRim ? 1.6 : 0);

  let totalLengthMm = standardAcrossFlats;
  let totalHeightMm = standardAcrossFlats;

  switch (options.insertType) {
    case 'empty_plug': {
      // Small decorative coin / pry groove on front
      const slotGeom = new THREE.BoxGeometry(8.0, 1.8, 0.8);
      slotGeom.translate(0, 0, frontZ - 0.4);
      attachGeometries.push(slotGeom);
      break;
    }

    case 'hex_nut_pocket': {
      // Captive hex nut pocket boss
      const nutFlat = options.nutSize === 'M3' ? 5.5 : options.nutSize === 'M4' ? 7.0 : 8.0;
      const nutDepth = options.nutSize === 'M3' ? 2.4 : options.nutSize === 'M4' ? 3.2 : 4.0;
      const outerBossDia = nutFlat + 4.0;

      const bossShape = new THREE.Shape();
      bossShape.absarc(0, 0, outerBossDia / 2, 0, Math.PI * 2, false);

      // Subtract hex nut pocket
      const nutHexHole = createHexagonShape(nutFlat + 0.15);
      bossShape.holes.push(nutHexHole);

      const bossGeom = new THREE.ExtrudeGeometry(bossShape, {
        depth: nutDepth + 1.2,
        bevelEnabled: false,
      });
      bossGeom.translate(0, 0, frontZ);
      attachGeometries.push(bossGeom);

      totalLengthMm = Math.max(totalLengthMm, outerBossDia);
      break;
    }

    case 'threaded_post': {
      // Cylindrical standoff boss with pilot tap hole
      const postDia = 10.0;
      const postLen = 14.0;
      const pilotR = options.nutSize === 'M3' ? 1.25 : options.nutSize === 'M4' ? 1.65 : 2.1;

      const postShape = new THREE.Shape();
      postShape.absarc(0, 0, postDia / 2, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.absarc(0, 0, pilotR, 0, Math.PI * 2, true);
      postShape.holes.push(hole);

      const postGeom = new THREE.ExtrudeGeometry(postShape, {
        depth: postLen,
        bevelEnabled: false,
      });
      postGeom.translate(0, 0, frontZ);
      attachGeometries.push(postGeom);

      totalLengthMm = Math.max(totalLengthMm, postDia);
      break;
    }

    case 'magnet_holder': {
      // Cylindrical pocket on front for neodymium disc magnet
      const magDia = options.magnetDiameterMm;
      const magDepth = options.magnetDepthMm;
      const ringWall = 2.0;
      const outerDia = magDia + ringWall * 2;

      const holderShape = new THREE.Shape();
      holderShape.absarc(0, 0, outerDia / 2, 0, Math.PI * 2, false);
      const magHole = new THREE.Path();
      magHole.absarc(0, 0, magDia / 2, 0, Math.PI * 2, true);
      holderShape.holes.push(magHole);

      const holderGeom = new THREE.ExtrudeGeometry(holderShape, {
        depth: magDepth + 1.0,
        bevelEnabled: false,
      });
      holderGeom.translate(0, 0, frontZ);
      attachGeometries.push(holderGeom);

      totalLengthMm = Math.max(totalLengthMm, outerDia);
      break;
    }

    case 'tool_hook': {
      // Cantilever cantilever hook with angled upturn tip
      const armWidth = 7.0;
      const armThick = 6.0;
      const hookLen = options.hookLengthMm;
      const tipAngleRad = (options.hookAngleDeg * Math.PI) / 180;
      const tipLen = 12.0;

      // Base arm
      const armGeom = new THREE.BoxGeometry(armWidth, armThick, hookLen);
      armGeom.translate(0, -armThick / 2, frontZ + hookLen / 2);

      // Upturned tip
      const tipGeom = new THREE.BoxGeometry(armWidth, armThick, tipLen);
      tipGeom.rotateX(-tipAngleRad);
      tipGeom.translate(
        0,
        -armThick / 2 + (tipLen / 2) * Math.sin(tipAngleRad),
        frontZ + hookLen + (tipLen / 2) * Math.cos(tipAngleRad)
      );

      // Reinforced bottom gusset brace
      const gussetShape = new THREE.Shape();
      gussetShape.moveTo(-armWidth / 2, 0);
      gussetShape.lineTo(armWidth / 2, 0);
      gussetShape.lineTo(armWidth / 2, -10.0);
      gussetShape.lineTo(-armWidth / 2, -10.0);
      gussetShape.closePath();
      const gussetGeom = new THREE.ExtrudeGeometry(gussetShape, {
        depth: Math.min(hookLen * 0.4, 15.0),
        bevelEnabled: false,
      });
      gussetGeom.rotateX(Math.PI / 4);
      gussetGeom.translate(0, -armThick, frontZ);

      attachGeometries.push(armGeom, tipGeom, gussetGeom);

      totalLengthMm = hookLen + tipLen;
      totalHeightMm = standardAcrossFlats + 15.0;
      break;
    }

    case 'storage_ring': {
      // Cylindrical tool ring / can holder loop
      const ringInnerDia = options.ringDiameterMm;
      const ringWall = 3.5;
      const ringOuterDia = ringInnerDia + ringWall * 2;
      const ringHeight = 14.0;
      const standOff = ringOuterDia / 2 + 2.0;

      const ringShape = new THREE.Shape();
      ringShape.absarc(0, standOff, ringOuterDia / 2, 0, Math.PI * 2, false);
      const innerHole = new THREE.Path();
      innerHole.absarc(0, standOff, ringInnerDia / 2, 0, Math.PI * 2, true);
      ringShape.holes.push(innerHole);

      const ringGeom = new THREE.ExtrudeGeometry(ringShape, {
        depth: ringHeight,
        bevelEnabled: false,
      });
      ringGeom.translate(0, 0, frontZ);

      // Neck mounting bridge
      const neckGeom = new THREE.BoxGeometry(8.0, standOff, ringHeight);
      neckGeom.translate(0, standOff / 2, frontZ + ringHeight / 2);

      attachGeometries.push(ringGeom, neckGeom);

      totalLengthMm = ringOuterDia;
      totalHeightMm = standOff + ringOuterDia / 2;
      break;
    }
  }

  const attachmentGeometry = safeMergeGeometries(attachGeometries);
  attachGeometries.forEach((g) => g.dispose());

  // Metrics
  const plugPos = plugGeometry.getAttribute('position');
  const plugTriangles = plugPos ? Math.round(plugPos.count / 3) : 0;

  const attachPos = attachmentGeometry.getAttribute('position');
  const attachmentTriangles = attachPos ? Math.round(attachPos.count / 3) : 0;

  const totalTriangles = plugTriangles + attachmentTriangles;

  // Mass calculation (PLA/PETG ~1.25 g/cm3)
  const baseVolCm3 = (standardAcrossFlats * standardAcrossFlats * depth * 0.001) * 0.85;
  const attachVolCm3 = (totalLengthMm * totalHeightMm * 10 * 0.001) * 0.25;
  const estimatedGrams = Math.max(2.0, Math.round((baseVolCm3 + attachVolCm3) * 1.25 * 10) / 10);
  const estimatedPrintTimeHours = Math.max(0.2, Math.round((estimatedGrams / 14 + 0.1) * 10) / 10);

  const hswPrintingTips = [
    'Layer Height: 0.20mm layer height with 4 perimeters provides ideal spring tension and click-lock retention.',
    'Orientation: Print with the hexagonal plug face flat on the build plate for maximal layer strength on hooks and bosses.',
    'Material: PETG or ABS/ASA is ideal for workshop durability and creep resistance under heavy sustained cantilever loads.',
    'Tolerance Tuning: If insert feels too tight in your wall, decrease "Tightness Tolerance" by -0.05mm.',
  ];

  return {
    plugGeometry,
    attachmentGeometry,
    metrics: {
      acrossFlatsMm: standardAcrossFlats,
      plugDepthMm: depth,
      totalLengthMm: Math.round(totalLengthMm * 10) / 10,
      totalHeightMm: Math.round(totalHeightMm * 10) / 10,
      plugTriangles,
      attachmentTriangles,
      totalTriangles,
      estimatedGrams,
      estimatedPrintTimeHours,
      hswPrintingTips,
    },
  };
}

// -------------------------------------------------------------
// 5. Binary STL & Multi-Part 3MF Serialization
// -------------------------------------------------------------
export function exportHswSTL(
  plugGeom: THREE.BufferGeometry,
  attachGeom: THREE.BufferGeometry
): ArrayBuffer {
  const parts: THREE.BufferGeometry[] = [plugGeom];
  if (attachGeom.getAttribute('position') && attachGeom.getAttribute('position').count > 0) {
    parts.push(attachGeom);
  }

  const unified = safeMergeGeometries(parts);
  const pos = unified.getAttribute('position');
  const triCount = pos ? Math.floor(pos.count / 3) : 0;

  const bufferSize = 84 + triCount * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const dv = new DataView(buffer);

  // 80-byte header
  const headerStr = 'PrivKnife HSW Insert & Adapter Studio (Binary STL)';
  for (let i = 0; i < headerStr.length && i < 80; i++) {
    dv.setUint8(i, headerStr.charCodeAt(i));
  }

  // 4-byte triangle count
  dv.setUint32(80, triCount, true);

  let offset = 84;
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const p3 = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let i = 0; i < triCount; i++) {
    const idx = i * 3;
    p1.fromBufferAttribute(pos, idx);
    p2.fromBufferAttribute(pos, idx + 1);
    p3.fromBufferAttribute(pos, idx + 2);

    p2.clone().sub(p1).cross(p3.clone().sub(p1)).normalize();
    normal.copy(p2).sub(p1).cross(p3.sub(p1)).normalize();

    // Normal
    dv.setFloat32(offset, normal.x, true);
    dv.setFloat32(offset + 4, normal.y, true);
    dv.setFloat32(offset + 8, normal.z, true);

    // Vertex 1
    dv.setFloat32(offset + 12, p1.x, true);
    dv.setFloat32(offset + 16, p1.y, true);
    dv.setFloat32(offset + 20, p1.z, true);

    // Vertex 2
    dv.setFloat32(offset + 24, p2.x, true);
    dv.setFloat32(offset + 28, p2.y, true);
    dv.setFloat32(offset + 32, p2.z, true);

    // Vertex 3
    dv.setFloat32(offset + 36, p3.x, true);
    dv.setFloat32(offset + 40, p3.y, true);
    dv.setFloat32(offset + 44, p3.z, true);

    // Attribute byte count
    dv.setUint16(offset + 48, 0, true);
    offset += 50;
  }

  unified.dispose();
  return buffer;
}

export async function exportHsw3MF(
  plugGeom: THREE.BufferGeometry,
  attachGeom: THREE.BufferGeometry,
  options: HswInsertAdapterOptions
): Promise<Blob> {
  function serializeMeshXml(geom: THREE.BufferGeometry, id: number, name: string): string {
    const nonIndexed = geom.index ? geom.toNonIndexed() : geom;
    const pos = nonIndexed.getAttribute('position');
    const vCount = pos ? pos.count : 0;
    const tCount = Math.floor(vCount / 3);

    let vXml = '';
    for (let i = 0; i < vCount; i++) {
      vXml += `        <vertex x="${pos.getX(i).toFixed(3)}" y="${pos.getY(i).toFixed(3)}" z="${pos.getZ(i).toFixed(3)}" />\n`;
    }

    let tXml = '';
    for (let i = 0; i < tCount; i++) {
      const idx = i * 3;
      tXml += `        <triangle v1="${idx}" v2="${idx + 1}" v3="${idx + 2}" />\n`;
    }

    if (geom.index) nonIndexed.dispose();

    return `    <object id="${id}" name="${name}" type="model">
      <mesh>
        <vertices>
${vXml}        </vertices>
        <triangles>
${tXml}        </triangles>
      </mesh>
    </object>\n`;
  }

  let objectsXml = '';
  let buildItemsXml = '';

  // Object 1: HSW Hex Plug
  objectsXml += serializeMeshXml(plugGeom, 1, 'HSW Hex Plug');
  buildItemsXml += `    <item objectid="1" />\n`;

  // Object 2: Attachment (if present)
  if (attachGeom.getAttribute('position') && attachGeom.getAttribute('position').count > 0) {
    objectsXml += serializeMeshXml(attachGeom, 2, `HSW Attachment (${options.insertType})`);
    buildItemsXml += `    <item objectid="2" />\n`;
  }

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">HSW Insert - PrivKnife</metadata>
  <metadata name="Designer">PrivKnife Client-Side Studio</metadata>
  <resources>
${objectsXml}  </resources>
  <build>
${buildItemsXml}  </build>
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

// -------------------------------------------------------------
// 6. Complete Pipeline
// -------------------------------------------------------------
export async function processHsw(
  options: HswInsertAdapterOptions,
  format: HswExportFormat = 'stl'
): Promise<HswInsertAdapterResult> {
  const validation = validateHswOptions(options);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid options');
  }

  const { plugGeometry, attachmentGeometry, metrics } = generateHswMesh(options);
  const typeSlug = options.insertType.replace(/_/g, '-');
  const fileNameBase = `hsw-insert-${typeSlug}`;

  try {
    if (format === '3mf') {
      const blob = await exportHsw3MF(plugGeometry, attachmentGeometry, options);
      return {
        success: true,
        blob,
        fileName: `${fileNameBase}.3mf`,
        fileSize: blob.size,
        mimeType: 'model/3mf',
        metrics,
      };
    } else {
      const buffer = exportHswSTL(plugGeometry, attachmentGeometry);
      const blob = new Blob([buffer], { type: 'model/stl' });
      return {
        success: true,
        blob,
        fileName: `${fileNameBase}.stl`,
        fileSize: blob.size,
        mimeType: 'model/stl',
        metrics,
      };
    }
  } finally {
    plugGeometry.dispose();
    attachmentGeometry.dispose();
  }
}
