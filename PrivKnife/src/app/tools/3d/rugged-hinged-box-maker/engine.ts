import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import JSZip from 'jszip';
import {
  DividerMode,
  HingeType,
  LatchType,
  RuggedBoxMetrics,
  RuggedBoxParts,
  RuggedBoxValidationResult,
  RuggedHingedBoxOptions,
  STANDARD_BED_SIZE_MM,
} from './types';

const VALID_HINGES = new Set<HingeType>(['print_in_place', 'm3_screw', 'filament_pin']);
const VALID_LATCHES = new Set<LatchType>(['snap_compliant', 'friction_slide']);
const VALID_DIVIDERS = new Set<DividerMode>(['none', 'molded_fixed', 'removable_tray']);

type Stroke = [[number, number], [number, number]];

const FONT_GLYPHS: Record<string, Stroke[]> = {
  A: [[[0, 0], [0.5, 1]], [[0.5, 1], [1, 0]], [[0.2, 0.4], [0.8, 0.4]]],
  B: [[[0, 0], [0, 1]], [[0, 1], [0.75, 1]], [[0.75, 1], [0.75, 0.52]], [[0.75, 0.52], [0, 0.52]], [[0, 0.52], [0.85, 0.52]], [[0.85, 0.52], [0.85, 0]], [[0.85, 0], [0, 0]]],
  C: [[[1, 0.8], [0.3, 1]], [[0.3, 1], [0, 0.7]], [[0, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]], [[0.3, 0], [1, 0.2]]],
  D: [[[0, 0], [0, 1]], [[0, 1], [0.6, 1]], [[0.6, 1], [1, 0.6]], [[1, 0.6], [1, 0.4]], [[1, 0.4], [0.6, 0]], [[0.6, 0], [0, 0]]],
  E: [[[0, 0], [0, 1]], [[0, 1], [0.85, 1]], [[0, 0.5], [0.65, 0.5]], [[0, 0], [0.85, 0]]],
  F: [[[0, 0], [0, 1]], [[0, 1], [0.85, 1]], [[0, 0.5], [0.65, 0.5]]],
  G: [[[1, 0.8], [0.3, 1]], [[0.3, 1], [0, 0.7]], [[0, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]], [[0.3, 0], [1, 0]], [[1, 0], [1, 0.5]], [[1, 0.5], [0.5, 0.5]]],
  H: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]],
  I: [[[0.5, 0], [0.5, 1]], [[0.2, 1], [0.8, 1]], [[0.2, 0], [0.8, 0]]],
  J: [[[0.8, 1], [0.8, 0.3]], [[0.8, 0.3], [0.5, 0]], [[0.5, 0], [0.2, 0.2]]],
  K: [[[0, 0], [0, 1]], [[0, 0.45], [0.9, 1]], [[0.2, 0.55], [0.9, 0]]],
  L: [[[0, 1], [0, 0]], [[0, 0], [0.85, 0]]],
  M: [[[0, 0], [0, 1]], [[0, 1], [0.5, 0.35]], [[0.5, 0.35], [1, 1]], [[1, 1], [1, 0]]],
  N: [[[0, 0], [0, 1]], [[0, 1], [1, 0]], [[1, 0], [1, 1]]],
  O: [[[0.3, 0], [0.7, 0]], [[0.7, 0], [1, 0.3]], [[1, 0.3], [1, 0.7]], [[1, 0.7], [0.7, 1]], [[0.7, 1], [0.3, 1]], [[0.3, 1], [0, 0.7]], [[0, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]]],
  P: [[[0, 0], [0, 1]], [[0, 1], [0.8, 1]], [[0.8, 1], [0.8, 0.5]], [[0.8, 0.5], [0, 0.5]]],
  Q: [[[0.3, 0], [0.7, 0]], [[0.7, 0], [1, 0.3]], [[1, 0.3], [1, 0.7]], [[1, 0.7], [0.7, 1]], [[0.7, 1], [0.3, 1]], [[0.3, 1], [0, 0.7]], [[0, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]], [[0.6, 0.3], [1, -0.05]]],
  R: [[[0, 0], [0, 1]], [[0, 1], [0.8, 1]], [[0.8, 1], [0.8, 0.55]], [[0.8, 0.55], [0, 0.55]], [[0.3, 0.55], [0.9, 0]]],
  S: [[[0.9, 0.85], [0.3, 1]], [[0.3, 1], [0, 0.75]], [[0, 0.75], [0.8, 0.5]], [[0.8, 0.5], [1, 0.25]], [[1, 0.25], [0.7, 0]], [[0.7, 0], [0.1, 0.15]]],
  T: [[[0.5, 0], [0.5, 1]], [[0, 1], [1, 1]]],
  U: [[[0, 1], [0, 0.3]], [[0, 0.3], [0.3, 0]], [[0.3, 0], [0.7, 0]], [[0.7, 0], [1, 0.3]], [[1, 0.3], [1, 1]]],
  V: [[[0, 1], [0.5, 0]], [[0.5, 0], [1, 1]]],
  W: [[[0, 1], [0.25, 0]], [[0.25, 0], [0.5, 0.65]], [[0.5, 0.65], [0.75, 0]], [[0.75, 0], [1, 1]]],
  X: [[[0, 0], [1, 1]], [[0, 1], [1, 0]]],
  Y: [[[0, 1], [0.5, 0.5]], [[1, 1], [0.5, 0.5]], [[0.5, 0.5], [0.5, 0]]],
  Z: [[[0, 1], [1, 1]], [[1, 1], [0, 0]], [[0, 0], [1, 0]]],
  '0': [[[0.25, 0], [0.75, 0]], [[0.75, 0], [1, 0.25]], [[1, 0.25], [1, 0.75]], [[1, 0.75], [0.75, 1]], [[0.75, 1], [0.25, 1]], [[0.25, 1], [0, 0.75]], [[0, 0.75], [0, 0.25]], [[0, 0.25], [0.25, 0]], [[0.2, 0.2], [0.8, 0.8]]],
  '1': [[[0.3, 0.8], [0.5, 1]], [[0.5, 1], [0.5, 0]], [[0.25, 0], [0.75, 0]]],
  '2': [[[0.1, 0.8], [0.5, 1]], [[0.5, 1], [0.9, 0.7]], [[0.9, 0.7], [0, 0]], [[0, 0], [1, 0]]],
  '3': [[[0.1, 0.85], [0.5, 1]], [[0.5, 1], [0.9, 0.75]], [[0.9, 0.75], [0.4, 0.5]], [[0.4, 0.5], [0.9, 0.25]], [[0.9, 0.25], [0.5, 0]], [[0.5, 0], [0.1, 0.15]]],
  '4': [[[0.8, 0], [0.8, 1]], [[0.8, 1], [0, 0.35]], [[0, 0.35], [1, 0.35]]],
  '5': [[[0.9, 1], [0.1, 1]], [[0.1, 1], [0.1, 0.55]], [[0.1, 0.55], [0.7, 0.55]], [[0.7, 0.55], [0.9, 0.3]], [[0.9, 0.3], [0.6, 0]], [[0.6, 0], [0.1, 0]]],
  '6': [[[0.8, 0.9], [0.3, 1]], [[0.3, 1], [0, 0.7]], [[0, 0.7], [0, 0.25]], [[0, 0.25], [0.3, 0]], [[0.3, 0], [0.7, 0]], [[0.7, 0], [0.9, 0.25]], [[0.9, 0.25], [0.7, 0.5]], [[0.7, 0.5], [0.05, 0.5]]],
  '7': [[[0, 1], [1, 1]], [[1, 1], [0.35, 0]]],
  '8': [[[0.3, 1], [0.7, 1]], [[0.7, 1], [0.9, 0.75]], [[0.9, 0.75], [0.5, 0.5]], [[0.5, 0.5], [0.9, 0.25]], [[0.9, 0.25], [0.7, 0]], [[0.7, 0], [0.3, 0]], [[0.3, 0], [0.1, 0.25]], [[0.1, 0.25], [0.5, 0.5]], [[0.5, 0.5], [0.1, 0.75]], [[0.1, 0.75], [0.3, 1]]],
  '9': [[[0.2, 0.1], [0.7, 0]], [[0.7, 0], [1, 0.3]], [[1, 0.3], [1, 0.75]], [[1, 0.75], [0.7, 1]], [[0.7, 1], [0.3, 1]], [[0.3, 1], [0.1, 0.75]], [[0.1, 0.75], [0.3, 0.5]], [[0.3, 0.5], [0.95, 0.5]]],
  '-': [[[0.2, 0.5], [0.8, 0.5]]],
  '+': [[[0.5, 0.2], [0.5, 0.8]], [[0.2, 0.5], [0.8, 0.5]]],
  '/': [[[0.1, 0], [0.9, 1]]],
  '.': [[[0.45, 0.05], [0.55, 0.05]]],
  ':': [[[0.45, 0.7], [0.55, 0.7]], [[0.45, 0.25], [0.55, 0.25]]],
  '<': [[[0.8, 0.85], [0.2, 0.5]], [[0.2, 0.5], [0.8, 0.15]]],
  '>': [[[0.2, 0.85], [0.8, 0.5]], [[0.8, 0.5], [0.2, 0.15]]],
  '&': [[[0.8, 0.1], [0.2, 0.7]], [[0.2, 0.7], [0.5, 0.95]], [[0.5, 0.95], [0.75, 0.7]], [[0.75, 0.7], [0.2, 0.25]], [[0.2, 0.25], [0.55, 0.05]], [[0.55, 0.05], [0.9, 0.3]]],
};

