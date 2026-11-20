import * as THREE from 'three';
import { booleanMesh, box, combine, extrude, MeshPart, revolve, within } from '../shared/mesh';
import { exportMeshStl, measureMeshes, write3mf } from '../shared/mesh-export';
import { strokeLabel } from '../shared/stroke-label';
import { ContainerToolMetrics, SPOOL_HUBS, ThreadedTubePillOptions } from './types';

const TAU = Math.PI * 2;
const TURNS = 2;
const PILL_FLOOR_MM = 2.4;
const POD_FLANGE_MM = 2.4;
const PILL_INTERIOR_MM = 12;
const LID_MM = 2.4;
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function axialSamples(radius: number, height: number, start = 0): [number, number][] {
  const steps = Math.max(2, Math.ceil(height / 0.14));
  return Array.from({ length: steps + 1 }, (_, i) => [radius, start + height * i / steps]);
}

function smoothStep(value: number): number {
  const u = THREE.MathUtils.clamp(value, 0, 1);
  return u * u * (3 - 2 * u);
}

/** Radial rise of a trapezoid with 45° flanks in the Z/radius plane. */
function threadRise(angle: number, z: number, pitch: number, turns = TURNS): number {
  const theta = ((angle / TAU) % 1 + 1) % 1;
  const origin = pitch / 2;
  const nearest = Math.round((z - origin) / pitch - theta);
  const u = theta + nearest;
  const lead = 35 / 360;
  const fade = smoothStep(u / lead) * smoothStep((turns - u) / lead);
  const flank = Math.max(0, 0.41 * pitch - Math.abs(z - origin - u * pitch));
  return Math.min(0.35 * pitch, flank) * fade;
}

export function buildHelixThreadGeometry(radius: number, pitch: number, turns = TURNS): THREE.BufferGeometry {
  if (!within(radius, 1, 100) || !within(pitch, 2.5, 5) || !within(turns, 1, 5)) throw new RangeError('Invalid helix dimensions.');
  const height = (turns + 1) * pitch;
  const profile = axialSamples(radius, height);
  return revolve([[radius - 0.12, 0], ...profile, [radius - 0.12, height]], 144,
    (r, z, angle, ring) => ring === 0 || ring === profile.length + 1 ? r : r + threadRise(angle, z, pitch, turns));
}

function spoolBore(options: ThreadedTubePillOptions): number {
  return options.spoolPreset === 'custom'
    ? options.outerDiameterMm
    : SPOOL_HUBS[options.spoolPreset as keyof typeof SPOOL_HUBS];
}

export function getThreadDimensions(options: ThreadedTubePillOptions) {
  const { wallThicknessMm: wall, threadPitchMm: pitch, threadClearanceMm: clearance } = options;
  const outerRadius = (options.mode === 'desiccant_pod' ? spoolBore(options) - 0.8 : options.outerDiameterMm) / 2;
  const threadDepth = 0.35 * pitch;
  const maleRoot = outerRadius - wall - clearance - threadDepth;
  const bodyBore = outerRadius - wall;
  const neckBore = maleRoot - wall;
  return {
    outerRadius,
    bodyBore,
    neckBore,
    maleRoot,
    maleMajorDiameterMm: (maleRoot + threadDepth) * 2,
    femaleMajorDiameterMm: (maleRoot + threadDepth + clearance) * 2,
    neckWallRemainingMm: maleRoot - neckBore,
    threadHeight: pitch * (TURNS + 1),
    capHeight: pitch * (TURNS + 1) + wall + clearance,
  };
}

export function validateContainerOptions(options: ThreadedTubePillOptions): { valid: boolean; error?: string } {
  if (!options || !within(options.wallThicknessMm, 1.8, 4.5) || !within(options.threadClearanceMm, 0.15, 0.45)) {
    return { valid: false, error: 'invalid' };
  }
  if (options.mode === 'pill_organizer') {
    return within(options.pillSlotWidthMm, 18, 42) && within(options.pillSlotDepthMm, 16, 38)
      ? { valid: true } : { valid: false, error: 'invalid' };
  }
  if ((options.mode !== 'knurled_tube' && options.mode !== 'desiccant_pod') ||
      !within(options.threadPitchMm, 2.5, 5) || !within(options.internalHeightMm, 25, 180) ||
      !within(options.outerDiameterMm, 20, 120)) return { valid: false, error: 'invalid' };
  if (options.mode === 'desiccant_pod' && !within(options.desiccantSlitWidthMm, 1, 1.8)) {
    return { valid: false, error: 'slitError' };
  }
  const dimensions = getThreadDimensions(options);
  if (dimensions.neckBore < 3 || dimensions.neckWallRemainingMm < 1.4) {
    return { valid: false, error: 'neckError' };
  }
  if (options.mode === 'desiccant_pod' && options.includeAirflowChimney &&
      dimensions.bodyBore - options.wallThicknessMm < 6) return { valid: false, error: 'neckError' };
  return { valid: true };
}

