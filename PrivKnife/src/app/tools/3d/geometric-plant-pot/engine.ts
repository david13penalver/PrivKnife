import * as THREE from 'three';
import JSZip from 'jszip';
import {
  AestheticStyle,
  GeometricPlantPotOptions,
  GeometricPlantPotResult,
  GeometricPlantPotMetrics,
  PlanterType,
  PresetPlanter,
} from './types';

/**
 * Validates geometric planter options.
 */
export function validatePlanterOptions(options: GeometricPlantPotOptions): {
  valid: boolean;
  error?: string;
} {
  if (!options) {
    return { valid: false, error: 'Options are required' };
  }

  if (
    typeof options.topDiameterMm !== 'number' ||
    options.topDiameterMm < 30 ||
    options.topDiameterMm > 350
  ) {
    return { valid: false, error: 'Top diameter must be between 30 and 350 mm' };
  }

  if (
    typeof options.bottomDiameterMm !== 'number' ||
    options.bottomDiameterMm < 20 ||
    options.bottomDiameterMm > 300
  ) {
    return { valid: false, error: 'Bottom diameter must be between 20 and 300 mm' };
  }

  if (
    typeof options.heightMm !== 'number' ||
    options.heightMm < 30 ||
    options.heightMm > 350
  ) {
    return { valid: false, error: 'Height must be between 30 and 350 mm' };
  }

  if (
    typeof options.polygonSides !== 'number' ||
    options.polygonSides < 3 ||
    options.polygonSides > 32
  ) {
    return { valid: false, error: 'Polygon sides must be between 3 and 32' };
  }

  if (
    typeof options.wallThicknessMm !== 'number' ||
    options.wallThicknessMm < 1.0 ||
    options.wallThicknessMm > 10.0
  ) {
    return { valid: false, error: 'Wall thickness must be between 1.0 and 10.0 mm' };
  }

  if (
    typeof options.wickHoleDiameterMm !== 'number' ||
    options.wickHoleDiameterMm < 3 ||
    options.wickHoleDiameterMm > 25
  ) {
    return { valid: false, error: 'Wick hole diameter must be between 3 and 25 mm' };
  }

  return { valid: true };
}

/**
 * Merges multiple BufferGeometries into a single BufferGeometry.
 */
export function mergeBufferGeometries(
  geometries: THREE.BufferGeometry[]
): THREE.BufferGeometry {
  const valid = geometries.filter(
    (g) => g && g.attributes['position'] && g.attributes['position'].count > 0
  );
  if (valid.length === 0) return new THREE.BufferGeometry();
  if (valid.length === 1) return valid[0].clone();

  let totalVertices = 0;
  let totalIndices = 0;

  for (const g of valid) {
    const pos = g.attributes['position'];
    totalVertices += pos.count;
    if (g.index) {
      totalIndices += g.index.count;
    } else {
      totalIndices += pos.count;
    }
  }

  const mergedPos = new Float32Array(totalVertices * 3);
  const mergedNorm = new Float32Array(totalVertices * 3);
  const mergedIdx = new Uint32Array(totalIndices);

  let vertexOffset = 0;
  let indexOffset = 0;

  for (const g of valid) {
    const pos = g.attributes['position'];
    const norm = g.attributes['normal'];
    const idx = g.index;
    const count = pos.count;

    for (let i = 0; i < count * 3; i++) {
      mergedPos[vertexOffset * 3 + i] = pos.array[i];
      if (norm) {
        mergedNorm[vertexOffset * 3 + i] = norm.array[i];
      }
    }

    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        mergedIdx[indexOffset + i] = vertexOffset + idx.array[i];
      }
      indexOffset += idx.count;
    } else {
      for (let i = 0; i < count; i++) {
        mergedIdx[indexOffset + i] = vertexOffset + i;
      }
      indexOffset += count;
    }

    vertexOffset += count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
  merged.setIndex(new THREE.BufferAttribute(mergedIdx, 1));
  merged.computeVertexNormals();
  merged.computeBoundingBox();
  return merged;
}

/**
 * Creates the parametric outer plant pot with faceted, twisted, fluted, or minimal geometry.
 */
