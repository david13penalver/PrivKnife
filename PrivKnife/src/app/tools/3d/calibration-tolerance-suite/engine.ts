import * as THREE from 'three';
import { booleanMesh, box, combine, cylinder, extrude, MeshPart, revolve, within } from '../shared/mesh';
import { exportMeshStl, measureMeshes, write3mf } from '../shared/mesh-export';
import { strokeLabel } from '../shared/stroke-label';
import {
  BRIDGE_SPANS_MM, CalibrationMetrics, CalibrationToleranceOptions, FASTENER_OFFSETS_MM,
  FASTENERS, OVERHANG_ANGLES_DEG,
} from './types';

const PIN_RADIUS_MM = 4;
const HOUSING_HEIGHT_MM = 7;
const PATCH_MM = 32;
const FRAME_MM = 2.4;
const FRAME_GAP_MM = 1.5;

export function parseClearanceList(input: string): number[] {
  if (typeof input !== 'string' || !input.trim()) return [];
  const hasDelimitedDecimals = /[;\n]/.test(input.trim());
  const values = input.trim().split(hasDelimitedDecimals ? /[;\n]/ : ',').map((token) => {
    const text = hasDelimitedDecimals ? token.trim().replace(',', '.') : token.trim();
    return /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(text) ? Number(text) : NaN;
  });
  if (values.length > 10 || values.some((value) => !within(value, 0.05, 0.45)) ||
      new Set(values).size !== values.length) return [];
  return values;
}

export function computeFastenerFits(size: CalibrationToleranceOptions['boltSize']) {
  const standard = FASTENERS[size];
  return FASTENER_OFFSETS_MM.map((offsetMm) => ({
    offsetMm,
    boltDiameterMm: standard.diameterMm + offsetMm,
    nutAcrossFlatsMm: standard.nutAcrossFlatsMm + offsetMm,
    nutDepthMm: standard.nutThicknessMm + 0.25,
  }));
}

function sheetLayout(options: CalibrationToleranceOptions) {
  const width = options.bedWidthMm - 2 * options.bedMarginMm;
  const depth = options.bedDepthMm - 2 * options.bedMarginMm;
  const edgeOffset = PATCH_MM / 2 + FRAME_MM + FRAME_GAP_MM;
  return { width, depth, x: width / 2 - edgeOffset, y: depth / 2 - edgeOffset };
}

export function validateCalibrationOptions(options: CalibrationToleranceOptions): { valid: boolean; error?: string } {
  if (!options || !within(options.nozzleDiameterMm, 0.2, 1) || !within(options.layerHeightMm, 0.1, 0.4)) {
    return { valid: false, error: 'invalid' };
  }
  switch (options.mode) {
    case 'clearance_gauge':
      return parseClearanceList(options.clearanceValuesText).length ? { valid: true } : { valid: false, error: 'clearanceError' };
    case 'fastener_fit_block':
      return Object.hasOwn(FASTENERS, options.boltSize) ? { valid: true } : { valid: false, error: 'invalid' };
    case 'bridge_overhang_test':
      return options.includeBridges || options.includeOverhangs ? { valid: true } : { valid: false, error: 'bridgeError' };
    case 'first_layer_sheet': {
      if (!within(options.bedWidthMm, 120, 400) || !within(options.bedDepthMm, 120, 400) ||
          !within(options.bedMarginMm, 5, 25) || ![0, 5, 9].includes(options.patchCount)) {
        return { valid: false, error: 'invalid' };
      }
      const { x, y } = sheetLayout(options);
      const minimumSpacing = PATCH_MM + 0.2;
      const fits = options.patchCount === 0 || (options.patchCount === 5
        ? Math.max(x, y) >= minimumSpacing : Math.min(x, y) >= minimumSpacing);
      return fits ? { valid: true } : { valid: false, error: 'patchError' };
    }
    default:
      return { valid: false, error: 'invalid' };
  }
}

const PIN_PROFILE: readonly (readonly [number, number])[] = [
  [PIN_RADIUS_MM - 0.6, 0], [PIN_RADIUS_MM, 0.6], [PIN_RADIUS_MM, 2.55],
  [PIN_RADIUS_MM + 0.5, 3.05], [PIN_RADIUS_MM + 0.5, 3.95], [PIN_RADIUS_MM, 4.45],
  [PIN_RADIUS_MM, 6.1], [PIN_RADIUS_MM, 6.75], [PIN_RADIUS_MM - 0.25, 7],
];

