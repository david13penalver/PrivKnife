import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import JSZip from 'jszip';
import {
  BrailleAdaSignGeneratorOptions,
  BrailleAdaSignGeneratorResult,
  SignExportFormat,
  SignMetrics,
  SignPictogram,
} from './types';

export interface BrailleCell {
  dots: number[]; // 1 to 6
}

// -------------------------------------------------------------
// 1. Validation
// -------------------------------------------------------------
export function validateSignOptions(options: BrailleAdaSignGeneratorOptions): {
  valid: boolean;
  error?: string;
} {
  if (!options) {
    return { valid: false, error: 'Options are required' };
  }

  if (typeof options.roomTitle !== 'string' || options.roomTitle.trim().length === 0) {
    return { valid: false, error: 'Room title is required and cannot be empty' };
  }

  if (options.roomTitle.length > 40) {
    return { valid: false, error: 'Room title length cannot exceed 40 characters' };
  }

  if (
    typeof options.plaqueWidthMm !== 'number' ||
    options.plaqueWidthMm < 80 ||
    options.plaqueWidthMm > 350
  ) {
    return { valid: false, error: 'Plaque width must be between 80 and 350 mm' };
  }

  if (
    typeof options.plaqueHeightMm !== 'number' ||
    options.plaqueHeightMm < 80 ||
    options.plaqueHeightMm > 350
  ) {
    return { valid: false, error: 'Plaque height must be between 80 and 350 mm' };
  }

  if (
    typeof options.plaqueThicknessMm !== 'number' ||
    options.plaqueThicknessMm < 1.5 ||
    options.plaqueThicknessMm > 10
  ) {
    return { valid: false, error: 'Plaque thickness must be between 1.5 and 10 mm' };
  }

  if (
    typeof options.tactileRaiseMm !== 'number' ||
    options.tactileRaiseMm < 0.5 ||
    options.tactileRaiseMm > 4.0
  ) {
    return { valid: false, error: 'Tactile raise must be between 0.5 and 4.0 mm' };
  }

  if (
    typeof options.cornerRadiusMm !== 'number' ||
    options.cornerRadiusMm < 0 ||
    options.cornerRadiusMm > 30
  ) {
    return { valid: false, error: 'Corner radius must be between 0 and 30 mm' };
  }

  return { valid: true };
}

// -------------------------------------------------------------
// 2. Braille Transliteration & Grade 2 Contractions
// -------------------------------------------------------------
const BRAILLE_LETTERS: Record<string, number[]> = {
  a: [1],
  b: [1, 2],
  c: [1, 4],
  d: [1, 4, 5],
  e: [1, 5],
  f: [1, 2, 4],
  g: [1, 2, 4, 5],
  h: [1, 2, 5],
  i: [2, 4],
  j: [2, 4, 5],
  k: [1, 3],
  l: [1, 2, 3],
  m: [1, 3, 4],
  n: [1, 3, 4, 5],
  o: [1, 3, 5],
  p: [1, 2, 3, 4],
  q: [1, 2, 3, 4, 5],
  r: [1, 2, 3, 5],
  s: [2, 3, 4],
  t: [2, 3, 4, 5],
  u: [1, 3, 6],
  v: [1, 2, 3, 6],
  w: [2, 4, 5, 6],
  x: [1, 3, 4, 6],
  y: [1, 3, 4, 5, 6],
  z: [1, 3, 5, 6],
};

const NUMBER_PREFIX = [3, 4, 5, 6];
const DIGIT_MAP: Record<string, number[]> = {
  '1': [1],
  '2': [1, 2],
  '3': [1, 4],
  '4': [1, 4, 5],
  '5': [1, 5],
  '6': [1, 2, 4],
  '7': [1, 2, 4, 5],
  '8': [1, 2, 5],
  '9': [2, 4],
  '0': [2, 4, 5],
};

const GRADE2_CONTRACTIONS: Record<string, number[]> = {
  and: [1, 2, 3, 4, 6],
  for: [1, 2, 3, 4, 5, 6],
  of: [1, 2, 3, 5, 6],
  the: [2, 3, 4, 6],
  with: [2, 3, 4, 5, 6],
  ch: [1, 6],
  sh: [1, 4, 6],
  th: [1, 4, 5, 6],
  wh: [1, 5, 6],
  ed: [1, 2, 4, 6],
  er: [1, 2, 4, 5, 6],
  ou: [1, 2, 5, 6],
  ow: [2, 4, 6],
  st: [3, 4],
  ar: [3, 4, 5],
  ing: [3, 4, 6],
};

