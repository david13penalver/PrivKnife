import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import JSZip from 'jszip';
import {
  KeycapExportFormat,
  KeycapMetrics,
  KeycapProfile,
  KeycapSwitchTesterMakerOptions,
  KeycapSwitchTesterMakerResult,
  KeyUnitSize,
} from './types';

// -------------------------------------------------------------
// 1. Validation & Dimensions
// -------------------------------------------------------------
export function validateKeycapOptions(options: KeycapSwitchTesterMakerOptions): {
  valid: boolean;
  error?: string;
} {
  if (!options) {
    return { valid: false, error: 'Options are required' };
  }

  if (
    typeof options.stemToleranceOffsetMm !== 'number' ||
    options.stemToleranceOffsetMm < 0.0 ||
    options.stemToleranceOffsetMm > 0.5
  ) {
    return { valid: false, error: 'Stem tolerance offset must be between 0.0 and 0.5 mm' };
  }

  if (
    typeof options.wallThicknessMm !== 'number' ||
    options.wallThicknessMm < 0.8 ||
    options.wallThicknessMm > 3.0
  ) {
    return { valid: false, error: 'Wall thickness must be between 0.8 and 3.0 mm' };
  }

  if (
    typeof options.dishDepthMm !== 'number' ||
    options.dishDepthMm < 0.1 ||
    options.dishDepthMm > 2.0
  ) {
    return { valid: false, error: 'Dish depth must be between 0.1 and 2.0 mm' };
  }

  if (
    typeof options.trayRows !== 'number' ||
    options.trayRows < 1 ||
    options.trayRows > 8
  ) {
    return { valid: false, error: 'Tray rows must be between 1 and 8' };
  }

  if (
    typeof options.trayCols !== 'number' ||
    options.trayCols < 1 ||
    options.trayCols > 8
  ) {
    return { valid: false, error: 'Tray columns must be between 1 and 8' };
  }

  if (
    typeof options.trayTiltAngleDeg !== 'number' ||
    options.trayTiltAngleDeg < 0 ||
    options.trayTiltAngleDeg > 30
  ) {
    return { valid: false, error: 'Tray tilt angle must be between 0 and 30 degrees' };
  }

  if (options.legendText && options.legendText.length > 15) {
    return { valid: false, error: 'Legend text length cannot exceed 15 characters' };
  }

  return { valid: true };
}

export interface KeycapDimensions {
  baseWidthMm: number;
  baseDepthMm: number;
  topWidthMm: number;
  topDepthMm: number;
  heightMm: number;
  tiltAngleDeg: number;
  stabilizerOffsetMm: number;
}

export function getKeycapDimensions(
  profile: KeycapProfile,
  unitSize: KeyUnitSize
): KeycapDimensions {
  const UNIT_WIDTHS: Record<KeyUnitSize, number> = {
    '1u': 18.0,
    '1.25u': 22.8,
    '1.75u': 32.3,
    '2u': 37.1,
    '2.25u': 41.8,
    '6.25u': 118.0,
  };

  const baseWidthMm = UNIT_WIDTHS[unitSize] || 18.0;
  const baseDepthMm = 18.0;

  // Profile-specific characteristics
  let heightMm = 9.4;
  let topDelta = 5.6; // difference between base and top
  let tiltAngleDeg = 4.0;

  switch (profile) {
    case 'cherry':
      heightMm = 9.4;
      topDelta = 5.6;
      tiltAngleDeg = 4.0;
      break;
    case 'oem':
      heightMm = 11.5;
      topDelta = 5.8;
      tiltAngleDeg = 6.0;
      break;
    case 'dsa':
      heightMm = 7.4;
      topDelta = 5.4;
      tiltAngleDeg = 0.0;
      break;
    case 'xda':
      heightMm = 9.1;
      topDelta = 4.6;
      tiltAngleDeg = 0.0;
      break;
    case 'sa':
      heightMm = 13.0;
      topDelta = 5.5;
      tiltAngleDeg = 8.0;
      break;
  }

  const topWidthMm = Math.max(10.0, baseWidthMm - topDelta);
  const topDepthMm = Math.max(10.0, baseDepthMm - topDelta);

  let stabilizerOffsetMm = 0;
  if (unitSize === '2u' || unitSize === '2.25u') {
    stabilizerOffsetMm = 11.9; // 23.8mm center-to-center standard
  } else if (unitSize === '6.25u') {
    stabilizerOffsetMm = 50.0; // 100mm center-to-center standard
  }

  return {
    baseWidthMm,
    baseDepthMm,
    topWidthMm,
    topDepthMm,
    heightMm,
    tiltAngleDeg,
    stabilizerOffsetMm,
  };
}