function gaugeParts(options: CalibrationToleranceOptions, labels: THREE.BufferGeometry[]): MeshPart[] {
  const clearances = parseClearanceList(options.clearanceValuesText);
  const pitch = 18;
  const depth = 22;
  const pinY = 2.5;
  const cavities: THREE.BufferGeometry[] = [];
  const pins: MeshPart[] = [];
  for (let i = 0; i < clearances.length; i++) {
    const gap = clearances[i];
    const x = (i - (clearances.length - 1) / 2) * pitch;
    const label = gap.toFixed(2);
    // The narrow mouths above and below the central flange trap the pin.
    // Chamfers add first-layer room and the top recess exposes the grip.
    const cavity = revolve([
      [0, -0.5], [PIN_RADIUS_MM + gap + 0.12, -0.5], [PIN_RADIUS_MM + gap + 0.12, 0],
      ...PIN_PROFILE.slice(1, 6).map(([radius, z]) => [radius + gap, z] as const),
      [PIN_RADIUS_MM + gap, 5.55], [5.6, 6.85], [5.6, 7.5], [0, 7.5],
    ], 72).translate(x, pinY, 0);
    cavities.push(cavity);
    const pin = revolve([[0, 0], ...PIN_PROFILE, [0, 7]], 72, (radius, z, angle) =>
      z >= 6.1 && z < 7 ? radius - 0.24 * (1 - Math.cos(18 * angle)) / 2 : radius);
    pins.push({ name: `Clearance Pin ${label} mm`, geometry: pin.translate(x, pinY, 0) });
    addLabel(options, labels, label, 3.7, pitch - 1.6, x, -6, HOUSING_HEIGHT_MM);
  }
  const block = box(clearances.length * pitch, depth, HOUSING_HEIGHT_MM, 0, 0, 0);
  return [{ name: 'Clearance Gauge Base', geometry: subtractCutters(block, cavities) }, ...pins];
}

function subtractCutters(body: THREE.BufferGeometry, cutters: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = combine(cutters);
  cutters.forEach((cutter) => cutter.dispose());
  return booleanMesh(body, merged, 'subtract');
}

export function getGaugeStrokeWidth(nozzleDiameterMm: number): number {
  return Math.max(0.55, nozzleDiameterMm * 1.25);
}

function addLabel(
  options: CalibrationToleranceOptions, labels: THREE.BufferGeometry[], text: string,
  height: number, width: number, x: number, y: number, z: number,
): void {
  if (!options.includeGaugeLabels) return;
  const label = strokeLabel(text, height, width, getGaugeStrokeWidth(options.nozzleDiameterMm), z);
  if (label) labels.push(label.translate(x, y, 0));
}

function fastenerPart(options: CalibrationToleranceOptions, labels: THREE.BufferGeometry[]): MeshPart {
  const fits = computeFastenerFits(options.boltSize);
  const largest = fits.at(-1)!;
  const radius = largest.nutAcrossFlatsMm / Math.sqrt(3);
  const pitch = Math.max(19, radius * 2 + 4);
  const nameSection = 18;
  const rowsY = radius + largest.boltDiameterMm / 2 + 3.5;
  const depth = rowsY + 2 * radius + 11;
  const height = Math.max(5.5, largest.nutDepthMm + 1.8);
  const body = box(pitch * fits.length + nameSection, depth, height, nameSection / 2, 0, 0);
  const holes: THREE.BufferGeometry[] = [];
  const nutY = -rowsY / 2 + 0.8;
  const boltY = rowsY / 2 + 0.8;
  fits.forEach(({ offsetMm, boltDiameterMm, nutAcrossFlatsMm, nutDepthMm }, index) => {
    const x = (index - (fits.length - 1) / 2) * pitch + nameSection;
    holes.push(cylinder(boltDiameterMm / 2, height + 2, x, boltY, -1, 64));
    holes.push(cylinder(nutAcrossFlatsMm / Math.sqrt(3), nutDepthMm + 0.7, x, nutY, height - nutDepthMm, 6));
    const deltaText = `${offsetMm > 0 ? '+' : ''}${offsetMm.toFixed(2)}`;
    addLabel(options, labels, deltaText, 3.55, pitch - 1.2, x, -depth / 2 + 2.7, height);
  });
  addLabel(options, labels, options.boltSize, 5, nameSection - 1.6, -(fits.length * pitch) / 2 + nameSection / 2, 0, height);
  return { name: 'Fastener Fit Block', geometry: subtractCutters(body, holes) };
}

function sideProfile(points: readonly (readonly [number, number])[], thickness: number, centerY: number) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, z)));
  return extrude(shape, thickness).rotateX(Math.PI / 2).translate(0, centerY + thickness / 2, 0);
}