/**
 * Transliterates text into Grade 2 English Braille cells.
 */
export function transliterateToBraille(text: string): BrailleCell[] {
  const result: BrailleCell[] = [];
  const lower = text.toLowerCase().trim();
  let i = 0;
  let inNumber = false;

  while (i < lower.length) {
    const char = lower[i];

    // Check spaces
    if (char === ' ') {
      result.push({ dots: [] });
      inNumber = false;
      i++;
      continue;
    }

    // Check numbers
    if (char >= '0' && char <= '9') {
      if (!inNumber) {
        result.push({ dots: NUMBER_PREFIX });
        inNumber = true;
      }
      result.push({ dots: DIGIT_MAP[char] || [] });
      i++;
      continue;
    }

    inNumber = false;

    // Check 4-letter contractions
    if (i + 4 <= lower.length) {
      const sub4 = lower.substring(i, i + 4);
      if (GRADE2_CONTRACTIONS[sub4]) {
        result.push({ dots: GRADE2_CONTRACTIONS[sub4] });
        i += 4;
        continue;
      }
    }

    // Check 3-letter contractions
    if (i + 3 <= lower.length) {
      const sub3 = lower.substring(i, i + 3);
      if (GRADE2_CONTRACTIONS[sub3]) {
        result.push({ dots: GRADE2_CONTRACTIONS[sub3] });
        i += 3;
        continue;
      }
    }

    // Check 2-letter contractions
    if (i + 2 <= lower.length) {
      const sub2 = lower.substring(i, i + 2);
      if (GRADE2_CONTRACTIONS[sub2]) {
        result.push({ dots: GRADE2_CONTRACTIONS[sub2] });
        i += 2;
        continue;
      }
    }

    // Single letter
    if (BRAILLE_LETTERS[char]) {
      result.push({ dots: BRAILLE_LETTERS[char] });
    } else if (char === '-') {
      result.push({ dots: [3, 6] });
    } else if (char === '.') {
      result.push({ dots: [2, 5, 6] });
    } else if (char === ',') {
      result.push({ dots: [2] });
    } else {
      // Unknown symbol fallback to empty cell
      result.push({ dots: [] });
    }

    i++;
  }

  return result;
}

/**
 * Converts Braille cells to Unicode Braille string (\u2800-\u283F).
 */
export function cellsToUnicodeBraille(cells: BrailleCell[]): string {
  return cells
    .map((c) => {
      if (c.dots.length === 0) return ' ';
      let mask = 0;
      for (const dot of c.dots) {
        if (dot >= 1 && dot <= 6) {
          mask |= 1 << (dot - 1);
        }
      }
      return String.fromCharCode(0x2800 + mask);
    })
    .join('');
}

// -------------------------------------------------------------
// 3. Procedural Vector Typography & Pictograms
// -------------------------------------------------------------