/**
 * Safely merges BufferGeometries by normalizing them to non-indexed position + normal buffers.
 */
export function safeMergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const valid = geometries.filter(
    (g) => g && g.getAttribute('position') && g.getAttribute('position').count > 0
  );
  if (valid.length === 0) return new THREE.BufferGeometry();
  if (valid.length === 1) return valid[0].clone();

  const standardized: THREE.BufferGeometry[] = [];
  for (const g of valid) {
    const nonIndexed = g.index ? g.toNonIndexed() : g.clone();
    const clean = new THREE.BufferGeometry();
    clean.setAttribute('position', nonIndexed.getAttribute('position'));
    if (nonIndexed.getAttribute('normal')) {
      clean.setAttribute('normal', nonIndexed.getAttribute('normal'));
    } else {
      clean.computeVertexNormals();
    }
    nonIndexed.dispose();
    standardized.push(clean);
  }

  const merged = BufferGeometryUtils.mergeGeometries(standardized, false);
  standardized.forEach((s) => s.dispose());
  return merged || new THREE.BufferGeometry();
}

// -------------------------------------------------------------
// 2. Vector Typography for Keycap Legends
// -------------------------------------------------------------
const FONT_GLYPHS: Record<string, number[][][]> = {
  A: [[[0, 0], [0.5, 1]], [[0.5, 1], [1, 0]], [[0.2, 0.4], [0.8, 0.4]]],
  B: [[[0, 0], [0, 1]], [[0, 1], [0.7, 1]], [[0.7, 1], [0.7, 0.55]], [[0.7, 0.55], [0, 0.55]], [[0, 0.55], [0.8, 0.55]], [[0.8, 0.55], [0.8, 0]], [[0.8, 0], [0, 0]]],
  C: [[[1, 0.85], [0.3, 1]], [[0.3, 1], [0, 0.7]], [[0, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]], [[0.3, 0], [1, 0.15]]],
  D: [[[0, 0], [0, 1]], [[0, 1], [0.6, 1]], [[0.6, 1], [1, 0.7]], [[1, 0.7], [1, 0.3]], [[1, 0.3], [0.6, 0]], [[0.6, 0], [0, 0]]],
  E: [[[0, 0], [0, 1]], [[0, 1], [0.9, 1]], [[0, 0.5], [0.7, 0.5]], [[0, 0], [0.9, 0]]],
  F: [[[0, 0], [0, 1]], [[0, 1], [0.9, 1]], [[0, 0.5], [0.7, 0.5]]],
  G: [[[1, 0.85], [0.3, 1]], [[0.3, 1], [0, 0.7]], [[0, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]], [[0.3, 0], [0.9, 0]], [[0.9, 0], [0.9, 0.5]], [[0.9, 0.5], [0.5, 0.5]]],
  H: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]],
  I: [[[0.5, 0], [0.5, 1]], [[0.2, 1], [0.8, 1]], [[0.2, 0], [0.8, 0]]],
  J: [[[0.8, 1], [0.8, 0.3]], [[0.8, 0.3], [0.5, 0]], [[0.5, 0], [0.2, 0.2]], [[0.2, 0.2], [0.2, 0.4]]],
  K: [[[0, 0], [0, 1]], [[0, 0.45], [0.9, 1]], [[0.2, 0.55], [0.9, 0]]],
  L: [[[0, 1], [0, 0]], [[0, 0], [0.8, 0]]],
  M: [[[0, 0], [0, 1]], [[0, 1], [0.5, 0.3]], [[0.5, 0.3], [1, 1]], [[1, 1], [1, 0]]],
  N: [[[0, 0], [0, 1]], [[0, 1], [1, 0]], [[1, 0], [1, 1]]],
  O: [[[0.3, 0], [0.7, 0]], [[0.7, 0], [1, 0.3]], [[1, 0.3], [1, 0.7]], [[1, 0.7], [0.7, 1]], [[0.7, 1], [0.3, 1]], [[0.3, 1], [0, 0.7]], [[0, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]]],
  P: [[[0, 0], [0, 1]], [[0, 1], [0.8, 1]], [[0.8, 1], [0.8, 0.5]], [[0.8, 0.5], [0, 0.5]]],
  Q: [[[0.3, 0], [0.7, 0]], [[0.7, 0], [1, 0.3]], [[1, 0.3], [1, 0.7]], [[1, 0.7], [0.7, 1]], [[0.7, 1], [0.3, 1]], [[0.3, 1], [0, 0.7]], [[0, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]], [[0.6, 0.3], [1, -0.1]]],
  R: [[[0, 0], [0, 1]], [[0, 1], [0.8, 1]], [[0.8, 1], [0.8, 0.55]], [[0.8, 0.55], [0, 0.55]], [[0.3, 0.55], [0.9, 0]]],
  S: [[[0.9, 0.85], [0.3, 1]], [[0.3, 1], [0, 0.75]], [[0, 0.75], [0.8, 0.5]], [[0.8, 0.5], [1, 0.25]], [[1, 0.25], [0.7, 0]], [[0.7, 0], [0.1, 0.15]]],
  T: [[[0.5, 0], [0.5, 1]], [[0, 1], [1, 1]]],
  U: [[[0, 1], [0, 0.3]], [[0, 0.3], [0.3, 0]], [[0.3, 0], [0.7, 0]], [[0.7, 0], [1, 0.3]], [[1, 0.3], [1, 1]]],
  V: [[[0, 1], [0.5, 0]], [[0.5, 0], [1, 1]]],
  W: [[[0, 1], [0.25, 0]], [[0.25, 0], [0.5, 0.7]], [[0.5, 0.7], [0.75, 0]], [[0.75, 0], [1, 1]]],
  X: [[[0, 0], [1, 1]], [[0, 1], [1, 0]]],
  Y: [[[0, 1], [0.5, 0.5]], [[1, 1], [0.5, 0.5]], [[0.5, 0.5], [0.5, 0]]],
  Z: [[[0, 1], [1, 1]], [[1, 1], [0, 0]], [[0, 0], [1, 0]]],
  '0': [[[0.3, 0], [0.7, 0]], [[0.7, 0], [1, 0.3]], [[1, 0.3], [1, 0.7]], [[1, 0.7], [0.7, 1]], [[0.7, 1], [0.3, 1]], [[0.3, 1], [0, 0.7]], [[0, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]]],
  '1': [[[0.3, 0.8], [0.5, 1]], [[0.5, 1], [0.5, 0]]],
  '2': [[[0.1, 0.8], [0.5, 1]], [[0.5, 1], [0.9, 0.7]], [[0.9, 0.7], [0, 0]], [[0, 0], [1, 0]]],
  '3': [[[0, 0.85], [0.5, 1]], [[0.5, 1], [0.9, 0.75]], [[0.9, 0.75], [0.4, 0.5]], [[0.4, 0.5], [0.9, 0.25]], [[0.9, 0.25], [0.5, 0]]],
  '4': [[[0.8, 0], [0.8, 1]], [[0.8, 1], [0, 0.35]], [[0, 0.35], [1, 0.35]]],
  '5': [[[0.9, 1], [0.1, 1]], [[0.1, 1], [0.1, 0.55]], [[0.1, 0.55], [0.7, 0.55]], [[0.7, 0.55], [0.9, 0.3]], [[0.9, 0.3], [0.6, 0]], [[0.6, 0], [0.1, 0]]],
  '6': [[[0.8, 0.9], [0.3, 0.7]], [[0.3, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]], [[0.3, 0], [0.7, 0]], [[0.7, 0], [0.9, 0.25]], [[0.9, 0.25], [0.7, 0.5]], [[0.7, 0.5], [0.1, 0.5]]],
  '7': [[[0, 1], [1, 1]], [[1, 1], [0.35, 0]]],
  '8': [[[0.3, 1], [0.7, 1]], [[0.7, 1], [0.9, 0.75]], [[0.9, 0.75], [0.5, 0.5]], [[0.5, 0.5], [0.9, 0.25]], [[0.9, 0.25], [0.7, 0]], [[0.7, 0], [0.3, 0]], [[0.3, 0], [0.1, 0.25]], [[0.1, 0.25], [0.5, 0.5]], [[0.5, 0.5], [0.1, 0.75]], [[0.1, 0.75], [0.3, 1]]],
  '9': [[[0.2, 0.1], [0.7, 0.3]], [[0.7, 0.3], [1, 0.7]], [[1, 0.7], [0.7, 1]], [[0.7, 1], [0.3, 1]], [[0.3, 1], [0.1, 0.75]], [[0.1, 0.75], [0.3, 0.5]], [[0.3, 0.5], [0.9, 0.5]]],
  '-': [[[0.2, 0.5], [0.8, 0.5]]],
  '+': [[[0.5, 0.2], [0.5, 0.8]], [[0.2, 0.5], [0.8, 0.5]]],
};

