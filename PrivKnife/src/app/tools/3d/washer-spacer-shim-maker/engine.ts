import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import JSZip from 'jszip';
import {
  HardwarePartMetrics,
  HardwarePlateParts,
  HardwareValidationResult,
  PART_ARRAY_GAP_MM,
  STANDARD_BED_SIZE_MM,
  WasherSpacerShimOptions,
} from './types';

function isFiniteNum(v: number, min: number, max: number): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

function isFiniteInt(v: number, min: number, max: number): boolean {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

/**
 * Computes minimum printable radial/edge wall thickness for validation & chamfer clamping.
 */
export function computeRadialWallMm(options: WasherSpacerShimOptions): number {
  const bore = options.innerDiameterMm + options.holeToleranceMm;
  return Number(((options.outerDiameterMm - bore) / 2).toFixed(4));
}

/**
 * Validates caliper bounds, >= 0.8mm radial wall safety, flange clearances, and plate quantity.
 */
export function validateHardwareOptions(
  options: WasherSpacerShimOptions
): HardwareValidationResult {
  if (!options || typeof options !== 'object') {
    return { valid: false, error: 'Hardware options are required.' };
  }
  if (!isFiniteNum(options.outerDiameterMm, 6, 120)) {
    return { valid: false, error: 'Outer diameter / width must be between 6 and 120 mm.' };
  }
  if (!isFiniteNum(options.innerDiameterMm, 1.8, 90)) {
    return { valid: false, error: 'Inner bore / slot width must be between 1.8 and 90 mm.' };
  }
  if (!isFiniteNum(options.heightMm, 0.4, 80)) {
    return { valid: false, error: 'Part height / thickness must be between 0.4 and 80 mm.' };
  }
  if (!isFiniteNum(options.chamferMm, 0, 3.0)) {
    return { valid: false, error: 'Edge chamfer must be between 0 and 3.0 mm.' };
  }
  if (!isFiniteNum(options.holeToleranceMm, 0, 0.5)) {
    return { valid: false, error: 'Hole tolerance must be between 0 and 0.50 mm.' };
  }
  if (!isFiniteInt(options.quantity, 1, 24)) {
    return { valid: false, error: 'Build-plate quantity must be an integer between 1 and 24.' };
  }

  if (options.partType === 'leveling_wedge') {
    if (!isFiniteNum(options.wedgeLengthMm, 25, 150)) {
      return { valid: false, error: 'Wedge length must be between 25 and 150 mm.' };
    }
    if (!isFiniteNum(options.wedgeMinHeightMm, 0.4, 10)) {
      return { valid: false, error: 'Wedge minimum tip height must be between 0.4 and 10 mm.' };
    }
    if (options.heightMm - options.wedgeMinHeightMm < 0.5) {
      return { valid: false, error: 'Wedge max height must exceed minimum tip height by at least 0.5 mm.' };
    }
    if (options.includeScrewSlot && computeRadialWallMm(options) < 0.8) {
      return { valid: false, error: 'Wedge width must leave at least 0.8 mm wall around screw slot.' };
    }
    return { valid: true };
  }

  const radialWall = computeRadialWallMm(options);
  if (radialWall < 0.8) {
    return {
      valid: false,
      error: `Radial wall thickness (${radialWall.toFixed(2)} mm) is below 0.80 mm minimum.`,
    };
  }

  if (options.partType === 'flanged_bushing') {
    if (!isFiniteNum(options.flangeDiameterMm, 8, 140)) {
      return { valid: false, error: 'Flange diameter must be between 8 and 140 mm.' };
    }
    if (!isFiniteNum(options.flangeHeightMm, 0.8, 20)) {
      return { valid: false, error: 'Flange height must be between 0.8 and 20 mm.' };
    }
    if (options.flangeDiameterMm - options.outerDiameterMm < 1.6) {
      return { valid: false, error: 'Flange diameter must exceed barrel OD by at least 1.6 mm.' };
    }
    if (options.heightMm - options.flangeHeightMm < 0.4) {
      return { valid: false, error: 'Total bushing height must exceed flange height by at least 0.4 mm.' };
    }
  }

  if (options.partType === 'u_slot_shim') {
    if (!isFiniteNum(options.wedgeLengthMm, 16, 150)) {
      return { valid: false, error: 'Shim length must be between 16 and 150 mm.' };
    }
    const slotW = options.innerDiameterMm + options.holeToleranceMm;
    if (options.wedgeLengthMm < slotW + 3.0) {
      return { valid: false, error: 'Shim length must exceed slot width by at least 3.0 mm.' };
    }
  }

  return { valid: true };
}

function normalizeForMerge(geom: THREE.BufferGeometry): THREE.BufferGeometry {
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
  const normalized = list.map((g) => normalizeForMerge(g));
  const merged = BufferGeometryUtils.mergeGeometries(normalized, false);
  normalized.forEach((g) => g.dispose());
  if (!merged) {
    throw new Error('Failed to merge hardware geometries.');
  }
  merged.computeBoundingBox();
  return merged;
}

function subtractGeometries(
  baseGeom: THREE.BufferGeometry,
  cutterGeom: THREE.BufferGeometry
): THREE.BufferGeometry {
  const cleanBase = normalizeForMerge(baseGeom);
  const cleanCutter = normalizeForMerge(cutterGeom);
  const evaluator = new Evaluator();
  evaluator.attributes = ['position', 'normal'];
  evaluator.useGroups = false;

  const baseBrush = new Brush(cleanBase);
  const cutterBrush = new Brush(cleanCutter);
  baseBrush.updateMatrixWorld();
  cutterBrush.updateMatrixWorld();

  try {
    const resultBrush = evaluator.evaluate(baseBrush, cutterBrush, SUBTRACTION);
    return normalizeForMerge(resultBrush.geometry);
  } finally {
    cleanBase.dispose();
    cleanCutter.dispose();
  }
}

function createExtrudedYZ(pointsYZ: Array<[number, number]>, widthX: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  pointsYZ.forEach(([y, z], i) => {
    if (i === 0) shape.moveTo(y, z);
    else shape.lineTo(y, z);
  });
  shape.closePath();

  const geom = new THREE.ExtrudeGeometry(shape, { depth: widthX, bevelEnabled: false, steps: 1 });
  const pos = geom.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const py = pos.getX(i);
    const pz = pos.getY(i);
    const px = pos.getZ(i) - widthX / 2;
    pos.setXYZ(i, px, py, pz);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return normalizeForMerge(geom);
}

function groundGeometryAtZ0(geom: THREE.BufferGeometry): THREE.BufferGeometry {
  geom.computeBoundingBox();
  if (geom.boundingBox) {
    geom.translate(0, 0, -geom.boundingBox.min.z);
  }
  geom.computeBoundingBox();
  return geom;
}

export interface SingleHardwareResult {
  geometry: THREE.BufferGeometry;
  radialWallMm: number;
  effectiveChamferMm: number;
}

/**
 * Generates a single grounded (`Z = 0`) manifold geometry for any of the 5 hardware profiles.
 */
export function generateSingleHardwareGeometry(
  options: WasherSpacerShimOptions
): SingleHardwareResult {
  const check = validateHardwareOptions(options);
  if (!check.valid) {
    throw new Error(check.error || 'Invalid hardware configuration.');
  }

  const radialWallMm = computeRadialWallMm(options);
  const boreR = (options.innerDiameterMm + options.holeToleranceMm) / 2;
  const outerR = options.outerDiameterMm / 2;
  const h = options.heightMm;

  let geom: THREE.BufferGeometry;
  let effectiveChamferMm = 0;

  if (options.partType === 'washer_spacer') {
    const c = Number(Math.min(options.chamferMm, radialWallMm * 0.42, h * 0.42).toFixed(4));
    effectiveChamferMm = c;
    const pts: THREE.Vector2[] = [];
    if (c > 0.02) {
      pts.push(
        new THREE.Vector2(boreR + c, 0),
        new THREE.Vector2(outerR - c, 0),
        new THREE.Vector2(outerR, c),
        new THREE.Vector2(outerR, h - c),
        new THREE.Vector2(outerR - c, h),
        new THREE.Vector2(boreR + c, h),
        new THREE.Vector2(boreR, h - c),
        new THREE.Vector2(boreR, c),
        new THREE.Vector2(boreR + c, 0)
      );
    } else {
      pts.push(
        new THREE.Vector2(boreR, 0),
        new THREE.Vector2(outerR, 0),
        new THREE.Vector2(outerR, h),
        new THREE.Vector2(boreR, h),
        new THREE.Vector2(boreR, 0)
      );
    }
    const raw = new THREE.LatheGeometry(pts, 64);
    raw.rotateX(Math.PI / 2);
    geom = groundGeometryAtZ0(normalizeForMerge(raw));
    raw.dispose();
  } else if (options.partType === 'flanged_bushing') {
    const flangeR = options.flangeDiameterMm / 2;
    const fh = options.flangeHeightMm;
    const stepWall = flangeR - outerR;
    const c = Number(
      Math.min(options.chamferMm, radialWallMm * 0.38, stepWall * 0.38, fh * 0.38, (h - fh) * 0.38).toFixed(4)
    );
    effectiveChamferMm = c;

    const pts: THREE.Vector2[] = [];
    if (c > 0.02) {
      pts.push(
        new THREE.Vector2(boreR + c, 0),
        new THREE.Vector2(flangeR - c, 0),
        new THREE.Vector2(flangeR, c),
        new THREE.Vector2(flangeR, fh - c),
        new THREE.Vector2(flangeR - c, fh),
        new THREE.Vector2(outerR, fh),
        new THREE.Vector2(outerR, h - c),
        new THREE.Vector2(outerR - c, h),
        new THREE.Vector2(boreR + c, h),
        new THREE.Vector2(boreR, h - c),
        new THREE.Vector2(boreR, c),
        new THREE.Vector2(boreR + c, 0)
      );
    } else {
      pts.push(
        new THREE.Vector2(boreR, 0),
        new THREE.Vector2(flangeR, 0),
        new THREE.Vector2(flangeR, fh),
        new THREE.Vector2(outerR, fh),
        new THREE.Vector2(outerR, h),
        new THREE.Vector2(boreR, h),
        new THREE.Vector2(boreR, 0)
      );
    }
    const raw = new THREE.LatheGeometry(pts, 64);
    raw.rotateX(Math.PI / 2);
    geom = groundGeometryAtZ0(normalizeForMerge(raw));
    raw.dispose();
  } else if (options.partType === 'hex_standoff') {
    const c = Number(Math.min(options.chamferMm, radialWallMm * 0.35, h * 0.35).toFixed(4));
    effectiveChamferMm = c;
    const circumR = options.outerDiameterMm / Math.sqrt(3);
    const hexShape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const hx = circumR * Math.cos(a);
      const hy = circumR * Math.sin(a);
      if (i === 0) hexShape.moveTo(hx, hy);
      else hexShape.lineTo(hx, hy);
    }
    hexShape.closePath();

    const holePath = new THREE.Path();
    holePath.absarc(0, 0, boreR, 0, Math.PI * 2, true);
    hexShape.holes.push(holePath);

    const coreDepth = Math.max(0.1, h - (c > 0.02 ? 2 * c : 0));
    const raw = new THREE.ExtrudeGeometry(hexShape, {
      depth: coreDepth,
      bevelEnabled: c > 0.02,
      bevelThickness: c > 0.02 ? c : 0,
      bevelSize: c > 0.02 ? Math.min(c, radialWallMm * 0.32) : 0,
      bevelSegments: 1,
      curveSegments: 36,
    });
    geom = groundGeometryAtZ0(normalizeForMerge(raw));
    raw.dispose();
  } else if (options.partType === 'leveling_wedge') {
    const L = options.wedgeLengthMm;
    const W = options.outerDiameterMm;
    const zMin = options.wedgeMinHeightMm;
    const zMax = options.heightMm;

    const profile: Array<[number, number]> = [
      [-L / 2, 0],
      [L / 2, 0],
      [L / 2, zMax],
    ];

    if (options.includeWedgeRibs && L >= 24) {
      const step = 4.5;
      const ribDepth = Math.min(0.55, (zMax - zMin) * 0.35);
      const count = Math.floor((L - 8) / step);
      for (let i = 0; i < count; i++) {
        const yHigh = L / 2 - 4 - i * step;
        const yMid = yHigh - step * 0.45;
        const yLow = yHigh - step * 0.85;
        const tHigh = (yHigh + L / 2) / L;
        const tMid = (yMid + L / 2) / L;
        const tLow = (yLow + L / 2) / L;
        const zHigh = zMin + tHigh * (zMax - zMin);
        const zMid = Math.max(zMin * 0.85, zMin + tMid * (zMax - zMin) - ribDepth);
        const zLow = zMin + tLow * (zMax - zMin);
        profile.push([yHigh, zHigh], [yMid, zMid], [yLow, zLow]);
      }
    }
    profile.push([-L / 2, zMin]);

    let baseWedge = createExtrudedYZ(profile, W);
    if (options.includeScrewSlot) {
      const slotW = Math.min(W * 0.45, Math.max(2.5, options.innerDiameterMm + options.holeToleranceMm));
      const slotLen = L * 0.45;
      const cutterShape = new THREE.Shape();
      const sr = slotW / 2;
      const halfStraight = Math.max(2, slotLen / 2 - sr);
      cutterShape.absarc(0, halfStraight, sr, 0, Math.PI, false);
      cutterShape.absarc(0, -halfStraight, sr, Math.PI, Math.PI * 2, false);
      cutterShape.closePath();

      const cutterExtrude = new THREE.ExtrudeGeometry(cutterShape, {
        depth: zMax + 4,
        bevelEnabled: false,
        curveSegments: 24,
      });
      cutterExtrude.translate(0, 0, -1.5);
      const subtracted = subtractGeometries(baseWedge, cutterExtrude);
      baseWedge.dispose();
      cutterExtrude.dispose();
      baseWedge = subtracted;
    }
    geom = groundGeometryAtZ0(baseWedge);
  } else {
    // u_slot_shim
    const W = options.outerDiameterMm;
    const L = options.wedgeLengthMm;
    const c = Number(Math.min(options.chamferMm, radialWallMm * 0.3, h * 0.3).toFixed(4));
    effectiveChamferMm = c;
    const sr = (options.innerDiameterMm + options.holeToleranceMm) / 2;
    const cr = Math.min(2.5, W * 0.14);
    const hw = W / 2;
    const hl = L / 2;

    const shim = new THREE.Shape();
    shim.moveTo(-hw + cr, -hl);
    shim.lineTo(-sr, -hl);
    shim.lineTo(-sr, 0);
    shim.absarc(0, 0, sr, Math.PI, 0, true);
    shim.lineTo(sr, -hl);
    shim.lineTo(hw - cr, -hl);
    shim.quadraticCurveTo(hw, -hl, hw, -hl + cr);
    shim.lineTo(hw, hl - cr);
    shim.quadraticCurveTo(hw, hl, hw - cr, hl);
    shim.lineTo(-hw + cr, hl);
    shim.quadraticCurveTo(-hw, hl, -hw, hl - cr);
    shim.lineTo(-hw, -hl + cr);
    shim.quadraticCurveTo(-hw, -hl, -hw + cr, -hl);
    shim.closePath();

    const coreDepth = Math.max(0.1, h - (c > 0.02 ? 2 * c : 0));
    const raw = new THREE.ExtrudeGeometry(shim, {
      depth: coreDepth,
      bevelEnabled: c > 0.02,
      bevelThickness: c > 0.02 ? c : 0,
      bevelSize: c > 0.02 ? Math.min(c, radialWallMm * 0.28) : 0,
      bevelSegments: 1,
      curveSegments: 32,
    });
    geom = groundGeometryAtZ0(normalizeForMerge(raw));
    raw.dispose();
  }

  // Optional 0.4mm breakaway brim skirt for tall tiny cylindrical / hex parts
  if (options.includeBrimTabs) {
    geom.computeBoundingBox();
    const box = geom.boundingBox!;
    const rx = (box.max.x - box.min.x) / 2;
    const brimShape = new THREE.Shape();
    const brimOuter = rx + 2.4;
    const brimInner = Math.max(boreR + 0.1, rx - 0.15);
    brimShape.absarc(0, 0, brimOuter, 0, Math.PI * 2, false);
    const brimHole = new THREE.Path();
    brimHole.absarc(0, 0, brimInner, 0, Math.PI * 2, true);
    brimShape.holes.push(brimHole);

    const brimGeom = new THREE.ExtrudeGeometry(brimShape, {
      depth: 0.4,
      bevelEnabled: false,
      curveSegments: 48,
    });
    const combined = mergeCleanGeometries([geom, brimGeom]);
    geom.dispose();
    brimGeom.dispose();
    geom = groundGeometryAtZ0(combined);
  }

  return {
    geometry: geom,
    radialWallMm,
    effectiveChamferMm,
  };
}

