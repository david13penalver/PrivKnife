import * as THREE from 'three';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import JSZip from 'jszip';
import {
  BATTERY_CELL_SPECS,
  BatteryCaseMetrics,
  BatteryCaseParts,
  BatteryCaseValidationResult,
  BatteryCellPreset,
  BatterySdcardCaseOptions,
  CardCaseStyle,
  DispenserMountStyle,
  MEDIA_SLOT_SPECS,
  MediaSlotSpec,
  STANDARD_BED_SIZE_MM,
} from './types';

const VALID_CELL_PRESETS = new Set<BatteryCellPreset>([
  'aaa',
  'aa',
  'c',
  'cr2032',
  '9v',
  '18650',
  '21700',
]);
const VALID_MOUNT_STYLES = new Set<DispenserMountStyle>([
  'desk',
  'wall_keyhole',
  'skadis',
  'magnetic',
]);
const VALID_CASE_STYLES = new Set<CardCaseStyle>([
  'sliding_dovetail',
  'snap_clamshell',
  'open_tray',
]);

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
  '#': [[[0.3, 0], [0.3, 1]], [[0.7, 0], [0.7, 1]], [[0.1, 0.35], [0.9, 0.35]], [[0.1, 0.65], [0.9, 0.65]]],
};

function isFiniteIntInRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function isFiniteNumInRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

/**
 * Validates battery dispenser and memory card case options before mesh generation.
 */
export function validateBatteryCaseOptions(
  options: BatterySdcardCaseOptions
): BatteryCaseValidationResult {
  if (!options || typeof options !== 'object') {
    return { valid: false, error: 'Configuration options are required.' };
  }

  if (options.mode !== 'battery_dispenser' && options.mode !== 'memory_card_case') {
    return { valid: false, error: 'Unsupported generator mode.' };
  }

  if (!isFiniteNumInRange(options.wallThicknessMm, 1.4, 4.0)) {
    return { valid: false, error: 'Wall thickness must be between 1.4 and 4.0 mm.' };
  }

  if (!isFiniteNumInRange(options.fitToleranceMm, 0.15, 0.6)) {
    return { valid: false, error: 'Fit tolerance must be between 0.15 and 0.60 mm.' };
  }

  if (typeof options.labelText === 'string' && options.labelText.trim().length > 18) {
    return { valid: false, error: 'Embossed label text cannot exceed 18 characters.' };
  }

  if (options.mode === 'battery_dispenser') {
    if (!VALID_CELL_PRESETS.has(options.cellPreset)) {
      return { valid: false, error: 'Invalid battery cell preset selected.' };
    }
    if (!isFiniteIntInRange(options.stackCount, 4, 24)) {
      return { valid: false, error: 'Battery stack count must be an integer between 4 and 24.' };
    }
    if (!isFiniteNumInRange(options.rampAngleDeg, 12, 30)) {
      return { valid: false, error: 'Gravity chute ramp angle must be between 12° and 30°.' };
    }
    if (!VALID_MOUNT_STYLES.has(options.mountStyle)) {
      return { valid: false, error: 'Invalid dispenser mount style selected.' };
    }
    return { valid: true };
  }

  if (!VALID_CASE_STYLES.has(options.cardCaseStyle)) {
    return { valid: false, error: 'Invalid memory card case style selected.' };
  }

  const slotChecks: Array<[number, number, string]> = [
    [options.sdSlots, 16, 'SD'],
    [options.microSdSlots, 24, 'MicroSD'],
    [options.cfExpressSlots, 8, 'CFexpress'],
    [options.switchCartSlots, 12, 'Switch cartridge'],
    [options.usbASlots, 8, 'USB-A'],
    [options.usbCSlots, 8, 'USB-C'],
  ];

  for (const [val, max, name] of slotChecks) {
    if (!isFiniteIntInRange(val, 0, max)) {
      return { valid: false, error: `${name} slot count must be an integer between 0 and ${max}.` };
    }
  }

  const totalSlots =
    options.sdSlots +
    options.microSdSlots +
    options.cfExpressSlots +
    options.switchCartSlots +
    options.usbASlots +
    options.usbCSlots;

  if (totalSlots < 1) {
    return {
      valid: false,
      error: 'Configure at least 1 memory card or USB slot before generating a case.',
    };
  }

  return { valid: true };
}

function normalizeForMergeOrCsg(geom: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geom.index ? geom.toNonIndexed() : geom.clone();
  for (const key of Object.keys(g.attributes)) {
    if (key !== 'position' && key !== 'normal') {
      g.deleteAttribute(key);
    }
  }
  if (!g.getAttribute('normal')) {
    g.computeVertexNormals();
  }
  return g;
}

