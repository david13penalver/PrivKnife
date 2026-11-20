import * as THREE from 'three';
import { booleanMesh, box, combine, cylinder, extrude, MeshPart, revolve, within } from '../shared/mesh';
import { exportMeshStl, measureMeshes, write3mf } from '../shared/mesh-export';
import { JarBottleRackOptions, JarRackMetrics } from './types';

const BED_MM = 220;
const MAX_FOOTPRINT_MM = 420;
const FLOOR_MM = 3.2;
const TONGUE_MM = 4.2;
const TONGUE_CLEARANCE_MM = 0.27;

interface WellCenter {
  x: number;
  y: number;
  row: number;
}

export function computeWellCoordinates(options: JarBottleRackOptions) {
  const diameter = options.bottleDiameterMm + options.fitClearanceMm;
  const pitchX = diameter + options.webWallThicknessMm;
  const hex = options.topology === 'honeycomb_tray';
  const pitchY = pitchX * (hex ? Math.sqrt(3) / 2 : 1);
  const stagger = hex && options.rows > 1 ? pitchX / 2 : 0;
  const centers: WellCenter[] = [];
  for (let row = 0; row < options.rows; row++) {
    for (let col = 0; col < options.columns; col++) {
      centers.push({
        x: (col - (options.columns - 1) / 2) * pitchX + (row % 2 ? stagger : 0) - stagger / 2,
        y: (row - (options.rows - 1) / 2) * pitchY,
        row,
      });
    }
  }
  const sideMargin = options.includeSideDovetails ? 6 : 0;
  const width = (options.columns - 1) * pitchX + diameter + stagger + 2 * (options.webWallThicknessMm + sideMargin);
  const depth = (options.rows - 1) * pitchY + diameter + options.webWallThicknessMm * 2 +
    (options.topology === 'capsule_track' && options.includeMountHoles ? 7 : 0);
  return { centers, diameter, pitchX, pitchY, width, depth };
}

function footprint(options: JarBottleRackOptions) {
  const { width, depth } = computeWellCoordinates(options);
  return { width: width + (options.includeSideDovetails ? TONGUE_MM : 0), depth };
}

export function validateJarRackOptions(options: JarBottleRackOptions): { valid: boolean; error?: string } {
  if (!options || !['stepped_stadium', 'honeycomb_tray', 'capsule_track'].includes(options.topology) ||
      !within(options.bottleDiameterMm, 12, 95) || !within(options.fitClearanceMm, 0.3, 1.5) ||
      !within(options.webWallThicknessMm, 1.8, 6) || !within(options.wellDepthMm, 8, 55) ||
      !within(options.stepRiseMm, 0, 40) || !within(options.columns, 1, 10) || !within(options.rows, 1, 6) ||
      !Number.isInteger(options.columns) || !Number.isInteger(options.rows)) return { valid: false, error: 'invalid' };
  const { width, depth } = footprint(options);
  if (Math.max(width, depth) > MAX_FOOTPRINT_MM && !options.splitForBed) return { valid: false, error: 'footprintError' };
  return { valid: true };
}

function rise(options: JarBottleRackOptions): number {
  return options.topology === 'stepped_stadium' ? options.stepRiseMm : 0;
}

function profileAlongX(points: readonly (readonly [number, number])[], width: number, start: number) {
  const shape = new THREE.Shape(points.map(([y, z]) => new THREE.Vector2(y, z)));
  return extrude(shape, width).applyMatrix4(new THREE.Matrix4().set(
    0, 0, 1, start,
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 0, 1,
  ));
}

function subtractFeatures(body: THREE.BufferGeometry, cutters: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (!cutters.length) return body;
  const cutter = combine(cutters);
  cutters.forEach((geometry) => geometry.dispose());
  return booleanMesh(body, cutter, 'subtract');
}

function rowHeight(options: JarBottleRackOptions, row: number): number {
  return options.wellDepthMm + FLOOR_MM + rise(options) * row;
}

function buildRowBlock(options: JarBottleRackOptions, grid: ReturnType<typeof computeWellCoordinates>) {
  const { width, depth, pitchY } = grid;
  if (rise(options) === 0) return box(width, depth, rowHeight(options, 0), 0, 0, 0);
  const profile: [number, number][] = [[-depth / 2, 0], [-depth / 2, rowHeight(options, 0)]];
  for (let row = 1; row < options.rows; row++) {
    const edge = (row - options.rows / 2) * pitchY;
    profile.push([edge, rowHeight(options, row - 1)], [edge, rowHeight(options, row)]);
  }
  profile.push([depth / 2, rowHeight(options, options.rows - 1)], [depth / 2, 0]);
  return profileAlongX(profile, width, -width / 2);
}