function grip(angle: number, radius: number): number {
  const ridges = Math.max(12, Math.round(radius * 1.05));
  return 0.36 * (1 - Math.cos(ridges * angle)) / 2;
}

function ventCount(radius: number): number {
  return Math.min(24, Math.max(16, 2 * Math.round(radius / 2.6)));
}

function tubeBase(options: ThreadedTubePillOptions): THREE.BufferGeometry {
  const { outerRadius, bodyBore, neckBore, maleRoot, threadHeight } = getThreadDimensions(options);
  const { wallThicknessMm: wall, internalHeightMm, threadPitchMm } = options;
  const pod = options.mode === 'desiccant_pod';
  const shoulder = wall + internalHeightMm;
  const neckTop = shoulder + threadHeight;
  const shoulderDrop = outerRadius - maleRoot;
  const flange = pod ? POD_FLANGE_MM : 0;
  const wallRadius = outerRadius - flange / 2;
  const innerRadius = bodyBore - flange / 2;
  const chimney = pod && options.includeAirflowChimney;
  const chimneyBore = 4;
  const chimneyRadius = chimneyBore + wall;
  const chimneyTop = wall + internalHeightMm * 0.5;
  const neck = axialSamples(maleRoot, threadHeight, shoulder);
  const bodyProfile: [number, number][] = [
    [chimney ? chimneyBore : 0, 0], [outerRadius, 0], [outerRadius, wall * 1.6],
    [wallRadius, wall * 1.6 + 0.4], [wallRadius, shoulder - shoulderDrop],
    ...neck, [neckBore, neckTop], [neckBore, shoulder], [innerRadius, shoulder - shoulderDrop], [innerRadius, wall],
  ];
  if (chimney) {
    bodyProfile.push([chimneyRadius, wall], [chimneyRadius, chimneyTop], [chimneyBore, chimneyTop]);
  } else {
    bodyProfile.push([0, wall]);
  }
  let body = revolve(bodyProfile, 144, (radius, z, angle, ring) => {
    if (ring >= 5 && ring < 5 + neck.length) return radius + threadRise(angle, z - shoulder, threadPitchMm);
    return options.includeKnurling && (ring === 2 || (!pod && ring === 3)) ? radius - grip(angle, radius) : radius;
  });
  if (pod) {
    const cutters: THREE.BufferGeometry[] = [];
    const count = ventCount(outerRadius);
    const ventDepth = wall + 2;
    const midpoint = wallRadius - wall / 2;
    for (let i = 0; i < count; i++) {
      const angle = TAU * i / count;
      cutters.push(box(ventDepth, options.desiccantSlitWidthMm, internalHeightMm - 8, midpoint, 0, wall * 1.6 + 1).rotateZ(angle));
    }
    for (let i = 0; i < 6; i++) {
      const floorRadius = chimney ? (chimneyRadius + innerRadius) / 2 : innerRadius * 0.55;
      const room = chimney ? innerRadius - chimneyRadius : innerRadius;
      cutters.push(box(room * 0.65, options.desiccantSlitWidthMm, wall + 1,
        floorRadius, 0, -0.5).rotateZ(TAU * i / 6));
    }
    const vents = combine(cutters);
    cutters.forEach((cutter) => cutter.dispose());
    body = booleanMesh(body, vents, 'subtract');
  }
  return body;
}

function tubeCap(options: ThreadedTubePillOptions): THREE.BufferGeometry {
  const { outerRadius, maleRoot, threadHeight, capHeight } = getThreadDimensions(options);
  const { wallThicknessMm: wall, threadClearanceMm: clearance, threadPitchMm: pitch } = options;
  const root = maleRoot + clearance;
  // The cap starts with its closed face on the print bed. The female profile
  // mirrors both angle and axial direction when the cap is flipped to mate.
  const cavity = axialSamples(root, threadHeight + clearance, wall).reverse();
  return revolve([
    [0, 0], [outerRadius, 0], [outerRadius, wall * 0.5], [outerRadius, capHeight - 0.55],
    [outerRadius, capHeight], ...cavity, [0, wall],
  ], 144, (radius, z, angle, ring) => {
    if (ring >= 5) return radius + threadRise(-angle, capHeight - z, pitch);
    return options.includeKnurling && (ring === 2 || ring === 3) ? radius - grip(angle, radius) : radius;
  });
}