function createLegendGeometry(
  text: string,
  charHeightMm: number,
  raiseMm: number,
  strokeWidthMm: number
): THREE.BufferGeometry | null {
  const clean = text.toUpperCase().trim();
  if (!clean) return null;

  const charWidthMm = charHeightMm * 0.65;
  const charSpacing = charWidthMm * 0.25;
  const geometries: THREE.BufferGeometry[] = [];

  const totalWidth = clean.length * charWidthMm + (clean.length - 1) * charSpacing;
  let startX = -totalWidth / 2;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === ' ') {
      startX += charWidthMm + charSpacing;
      continue;
    }

    const strokes = FONT_GLYPHS[char];
    if (strokes) {
      for (const stroke of strokes) {
        const [p1, p2] = stroke;
        const x1 = startX + p1[0] * charWidthMm;
        const y1 = p1[1] * charHeightMm - charHeightMm / 2;
        const x2 = startX + p2[0] * charWidthMm;
        const y2 = p2[1] * charHeightMm - charHeightMm / 2;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.001) continue;

        const angle = Math.atan2(dy, dx);
        const halfThick = strokeWidthMm / 2;

        const rectShape = new THREE.Shape();
        rectShape.moveTo(-halfThick, -halfThick);
        rectShape.lineTo(len + halfThick, -halfThick);
        rectShape.lineTo(len + halfThick, halfThick);
        rectShape.lineTo(-halfThick, halfThick);
        rectShape.closePath();

        const extrudeGeom = new THREE.ExtrudeGeometry(rectShape, {
          depth: raiseMm,
          bevelEnabled: false,
        });

        extrudeGeom.rotateZ(angle);
        extrudeGeom.translate(x1, y1, 0);
        geometries.push(extrudeGeom);
      }
    }

    startX += charWidthMm + charSpacing;
  }

  if (geometries.length === 0) return null;
  const merged = safeMergeGeometries(geometries);
  geometries.forEach((g) => g.dispose());
  return merged;
}