/**
 * Generates an aligned `cols x rows` build-plate array of `1..24` hardware parts grounded at `Z = 0`.
 */
export function generateHardwarePlateParts(
  options: WasherSpacerShimOptions
): HardwarePlateParts {
  const single = generateSingleHardwareGeometry(options);
  single.geometry.computeBoundingBox();
  const sBox = single.geometry.boundingBox!;

  // Center single part XY cleanly around (0, 0) while preserving Z >= 0
  const offsetX = -(sBox.min.x + sBox.max.x) / 2;
  const offsetY = -(sBox.min.y + sBox.max.y) / 2;
  if (Math.abs(offsetX) > 1e-4 || Math.abs(offsetY) > 1e-4) {
    single.geometry.translate(offsetX, offsetY, 0);
    single.geometry.computeBoundingBox();
  }

  const box = single.geometry.boundingBox!;
  const partWidthMm = Number((box.max.x - box.min.x).toFixed(2));
  const partDepthMm = Number((box.max.y - box.min.y).toFixed(2));
  const partHeightMm = Number((box.max.z - box.min.z).toFixed(2));

  const quantity = Math.max(1, Math.min(24, Math.round(options.quantity)));
  const cols = Math.ceil(Math.sqrt(quantity));
  const rows = Math.ceil(quantity / cols);

  const pitchX = partWidthMm + PART_ARRAY_GAP_MM;
  const pitchY = partDepthMm + PART_ARRAY_GAP_MM;
  const plateWidthMm = Number((cols * partWidthMm + Math.max(0, cols - 1) * PART_ARRAY_GAP_MM).toFixed(2));
  const plateDepthMm = Number((rows * partDepthMm + Math.max(0, rows - 1) * PART_ARRAY_GAP_MM).toFixed(2));

  const partGeometries: THREE.BufferGeometry[] = [];
  for (let i = 0; i < quantity; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = Number((-plateWidthMm / 2 + partWidthMm / 2 + col * pitchX).toFixed(3));
    const cy = Number((plateDepthMm / 2 - partDepthMm / 2 - row * pitchY).toFixed(3));

    const clone = single.geometry.clone();
    clone.translate(cx, cy, 0);
    clone.computeBoundingBox();
    partGeometries.push(clone);
  }

  const mergedGeometry = mergeCleanGeometries(partGeometries);

  return {
    singleGeometry: single.geometry,
    partGeometries,
    mergedGeometry,
    partWidthMm,
    partDepthMm,
    partHeightMm,
    plateWidthMm,
    plateDepthMm,
    radialWallMm: single.radialWallMm,
    effectiveChamferMm: single.effectiveChamferMm,
    quantity,
    cols,
    rows,
    dispose() {
      single.geometry.dispose();
      mergedGeometry.dispose();
      partGeometries.forEach((g) => g.dispose());
    },
  };
}