function pillDimensions(options: ThreadedTubePillOptions) {
  const rows = options.pillDoubleAmPm ? 2 : 1;
  const wall = options.wallThicknessMm;
  const cavityTop = PILL_FLOOR_MM + PILL_INTERIOR_MM;
  const trayHeight = cavityTop + LID_MM + 0.6;
  const width = options.pillSlotWidthMm * 7 + wall * 8;
  const depth = options.pillSlotDepthMm * rows + wall * (rows + 1);
  return { rows, wall, cavityTop, trayHeight, width, depth };
}

function crossSection(points: readonly (readonly [number, number])[], length: number, baseX: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(points.map(([y, z]) => new THREE.Vector2(y, z)));
  // Local X/Y become world Y/Z; extrusion runs along world X.
  return extrude(shape, length).applyMatrix4(new THREE.Matrix4().set(
    0, 0, 1, baseX,
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 0, 1,
  ));
}

function pillPocket(width: number, depth: number, x: number, y: number, top: number): THREE.BufferGeometry {
  const radius = Math.min(5, depth / 4);
  const r = depth / 2;
  const floor = PILL_FLOOR_MM;
  const shape = new THREE.Shape();
  shape.moveTo(y - r, top);
  shape.lineTo(y - r, floor + radius);
  shape.quadraticCurveTo(y - r, floor, y - r + radius, floor);
  shape.lineTo(y + r - radius, floor);
  shape.quadraticCurveTo(y + r, floor, y + r, floor + radius);
  shape.lineTo(y + r, top);
  shape.closePath();
  return extrude(shape, width).applyMatrix4(new THREE.Matrix4().set(
    0, 0, 1, x,
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 0, 1,
  ));
}

function makePillParts(options: ThreadedTubePillOptions): MeshPart[] {
  const { rows, wall, cavityTop, trayHeight, width, depth } = pillDimensions(options);
  const { pillSlotDepthMm: wellDepth, pillSlotWidthMm: wellWidth, threadClearanceMm: clearance } = options;
  const half = depth / 2;
  const railSeat = half - wall * 0.54;
  const railLip = half - wall;
  const grooveBottom = cavityTop;
  const grooveTop = trayHeight;
  const lidLength = width - wall - clearance;
  const lidX = -width / 2;
  const cutoffX = lidX + lidLength;
  let tray = crossSection([
    [-half, 0], [half, 0], [half, trayHeight], [railLip, grooveTop], [railSeat, grooveBottom],
    [-railSeat, grooveBottom], [-railLip, grooveTop], [-half, trayHeight],
  ], width, lidX);
  const cutters: THREE.BufferGeometry[] = [];
  const labels: THREE.BufferGeometry[] = [];
  const pitchX = wellWidth + wall;
  const pitchY = wellDepth + wall;
  const plateY = depth + 6;

  for (let column = 0; column < DAYS.length; column++) {
    const left = lidX + wall + column * pitchX;
    for (let row = 0; row < rows; row++) {
      const y = (row - (rows - 1) / 2) * pitchY;
      cutters.push(pillPocket(wellWidth, wellDepth, left, y, trayHeight + 1));
      if (options.includeDayLabels) {
        const text = rows === 1 ? DAYS[column] : `${DAYS[column]} ${row === 0 ? 'AM' : 'PM'}`;
        const label = strokeLabel(text, 3.35, wellWidth - 2, 0.46, LID_MM);
        if (label) labels.push(label.translate(left + wellWidth / 2, y + plateY, 0));
      }
    }
  }
  const detentX = cutoffX - 2.8;
  const lidLow = railSeat - clearance;
  const lidHigh = railLip - clearance;
  cutters.push(new THREE.SphereGeometry(0.96, 20, 12).translate(detentX, lidLow + 0.3, grooveBottom + clearance + 0.4));
  const pockets = combine(cutters);
  cutters.forEach((cutter) => cutter.dispose());
  tray = booleanMesh(tray, pockets, 'subtract');
  // This stop blocks the closed end of the track while leaving the opposite end open.
  tray = booleanMesh(tray, box(wall * 0.85, depth - wall * 0.55, LID_MM + 0.4,
    width / 2 - wall * 0.48, 0, cavityTop - 0.28), 'add');

  let lid = crossSection([
    [-lidLow, 0], [lidLow, 0], [lidHigh, LID_MM], [-lidHigh, LID_MM],
  ], lidLength, lidX);
  const nub = new THREE.SphereGeometry(0.63, 20, 12).scale(1, 1, 0.58)
    .translate(detentX, lidLow - 0.12, 0.4);
  lid = booleanMesh(lid, nub, 'add').translate(0, plateY, 0);
  const parts: MeshPart[] = [
    { name: 'Tray', geometry: tray },
    { name: 'Sliding Lid', geometry: lid },
  ];
  if (labels.length) {
    const label = combine(labels);
    labels.forEach((item) => item.dispose());
    parts.push({ name: 'Day Labels', geometry: label, material: 1 });
  }
  return parts;
}