// -------------------------------------------------------------
// 3. 3D Keycap Procedural Generation
// -------------------------------------------------------------
export interface KeycapMeshResult {
  shellGeometry: THREE.BufferGeometry;
  stemGeometry: THREE.BufferGeometry;
  legendGeometry: THREE.BufferGeometry;
  metrics: KeycapMetrics;
}

/**
 * Builds an MX-compatible cross stem post with cruciform cutout.
 */
function buildMxStemGeometry(
  heightMm: number,
  toleranceOffsetMm: number
): THREE.BufferGeometry {
  const outerRadius = 2.75; // 5.5mm outer cylinder diameter
  const crossSpan = 4.10 + toleranceOffsetMm;
  const crossThick = 1.17 + toleranceOffsetMm;

  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);

  const hs = crossSpan / 2;
  const ht = crossThick / 2;

  // 12 vertices of cruciform hole in clockwise direction (to subtract from CCW circle)
  const hole = new THREE.Path();
  hole.moveTo(ht, hs);
  hole.lineTo(ht, ht);
  hole.lineTo(hs, ht);
  hole.lineTo(hs, -ht);
  hole.lineTo(ht, -ht);
  hole.lineTo(ht, -hs);
  hole.lineTo(-ht, -hs);
  hole.lineTo(-ht, -ht);
  hole.lineTo(-hs, -ht);
  hole.lineTo(-hs, ht);
  hole.lineTo(-ht, ht);
  hole.lineTo(-ht, hs);
  hole.closePath();

  shape.holes.push(hole);

  const extrudeGeom = new THREE.ExtrudeGeometry(shape, {
    depth: heightMm,
    bevelEnabled: false,
    curveSegments: 24,
  });

  return extrudeGeom;
}