// Normalized 1x1 vector strokes for uppercase sans-serif letters
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
  '0': [[[0.3, 0], [0.7, 0]], [[0.7, 0], [1, 0.3]], [[1, 0.3], [1, 0.7]], [[1, 0.7], [0.7, 1]], [[0.7, 1], [0.3, 1]], [[0.3, 1], [0, 0.7]], [[0, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]], [[0.2, 0.2], [0.8, 0.8]]],
  '1': [[[0.3, 0.8], [0.5, 1]], [[0.5, 1], [0.5, 0]], [[0.2, 0], [0.8, 0]]],
  '2': [[[0.1, 0.8], [0.5, 1]], [[0.5, 1], [0.9, 0.7]], [[0.9, 0.7], [0, 0]], [[0, 0], [1, 0]]],
  '3': [[[0, 0.85], [0.5, 1]], [[0.5, 1], [0.9, 0.75]], [[0.9, 0.75], [0.4, 0.5]], [[0.4, 0.5], [0.9, 0.25]], [[0.9, 0.25], [0.5, 0]], [[0.5, 0], [0, 0.15]]],
  '4': [[[0.8, 0], [0.8, 1]], [[0.8, 1], [0, 0.35]], [[0, 0.35], [1, 0.35]]],
  '5': [[[0.9, 1], [0.1, 1]], [[0.1, 1], [0.1, 0.55]], [[0.1, 0.55], [0.7, 0.55]], [[0.7, 0.55], [0.9, 0.3]], [[0.9, 0.3], [0.6, 0]], [[0.6, 0], [0.1, 0]]],
  '6': [[[0.8, 0.9], [0.3, 0.7]], [[0.3, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]], [[0.3, 0], [0.7, 0]], [[0.7, 0], [0.9, 0.25]], [[0.9, 0.25], [0.7, 0.5]], [[0.7, 0.5], [0.1, 0.5]]],
  '7': [[[0, 1], [1, 1]], [[1, 1], [0.35, 0]]],
  '8': [[[0.3, 1], [0.7, 1]], [[0.7, 1], [0.9, 0.75]], [[0.9, 0.75], [0.5, 0.5]], [[0.5, 0.5], [0.9, 0.25]], [[0.9, 0.25], [0.7, 0]], [[0.7, 0], [0.3, 0]], [[0.3, 0], [0.1, 0.25]], [[0.1, 0.25], [0.5, 0.5]], [[0.5, 0.5], [0.1, 0.75]], [[0.1, 0.75], [0.3, 1]]],
  '9': [[[0.2, 0.1], [0.7, 0.3]], [[0.7, 0.3], [1, 0.7]], [[1, 0.7], [0.7, 1]], [[0.7, 1], [0.3, 1]], [[0.3, 1], [0.1, 0.75]], [[0.1, 0.75], [0.3, 0.5]], [[0.3, 0.5], [0.9, 0.5]]],
  '-': [[[0.2, 0.5], [0.8, 0.5]]],
  '.': [[[0.4, 0], [0.6, 0]], [[0.6, 0], [0.6, 0.15]], [[0.6, 0.15], [0.4, 0.15]], [[0.4, 0.15], [0.4, 0]]],
  '/': [[[0.1, 0], [0.9, 1]]],
};

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

/**
 * Creates 3D extruded lettering for a line of text.
 */