export function generateContainerParts(options: ThreadedTubePillOptions): MeshPart[] {
  const check = validateContainerOptions(options);
  if (!check.valid) throw new Error(check.error);
  if (options.mode === 'pill_organizer') return makePillParts(options);
  const { outerRadius } = getThreadDimensions(options);
  const body = tubeBase(options);
  try {
    const cap = tubeCap(options).translate(outerRadius * 2 + 6, 0, 0);
    return [{ name: 'Base', geometry: body }, { name: 'Threaded Cap', geometry: cap }];
  } catch (error) {
    body.dispose();
    throw error;
  }
}

export function positionContainerPreview(options: ThreadedTubePillOptions, parts: MeshPart[]): void {
  if (!options.layoutFlatPlate) {
    if (options.mode === 'pill_organizer') {
      const { cavityTop, depth } = pillDimensions(options);
      for (const { geometry } of parts.slice(1)) geometry.translate(0, -depth - 6, cavityTop + options.threadClearanceMm);
    } else {
      const { outerRadius, capHeight } = getThreadDimensions(options);
      parts[1].geometry.translate(-outerRadius * 2 - 6, 0, 0).rotateX(Math.PI)
        .translate(0, 0, options.wallThicknessMm + options.internalHeightMm + capHeight);
    }
  }
  if (options.cutaway) {
    for (const part of parts) {
      if (part.material === 1) continue;
      part.geometry.computeBoundingBox();
      const bounds = part.geometry.boundingBox!;
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      part.geometry = booleanMesh(part.geometry, box(size.x + 2, size.y / 2 + 1, size.z + 2,
        center.x, center.y - size.y / 4 - 0.5, bounds.min.z - 1), 'subtract');
    }
  }
}

export function calculateContainerMetrics(options: ThreadedTubePillOptions, parts: readonly MeshPart[]): ContainerToolMetrics {
  if (options.mode === 'pill_organizer') {
    const { rows } = pillDimensions(options);
    const radius = Math.min(5, options.pillSlotDepthMm / 4);
    // Area removed from both rectangular bottom corners by the two quadratic arcs.
    const wellSection = options.pillSlotDepthMm * PILL_INTERIOR_MM - radius ** 2 / 3;
    return {
      ...measureMeshes(parts),
      usableInternalDiameterMm: 0, neckWallRemainingMm: 0, ventCount: 0,
      internalVolumeMl: wellSection * options.pillSlotWidthMm * 7 * rows / 1000,
      pocketCount: 7 * rows,
    };
  }
  const { bodyBore, neckBore, outerRadius, threadHeight, maleRoot, neckWallRemainingMm } = getThreadDimensions(options);
  const pod = options.mode === 'desiccant_pod';
  const bore = bodyBore - (pod ? POD_FLANGE_MM / 2 : 0);
  const transition = outerRadius - maleRoot;
  const neck = threadHeight * neckBore ** 2;
  const shoulder = transition / 3 * (neckBore ** 2 + neckBore * bore + bore ** 2);
  const chimney = pod && options.includeAirflowChimney ? (4 + options.wallThicknessMm) ** 2 * options.internalHeightMm * 0.5 : 0;
  return {
    ...measureMeshes(parts),
    usableInternalDiameterMm: neckBore * 2, neckWallRemainingMm, pocketCount: 0,
    ventCount: pod ? ventCount(outerRadius) : 0,
    internalVolumeMl: Math.PI * ((options.internalHeightMm - transition) * bore ** 2 + shoulder + neck - chimney) / 1000,
  };
}

export function exportToBinaryStl(parts: readonly MeshPart[]): ArrayBuffer {
  return exportMeshStl(parts);
}

export function exportTo3mf(options: ThreadedTubePillOptions, parts: readonly MeshPart[]): Promise<Blob> {
  return write3mf('Threaded Storage Tube and Organizer', parts, [
    { name: 'Body', hex: options.bodyColorHex },
    { name: 'Day Labels', hex: options.accentColorHex },
  ]);
}