function hollowVaults(options: JarBottleRackOptions, grid: ReturnType<typeof computeWellCoordinates>) {
  const cavities: THREE.BufferGeometry[] = [];
  const innerWidth = grid.width - 2 * (options.includeSideDovetails ? 8 : FLOOR_MM);
  const maxHalfDepth = grid.pitchY / 2 - FLOOR_MM / 2;
  for (let row = 1; row < options.rows; row++) {
    const peak = rise(options) * row;
    const center = (row - (options.rows - 1) / 2) * grid.pitchY;
    const halfDepth = Math.min(maxHalfDepth, peak);
    if (halfDepth <= 0.2 || innerWidth <= 0) continue;
    const eave = peak - halfDepth;
    cavities.push(profileAlongX([
      [center - halfDepth, -1], [center + halfDepth, -1], [center + halfDepth, eave],
      [center, peak], [center - halfDepth, eave],
    ], innerWidth, -innerWidth / 2));
  }
  return cavities;
}

function addLabelWindows(body: THREE.BufferGeometry, options: JarBottleRackOptions,
  grid: ReturnType<typeof computeWellCoordinates>): THREE.BufferGeometry {
  const radius = Math.min(grid.diameter * 0.22, 9, options.wellDepthMm * 0.48);
  const cutters = grid.centers.filter(({ row }) => row === 0 || rise(options) > 1).map(({ x, y, row }) => {
    const front = row === 0 ? -grid.depth / 2 - 0.5 : y - grid.pitchY / 2 - 0.04;
    const back = y - grid.diameter * 0.31;
    return cylinder(radius, back - front, 0, 0, 0, 36)
      .rotateX(-Math.PI / 2)
      .translate(x, front, rowHeight(options, row) - radius * 0.15);
  });
  return subtractFeatures(body, cutters);
}

function cutWells(body: THREE.BufferGeometry, options: JarBottleRackOptions,
  grid: ReturnType<typeof computeWellCoordinates>): THREE.BufferGeometry {
  const radius = grid.diameter / 2;
  const pockets = grid.centers.map(({ x, y, row }) => {
    const base = rowHeight(options, row) - options.wellDepthMm;
    if (!options.invertedBottleWells) return cylinder(radius, options.wellDepthMm + 0.6, x, y, base, 48);
    return revolve([[0, base], [radius * 0.53, base], [radius, base + options.wellDepthMm],
      [radius, base + options.wellDepthMm + 0.6], [0, base + options.wellDepthMm + 0.6]], 48).translate(x, y, 0);
  });
  return subtractFeatures(body, pockets);
}

function trackSlot(x: number, diameter: number, length: number, front: number, top: number): THREE.BufferGeometry {
  const half = diameter / 2;
  const lower = half - 2.2;
  const keeper = half - 1.55;
  const channelFloor = top - 4.4;
  const roof = top - 2.2;
  const shape = new THREE.Shape([
    [-lower, FLOOR_MM], [lower, FLOOR_MM], [lower, channelFloor - 0.8], [half, channelFloor],
    [half, roof], [keeper, roof + 1.55], [keeper, top + 1], [-keeper, top + 1],
    [-keeper, roof + 1.55], [-half, roof], [-half, channelFloor], [-lower, channelFloor - 0.8],
  ].map(([u, z]) => new THREE.Vector2(u, z)));
  return extrude(shape, length).rotateX(Math.PI / 2).translate(x, front + length, 0);
}

function cutTracks(body: THREE.BufferGeometry, options: JarBottleRackOptions,
  grid: ReturnType<typeof computeWellCoordinates>): THREE.BufferGeometry {
  const rearWall = options.webWallThicknessMm + (options.includeMountHoles ? 7 : 0);
  const top = rowHeight(options, 0);
  const slots = grid.centers.filter(({ row }) => row === 0).map(({ x }) =>
    trackSlot(x, grid.diameter, grid.depth - rearWall + 0.6, -grid.depth / 2 - 0.6, top));
  body = subtractFeatures(body, slots);
  if (options.includeMountHoles) {
    const x = Math.max(3, grid.width / 2 - 6);
    const y = grid.depth / 2 - rearWall / 2;
    body = subtractFeatures(body, [-x, x].map((position) => cylinder(1.8, top + 2, position, y, -1, 28)));
  }
  return body;
}