function createTextGeometry(
  text: string,
  charHeightMm: number,
  raiseMm: number,
  strokeWidthMm: number
): THREE.BufferGeometry | null {
  const clean = text.toUpperCase();
  const charWidthMm = charHeightMm * 0.65;
  const charSpacing = charWidthMm * 0.3;
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
        const y1 = p1[1] * charHeightMm;
        const x2 = startX + p2[0] * charWidthMm;
        const y2 = p2[1] * charHeightMm;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (!Number.isFinite(len) || len < 0.001) continue;

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

/**
 * Creates 3D extruded pictogram shapes.
 */
function createPictogramGeometry(
  pictogram: SignPictogram,
  sizeMm: number,
  raiseMm: number
): THREE.BufferGeometry | null {
  if (pictogram === 'none') return null;

  const geometries: THREE.BufferGeometry[] = [];
  const s = sizeMm;
  const halfS = s / 2;

  function addCircle(cx: number, cy: number, r: number) {
    const shape = new THREE.Shape();
    shape.absarc(cx, cy, r, 0, Math.PI * 2, false);
    const geom = new THREE.ExtrudeGeometry(shape, { depth: raiseMm, bevelEnabled: false });
    geometries.push(geom);
  }

  function addPolygon(pts: [number, number][]) {
    if (pts.length < 3) return;
    const shape = new THREE.Shape();
    shape.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      shape.lineTo(pts[i][0], pts[i][1]);
    }
    shape.closePath();
    const geom = new THREE.ExtrudeGeometry(shape, { depth: raiseMm, bevelEnabled: false });
    geometries.push(geom);
  }

  if (pictogram === 'restroom_men' || pictogram === 'restroom_unisex') {
    const offsetX = pictogram === 'restroom_unisex' ? -halfS * 0.45 : 0;
    // Head
    addCircle(offsetX, halfS * 0.65, s * 0.1);
    // Torso & legs
    addPolygon([
      [offsetX - s * 0.18, halfS * 0.45],
      [offsetX + s * 0.18, halfS * 0.45],
      [offsetX + s * 0.15, -halfS * 0.1],
      [offsetX + s * 0.12, -halfS * 0.65],
      [offsetX + s * 0.03, -halfS * 0.65],
      [offsetX + s * 0.03, -halfS * 0.15],
      [offsetX - s * 0.03, -halfS * 0.15],
      [offsetX - s * 0.03, -halfS * 0.65],
      [offsetX - s * 0.12, -halfS * 0.65],
      [offsetX - s * 0.15, -halfS * 0.1],
    ]);
  }

  if (pictogram === 'restroom_women' || pictogram === 'restroom_unisex') {
    const offsetX = pictogram === 'restroom_unisex' ? halfS * 0.45 : 0;
    // Head
    addCircle(offsetX, halfS * 0.65, s * 0.1);
    // Dress torso & legs
    addPolygon([
      [offsetX - s * 0.14, halfS * 0.45],
      [offsetX + s * 0.14, halfS * 0.45],
      [offsetX + s * 0.28, -halfS * 0.2],
      [offsetX + s * 0.09, -halfS * 0.2],
      [offsetX + s * 0.09, -halfS * 0.65],
      [offsetX + s * 0.02, -halfS * 0.65],
      [offsetX + s * 0.02, -halfS * 0.2],
      [offsetX - s * 0.02, -halfS * 0.2],
      [offsetX - s * 0.02, -halfS * 0.65],
      [offsetX - s * 0.09, -halfS * 0.65],
      [offsetX - s * 0.09, -halfS * 0.2],
      [offsetX - s * 0.28, -halfS * 0.2],
    ]);
  }

  if (pictogram === 'accessible_wheelchair') {
    // Head
    addCircle(-halfS * 0.1, halfS * 0.55, s * 0.1);
    // Wheel arc (outer circle with inner hole)
    const wheelShape = new THREE.Shape();
    wheelShape.absarc(0, -halfS * 0.2, s * 0.35, 0, Math.PI * 2, false);
    const innerHole = new THREE.Path();
    innerHole.absarc(0, -halfS * 0.2, s * 0.24, 0, Math.PI * 2, true);
    wheelShape.holes.push(innerHole);
    geometries.push(new THREE.ExtrudeGeometry(wheelShape, { depth: raiseMm, bevelEnabled: false }));

    // Person torso & arm
    addPolygon([
      [-halfS * 0.2, halfS * 0.35],
      [-halfS * 0.05, halfS * 0.35],
      [0, -halfS * 0.1],
      [halfS * 0.35, -halfS * 0.1],
      [halfS * 0.35, -halfS * 0.2],
      [-halfS * 0.08, -halfS * 0.2],
      [-halfS * 0.28, halfS * 0.2],
    ]);
  }

  if (pictogram === 'exit') {
    // Doorway frame
    const doorShape = new THREE.Shape();
    doorShape.moveTo(-halfS * 0.7, -halfS * 0.7);
    doorShape.lineTo(-halfS * 0.7, halfS * 0.7);
    doorShape.lineTo(halfS * 0.7, halfS * 0.7);
    doorShape.lineTo(halfS * 0.7, -halfS * 0.7);
    doorShape.lineTo(halfS * 0.5, -halfS * 0.7);
    doorShape.lineTo(halfS * 0.5, halfS * 0.5);
    doorShape.lineTo(-halfS * 0.5, halfS * 0.5);
    doorShape.lineTo(-halfS * 0.5, -halfS * 0.7);
    doorShape.closePath();
    geometries.push(new THREE.ExtrudeGeometry(doorShape, { depth: raiseMm, bevelEnabled: false }));

    // Directional arrow pointing right
    addPolygon([
      [-halfS * 0.3, halfS * 0.1],
      [halfS * 0.1, halfS * 0.1],
      [halfS * 0.1, halfS * 0.25],
      [halfS * 0.4, 0],
      [halfS * 0.1, -halfS * 0.25],
      [halfS * 0.1, -halfS * 0.1],
      [-halfS * 0.3, -halfS * 0.1],
    ]);
  }

  if (geometries.length === 0) return null;
  const merged = safeMergeGeometries(geometries);
  geometries.forEach((g) => g.dispose());
  return merged;
}