function createOuterPotGeometry(options: GeometricPlantPotOptions): THREE.BufferGeometry {
  const {
    aestheticStyle,
    polygonSides,
    twistAngleDeg,
    topDiameterMm,
    bottomDiameterMm,
    heightMm,
    wallThicknessMm,
    planterType,
  } = options;

  const positions: number[] = [];
  const indices: number[] = [];

  const topR = topDiameterMm / 2;
  const btmR = bottomDiameterMm / 2;
  const wallT = Math.max(1.2, wallThicknessMm);
  const floorT = Math.max(3.0, wallT * 1.2);

  // Number of vertical layers
  let numRings = 16;
  if (aestheticStyle === 'low_poly_faceted') numRings = 8;
  else if (aestheticStyle === 'smooth_minimal') numRings = 20;

  const N = Math.max(3, polygonSides);

  // Helper to compute radius with flute or facet variation
  function getOuterRadius(t: number, angle: number): number {
    const baseRadius = btmR * (1 - t) + topR * t;
    if (aestheticStyle === 'vertical_flutes') {
      return baseRadius * (1 + 0.07 * Math.sin(N * angle));
    }
    return baseRadius;
  }

  function getInnerRadius(t: number, angle: number): number {
    const outerR = getOuterRadius(t, angle);
    return Math.max(2.0, outerR - wallT);
  }

  // 1. Generate Outer Surface Vertices
  // Outer rings from ring 0 (y = 0) to ring numRings (y = heightMm)
  const outerVertexStart = 0;
  for (let j = 0; j <= numRings; j++) {
    const t = j / numRings;
    const y = t * heightMm;
    const twist = (twistAngleDeg * Math.PI / 180) * t;
    const facetPhase = (aestheticStyle === 'low_poly_faceted' && j % 2 === 1) ? Math.PI / N : 0;

    for (let i = 0; i < N; i++) {
      const angle = (i * 2 * Math.PI) / N + twist + facetPhase;
      const r = getOuterRadius(t, angle);
      positions.push(r * Math.cos(angle), y, r * Math.sin(angle));
    }
  }

  // Outer Wall Triangles
  for (let j = 0; j < numRings; j++) {
    for (let i = 0; i < N; i++) {
      const nextI = (i + 1) % N;
      const r0_i = outerVertexStart + j * N + i;
      const r0_next = outerVertexStart + j * N + nextI;
      const r1_i = outerVertexStart + (j + 1) * N + i;
      const r1_next = outerVertexStart + (j + 1) * N + nextI;

      // Two triangles per quad
      indices.push(r0_i, r0_next, r1_next);
      indices.push(r0_i, r1_next, r1_i);
    }
  }

  // 2. Generate Inner Cavity Surface Vertices
  // Inner rings from inner ring 0 (y = floorT) to inner ring numRings (y = heightMm)
  const innerVertexStart = positions.length / 3;
  for (let j = 0; j <= numRings; j++) {
    const t = j / numRings;
    const y = floorT + t * (heightMm - floorT);
    const twist = (twistAngleDeg * Math.PI / 180) * t;
    const facetPhase = (aestheticStyle === 'low_poly_faceted' && j % 2 === 1) ? Math.PI / N : 0;

    for (let i = 0; i < N; i++) {
      const angle = (i * 2 * Math.PI) / N + twist + facetPhase;
      const r = getInnerRadius(t, angle);
      positions.push(r * Math.cos(angle), y, r * Math.sin(angle));
    }
  }

  // Inner Wall Triangles (facing inward)
  for (let j = 0; j < numRings; j++) {
    for (let i = 0; i < N; i++) {
      const nextI = (i + 1) % N;
      const r0_i = innerVertexStart + j * N + i;
      const r0_next = innerVertexStart + j * N + nextI;
      const r1_i = innerVertexStart + (j + 1) * N + i;
      const r1_next = innerVertexStart + (j + 1) * N + nextI;

      // Inverted winding so normals face inward
      indices.push(r0_i, r1_next, r0_next);
      indices.push(r0_i, r1_i, r1_next);
    }
  }

  // 3. Connect Top Rim (between outer ring at y=height and inner ring at y=height)
  const topOuterRingStart = outerVertexStart + numRings * N;
  const topInnerRingStart = innerVertexStart + numRings * N;
  for (let i = 0; i < N; i++) {
    const nextI = (i + 1) % N;
    const o_i = topOuterRingStart + i;
    const o_next = topOuterRingStart + nextI;
    const in_i = topInnerRingStart + i;
    const in_next = topInnerRingStart + nextI;

    indices.push(o_i, in_next, o_next);
    indices.push(o_i, in_i, in_next);
  }

  // 4. Bottom Exterior Cap (y = 0)
  const btmCenterIdx = positions.length / 3;
  positions.push(0, 0, 0);
  for (let i = 0; i < N; i++) {
    const nextI = (i + 1) % N;
    indices.push(btmCenterIdx, outerVertexStart + i, outerVertexStart + nextI);
  }

  // 5. Bottom Interior Floor (y = floorT)
  const inFloorCenterIdx = positions.length / 3;
  positions.push(0, floorT, 0);
  for (let i = 0; i < N; i++) {
    const nextI = (i + 1) % N;
    indices.push(inFloorCenterIdx, innerVertexStart + nextI, innerVertexStart + i);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geom.setIndex(indices);
  geom.computeVertexNormals();
  geom.computeBoundingBox();

  return geom;
}

/**
 * Creates the self-watering inner basket/liner.
 */
function createReservoirInsertGeometry(
  options: GeometricPlantPotOptions,
  exploded = false
): THREE.BufferGeometry {
  if (options.planterType !== 'self_watering_insert') {
    const empty = new THREE.BufferGeometry();
    empty.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
    return empty;
  }

  const {
    topDiameterMm,
    bottomDiameterMm,
    heightMm,
    wallThicknessMm,
    wickHoleDiameterMm,
    waterSpoutOpening,
  } = options;

  const parts: THREE.BufferGeometry[] = [];
  const wallT = Math.max(1.2, wallThicknessMm);
  const potFloorT = Math.max(3.0, wallT * 1.2);
  const reservoirH = 22; // 22mm water reservoir chamber height

  const basketBaseY = potFloorT + reservoirH;
  const basketH = heightMm - basketBaseY;

  const topR = Math.max(5.0, topDiameterMm / 2 - wallT - 0.6);
  const btmR = Math.max(4.0, (bottomDiameterMm / 2 - wallT - 0.6) * 0.95);

  // Main basket conical wall
  const basket = new THREE.CylinderGeometry(topR, btmR, basketH, 32, 1, true);
  basket.translate(0, basketBaseY + basketH / 2, 0);
  parts.push(basket);

  // Floor disk with central wick pass-through hole
  const floorDisk = new THREE.RingGeometry(wickHoleDiameterMm / 2, btmR, 32);
  floorDisk.rotateX(-Math.PI / 2);
  floorDisk.translate(0, basketBaseY, 0);
  parts.push(floorDisk);

  // Top resting lip that hangs on the outer pot rim
  const rimLip = new THREE.RingGeometry(topR, topR + wallT + 1.5, 32);
  rimLip.rotateX(-Math.PI / 2);
  rimLip.translate(0, heightMm, 0);
  parts.push(rimLip);

  // Support legs resting on pot floor to elevate soil basket above water pool
  const legCount = 4;
  for (let i = 0; i < legCount; i++) {
    const angle = (i * 2 * Math.PI) / legCount;
    const leg = new THREE.CylinderGeometry(2.5, 2.5, reservoirH, 12);
    const legR = btmR * 0.75;
    leg.translate(legR * Math.cos(angle), potFloorT + reservoirH / 2, legR * Math.sin(angle));
    parts.push(leg);
  }

  // Water fill spout channel if enabled
  if (waterSpoutOpening) {
    const spout = new THREE.CylinderGeometry(7, 7, basketH * 0.85, 16);
    spout.translate(topR * 0.85, basketBaseY + basketH * 0.42, 0);
    parts.push(spout);
  }

  const merged = mergeBufferGeometries(parts);
  for (const p of parts) p.dispose();

  if (exploded) {
    // Offset upward for exploded preview inspection
    merged.translate(0, 45, 0);
  }

  return merged;
}

/**
 * Creates the matching geometric drip saucer for bottom drainage.
 */
function createSaucerGeometry(
  options: GeometricPlantPotOptions,
  exploded = false
): THREE.BufferGeometry {
  if (options.planterType !== 'drainage_with_saucer') {
    const empty = new THREE.BufferGeometry();
    empty.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
    return empty;
  }

  const { bottomDiameterMm, wallThicknessMm } = options;
  const parts: THREE.BufferGeometry[] = [];

  const wallT = Math.max(1.2, wallThicknessMm);
  const saucerInnerR = bottomDiameterMm / 2 + 10;
  const saucerOuterR = saucerInnerR + wallT + 2;
  const saucerH = 16;

  // Saucer base floor
  const saucerFloor = new THREE.CylinderGeometry(saucerOuterR, saucerOuterR - 2, 3.5, 32);
  saucerFloor.translate(0, 1.75, 0);
  parts.push(saucerFloor);

  // Saucer rim wall
  const saucerWall = new THREE.CylinderGeometry(saucerOuterR, saucerOuterR, saucerH, 32, 1, true);
  saucerWall.translate(0, saucerH / 2, 0);
  parts.push(saucerWall);

  // Inner elevation ribs to keep pot bottom above drained runoff water
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const rib = new THREE.BoxGeometry(saucerInnerR * 1.5, 3, 3);
    rib.rotateY(angle);
    rib.translate(0, 3.5 + 1.5, 0);
    parts.push(rib);
  }

  const merged = mergeBufferGeometries(parts);
  for (const p of parts) p.dispose();

  if (exploded) {
    merged.translate(0, -30, 0);
  }

  return merged;
}

