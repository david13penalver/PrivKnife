import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import JSZip from 'jszip';
import {
  HEX_BIT_FLAT_TO_FLAT_MM,
  PRESET_DEFAULT_SPECS,
  STANDARD_BED_SIZE_MM,
  ToolBitHolderOptions,
  ToolHolderMetrics,
  ToolHolderParts,
  ToolHolderPreset,
  ToolHolderValidationResult,
  ToolSlotItem,
} from './types';

type Stroke = [[number, number], [number, number]];

const FONT_GLYPHS: Record<string, Stroke[]> = {
  '0': [
    [[0.25, 0], [0.75, 0]],
    [[0.75, 0], [1, 0.25]],
    [[1, 0.25], [1, 0.75]],
    [[1, 0.75], [0.75, 1]],
    [[0.75, 1], [0.25, 1]],
    [[0.25, 1], [0, 0.75]],
    [[0, 0.75], [0, 0.25]],
    [[0, 0.25], [0.25, 0]],
  ],
  '1': [
    [[0.3, 0.8], [0.55, 1]],
    [[0.55, 1], [0.55, 0]],
    [[0.25, 0], [0.8, 0]],
  ],
  '2': [
    [[0.1, 0.8], [0.5, 1]],
    [[0.5, 1], [0.9, 0.7]],
    [[0.9, 0.7], [0, 0]],
    [[0, 0], [1, 0]],
  ],
  '3': [
    [[0.1, 0.85], [0.5, 1]],
    [[0.5, 1], [0.9, 0.75]],
    [[0.9, 0.75], [0.4, 0.5]],
    [[0.4, 0.5], [0.9, 0.25]],
    [[0.9, 0.25], [0.5, 0]],
    [[0.5, 0], [0.1, 0.15]],
  ],
  '4': [
    [[0.8, 0], [0.8, 1]],
    [[0.8, 1], [0, 0.35]],
    [[0, 0.35], [1, 0.35]],
  ],
  '5': [
    [[0.9, 1], [0.1, 1]],
    [[0.1, 1], [0.1, 0.55]],
    [[0.1, 0.55], [0.7, 0.55]],
    [[0.7, 0.55], [0.9, 0.3]],
    [[0.9, 0.3], [0.6, 0]],
    [[0.6, 0], [0.1, 0]],
  ],
  '6': [
    [[0.8, 0.9], [0.3, 1]],
    [[0.3, 1], [0, 0.7]],
    [[0, 0.7], [0, 0.25]],
    [[0, 0.25], [0.3, 0]],
    [[0.3, 0], [0.7, 0]],
    [[0.7, 0], [0.9, 0.25]],
    [[0.9, 0.25], [0.7, 0.5]],
    [[0.7, 0.5], [0.05, 0.5]],
  ],
  '7': [
    [[0, 1], [1, 1]],
    [[1, 1], [0.35, 0]],
  ],
  '8': [
    [[0.3, 1], [0.7, 1]],
    [[0.7, 1], [0.9, 0.75]],
    [[0.9, 0.75], [0.5, 0.5]],
    [[0.5, 0.5], [0.9, 0.25]],
    [[0.9, 0.25], [0.7, 0]],
    [[0.7, 0], [0.3, 0]],
    [[0.3, 0], [0.1, 0.25]],
    [[0.1, 0.25], [0.5, 0.5]],
    [[0.5, 0.5], [0.1, 0.75]],
    [[0.1, 0.75], [0.3, 1]],
  ],
  '9': [
    [[0.2, 0.1], [0.7, 0]],
    [[0.7, 0], [1, 0.3]],
    [[1, 0.3], [1, 0.75]],
    [[1, 0.75], [0.7, 1]],
    [[0.7, 1], [0.3, 1]],
    [[0.3, 1], [0.1, 0.75]],
    [[0.1, 0.75], [0.3, 0.5]],
    [[0.3, 0.5], [0.95, 0.5]],
  ],
  '.': [
    [[0.4, 0], [0.6, 0]],
    [[0.6, 0], [0.6, 0.16]],
    [[0.6, 0.16], [0.4, 0.16]],
  ],
  '/': [[[0.15, 0], [0.85, 1]]],
  '-': [[[0.2, 0.5], [0.8, 0.5]]],
  '"': [
    [[0.32, 0.75], [0.32, 1]],
    [[0.68, 0.75], [0.68, 1]],
  ],
  A: [
    [[0, 0], [0.5, 1]],
    [[0.5, 1], [1, 0]],
    [[0.2, 0.4], [0.8, 0.4]],
  ],
  B: [
    [[0, 0], [0, 1]],
    [[0, 1], [0.75, 1]],
    [[0.75, 1], [0.75, 0.52]],
    [[0.75, 0.52], [0, 0.52]],
    [[0, 0.52], [0.85, 0.52]],
    [[0.85, 0.52], [0.85, 0]],
    [[0.85, 0], [0, 0]],
  ],
  C: [
    [[1, 0.8], [0.3, 1]],
    [[0.3, 1], [0, 0.7]],
    [[0, 0.7], [0, 0.3]],
    [[0, 0.3], [0.3, 0]],
    [[0.3, 0], [1, 0.2]],
  ],
  D: [
    [[0, 0], [0, 1]],
    [[0, 1], [0.6, 1]],
    [[0.6, 1], [1, 0.6]],
    [[1, 0.6], [1, 0.4]],
    [[1, 0.4], [0.6, 0]],
    [[0.6, 0], [0, 0]],
  ],
  E: [
    [[0, 0], [0, 1]],
    [[0, 1], [0.9, 1]],
    [[0, 0.5], [0.75, 0.5]],
    [[0, 0], [0.9, 0]],
  ],
  F: [
    [[0, 0], [0, 1]],
    [[0, 1], [0.9, 1]],
    [[0, 0.5], [0.7, 0.5]],
  ],
  G: [
    [[0.9, 0.8], [0.3, 1]],
    [[0.3, 1], [0, 0.7]],
    [[0, 0.7], [0, 0.3]],
    [[0, 0.3], [0.3, 0]],
    [[0.3, 0], [0.9, 0]],
    [[0.9, 0], [0.9, 0.45]],
    [[0.9, 0.45], [0.5, 0.45]],
  ],
  H: [
    [[0, 0], [0, 1]],
    [[1, 0], [1, 1]],
    [[0, 0.5], [1, 0.5]],
  ],
  I: [
    [[0.25, 1], [0.75, 1]],
    [[0.5, 1], [0.5, 0]],
    [[0.25, 0], [0.75, 0]],
  ],
  L: [
    [[0.15, 1], [0.15, 0]],
    [[0.15, 0], [0.9, 0]],
  ],
  M: [
    [[0, 0], [0, 1]],
    [[0, 1], [0.5, 0.4]],
    [[0.5, 0.4], [1, 1]],
    [[1, 1], [1, 0]],
  ],
  N: [
    [[0, 0], [0, 1]],
    [[0, 1], [1, 0]],
    [[1, 0], [1, 1]],
  ],
  O: [
    [[0.25, 0], [0.75, 0]],
    [[0.75, 0], [1, 0.3]],
    [[1, 0.3], [1, 0.7]],
    [[1, 0.7], [0.75, 1]],
    [[0.75, 1], [0.25, 1]],
    [[0.25, 1], [0, 0.7]],
    [[0, 0.7], [0, 0.3]],
    [[0, 0.3], [0.25, 0]],
  ],
  P: [
    [[0, 0], [0, 1]],
    [[0, 1], [0.8, 1]],
    [[0.8, 1], [0.8, 0.52]],
    [[0.8, 0.52], [0, 0.52]],
  ],
  R: [
    [[0, 0], [0, 1]],
    [[0, 1], [0.8, 1]],
    [[0.8, 1], [0.8, 0.52]],
    [[0.8, 0.52], [0, 0.52]],
    [[0.35, 0.52], [0.9, 0]],
  ],
  S: [
    [[0.9, 0.85], [0.3, 1]],
    [[0.3, 1], [0.1, 0.7]],
    [[0.1, 0.7], [0.85, 0.3]],
    [[0.85, 0.3], [0.65, 0]],
    [[0.65, 0], [0.1, 0.15]],
  ],
  T: [
    [[0, 1], [1, 1]],
    [[0.5, 1], [0.5, 0]],
  ],
  X: [
    [[0, 0], [1, 1]],
    [[0, 1], [1, 0]],
  ],
  Z: [
    [[0, 1], [1, 1]],
    [[1, 1], [0, 0]],
    [[0, 0], [1, 0]],
  ],
};

