import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import JSZip from 'jszip';
import {
  DeviceCradleMetrics,
  DeviceCradlePartEntry,
  DeviceCradleParts,
  DeviceCradleValidationResult,
  DeviceWallCradleOptions,
  STANDARD_BED_SIZE_MM,
} from './types';

function isFiniteNum(v: number, min: number, max: number): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

/**
 * Validates caliper dimensions, >= 2.8mm structural wall thickness, screw gauge, and internal floor access.
 */
export function validateDeviceCradleOptions(
  options: DeviceWallCradleOptions
): DeviceCradleValidationResult {
  if (!options || typeof options !== 'object') {
    return { valid: false, error: 'Device cradle options are required.' };
  }
  if (!isFiniteNum(options.deviceWidthMm, 30, 280)) {
    return { valid: false, error: 'Device width must be between 30 and 280 mm.' };
  }
  if (!isFiniteNum(options.deviceThicknessMm, 14, 90)) {
    return { valid: false, error: 'Device thickness must be between 14 and 90 mm.' };
  }
  if (!isFiniteNum(options.mountSpanMm, 25, 180)) {
    return { valid: false, error: 'Mount depth / height span must be between 25 and 180 mm.' };
  }
  if (!isFiniteNum(options.wallThicknessMm, 2.8, 6.0)) {
    return { valid: false, error: 'Wall thickness must be at least 2.8 mm (range 2.8–6.0 mm).' };
  }
  if (!isFiniteNum(options.fitClearanceMm, 0.4, 2.0)) {
    return { valid: false, error: 'Device fit clearance must be between 0.4 and 2.0 mm.' };
  }
  if (
    options.cradleStyle === 'slide_rails_pair' &&
    !isFiniteNum(options.railShelfWidthMm, 10, 28)
  ) {
    return { valid: false, error: 'Rail shelf width must be between 10 and 28 mm.' };
  }
  if (!isFiniteNum(options.screwDiameterMm, 3.2, 5.5)) {
    return { valid: false, error: 'Screw shank diameter must be between 3.2 and 5.5 mm.' };
  }
  if (options.mountFlangePlacement === 'internal_floor' && options.deviceWidthMm < 40) {
    return {
      valid: false,
      error: 'Internal floor mounting requires device width >= 40 mm for screwdriver clearance.',
    };
  }
  return { valid: true };
}