/**
 * Creates a combined print bed layout geometry with pot and accessories positioned side by side:
 * - Pot standing upright on its flat base (Y=0)
 * - Insert or saucer placed beside the pot on the print bed
 */
function createCombinedPrintBedGeometry(
  potGeom: THREE.BufferGeometry,
  insertGeom: THREE.BufferGeometry,
  saucerGeom: THREE.BufferGeometry,
  options: GeometricPlantPotOptions
): THREE.BufferGeometry {
  const potClone = potGeom.clone();
  potClone.computeBoundingBox();
  if (potClone.boundingBox) {
    potClone.translate(
      -potClone.boundingBox.getCenter(new THREE.Vector3()).x,
      -potClone.boundingBox.min.y,
      -potClone.boundingBox.getCenter(new THREE.Vector3()).z
    );
  }

  const geomsToMerge: THREE.BufferGeometry[] = [potClone];
  const maxR = Math.max(options.topDiameterMm, options.bottomDiameterMm) / 2;

  if (
    options.planterType === 'self_watering_insert' &&
    insertGeom.attributes['position'] &&
    insertGeom.attributes['position'].count > 0
  ) {
    const insertClone = createReservoirInsertGeometry(options, false);
    insertClone.computeBoundingBox();
    if (insertClone.boundingBox) {
      insertClone.translate(
        -insertClone.boundingBox.getCenter(new THREE.Vector3()).x,
        -insertClone.boundingBox.min.y,
        -insertClone.boundingBox.getCenter(new THREE.Vector3()).z
      );
      insertClone.translate(maxR * 2 + 25, 0, 0);
    }
    geomsToMerge.push(insertClone);
  } else if (
    options.planterType === 'drainage_with_saucer' &&
    saucerGeom.attributes['position'] &&
    saucerGeom.attributes['position'].count > 0
  ) {
    const saucerClone = createSaucerGeometry(options, false);
    saucerClone.computeBoundingBox();
    if (saucerClone.boundingBox) {
      saucerClone.translate(
        -saucerClone.boundingBox.getCenter(new THREE.Vector3()).x,
        -saucerClone.boundingBox.min.y,
        -saucerClone.boundingBox.getCenter(new THREE.Vector3()).z
      );
      saucerClone.translate(maxR * 2 + 25, 0, 0);
    }
    geomsToMerge.push(saucerClone);
  }

  const combined = mergeBufferGeometries(geomsToMerge);
  potClone.dispose();
  return combined;
}