function isFiniteNum(v: number, min: number, max: number): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

function isFiniteInt(v: number, min: number, max: number): boolean {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

/**
 * Validates all parametric hardware, dimension, and divider options.
 */
export function validateRuggedBoxOptions(
  options: RuggedHingedBoxOptions
): RuggedBoxValidationResult {
  if (!options || typeof options !== 'object') {
    return { valid: false, error: 'Configuration options are required.' };
  }
  if (!isFiniteNum(options.innerLengthMm, 60, 240)) {
    return { valid: false, error: 'Inner length must be between 60 and 240 mm.' };
  }
  if (!isFiniteNum(options.innerWidthMm, 50, 200)) {
    return { valid: false, error: 'Inner width must be between 50 and 200 mm.' };
  }
  if (!isFiniteNum(options.baseDepthMm, 18, 110)) {
    return { valid: false, error: 'Base cavity depth must be between 18 and 110 mm.' };
  }
  if (!isFiniteNum(options.lidDepthMm, 10, 60)) {
    return { valid: false, error: 'Lid cavity depth must be between 10 and 60 mm.' };
  }
  if (!isFiniteNum(options.wallThicknessMm, 2.0, 5.0)) {
    return { valid: false, error: 'Wall thickness must be between 2.0 and 5.0 mm.' };
  }
  if (!isFiniteNum(options.cornerRadiusMm, 3.0, 14.0)) {
    return { valid: false, error: 'Corner fillet radius must be between 3.0 and 14.0 mm.' };
  }
  if (options.cornerRadiusMm >= Math.min(options.innerLengthMm, options.innerWidthMm) * 0.45) {
    return { valid: false, error: 'Corner radius exceeds half the inner span.' };
  }
  if (!isFiniteInt(options.ribCountPerSide, 0, 6)) {
    return { valid: false, error: 'Reinforcement ribs per side must be an integer between 0 and 6.' };
  }
  if (!VALID_HINGES.has(options.hingeType)) {
    return { valid: false, error: 'Invalid hinge hardware type selected.' };
  }
  if (!isFiniteNum(options.hingeClearanceMm, 0.25, 0.5)) {
    return { valid: false, error: 'Hinge knuckle clearance must be between 0.25 and 0.50 mm.' };
  }
  if (!VALID_LATCHES.has(options.latchType)) {
    return { valid: false, error: 'Invalid front latch style selected.' };
  }
  if (!VALID_DIVIDERS.has(options.dividerMode)) {
    return { valid: false, error: 'Invalid divider mode selected.' };
  }
  if (!isFiniteInt(options.dividerCols, 1, 8)) {
    return { valid: false, error: 'Divider columns must be an integer between 1 and 8.' };
  }
  if (!isFiniteInt(options.dividerRows, 1, 6)) {
    return { valid: false, error: 'Divider rows must be an integer between 1 and 6.' };
  }
  if (typeof options.frontLabelText === 'string' && options.frontLabelText.trim().length > 20) {
    return { valid: false, error: 'Front nameplate label cannot exceed 20 characters.' };
  }
  return { valid: true };
}

function normalizeGeom(geom: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geom.index ? geom.toNonIndexed() : geom.clone();
  for (const attr of Object.keys(g.attributes)) {
    if (attr !== 'position' && attr !== 'normal') {
      g.deleteAttribute(attr);
    }
  }
  if (!g.getAttribute('normal')) {
    g.computeVertexNormals();
  }
  return g;
}

function safeMerge(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geoms.length === 0) return new THREE.BufferGeometry();
  const norm = geoms.map((g) => normalizeGeom(g));
  try {
    if (norm.length === 1) return norm[0].clone();
    const merged = BufferGeometryUtils.mergeGeometries(norm, false);
    return merged ?? new THREE.BufferGeometry();
  } finally {
    norm.forEach((g) => g.dispose());
  }
}