function countTriangles(geom: THREE.BufferGeometry): number {
  const idx = geom.getIndex();
  if (idx) return Math.floor(idx.count / 3);
  const pos = geom.getAttribute('position');
  return pos ? Math.floor(pos.count / 3) : 0;
}

function computeSignedVolumeMm3(geom: THREE.BufferGeometry): number {
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
 * Single-pass dimension, triangle, mass, print-time, and aspect-ratio stability telemetry.
 */
export function calculateHardwareMetrics(
  options: WasherSpacerShimOptions,
  parts: HardwarePlateParts
): HardwarePartMetrics {
  const triangleCount = countTriangles(parts.mergedGeometry);
  const solidVolMm3 = computeSignedVolumeMm3(parts.mergedGeometry);
  const rawCm3 = Math.max(
    0.4,
    (solidVolMm3 > 10 ? solidVolMm3 : parts.partWidthMm * parts.partDepthMm * parts.partHeightMm * parts.quantity * 0.4) /
      1000
  );
  // Washers/spacers typically print near 60% effective infill+perimeters mass
  const estimatedWeightG = Number(Math.max(0.6, rawCm3 * 0.6 * 1.24).toFixed(1));
  const estimatedPrintTimeHours = Number(Math.max(0.08, estimatedWeightG / 18.0).toFixed(2));

  const isVerticalAxis =
    options.partType === 'washer_spacer' ||
    options.partType === 'flanged_bushing' ||
    options.partType === 'hex_standoff';
  const highAspectWarning =
    isVerticalAxis && options.heightMm / Math.max(1, options.outerDiameterMm) > 3.0;
  const exceedsStandardBed =
    parts.plateWidthMm > STANDARD_BED_SIZE_MM || parts.plateDepthMm > STANDARD_BED_SIZE_MM;

  return {
    widthMm: parts.plateWidthMm,
    depthMm: parts.plateDepthMm,
    heightMm: parts.partHeightMm,
    radialWallMm: parts.radialWallMm,
    highAspectWarning,
    triangleCount,
    estimatedWeightG,
    estimatedPrintTimeHours,
    exceedsStandardBed,
  };
}

/**
 * Exports all build-plate parts as a little-endian binary .STL buffer.
 */
export function exportToBinaryStl(parts: HardwarePlateParts): ArrayBuffer {
  const geom = parts.mergedGeometry;
  const totalTriangles = countTriangles(geom);
  const buffer = new ArrayBuffer(84 + totalTriangles * 50);
  const view = new DataView(buffer);

  // Header MUST NOT start with 'solid ' or slicers misdetect ASCII STL
  const header = 'PrivKnife Binary STL - Parametric Washer Spacer Standoff Shim Maker';
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }
  view.setUint32(80, totalTriangles, true);

  const pos = geom.getAttribute('position');
  const idx = geom.getIndex();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();

  let offset = 84;
  for (let t = 0; t < totalTriangles; t++) {
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
  name: string
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

  return `    <object id="${objectId}" name="${escapeXml(name)}" pid="1" pindex="0" type="model">
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
 * Exports each cloned build-plate copy as an independent `<object>` inside a valid `.3MF` archive.
 */
export async function exportTo3mf(
  options: WasherSpacerShimOptions,
  parts: HardwarePlateParts
): Promise<Blob> {
  const colorHex = to3mfColor(options.partColorHex, '#2563EBFF');
  const objects: string[] = [];
  const buildItems: string[] = [];

  parts.partGeometries.forEach((geom, idx) => {
    const objId = idx + 2;
    objects.push(serialize3mfObject(geom, objId, `${options.partType}-${idx + 1}`));
    buildItems.push(`    <item objectid="${objId}" />`);
  });

  const safeTitle = `${options.partType} x${parts.quantity} (${parts.partWidthMm}x${parts.partDepthMm}x${parts.partHeightMm}mm)`;

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">${escapeXml(safeTitle)}</metadata>
  <metadata name="Application">PrivKnife Client-Side 3D Studio</metadata>
  <resources>
    <basematerials id="1">
      <base name="Hardware Part Filament" displaycolor="${colorHex}" />
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

export function buildHardwareFileBase(options: WasherSpacerShimOptions): string {
  const qty = Math.max(1, Math.min(24, Math.round(options.quantity || 1)));
  return `privknife-${options.partType}-x${qty}`;
}
