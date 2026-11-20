import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import { countTriangles, computeSignedVolumeMm3, write3mf, writeBinaryStl } from '../shared/mesh-export';
import {
  CableCombClipOptions,
  CableToolMetrics,
  CableToolPartEntry,
  CableToolParts,
  CableToolValidationResult,
} from './types';

function isFiniteNum(v: number, min: number, max: number): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

function isFiniteInt(v: number, min: number, max: number): boolean {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

/**
 * Computes maximum cord length (meters) that fits inside the travel winder annulus channel.
 */
export function calculateWinderCapacityM(options: CableCombClipOptions): number {
  const rCore = options.winderCoreDiameterMm / 2;
  const rOuterInner = options.winderOuterDiameterMm / 2 - 2.4;
  const radialDepth = Math.max(0, rOuterInner - rCore);
  const channelH = Math.max(8, Math.min(20, options.clipDepthMm * 0.78));
  const packedArea = radialDepth * channelH * 0.68;
  const cableR = options.cableDiameterMm / 2;
  const cableArea = Math.PI * cableR * cableR;
  const turns = cableArea > 0 ? packedArea / cableArea : 0;
  const meanDiameter = (rCore + radialDepth / 2) * 2;
  const totalMm = turns * Math.PI * meanDiameter;
  return Number(Math.max(0, totalMm / 1000).toFixed(2));
}

/**
 * Validates wire gauge bounds, bend-radius core limits, pinch ratio, and channel counts.
 */
export function validateCableToolOptions(
  options: CableCombClipOptions
): CableToolValidationResult {
  if (!options || typeof options !== 'object') {
    return { valid: false, error: 'Cable organizer options are required.' };
  }
  if (!isFiniteNum(options.cableDiameterMm, 2.5, 12.0)) {
    return { valid: false, error: 'Cable diameter must be between 2.5 and 12.0 mm.' };
  }
  if (!isFiniteNum(options.entryPinchRatio, 0.78, 0.92)) {
    return { valid: false, error: 'Entry pinch ratio must be between 0.78 and 0.92.' };
  }
  if (!isFiniteNum(options.clipDepthMm, 10, 28)) {
    return { valid: false, error: 'Clip/spool depth must be between 10 and 28 mm.' };
  }

  if (options.mode === 'cable_comb') {
    if (!isFiniteInt(options.slotCount, 3, 14)) {
      return { valid: false, error: 'Cable comb slot count must be an integer between 3 and 14.' };
    }
  } else if (options.mode === 'p_clip_array') {
    if (!isFiniteInt(options.slotCount, 1, 3)) {
      return { valid: false, error: 'P-clip channel count must be between 1 and 3.' };
    }
    if (!isFiniteInt(options.clipQuantity, 1, 12)) {
      return { valid: false, error: 'P-clip plate quantity must be between 1 and 12.' };
    }
  } else if (options.mode === 'travel_winder') {
    if (!isFiniteNum(options.winderOuterDiameterMm, 45, 95)) {
      return { valid: false, error: 'Winder outer diameter must be between 45 and 95 mm.' };
    }
    if (!isFiniteNum(options.winderCoreDiameterMm, 22, 40)) {
      return {
        valid: false,
        error: 'Core hub diameter must be at least 22 mm to prevent USB cable kinking.',
      };
    }
    if (options.winderCoreDiameterMm >= options.winderOuterDiameterMm - 10) {
      return {
        valid: false,
        error: 'Winder core diameter must be at least 10 mm smaller than outer diameter.',
      };
    }
    if (!isFiniteNum(options.winderCordLengthM, 0.5, 3.0)) {
      return { valid: false, error: 'Target cord length must be between 0.5 and 3.0 m.' };
    }
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
    throw new Error('Failed to merge cable tool geometries.');
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
  topY: number,
  cz: number,
  shankDia = 4.0
): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const r = shankDia / 2;
  const cyl = new THREE.CylinderGeometry(r, r, topY + 1.5, 20);
  cyl.translate(cx, topY / 2, cz);
  parts.push(cyl);

  const cone = new THREE.CylinderGeometry(r + 1.9, r, 2.1, 20);
  cone.translate(cx, topY - 0.9, cz);
  parts.push(cone);

  const merged = mergeGeoms(parts);
  parts.forEach((p) => p.dispose());
  return merged;
}

function buildTeardropCombMesh(
  options: CableCombClipOptions,
  singleClipMode: boolean
): THREE.BufferGeometry {
  const slotCount = options.slotCount;
  const slots: Array<{ cx: number; d: number; cavR: number; entryHalfW: number; jawHalfW: number }> = [];

  let cursorX = 0;
  let maxCavR = 0;
  for (let i = 0; i < slotCount; i++) {
    const factor =
      !singleClipMode && options.ascendingSlotGradation && slotCount > 1
        ? 0.85 + 0.4 * (i / (slotCount - 1))
        : 1.0;
    const dSlot = Math.max(2.2, Math.min(13.5, options.cableDiameterMm * factor));
    const cavR = (dSlot + 0.3) / 2;
    const entryHalfW = (dSlot * options.entryPinchRatio) / 2;
    const jawHalfW = Math.min(cavR * 1.15, entryHalfW + 1.1);
    const tineW = Math.max(2.6, dSlot * 0.36);

    if (i === 0) {
      cursorX = cavR + 3.2;
    } else {
      cursorX += slots[i - 1].cavR + tineW + cavR;
    }
    maxCavR = Math.max(maxCavR, cavR);
    slots.push({ cx: cursorX, d: dSlot, cavR, entryHalfW, jawHalfW });
  }

  const lastSlot = slots[slots.length - 1];
  const combEndX = lastSlot.cx + lastSlot.cavR + 3.2;
  const footLen = options.mountStyle === 'screw_hole' ? 12.0 : 0;
  const leftEarX = singleClipMode ? 0 : -footLen;
  const rightEarX = combEndX + footLen;

  const baseH = 4.2;
  const yMax = baseH + maxCavR * 2 + 2.4;

  const shape = new THREE.Shape();
  shape.moveTo(leftEarX, 0);
  shape.lineTo(rightEarX, 0);

  if (footLen > 0) {
    shape.lineTo(rightEarX, baseH + 0.6);
    shape.lineTo(combEndX, baseH + 0.6);
  }
  shape.lineTo(combEndX, yMax);

  for (let i = slots.length - 1; i >= 0; i--) {
    const s = slots[i];
    const yCenter = baseH + s.cavR;
    const yPinch =
      yCenter + Math.sqrt(Math.max(0.15, s.cavR * s.cavR - s.entryHalfW * s.entryHalfW));
    const alpha = Math.atan2(yPinch - yCenter, s.entryHalfW);

    shape.lineTo(s.cx + s.jawHalfW, yMax);
    shape.lineTo(s.cx + s.entryHalfW, yPinch);

    const arcSteps = 18;
    const sweep = Math.PI + 2 * alpha;
    for (let k = 1; k <= arcSteps; k++) {
      const theta = alpha - (k / arcSteps) * sweep;
      const ax = s.cx + s.cavR * Math.cos(theta);
      const ay = yCenter + s.cavR * Math.sin(theta);
      shape.lineTo(ax, ay);
    }

    shape.lineTo(s.cx - s.jawHalfW, yMax);
  }

  shape.lineTo(0, yMax);
  if (leftEarX < 0) {
    shape.lineTo(0, baseH + 0.6);
    shape.lineTo(leftEarX, baseH + 0.6);
  }
  shape.closePath();

  let body = normalizeForCsg(
    new THREE.ExtrudeGeometry(shape, { depth: options.clipDepthMm, bevelEnabled: false, steps: 1 })
  );

  if (options.mountStyle === 'screw_hole') {
    const cutters: THREE.BufferGeometry[] = [];
    cutters.push(createCountersunkBoreY(combEndX + footLen / 2, baseH + 0.6, options.clipDepthMm / 2, 4.0));
    if (!singleClipMode) {
      cutters.push(createCountersunkBoreY(leftEarX / 2, baseH + 0.6, options.clipDepthMm / 2, 4.0));
    }
    const mergedCut = mergeGeoms(cutters);
    cutters.forEach((c) => c.dispose());
    const carved = subtractCsg(body, mergedCut);
    body.dispose();
    mergedCut.dispose();
    body = carved;
  }

  body.computeBoundingBox();
  const box = body.boundingBox!;
  body.translate(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, -box.min.z);
  return body;
}

function buildTravelWinderParts(options: CableCombClipOptions): CableToolPartEntry[] {
  const rOuter = options.winderOuterDiameterMm / 2;
  const rCore = options.winderCoreDiameterMm / 2;
  const rHole = 5.5;
  const wall = 2.4;
  const spoolH = Math.max(12, Math.min(22, options.clipDepthMm));

  // Spool Base (CCW cross section in R-Y revolved around Y then rotated +PI/2 around X -> Z = 0..spoolH)
  const basePts: THREE.Vector2[] = [
    new THREE.Vector2(rHole, 0),
    new THREE.Vector2(rOuter, 0),
    new THREE.Vector2(rOuter, spoolH),
    new THREE.Vector2(rOuter - wall, spoolH),
    new THREE.Vector2(rOuter - wall, wall),
    new THREE.Vector2(rCore + wall, wall),
    new THREE.Vector2(rCore + wall, spoolH - 2.0),
    new THREE.Vector2(rCore, spoolH - 2.0),
    new THREE.Vector2(rCore, wall),
    new THREE.Vector2(rHole, wall),
    new THREE.Vector2(rHole, 0),
  ];
  const rawBase = new THREE.LatheGeometry(basePts, 64);
  rawBase.rotateX(Math.PI / 2);
  let spoolBase = normalizeForCsg(rawBase);
  rawBase.dispose();

  // Opposing 11mm radial USB-C plug-boot exit slots through outer rim
  const slotWidth = Math.max(9.5, options.cableDiameterMm + 5.5);
  const slotCutter = new THREE.BoxGeometry(rOuter * 2 + 4, slotWidth, spoolH - 2.0);
  slotCutter.translate(0, 0, (spoolH - 2.0) / 2 + 2.4);
  const slottedBase = subtractCsg(spoolBase, slotCutter);
  spoolBase.dispose();
  slotCutter.dispose();
  slottedBase.computeBoundingBox();
  slottedBase.translate(0, 0, -slottedBase.boundingBox!.min.z);
  spoolBase = slottedBase;

  // Spool Lid sitting flush on Z = 0 beside base
  const lidPts: THREE.Vector2[] = [
    new THREE.Vector2(rHole, 0),
    new THREE.Vector2(rOuter, 0),
    new THREE.Vector2(rOuter, 2.4),
    new THREE.Vector2(rOuter - wall - 0.35, 2.4),
    new THREE.Vector2(rOuter - wall - 0.35, 3.8),
    new THREE.Vector2(rOuter - wall * 2 - 0.35, 3.8),
    new THREE.Vector2(rOuter - wall * 2 - 0.35, 2.4),
    new THREE.Vector2(rHole, 2.4),
    new THREE.Vector2(rHole, 0),
  ];
  const rawLid = new THREE.LatheGeometry(lidPts, 64);
  rawLid.rotateX(Math.PI / 2);
  const spoolLid = normalizeForCsg(rawLid);
  rawLid.dispose();
  spoolLid.computeBoundingBox();
  const offset = rOuter * 2 + 12;
  spoolBase.translate(-offset / 2, 0, 0);
  spoolLid.translate(offset / 2, 0, -spoolLid.boundingBox!.min.z);

  return [
    { name: 'Spool Base', geometry: spoolBase },
    { name: 'Spool Lid', geometry: spoolLid },
  ];
}

/**
 * Generates support-free teardrop combs, 2-piece travel winders, or batch P-clip arrays at Z = 0.
 */
export function generateCableToolParts(options: CableCombClipOptions): CableToolParts {
  const check = validateCableToolOptions(options);
  if (!check.valid) {
    throw new Error(check.error || 'Invalid cable organizer options.');
  }

  const entryMouthWidthMm = Number((options.cableDiameterMm * options.entryPinchRatio).toFixed(2));
  const cavityDiameterMm = Number((options.cableDiameterMm + 0.3).toFixed(2));
  const maxRecommendedCordM = calculateWinderCapacityM(options);
  const cordCapacityOk =
    options.mode === 'travel_winder' ? maxRecommendedCordM >= options.winderCordLengthM : true;

  const partEntries: CableToolPartEntry[] = [];

  if (options.mode === 'cable_comb') {
    const geom = buildTeardropCombMesh(options, false);
    partEntries.push({ name: 'Desk Cable Comb', geometry: geom });
  } else if (options.mode === 'travel_winder') {
    partEntries.push(...buildTravelWinderParts(options));
  } else {
    // p_clip_array: batch clone 1..12 P-clips on cols x rows XY plate at Z = 0
    const masterClip = buildTeardropCombMesh(options, true);
    masterClip.computeBoundingBox();
    const cBox = masterClip.boundingBox!;
    const cw = cBox.max.x - cBox.min.x;
    const cd = cBox.max.y - cBox.min.y;
    const qty = Math.max(1, Math.min(12, Math.round(options.clipQuantity)));
    const cols = Math.ceil(Math.sqrt(qty));
    const rows = Math.ceil(qty / cols);
    const gap = 8.0;
    const pitchX = cw + gap;
    const pitchY = cd + gap;
    const totalW = cols * cw + (cols - 1) * gap;
    const totalD = rows * cd + (rows - 1) * gap;

    for (let i = 0; i < qty; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = -totalW / 2 + cw / 2 + col * pitchX;
      const cy = totalD / 2 - cd / 2 - row * pitchY;
      const clone = masterClip.clone();
      clone.translate(cx, cy, 0);
      partEntries.push({ name: `Wall P-Clip ${i + 1}`, geometry: clone });
    }
    masterClip.dispose();
  }

  const mergedGeometry = mergeGeoms(partEntries.map((p) => p.geometry));
  mergedGeometry.computeBoundingBox();
  const box = mergedGeometry.boundingBox!;

  return {
    partGeometries: partEntries,
    mergedGeometry,
    entryMouthWidthMm,
    cavityDiameterMm,
    maxRecommendedCordM,
    cordCapacityOk,
    widthMm: Number((box.max.x - box.min.x).toFixed(2)),
    depthMm: Number((box.max.y - box.min.y).toFixed(2)),
    heightMm: Number((box.max.z - box.min.z).toFixed(2)),
    dispose() {
      mergedGeometry.dispose();
      partEntries.forEach((p) => p.geometry.dispose());
    },
  };
}

/**
 * Single-pass detention aperture, spool capacity, bounding, and filament telemetry calculation.
 */
export function calculateCableToolMetrics(
  _options: CableCombClipOptions,
  parts: CableToolParts
): CableToolMetrics {
  const triangleCount = countTriangles(parts.mergedGeometry);
  let solidVolMm3 = 0;
  for (const entry of parts.partGeometries) {
    solidVolMm3 += computeSignedVolumeMm3(entry.geometry);
  }

  const fallbackVol = parts.widthMm * parts.depthMm * parts.heightMm * 0.25;
  const rawCm3 = Math.max(1.2, (solidVolMm3 > 10 ? solidVolMm3 : fallbackVol) / 1000);
  const estimatedWeightG = Number((rawCm3 * 0.45 * 1.24).toFixed(1));
  const estimatedPrintTimeHours = Number(Math.max(0.12, estimatedWeightG / 18.0).toFixed(2));

  return {
    entryMouthWidthMm: parts.entryMouthWidthMm,
    cavityDiameterMm: parts.cavityDiameterMm,
    maxRecommendedCordM: parts.maxRecommendedCordM,
    cordCapacityOk: parts.cordCapacityOk,
    widthMm: parts.widthMm,
    depthMm: parts.depthMm,
    heightMm: parts.heightMm,
    triangleCount,
    estimatedWeightG,
    estimatedPrintTimeHours,
  };
}

/**
 * Exports all cable tool parts as a little-endian binary .STL ArrayBuffer.
 */
export function exportToBinaryStl(parts: CableToolParts): ArrayBuffer {
  return writeBinaryStl(parts.mergedGeometry, 'PrivKnife Binary STL - Parametric Cable Comb Winder & Clip Maker');
}

export function exportTo3mf(options: CableCombClipOptions, parts: CableToolParts): Promise<Blob> {
  return write3mf(
    `Cable Organizer (${options.mode}: ${options.cableDiameterMm}mm)`,
    parts.partGeometries,
    [{ name: 'Cable Organizer Filament', hex: options.filamentColorHex }],
    3,
  );
}

export function buildCableToolFileBase(options: CableCombClipOptions): string {
  return `privknife-${options.mode}-${Math.round(options.cableDiameterMm)}mm`;
}