function isFiniteNum(v: number, min: number, max: number): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

function isFiniteInt(v: number, min: number, max: number): boolean {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

function parseDimensionTokenMm(rawToken: string): number | null {
  const cleaned = rawToken.trim().replace(/(mm|")$/i, '').trim();
  if (!cleaned) return null;

  const fracMatch = /^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(cleaned);
  if (fracMatch) {
    const num = Number(fracMatch[1]);
    const den = Number(fracMatch[2]);
    if (Number.isFinite(num) && Number.isFinite(den) && num > 0 && den > 0) {
      return Number(((num / den) * 25.4).toFixed(3));
    }
    return null;
  }

  if (/^\d+(?:\.\d+)?$/.test(cleaned)) {
    const value = Number(cleaned);
    if (Number.isFinite(value) && value > 0) {
      return Number(value.toFixed(3));
    }
  }
  return null;
}

/**
 * Parses comma-separated preset or custom tool specifications into clamped normalized slots.
 */
export function parseToolSlots(
  specText: string,
  preset: ToolHolderPreset,
  hexBitCount = 12
): ToolSlotItem[] {
  const shape: ToolSlotItem['shape'] =
    preset === 'allen_keys'
      ? 'allen_slot'
      : preset === 'hex_bits_quarter'
        ? 'hex'
        : 'round';

  if (preset === 'hex_bits_quarter') {
    const count = Math.max(0, Math.min(60, Math.round(hexBitCount || 0)));
    if (count <= 0) return [];
    const fallbackLabels = PRESET_DEFAULT_SPECS.hex_bits_quarter.split(',').map((s) => s.trim());
    const customLabels =
      typeof specText === 'string' && specText.trim().length > 0
        ? specText
            .split(/[,;\n]+/)
            .map((s) => s.trim())
            .filter(Boolean)
        : fallbackLabels;

    const slots: ToolSlotItem[] = [];
    for (let i = 0; i < count; i++) {
      const lbl = customLabels[i] || `B${i + 1}`;
      slots.push({
        label: lbl.slice(0, 8),
        diameterMm: HEX_BIT_FLAT_TO_FLAT_MM,
        shape: 'hex',
      });
    }
    return slots;
  }

  if (typeof specText !== 'string' || specText.trim().length === 0) {
    return [];
  }

  const rawTokens = specText.split(/[,;\n]+/);
  const result: ToolSlotItem[] = [];

  for (const token of rawTokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      const labelPart = trimmed.slice(0, colonIdx).trim();
      const dimPart = trimmed.slice(colonIdx + 1).trim();
      const parsedMm = parseDimensionTokenMm(dimPart);
      if (labelPart && parsedMm !== null) {
        result.push({
          label: labelPart.slice(0, 8),
          diameterMm: Math.max(0.8, Math.min(30.0, parsedMm)),
          shape,
        });
      }
    } else {
      const parsedMm = parseDimensionTokenMm(trimmed);
      if (parsedMm !== null) {
        const displayLabel = trimmed.replace(/mm$/i, '').trim().slice(0, 8);
        result.push({
          label: displayLabel || parsedMm.toFixed(1),
          diameterMm: Math.max(0.8, Math.min(30.0, parsedMm)),
          shape,
        });
      }
    }

    if (result.length >= 60) {
      break;
    }
  }

  return result;
}

/**
 * Computes circumscribed polygon radius from flat-to-flat hex wrench dimension + tolerance.
 */
export function computeHexCircumradiusMm(flatToFlatMm: number, toleranceMm: number): number {
  const af = flatToFlatMm + toleranceMm;
  return Number((af / 2 / Math.cos(Math.PI / 6)).toFixed(4));
}

/**
 * Validates rack parameters, tolerances, row counts, and parsed tool slots.
 */
export function validateToolHolderOptions(
  options: ToolBitHolderOptions
): ToolHolderValidationResult {
  if (!options || typeof options !== 'object') {
    return { valid: false, error: 'Tool organizer options are required.' };
  }
  if (!isFiniteInt(options.rows, 1, 4)) {
    return { valid: false, error: 'Row count must be an integer between 1 and 4.' };
  }
  if (!isFiniteNum(options.holeToleranceMm, 0.15, 0.6)) {
    return { valid: false, error: 'Hole tolerance must be between 0.15 and 0.60 mm.' };
  }
  if (!isFiniteNum(options.holeDepthMm, 10, 40)) {
    return { valid: false, error: 'Hole depth must be between 10 and 40 mm.' };
  }
  if (!isFiniteNum(options.slotSpacingMm, 3.0, 12.0)) {
    return { valid: false, error: 'Slot spacing must be between 3.0 and 12.0 mm.' };
  }
  if (!isFiniteNum(options.stepRiseMm, 0, 18)) {
    return { valid: false, error: 'Tier step rise must be between 0 and 18 mm.' };
  }
  if (options.preset === 'hex_bits_quarter' && !isFiniteInt(options.hexBitCount, 6, 40)) {
    return { valid: false, error: 'Hex bit slot count must be an integer between 6 and 40.' };
  }

  const slots = parseToolSlots(options.customSpecText, options.preset, options.hexBitCount);
  if (slots.length === 0) {
    return {
      valid: false,
      error: 'Enter at least one valid positive slot diameter (e.g. 1.5, 2, 2.5, 3).',
    };
  }

  return { valid: true };
}

function normalizeForMergeOrCsg(geom: THREE.BufferGeometry): THREE.BufferGeometry {
  const nonIndexed = geom.index ? geom.toNonIndexed() : geom.clone();
  for (const attr of Object.keys(nonIndexed.attributes)) {
    if (attr !== 'position' && attr !== 'normal') {
      nonIndexed.deleteAttribute(attr);
    }
  }
  if (!nonIndexed.getAttribute('normal')) {
    nonIndexed.computeVertexNormals();
  }
  nonIndexed.computeBoundingBox();
  return nonIndexed;
}

function mergeCleanGeometries(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const normalized = list.map((g) => normalizeForMergeOrCsg(g));
  const merged = BufferGeometryUtils.mergeGeometries(normalized, false);
  normalized.forEach((g) => g.dispose());
  if (!merged) {
    throw new Error('Failed to merge generated tool rack geometries.');
  }
  merged.computeBoundingBox();
  return merged;
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

function createExtrudedYZProfile(
  pointsYZ: Array<[number, number]>,
  widthX: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  pointsYZ.forEach(([y, z], idx) => {
    if (idx === 0) shape.moveTo(y, z);
    else shape.lineTo(y, z);
  });
  shape.closePath();

  const extrude = new THREE.ExtrudeGeometry(shape, {
    depth: widthX,
    bevelEnabled: false,
    steps: 1,
  });

  // ExtrudeGeometry extrudes along +Z; rotate +90deg around Y then adjust so profile lies in YZ extruded along X
  // Specifically: X_shape = y, Y_shape = z, Z_extrude = x in [0, widthX]
  // RotateX(+PI/2): (x, y, z) -> (x, -z, y); RotateY(+PI/2): (x, y, z) -> (z, y, -x)
  // Better: map vertices cleanly in one helper without orientation guesswork!
  const pos = extrude.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const sy = pos.getX(i); // profile Y
    const sz = pos.getY(i); // profile Z
    const sx = pos.getZ(i) - widthX / 2; // centered along X
    pos.setXYZ(i, sx, sy, sz);
  }
  // Reverse triangle winding since axis permutation (sx, sy, sz) = (Z, X, Y) preserves handedness? Wait:
  // det([[0,0,1],[1,0,0],[0,1,0]]) = +1 -> EVEN permutation, right-handedness preserved!
  pos.needsUpdate = true;
  extrude.computeVertexNormals();
  return normalizeForMergeOrCsg(extrude);
}

function createBoxAt(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  minZ: number,
  maxZ: number
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(maxX - minX, maxY - minY, maxZ - minZ);
  g.translate((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
  return normalizeForMergeOrCsg(g);
}

function createStrokeText(
  text: string,
  maxWidthMm: number,
  targetCharHeightMm: number,
  depthMm = 0.65
): THREE.BufferGeometry | null {
  const clean = text.toUpperCase().trim();
  if (!clean) return null;

  const baseCharW = targetCharHeightMm * 0.58;
  const baseGap = baseCharW * 0.24;
  const rawTotalW = clean.length * baseCharW + Math.max(0, clean.length - 1) * baseGap;
  const scale = rawTotalW > maxWidthMm ? Math.max(0.45, maxWidthMm / rawTotalW) : 1.0;

  const charH = targetCharHeightMm * scale;
  const charW = baseCharW * scale;
  const sp = baseGap * scale;
  const strokeT = Math.max(0.42, charH * 0.16);
  const totalW = clean.length * charW + Math.max(0, clean.length - 1) * sp;
  let cx = -totalW / 2;

  const strokes: THREE.BufferGeometry[] = [];
  for (const ch of clean) {
    const def = FONT_GLYPHS[ch];
    if (def) {
      for (const [p1, p2] of def) {
        const x1 = cx + p1[0] * charW;
        const y1 = (p1[1] - 0.5) * charH;
        const x2 = cx + p2[0] * charW;
        const y2 = (p2[1] - 0.5) * charH;
        const len = Math.hypot(x2 - x1, y2 - y1);
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const halfT = strokeT / 2;
        const s = new THREE.Shape();
        s.moveTo(-halfT, -halfT);
        s.lineTo(len + halfT, -halfT);
        s.lineTo(len + halfT, halfT);
        s.lineTo(-halfT, halfT);
        s.closePath();
        const eg = new THREE.ExtrudeGeometry(s, { depth: depthMm, bevelEnabled: false });
        eg.rotateZ(angle);
        eg.translate(x1, y1, 0);
        strokes.push(normalizeForMergeOrCsg(eg));
        eg.dispose();
      }
    }
    cx += charW + sp;
  }

  if (strokes.length === 0) return null;
  const merged = mergeCleanGeometries(strokes);
  strokes.forEach((s) => s.dispose());
  return merged;
}

interface PlacedSlot {
  slot: ToolSlotItem;
  rowIdx: number;
  cx: number;
  cy: number;
  pitchX: number;
  outerRadiusMm: number;
  tierTopZ: number;
  tierFrontY: number;
}

/**
 * Generates stepped / flat / Skadis parametric tool organizer meshes and optional dual-color labels.
 */
export function generateToolHolderParts(options: ToolBitHolderOptions): ToolHolderParts {
  const check = validateToolHolderOptions(options);
  if (!check.valid) {
    throw new Error(check.error || 'Invalid tool organizer configuration.');
  }

  const slots = parseToolSlots(options.customSpecText, options.preset, options.hexBitCount);
  const rowCount = Math.min(options.rows, slots.length);
  const effectiveStepRise = options.formFactor === 'flat_tray' ? 0 : options.stepRiseMm;
  const minFloorMm = options.includeBottomMagnets ? 4.4 : 2.6;
  const effectiveHoleDepthMm = options.holeDepthMm;

  let hexCircumradiusMm: number | null = null;
  if (slots.some((s) => s.shape === 'hex')) {
    hexCircumradiusMm = computeHexCircumradiusMm(HEX_BIT_FLAT_TO_FLAT_MM, options.holeToleranceMm);
  }

  const slotOuterRadius = (slot: ToolSlotItem): number => {
    if (slot.shape === 'hex') {
      return computeHexCircumradiusMm(slot.diameterMm, options.holeToleranceMm);
    }
    return (slot.diameterMm + options.holeToleranceMm) / 2;
  };

  // Partition slots evenly into rows (front row = 0 .. rear row = rowCount - 1)
  const rowBuckets: ToolSlotItem[][] = Array.from({ length: rowCount }, () => []);
  const basePerRow = Math.floor(slots.length / rowCount);
  let remainder = slots.length % rowCount;
  let cursor = 0;
  for (let r = 0; r < rowCount; r++) {
    const take = basePerRow + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    rowBuckets[r] = slots.slice(cursor, cursor + take);
    cursor += take;
  }

  const rowTotalSpans: number[] = [];
  const rowDepths: number[] = [];
  const tierHeightsMm: number[] = [];

  for (let r = 0; r < rowCount; r++) {
    const bucket = rowBuckets[r];
    let span = 0;
    let maxDia = 0;
    for (let i = 0; i < bucket.length; i++) {
      const rOuter = slotOuterRadius(bucket[i]);
      maxDia = Math.max(maxDia, rOuter * 2);
      if (i > 0) {
        span += rOuter + slotOuterRadius(bucket[i - 1]) + options.slotSpacingMm;
      } else {
        span += rOuter;
      }
    }
    span += bucket.length > 0 ? slotOuterRadius(bucket[bucket.length - 1]) : 0;
    rowTotalSpans.push(span);
    rowDepths.push(Math.max(15.5, maxDia + options.slotSpacingMm * 1.15 + 5.0));
    tierHeightsMm.push(Number((effectiveHoleDepthMm + minFloorMm + r * effectiveStepRise).toFixed(2)));
  }

  const sideMarginMm = Math.max(5.5, options.slotSpacingMm * 0.8 + 2.0);
  const rawWidthMm = Math.max(46, ...rowTotalSpans.map((s) => s + sideMarginMm * 2));
  const widthMm = Number(rawWidthMm.toFixed(2));

  // Front chamfered 35-deg apron shelf sits along -Y front face
  const apronDropDz = Math.max(4.5, Math.min(11.0, tierHeightsMm[0] - 4.0));
  const apronTipZ = Number((tierHeightsMm[0] - apronDropDz).toFixed(2));
  const apronSlopeY = Number((apronDropDz * Math.tan((35 * Math.PI) / 180)).toFixed(2));

  const sumTierDepths = rowDepths.reduce((a, b) => a + b, 0);
  const yFront = -sumTierDepths / 2 - apronSlopeY / 2;
  const yBack = yFront + apronSlopeY + sumTierDepths;

  // Build YZ silhouette for stepped solid block (CCW in Y-Z plane)
  const profilePoints: Array<[number, number]> = [
    [yFront, 0],
    [yBack, 0],
  ];
  let currY = yBack;
  const tierFrontY: number[] = new Array(rowCount);
  const tierBackY: number[] = new Array(rowCount);

  for (let r = rowCount - 1; r >= 0; r--) {
    tierBackY[r] = currY;
    profilePoints.push([currY, tierHeightsMm[r]]);
    currY -= rowDepths[r];
    tierFrontY[r] = currY;
    profilePoints.push([currY, tierHeightsMm[r]]);
  }
  profilePoints.push([yFront, apronTipZ]);

  const solidBlock = createExtrudedYZProfile(profilePoints, widthMm);

  // Place slots accurately per tier
  const placedSlots: PlacedSlot[] = [];
  for (let r = 0; r < rowCount; r++) {
    const bucket = rowBuckets[r];
    const rowSpan = rowTotalSpans[r];
    let xCursor = -rowSpan / 2;
    const centerY = (tierFrontY[r] + tierBackY[r]) / 2;

    for (let i = 0; i < bucket.length; i++) {
      const slot = bucket[i];
      const outerR = slotOuterRadius(slot);
      if (i === 0) {
        xCursor += outerR;
      } else {
        xCursor += slotOuterRadius(bucket[i - 1]) + options.slotSpacingMm + outerR;
      }

      const prevR = i > 0 ? slotOuterRadius(bucket[i - 1]) : outerR;
      const nextR = i < bucket.length - 1 ? slotOuterRadius(bucket[i + 1]) : outerR;
      const pitchX = Math.max(6.5, outerR * 2 + options.slotSpacingMm, Math.min(prevR, nextR) + outerR + options.slotSpacingMm);

      placedSlots.push({
        slot,
        rowIdx: r,
        cx: Number(xCursor.toFixed(3)),
        cy: Number(centerY.toFixed(3)),
        pitchX,
        outerRadiusMm: outerR,
        tierTopZ: tierHeightsMm[r],
        tierFrontY: tierFrontY[r],
      });
    }
  }

  // Build CSG cutters: bores + countersinks + Allen key open front relief slots + bottom magnets
  const cutters: THREE.BufferGeometry[] = [];
  for (const placed of placedSlots) {
    const { slot, cx, cy, outerRadiusMm, tierTopZ, tierFrontY: frontY } = placed;
    const cutterBottomZ = tierTopZ - effectiveHoleDepthMm;
    const cutterTopZ = tierTopZ + 0.5;
    const cutterHeight = cutterTopZ - cutterBottomZ;
    const cutterMidZ = (cutterTopZ + cutterBottomZ) / 2;

    if (slot.shape === 'hex') {
      const hexCyl = new THREE.CylinderGeometry(outerRadiusMm, outerRadiusMm, cutterHeight, 6);
      hexCyl.rotateX(Math.PI / 2);
      hexCyl.translate(cx, cy, cutterMidZ);
      cutters.push(normalizeForMergeOrCsg(hexCyl));
      hexCyl.dispose();

      const chamfer = new THREE.CylinderGeometry(outerRadiusMm + 0.6, outerRadiusMm, 0.8, 6);
      chamfer.rotateX(Math.PI / 2);
      chamfer.translate(cx, cy, tierTopZ + 0.05);
      cutters.push(normalizeForMergeOrCsg(chamfer));
      chamfer.dispose();
    } else {
      const roundCyl = new THREE.CylinderGeometry(outerRadiusMm, outerRadiusMm, cutterHeight, 32);
      roundCyl.rotateX(Math.PI / 2);
      roundCyl.translate(cx, cy, cutterMidZ);
      cutters.push(normalizeForMergeOrCsg(roundCyl));
      roundCyl.dispose();

      const chamfer = new THREE.CylinderGeometry(outerRadiusMm + 0.6, outerRadiusMm, 0.8, 32);
      chamfer.rotateX(Math.PI / 2);
      chamfer.translate(cx, cy, tierTopZ + 0.05);
      cutters.push(normalizeForMergeOrCsg(chamfer));
      chamfer.dispose();

      if (slot.shape === 'allen_slot') {
        const slotWidth = Math.max(1.4, outerRadiusMm * 1.92);
        const slotBox = createBoxAt(
          cx - slotWidth / 2,
          cx + slotWidth / 2,
          frontY - 1.5,
          cy,
          cutterBottomZ,
          cutterTopZ
        );
        cutters.push(slotBox);
      }
    }
  }

  let magnetCount = 0;
  if (options.includeBottomMagnets) {
    const mCount = widthMm >= 140 ? 4 : widthMm >= 80 ? 3 : 2;
    magnetCount = mCount;
    const marginX = Math.min(18, widthMm * 0.16);
    const spanX = Math.max(12, widthMm - 2 * marginX);
    const magnetY = (yFront + apronSlopeY + yBack) / 2;

    for (let i = 0; i < mCount; i++) {
      const mx = -spanX / 2 + (i * spanX) / (mCount - 1);
      const magCyl = new THREE.CylinderGeometry(4.15, 4.15, 3.4, 24);
      magCyl.rotateX(Math.PI / 2);
      magCyl.translate(mx, magnetY, 1.5);
      cutters.push(normalizeForMergeOrCsg(magCyl));
      magCyl.dispose();
    }
  }

  let bodyGeometry: THREE.BufferGeometry;
  if (cutters.length > 0) {
    const mergedCutter = mergeCleanGeometries(cutters);
    cutters.forEach((c) => c.dispose());
    bodyGeometry = subtractGeometries(solidBlock, mergedCutter);
    solidBlock.dispose();
    mergedCutter.dispose();
  } else {
    bodyGeometry = solidBlock;
  }

  // Optional IKEA Skadis rear wall-mount L-hooks + stabilizer bumper
  if (options.formFactor === 'skadis_wall') {
    const hookXs = widthMm >= 60 ? [-20, 20] : [0];
    const topHookZ = Math.max(18, tierHeightsMm[rowCount - 1] - 8);
    const hookPieces: THREE.BufferGeometry[] = [bodyGeometry];

    for (const hx of hookXs) {
      // Rear horizontal neck (+Y into board)
      hookPieces.push(createBoxAt(hx - 2.2, hx + 2.2, yBack - 0.5, yBack + 7.0, topHookZ - 4.0, topHookZ + 3.0));
      // Downward locking tooth behind Skadis panel
      hookPieces.push(createBoxAt(hx - 2.2, hx + 2.2, yBack + 3.8, yBack + 7.0, topHookZ - 10.0, topHookZ - 3.5));
      // Lower stabilizer pin flush above Z=2
      hookPieces.push(createBoxAt(hx - 2.2, hx + 2.2, yBack - 0.5, yBack + 6.0, 2.0, 7.5));
    }

    const combined = mergeCleanGeometries(hookPieces);
    bodyGeometry.dispose();
    hookPieces.slice(1).forEach((p) => p.dispose());
    bodyGeometry = combined;
  }

  // Dual-color embossed size legend labels
  let labelGeometry: THREE.BufferGeometry | null = null;
  if (options.includeEmbossedLabels && placedSlots.length > 0) {
    const labelPieces: THREE.BufferGeometry[] = [];
    const slopeTiltRad = Math.atan2(apronDropDz, apronSlopeY); // ~55 deg from Y, outward along (-Y, +Z)
    const shelfMidY = (tierFrontY[0] + yFront) / 2;
    const shelfMidZ = (tierHeightsMm[0] + apronTipZ) / 2;

    for (const placed of placedSlots) {
      const charH = Math.min(4.6, Math.max(2.6, placed.pitchX * 0.42));
      const g = createStrokeText(placed.slot.label, Math.max(4.5, placed.pitchX - 1.2), charH, 0.7);
      if (!g) continue;

      if (placed.rowIdx === 0) {
        g.rotateX(slopeTiltRad);
        g.translate(placed.cx, shelfMidY - 0.08, shelfMidZ - 0.08);
      } else {
        // Place crisp top-face legend just in front (-Y) of the bore on upper tiers
        const rimFrontY = Math.max(placed.tierFrontY + 2.4, placed.cy - placed.outerRadiusMm - 2.6);
        g.translate(placed.cx, rimFrontY, placed.tierTopZ - 0.12);
      }
      labelPieces.push(g);
    }

    if (labelPieces.length > 0) {
      labelGeometry = mergeCleanGeometries(labelPieces);
      labelPieces.forEach((p) => p.dispose());
    }
  }

  bodyGeometry.computeBoundingBox();
  const bbox = bodyGeometry.boundingBox!;
  const depthMm = Number((bbox.max.y - bbox.min.y).toFixed(2));
  const heightMm = Number((bbox.max.z - bbox.min.z).toFixed(2));
  const finalWidthMm = Number((bbox.max.x - bbox.min.x).toFixed(2));

  return {
    bodyGeometry,
    labelGeometry,
    slots,
    widthMm: finalWidthMm,
    depthMm,
    heightMm,
    tierHeightsMm,
    effectiveHoleDepthMm,
    minFloorMm,
    hexCircumradiusMm,
    magnetCount,
    dispose() {
      bodyGeometry.dispose();
      labelGeometry?.dispose();
    },
  };
}

function countTriangles(geom: THREE.BufferGeometry): number {
  const idx = geom.getIndex();
  if (idx) return Math.floor(idx.count / 3);
  const pos = geom.getAttribute('position');
  return pos ? Math.floor(pos.count / 3) : 0;
}

function getActiveGeometries(parts: ToolHolderParts): THREE.BufferGeometry[] {
  const list: THREE.BufferGeometry[] = [parts.bodyGeometry];
  if (parts.labelGeometry && countTriangles(parts.labelGeometry) > 0) {
    list.push(parts.labelGeometry);
  }
  return list;
}

function computeSignedMeshVolumeMm3(geom: THREE.BufferGeometry): number {
  const pos = geom.getAttribute('position');
  if (!pos) return 0;
  const idx = geom.getIndex();
  const tris = countTriangles(geom);
  let volume6 = 0;

  for (let t = 0; t < tris; t++) {
    const i0 = idx ? idx.getX(t * 3) : t * 3;
    const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;

    const ax = pos.getX(i0);
    const ay = pos.getY(i0);
    const az = pos.getZ(i0);
    const bx = pos.getX(i1);
    const by = pos.getY(i1);
    const bz = pos.getZ(i1);
    const cx = pos.getX(i2);
    const cy = pos.getY(i2);
    const cz = pos.getZ(i2);

    volume6 +=
      ax * (by * cz - bz * cy) -
      ay * (bx * cz - bz * cx) +
      az * (bx * cy - by * cx);
  }

  return Math.abs(volume6) / 6;
}

/**
 * Single-pass dimension, triangle count, PLA mass, and print-time telemetry calculation.
 */
export function calculateToolHolderMetrics(
  options: ToolBitHolderOptions,
  parts: ToolHolderParts
): ToolHolderMetrics {
  const geoms = getActiveGeometries(parts);
  let triangleCount = 0;
  let solidVolumeMm3 = 0;

  for (const g of geoms) {
    triangleCount += countTriangles(g);
    solidVolumeMm3 += computeSignedMeshVolumeMm3(g);
  }

  const envelopeVolMm3 = parts.widthMm * parts.depthMm * parts.heightMm;
  const rawCm3 = Math.max(4, (solidVolumeMm3 > 100 ? solidVolumeMm3 : envelopeVolMm3 * 0.45) / 1000);
  // Typical 18% gyroid infill + 3 perimeters yields ~38% effective mass of full solid envelope
  const effectiveFilamentCm3 = rawCm3 * 0.42;
  const estimatedWeightG = Number((effectiveFilamentCm3 * 1.24).toFixed(1));
  const estimatedPrintTimeHours = Number(Math.max(0.25, estimatedWeightG / 18.5).toFixed(2));
  const exceedsStandardBed =
    parts.widthMm > STANDARD_BED_SIZE_MM || parts.depthMm > STANDARD_BED_SIZE_MM;

  return {
    slotCount: parts.slots.length,
    widthMm: parts.widthMm,
    depthMm: parts.depthMm,
    heightMm: parts.heightMm,
    triangleCount,
    estimatedWeightG,
    estimatedPrintTimeHours,
    exceedsStandardBed,
  };
}

/**
 * Exports rack body and embossed size labels as a little-endian binary .STL buffer.
 */
export function exportToBinaryStl(parts: ToolHolderParts): ArrayBuffer {
  const geoms = getActiveGeometries(parts);
  let totalTriangles = 0;
  for (const g of geoms) {
    totalTriangles += countTriangles(g);
  }

  const buffer = new ArrayBuffer(84 + totalTriangles * 50);
  const view = new DataView(buffer);

  // Header MUST NOT begin with 'solid ' or slicers misdetect ASCII STL
  const header = 'PrivKnife Binary STL - Parametric Tool & Bit Organizer';
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
 * Exports multi-color Rack Body and Size Labels into an OPC .3MF archive Blob.
 */
export async function exportTo3mf(
  options: ToolBitHolderOptions,
  parts: ToolHolderParts
): Promise<Blob> {
  const bodyHex = to3mfColor(options.bodyColorHex, '#2563EBFF');
  const labelHex = to3mfColor(options.labelColorHex, '#F8FAFCFF');

  const objects: string[] = [];
  const buildItems: string[] = [];

  objects.push(serialize3mfObject(parts.bodyGeometry, 2, 'Rack Body', 0));
  buildItems.push('    <item objectid="2" />');

  if (parts.labelGeometry && countTriangles(parts.labelGeometry) > 0) {
    objects.push(serialize3mfObject(parts.labelGeometry, 3, 'Size Labels', 1));
    buildItems.push('    <item objectid="3" />');
  }

  const safeTitle = `Tool Holder Rack (${options.preset}: ${parts.slots.map((s) => s.label).slice(0, 6).join(', ')})`;

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">${escapeXml(safeTitle)}</metadata>
  <metadata name="Application">PrivKnife Client-Side 3D Studio</metadata>
  <resources>
    <basematerials id="1">
      <base name="Rack Body Filament" displaycolor="${bodyHex}" />
      <base name="Size Legend Filament" displaycolor="${labelHex}" />
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

export function buildToolHolderFileBase(options: ToolBitHolderOptions): string {
  const rowCount = Math.max(1, Math.min(4, Math.round(options.rows || 1)));
  return `privknife-tool-rack-${options.preset}-${rowCount}row`;
}