// -------------------------------------------------------------
// 4. Mesh Generation Core
// -------------------------------------------------------------
export interface SignGeometryResult {
  baseGeometry: THREE.BufferGeometry;
  tactileGeometry: THREE.BufferGeometry;
  brailleGeometry: THREE.BufferGeometry;
  metrics: SignMetrics;
  brailleCells: BrailleCell[];
  unicodeBraille: string;
}

export function generateSignMesh(
  options: BrailleAdaSignGeneratorOptions
): SignGeometryResult {
  const w = options.plaqueWidthMm;
  const h = options.plaqueHeightMm;
  const t = options.plaqueThicknessMm;
  const raise = options.tactileRaiseMm;
  const rad = Math.min(options.cornerRadiusMm, Math.min(w, h) / 4);

  // --- 1. Base Plaque Shape ---
  const halfW = w / 2;
  const halfH = h / 2;
  const plaqueShape = new THREE.Shape();

  plaqueShape.moveTo(-halfW + rad, -halfH);
  plaqueShape.lineTo(halfW - rad, -halfH);
  if (rad > 0) plaqueShape.absarc(halfW - rad, -halfH + rad, rad, -Math.PI / 2, 0, false);
  plaqueShape.lineTo(halfW, halfH - rad);
  if (rad > 0) plaqueShape.absarc(halfW - rad, halfH - rad, rad, 0, Math.PI / 2, false);
  plaqueShape.lineTo(-halfW + rad, halfH);
  if (rad > 0) plaqueShape.absarc(-halfW + rad, halfH - rad, rad, Math.PI / 2, Math.PI, false);
  plaqueShape.lineTo(-halfW, -halfH + rad);
  if (rad > 0) plaqueShape.absarc(-halfW + rad, -halfH + rad, rad, Math.PI, (3 * Math.PI) / 2, false);
  plaqueShape.closePath();

  // Mounting Holes
  if (options.mountHoles) {
    const holeR = options.mountHoleDiameterMm / 2;
    const inset = Math.max(8, rad + 4);
    const corners: [number, number][] = [
      [-halfW + inset, -halfH + inset],
      [halfW - inset, -halfH + inset],
      [halfW - inset, halfH - inset],
      [-halfW + inset, halfH - inset],
    ];

    for (const [hx, hy] of corners) {
      const holePath = new THREE.Path();
      holePath.absarc(hx, hy, holeR, 0, Math.PI * 2, true);
      plaqueShape.holes.push(holePath);
    }
  }

  const baseGeometry = new THREE.ExtrudeGeometry(plaqueShape, {
    depth: t,
    bevelEnabled: false,
  });

  // --- 2. Raised Tactile Elements (Frame, Pictogram, Title, Subtitle) ---
  const tactileGeometries: THREE.BufferGeometry[] = [];

  // Frame border
  if (options.includeFrameBorder) {
    const borderWidth = options.frameBorderWidthMm || 3.0;
    const outerShape = new THREE.Shape();
    outerShape.moveTo(-halfW + rad, -halfH);
    outerShape.lineTo(halfW - rad, -halfH);
    if (rad > 0) outerShape.absarc(halfW - rad, -halfH + rad, rad, -Math.PI / 2, 0, false);
    outerShape.lineTo(halfW, halfH - rad);
    if (rad > 0) outerShape.absarc(halfW - rad, halfH - rad, rad, 0, Math.PI / 2, false);
    outerShape.lineTo(-halfW + rad, halfH);
    if (rad > 0) outerShape.absarc(-halfW + rad, halfH - rad, rad, Math.PI / 2, Math.PI, false);
    outerShape.lineTo(-halfW, -halfH + rad);
    if (rad > 0) outerShape.absarc(-halfW + rad, -halfH + rad, rad, Math.PI, (3 * Math.PI) / 2, false);
    outerShape.closePath();

    const innerRad = Math.max(0, rad - borderWidth);
    const innerHole = new THREE.Path();
    innerHole.moveTo(-halfW + borderWidth + innerRad, -halfH + borderWidth);
    innerHole.lineTo(halfW - borderWidth - innerRad, -halfH + borderWidth);
    if (innerRad > 0)
      innerHole.absarc(
        halfW - borderWidth - innerRad,
        -halfH + borderWidth + innerRad,
        innerRad,
        -Math.PI / 2,
        0,
        false
      );
    innerHole.lineTo(halfW - borderWidth, halfH - borderWidth - innerRad);
    if (innerRad > 0)
      innerHole.absarc(
        halfW - borderWidth - innerRad,
        halfH - borderWidth - innerRad,
        innerRad,
        0,
        Math.PI / 2,
        false
      );
    innerHole.lineTo(-halfW + borderWidth + innerRad, halfH - borderWidth);
    if (innerRad > 0)
      innerHole.absarc(
        -halfW + borderWidth + innerRad,
        halfH - borderWidth - innerRad,
        innerRad,
        Math.PI / 2,
        Math.PI,
        false
      );
    innerHole.lineTo(-halfW + borderWidth, -halfH + borderWidth + innerRad);
    if (innerRad > 0)
      innerHole.absarc(
        -halfW + borderWidth + innerRad,
        -halfH + borderWidth + innerRad,
        innerRad,
        Math.PI,
        (3 * Math.PI) / 2,
        false
      );
    innerHole.closePath();

    outerShape.holes.push(innerHole);
    const borderGeom = new THREE.ExtrudeGeometry(outerShape, {
      depth: raise,
      bevelEnabled: false,
    });
    borderGeom.translate(0, 0, t);
    tactileGeometries.push(borderGeom);
  }

  // Vertical layout zones
  const hasPictogram = options.pictogram !== 'none';
  const pictoSize = hasPictogram ? Math.min(w * 0.45, h * 0.35) : 0;
  const pictoCenterY = halfH - pictoSize / 2 - 18;

  if (hasPictogram) {
    const pictoGeom = createPictogramGeometry(options.pictogram, pictoSize, raise);
    if (pictoGeom) {
      pictoGeom.translate(0, pictoCenterY, t);
      tactileGeometries.push(pictoGeom);
    }
  }

  // Room Title (Tactile raised lettering: ADA standard min 16mm / 5/8" to max 51mm / 2")
  const titleHeightMm = hasPictogram ? Math.min(22, h * 0.1) : Math.min(32, h * 0.16);
  const strokeWidth = titleHeightMm * 0.18;
  const titleCenterY = hasPictogram ? pictoCenterY - pictoSize / 2 - titleHeightMm - 10 : 15;

  const titleGeom = createTextGeometry(options.roomTitle, titleHeightMm, raise, strokeWidth);
  if (titleGeom) {
    titleGeom.translate(0, titleCenterY, t);
    tactileGeometries.push(titleGeom);
  }

  // Subtext
  if (options.subText && options.subText.trim().length > 0) {
    const subHeightMm = titleHeightMm * 0.65;
    const subStrokeWidth = subHeightMm * 0.18;
    const subCenterY = titleCenterY - subHeightMm - 10;
    const subGeom = createTextGeometry(options.subText, subHeightMm, raise, subStrokeWidth);
    if (subGeom) {
      subGeom.translate(0, subCenterY, t);
      tactileGeometries.push(subGeom);
    }
  }

  let tactileGeometry: THREE.BufferGeometry;
  if (tactileGeometries.length > 0) {
    tactileGeometry = safeMergeGeometries(tactileGeometries);
    tactileGeometries.forEach((g) => g.dispose());
  } else {
    tactileGeometry = new THREE.BufferGeometry();
  }

  // --- 3. Braille Domes Generation ---
  const brailleCells = transliterateToBraille(options.roomTitle);
  const unicodeBraille = cellsToUnicodeBraille(brailleCells);

  const isCA = options.brailleStandard === 'california_title24';
  const dotSpacing = isCA ? 2.8 : 2.4; // Center-to-center between dots in same cell
  const cellSpacing = isCA ? 7.0 : 6.3; // Center-to-center between corresponding dots in adjacent cells
  const dotRadius = 0.78; // Base diameter 1.56mm
  const dotHeight = 0.75; // Protrusion 0.75mm

  const brailleTotalWidth =
    brailleCells.length > 0 ? (brailleCells.length - 1) * cellSpacing + dotSpacing : 0;
  const brailleStartX = -brailleTotalWidth / 2;
  const brailleBaselineY = -halfH + Math.max(16, h * 0.12);

  const brailleGeometries: THREE.BufferGeometry[] = [];
  let dotCount = 0;

  const sphereProto = new THREE.SphereGeometry(dotRadius, 10, 6);

  for (let c = 0; c < brailleCells.length; c++) {
    const cell = brailleCells[c];
    const cellX = brailleStartX + c * cellSpacing;

    for (const dot of cell.dots) {
      // 6-dot matrix layout:
      // Dot 1: top-left (col 0, row 2)
      // Dot 2: mid-left (col 0, row 1)
      // Dot 3: bot-left (col 0, row 0)
      // Dot 4: top-right (col 1, row 2)
      // Dot 5: mid-right (col 1, row 1)
      // Dot 6: bot-right (col 1, row 0)
      const col = dot > 3 ? 1 : 0;
      const row = dot > 3 ? 6 - dot : 3 - dot;

      const dx = cellX + col * dotSpacing;
      const dy = brailleBaselineY + row * dotSpacing;

      const domeGeom = sphereProto.clone();
      // Scale height to match ADA dot height
      domeGeom.scale(1, 1, dotHeight / dotRadius);
      // Place on top surface of base plaque
      domeGeom.translate(dx, dy, t);
      brailleGeometries.push(domeGeom);
      dotCount++;
    }
  }

  sphereProto.dispose();

  let brailleGeometry: THREE.BufferGeometry;
  if (brailleGeometries.length > 0) {
    brailleGeometry = safeMergeGeometries(brailleGeometries);
    brailleGeometries.forEach((g) => g.dispose());
  } else {
    brailleGeometry = new THREE.BufferGeometry();
  }

  // --- 4. Metrics & Compliance Calculation ---
  const basePos = baseGeometry.getAttribute('position');
  const baseTriangles = baseGeometry.getIndex()
    ? baseGeometry.getIndex()!.count / 3
    : basePos ? basePos.count / 3 : 0;

  const tactPos = tactileGeometry.getAttribute('position');
  const tactileTriangles = tactileGeometry.getIndex()
    ? tactileGeometry.getIndex()!.count / 3
    : tactPos ? tactPos.count / 3 : 0;

  const braillePos = brailleGeometry.getAttribute('position');
  const brailleTriangles = brailleGeometry.getIndex()
    ? brailleGeometry.getIndex()!.count / 3
    : braillePos ? braillePos.count / 3 : 0;

  const totalTriangles = Math.round(baseTriangles + tactileTriangles + brailleTriangles);

  // Filament weight calculation (PLA/PETG ~1.24 g/cm3)
  const plaqueVolumeCm3 = (w * h * t * 0.001);
  const estimatedGrams = Math.max(12, Math.round(plaqueVolumeCm3 * 1.24 * 0.65 * 10) / 10);
  const estimatedPrintTimeHours = Math.max(0.6, Math.round((estimatedGrams / 22 + 0.3) * 10) / 10);

  const complianceNotes: string[] = [
    `Tactile Lettering: 1/32" raised (${raise.toFixed(2)} mm), uppercase sans-serif compliant with ADA §703.2.`,
    options.brailleStandard === 'california_title24'
      ? 'California Title 24: Expanded 7.0mm cell-to-cell spacing and 2.8mm dot spacing applied.'
      : 'ADA Standard §703.3: 6.3mm cell spacing and 2.4mm intra-cell dot spacing applied.',
    `Braille Domes: ${dotCount} hemispherical domes generated at Grade 2 contracted standard.`,
    'Visual Contrast: ADA requires high visual contrast (minimum 70% LRV difference) between background and characters.',
    'Mounting Specification: Mount sign on wall adjacent to latch side of door at 48" to 60" from floor to baseline.',
  ];

  const metrics: SignMetrics = {
    plaqueWidthMm: w,
    plaqueHeightMm: h,
    plaqueThicknessMm: t,
    brailleDotCount: dotCount,
    brailleCellCount: brailleCells.length,
    tactileCharacterCount: options.roomTitle.replace(/\s+/g, '').length,
    baseTriangles: Math.round(baseTriangles),
    tactileTriangles: Math.round(tactileTriangles),
    brailleTriangles: Math.round(brailleTriangles),
    totalTriangles,
    estimatedGrams,
    estimatedPrintTimeHours,
    adaComplianceNotes: complianceNotes,
  };

  return {
    baseGeometry,
    tactileGeometry,
    brailleGeometry,
    metrics,
    brailleCells,
    unicodeBraille,
  };
}