function subtractGeom(
  base: THREE.BufferGeometry,
  cutter: THREE.BufferGeometry
): THREE.BufferGeometry {
  const cleanA = normalizeGeom(base);
  const cleanB = normalizeGeom(cutter);
  const evaluator = new Evaluator();
  evaluator.attributes = ['position', 'normal'];
  evaluator.useGroups = false;

  const bA = new Brush(cleanA);
  const bB = new Brush(cleanB);
  bA.updateMatrixWorld();
  bB.updateMatrixWorld();
  try {
    const res = evaluator.evaluate(bA, bB, SUBTRACTION);
    return normalizeGeom(res.geometry);
  } finally {
    cleanA.dispose();
    cleanB.dispose();
  }
}

function createBoxAt(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  minZ: number,
  maxZ: number
): THREE.BufferGeometry {
  const sx = Math.max(0.05, maxX - minX);
  const sy = Math.max(0.05, maxY - minY);
  const sz = Math.max(0.05, maxZ - minZ);
  const g = new THREE.BoxGeometry(sx, sy, sz);
  g.translate((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
  return normalizeGeom(g);
}

function createCylinderXAt(
  minX: number,
  maxX: number,
  cy: number,
  cz: number,
  radius: number,
  segments = 24
): THREE.BufferGeometry {
  const len = Math.max(0.05, maxX - minX);
  const g = new THREE.CylinderGeometry(radius, radius, len, segments);
  g.rotateZ(Math.PI / 2);
  g.translate((minX + maxX) / 2, cy, cz);
  return normalizeGeom(g);
}

function createRoundedRectShape(width: number, depth: number, radius: number): THREE.Shape {
  const hw = width / 2;
  const hd = depth / 2;
  const r = Math.min(Math.max(0.5, radius), hw * 0.45, hd * 0.45);
  const s = new THREE.Shape();
  s.moveTo(-hw + r, -hd);
  s.lineTo(hw - r, -hd);
  s.quadraticCurveTo(hw, -hd, hw, -hd + r);
  s.lineTo(hw, hd - r);
  s.quadraticCurveTo(hw, hd, hw - r, hd);
  s.lineTo(-hw + r, hd);
  s.quadraticCurveTo(-hw, hd, -hw, hd - r);
  s.lineTo(-hw, -hd + r);
  s.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
  s.closePath();
  return s;
}

function createRoundedHollowShell(
  outerW: number,
  outerD: number,
  innerW: number,
  innerD: number,
  outerR: number,
  innerR: number,
  floorZ: number,
  totalH: number
): THREE.BufferGeometry {
  const outerShape = createRoundedRectShape(outerW, outerD, outerR);
  const rawOuter = new THREE.ExtrudeGeometry(outerShape, {
    depth: totalH,
    bevelEnabled: false,
  });
  const outerG = normalizeGeom(rawOuter);
  rawOuter.dispose();

  const innerShape = createRoundedRectShape(innerW, innerD, innerR);
  const rawInner = new THREE.ExtrudeGeometry(innerShape, {
    depth: totalH - floorZ + 3,
    bevelEnabled: false,
  });
  rawInner.translate(0, 0, floorZ);
  const innerG = normalizeGeom(rawInner);
  rawInner.dispose();

  const hollowed = subtractGeom(outerG, innerG);
  outerG.dispose();
  innerG.dispose();
  return hollowed;
}

function buildExteriorRibs(
  outerW: number,
  outerD: number,
  cornerR: number,
  shellH: number,
  ribCountPerSide: number,
  hingeWall: 'negY' | 'posY'
): THREE.BufferGeometry[] {
  if (ribCountPerSide <= 0) return [];
  const ribW = 4.5;
  const ribP = 2.5;
  const ribs: THREE.BufferGeometry[] = [];
  const minZ = 1.5;
  const maxZ = Math.max(minZ + 3, shellH - 2.0);

  const xSpan = Math.max(10, outerW - cornerR * 2 - ribW);
  const ySpan = Math.max(10, outerD - cornerR * 2 - ribW);

  for (let i = 0; i < ribCountPerSide; i++) {
    const t = ribCountPerSide === 1 ? 0.5 : i / (ribCountPerSide - 1);
    const rx = -xSpan / 2 + t * xSpan;
    const ry = -ySpan / 2 + t * ySpan;

    // Side ribs (+X and -X)
    ribs.push(createBoxAt(outerW / 2 - 0.3, outerW / 2 + ribP, ry - ribW / 2, ry + ribW / 2, minZ, maxZ));
    ribs.push(createBoxAt(-outerW / 2 - ribP, -outerW / 2 + 0.3, ry - ribW / 2, ry + ribW / 2, minZ, maxZ));

    // Front wall ribs (opposite hinge wall, flanking central nameplate & catches)
    if (hingeWall === 'negY') {
      if (Math.abs(rx) > outerW * 0.28) {
        ribs.push(createBoxAt(rx - ribW / 2, rx + ribW / 2, outerD / 2 - 0.3, outerD / 2 + ribP, minZ, maxZ));
      }
    } else if (Math.abs(rx) > outerW * 0.28) {
      ribs.push(createBoxAt(rx - ribW / 2, rx + ribW / 2, -outerD / 2 - ribP, -outerD / 2 + 0.3, minZ, maxZ));
    }
  }
  return ribs;
}

function buildTextStrokes(
  rawText: string,
  maxWidthMm: number,
  charHeightMm: number,
  raiseMm: number
): THREE.BufferGeometry | null {
  const clean = rawText.toUpperCase().trim();
  if (!clean) return null;

  const count = clean.length;
  const charH = Math.min(charHeightMm, maxWidthMm / (count * 0.9));
  const charW = Math.max(2.6, charH * 0.62);
  const spacing = charW * 0.25;
  const strokeW = Math.max(0.6, charH * 0.14);

  const rawTotal = count * charW + Math.max(0, count - 1) * spacing;
  const scale = rawTotal > maxWidthMm ? maxWidthMm / rawTotal : 1;
  const wS = charW * scale;
  const hS = charH * scale;
  const spS = spacing * scale;
  const stS = Math.max(0.5, strokeW * scale);
  const actualTotal = count * wS + Math.max(0, count - 1) * spS;

  let cursorX = -actualTotal / 2;
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i++) {
    const strokes = FONT_GLYPHS[clean[i]];
    if (strokes) {
      for (const [p1, p2] of strokes) {
        const x1 = cursorX + p1[0] * wS;
        const y1 = (p1[1] - 0.5) * hS;
        const x2 = cursorX + p2[0] * wS;
        const y2 = (p2[1] - 0.5) * hS;

        const len = Math.hypot(x2 - x1, y2 - y1);
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const halfT = stS / 2;

        const s = new THREE.Shape();
        s.moveTo(-halfT, -halfT);
        s.lineTo(len + halfT, -halfT);
        s.lineTo(len + halfT, halfT);
        s.lineTo(-halfT, halfT);
        s.closePath();

        const eg = new THREE.ExtrudeGeometry(s, { depth: raiseMm, bevelEnabled: false });
        eg.rotateZ(angle);
        eg.translate(x1, y1, 0);
        parts.push(eg);
      }
    }
    cursorX += wS + spS;
  }
  if (parts.length === 0) return null;
  const merged = safeMerge(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

function buildLatchGeometry(
  latchType: LatchType,
  cx: number,
  cy: number,
  spanH: number
): THREE.BufferGeometry {
  const latchW = 20;
  const parts: THREE.BufferGeometry[] = [];

  if (latchType === 'snap_compliant') {
    // Compliant flat-printable spring latch arm (>= 18mm flex arm + 1.25mm undercut hook)
    const armLen = Math.max(20, spanH * 0.72);
    parts.push(createBoxAt(cx - latchW / 2, cx + latchW / 2, cy - armLen / 2, cy + armLen / 2, 0, 3.0));
    // Lower catch lug
    parts.push(createBoxAt(cx - latchW / 2, cx + latchW / 2, cy - armLen / 2, cy - armLen / 2 + 4.5, 3.0, 5.4));
    // Upper snap hook lip (1.25mm engagement)
    parts.push(createBoxAt(cx - latchW / 2, cx + latchW / 2, cy + armLen / 2 - 4.2, cy + armLen / 2, 3.0, 6.2));
    // Pull tab flare at bottom edge
    parts.push(createBoxAt(cx - latchW / 2, cx + latchW / 2, cy - armLen / 2 - 3.0, cy - armLen / 2, 0, 2.2));
  } else {
    // Friction slide C-clip latch
    const clipLen = Math.max(18, spanH * 0.65);
    parts.push(createBoxAt(cx - latchW / 2, cx + latchW / 2, cy - clipLen / 2, cy + clipLen / 2, 0, 3.2));
    parts.push(createBoxAt(cx - latchW / 2, cx - latchW / 2 + 3.2, cy - clipLen / 2, cy + clipLen / 2, 3.2, 7.2));
    parts.push(createBoxAt(cx + latchW / 2 - 3.2, cx + latchW / 2, cy - clipLen / 2, cy + clipLen / 2, 3.2, 7.2));
  }

  const merged = safeMerge(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

/**
 * Generates watertight Base, Lid, Latches, optional Dividers, optional TPU Gasket Seal Loop,
 * and optional embossed front nameplate geometries seated cleanly flat at Z = 0.
 */
export function generateRuggedBoxParts(options: RuggedHingedBoxOptions): RuggedBoxParts {
  const check = validateRuggedBoxOptions(options);
  if (!check.valid) {
    throw new Error(check.error || 'Invalid rugged hinged box options.');
  }

  const wall = options.wallThicknessMm;
  const innerW = options.innerLengthMm;
  const innerD = options.innerWidthMm;
  const outerW = Number((innerW + 2 * wall).toFixed(2));
  const outerD = Number((innerD + 2 * wall).toFixed(2));
  const outerR = options.cornerRadiusMm + wall * 0.6;
  const innerR = Math.max(1.5, options.cornerRadiusMm);

  const floorZ = Number(Math.max(2.0, wall * 0.85).toFixed(2));
  const baseOuterH = Number((floorZ + options.baseDepthMm).toFixed(2));
  const lidFloorZ = Number(Math.max(2.0, wall * 0.85).toFixed(2));
  const lidOuterH = Number((lidFloorZ + options.lidDepthMm).toFixed(2));
  const closedHeightMm = Number((baseOuterH + lidOuterH).toFixed(1));
  const innerCavityVolumeCm3 = Number(((innerW * innerD * options.baseDepthMm) / 1000).toFixed(2));

  const hingeRadiusMm = 4.2;
  const hingeCenterYMm = Number((-(outerD / 2 + options.hingeClearanceMm + hingeRadiusMm)).toFixed(3));
  const lidCenterY = Number((2 * hingeCenterYMm).toFixed(3));
  const latchCount: 1 | 2 = innerW < 125 ? 1 : 2;

  // 1. Base & Lid Hollow Shells
  let baseGeom = createRoundedHollowShell(
    outerW,
    outerD,
    innerW,
    innerD,
    outerR,
    innerR,
    floorZ,
    baseOuterH
  );
  let lidGeom = createRoundedHollowShell(
    outerW,
    outerD,
    innerW,
    innerD,
    outerR,
    innerR,
    lidFloorZ,
    lidOuterH
  );

  // Add rim bezel & gasket groove when gasket channel is enabled
  let gasketGeometry: THREE.BufferGeometry | null = null;
  if (options.includeGasketChannel) {
    const lipOut = Math.max(0.8, 3.6 - wall);
    const rimBezelOuter = createRoundedRectShape(outerW + lipOut * 2, outerD + lipOut * 2, outerR + lipOut);
    const rawRim = new THREE.ExtrudeGeometry(rimBezelOuter, { depth: 5.0, bevelEnabled: false });
    rawRim.translate(0, 0, baseOuterH - 5.0);
    const rimInnerCut = createRoundedRectShape(innerW, innerD, innerR);
    const rawRimCut = new THREE.ExtrudeGeometry(rimInnerCut, { depth: 7.0, bevelEnabled: false });
    rawRimCut.translate(0, 0, baseOuterH - 6.0);
    const bezelBand = subtractGeom(rawRim, rawRimCut);
    rawRim.dispose();
    rawRimCut.dispose();

    const baseWithBezel = safeMerge([baseGeom, bezelBand]);
    baseGeom.dispose();
    bezelBand.dispose();

    // Cut 2.4mm wide x 1.2mm deep continuous TPU channel around mid-rim
    const gMidW = innerW + wall + lipOut;
    const gMidD = innerD + wall + lipOut;
    const gOuter = createRoundedRectShape(gMidW + 2.4, gMidD + 2.4, innerR + wall * 0.5 + 1.2);
    const gInner = createRoundedRectShape(gMidW - 2.4, gMidD - 2.4, Math.max(1.0, innerR + wall * 0.5 - 1.2));
    const gRawO = new THREE.ExtrudeGeometry(gOuter, { depth: 2.2, bevelEnabled: false });
    const gRawI = new THREE.ExtrudeGeometry(gInner, { depth: 4.0, bevelEnabled: false });
    gRawO.translate(0, 0, baseOuterH - 1.2);
    gRawI.translate(0, 0, baseOuterH - 2.0);
    const grooveRing = subtractGeom(gRawO, gRawI);
    gRawO.dispose();
    gRawI.dispose();

    baseGeom = subtractGeom(baseWithBezel, grooveRing);
    baseWithBezel.dispose();
    grooveRing.dispose();

    // Build printable TPU Gasket Seal Loop placed cleanly at +Y front beside base (zero collision)
    const sealOuter = createRoundedRectShape(gMidW + 2.2, gMidD + 2.2, innerR + wall * 0.5 + 1.1);
    const sealInner = createRoundedRectShape(gMidW - 2.2, gMidD - 2.2, Math.max(1.0, innerR + wall * 0.5 - 1.1));
    const sRawO = new THREE.ExtrudeGeometry(sealOuter, { depth: 1.8, bevelEnabled: false });
    const sRawI = new THREE.ExtrudeGeometry(sealInner, { depth: 3.4, bevelEnabled: false });
    sRawI.translate(0, 0, -0.5);
    gasketGeometry = subtractGeom(sRawO, sRawI);
    sRawO.dispose();
    sRawI.dispose();
    gasketGeometry.translate(0, outerD + 18, 0);
  }

  // 2. Exterior Ribs + Molded Fixed Dividers
  const baseParts: THREE.BufferGeometry[] = [baseGeom];
  const lidParts: THREE.BufferGeometry[] = [lidGeom];

  baseParts.push(...buildExteriorRibs(outerW, outerD, outerR, baseOuterH, options.ribCountPerSide, 'negY'));
  lidParts.push(...buildExteriorRibs(outerW, outerD, outerR, lidOuterH, options.ribCountPerSide, 'posY'));

  let dividersGeometry: THREE.BufferGeometry | null = null;
  if (options.dividerMode !== 'none' && (options.dividerCols > 1 || options.dividerRows > 1)) {
    const divT = 1.4;
    const divList: THREE.BufferGeometry[] = [];
    const divH = Math.max(6, options.baseDepthMm - 2.0);

    if (options.dividerMode === 'molded_fixed') {
      const z0 = floorZ - 0.1;
      const z1 = floorZ + divH;
      for (let c = 1; c < options.dividerCols; c++) {
        const dx = -innerW / 2 + (c * innerW) / options.dividerCols;
        divList.push(createBoxAt(dx - divT / 2, dx + divT / 2, -innerD / 2, innerD / 2, z0, z1));
      }
      for (let r = 1; r < options.dividerRows; r++) {
        const dy = -innerD / 2 + (r * innerD) / options.dividerRows;
        divList.push(createBoxAt(-innerW / 2, innerW / 2, dy - divT / 2, dy + divT / 2, z0, z1));
      }
      baseParts.push(...divList);
    } else {
      // Removable tray placed cleanly at -X beside base
      const trayW = innerW - 0.8;
      const trayD = innerD - 0.8;
      const trayFloor = 1.4;
      const trayCx = -(outerW / 2 + 14 + trayW / 2);

      // Floor + outer perimeter frame of removable divider tray
      divList.push(createBoxAt(trayCx - trayW / 2, trayCx + trayW / 2, -trayD / 2, trayD / 2, 0, trayFloor));
      divList.push(createBoxAt(trayCx - trayW / 2, trayCx - trayW / 2 + divT, -trayD / 2, trayD / 2, trayFloor, trayFloor + divH));
      divList.push(createBoxAt(trayCx + trayW / 2 - divT, trayCx + trayW / 2, -trayD / 2, trayD / 2, trayFloor, trayFloor + divH));
      divList.push(createBoxAt(trayCx - trayW / 2, trayCx + trayW / 2, -trayD / 2, -trayD / 2 + divT, trayFloor, trayFloor + divH));
      divList.push(createBoxAt(trayCx - trayW / 2, trayCx + trayW / 2, trayD / 2 - divT, trayD / 2, trayFloor, trayFloor + divH));

      for (let c = 1; c < options.dividerCols; c++) {
        const dx = trayCx - trayW / 2 + (c * trayW) / options.dividerCols;
        divList.push(createBoxAt(dx - divT / 2, dx + divT / 2, -trayD / 2, trayD / 2, trayFloor, trayFloor + divH));
      }
      for (let r = 1; r < options.dividerRows; r++) {
        const dy = -trayD / 2 + (r * trayD) / options.dividerRows;
        divList.push(createBoxAt(trayCx - trayW / 2, trayCx + trayW / 2, dy - divT / 2, dy + divT / 2, trayFloor, trayFloor + divH));
      }
      dividersGeometry = safeMerge(divList);
      divList.forEach((d) => d.dispose());
    }
  }

  // 3. Alternating Rear Hinge Knuckles (centered along Y = hingeCenterYMm)
  const knuckleTotalSpan = Math.min(innerW * 0.72, 110);
  const segCount = 5;
  const segW = (knuckleTotalSpan - (segCount - 1) * options.hingeClearanceMm) / segCount;
  const knuckleZBase = Math.max(hingeRadiusMm + 0.5, baseOuterH - hingeRadiusMm);
  const knuckleZLid = Math.max(hingeRadiusMm + 0.5, lidOuterH - hingeRadiusMm);

  for (let k = 0; k < segCount; k++) {
    const x0 = -knuckleTotalSpan / 2 + k * (segW + options.hingeClearanceMm);
    const x1 = x0 + segW;
    if (k % 2 === 0) {
      // Base knuckle (0, 2, 4) extending toward rear hingeCenterYMm from -outerD/2
      baseParts.push(createCylinderXAt(x0, x1, hingeCenterYMm, knuckleZBase, hingeRadiusMm, 20));
      baseParts.push(
        createBoxAt(x0, x1, hingeCenterYMm, -outerD / 2 + 0.4, knuckleZBase - hingeRadiusMm, knuckleZBase + hingeRadiusMm)
      );
    } else {
      // Lid knuckle (1, 3) built in Lid-local coordinates so translated by lidCenterY later it sits at hingeCenterYMm!
      const localHingeY = hingeCenterYMm - lidCenterY; // = -hingeCenterYMm > outerD/2
      lidParts.push(createCylinderXAt(x0, x1, localHingeY, knuckleZLid, hingeRadiusMm, 20));
      lidParts.push(
        createBoxAt(x0, x1, outerD / 2 - 0.4, localHingeY, knuckleZLid - hingeRadiusMm, knuckleZLid + hingeRadiusMm)
      );
    }
  }

  // Front catch keepers (+Y on base, -Y on flat-open lid so they align on closure)
  const latchXs = latchCount === 1 ? [0] : [-innerW * 0.28, innerW * 0.28];
  for (const lx of latchXs) {
    baseParts.push(createBoxAt(lx - 8, lx + 8, outerD / 2 - 0.2, outerD / 2 + 2.4, baseOuterH - 6.0, baseOuterH - 2.0));
    lidParts.push(createBoxAt(lx - 8, lx + 8, -outerD / 2 - 2.4, -outerD / 2 + 0.2, lidOuterH - 6.0, lidOuterH - 2.0));
  }

  let baseGeometry = safeMerge(baseParts);
  baseParts.forEach((p) => p.dispose());

  let lidGeometry = safeMerge(lidParts);
  lidParts.forEach((p) => p.dispose());

  // 4. Cut coaxial pin bores for M3 Screw (Ø3.45mm) or Filament Pin (Ø2.1mm)
  if (options.hingeType === 'm3_screw' || options.hingeType === 'filament_pin') {
    const boreR = options.hingeType === 'm3_screw' ? 1.725 : 1.05;
    const baseBore = createCylinderXAt(-knuckleTotalSpan * 0.55, knuckleTotalSpan * 0.55, hingeCenterYMm, knuckleZBase, boreR, 20);
    const carvedBase = subtractGeom(baseGeometry, baseBore);
    baseGeometry.dispose();
    baseBore.dispose();
    baseGeometry = carvedBase;

    const localLidHingeY = hingeCenterYMm - lidCenterY;
    const lidBore = createCylinderXAt(-knuckleTotalSpan * 0.55, knuckleTotalSpan * 0.55, localLidHingeY, knuckleZLid, boreR, 20);
    const carvedLid = subtractGeom(lidGeometry, lidBore);
    lidGeometry.dispose();
    lidBore.dispose();
    lidGeometry = carvedLid;
  }

  // Translate flat-open Lid into build plate (-Y across hinge axis) while guaranteeing z >= 0
  lidGeometry.translate(0, lidCenterY, 0);
  baseGeometry.computeBoundingBox();
  if (baseGeometry.boundingBox && Math.abs(baseGeometry.boundingBox.min.z) > 1e-4) {
    baseGeometry.translate(0, 0, -baseGeometry.boundingBox.min.z);
    baseGeometry.computeBoundingBox();
  }
  lidGeometry.computeBoundingBox();
  if (lidGeometry.boundingBox && Math.abs(lidGeometry.boundingBox.min.z) > 1e-4) {
    lidGeometry.translate(0, 0, -lidGeometry.boundingBox.min.z);
    lidGeometry.computeBoundingBox();
  }

  // 5. Printable Compliant Front Latches (placed flat at Z = 0 to the +X right of Base)
  const latchGeoms = latchXs.map((_, idx) =>
    buildLatchGeometry(
      options.latchType,
      outerW / 2 + 24,
      (idx - (latchXs.length - 1) / 2) * 32,
      Math.max(22, (baseOuterH + lidOuterH) * 0.42)
    )
  );
  const latchesGeometry = safeMerge(latchGeoms);
  latchGeoms.forEach((l) => l.dispose());
  latchesGeometry.computeBoundingBox();

  // 6. Embossed Front Nameplate Label (+Y front center face of Base)
  let labelGeometry: THREE.BufferGeometry | null = null;
  if (options.frontLabelText && options.frontLabelText.trim().length > 0) {
    const plate = buildTextStrokes(options.frontLabelText, innerW * 0.52, 9.0, 0.7);
    if (plate) {
      plate.rotateX(Math.PI / 2);
      plate.rotateZ(Math.PI);
      plate.translate(0, outerD / 2 - 0.15, baseOuterH * 0.5);
      plate.computeBoundingBox();
      labelGeometry = plate;
    }
  }

  // Volume estimate from outer shell + ribs + latches
  const shellVolMm3 =
    (outerW * outerD - innerW * innerD) * (options.baseDepthMm + options.lidDepthMm) +
    outerW * outerD * (floorZ + lidFloorZ) +
    options.ribCountPerSide * 4 * 4.5 * 2.5 * (options.baseDepthMm * 0.85) +
    latchCount * 1600;
  const divVolMm3 = options.dividerMode !== 'none' ? (options.dividerCols + options.dividerRows - 2) * 1.4 * innerW * 12 : 0;
  const gasketVolMm3 = options.includeGasketChannel ? 2 * (outerW + outerD) * 4.2 : 0;
  const estimatedVolumeCm3 = Number(
    Math.max(8, (shellVolMm3 + divVolMm3 + gasketVolMm3) / 1000).toFixed(2)
  );

  const dispose = () => {
    baseGeometry.dispose();
    lidGeometry.dispose();
    latchesGeometry.dispose();
    dividersGeometry?.dispose();
    gasketGeometry?.dispose();
    labelGeometry?.dispose();
  };

  return {
    baseGeometry,
    lidGeometry,
    latchesGeometry,
    dividersGeometry,
    gasketGeometry,
    labelGeometry,
    layoutMeta: {
      outerWidthMm: outerW,
      outerDepthMm: outerD,
      closedHeightMm,
      innerCavityVolumeCm3,
      hingeCenterYMm,
      latchCount,
      estimatedVolumeCm3,
    },
    dispose,
  };
}

function getAllActiveGeometries(parts: RuggedBoxParts): THREE.BufferGeometry[] {
  const list: THREE.BufferGeometry[] = [
    parts.baseGeometry,
    parts.lidGeometry,
    parts.latchesGeometry,
  ];
  if (parts.dividersGeometry) list.push(parts.dividersGeometry);
  if (parts.gasketGeometry) list.push(parts.gasketGeometry);
  if (parts.labelGeometry) list.push(parts.labelGeometry);
  return list;
}

function countTriangles(geom: THREE.BufferGeometry): number {
  const idx = geom.getIndex();
  if (idx) return Math.floor(idx.count / 3);
  const pos = geom.getAttribute('position');
  return pos ? Math.floor(pos.count / 3) : 0;
}

/**
 * Computes single-pass physical, print-bed, and slicing telemetry directly from already-built parts.
 */
export function calculateRuggedBoxMetrics(
  _options: RuggedHingedBoxOptions,
  parts: RuggedBoxParts
): RuggedBoxMetrics {
  const plateBox = new THREE.Box3();
  let triangleCount = 0;

  for (const geom of getAllActiveGeometries(parts)) {
    triangleCount += countTriangles(geom);
    geom.computeBoundingBox();
    if (geom.boundingBox && !geom.boundingBox.isEmpty()) {
      plateBox.union(geom.boundingBox);
    }
  }

  const plateSize = new THREE.Vector3();
  if (!plateBox.isEmpty()) {
    plateBox.getSize(plateSize);
  }

  const flatPlateWidthMm = Number(plateSize.x.toFixed(1));
  const flatPlateDepthMm = Number(plateSize.y.toFixed(1));
  const estimatedVolumeCm3 = parts.layoutMeta.estimatedVolumeCm3;
  const estimatedWeightG = Number((estimatedVolumeCm3 * 1.24).toFixed(1));
  const estimatedPrintTimeHours = Number(
    Math.max(0.4, estimatedWeightG / 20 + parts.layoutMeta.closedHeightMm * 0.015).toFixed(2)
  );
  const exceedsStandardBed =
    flatPlateWidthMm > STANDARD_BED_SIZE_MM || flatPlateDepthMm > STANDARD_BED_SIZE_MM;

  return {
    outerWidthMm: parts.layoutMeta.outerWidthMm,
    outerDepthMm: parts.layoutMeta.outerDepthMm,
    closedHeightMm: parts.layoutMeta.closedHeightMm,
    flatPlateWidthMm,
    flatPlateDepthMm,
    triangleCount,
    estimatedVolumeCm3,
    estimatedWeightG,
    estimatedPrintTimeHours,
    exceedsStandardBed,
  };
}

/**
 * Encodes all active parts into a valid binary little-endian .STL ArrayBuffer.
 */
export function exportToBinaryStl(parts: RuggedBoxParts): ArrayBuffer {
  const geoms = getAllActiveGeometries(parts);
  let totalTris = 0;
  for (const g of geoms) totalTris += countTriangles(g);

  const buffer = new ArrayBuffer(84 + totalTris * 50);
  const view = new DataView(buffer);

  // Header must NOT start with 'solid ' to guarantee binary STL parsing across slicers
  const header = 'PrivKnife Binary STL - Parametric Rugged Hinged Box Maker';
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }
  view.setUint32(80, totalTris, true);

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();

  let offset = 84;
  for (const geom of geoms) {
    const pos = geom.getAttribute('position');
    if (!pos) continue;
    const idx = geom.getIndex();
    const triCount = countTriangles(geom);

    for (let t = 0; t < triCount; t++) {
      const i0 = idx ? idx.getX(t * 3) : t * 3;
      const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;

      a.set(pos.getX(i0), pos.getY(i0), pos.getZ(i0));
      b.set(pos.getX(i1), pos.getY(i1), pos.getZ(i1));
      c.set(pos.getX(i2), pos.getY(i2), pos.getZ(i2));

      cb.subVectors(c, b);
      ab.subVectors(a, b);
      cb.cross(ab).normalize();

      view.setFloat32(offset, Number.isFinite(cb.x) ? cb.x : 0, true);
      view.setFloat32(offset + 4, Number.isFinite(cb.y) ? cb.y : 0, true);
      view.setFloat32(offset + 8, Number.isFinite(cb.z) ? cb.z : 1, true);

      view.setFloat32(offset + 12, a.x, true);
      view.setFloat32(offset + 16, a.y, true);
      view.setFloat32(offset + 20, a.z, true);

      view.setFloat32(offset + 24, b.x, true);
      view.setFloat32(offset + 28, b.y, true);
      view.setFloat32(offset + 32, b.z, true);

      view.setFloat32(offset + 36, c.x, true);
      view.setFloat32(offset + 40, c.y, true);
      view.setFloat32(offset + 44, c.z, true);

      view.setUint16(offset + 48, 0, true);
      offset += 50;
    }
  }

  return buffer;
}

function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function to3mfColor(hex: string, fallback: string): string {
  const clean = (hex || '').trim().replace(/^#/, '');
  return /^[0-9a-fA-F]{6}$/.test(clean) ? `#${clean.toUpperCase()}FF` : fallback;
}

function serialize3mfObject(
  geom: THREE.BufferGeometry,
  id: number,
  name: string,
  materialIndex: number
): string {
  const pos = geom.getAttribute('position');
  const idx = geom.getIndex();
  const vCount = pos ? pos.count : 0;
  const tCount = countTriangles(geom);

  const verts: string[] = [];
  for (let i = 0; i < vCount; i++) {
    verts.push(
      `          <vertex x="${pos.getX(i).toFixed(3)}" y="${pos.getY(i).toFixed(3)}" z="${pos.getZ(i).toFixed(3)}" />`
    );
  }
  const tris: string[] = [];
  for (let t = 0; t < tCount; t++) {
    const v1 = idx ? idx.getX(t * 3) : t * 3;
    const v2 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
    const v3 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    tris.push(`          <triangle v1="${v1}" v2="${v2}" v3="${v3}" />`);
  }

  return `    <object id="${id}" name="${escapeXml(name)}" pid="1" pindex="${materialIndex}" type="model">
      <mesh>
        <vertices>
${verts.join('\n')}
        </vertices>
        <triangles>
${tris.join('\n')}
        </triangles>
      </mesh>
    </object>`;
}

/**
 * Exports all active parts as a multi-material OPC .3MF archive separating Shell, Latches,
 * Dividers, TPU Gasket Seal, and Embossed Nameplate Label.
 */
export async function exportTo3mf(
  options: RuggedHingedBoxOptions,
  parts: RuggedBoxParts
): Promise<Blob> {
  const bodyColor = to3mfColor(options.bodyColorHex, '#3B82F6FF');
  const accentColor = to3mfColor(options.accentColorHex, '#F97316FF');

  const objects: string[] = [];
  const items: string[] = [];
  let nextId = 2;

  const pushObj = (geom: THREE.BufferGeometry | null, name: string, matIdx: number) => {
    if (!geom || countTriangles(geom) === 0) return;
    const id = nextId++;
    objects.push(serialize3mfObject(geom, id, name, matIdx));
    items.push(`    <item objectid="${id}" />`);
  };

  pushObj(parts.baseGeometry, 'Bottom Box Shell', 0);
  pushObj(parts.lidGeometry, 'Hinged Lid Shell', 0);
  pushObj(parts.latchesGeometry, 'Compliant Latches', 1);
  pushObj(parts.dividersGeometry, 'Removable Divider Tray', 0);
  pushObj(parts.gasketGeometry, 'TPU Gasket Seal', 2);
  pushObj(
    parts.labelGeometry,
    `Embossed Label (${options.frontLabelText.trim() || 'Label'})`,
    1
  );

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">${escapeXml(`Rugged Box ${options.innerLengthMm}x${options.innerWidthMm}x${options.baseDepthMm}mm`)}</metadata>
  <metadata name="Application">PrivKnife Client-Side 3D Studio</metadata>
  <resources>
    <basematerials id="1">
      <base name="Shell Filament (PETG/PLA)" displaycolor="${bodyColor}" />
      <base name="Accent Latch/Label Filament" displaycolor="${accentColor}" />
      <base name="Flexible TPU Gasket" displaycolor="#0EA5E9FF" />
    </basematerials>
${objects.join('\n')}
  </resources>
  <build>
${items.join('\n')}
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

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'model/3mf',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

export function buildRuggedBoxFileBase(options: RuggedHingedBoxOptions): string {
  return `privknife-rugged-box-${Math.round(options.innerLengthMm)}x${Math.round(
    options.innerWidthMm
  )}x${Math.round(options.baseDepthMm)}mm`;
}