export function generateKeycapMesh(
  options: KeycapSwitchTesterMakerOptions
): KeycapMeshResult {
  const dim = getKeycapDimensions(options.keycapProfile, options.keyUnitSize);
  const bw = dim.baseWidthMm;
  const bd = dim.baseDepthMm;
  const tw = dim.topWidthMm;
  const td = dim.topDepthMm;
  const h = dim.heightMm;
  const wall = options.wallThicknessMm;

  // --- 1. Keycap Shell Geometry ---
  // Create outer trapezoidal pyramid frustum using custom buffer geometry
  const halfBw = bw / 2;
  const halfBd = bd / 2;
  const halfTw = tw / 2;
  const halfTd = td / 2;
  const tiltRad = (dim.tiltAngleDeg * Math.PI) / 180;
  const dishDepth = options.dishDepthMm;

  // Inner cavity (hollow underside)
  const inHalfBw = Math.max(1.0, halfBw - wall);
  const inHalfBd = Math.max(1.0, halfBd - wall);
  const inHalfTw = Math.max(1.0, halfTw - wall);
  const inHalfTd = Math.max(1.0, halfTd - wall);
  const inH = Math.max(2.0, h - wall);

  const positions: number[] = [];

  function addQuad(
    v1: [number, number, number],
    v2: [number, number, number],
    v3: [number, number, number],
    v4: [number, number, number]
  ) {
    // Triangle 1: v1, v2, v3
    positions.push(...v1, ...v2, ...v3);
    // Triangle 2: v1, v3, v4
    positions.push(...v1, ...v3, ...v4);
  }

  // Top surface grid with concave dish and profile tilt
  const gridN = 8;
  const grid: [number, number, number][][] = [];
  for (let i = 0; i <= gridN; i++) {
    grid[i] = [];
    const u = i / gridN;
    const x = -halfTw + u * tw;
    for (let j = 0; j <= gridN; j++) {
      const vCoord = j / gridN;
      const y = -halfTd + vCoord * td;
      const zTilt = y * Math.tan(tiltRad);
      const nx = x / (halfTw || 1);
      const ny = y / (halfTd || 1);
      const rSq = nx * nx + ny * ny;
      const zDish = -dishDepth * Math.max(0, 1 - rSq);
      const z = h + zTilt + zDish;
      grid[i][j] = [x, y, z];
    }
  }

  // Add top grid surface
  for (let i = 0; i < gridN; i++) {
    for (let j = 0; j < gridN; j++) {
      addQuad(grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]);
    }
  }

  // Outer base vertices
  const outerBase: [number, number, number][] = [
    [-halfBw, -halfBd, 0],
    [halfBw, -halfBd, 0],
    [halfBw, halfBd, 0],
    [-halfBw, halfBd, 0],
  ];

  // Outer side walls connecting base to top grid perimeter
  for (let i = 0; i < gridN; i++) {
    const b1: [number, number, number] = [-halfBw + (i / gridN) * bw, -halfBd, 0];
    const b2: [number, number, number] = [-halfBw + ((i + 1) / gridN) * bw, -halfBd, 0];
    addQuad(b1, b2, grid[i + 1][0], grid[i][0]);
  }
  for (let j = 0; j < gridN; j++) {
    const b1: [number, number, number] = [halfBw, -halfBd + (j / gridN) * bd, 0];
    const b2: [number, number, number] = [halfBw, -halfBd + ((j + 1) / gridN) * bd, 0];
    addQuad(b1, b2, grid[gridN][j + 1], grid[gridN][j]);
  }
  for (let i = gridN - 1; i >= 0; i--) {
    const b1: [number, number, number] = [-halfBw + ((i + 1) / gridN) * bw, halfBd, 0];
    const b2: [number, number, number] = [-halfBw + (i / gridN) * bw, halfBd, 0];
    addQuad(b1, b2, grid[i][gridN], grid[i + 1][gridN]);
  }
  for (let j = gridN - 1; j >= 0; j--) {
    const b1: [number, number, number] = [-halfBw, -halfBd + ((j + 1) / gridN) * bd, 0];
    const b2: [number, number, number] = [-halfBw, -halfBd + (j / gridN) * bd, 0];
    addQuad(b1, b2, grid[0][j], grid[0][j + 1]);
  }

  // Inner cavity vertices
  const inBase: [number, number, number][] = [
    [-inHalfBw, -inHalfBd, 0],
    [inHalfBw, -inHalfBd, 0],
    [inHalfBw, inHalfBd, 0],
    [-inHalfBw, inHalfBd, 0],
  ];
  const inTop: [number, number, number][] = [
    [-inHalfTw, -inHalfTd, inH],
    [inHalfTw, -inHalfTd, inH],
    [inHalfTw, inHalfTd, inH],
    [-inHalfTw, inHalfTd, inH],
  ];

  // Bottom rim connecting outer to inner base
  addQuad(outerBase[0], inBase[0], inBase[1], outerBase[1]);
  addQuad(outerBase[1], inBase[1], inBase[2], outerBase[2]);
  addQuad(outerBase[2], inBase[2], inBase[3], outerBase[3]);
  addQuad(outerBase[3], inBase[3], inBase[0], outerBase[0]);

  // Inner cavity sides (inverted winding)
  addQuad(inBase[0], inTop[0], inTop[1], inBase[1]);
  addQuad(inBase[1], inTop[1], inTop[2], inBase[2]);
  addQuad(inBase[2], inTop[2], inTop[3], inBase[3]);
  addQuad(inBase[3], inTop[3], inTop[0], inBase[0]);
  addQuad(inTop[0], inTop[3], inTop[2], inTop[1]); // inner ceiling

  const shellGeom = new THREE.BufferGeometry();
  shellGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  shellGeom.computeVertexNormals();

  // --- 2. MX Stem & Stabilizer Posts ---
  const stemGeometries: THREE.BufferGeometry[] = [];
  const stemHeight = Math.max(3.5, inH);

  // Center stem
  const centerStem = buildMxStemGeometry(stemHeight, options.stemToleranceOffsetMm);
  stemGeometries.push(centerStem);

  // Stabilizer stems for 2u, 2.25u, 6.25u
  if (dim.stabilizerOffsetMm > 0) {
    const leftStab = buildMxStemGeometry(stemHeight, options.stemToleranceOffsetMm);
    leftStab.translate(-dim.stabilizerOffsetMm, 0, 0);
    stemGeometries.push(leftStab);

    const rightStab = buildMxStemGeometry(stemHeight, options.stemToleranceOffsetMm);
    rightStab.translate(dim.stabilizerOffsetMm, 0, 0);
    stemGeometries.push(rightStab);
  }

  const stemGeometry = safeMergeGeometries(stemGeometries);
  stemGeometries.forEach((g) => g.dispose());

  // --- 3. Legend Geometry ---
  let legendGeometry: THREE.BufferGeometry;
  const hasLegend =
    options.legendStyle !== 'blank' &&
    options.legendText &&
    options.legendText.trim().length > 0;

  if (hasLegend) {
    const charHeight = Math.min(6.5, td * 0.45);
    const strokeWidth = charHeight * 0.2;
    const isMultiColor = options.legendStyle === 'inlaid_multicolor';
    const raise = isMultiColor ? 0.6 : 0.4;
    const textGeom = createLegendGeometry(options.legendText, charHeight, raise, strokeWidth);

    if (textGeom) {
      if (isMultiColor) {
        textGeom.translate(0, 0, h - raise);
      } else {
        textGeom.translate(0, 0, h);
      }
      textGeom.rotateX(tiltRad);
      legendGeometry = textGeom;
    } else {
      legendGeometry = new THREE.BufferGeometry();
    }
  } else {
    legendGeometry = new THREE.BufferGeometry();
  }

  // --- 4. Metrics & Tips ---
  const shellPos = shellGeom.getAttribute('position');
  const shellTriangles = shellPos ? shellPos.count / 3 : 0;

  const stemPos = stemGeometry.getAttribute('position');
  const stemTriangles = stemPos ? stemPos.count / 3 : 0;

  const legPos = legendGeometry.getAttribute('position');
  const legendTriangles = legPos ? legPos.count / 3 : 0;

  const totalTriangles = Math.round(shellTriangles + stemTriangles + legendTriangles);

  // Grams estimation
  const approxVolumeCm3 = (bw * bd * h * 0.001) * 0.35;
  const estimatedGrams = Math.max(1.0, Math.round(approxVolumeCm3 * 1.25 * 10) / 10);
  const estimatedPrintTimeHours = Math.max(0.3, Math.round((estimatedGrams / 8 + 0.15) * 10) / 10);

  const slicerTips = [
    'Orientation: Print keycap tilted 45° backward with tree supports for optimal stem accuracy and smooth top layer finish.',
    'Layer Height: 0.12mm (or 0.08mm) fine layer height is strongly recommended for crisp legend and stem fit.',
    'Stem Fit: If cross stem is too tight on switch, increase "Stem Tolerance Offset" by +0.05mm.',
    options.legendStyle === 'inlaid_multicolor'
      ? 'Multi-Color 3MF: In Bambu Studio or PrusaSlicer, assign contrasting filament color to Object 3 (Legend).'
      : 'Embossed Legend: Highlights tactile character geometry without needing multi-material hardware.',
  ];

  return {
    shellGeometry: shellGeom,
    stemGeometry,
    legendGeometry,
    metrics: {
      widthMm: bw,
      depthMm: bd,
      heightMm: h,
      shellTriangles: Math.round(shellTriangles),
      stemTriangles: Math.round(stemTriangles),
      legendTriangles: Math.round(legendTriangles),
      totalTriangles,
      estimatedGrams,
      estimatedPrintTimeHours,
      slicerTips,
    },
  };
}