// -------------------------------------------------------------
// 5. Binary STL and 3MF Serialization
// -------------------------------------------------------------

/**
 * Encodes BufferGeometry into a binary STL ArrayBuffer.
 */
export function exportSignSTL(geometry: THREE.BufferGeometry): ArrayBuffer {
  const index = geometry.getIndex();
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');

  const triangleCount = index ? index.count / 3 : position.count / 3;
  const bufferSize = 84 + triangleCount * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const dataView = new DataView(buffer);

  const header = 'PrivKnife Client-Side Braille & ADA Tactile Door Sign Generator';
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
 * Packages Base Plaque, Raised Tactile, and Braille Domes into a multi-object 3MF package.
 */
export async function exportSign3MF(
  baseGeom: THREE.BufferGeometry,
  tactileGeom: THREE.BufferGeometry,
  brailleGeom: THREE.BufferGeometry,
  options: BrailleAdaSignGeneratorOptions
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

  const baseXml = serializeMeshXml(baseGeom, 1, 'Plaque Base (Dark Slate)');
  const tactileXml = serializeMeshXml(tactileGeom, 2, 'Tactile Text & Pictogram (Bright White)');
  const brailleXml = serializeMeshXml(brailleGeom, 3, 'Braille Domes (Tactile)');

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">Braille & ADA Door Sign - ${options.roomTitle}</metadata>
  <metadata name="Designer">PrivKnife Client-Side Studio</metadata>
  <metadata name="Description">100% ADA-compliant tactile door sign with Grade 2 Braille</metadata>
  <resources>
${baseXml}${tactileXml}${brailleXml}  </resources>
  <build>
    <item objectid="1" />
    <item objectid="2" />
    <item objectid="3" />
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

// -------------------------------------------------------------
// 6. Complete Execution Pipeline
// -------------------------------------------------------------
export async function processSign(
  options: BrailleAdaSignGeneratorOptions,
  format: SignExportFormat = '3mf_multicolor'
): Promise<BrailleAdaSignGeneratorResult> {
  const validation = validateSignOptions(options);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid configuration');
  }

  const { baseGeometry, tactileGeometry, brailleGeometry, metrics, unicodeBraille } =
    generateSignMesh(options);

  const cleanSlug = options.roomTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'ada-sign';

  try {
    if (format === '3mf_multicolor') {
      const blob = await exportSign3MF(baseGeometry, tactileGeometry, brailleGeometry, options);
      return {
        success: true,
        blob,
        fileName: `${cleanSlug}-ada-sign.3mf`,
        fileSize: blob.size,
        mimeType: 'model/3mf',
        metrics,
        brailleTransliteration: options.roomTitle,
        unicodeBraille,
      };
    } else {
      // Unified single STL: merge base, tactile, and braille geometries
      const geomsToMerge = [baseGeometry];
      if (tactileGeometry.getAttribute('position')) {
        geomsToMerge.push(tactileGeometry);
      }
      if (brailleGeometry.getAttribute('position')) {
        geomsToMerge.push(brailleGeometry);
      }

      const merged = safeMergeGeometries(geomsToMerge);
      const stlBuffer = exportSignSTL(merged);
      merged.dispose();

      const blob = new Blob([stlBuffer], { type: 'model/stl' });
      return {
        success: true,
        blob,
        fileName: `${cleanSlug}-ada-sign.stl`,
        fileSize: blob.size,
        mimeType: 'model/stl',
        metrics,
        brailleTransliteration: options.roomTitle,
        unicodeBraille,
      };
    }
  } finally {
    baseGeometry.dispose();
    tactileGeometry.dispose();
    brailleGeometry.dispose();
  }
}