function stressParts(options: CalibrationToleranceOptions, labels: THREE.BufferGeometry[]): MeshPart[] {
  const parts: MeshPart[] = [];
  const spanHeight = 9;
  const bridgeThickness = 2;
  const totalHeight = spanHeight + bridgeThickness;
  const tower = 15;
  const rowSpacing = 17;
  let row = 0;
  if (options.includeBridges) {
    for (const span of BRIDGE_SPANS_MM) {
      const y = row++ * rowSpacing;
      const start = -span / 2;
      const end = span / 2;
      const profile = sideProfile([
        [start - tower, 0], [start, 0], [start, spanHeight], [end, spanHeight],
        [end, 0], [end + tower, 0], [end + tower, totalHeight], [start - tower, totalHeight],
      ], 12, y);
      parts.push({ name: `Bridge ${span} mm`, geometry: profile });
      addLabel(options, labels, String(span), 4.1, tower - 1.5, start - tower / 2, y, totalHeight);
    }
  }
  if (options.includeOverhangs) {
    for (const angle of OVERHANG_ANGLES_DEG) {
      const y = row++ * rowSpacing;
      const end = spanHeight * Math.tan(THREE.MathUtils.degToRad(angle));
      const profile = sideProfile([
        [-tower, 0], [0, 0], [0, 2], [end, spanHeight + 2],
        [end, spanHeight + 4], [0, spanHeight + 4], [0, 3], [-tower, 3],
      ], 12, y);
      parts.push({ name: `Overhang ${angle} degrees`, geometry: profile });
      addLabel(options, labels, `${angle}°`, 4.1, tower - 1.5, -tower / 2, y, 3);
    }
  }
  return parts;
}

function sheetParts(options: CalibrationToleranceOptions): MeshPart[] {
  const { width, depth, x, y } = sheetLayout(options);
  const z = options.layerHeightMm;
  if (options.patchCount === 0) return [{ name: 'Full Bed Sheet', geometry: box(width, depth, z, 0, 0, 0) }];
  const rectangle = (w: number, d: number) => [
    new THREE.Vector2(-w / 2, -d / 2), new THREE.Vector2(w / 2, -d / 2),
    new THREE.Vector2(w / 2, d / 2), new THREE.Vector2(-w / 2, d / 2),
  ];
  const border = new THREE.Shape(rectangle(width, depth));
  border.holes.push(new THREE.Path(rectangle(width - 2 * FRAME_MM, depth - 2 * FRAME_MM).reverse()));
  const parts: MeshPart[] = [{ name: 'Purge Frame', geometry: extrude(border, z) }];
  const centers = options.patchCount === 5
    ? [[-x, -y], [x, -y], [0, 0], [-x, y], [x, y]]
    : [-y, 0, y].flatMap((py) => [-x, 0, x].map((px) => [px, py]));
  centers.forEach(([px, py], index) => {
    parts.push({ name: `First Layer Patch ${index + 1}`, geometry: box(PATCH_MM, PATCH_MM, z, px, py, 0) });
  });
  return parts;
}

export function generateCalibrationParts(options: CalibrationToleranceOptions): MeshPart[] {
  const validation = validateCalibrationOptions(options);
  if (!validation.valid) throw new Error(validation.error);
  if (options.mode === 'first_layer_sheet') return sheetParts(options);

  const labels: THREE.BufferGeometry[] = [];
  const parts = options.mode === 'clearance_gauge' ? gaugeParts(options, labels)
    : options.mode === 'fastener_fit_block' ? [fastenerPart(options, labels)]
    : stressParts(options, labels);
  if (labels.length) {
    const geometry = combine(labels);
    labels.forEach((label) => label.dispose());
    parts.push({ name: 'Scale Labels', geometry, material: 1 });
  }
  return parts;
}

export function calculateCalibrationMetrics(options: CalibrationToleranceOptions, parts: readonly MeshPart[]): CalibrationMetrics {
  const base = measureMeshes(parts);
  const sheet = options.mode === 'first_layer_sheet';
  const featuresByMode: Record<CalibrationToleranceOptions['mode'], number> = {
    clearance_gauge: parseClearanceList(options.clearanceValuesText).length,
    fastener_fit_block: FASTENER_OFFSETS_MM.length,
    bridge_overhang_test: (options.includeBridges ? BRIDGE_SPANS_MM.length : 0) +
      (options.includeOverhangs ? OVERHANG_ANGLES_DEG.length : 0),
    first_layer_sheet: options.patchCount || 1,
  };
  const estimatedWeightG = sheet ? base.estimatedWeightG / 0.45 : base.estimatedWeightG;
  const speed = sheet ? 24 : 48;
  const volumeMm3 = estimatedWeightG * 1000 / 1.24;
  const flow = speed * options.nozzleDiameterMm * options.layerHeightMm;
  return {
    ...base,
    heightMm: sheet ? options.layerHeightMm : base.heightMm,
    testFeatureCount: featuresByMode[options.mode],
    estimatedWeightG,
    estimatedPrintTimeMinutes: volumeMm3 / flow / 60 + (sheet ? 0.5 : 1.5),
    layerCount: sheet ? 1 : Math.ceil(base.heightMm / options.layerHeightMm),
  };
}

export function exportToBinaryStl(parts: readonly MeshPart[]): ArrayBuffer {
  return exportMeshStl(parts);
}

export function exportTo3mf(options: CalibrationToleranceOptions, parts: readonly MeshPart[]): Promise<Blob> {
  return write3mf('3D Printer Calibration Suite', parts, [
    { name: 'Calibration Body', hex: options.bodyColorHex },
    { name: 'Scale Labels', hex: options.labelColorHex },
  ]);
}