function normalizeForCsg(geom: THREE.BufferGeometry): THREE.BufferGeometry {
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

function mergeGeoms(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const clean = list.map((g) => normalizeForCsg(g));
  const merged = BufferGeometryUtils.mergeGeometries(clean, false);
  clean.forEach((g) => g.dispose());
  if (!merged) {
    throw new Error('Failed to merge cradle geometries.');
  }
  merged.computeBoundingBox();
  return merged;
}

function subtractCsg(
  baseGeom: THREE.BufferGeometry,
  cutterGeom: THREE.BufferGeometry
): THREE.BufferGeometry {
  const cleanBase = normalizeForCsg(baseGeom);
  const cleanCutter = normalizeForCsg(cutterGeom);
  const evaluator = new Evaluator();
  evaluator.attributes = ['position', 'normal'];
  evaluator.useGroups = false;

  const baseBrush = new Brush(cleanBase);
  const cutterBrush = new Brush(cleanCutter);
  baseBrush.updateMatrixWorld();
  cutterBrush.updateMatrixWorld();

  try {
    const res = evaluator.evaluate(baseBrush, cutterBrush, SUBTRACTION);
    return normalizeForCsg(res.geometry);
  } finally {
    cleanBase.dispose();
    cleanCutter.dispose();
  }
}

function createCountersunkBoreY(
  cx: number,
  topSurfaceY: number,
  bottomSurfaceY: number,
  cz: number,
  screwDiaMm: number
): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const shankR = screwDiaMm / 2;
  const totalLen = topSurfaceY - bottomSurfaceY + 1.2;
  const cyl = new THREE.CylinderGeometry(shankR, shankR, totalLen, 20);
  cyl.translate(cx, (topSurfaceY + bottomSurfaceY) / 2, cz);
  parts.push(cyl);

  const headDepth = Math.min(2.6, Math.max(1.8, screwDiaMm * 0.52));
  const topR = shankR + headDepth;
  const cone = new THREE.CylinderGeometry(topR, shankR, headDepth + 0.35, 24);
  cone.translate(cx, topSurfaceY - headDepth / 2 + 0.15, cz);
  parts.push(cone);

  const merged = mergeGeoms(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

function createStadiumCutX(
  minX: number,
  maxX: number,
  cy: number,
  cz: number,
  slotHeightY: number,
  slotLenZ: number
): THREE.BufferGeometry {
  const widthX = maxX - minX;
  const r = Math.max(1.2, slotHeightY / 2);
  const halfLen = Math.max(r + 1.5, slotLenZ / 2);
  const shape = new THREE.Shape();
  // Cross section in (Y, Z) extruded along X
  const straight = Math.max(1, halfLen - r);
  shape.absarc(0, straight, r, 0, Math.PI, false);
  shape.absarc(0, -straight, r, Math.PI, Math.PI * 2, false);
  shape.closePath();

  const ext = new THREE.ExtrudeGeometry(shape, { depth: widthX, bevelEnabled: false, curveSegments: 16 });
  const pos = ext.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const sy = pos.getX(i) + cy;
    const sz = pos.getY(i) + cz;
    const sx = pos.getZ(i) + minX;
    pos.setXYZ(i, sx, sy, sz);
  }
  pos.needsUpdate = true;
  ext.computeVertexNormals();
  return normalizeForCsg(ext);
}

function createBox(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  minZ: number,
  maxZ: number
): THREE.BufferGeometry {
  const box = new THREE.BoxGeometry(maxX - minX, maxY - minY, maxZ - minZ);
  box.translate((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
  return normalizeForCsg(box);
}

function computeScrewZPositions(mountSpanMm: number): number[] {
  const edgeOffset = Math.min(18, mountSpanMm * 0.26);
  if (mountSpanMm < 36) {
    return [mountSpanMm / 2];
  }
  return [Number(edgeOffset.toFixed(2)), Number((mountSpanMm - edgeOffset).toFixed(2))];
}

function computeVentZPositions(mountSpanMm: number): number[] {
  const usable = mountSpanMm - 22;
  if (usable < 14) return [];
  const count = Math.min(4, Math.max(1, Math.floor(usable / 28) + 1));
  if (count === 1) return [mountSpanMm / 2];
  const step = usable / count;
  const start = (mountSpanMm - usable) / 2 + step / 2;
  return Array.from({ length: count }, (_, i) => Number((start + i * step).toFixed(2)));
}

function buildSingleSlideRail(
  side: 'left' | 'right',
  options: DeviceWallCradleOptions,
  innerH: number
): { geometry: THREE.BufferGeometry; screwCount: number; ventCount: number } {
  const w = options.wallThicknessMm;
  const flangeT = Math.max(w, 3.6);
  const outerH = flangeT + innerH + w;
  const shelfW = options.railShelfWidthMm;
  const earW = options.mountFlangePlacement === 'external_ears' ? 16 : 0;
  const span = options.mountSpanMm;

  const shape = new THREE.Shape();
  if (side === 'left') {
    const earLeft = -(w + earW);
    shape.moveTo(earLeft, 0);
    shape.lineTo(0, 0);
    shape.lineTo(0, flangeT + innerH);
    shape.lineTo(shelfW, flangeT + innerH);
    shape.lineTo(shelfW, outerH);
    shape.lineTo(-w, outerH);
    if (earW > 0) {
      shape.lineTo(-w, flangeT + 2);
      shape.lineTo(-w - 2, flangeT);
      shape.lineTo(earLeft, flangeT);
    }
    shape.closePath();
  } else {
    const earRight = w + earW;
    shape.moveTo(0, 0);
    shape.lineTo(earRight, 0);
    if (earW > 0) {
      shape.lineTo(earRight, flangeT);
      shape.lineTo(w + 2, flangeT);
      shape.lineTo(w, flangeT + 2);
    }
    shape.lineTo(w, outerH);
    shape.lineTo(-shelfW, outerH);
    shape.lineTo(-shelfW, flangeT + innerH);
    shape.lineTo(0, flangeT + innerH);
    shape.closePath();
  }

  let body: THREE.BufferGeometry = normalizeForCsg(
    new THREE.ExtrudeGeometry(shape, { depth: span, bevelEnabled: false, steps: 1 })
  );

  // Add Z = 0 backstop lip if enabled
  if (options.includeBackstop) {
    const stopBox =
      side === 'left'
        ? createBox(-w, Math.min(shelfW, 14), 0, outerH, 0, 3.2)
        : createBox(-Math.min(shelfW, 14), w, 0, outerH, 0, 3.2);
    const mergedStop = mergeGeoms([body, stopBox]);
    body.dispose();
    stopBox.dispose();
    body = mergedStop;
  }

  const cutters: THREE.BufferGeometry[] = [];
  let screwCount = 0;
  let ventCount = 0;

  if (options.mountFlangePlacement !== 'adhesive_flat') {
    const screwZs = computeScrewZPositions(span);
    for (const sz of screwZs) {
      if (options.mountFlangePlacement === 'external_ears') {
        const sx = side === 'left' ? -(w + earW / 2) : w + earW / 2;
        cutters.push(createCountersunkBoreY(sx, flangeT, 0, sz, options.screwDiameterMm));
        screwCount++;
      } else {
        const sx = side === 'left' ? shelfW * 0.5 : -shelfW * 0.5;
        cutters.push(createCountersunkBoreY(sx, outerH, flangeT + innerH, sz, options.screwDiameterMm));
        screwCount++;
      }
    }
  }

  if (options.includeThermalVents) {
    const ventZs = computeVentZPositions(span);
    const ventH = Math.min(18, Math.max(5.5, innerH * 0.42));
    const ventMidY = flangeT + innerH / 2;
    const minX = side === 'left' ? -w - 1.0 : -1.0;
    const maxX = side === 'left' ? 1.0 : w + 1.0;
    for (const vz of ventZs) {
      cutters.push(createStadiumCutX(minX, maxX, ventMidY, vz, ventH, 16));
      ventCount++;
    }
  }

  if (cutters.length > 0) {
    const mergedCut = mergeGeoms(cutters);
    cutters.forEach((c) => c.dispose());
    const carved = subtractCsg(body, mergedCut);
    body.dispose();
    mergedCut.dispose();
    body = carved;
  }

  return { geometry: body, screwCount, ventCount };
}

/**
 * Generates support-free (Z = 0) under-desk / wall-mount cradle meshes and clearance telemetry.
 */
export function generateDeviceCradleParts(
  options: DeviceWallCradleOptions
): DeviceCradleParts {
  const check = validateDeviceCradleOptions(options);
  if (!check.valid) {
    throw new Error(check.error || 'Invalid device cradle options.');
  }

  const innerOpeningWidthMm = Number((options.deviceWidthMm + 2 * options.fitClearanceMm).toFixed(2));
  const innerOpeningHeightMm = Number((options.deviceThicknessMm + options.fitClearanceMm).toFixed(2));
  const w = options.wallThicknessMm;
  const flangeT = Math.max(w, 3.6);
  const span = options.mountSpanMm;

  const partEntries: DeviceCradlePartEntry[] = [];
  let screwHoleCount = 0;
  let ventSlotCount = 0;

  if (options.cradleStyle === 'slide_rails_pair') {
    const leftRes = buildSingleSlideRail('left', options, innerOpeningHeightMm);
    const rightRes = buildSingleSlideRail('right', options, innerOpeningHeightMm);

    leftRes.geometry.computeBoundingBox();
    rightRes.geometry.computeBoundingBox();
    const lb = leftRes.geometry.boundingBox!;
    const rb = rightRes.geometry.boundingBox!;
    const gap = 14;
    const leftShiftX = -gap / 2 - lb.max.x;
    const rightShiftX = gap / 2 - rb.min.x;

    leftRes.geometry.translate(leftShiftX, 0, -lb.min.z);
    rightRes.geometry.translate(rightShiftX, 0, -rb.min.z);

    partEntries.push(
      { name: 'Left Slide Rail', geometry: leftRes.geometry },
      { name: 'Right Slide Rail', geometry: rightRes.geometry }
    );
    screwHoleCount = leftRes.screwCount + rightRes.screwCount;
    ventSlotCount = leftRes.ventCount + rightRes.ventCount;
  } else if (options.cradleStyle === 'u_wrap_cradle') {
    const halfInnerW = innerOpeningWidthMm / 2;
    const halfOuterW = halfInnerW + w;
    const earW = options.mountFlangePlacement === 'external_ears' ? 16 : 0;
    const extX = halfOuterW + earW;
    const outerH = flangeT + innerOpeningHeightMm + w;
    const lipW = Math.min(12, innerOpeningWidthMm * 0.16);

    const shape = new THREE.Shape();
    shape.moveTo(-extX, 0);
    shape.lineTo(extX, 0);
    if (earW > 0) {
      shape.lineTo(extX, flangeT);
      shape.lineTo(halfOuterW + 2, flangeT);
      shape.lineTo(halfOuterW, flangeT + 2);
    }
    shape.lineTo(halfOuterW, outerH);
    shape.lineTo(halfInnerW - lipW, outerH);
    shape.lineTo(halfInnerW - lipW, flangeT + innerOpeningHeightMm);
    shape.lineTo(halfInnerW, flangeT + innerOpeningHeightMm);
    shape.lineTo(halfInnerW, flangeT);
    shape.lineTo(-halfInnerW, flangeT);
    shape.lineTo(-halfInnerW, flangeT + innerOpeningHeightMm);
    shape.lineTo(-halfInnerW + lipW, flangeT + innerOpeningHeightMm);
    shape.lineTo(-halfInnerW + lipW, outerH);
    shape.lineTo(-halfOuterW, outerH);
    if (earW > 0) {
      shape.lineTo(-halfOuterW, flangeT + 2);
      shape.lineTo(-halfOuterW - 2, flangeT);
      shape.lineTo(-extX, flangeT);
    }
    shape.closePath();

    let body: THREE.BufferGeometry = normalizeForCsg(
      new THREE.ExtrudeGeometry(shape, { depth: span, bevelEnabled: false, steps: 1 })
    );

    if (options.includeBackstop) {
      const stopH = Math.min(outerH, flangeT + Math.max(8, innerOpeningHeightMm * 0.42));
      const stopBox = createBox(-halfOuterW, halfOuterW, 0, stopH, 0, 3.2);
      const merged = mergeGeoms([body, stopBox]);
      body.dispose();
      stopBox.dispose();
      body = merged;
    }

    const cutters: THREE.BufferGeometry[] = [];
    if (options.mountFlangePlacement !== 'adhesive_flat') {
      const screwZs = computeScrewZPositions(span);
      for (const sz of screwZs) {
        if (options.mountFlangePlacement === 'external_ears') {
          const sx = halfOuterW + earW / 2;
          cutters.push(createCountersunkBoreY(-sx, flangeT, 0, sz, options.screwDiameterMm));
          cutters.push(createCountersunkBoreY(sx, flangeT, 0, sz, options.screwDiameterMm));
          screwHoleCount += 2;
        } else {
          const offset = Math.min(18, innerOpeningWidthMm * 0.24);
          cutters.push(createCountersunkBoreY(-offset, flangeT, 0, sz, options.screwDiameterMm));
          cutters.push(createCountersunkBoreY(offset, flangeT, 0, sz, options.screwDiameterMm));
          screwHoleCount += 2;
        }
      }
    }

    if (options.includeThermalVents) {
      const ventZs = computeVentZPositions(span);
      const ventH = Math.min(16, Math.max(5.5, innerOpeningHeightMm * 0.42));
      const ventMidY = flangeT + innerOpeningHeightMm / 2;
      for (const vz of ventZs) {
        cutters.push(createStadiumCutX(-halfOuterW - 1, halfOuterW + 1, ventMidY, vz, ventH, 16));
        ventSlotCount += 2;
      }
    }

    if (cutters.length > 0) {
      const mergedCut = mergeGeoms(cutters);
      cutters.forEach((c) => c.dispose());
      const carved = subtractCsg(body, mergedCut);
      body.dispose();
      mergedCut.dispose();
      body = carved;
    }

    body.computeBoundingBox();
    body.translate(0, 0, -body.boundingBox!.min.z);
    partEntries.push({ name: 'U-Wrap Cradle', geometry: body });
  } else {
    // remote_pocket: upright 4-wall enclosed sleeve on Z = 0 floor + cable pass slot + front finger scoop
    const halfInnerW = innerOpeningWidthMm / 2;
    const halfOuterW = halfInnerW + w;
    const outerH = flangeT + innerOpeningHeightMm + w;
    const tabH = options.mountFlangePlacement === 'adhesive_flat' ? 0 : 18;

    const sleeve = new THREE.Shape();
    sleeve.moveTo(-halfOuterW, 0);
    sleeve.lineTo(halfOuterW, 0);
    sleeve.lineTo(halfOuterW, outerH);
    sleeve.lineTo(-halfOuterW, outerH);
    sleeve.closePath();

    const innerHole = new THREE.Path();
    innerHole.moveTo(-halfInnerW, flangeT);
    innerHole.lineTo(-halfInnerW, flangeT + innerOpeningHeightMm);
    innerHole.lineTo(halfInnerW, flangeT + innerOpeningHeightMm);
    innerHole.lineTo(halfInnerW, flangeT);
    innerHole.closePath();
    sleeve.holes.push(innerHole);

    let body: THREE.BufferGeometry = normalizeForCsg(
      new THREE.ExtrudeGeometry(sleeve, { depth: span, bevelEnabled: false, steps: 1 })
    );

    const floorBox = createBox(-halfOuterW, halfOuterW, 0, outerH, 0, w);
    const additions = [body, floorBox];
    if (tabH > 0) {
      additions.push(createBox(-halfOuterW, halfOuterW, 0, flangeT, span - 0.5, span + tabH));
    }
    const baseMerged = mergeGeoms(additions);
    additions.forEach((a) => a.dispose());
    body = baseMerged;

    const cutters: THREE.BufferGeometry[] = [];
    // Bottom charging cable relief notch on Z = 0 floor front
    cutters.push(createBox(-7.5, 7.5, flangeT + 1.5, outerH + 1.5, -0.5, w + 0.5));
    // Front top finger scoop U-notch
    const scoopHalfW = Math.min(12, halfInnerW * 0.6);
    const scoopDepth = Math.min(26, span * 0.28);
    cutters.push(
      createBox(-scoopHalfW, scoopHalfW, flangeT + innerOpeningHeightMm - 0.5, outerH + 1.5, span - scoopDepth, span + 1)
    );

    if (tabH > 0) {
      const holeOffset = Math.min(18, halfOuterW * 0.55);
      cutters.push(createCountersunkBoreY(-holeOffset, flangeT, 0, span + tabH / 2, options.screwDiameterMm));
      cutters.push(createCountersunkBoreY(holeOffset, flangeT, 0, span + tabH / 2, options.screwDiameterMm));
      screwHoleCount = 2;
    }

    if (options.includeThermalVents) {
      const ventZs = computeVentZPositions(span);
      const ventH = Math.min(14, Math.max(5.0, innerOpeningHeightMm * 0.36));
      const ventMidY = flangeT + innerOpeningHeightMm / 2;
      for (const vz of ventZs) {
        cutters.push(createStadiumCutX(-halfOuterW - 1, halfOuterW + 1, ventMidY, vz, ventH, 14));
        ventSlotCount += 2;
      }
    }

    const mergedCut = mergeGeoms(cutters);
    cutters.forEach((c) => c.dispose());
    body = subtractCsg(body, mergedCut);
    mergedCut.dispose();

    body.computeBoundingBox();
    body.translate(0, 0, -body.boundingBox!.min.z);
    partEntries.push({ name: 'Wall Pocket Cradle', geometry: body });
  }

  const mergedGeometry = mergeGeoms(partEntries.map((p) => p.geometry));
  mergedGeometry.computeBoundingBox();
  const box = mergedGeometry.boundingBox!;
  const widthMm = Number((box.max.x - box.min.x).toFixed(2));
  const depthMm = Number((box.max.y - box.min.y).toFixed(2));
  const heightMm = Number((box.max.z - box.min.z).toFixed(2));

  return {
    partGeometries: partEntries,
    mergedGeometry,
    innerOpeningWidthMm,
    innerOpeningHeightMm,
    widthMm,
    depthMm,
    heightMm,
    screwHoleCount,
    ventSlotCount,
    dispose() {
      mergedGeometry.dispose();
      partEntries.forEach((p) => p.geometry.dispose());
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
 * Single-pass dimension, inner opening, bed-fit, and filament telemetry calculation.
 */
export function calculateDeviceCradleMetrics(
  _options: DeviceWallCradleOptions,
  parts: DeviceCradleParts
): DeviceCradleMetrics {
  const triangleCount = countTriangles(parts.mergedGeometry);
  let solidVolMm3 = 0;
  for (const entry of parts.partGeometries) {
    solidVolMm3 += computeSignedVolumeMm3(entry.geometry);
  }

  const fallbackVol = parts.widthMm * parts.depthMm * parts.heightMm * 0.25;
  const rawCm3 = Math.max(4, (solidVolMm3 > 100 ? solidVolMm3 : fallbackVol) / 1000);
  // Structural brackets use ~50% effective infill + 4 perimeters
  const estimatedWeightG = Number((rawCm3 * 0.5 * 1.24).toFixed(1));
  const estimatedPrintTimeHours = Number(Math.max(0.3, estimatedWeightG / 17.5).toFixed(2));
  const exceedsStandardBed =
    parts.widthMm > STANDARD_BED_SIZE_MM || parts.depthMm > STANDARD_BED_SIZE_MM;

  return {
    partCount: parts.partGeometries.length,
    widthMm: parts.widthMm,
    depthMm: parts.depthMm,
    heightMm: parts.heightMm,
    innerOpeningWidthMm: parts.innerOpeningWidthMm,
    innerOpeningHeightMm: parts.innerOpeningHeightMm,
    triangleCount,
    estimatedWeightG,
    estimatedPrintTimeHours,
    exceedsStandardBed,
  };
}

/**
 * Exports all cradle bracket geometries as a little-endian binary .STL ArrayBuffer.
 */
export function exportToBinaryStl(parts: DeviceCradleParts): ArrayBuffer {
  const geom = parts.mergedGeometry;
  const totalTriangles = countTriangles(geom);
  const buffer = new ArrayBuffer(84 + totalTriangles * 50);
  const view = new DataView(buffer);

  // Header MUST NOT begin with 'solid ' or slicers misdetect ASCII STL
  const header = 'PrivKnife Binary STL - Parametric Device Wall & Power Brick Cradle';
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
 * Exports all cradle bracket components into a valid `.3MF` archive Blob.
 */
export async function exportTo3mf(
  options: DeviceWallCradleOptions,
  parts: DeviceCradleParts
): Promise<Blob> {
  const colorHex = to3mfColor(options.filamentColorHex, '#2563EBFF');
  const objects: string[] = [];
  const buildItems: string[] = [];

  parts.partGeometries.forEach((entry, idx) => {
    const objId = idx + 2;
    objects.push(serialize3mfObject(entry.geometry, objId, entry.name));
    buildItems.push(`    <item objectid="${objId}" />`);
  });

  const safeTitle = `Device Cradle (${options.cradleStyle} ${parts.innerOpeningWidthMm}x${parts.innerOpeningHeightMm}mm)`;

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">${escapeXml(safeTitle)}</metadata>
  <metadata name="Application">PrivKnife Client-Side 3D Studio</metadata>
  <resources>
    <basematerials id="1">
      <base name="Bracket Filament" displaycolor="${colorHex}" />
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

export function buildDeviceCradleFileBase(options: DeviceWallCradleOptions): string {
  return `privknife-cradle-${options.cradleStyle}-${Math.round(options.deviceWidthMm)}x${Math.round(
    options.deviceThicknessMm
  )}mm`;
}