/**
 * Generates separate and combined 3D BufferGeometries for the pot, insert, and saucer.
 */
export function generatePlanterGeometries(
  options: GeometricPlantPotOptions,
  exploded = false
): {
  potGeometry: THREE.BufferGeometry;
  insertGeometry: THREE.BufferGeometry;
  saucerGeometry: THREE.BufferGeometry;
  combinedGeometry: THREE.BufferGeometry;
} {
  const potGeometry = createOuterPotGeometry(options);
  const insertGeometry = createReservoirInsertGeometry(options, exploded);
  const saucerGeometry = createSaucerGeometry(options, exploded);
  const combinedGeometry = createCombinedPrintBedGeometry(
    potGeometry,
    insertGeometry,
    saucerGeometry,
    options
  );

  return {
    potGeometry,
    insertGeometry,
    saucerGeometry,
    combinedGeometry,
  };
}

/**
 * Calculates physical dimensions, reservoir volume, weight, and slicer recommendations.
 */
export function calculatePlanterMetrics(
  potGeom: THREE.BufferGeometry,
  insertGeom: THREE.BufferGeometry,
  saucerGeom: THREE.BufferGeometry,
  options: GeometricPlantPotOptions
): GeometricPlantPotMetrics {
  potGeom.computeBoundingBox();
  const box = potGeom.boundingBox || new THREE.Box3();
  const size = new THREE.Vector3();
  box.getSize(size);

  const pTris = potGeom.index
    ? potGeom.index.count / 3
    : potGeom.getAttribute('position').count / 3;
  const iTris =
    options.planterType === 'self_watering_insert' && insertGeom.getAttribute('position')
      ? insertGeom.index
        ? insertGeom.index.count / 3
        : insertGeom.getAttribute('position').count / 3
      : 0;
  const sTris =
    options.planterType === 'drainage_with_saucer' && saucerGeom.getAttribute('position')
      ? saucerGeom.index
        ? saucerGeom.index.count / 3
        : saucerGeom.getAttribute('position').count / 3
      : 0;

  const totalTris = Math.round(pTris + iTris + sTris);

  // Water reservoir capacity in milliliters (cm3)
  const reservoirH = 2.2; // cm
  const reservoirAvgR = ((options.bottomDiameterMm / 2 - options.wallThicknessMm) * 0.1); // cm
  const reservoirCapacityMl =
    options.planterType === 'self_watering_insert'
      ? Math.round(Math.PI * Math.pow(reservoirAvgR, 2) * reservoirH)
      : 0;

  // Approximate filament weight (g) (PLA/PETG ~1.25 g/cm3)
  const avgDiameter = (options.topDiameterMm + options.bottomDiameterMm) / 2;
  const approxWallVolume =
    Math.PI * avgDiameter * options.wallThicknessMm * options.heightMm +
    Math.PI * Math.pow(options.bottomDiameterMm / 2, 2) * 4;

  const estimatedGrams = Math.max(18, Math.round((approxWallVolume * 0.00125 * 0.5) * 10) / 10);
  const estimatedPrintTimeHours = Math.max(0.8, Math.round((estimatedGrams / 18 + 0.3) * 10) / 10);

  const slicerTips: string[] = [
    'Watertight Printing: Use at least 3-4 perimeter walls and increase flow rate to 102% to eliminate microscopic pinhole leaks.',
    'Bottom Solid Layers: Set 5 to 6 solid bottom layers for a fully water-sealed base.',
    'Infill: 20-25% gyroid or concentric infill avoids internal voids.',
    'Material: PETG is naturally water-resistant and UV-stable. If using PLA, spray interior with a food-safe sealant.',
  ];

  if (options.planterType === 'self_watering_insert') {
    slicerTips.push('Self-Watering: Thread standard 4-6mm cotton or braided wick cord through the basket bottom hole.');
  }

  return {
    outerDiameterMm: Math.round(Math.max(size.x, size.z) * 10) / 10,
    totalHeightMm: Math.round(size.y * 10) / 10,
    reservoirCapacityMl,
    potTriangleCount: Math.round(pTris),
    insertTriangleCount: Math.round(iTris),
    saucerTriangleCount: Math.round(sTris),
    totalTriangles: totalTris,
    estimatedGrams,
    estimatedPrintTimeHours,
    slicerTips,
  };
}