// -------------------------------------------------------------
// 4. 3D Switch Tester Tray Generation
// -------------------------------------------------------------
export interface SwitchTesterMeshResult {
  trayGeometry: THREE.BufferGeometry;
  metrics: KeycapMetrics;
}

export function generateSwitchTesterMesh(
  options: KeycapSwitchTesterMakerOptions
): SwitchTesterMeshResult {
  const rows = options.trayRows;
  const cols = options.trayCols;
  const pitch = 19.05; // Standard keyboard switch pitch
  const cutoutSize = 14.0; // Standard 14mm MX plate cutout
  const margin = 8.0;

  const widthMm = cols * pitch + margin * 2;
  const depthMm = rows * pitch + margin * 2;
  const baseHeightMm = 6.0;
  const tiltRad = (options.trayTiltAngleDeg * Math.PI) / 180;
  const extraBackHeight = depthMm * Math.tan(tiltRad);
  const totalHeightMm = Math.round((baseHeightMm + extraBackHeight) * 10) / 10;

  // Build tray base shapes with rounded corners
  const rad = 4.0;
  const halfW = widthMm / 2;
  const halfD = depthMm / 2;

  function createRoundedOuterShape(): THREE.Shape {
    const s = new THREE.Shape();
    s.moveTo(-halfW + rad, -halfD);
    s.lineTo(halfW - rad, -halfD);
    s.absarc(halfW - rad, -halfD + rad, rad, -Math.PI / 2, 0, false);
    s.lineTo(halfW, halfD - rad);
    s.absarc(halfW - rad, halfD - rad, rad, 0, Math.PI / 2, false);
    s.lineTo(-halfW + rad, halfD);
    s.absarc(-halfW + rad, halfD - rad, rad, Math.PI / 2, Math.PI, false);
    s.lineTo(-halfW, -halfD + rad);
    s.absarc(-halfW + rad, -halfD + rad, rad, Math.PI, (3 * Math.PI) / 2, false);
    s.closePath();
    return s;
  }

  const upperShape = createRoundedOuterShape();
  const lowerShape = createRoundedOuterShape();

  // Grid holes:
  // Upper: 14mm x 14mm plate cutout
  // Lower: 15.6mm x 15.6mm switch body clearance cavity
  const gridStartX = -((cols - 1) * pitch) / 2;
  const gridStartY = ((rows - 1) * pitch) / 2;
  const cutout14 = 14.0;
  const cutout156 = 15.6;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = gridStartX + c * pitch;
      const cy = gridStartY - r * pitch;

      // 14mm hole for upper plate
      const h14 = new THREE.Path();
      h14.moveTo(cx - cutout14 / 2, cy - cutout14 / 2);
      h14.lineTo(cx + cutout14 / 2, cy - cutout14 / 2);
      h14.lineTo(cx + cutout14 / 2, cy + cutout14 / 2);
      h14.lineTo(cx - cutout14 / 2, cy + cutout14 / 2);
      h14.closePath();
      upperShape.holes.push(h14);

      // 15.6mm hole for lower cavity
      const h156 = new THREE.Path();
      h156.moveTo(cx - cutout156 / 2, cy - cutout156 / 2);
      h156.lineTo(cx + cutout156 / 2, cy - cutout156 / 2);
      h156.lineTo(cx + cutout156 / 2, cy + cutout156 / 2);
      h156.lineTo(cx - cutout156 / 2, cy + cutout156 / 2);
      h156.closePath();
      lowerShape.holes.push(h156);
    }
  }

  const lowerExtrude = new THREE.ExtrudeGeometry(lowerShape, {
    depth: 1,
    bevelEnabled: false,
  });
  const upperExtrude = new THREE.ExtrudeGeometry(upperShape, {
    depth: 1,
    bevelEnabled: false,
  });

  // Shear Z so bottom rests flat on z=0 and top is inclined with 1.5mm snap lip
  const posLower = lowerExtrude.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < posLower.count; i++) {
    const y = posLower.getY(i);
    const z = posLower.getZ(i);
    const zTopY = baseHeightMm + (y + halfD) * Math.tan(tiltRad);
    const zLip = Math.max(1.5, zTopY - 1.5);
    posLower.setZ(i, z * zLip);
  }
  lowerExtrude.computeVertexNormals();

  const posUpper = upperExtrude.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < posUpper.count; i++) {
    const y = posUpper.getY(i);
    const z = posUpper.getZ(i);
    const zTopY = baseHeightMm + (y + halfD) * Math.tan(tiltRad);
    const zLip = Math.max(1.5, zTopY - 1.5);
    posUpper.setZ(i, zLip + z * (zTopY - zLip));
  }
  upperExtrude.computeVertexNormals();

  const trayExtrude = safeMergeGeometries([lowerExtrude, upperExtrude]);
  lowerExtrude.dispose();
  upperExtrude.dispose();

  const pos = trayExtrude.getAttribute('position');
  const totalTriangles = pos ? Math.round(pos.count / 3) : 0;

  const volumeCm3 = (widthMm * depthMm * baseHeightMm * 0.001) * 0.7;
  const estimatedGrams = Math.max(8, Math.round(volumeCm3 * 1.25 * 10) / 10);
  const estimatedPrintTimeHours = Math.max(0.6, Math.round((estimatedGrams / 18 + 0.3) * 10) / 10);

  const slicerTips = [
    'Switch Cutouts: Dimensioned at standard 14mm (14.0mm) with 1.5mm plate lip for standard MX snap-in switches (Cherry, Gateron, Kailh).',
    'Nozzle & Infill: 0.20mm standard layer height with 15-20% gyroid infill produces a rock-solid acoustic base.',
    'Rubber Feet: Stick 6mm to 8mm silicone dome bump-ons to the 4 underside corners to prevent desk sliding.',
  ];

  return {
    trayGeometry: trayExtrude,
    metrics: {
      widthMm,
      depthMm,
      heightMm: totalHeightMm,
      shellTriangles: totalTriangles,
      stemTriangles: 0,
      legendTriangles: 0,
      totalTriangles,
      estimatedGrams,
      estimatedPrintTimeHours,
      slicerTips,
    },
  };
}