function dovetail(x: number, y: number, height: number, socket: boolean): THREE.BufferGeometry {
  const clearance = socket ? TONGUE_CLEARANCE_MM : 0;
  const end = x + TONGUE_MM + clearance;
  const neckWidth = 4.2 + clearance;
  const tipWidth = 6.2 + clearance;
  const shape = new THREE.Shape([
    [x - 0.7, y - neckWidth], [x, y - neckWidth], [end, y - tipWidth],
    [end, y + tipWidth], [x, y + neckWidth], [x - 0.7, y + neckWidth],
  ].map(([u, v]) => new THREE.Vector2(u, v)));
  const geometry = extrude(shape, height + (socket ? 1.4 : 0)).translate(0, 0, socket ? -0.6 : 0);
  if (!socket) {
    // Lift the buried root off the build plane so the Boolean join has no
    // overlapping bottom faces. The projecting tip still reaches the bed.
    const positions = geometry.attributes['position'];
    for (let i = 0; i < positions.count; i++) {
      if (positions.getZ(i) === 0 && positions.getX(i) < end - 0.01) positions.setZ(i, 0.24);
    }
  }
  return geometry;
}

function buildModule(options: JarBottleRackOptions): THREE.BufferGeometry {
  const grid = computeWellCoordinates(options);
  let body = buildRowBlock(options, grid);
  if (options.topology === 'capsule_track') {
    body = cutTracks(body, options, grid);
  } else {
    body = cutWells(body, options, grid);
    if (options.includeLabelCutout) body = addLabelWindows(body, options, grid);
    if (options.hollowVaultUnderside && rise(options)) body = subtractFeatures(body, hollowVaults(options, grid));
  }
  if (options.includeSideDovetails) {
    const y = (1 - options.rows) * grid.pitchY / 2;
    const height = Math.min(8, rowHeight(options, 0) - 0.3);
    body = booleanMesh(body, dovetail(grid.width / 2, y, height, false), 'add');
    body = booleanMesh(body, dovetail(-grid.width / 2, y, height, true), 'subtract');
  }
  return body;
}

function modulePlan(options: JarBottleRackOptions): JarBottleRackOptions[] {
  if (!options.splitForBed) return [options];
  let rows = options.rows;
  let columns = options.columns;
  const { width, depth } = footprint(options);
  if (Math.max(width, depth) <= BED_MM) return [options];
  const modularOptions = { ...options, includeSideDovetails: true };
  while (rows > 1 && footprint({ ...modularOptions, rows, columns: 1 }).depth > BED_MM) rows--;
  while (columns > 1 && footprint({ ...modularOptions, rows, columns }).width > BED_MM) columns--;
  const modules: JarBottleRackOptions[] = [];
  for (let row = 0; row < options.rows; row += rows) {
    for (let col = 0; col < options.columns; col += columns) {
      modules.push({ ...modularOptions, rows: Math.min(rows, options.rows - row), columns: Math.min(columns, options.columns - col) });
    }
  }
  return modules;
}

export function generateJarRackParts(options: JarBottleRackOptions): MeshPart[] {
  const validation = validateJarRackOptions(options);
  if (!validation.valid) throw new Error(validation.error);
  const modules = modulePlan(options);
  const parts: MeshPart[] = [];
  let x = 0;
  try {
    modules.forEach((module, index) => {
      const { width } = computeWellCoordinates(module);
      const geometry = buildModule(module).translate(x + width / 2, 0, 0);
      parts.push({ name: modules.length === 1 ? 'Rack' : `Rack Module ${index + 1}`, geometry });
      x += width + (module.includeSideDovetails ? TONGUE_MM : 0) + 6;
    });
    return parts;
  } catch (error) {
    parts.forEach(({ geometry }) => geometry.dispose());
    throw error;
  }
}

export function calculateJarRackMetrics(options: JarBottleRackOptions, parts: readonly MeshPart[]): JarRackMetrics {
  const base = measureMeshes(parts);
  const exceedsStandardBed = parts.some(({ geometry }) => {
    const { x, y } = geometry.boundingBox!.getSize(new THREE.Vector3());
    return Math.max(x, y) > BED_MM + 1e-4;
  });
  return {
    ...base,
    totalCapacityCount: options.columns * options.rows,
    moduleCount: parts.length,
    exceedsStandardBed,
    multiplePlates: parts.length > 1,
  };
}

export function exportToBinaryStl(parts: readonly MeshPart[]): ArrayBuffer {
  return exportMeshStl(parts);
}

export function exportTo3mf(options: JarBottleRackOptions, parts: readonly MeshPart[]): Promise<Blob> {
  return write3mf('Spice Jar, Paint Bottle and Coffee Pod Rack', parts, [
    { name: 'Rack', hex: options.filamentColorHex },
  ]);
}