/**
 * Encodes BufferGeometry into a binary STL ArrayBuffer.
 */
export function exportPlanterSTL(geometry: THREE.BufferGeometry): ArrayBuffer {
  const index = geometry.getIndex();
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');

  const triangleCount = index ? index.count / 3 : position.count / 3;
  const bufferSize = 84 + triangleCount * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const dataView = new DataView(buffer);

  const header = 'PrivKnife Client-Side 3D Geometric Plant Pot Generator';
  for (let i = 0; i < 80; i++) {
    dataView.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
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
 * Encodes pot, insert, and saucer geometries into a multi-object Microsoft 3MF package.
 */
export async function exportPlanter3MF(
  potGeom: THREE.BufferGeometry,
  insertGeom: THREE.BufferGeometry,
  saucerGeom: THREE.BufferGeometry,
  options: GeometricPlantPotOptions
): Promise<Blob> {
  function serializeMeshXml(geom: THREE.BufferGeometry, id: number, name: string): string {
    const index = geom.getIndex();
    const pos = geom.getAttribute('position');
    if (!pos || pos.count === 0) return '';
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

  const potXml = serializeMeshXml(potGeom, 1, `Outer Planter (${options.aestheticStyle})`);
  const insertXml = options.planterType === 'self_watering_insert'
    ? serializeMeshXml(insertGeom, 2, 'Self-Watering Insert Basket')
    : '';
  const saucerXml = options.planterType === 'drainage_with_saucer'
    ? serializeMeshXml(saucerGeom, 3, 'Matching Drip Saucer')
    : '';

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">PrivKnife Geometric Planter (${options.aestheticStyle})</metadata>
  <metadata name="Application">PrivKnife Client-Side 3D Studio</metadata>
  <resources>
${potXml}${insertXml}${saucerXml}  </resources>
  <build>
    <item objectid="1" />
${options.planterType === 'self_watering_insert' ? '    <item objectid="2" transform="1 0 0 0 1 0 0 0 1 120 0 0" />\n' : ''}
${options.planterType === 'drainage_with_saucer' ? '    <item objectid="3" transform="1 0 0 0 1 0 0 0 1 120 0 0" />\n' : ''}  </build>
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
export async function processPlanter(
  options: GeometricPlantPotOptions,
  format: 'stl' | '3mf' = 'stl'
): Promise<GeometricPlantPotResult> {
  const validation = validatePlanterOptions(options);
  if (!validation.valid) {
    return {
      success: false,
      blob: new Blob([], { type: 'application/octet-stream' }),
      fileName: '',
      fileSize: 0,
      mimeType: 'application/octet-stream',
      metrics: {
        outerDiameterMm: 0,
        totalHeightMm: 0,
        reservoirCapacityMl: 0,
        potTriangleCount: 0,
        insertTriangleCount: 0,
        saucerTriangleCount: 0,
        totalTriangles: 0,
        estimatedGrams: 0,
        estimatedPrintTimeHours: 0,
        slicerTips: [],
      },
      error: validation.error,
    };
  }

  const { potGeometry, insertGeometry, saucerGeometry, combinedGeometry } =
    generatePlanterGeometries(options);
  const metrics = calculatePlanterMetrics(potGeometry, insertGeometry, saucerGeometry, options);

  const baseFileName = `geometric-planter-${options.aestheticStyle}-${options.topDiameterMm}mm`;

  let blob: Blob;
  let fileName: string;
  let mimeType: string;

  if (format === '3mf') {
    blob = await exportPlanter3MF(potGeometry, insertGeometry, saucerGeometry, options);
    fileName = `${baseFileName}.3mf`;
    mimeType = 'model/3mf';
  } else {
    const stlBuffer = exportPlanterSTL(combinedGeometry);
    blob = new Blob([stlBuffer], { type: 'model/stl' });
    fileName = `${baseFileName}.stl`;
    mimeType = 'model/stl';
  }

  potGeometry.dispose();
  insertGeometry.dispose();
  saucerGeometry.dispose();
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