// -------------------------------------------------------------
// 5. Binary STL and 3MF Serialization
// -------------------------------------------------------------
export function exportKeycapSTL(geometry: THREE.BufferGeometry): ArrayBuffer {
  const index = geometry.getIndex();
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');

  const triangleCount = index ? index.count / 3 : position.count / 3;
  const bufferSize = 84 + triangleCount * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const dataView = new DataView(buffer);

  const header = 'PrivKnife Client-Side Custom Mechanical Keycap & Switch Tester Maker';
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

export async function exportKeycap3MF(
  shellGeom: THREE.BufferGeometry,
  stemGeom: THREE.BufferGeometry,
  legendGeom: THREE.BufferGeometry,
  options: KeycapSwitchTesterMakerOptions
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

  let objectsXml = '';
  let buildItemsXml = '';

  if (options.itemType === 'switch_tester_tray') {
    objectsXml += serializeMeshXml(shellGeom, 1, `Switch Tester Tray (${options.trayRows}x${options.trayCols})`);
    buildItemsXml += `    <item objectid="1" />\n`;
  } else {
    objectsXml += serializeMeshXml(shellGeom, 1, `Keycap Shell (${options.keycapProfile.toUpperCase()} ${options.keyUnitSize})`);
    buildItemsXml += `    <item objectid="1" />\n`;

    if (stemGeom.getAttribute('position')) {
      objectsXml += serializeMeshXml(stemGeom, 2, 'MX Cross Stem Post');
      buildItemsXml += `    <item objectid="2" />\n`;
    }

    if (legendGeom.getAttribute('position')) {
      objectsXml += serializeMeshXml(legendGeom, 3, `Keycap Legend (${options.legendText})`);
      buildItemsXml += `    <item objectid="3" />\n`;
    }
  }

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">Mechanical Keycap / Tester - PrivKnife</metadata>
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
export async function processKeycap(
  options: KeycapSwitchTesterMakerOptions,
  format: KeycapExportFormat = '3mf_multicolor'
): Promise<KeycapSwitchTesterMakerResult> {
  const validation = validateKeycapOptions(options);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid options');
  }

  if (options.itemType === 'switch_tester_tray') {
    const { trayGeometry, metrics } = generateSwitchTesterMesh(options);
    const fileNameBase = `switch-tester-${options.trayRows}x${options.trayCols}`;

    try {
      if (format === '3mf_multicolor') {
        const dummyStem = new THREE.BufferGeometry();
        const dummyLegend = new THREE.BufferGeometry();
        const blob = await exportKeycap3MF(trayGeometry, dummyStem, dummyLegend, options);
        return {
          success: true,
          blob,
          fileName: `${fileNameBase}.3mf`,
          fileSize: blob.size,
          mimeType: 'model/3mf',
          metrics,
        };
      } else {
        const stlBuffer = exportKeycapSTL(trayGeometry);
        const blob = new Blob([stlBuffer], { type: 'model/stl' });
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
      trayGeometry.dispose();
    }
  } else {
    const { shellGeometry, stemGeometry, legendGeometry, metrics } = generateKeycapMesh(options);
    const textSlug = options.legendText
      ? options.legendText.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      : 'blank';
    const fileNameBase = `keycap-${options.keycapProfile}-${options.keyUnitSize}-${textSlug}`;

    try {
      if (format === '3mf_multicolor') {
        const blob = await exportKeycap3MF(shellGeometry, stemGeometry, legendGeometry, options);
        return {
          success: true,
          blob,
          fileName: `${fileNameBase}.3mf`,
          fileSize: blob.size,
          mimeType: 'model/3mf',
          metrics,
        };
      } else {
        const geomsToMerge = [shellGeometry];
        if (stemGeometry.getAttribute('position')) geomsToMerge.push(stemGeometry);
        if (legendGeometry.getAttribute('position')) geomsToMerge.push(legendGeometry);

        const merged = safeMergeGeometries(geomsToMerge);
        const stlBuffer = exportKeycapSTL(merged);
        merged.dispose();

        const blob = new Blob([stlBuffer], { type: 'model/stl' });
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
      shellGeometry.dispose();
      stemGeometry.dispose();
      legendGeometry.dispose();
    }
  }
}
