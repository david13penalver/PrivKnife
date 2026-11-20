import * as THREE from 'three';
import { booleanMesh, cylinder, extrude, MeshPart, revolve, within } from '../shared/mesh';
import { exportMeshStl, measureMeshes, write3mf } from '../shared/mesh-export';
import { strokeLabel } from '../shared/stroke-label';
import { FunnelScoopMetrics, FunnelScoopOptions, ScoopAspectPreset } from './types';

const ASPECTS: Record<ScoopAspectPreset, number> = {
  shallow_wide: 0.65,
  balanced: 1,
  deep_narrow: 1.5,
};
const TAPER = 1.15;

export function computeFrustumMl(rBottom: number, rTop: number, innerHeight: number): number {
  return Math.PI * innerHeight * (rBottom ** 2 + rBottom * rTop + rTop ** 2) / 3000;
}

export function solveScoopFrustumDimensions(targetMl: number, aspect: ScoopAspectPreset) {
  const ratio = ASPECTS[aspect];
  const rBottom = Math.cbrt(targetMl * 3000 / (Math.PI * ratio * (1 + TAPER + TAPER ** 2)));
  return { rBottom, rTop: rBottom * TAPER, innerHeight: rBottom * ratio };
}

export function validateFunnelScoopOptions(options: FunnelScoopOptions): { valid: boolean; error?: string } {
  if (!options || !within(options.wallThicknessMm, 1.2, 3)) return { valid: false, error: 'invalid' };
  if (options.mode === 'air_vented_funnel') {
    const { spoutOuterDiameterMm, wallThicknessMm, mouthDiameterMm, spoutLengthMm, coneOverhangDeg, ventRibCount } = options;
    if (spoutOuterDiameterMm - 2 * wallThicknessMm < 3.2 - 1e-9) return { valid: false, error: 'boreError' };
    if (mouthDiameterMm <= spoutOuterDiameterMm + 8) return { valid: false, error: 'mouthError' };
    if (within(spoutOuterDiameterMm, 7, 45) && within(mouthDiameterMm, 35, 180) &&
        within(spoutLengthMm, 15, 70) && within(coneOverhangDeg, 30, 52) &&
        within(ventRibCount, 0, 6) && Number.isInteger(ventRibCount)) return { valid: true };
  }
  if (options.mode === 'measuring_scoop' && Object.hasOwn(ASPECTS, options.scoopAspect) &&
      within(options.targetVolumeMl, 5, 250) && within(options.handleLengthMm, 55, 140) &&
      typeof options.customLabelText === 'string' && /^[A-Za-z0-9 .+\-]{0,18}$/.test(options.customLabelText)) {
    return { valid: true };
  }
  return { valid: false, error: 'invalid' };
}

function funnelBody(options: FunnelScoopOptions): THREE.BufferGeometry {
  const mouth = options.mouthDiameterMm / 2;
  const spout = options.spoutOuterDiameterMm / 2;
  const wall = options.wallThicknessMm;
  const cone = (mouth - spout) * Math.tan(THREE.MathUtils.degToRad(options.coneOverhangDeg));
  const tip = cone + options.spoutLengthMm;
  // Radial ribs rise directly out of the spout surface, so no seams run along the flow path.
  const ribCount = options.ventRibCount;
  let body = revolve([
    [mouth, 0], [mouth, wall], [spout, cone + wall], [spout, cone + wall + 2],
    [spout, tip], [spout - wall, tip], [spout - wall, cone + wall], [mouth - wall, wall], [mouth - wall, 0],
  ], Math.max(120, ribCount * 40), (radius, _z, angle, ring) => {
    if (!ribCount || (ring !== 3 && ring !== 4)) return radius;
    const phase = angle * ribCount / (Math.PI * 2);
    const arc = Math.abs(phase - Math.round(phase)) * Math.PI * 2 * spout / ribCount;
    return radius + 1.1 * Math.max(0, 1 - arc / 0.8);
  });
  if (options.includeHangingTab) {
    const earX = mouth + 3.8;
    const ear = cylinder(6, wall, earX, 0, 0);
    body = booleanMesh(body, ear, 'add');
    body = booleanMesh(body, cylinder(2.5, wall + 2, earX + 0.5, 0, -1), 'subtract');
  }
  return body;
}

function scoopBody(options: FunnelScoopOptions): { body: THREE.BufferGeometry; labelX: number; handleTop: number } {
  const wall = options.wallThicknessMm;
  const { rBottom, rTop, innerHeight } = solveScoopFrustumDimensions(options.targetVolumeMl, options.scoopAspect);
  const foot = rBottom + wall;
  const length = options.handleLengthMm;
  const handleTop = Math.min(3.6, wall + 0.8);
  let body = revolve([
    [0, 0], [foot, 0], [foot, wall], [rTop + wall, wall + innerHeight],
    [rTop, wall + innerHeight], [rBottom, wall], [0, wall],
  ]);
  const start = foot - 0.75;
  const end = foot + length;
  const shape = new THREE.Shape();
  shape.moveTo(start, -4);
  shape.lineTo(end - 6, -6);
  shape.absarc(end - 6, 0, 6, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(start, 4);
  shape.closePath();
  body = booleanMesh(body, extrude(shape, handleTop), 'add');
  body = booleanMesh(body, cylinder(2.6, handleTop + 2, end - 6, 0, -1), 'subtract');
  const dimple = new THREE.SphereGeometry(3.1, 32, 16).scale(1, 1, 0.35)
    .translate(start + 11, 0, handleTop + 0.50);
  body = booleanMesh(body, dimple, 'subtract');
  return { body, labelX: (start + 18 + end - 12) / 2, handleTop };
}

export function generateFunnelScoopParts(options: FunnelScoopOptions): MeshPart[] {
  const validation = validateFunnelScoopOptions(options);
  if (!validation.valid) throw new Error(validation.error);
  if (options.mode === 'air_vented_funnel') return [{ name: 'Funnel Body', geometry: funnelBody(options) }];
  const { body, labelX, handleTop } = scoopBody(options);
  const parts: MeshPart[] = [{ name: 'Scoop Body', geometry: body }];
  if (options.includeVolumeLabel) {
    const label = strokeLabel(options.customLabelText || `${Number(options.targetVolumeMl.toFixed(2))} mL`,
      4, options.handleLengthMm - 34, 0.48, handleTop);
    if (label) parts.push({ name: 'Volume Label', geometry: label.translate(labelX, 0, 0), material: 1 });
  }
  return parts;
}

export function calculateFunnelScoopMetrics(options: FunnelScoopOptions, parts: readonly MeshPart[]): FunnelScoopMetrics {
  const isScoop = options.mode === 'measuring_scoop';
  const { rBottom, rTop, innerHeight } = solveScoopFrustumDimensions(options.targetVolumeMl, options.scoopAspect);
  return {
    ...measureMeshes(parts),
    innerFlowBoreMm: isScoop ? 0 : options.spoutOuterDiameterMm - 2 * options.wallThicknessMm,
    solvedVolumeMl: isScoop ? computeFrustumMl(rBottom, rTop, innerHeight) : 0,
  };
}

export function exportToBinaryStl(parts: readonly MeshPart[]): ArrayBuffer {
  return exportMeshStl(parts);
}

export function exportTo3mf(options: FunnelScoopOptions, parts: readonly MeshPart[]): Promise<Blob> {
  return write3mf('Funnel and Measuring Scoop', parts, [
    { name: 'Body', hex: options.bodyColorHex },
    { name: 'Volume Label', hex: options.labelColorHex },
  ]);
}
