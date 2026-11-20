import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ADDITION, Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import JSZip from 'jszip';
import {
  KNOB_HARDWARE_STANDARDS,
  KnobDialHandwheelOptions,
  KnobDialMetrics,
  KnobParts,
  KnobValidationResult,
} from './types';

function isFiniteNum(v: number, min: number, max: number): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

function isFiniteInt(v: number, min: number, max: number): boolean {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

/**
 * Computes circumscribed hex pocket radius from DIN across-flats width + fit tolerance.
 */
export function computeHexSocketCircumradiusMm(
  flatToFlatMm: number,
  toleranceMm: number
): number {
  const af = flatToFlatMm + toleranceMm;
  return Number((af / 2 / Math.cos(Math.PI / 6)).toFixed(4));
}

function resolveHardwareStandard(options: KnobDialHandwheelOptions) {
  return KNOB_HARDWARE_STANDARDS[
    options.hardwarePreset === 'custom' ? 'M6' : options.hardwarePreset
  ];
}

/**
 * Computes minimum printable radial hub wall around the internal drive/hex pocket.
 */
export function computeMinHubWallMm(options: KnobDialHandwheelOptions): number {
  const hubOd =
    options.neckHeightMm > 0
      ? Math.min(options.gripDiameterMm, options.neckDiameterMm)
      : options.gripDiameterMm;

  let innerDia = options.shaftDiameterMm + options.fitToleranceMm;
  if (options.driveType === 'captive_hex_nut' || options.driveType === 'captive_hex_bolt') {
    const std = resolveHardwareStandard(options);
    innerDia = 2 * computeHexSocketCircumradiusMm(std.acrossFlatsMm, options.fitToleranceMm);
  }
  return Number(((hubOd - innerDia) / 2).toFixed(4));
}

/**
 * Validates grip dimensions, >= 2.5mm hub wall clearance, D-flat depth, and socket cap safety.
 */
export function validateKnobOptions(
  options: KnobDialHandwheelOptions
): KnobValidationResult {
  if (!options || typeof options !== 'object') {
    return { valid: false, error: 'Knob configuration options are required.' };
  }
  if (!isFiniteNum(options.gripDiameterMm, 14, 90)) {
    return { valid: false, error: 'Outer grip diameter must be between 14 and 90 mm.' };
  }
  if (!isFiniteNum(options.gripHeightMm, 10, 45)) {
    return { valid: false, error: 'Grip height must be between 10 and 45 mm.' };
  }
  if (!isFiniteNum(options.neckDiameterMm, 10, 40)) {
    return { valid: false, error: 'Neck diameter must be between 10 and 40 mm.' };
  }
  if (!isFiniteNum(options.neckHeightMm, 0, 15)) {
    return { valid: false, error: 'Neck height must be between 0 and 15 mm.' };
  }
  if (!isFiniteInt(options.knurlOrLobeCount, 3, 48)) {
    return { valid: false, error: 'Knurl/lobe count must be an integer between 3 and 48.' };
  }
  if (!isFiniteNum(options.topBevelMm, 0.4, 4.0)) {
    return { valid: false, error: 'Top bevel chamfer must be between 0.4 and 4.0 mm.' };
  }
  if (!isFiniteNum(options.fitToleranceMm, 0.1, 0.45)) {
    return { valid: false, error: 'Fit tolerance must be between 0.10 and 0.45 mm.' };
  }
  if (!isFiniteNum(options.socketDepthMm, 6, 35)) {
    return { valid: false, error: 'Socket depth must be between 6 and 35 mm.' };
  }

  const totalH = options.gripHeightMm + options.neckHeightMm;
  if (options.socketDepthMm > totalH - 1.5) {
    return {
      valid: false,
      error: `Socket depth must leave at least 1.5 mm closed top wall (max ${(totalH - 1.5).toFixed(1)} mm).`,
    };
  }

  if (
    options.driveType === 'd_shaft' ||
    options.driveType === 'splined' ||
    options.driveType === 'set_screw_round'
  ) {
    if (!isFiniteNum(options.shaftDiameterMm, 3.0, 12.0)) {
      return { valid: false, error: 'Shaft diameter must be between 3.0 and 12.0 mm.' };
    }
  }

  if (options.driveType === 'd_shaft') {
    if (!isFiniteNum(options.dFlatThicknessMm, 2.0, 10.0)) {
      return { valid: false, error: 'D-flat chord thickness must be between 2.0 and 10.0 mm.' };
    }
    if (options.dFlatThicknessMm >= options.shaftDiameterMm - 0.3) {
      return {
        valid: false,
        error: 'D-flat thickness must be at least 0.3 mm smaller than shaft diameter.',
      };
    }
  }

  if (options.driveType === 'splined' && !isFiniteInt(options.splineTeethCount, 12, 24)) {
    return { valid: false, error: 'Spline teeth count must be an integer between 12 and 24.' };
  }

  const minWall = computeMinHubWallMm(options);
  if (minWall < 2.5) {
    return {
      valid: false,
      error: `Minimum hub wall around bore (${minWall.toFixed(2)} mm) must be at least 2.50 mm.`,
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

function csgOp(
  baseGeom: THREE.BufferGeometry,
  operandGeom: THREE.BufferGeometry,
  op: typeof ADDITION | typeof SUBTRACTION
): THREE.BufferGeometry {
  const cleanBase = normalizeForCsg(baseGeom);
  const cleanOp = normalizeForCsg(operandGeom);
  const evaluator = new Evaluator();
  evaluator.attributes = ['position', 'normal'];
  evaluator.useGroups = false;

  const baseBrush = new Brush(cleanBase);
  const opBrush = new Brush(cleanOp);
  baseBrush.updateMatrixWorld();
  opBrush.updateMatrixWorld();

  try {
    const res = evaluator.evaluate(baseBrush, opBrush, op);
    return normalizeForCsg(res.geometry);
  } finally {
    cleanBase.dispose();
    cleanOp.dispose();
  }
}

function createGripShape(options: KnobDialHandwheelOptions): THREE.Shape {
  const R = options.gripDiameterMm / 2;
  const segments = 144;
  const shape = new THREE.Shape();

  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    let r = R;

    if (options.gripStyle === 'knurled') {
      const count = Math.max(16, Math.min(48, Math.round(options.knurlOrLobeCount)));
      const phase = ((theta * count) / (Math.PI * 2)) % 1;
      const tri = 2 * Math.abs(phase - 0.5) - 0.5;
      r = R - 0.42 + tri * 0.85;
    } else if (options.gripStyle === 'fluted') {
      const flutes = Math.max(4, Math.min(12, Math.round(options.knurlOrLobeCount)));
      const wave = Math.pow(Math.abs(Math.sin((flutes * theta) / 2)), 1.5);
      const depth = Math.min(2.6, R * 0.2);
      r = R - depth * (1 - wave);
    } else if (options.gripStyle === 'star_handwheel') {
      const lobes = Math.max(3, Math.min(8, Math.round(options.knurlOrLobeCount)));
      const wave = 0.5 + 0.5 * Math.cos(lobes * theta);
      r = R * (0.64 + 0.36 * wave);
    } else {
      // pointer_wing: symmetric cylinder with tapered front wing along +Y (sin(theta) > 0)
      const sinT = Math.sin(theta);
      if (sinT > 0.1) {
        const nose = Math.pow(sinT, 4);
        r = R * (0.88 + 0.65 * nose);
      } else {
        r = R * 0.88;
      }
    }

    const px = r * Math.cos(theta);
    const py = r * Math.sin(theta);
    if (i === 0) shape.moveTo(px, py);
    else shape.lineTo(px, py);
  }
  shape.closePath();
  return shape;
}

function buildDShaftCutter(options: KnobDialHandwheelOptions, maxDepthZ: number): THREE.BufferGeometry {
  const boreR = (options.shaftDiameterMm + options.fitToleranceMm) / 2;
  const dCutoff = options.dFlatThicknessMm + options.fitToleranceMm - boreR;
  const segs = 64;
  const shape = new THREE.Shape();

  for (let i = 0; i < segs; i++) {
    const theta = (i / segs) * Math.PI * 2;
    const x = boreR * Math.cos(theta);
    const y = Math.min(dCutoff, boreR * Math.sin(theta));
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const extrude = new THREE.ExtrudeGeometry(shape, {
    depth: maxDepthZ + 0.5,
    bevelEnabled: false,
    curveSegments: segs,
  });
  extrude.translate(0, 0, -0.5);
  const rotRad = (options.flatRotationDeg * Math.PI) / 180;
  if (Math.abs(rotRad) > 1e-4) {
    extrude.rotateZ(rotRad);
  }
  const clean = normalizeForCsg(extrude);
  extrude.dispose();
  return clean;
}

function buildSplinedCutter(options: KnobDialHandwheelOptions, maxDepthZ: number): THREE.BufferGeometry {
  const teeth = Math.max(12, Math.min(24, Math.round(options.splineTeethCount)));
  const boreR = (options.shaftDiameterMm + options.fitToleranceMm) / 2;
  const rInner = Math.max(1.0, boreR - 0.3);
  const rOuter = boreR + 0.18;
  const pts = teeth * 2;
  const shape = new THREE.Shape();

  for (let i = 0; i < pts; i++) {
    const theta = (i / pts) * Math.PI * 2;
    const r = i % 2 === 0 ? rOuter : rInner;
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const extrude = new THREE.ExtrudeGeometry(shape, {
    depth: maxDepthZ + 0.5,
    bevelEnabled: false,
  });
  extrude.translate(0, 0, -0.5);
  const clean = normalizeForCsg(extrude);
  extrude.dispose();
  return clean;
}

/**
 * Generates watertight Z = 0 replacement knob/handwheel mesh and optional dual-color indicator mark.
 */
export function generateKnobParts(options: KnobDialHandwheelOptions): KnobParts {
  const check = validateKnobOptions(options);
  if (!check.valid) {
    throw new Error(check.error || 'Invalid knob configuration.');
  }

  const totalHeightMm = Number((options.gripHeightMm + options.neckHeightMm).toFixed(2));
  const minHubWallMm = computeMinHubWallMm(options);

  const gripShape = createGripShape(options);
  const bevel = Math.min(options.topBevelMm, options.gripHeightMm * 0.3);
  const rawGrip = new THREE.ExtrudeGeometry(gripShape, {
    depth: Math.max(1.0, options.gripHeightMm - 2 * bevel),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: Math.min(bevel * 0.72, 1.8),
    bevelSegments: 1,
    curveSegments: 144,
  });
  rawGrip.translate(0, 0, options.neckHeightMm + bevel);
  let solidBody = normalizeForCsg(rawGrip);
  rawGrip.dispose();

  // Union rear neck standoff when neckHeightMm > 0
  if (options.neckHeightMm > 0.1) {
    const neckR = options.neckDiameterMm / 2;
    const neckH = options.neckHeightMm + 0.6;
    const neckCyl = new THREE.CylinderGeometry(neckR, neckR, neckH, 48);
    neckCyl.rotateX(Math.PI / 2);
    neckCyl.translate(0, 0, neckH / 2);
    const unioned = csgOp(solidBody, neckCyl, ADDITION);
    solidBody.dispose();
    neckCyl.dispose();
    solidBody = unioned;
  }

  // Build drive / fastener cutter(s)
  const cutters: THREE.BufferGeometry[] = [];
  let hexSocketCircumradiusMm: number | null = null;

  if (options.driveType === 'd_shaft') {
    cutters.push(buildDShaftCutter(options, options.socketDepthMm));
  } else if (options.driveType === 'splined') {
    cutters.push(buildSplinedCutter(options, options.socketDepthMm));
  } else if (options.driveType === 'captive_hex_nut' || options.driveType === 'captive_hex_bolt') {
    const std = resolveHardwareStandard(options);
    const circumR = computeHexSocketCircumradiusMm(std.acrossFlatsMm, options.fitToleranceMm);
    hexSocketCircumradiusMm = circumR;

    const hexPocketH = Math.min(
      options.socketDepthMm - 1.5,
      (options.driveType === 'captive_hex_nut' ? std.nutHeightMm : std.boltHeadHeightMm) + 1.4
    );
    const hexCyl = new THREE.CylinderGeometry(circumR, circumR, hexPocketH + 0.6, 6);
    hexCyl.rotateX(Math.PI / 2);
    hexCyl.translate(0, 0, (hexPocketH + 0.6) / 2 - 0.3);
    cutters.push(normalizeForCsg(hexCyl));
    hexCyl.dispose();

    // Centered through-bolt clearance hole (with optional 0.2mm sacrificial bridge membrane)
    const boltR = (std.boltClearanceMm + options.fitToleranceMm) / 2;
    const startZ = hexPocketH + (options.sacrificialBridgeLayer ? 0.2 : -0.2);
    const topZ = totalHeightMm + 0.6;
    const holeLen = topZ - startZ;
    const throughCyl = new THREE.CylinderGeometry(boltR, boltR, holeLen, 32);
    throughCyl.rotateX(Math.PI / 2);
    throughCyl.translate(0, 0, startZ + holeLen / 2);
    cutters.push(normalizeForCsg(throughCyl));
    throughCyl.dispose();
  } else {
    // set_screw_round: round vertical shaft bore + lateral M3 radial tap hole along +X
    const boreR = (options.shaftDiameterMm + options.fitToleranceMm) / 2;
    const vLen = options.socketDepthMm + 0.5;
    const vCyl = new THREE.CylinderGeometry(boreR, boreR, vLen, 32);
    vCyl.rotateX(Math.PI / 2);
    vCyl.translate(0, 0, vLen / 2 - 0.5);
    cutters.push(normalizeForCsg(vCyl));
    vCyl.dispose();

    const radialZ = Math.max(4.0, options.neckHeightMm + options.gripHeightMm * 0.42);
    const radialLen = options.gripDiameterMm / 2 + 2.0;
    const m3Side = new THREE.CylinderGeometry(1.5, 1.5, radialLen, 20);
    m3Side.rotateZ(Math.PI / 2);
    m3Side.translate(radialLen / 2 - 0.5, 0, radialZ);
    cutters.push(normalizeForCsg(m3Side));
    m3Side.dispose();
  }

  let bodyGeometry: THREE.BufferGeometry;
  if (cutters.length > 0) {
    const mergedCutter =
      cutters.length === 1
        ? cutters[0].clone()
        : (BufferGeometryUtils.mergeGeometries(cutters, false) ?? cutters[0].clone());
    cutters.forEach((c) => c.dispose());
    bodyGeometry = csgOp(solidBody, mergedCutter, SUBTRACTION);
    solidBody.dispose();
    mergedCutter.dispose();
  } else {
    bodyGeometry = solidBody;
  }

  bodyGeometry.computeBoundingBox();
  const bbox = bodyGeometry.boundingBox!;
  if (bbox.min.z < -0.001) {
    bodyGeometry.translate(0, 0, -bbox.min.z);
    bodyGeometry.computeBoundingBox();
  }
  const outerDiameterMm = Number(
    Math.max(bbox.max.x - bbox.min.x, bbox.max.y - bbox.min.y).toFixed(2)
  );
  const measuredHeightMm = Number((bbox.max.z - bbox.min.z).toFixed(2));

  // Optional dual-color high-contrast position indicator tick on top face along +Y
  let indicatorGeometry: THREE.BufferGeometry | null = null;
  if (options.includeIndicatorMark) {
    const R = options.gripDiameterMm / 2;
    const startY = R * 0.16;
    const endY = Math.max(startY + 4.0, R * 0.84);
    const barLen = endY - startY;
    const indBar = new THREE.BoxGeometry(2.1, barLen, 0.8);
    indBar.translate(0, startY + barLen / 2, measuredHeightMm + 0.25);
    indicatorGeometry = normalizeForCsg(indBar);
    indBar.dispose();
  }

  return {
    bodyGeometry,
    indicatorGeometry,
    outerDiameterMm,
    totalHeightMm: measuredHeightMm,
    minHubWallMm,
    hexSocketCircumradiusMm,
    dispose() {
      bodyGeometry.dispose();
      indicatorGeometry?.dispose();
    },
  };
}

function countTriangles(geom: THREE.BufferGeometry): number {
  const idx = geom.getIndex();
  if (idx) return Math.floor(idx.count / 3);
  const pos = geom.getAttribute('position');
  return pos ? Math.floor(pos.count / 3) : 0;
}

function getActiveGeometries(parts: KnobParts): THREE.BufferGeometry[] {
  const list: THREE.BufferGeometry[] = [parts.bodyGeometry];
  if (parts.indicatorGeometry && countTriangles(parts.indicatorGeometry) > 0) {
    list.push(parts.indicatorGeometry);
  }
  return list;
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
 * Single-pass dimension, hub wall, triangle, mass, and print-time telemetry calculation.
 */
export function calculateKnobMetrics(
  _options: KnobDialHandwheelOptions,
  parts: KnobParts
): KnobDialMetrics {
  const geoms = getActiveGeometries(parts);
  let triangleCount = 0;
  let solidVolumeMm3 = 0;

  for (const g of geoms) {
    triangleCount += countTriangles(g);
    solidVolumeMm3 += computeSignedVolumeMm3(g);
  }

  const r = parts.outerDiameterMm / 2;
  const fallbackVol = Math.PI * r * r * parts.totalHeightMm * 0.72;
  const rawCm3 = Math.max(1.0, (solidVolumeMm3 > 10 ? solidVolumeMm3 : fallbackVol) / 1000);
  // Knobs use ~52% effective infill + thick perimeters for shaft torque
  const estimatedWeightG = Number((rawCm3 * 0.52 * 1.24).toFixed(1));
  const estimatedPrintTimeHours = Number(Math.max(0.15, estimatedWeightG / 17.5).toFixed(2));

  return {
    outerDiameterMm: parts.outerDiameterMm,
    totalHeightMm: parts.totalHeightMm,
    minHubWallMm: parts.minHubWallMm,
    triangleCount,
    estimatedWeightG,
    estimatedPrintTimeHours,
  };
}

/**
 * Exports knob body and position indicator mark as a little-endian binary .STL buffer.
 */
export function exportToBinaryStl(parts: KnobParts): ArrayBuffer {
  const geoms = getActiveGeometries(parts);
  let totalTriangles = 0;
  for (const g of geoms) {
    totalTriangles += countTriangles(g);
  }

  const buffer = new ArrayBuffer(84 + totalTriangles * 50);
  const view = new DataView(buffer);

  // Header MUST NOT begin with 'solid ' or slicers misdetect ASCII STL
  const header = 'PrivKnife Binary STL - Parametric Knob Dial & Handwheel Maker';
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
 * Exports multi-color Knob Body and Position Indicator objects into a valid `.3MF` archive Blob.
 */
export async function exportTo3mf(
  options: KnobDialHandwheelOptions,
  parts: KnobParts
): Promise<Blob> {
  const bodyHex = to3mfColor(options.bodyColorHex, '#2563EBFF');
  const indHex = to3mfColor(options.indicatorColorHex, '#F8FAFCFF');

  const objects: string[] = [];
  const buildItems: string[] = [];

  objects.push(serialize3mfObject(parts.bodyGeometry, 2, 'Knob Body', 0));
  buildItems.push('    <item objectid="2" />');

  if (parts.indicatorGeometry && countTriangles(parts.indicatorGeometry) > 0) {
    objects.push(serialize3mfObject(parts.indicatorGeometry, 3, 'Position Indicator', 1));
    buildItems.push('    <item objectid="3" />');
  }

  const safeTitle = `Knob & Handwheel (${options.gripStyle} / ${options.driveType})`;

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">${escapeXml(safeTitle)}</metadata>
  <metadata name="Application">PrivKnife Client-Side 3D Studio</metadata>
  <resources>
    <basematerials id="1">
      <base name="Knob Body Filament" displaycolor="${bodyHex}" />
      <base name="Position Indicator Filament" displaycolor="${indHex}" />
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

export function buildKnobFileBase(options: KnobDialHandwheelOptions): string {
  return `privknife-knob-${options.gripStyle}-${options.driveType}`;
}