function safeMerge(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geometries.length === 0) return new THREE.BufferGeometry();
  const normalized = geometries.map((g) => normalizeForMergeOrCsg(g));
  try {
    if (normalized.length === 1) {
      return normalized[0].clone();
    }
    const merged = BufferGeometryUtils.mergeGeometries(normalized, false);
    return merged ?? new THREE.BufferGeometry();
  } finally {
    normalized.forEach((g) => g.dispose());
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
  return normalizeForMergeOrCsg(g);
}

function createCylinderZAt(
  cx: number,
  cy: number,
  minZ: number,
  maxZ: number,
  radius: number,
  segments = 24
): THREE.BufferGeometry {
  const h = Math.max(0.05, maxZ - minZ);
  const g = new THREE.CylinderGeometry(radius, radius, h, segments);
  g.rotateX(Math.PI / 2);
  g.translate(cx, cy, (minZ + maxZ) / 2);
  return normalizeForMergeOrCsg(g);
}

function createRoundedRectShape(width: number, depth: number, radius: number): THREE.Shape {
  const hw = width / 2;
  const hd = depth / 2;
  const r = Math.min(Math.max(0.4, radius), hw * 0.45, hd * 0.45);
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

function subtractGeometries(
  baseGeom: THREE.BufferGeometry,
  cutterGeom: THREE.BufferGeometry
): THREE.BufferGeometry {
  const cleanBase = normalizeForMergeOrCsg(baseGeom);
  const cleanCutter = normalizeForMergeOrCsg(cutterGeom);
  const evaluator = new Evaluator();
  evaluator.attributes = ['position', 'normal'];
  evaluator.useGroups = false;

  const baseBrush = new Brush(cleanBase);
  const cutterBrush = new Brush(cleanCutter);
  baseBrush.updateMatrixWorld();
  cutterBrush.updateMatrixWorld();

  try {
    const resultBrush = evaluator.evaluate(baseBrush, cutterBrush, SUBTRACTION);
    return normalizeForMergeOrCsg(resultBrush.geometry);
  } finally {
    cleanBase.dispose();
    cleanCutter.dispose();
  }
}

function createExtrudedShapeYZ(
  pointsYZ: Array<[number, number]>,
  minX: number,
  maxX: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  pointsYZ.forEach(([y, z], idx) => {
    if (idx === 0) shape.moveTo(y, z);
    else shape.lineTo(y, z);
  });
  shape.closePath();

  const raw = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.1, maxX - minX),
    bevelEnabled: false,
  });
  // Map shape X -> world Y, shape Y -> world Z, extrude Z -> world X
  raw.rotateY(Math.PI / 2);
  raw.rotateX(Math.PI / 2);
  // Wait: verify transform using Matrix4 cleanly to avoid axis ambiguity!
  raw.dispose();

  const raw2 = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.1, maxX - minX),
    bevelEnabled: false,
  });
  // Local coords of ExtrudeGeometry: (shapeX, shapeY, extrudeZ in [0, depth])
  // We want: worldX = minX + extrudeZ, worldY = shapeX, worldZ = shapeY
  const mat = new THREE.Matrix4().set(
    0, 0, 1, minX,
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 0, 1
  );
  raw2.applyMatrix4(mat);
  raw2.computeVertexNormals();
  return normalizeForMergeOrCsg(raw2);
}

function buildStrokeTextGeometry(
  rawText: string,
  maxWidthMm: number,
  desiredHeightMm: number,
  raiseMm: number
): THREE.BufferGeometry | null {
  const clean = rawText.replace(/µ/g, 'U').toUpperCase().trim();
  if (!clean) return null;

  const charCount = clean.length;
  const maxCharH = Math.min(desiredHeightMm, maxWidthMm / (charCount * 0.85));
  const charH = Math.max(3.2, maxCharH);
  const charW = charH * 0.62;
  const spacing = charW * 0.26;
  const strokeW = Math.max(0.65, charH * 0.14);

  const totalW = charCount * charW + Math.max(0, charCount - 1) * spacing;
  const scaleFactor = totalW > maxWidthMm ? maxWidthMm / totalW : 1;
  const wScaled = charW * scaleFactor;
  const hScaled = charH * scaleFactor;
  const spScaled = spacing * scaleFactor;
  const stScaled = Math.max(0.55, strokeW * scaleFactor);

  const actualTotalW = charCount * wScaled + Math.max(0, charCount - 1) * spScaled;
  let cursorX = -actualTotalW / 2;

  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const strokes = FONT_GLYPHS[ch];
    if (strokes) {
      for (const [p1, p2] of strokes) {
        const x1 = cursorX + p1[0] * wScaled;
        const y1 = (p1[1] - 0.5) * hScaled;
        const x2 = cursorX + p2[0] * wScaled;
        const y2 = (p2[1] - 0.5) * hScaled;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const halfT = stScaled / 2;

        const segShape = new THREE.Shape();
        segShape.moveTo(-halfT, -halfT);
        segShape.lineTo(len + halfT, -halfT);
        segShape.lineTo(len + halfT, halfT);
        segShape.lineTo(-halfT, halfT);
        segShape.closePath();

        const g = new THREE.ExtrudeGeometry(segShape, {
          depth: raiseMm,
          bevelEnabled: false,
        });
        g.rotateZ(angle);
        g.translate(x1, y1, 0);
        parts.push(g);
      }
    }
    cursorX += wScaled + spScaled;
  }

  if (parts.length === 0) return null;
  const merged = safeMerge(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

function buildBatteryDispenserParts(options: BatterySdcardCaseOptions): BatteryCaseParts {
  const spec = BATTERY_CELL_SPECS[options.cellPreset];
  const wall = options.wallThicknessMm;
  const tol = options.fitToleranceMm;

  const innerChuteWidthMm = Number((spec.chuteSpanMm + 2 * Math.max(tol, 0.35)).toFixed(2));
  const chuteChannelDepthMm = Number((spec.chuteDepthMm + 2 * Math.max(tol, 0.45)).toFixed(2));
  const outerW = innerChuteWidthMm + 2 * wall;
  const halfOuterW = outerW / 2;
  const halfInnerW = innerChuteWidthMm / 2;

  const trayDepth = Math.max(16, 1.55 * spec.chuteDepthMm);
  const frontLipH = Math.max(4.5, 0.42 * spec.chuteDepthMm);

  const yRearOuter = chuteChannelDepthMm / 2 + wall;
  const yRearInner = chuteChannelDepthMm / 2;
  const yMagFrontInner = -chuteChannelDepthMm / 2;
  const yMagFrontOuter = yMagFrontInner - wall;
  const yTrayFrontInner = yMagFrontInner - trayDepth;
  const yTrayFrontOuter = yTrayFrontInner - wall;

  const theta = (options.rampAngleDeg * Math.PI) / 180;
  const rampRun = yRearInner - yTrayFrontInner;
  const rampRise = Math.min(rampRun * Math.tan(theta), 16);

  const exitClearance =
    (spec.shape === 'coin' ? spec.lengthMm * 1.45 + 1.5 : spec.chuteDepthMm) +
    2 * Math.max(tol, 0.45);
  const magFrontStartZ = wall + rampRise * 0.42 + exitClearance;
  const totalH = magFrontStartZ + options.stackCount * spec.stackPitchMm + wall;

  const solids: THREE.BufferGeometry[] = [];
  const cutters: THREE.BufferGeometry[] = [];

  const baseFloorThick = options.mountStyle === 'magnetic' ? Math.max(wall, 3.6) : wall;
  const baseBackExtY = options.mountStyle === 'desk' ? yRearOuter + 8.0 : yRearOuter;

  // 1. Base plate
  solids.push(createBoxAt(-halfOuterW, halfOuterW, yTrayFrontOuter, baseBackExtY, 0, baseFloorThick));

  // 2. Side walls spanning base + magazine + tray lip contour
  const sideProfile: Array<[number, number]> = [
    [yTrayFrontOuter, 0],
    [yRearOuter, 0],
    [yRearOuter, totalH],
    [yMagFrontOuter, totalH],
    [yMagFrontOuter, magFrontStartZ * 0.72],
    [yTrayFrontOuter, baseFloorThick + frontLipH + 4],
    [yTrayFrontOuter, 0],
  ];
  solids.push(createExtrudedShapeYZ(sideProfile, -halfOuterW, -halfInnerW));
  solids.push(createExtrudedShapeYZ(sideProfile, halfInnerW, halfOuterW));

  // 3. Rear wall
  const rearWallExtraT = options.mountStyle === 'wall_keyhole' ? 1.8 : 0;
  solids.push(
    createBoxAt(
      -halfInnerW - wall * 0.1,
      halfInnerW + wall * 0.1,
      yRearInner,
      yRearOuter + rearWallExtraT,
      baseFloorThick,
      totalH
    )
  );

  // 4. Internal gravity ramp wedge (support-free 12..30° chute floor)
  const rampProfile: Array<[number, number]> = [
    [yTrayFrontInner, baseFloorThick],
    [yRearInner, baseFloorThick],
    [yRearInner, baseFloorThick + rampRise],
    [yTrayFrontInner, baseFloorThick + 0.5],
  ];
  solids.push(createExtrudedShapeYZ(rampProfile, -halfInnerW, halfInnerW));

  // 5. Front tray catch lip
  solids.push(
    createBoxAt(
      -halfInnerW,
      halfInnerW,
      yTrayFrontOuter,
      yTrayFrontInner,
      baseFloorThick,
      baseFloorThick + frontLipH
    )
  );

  // 6. Front magazine wall + optional viewing slot
  const topHeaderH = Math.max(8, wall * 3.5);
  const topHeaderZ0 = Math.max(magFrontStartZ + 4, totalH - topHeaderH);

  if (options.includeViewSlot && topHeaderZ0 > magFrontStartZ + 8) {
    const viewSlotW = Math.min(Math.max(5.5, 0.22 * spec.chuteSpanMm), innerChuteWidthMm * 0.48);
    const colW = (innerChuteWidthMm - viewSlotW) / 2;
    solids.push(
      createBoxAt(-halfInnerW, -halfInnerW + colW, yMagFrontOuter, yMagFrontInner, magFrontStartZ, topHeaderZ0)
    );
    solids.push(
      createBoxAt(halfInnerW - colW, halfInnerW, yMagFrontOuter, yMagFrontInner, magFrontStartZ, topHeaderZ0)
    );
    solids.push(createBoxAt(-halfInnerW, halfInnerW, yMagFrontOuter, yMagFrontInner, topHeaderZ0, totalH));
  } else {
    solids.push(createBoxAt(-halfInnerW, halfInnerW, yMagFrontOuter, yMagFrontInner, magFrontStartZ, totalH));
  }

  // 7. Mount-specific geometry
  if (options.mountStyle === 'wall_keyhole') {
    const holeZs = totalH > 85 ? [totalH * 0.35, totalH * 0.78] : [totalH * 0.58];
    const holeXs = innerChuteWidthMm >= 34 ? [-innerChuteWidthMm * 0.25, innerChuteWidthMm * 0.25] : [0];
    for (const hz of holeZs) {
      for (const hx of holeXs) {
        const gHole = new THREE.CylinderGeometry(3.8, 3.8, wall + rearWallExtraT + 4, 20);
        gHole.translate(hx, yRearInner + (wall + rearWallExtraT) / 2, hz - 3.5);
        cutters.push(normalizeForMergeOrCsg(gHole));

        const gSlot = createBoxAt(hx - 2.1, hx + 2.1, yRearInner - 1, yRearOuter + rearWallExtraT + 2, hz - 3.5, hz + 6.0);
        cutters.push(gSlot);
      }
    }
  } else if (options.mountStyle === 'skadis') {
    const hookXs = outerW >= 50 ? [-20, 20] : [0];
    const hookZs = totalH > 95 ? [totalH * 0.32, totalH * 0.76] : [totalH * 0.65];
    for (const hz of hookZs) {
      for (const hx of hookXs) {
        // Horizontal standoff peg protruding +Y then curving down into Skadis L-hook
        solids.push(createBoxAt(hx - 2.4, hx + 2.4, yRearOuter, yRearOuter + 5.2, hz - 3.5, hz + 3.5));
        solids.push(createBoxAt(hx - 2.4, hx + 2.4, yRearOuter + 5.2, yRearOuter + 9.0, hz - 8.5, hz + 3.5));
      }
    }
  } else if (options.mountStyle === 'magnetic') {
    const magXs = outerW >= 42 ? [-outerW * 0.26, outerW * 0.26] : [0];
    const magY = (yTrayFrontOuter + yRearOuter) / 2;
    for (const mx of magXs) {
      cutters.push(createCylinderZAt(mx, magY, -0.5, 2.2, 5.2, 24));
    }
  }

  let bodyGeometry = safeMerge(solids);
  solids.forEach((s) => s.dispose());

  if (cutters.length > 0) {
    const cutterMerged = safeMerge(cutters);
    cutters.forEach((c) => c.dispose());
    const subtracted = subtractGeometries(bodyGeometry, cutterMerged);
    bodyGeometry.dispose();
    cutterMerged.dispose();
    bodyGeometry = subtracted;
  }

  // Ensure exact z=0 floor seating
  bodyGeometry.computeBoundingBox();
  if (bodyGeometry.boundingBox) {
    const dz = -bodyGeometry.boundingBox.min.z;
    if (Math.abs(dz) > 1e-4) {
      bodyGeometry.translate(0, 0, dz);
      bodyGeometry.computeBoundingBox();
    }
  }

  // 8. Procedural dual-color embossed label on front upper magazine face
  let labelGeometry: THREE.BufferGeometry | null = null;
  if (options.includeEmbossedLabel && options.labelText.trim().length > 0) {
    const textG = buildStrokeTextGeometry(
      options.labelText,
      innerChuteWidthMm * 0.8,
      Math.min(10, Math.max(5, topHeaderH * 0.75)),
      0.6
    );
    if (textG) {
      // Stroke glyph is centered around XY plane rising +Z. Orient upright facing -Y front!
      textG.rotateX(Math.PI / 2);
      const labelZ = (topHeaderZ0 + totalH) / 2;
      textG.translate(0, yMagFrontOuter + 0.15, labelZ);
      textG.computeBoundingBox();
      labelGeometry = textG;
    }
  }

  // Estimate geometric shell volume from bounding dimensions and solids factor (~36% fill)
  bodyGeometry.computeBoundingBox();
  const bb = bodyGeometry.boundingBox!;
  const wCm = (bb.max.x - bb.min.x) / 10;
  const dCm = (bb.max.y - bb.min.y) / 10;
  const hCm = (bb.max.z - bb.min.z) / 10;
  const estimatedVolumeCm3 = Number(Math.max(4, wCm * dCm * hCm * 0.28).toFixed(2));

  const dispose = () => {
    bodyGeometry.dispose();
    labelGeometry?.dispose();
  };

  return {
    bodyGeometry,
    lidGeometry: null,
    labelGeometry,
    layoutMeta: {
      innerChuteWidthMm,
      chuteChannelDepthMm,
      estimatedVolumeCm3,
      lidOffsetXMm: 0,
    },
    dispose,
  };
}

interface PlacedMediaSlot {
  spec: MediaSlotSpec;
  cx: number;
  cy: number;
  sx: number;
  sy: number;
  pocketDepth: number;
  protrusion: number;
}

function packMediaSlots(options: BatterySdcardCaseOptions, dividerMm: number): {
  slots: PlacedMediaSlot[];
  innerW: number;
  innerD: number;
  maxPocketDepth: number;
  maxProtrusion: number;
} {
  const counts: Array<{ spec: MediaSlotSpec; count: number }> = [
    { spec: MEDIA_SLOT_SPECS.cfExpress, count: options.cfExpressSlots },
    { spec: MEDIA_SLOT_SPECS.sd, count: options.sdSlots },
    { spec: MEDIA_SLOT_SPECS.switchCart, count: options.switchCartSlots },
    { spec: MEDIA_SLOT_SPECS.usbA, count: options.usbASlots },
    { spec: MEDIA_SLOT_SPECS.usbC, count: options.usbCSlots },
    { spec: MEDIA_SLOT_SPECS.microSd, count: options.microSdSlots },
  ].filter((entry) => entry.count > 0);

  const tol = options.fitToleranceMm;
  const rawSlots: PlacedMediaSlot[] = [];

  // Target balanced aspect ratio across groups
  let cursorY = 0;
  let globalMaxX = 0;

  for (const group of counts) {
    const sx = Number((group.spec.widthMm + tol).toFixed(2));
    const sy = Number((group.spec.thicknessMm + tol).toFixed(2));
    const pocketDepth = Number(Math.min(group.spec.depthMm * 0.65, 16).toFixed(2));
    const protrusion = Number(Math.max(4.5, group.spec.depthMm - pocketDepth + 1.5).toFixed(2));

    // Determine multi-column layout for narrow items (MicroSD, USB-A, USB-C) or high slot counts
    let cols = 1;
    if (group.count >= 6 && sx <= 14) {
      cols = Math.min(4, Math.ceil(Math.sqrt(group.count)));
    } else if (group.count >= 4 && sx <= 26) {
      cols = 2;
    } else if (group.count >= 8) {
      cols = 2;
    }
    const rows = Math.ceil(group.count / cols);
    const groupWidth = cols * sx + (cols - 1) * dividerMm;
    globalMaxX = Math.max(globalMaxX, groupWidth);

    for (let idx = 0; idx < group.count; idx++) {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const localX = -groupWidth / 2 + sx / 2 + col * (sx + dividerMm);
      const localY = cursorY + sy / 2 + row * (sy + dividerMm);

      rawSlots.push({
        spec: group.spec,
        cx: localX,
        cy: localY,
        sx,
        sy,
        pocketDepth,
        protrusion,
      });
    }

    cursorY += rows * sy + Math.max(0, rows - 1) * dividerMm + dividerMm;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let maxPocketDepth = 8;
  let maxProtrusion = 6;

  for (const s of rawSlots) {
    minX = Math.min(minX, s.cx - s.sx / 2);
    maxX = Math.max(maxX, s.cx + s.sx / 2);
    minY = Math.min(minY, s.cy - s.sy / 2);
    maxY = Math.max(maxY, s.cy + s.sy / 2);
    maxPocketDepth = Math.max(maxPocketDepth, s.pocketDepth);
    maxProtrusion = Math.max(maxProtrusion, s.protrusion);
  }

  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  for (const s of rawSlots) {
    s.cx -= midX;
    s.cy -= midY;
  }

  return {
    slots: rawSlots,
    innerW: maxX - minX,
    innerD: maxY - minY,
    maxPocketDepth,
    maxProtrusion,
  };
}

function buildMemoryCardCaseParts(options: BatterySdcardCaseOptions): BatteryCaseParts {
  const wall = options.wallThicknessMm;
  const tol = options.fitToleranceMm;
  // Minimum divider wall floor >= 1.2mm to prevent MicroSD divider delamination
  const minDividerWallMm = Number(Math.max(1.2, Math.min(wall, 1.6)).toFixed(2));

  const packed = packMediaSlots(options, minDividerWallMm);
  const padX = Math.max(3.2, wall * 1.4);
  const padY = Math.max(3.2, wall * 1.4);
  const outerW = packed.innerW + 2 * padX;
  const outerD = packed.innerD + 2 * padY;
  const floorZ = Math.max(2.0, wall);
  const bodyTopZ = floorZ + packed.maxPocketDepth;

  // Create rounded base shell blank
  const shellShape = createRoundedRectShape(outerW, outerD, 3.0);
  const rawShell = new THREE.ExtrudeGeometry(shellShape, {
    depth: bodyTopZ,
    bevelEnabled: false,
  });
  let bodyGeometry = normalizeForMergeOrCsg(rawShell);
  rawShell.dispose();

  // Optional structural dovetail guide rails or clamshell hinge knuckles on body
  const extras: THREE.BufferGeometry[] = [bodyGeometry];
  if (options.cardCaseStyle === 'sliding_dovetail') {
    const railH = Math.max(2.2, packed.maxProtrusion * 0.45);
    const railOverhang = 1.4;
    // Left and right upper dovetail rail shoulders
    extras.push(
      createBoxAt(
        -outerW / 2 - railOverhang,
        -outerW / 2 + 0.3,
        -outerD / 2,
        outerD / 2,
        bodyTopZ - railH,
        bodyTopZ
      )
    );
    extras.push(
      createBoxAt(
        outerW / 2 - 0.3,
        outerW / 2 + railOverhang,
        -outerD / 2,
        outerD / 2,
        bodyTopZ - railH,
        bodyTopZ
      )
    );
  } else if (options.cardCaseStyle === 'snap_clamshell') {
    const knuckleR = 2.6;
    const kw = Math.min(10, outerW * 0.22);
    extras.push(createBoxAt(-outerW * 0.32 - kw / 2, -outerW * 0.32 + kw / 2, outerD / 2 - 0.3, outerD / 2 + knuckleR * 1.6, bodyTopZ - knuckleR * 2, bodyTopZ));
    extras.push(createBoxAt(outerW * 0.32 - kw / 2, outerW * 0.32 + kw / 2, outerD / 2 - 0.3, outerD / 2 + knuckleR * 1.6, bodyTopZ - knuckleR * 2, bodyTopZ));
  }

  if (extras.length > 1) {
    const mergedBody = safeMerge(extras);
    extras.forEach((e) => e.dispose());
    bodyGeometry = mergedBody;
  }

  // Merge all disjoint card pocket cutters and subtract in ONE BVH-CSG pass
  const pocketCutters = packed.slots.map((s) =>
    createBoxAt(
      s.cx - s.sx / 2,
      s.cx + s.sx / 2,
      s.cy - s.sy / 2,
      s.cy + s.sy / 2,
      bodyTopZ - s.pocketDepth,
      bodyTopZ + 2.0
    )
  );
  const mergedCutter = safeMerge(pocketCutters);
  pocketCutters.forEach((c) => c.dispose());

  const subtractedBody = subtractGeometries(bodyGeometry, mergedCutter);
  bodyGeometry.dispose();
  mergedCutter.dispose();
  bodyGeometry = subtractedBody;

  bodyGeometry.computeBoundingBox();
  if (bodyGeometry.boundingBox && Math.abs(bodyGeometry.boundingBox.min.z) > 1e-4) {
    bodyGeometry.translate(0, 0, -bodyGeometry.boundingBox.min.z);
    bodyGeometry.computeBoundingBox();
  }

  // Build separate flat-on-bed lid geometry side-by-side in +X when closed styles selected
  let lidGeometry: THREE.BufferGeometry | null = null;
  let lidOffsetXMm = 0;

  if (options.cardCaseStyle !== 'open_tray') {
    const bodyMaxX = bodyGeometry.boundingBox?.max.x ?? outerW / 2;
    const lidClear = tol;
    const lidInnerW = outerW + lidClear * 2;
    const lidOuterW = lidInnerW + wall * 2;
    const lidInnerD = outerD + lidClear * 2;
    const lidOuterD = lidInnerD + wall * 2;
    const lidCavityH = packed.maxProtrusion + 2.5;
    const lidH = wall + lidCavityH;

    lidOffsetXMm = Number((bodyMaxX + 14 + lidOuterW / 2).toFixed(2));

    const lidOuterShape = createRoundedRectShape(lidOuterW, lidOuterD, 3.2);
    const lidRaw = new THREE.ExtrudeGeometry(lidOuterShape, {
      depth: lidH,
      bevelEnabled: false,
    });
    const lidBlank = normalizeForMergeOrCsg(lidRaw);
    lidRaw.dispose();

    const lidCavity = createBoxAt(
      -lidInnerW / 2,
      lidInnerW / 2,
      options.cardCaseStyle === 'sliding_dovetail' ? -lidOuterD / 2 - 2 : -lidInnerD / 2,
      lidInnerD / 2,
      wall,
      lidH + 1.5
    );
    let hollowedLid = subtractGeometries(lidBlank, lidCavity);
    lidBlank.dispose();
    lidCavity.dispose();

    if (options.cardCaseStyle === 'sliding_dovetail') {
      // Lower inward capture lips to hook beneath the body rails
      const hookL = createBoxAt(
        -lidInnerW / 2 - 0.1,
        -lidInnerW / 2 + 1.1,
        -lidInnerD / 2,
        lidInnerD / 2,
        lidH - 2.0,
        lidH
      );
      const hookR = createBoxAt(
        lidInnerW / 2 - 1.1,
        lidInnerW / 2 + 0.1,
        -lidInnerD / 2,
        lidInnerD / 2,
        lidH - 2.0,
        lidH
      );
      const withHooks = safeMerge([hollowedLid, hookL, hookR]);
      hollowedLid.dispose();
      hookL.dispose();
      hookR.dispose();
      hollowedLid = withHooks;
    }

    hollowedLid.translate(lidOffsetXMm, 0, 0);
    hollowedLid.computeBoundingBox();
    if (hollowedLid.boundingBox && Math.abs(hollowedLid.boundingBox.min.z) > 1e-4) {
      hollowedLid.translate(0, 0, -hollowedLid.boundingBox.min.z);
      hollowedLid.computeBoundingBox();
    }
    lidGeometry = hollowedLid;
  }

  // Procedural embossed label
  let labelGeometry: THREE.BufferGeometry | null = null;
  if (options.includeEmbossedLabel && options.labelText.trim().length > 0) {
    const labelTargetW = outerW * 0.72;
    const textG = buildStrokeTextGeometry(options.labelText, labelTargetW, 6.0, 0.6);
    if (textG) {
      textG.rotateX(Math.PI / 2);
      if (lidGeometry) {
        const lidOuterD = outerD + (tol + wall) * 2;
        lidGeometry.computeBoundingBox();
        const lidBb = lidGeometry.boundingBox!;
        const lidH = lidBb.max.z - lidBb.min.z;
        textG.translate(lidOffsetXMm, -lidOuterD / 2 + 0.15, Math.max(4.5, lidH * 0.55));
      } else {
        textG.translate(0, -outerD / 2 + 0.15, bodyTopZ * 0.52);
      }
      textG.computeBoundingBox();
      labelGeometry = textG;
    }
  }

  bodyGeometry.computeBoundingBox();
  const bodyBb = bodyGeometry.boundingBox!;
  const bodyVolCm3 =
    ((bodyBb.max.x - bodyBb.min.x) *
      (bodyBb.max.y - bodyBb.min.y) *
      (bodyBb.max.z - bodyBb.min.z)) /
    1000;
  let lidVolCm3 = 0;
  if (lidGeometry?.boundingBox) {
    const lbb = lidGeometry.boundingBox;
    lidVolCm3 =
      ((lbb.max.x - lbb.min.x) * (lbb.max.y - lbb.min.y) * (lbb.max.z - lbb.min.z)) / 1000;
  }
  const estimatedVolumeCm3 = Number(Math.max(3, bodyVolCm3 * 0.55 + lidVolCm3 * 0.35).toFixed(2));

  const dispose = () => {
    bodyGeometry.dispose();
    lidGeometry?.dispose();
    labelGeometry?.dispose();
  };

  return {
    bodyGeometry,
    lidGeometry,
    labelGeometry,
    layoutMeta: {
      minDividerWallMm,
      totalSlots: packed.slots.length,
      estimatedVolumeCm3,
      lidOffsetXMm,
    },
    dispose,
  };
}

/**
 * Generates pure client-side BufferGeometries (body, optional lid, optional embossed label)
 * without touching the DOM or triggering network requests.
 */
export function generateBatteryCaseParts(options: BatterySdcardCaseOptions): BatteryCaseParts {
  const validation = validateBatteryCaseOptions(options);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid battery dispenser / memory card case configuration.');
  }

  if (options.mode === 'battery_dispenser') {
    return buildBatteryDispenserParts(options);
  }
  return buildMemoryCardCaseParts(options);
}

function getActiveGeometries(parts: BatteryCaseParts): THREE.BufferGeometry[] {
  const list: THREE.BufferGeometry[] = [parts.bodyGeometry];
  if (parts.lidGeometry) list.push(parts.lidGeometry);
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
 * Computes physical dimensions, triangle count, volume, PLA weight, print time,
 * and bed-fit warning strictly from already-built parts (single geometry pass).
 */
export function calculateMetrics(
  _options: BatterySdcardCaseOptions,
  parts: BatteryCaseParts
): BatteryCaseMetrics {
  const combinedBox = new THREE.Box3();
  let triangleCount = 0;

  for (const g of getActiveGeometries(parts)) {
    triangleCount += countTriangles(g);
    g.computeBoundingBox();
    if (g.boundingBox && !g.boundingBox.isEmpty()) {
      combinedBox.union(g.boundingBox);
    }
  }

  const size = new THREE.Vector3();
  if (!combinedBox.isEmpty()) {
    combinedBox.getSize(size);
  }

  const widthMm = Number(size.x.toFixed(1));
  const depthMm = Number(size.y.toFixed(1));
  const heightMm = Number(size.z.toFixed(1));
  const estimatedVolumeCm3 = parts.layoutMeta.estimatedVolumeCm3;
  const estimatedWeightG = Number((estimatedVolumeCm3 * 1.24).toFixed(1));
  const estimatedPrintTimeHours = Number(Math.max(0.25, estimatedWeightG / 22 + heightMm * 0.012).toFixed(2));
  const exceedsStandardBed =
    widthMm > STANDARD_BED_SIZE_MM ||
    depthMm > STANDARD_BED_SIZE_MM ||
    heightMm > STANDARD_BED_SIZE_MM;

  return {
    widthMm,
    depthMm,
    heightMm,
    triangleCount,
    estimatedVolumeCm3,
    estimatedWeightG,
    estimatedPrintTimeHours,
    exceedsStandardBed,
  };
}

/**
 * Exports all active parts as a binary little-endian .STL ArrayBuffer.
 */
export function exportToBinaryStl(parts: BatteryCaseParts): ArrayBuffer {
  const geoms = getActiveGeometries(parts);
  let totalTriangles = 0;
  for (const g of geoms) {
    totalTriangles += countTriangles(g);
  }

  const buffer = new ArrayBuffer(84 + totalTriangles * 50);
  const view = new DataView(buffer);

  // Header MUST NOT begin with 'solid ' or slicers misread it as ASCII STL
  const header = 'PrivKnife Binary STL - Parametric Battery & SD Case Maker';
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }
  view.setUint32(80, totalTriangles, true);

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

      const nx = Number.isFinite(cb.x) ? cb.x : 0;
      const ny = Number.isFinite(cb.y) ? cb.y : 0;
      const nz = Number.isFinite(cb.z) ? cb.z : 1;

      view.setFloat32(offset, nx, true);
      view.setFloat32(offset + 4, ny, true);
      view.setFloat32(offset + 8, nz, true);

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
  const cleaned = (hex || '').trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toUpperCase()}FF`;
  }
  return fallback;
}

function serialize3mfObject(
  geom: THREE.BufferGeometry,
  objectId: number,
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

  return `    <object id="${objectId}" name="${escapeXml(name)}" pid="1" pindex="${materialIndex}" type="model">
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
 * Exports active parts into an OPC multi-object dual-color .3MF archive Blob.
 */
export async function exportTo3mf(
  options: BatterySdcardCaseOptions,
  parts: BatteryCaseParts
): Promise<Blob> {
  const bodyHex = to3mfColor(options.bodyColorHex, '#2563EBFF');
  const accentHex = to3mfColor(options.accentColorHex, '#F8FAFCFF');

  const objects: string[] = [];
  const buildItems: string[] = [];

  let nextId = 2;
  const bodyObjId = nextId++;
  objects.push(serialize3mfObject(parts.bodyGeometry, bodyObjId, 'Main Body', 0));
  buildItems.push(`    <item objectid="${bodyObjId}" />`);

  if (parts.lidGeometry && countTriangles(parts.lidGeometry) > 0) {
    const lidObjId = nextId++;
    objects.push(serialize3mfObject(parts.lidGeometry, lidObjId, 'Case Lid', 0));
    buildItems.push(`    <item objectid="${lidObjId}" />`);
  }

  if (parts.labelGeometry && countTriangles(parts.labelGeometry) > 0) {
    const labelObjId = nextId++;
    const safeTitle = options.labelText.trim() || 'Label';
    objects.push(
      serialize3mfObject(parts.labelGeometry, labelObjId, `Embossed Label (${safeTitle})`, 1)
    );
    buildItems.push(`    <item objectid="${labelObjId}" />`);
  }

  const modeTitle =
    options.mode === 'battery_dispenser'
      ? `Battery Dispenser (${options.cellPreset.toUpperCase()} x${options.stackCount})`
      : `Memory Card Case (${options.cardCaseStyle})`;

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">${escapeXml(modeTitle)}</metadata>
  <metadata name="Application">PrivKnife Client-Side 3D Studio</metadata>
  <resources>
    <basematerials id="1">
      <base name="Body Filament" displaycolor="${bodyHex}" />
      <base name="Accent Label Filament" displaycolor="${accentHex}" />
    </basematerials>
${objects.join('\n')}
  </resources>
  <build>
${buildItems.join('\n')}
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

/**
 * Generates deterministic clean export filename slug without extension.
 */
export function buildBatteryCaseFileBase(options: BatterySdcardCaseOptions): string {
  if (options.mode === 'battery_dispenser') {
    return `privknife-dispenser-${options.cellPreset}-${options.stackCount}x`;
  }
  return `privknife-media-case-${options.cardCaseStyle.replace(/_/g, '-')}`;
}
