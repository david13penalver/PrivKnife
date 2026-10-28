import * as THREE from 'three';
import JSZip from 'jszip';
import { LampConfig, LampMetrics, ParametricLampDesignerResult, RibProfile } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateLampConfig(config: LampConfig): ValidationResult {
  const errors: string[] = [];
  if (config.height <= 0 || config.height > 600) {
    errors.push('Height must be between 10mm and 600mm.');
  }
  if (config.bottomRadius <= 0 || config.bottomRadius > 300) {
    errors.push('Bottom radius must be between 10mm and 300mm.');
  }
  if (config.midRadius <= 0 || config.midRadius > 300) {
    errors.push('Mid radius must be between 10mm and 300mm.');
  }
  if (config.topRadius <= 0 || config.topRadius > 300) {
    errors.push('Top radius must be between 10mm and 300mm.');
  }
  if (config.wallThickness < 0.4 || config.wallThickness > 10) {
    errors.push('Wall thickness must be between 0.4mm and 10mm.');
  }
  if (config.waistRatio <= 0 || config.waistRatio >= 1) {
    errors.push('Waist ratio must be between 0.05 and 0.95.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function evaluateBaseRadius(v: number, p: LampConfig): number {
  const r0 = p.bottomRadius;
  const r1 = p.midRadius;
  const r2 = p.topRadius;
  const w = p.waistRatio;

  if (p.curveType === 'conical') {
    if (v <= w) {
      const t = v / Math.max(w, 0.001);
      return r0 + (r1 - r0) * t;
    } else {
      const t = (v - w) / Math.max(1 - w, 0.001);
      return r1 + (r2 - r1) * t;
    }
  } else if (p.curveType === 'hourglass') {
    if (v <= w) {
      const t = 0.5 - 0.5 * Math.cos(Math.PI * (v / w));
      return r0 + (r1 - r0) * t;
    } else {
      const t = 0.5 - 0.5 * Math.cos(Math.PI * ((v - w) / (1 - w)));
      return r1 + (r2 - r1) * t;
    }
  } else if (p.curveType === 'bulbous') {
    const bell = Math.sin(Math.PI * Math.pow(v, 0.75 / (w + 0.25)));
    const linear = r0 * (1 - v) + r2 * v;
    return linear + (r1 - linear) * Math.pow(Math.max(0, bell), 0.85);
  } else if (p.curveType === 'scurve') {
    const s = v * v * (3 - 2 * v);
    const wave = Math.sin(v * Math.PI * 2.0) * (r1 - (r0 + r2) * 0.5) * 0.65;
    return r0 + (r2 - r0) * s + wave;
  } else {
    // Default 'spline': Rational Quadratic Bezier
    const oneMinusV = 1 - v;
    const ctrlR = (r1 - oneMinusV * oneMinusV * r0 - v * v * r2) / Math.max(2 * w * (1 - w), 0.15);
    const clampedCtrl = Math.max(10, Math.min(250, ctrlR));
    return oneMinusV * oneMinusV * r0 + 2 * oneMinusV * v * clampedCtrl + v * v * r2;
  }
}

export function evaluateRibWave(phase: number, profile: RibProfile): number {
  const twoPi = Math.PI * 2;
  const norm = ((phase % twoPi) + twoPi) % twoPi;
  const t = norm / twoPi;

  if (profile === 'pleat') {
    return t < 0.5 ? t * 4.0 - 1.0 : 3.0 - t * 4.0;
  } else if (profile === 'scallop') {
    return Math.abs(Math.sin(phase * 0.5)) * 2.0 - 1.0;
  } else if (profile === 'gear') {
    const s = Math.sin(phase);
    return Math.max(-1, Math.min(1, s * 2.6));
  } else if (profile === 'voronoi') {
    // Deterministic periodic 1D Voronoi / cellular distance field over [0, 2PI]
    const N = 4;
    let minDist = 1.0;
    for (let k = 0; k < N; k++) {
      const seed = (k + 0.5 + 0.28 * Math.sin(k * 1.9 + 0.5)) / N;
      let diff = Math.abs(t - seed);
      if (diff > 0.5) diff = 1.0 - diff;
      if (diff < minDist) minDist = diff;
    }
    const maxD = 0.5 / N;
    const normDist = Math.min(1.0, minDist / maxD);
    return 1.0 - 2.0 * normDist;
  } else {
    return Math.sin(phase);
  }
}

export function evaluateOuterRadius(u: number, v: number, p: LampConfig): number {
  const baseR = evaluateBaseRadius(v, p);
  const theta = u * Math.PI * 2;
  const twistRad = ((p.twistAngle * Math.PI) / 180) * v;

  let ribOffset = 0;
  if (p.ribCount > 0 && p.ribDepth > 0) {
    const phase = p.ribCount * (theta + twistRad);
    const wave = evaluateRibWave(phase, p.ribProfile);
    ribOffset = (wave * 0.5 + 0.5) * p.ribDepth;
  }

  let vRipple = 0;
  if (p.vWaveFreq > 0 && p.vWaveAmp > 0) {
    vRipple = Math.sin(v * p.vWaveFreq * Math.PI * 2 + theta * (p.ribCount > 0 ? 1 : 0)) * p.vWaveAmp;
  }

  return Math.max(8, baseR + ribOffset + vRipple);
}

export interface MeshBuffers {
  positions: number[];
  colors: number[];
}

function createMeshBuilders(buffers: MeshBuffers) {
  function addTriangle(
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
    ta = 0.5, tb = 0.5, tc = 0.5
  ) {
    buffers.positions.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    buffers.colors.push(ta, ta, ta, tb, tb, tb, tc, tc, tc);
  }

  function addQuad(
    x00: number, y00: number, z00: number,
    x10: number, y10: number, z10: number,
    x11: number, y11: number, z11: number,
    x01: number, y01: number, z01: number,
    t00 = 0.5, t10 = 0.5, t11 = 0.5, t01 = 0.5
  ) {
    addTriangle(x00, y00, z00, x10, y10, z10, x11, y11, z11, t00, t10, t11);
    addTriangle(x00, y00, z00, x11, y11, z11, x01, y01, z01, t00, t11, t01);
  }

  return { addTriangle, addQuad };
}

export function buildShadeBodyBuffers(p: LampConfig): MeshBuffers {
  const buffers: MeshBuffers = { positions: [], colors: [] };
  const { addQuad } = createMeshBuilders(buffers);

  const R = Math.max(16, Math.floor(p.radialSegs));
  const H = Math.max(8, Math.floor(p.heightSegs));
  const totalH = p.height;

  const outerX: number[][] = [];
  const outerZ: number[][] = [];
  const innerX: number[][] = [];
  const innerZ: number[][] = [];
  const yGrid: number[] = [];
  const thicknessFactorGrid: number[][] = [];

  for (let j = 0; j <= H; j++) {
    const v = j / H;
    const y = v * totalH;
    yGrid.push(y);

    const rowOX: number[] = [];
    const rowOZ: number[] = [];
    const rowIX: number[] = [];
    const rowIZ: number[] = [];
    const rowTF: number[] = [];
    const baseR = evaluateBaseRadius(v, p);

    for (let i = 0; i < R; i++) {
      const u = i / R;
      const theta = u * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const rOut = evaluateOuterRadius(u, v, p);
      const rBaseInner = baseR - p.wallThickness;
      const rContourInner = rOut - p.wallThickness;
      const rIn = Math.max(6, rBaseInner * 0.65 + rContourInner * 0.35);

      rowOX.push(rOut * cosT);
      rowOZ.push(rOut * sinT);
      rowIX.push(rIn * cosT);
      rowIZ.push(rIn * sinT);

      const localDelta = Math.max(0.4, rOut - rIn);
      const normThick = Math.min(
        1.0,
        Math.max(0.0, (localDelta - 0.8) / (Math.max(p.ribDepth, 4.0) + p.wallThickness))
      );
      rowTF.push(normThick);
    }

    outerX.push(rowOX);
    outerZ.push(rowOZ);
    innerX.push(rowIX);
    innerZ.push(rowIZ);
    thicknessFactorGrid.push(rowTF);
  }

  if (p.printMode === 'shell') {
    // 1. Outer Wall
    for (let j = 0; j < H; j++) {
      const y0 = yGrid[j];
      const y1 = yGrid[j + 1];
      for (let i = 0; i < R; i++) {
        const iNext = (i + 1) % R;
        const tf00 = thicknessFactorGrid[j][i];
        const tf10 = thicknessFactorGrid[j][iNext];
        const tf11 = thicknessFactorGrid[j + 1][iNext];
        const tf01 = thicknessFactorGrid[j + 1][i];

        addQuad(
          outerX[j][i], y0, outerZ[j][i],
          outerX[j + 1][i], y1, outerZ[j + 1][i],
          outerX[j + 1][iNext], y1, outerZ[j + 1][iNext],
          outerX[j][iNext], y0, outerZ[j][iNext],
          tf00, tf01, tf11, tf10
        );

        // 2. Inner Wall
        addQuad(
          innerX[j][i], y0, innerZ[j][i],
          innerX[j][iNext], y0, innerZ[j][iNext],
          innerX[j + 1][iNext], y1, innerZ[j + 1][iNext],
          innerX[j + 1][i], y1, innerZ[j + 1][i],
          tf00, tf10, tf11, tf01
        );
      }
    }

    // 3. Bottom Rim Cap
    for (let i = 0; i < R; i++) {
      const iNext = (i + 1) % R;
      addQuad(
        outerX[0][i], 0, outerZ[0][i],
        outerX[0][iNext], 0, outerZ[0][iNext],
        innerX[0][iNext], 0, innerZ[0][iNext],
        innerX[0][i], 0, innerZ[0][i],
        0.7, 0.7, 0.7, 0.7
      );
    }

    // 4. Top Rim Cap
    for (let i = 0; i < R; i++) {
      const iNext = (i + 1) % R;
      addQuad(
        innerX[H][i], totalH, innerZ[H][i],
        innerX[H][iNext], totalH, innerZ[H][iNext],
        outerX[H][iNext], totalH, outerZ[H][iNext],
        outerX[H][i], totalH, outerZ[H][i],
        0.7, 0.7, 0.7, 0.7
      );
    }
  } else {
    // Single-wall vase mode
    for (let j = 0; j < H; j++) {
      const y0 = yGrid[j];
      const y1 = yGrid[j + 1];
      for (let i = 0; i < R; i++) {
        const iNext = (i + 1) % R;
        const tf00 = thicknessFactorGrid[j][i];
        const tf10 = thicknessFactorGrid[j][iNext];
        const tf11 = thicknessFactorGrid[j + 1][iNext];
        const tf01 = thicknessFactorGrid[j + 1][i];

        addQuad(
          outerX[j][i], y0, outerZ[j][i],
          outerX[j + 1][i], y1, outerZ[j + 1][i],
          outerX[j + 1][iNext], y1, outerZ[j + 1][iNext],
          outerX[j][iNext], y0, outerZ[j][iNext],
          tf00, tf01, tf11, tf10
        );
      }
    }

    // Flat bottom solid disk with socket hole
    if (p.socketPreset !== 'none' && p.socketDia > 0) {
      const socketRad = Math.min(p.bottomRadius - 4, p.socketDia * 0.5);
      for (let i = 0; i < R; i++) {
        const iNext = (i + 1) % R;
        const a0 = (i / R) * Math.PI * 2;
        const a1 = ((i + 1) / R) * Math.PI * 2;
        const hx0 = socketRad * Math.cos(a0), hz0 = socketRad * Math.sin(a0);
        const hx1 = socketRad * Math.cos(a1), hz1 = socketRad * Math.sin(a1);

        addQuad(
          outerX[0][i], 0, outerZ[0][i],
          outerX[0][iNext], 0, outerZ[0][iNext],
          hx1, 0, hz1,
          hx0, 0, hz0,
          0.8, 0.8, 0.8, 0.8
        );
      }
    }
  }

  return buffers;
}

export function buildSocketSpiderBuffers(p: LampConfig): MeshBuffers | null {
  if (p.socketPreset === 'none' || p.socketDia <= 0 || p.printMode !== 'shell') {
    return null;
  }

  const buffers: MeshBuffers = { positions: [], colors: [] };
  const { addQuad } = createMeshBuilders(buffers);

  const R = Math.max(16, Math.floor(p.radialSegs));
  const totalH = p.height;
  const holeRad = p.socketDia * 0.5;
  const collarOutRad = holeRad + p.collarWidth;
  const cHeight = p.collarHeight;
  const isTop = p.mountPos === 'top';
  const cY0 = isTop ? totalH - cHeight : 0;
  const cY1 = isTop ? totalH : cHeight;

  // Collar Ring
  const collarSegs = Math.min(64, R);
  for (let i = 0; i < collarSegs; i++) {
    const a0 = (i / collarSegs) * Math.PI * 2;
    const a1 = ((i + 1) / collarSegs) * Math.PI * 2;
    const c0 = Math.cos(a0), s0 = Math.sin(a0);
    const c1 = Math.cos(a1), s1 = Math.sin(a1);

    const ix0 = holeRad * c0, iz0 = holeRad * s0;
    const ix1 = holeRad * c1, iz1 = holeRad * s1;
    const ox0 = collarOutRad * c0, oz0 = collarOutRad * s0;
    const ox1 = collarOutRad * c1, oz1 = collarOutRad * s1;

    addQuad(ox0, cY0, oz0, ox0, cY1, oz0, ox1, cY1, oz1, ox1, cY0, oz1, 0.9, 0.9, 0.9, 0.9);
    addQuad(ix0, cY0, iz0, ix1, cY0, iz1, ix1, cY1, iz1, ix0, cY1, iz0, 0.9, 0.9, 0.9, 0.9);
    addQuad(ox0, cY0, oz0, ox1, cY0, oz1, ix1, cY0, iz1, ix0, cY0, iz0, 0.9, 0.9, 0.9, 0.9);
    addQuad(ix0, cY1, iz0, ix1, cY1, iz1, ox1, cY1, oz1, ox0, cY1, oz0, 0.9, 0.9, 0.9, 0.9);
  }

  // Spokes
  const numSpokes = p.spokeCount;
  const halfW = p.spokeWidth * 0.5;
  const mountV = isTop ? 0.92 : 0.02;
  const shadeInnerWallR = Math.max(collarOutRad + 2, evaluateBaseRadius(mountV, p) - p.wallThickness * 0.4);

  for (let k = 0; k < numSpokes; k++) {
    const angle = (k / numSpokes) * Math.PI * 2;
    const dirX = Math.cos(angle);
    const dirZ = Math.sin(angle);
    const perpX = -dirZ;
    const perpZ = dirX;

    const rStart = collarOutRad - 1.0;
    const rEnd = Math.max(rStart + 2, shadeInnerWallR);
    const spanR = Math.max(0, rEnd - rStart);
    const dropOffset = isTop ? Math.min(totalH * 0.35, spanR * 0.75) : 0;

    const sy0_in = cY0;
    const sy1_in = cY1;
    const sy0_out = Math.max(0, cY0 - dropOffset);
    const sy1_out = Math.max(cHeight, cY1 - dropOffset);

    const ibL_x = rStart * dirX - halfW * perpX, ibL_z = rStart * dirZ - halfW * perpZ;
    const ibR_x = rStart * dirX + halfW * perpX, ibR_z = rStart * dirZ + halfW * perpZ;
    const obL_x = rEnd * dirX - halfW * perpX, obL_z = rEnd * dirZ - halfW * perpZ;
    const obR_x = rEnd * dirX + halfW * perpX, obR_z = rEnd * dirZ + halfW * perpZ;

    addQuad(ibL_x, sy1_in, ibL_z, ibR_x, sy1_in, ibR_z, obR_x, sy1_out, obR_z, obL_x, sy1_out, obL_z, 0.9, 0.9, 0.9, 0.9);
    addQuad(ibR_x, sy0_in, ibR_z, ibL_x, sy0_in, ibL_z, obL_x, sy0_out, obL_z, obR_x, sy0_out, obR_z, 0.9, 0.9, 0.9, 0.9);
    addQuad(ibL_x, sy0_in, ibL_z, ibL_x, sy1_in, ibL_z, obL_x, sy1_out, obL_z, obL_x, sy0_out, obL_z, 0.9, 0.9, 0.9, 0.9);
    addQuad(ibR_x, sy1_in, ibR_z, ibR_x, sy0_in, ibR_z, obR_x, sy0_out, obR_z, obR_x, sy1_out, obR_z, 0.9, 0.9, 0.9, 0.9);
    addQuad(obL_x, sy0_out, obL_z, obL_x, sy1_out, obL_z, obR_x, sy1_out, obR_z, obR_x, sy0_out, obR_z, 0.9, 0.9, 0.9, 0.9);
  }

  return buffers;
}

export function generateLampShadeGeometry(p: LampConfig): THREE.BufferGeometry {
  const body = buildShadeBodyBuffers(p);
  const spider = buildSocketSpiderBuffers(p);

  const positions: number[] = body.positions.slice();
  const colors: number[] = body.colors.slice();

  if (spider) {
    for (let i = 0; i < spider.positions.length; i++) {
      positions.push(spider.positions[i]);
    }
    for (let i = 0; i < spider.colors.length; i++) {
      colors.push(spider.colors[i]);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  return geometry;
}

export function calculateLampMetrics(
  config: LampConfig,
  existingGeometry?: THREE.BufferGeometry
): LampMetrics {
  if (existingGeometry) {
    return computeLampMetrics(existingGeometry, config);
  }
  const geom = generateLampShadeGeometry(config);
  const metrics = computeLampMetrics(geom, config);
  geom.dispose();
  return metrics;
}

export function computeLampMetrics(geom: THREE.BufferGeometry, p: LampConfig): LampMetrics {
  geom.computeBoundingBox();
  const bbox = geom.boundingBox!;
  const widthMm = Math.round((bbox.max.x - bbox.min.x) * 10) / 10;
  const depthMm = Math.round((bbox.max.z - bbox.min.z) * 10) / 10;
  const heightMm = Math.round((bbox.max.y - bbox.min.y) * 10) / 10;

  const posAttr = geom.getAttribute('position');
  const vertexCount = posAttr ? posAttr.count : 0;
  const triangleCount = vertexCount / 3;

  // Approximate surface area (cylinder / frustum approximation with rib factor)
  const avgR = (p.bottomRadius + p.midRadius + p.topRadius) / 3;
  const ribExpansion = 1 + (p.ribCount * p.ribDepth) / (avgR * 2 * Math.PI || 1);
  const approxAreaCm2 = (2 * Math.PI * avgR * (p.height / 10) * ribExpansion) / 10;
  const effectiveThickCm = (p.printMode === 'vase' ? 0.08 : p.wallThickness) / 10;
  const estVolumeCm3 = Math.round(approxAreaCm2 * effectiveThickCm * 10) / 10;

  // Density ~ 1.24 g/cm3 for PLA, + spider collar weight ~ 14g if present
  const estGrams = Math.max(
    15,
    Math.round(estVolumeCm3 * 1.24 + (p.socketPreset !== 'none' && p.printMode === 'shell' ? 14 : 0))
  );

  // Time estimation ~ 25g per hour on modern high-speed printer (Bambu / Prusa CoreXY)
  const estimatedPrintTimeHours = Math.round((estGrams / (p.printMode === 'vase' ? 45 : 28)) * 10) / 10;

  const slicerTips: string[] = [];
  if (p.printMode === 'vase') {
    slicerTips.push('Enable "Spiralize Outer Contour" (Vase Mode) in your slicer.');
    slicerTips.push('Set line width to 0.6mm - 0.8mm for high optical strength.');
    slicerTips.push('Recommended 0.20mm - 0.24mm layer height with 0% infill.');
  } else {
    slicerTips.push('Print with 0% infill and 3-4 perimeter walls for translucent diffusion.');
    slicerTips.push('No supports needed: overhangs and collar spokes are self-supporting.');
    slicerTips.push('Recommended layer height 0.16mm - 0.20mm for smooth slope transitions.');
  }

  return {
    dimensionsMm: {
      width: widthMm,
      depth: depthMm,
      height: heightMm,
    },
    triangleCount,
    vertexCount,
    estimatedVolumeCm3: estVolumeCm3,
    estimatedGrams: estGrams,
    estimatedPrintTimeHours,
    slicerTips,
  };
}

export function exportBinarySTL(geom: THREE.BufferGeometry, title = 'PrivKnife_LampShade'): ArrayBuffer {
  const pos = geom.getAttribute('position');
  const numTris = pos.count / 3;

  const bufferSize = 84 + numTris * 50;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const dataView = new DataView(arrayBuffer);

  // 80-byte ASCII header
  const header = `PrivKnife 3D Parametric Lamp Shade - [${title}]`;
  for (let i = 0; i < 80; i++) {
    dataView.setUint8(i, i < header.length ? header.charCodeAt(i) : 0x20);
  }

  // 4-byte unsigned 32-bit integer: triangle count
  dataView.setUint32(80, numTris, true);

  let offset = 84;
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let i = 0; i < numTris; i++) {
    const idx = i * 3;
    vA.fromBufferAttribute(pos, idx);
    vB.fromBufferAttribute(pos, idx + 1);
    vC.fromBufferAttribute(pos, idx + 2);

    cb.subVectors(vC, vB);
    ab.subVectors(vA, vB);
    cb.cross(ab).normalize();
    normal.copy(cb);

    // Normal vector (12 bytes)
    dataView.setFloat32(offset, normal.x, true);
    dataView.setFloat32(offset + 4, normal.y, true);
    dataView.setFloat32(offset + 8, normal.z, true);

    // Vertex 1 (12 bytes)
    dataView.setFloat32(offset + 12, vA.x, true);
    dataView.setFloat32(offset + 16, vA.y, true);
    dataView.setFloat32(offset + 20, vA.z, true);

    // Vertex 2 (12 bytes)
    dataView.setFloat32(offset + 24, vB.x, true);
    dataView.setFloat32(offset + 28, vB.y, true);
    dataView.setFloat32(offset + 32, vB.z, true);

    // Vertex 3 (12 bytes)
    dataView.setFloat32(offset + 36, vC.x, true);
    dataView.setFloat32(offset + 40, vC.y, true);
    dataView.setFloat32(offset + 44, vC.z, true);

    // Attribute byte count (2 bytes)
    dataView.setUint16(offset + 48, 0, true);

    offset += 50;
  }

  return arrayBuffer;
}

export const exportToBinarySTL = exportBinarySTL;

function build3MFObjectXml(
  id: number,
  name: string,
  positions: number[] | THREE.BufferAttribute
): string {
  const isAttr = typeof (positions as any).getX === 'function';
  const vertexCount = isAttr
    ? (positions as THREE.BufferAttribute).count
    : (positions as number[]).length / 3;

  let verticesXml = '';
  for (let i = 0; i < vertexCount; i++) {
    const x = isAttr
      ? (positions as THREE.BufferAttribute).getX(i).toFixed(3)
      : (positions as number[])[i * 3].toFixed(3);
    const y = isAttr
      ? (positions as THREE.BufferAttribute).getY(i).toFixed(3)
      : (positions as number[])[i * 3 + 1].toFixed(3);
    const z = isAttr
      ? (positions as THREE.BufferAttribute).getZ(i).toFixed(3)
      : (positions as number[])[i * 3 + 2].toFixed(3);
    verticesXml += `        <vertex x="${x}" y="${y}" z="${z}"/>\n`;
  }

  const numTris = Math.floor(vertexCount / 3);
  let trianglesXml = '';
  for (let i = 0; i < numTris; i++) {
    const v1 = i * 3;
    const v2 = i * 3 + 1;
    const v3 = i * 3 + 2;
    trianglesXml += `        <triangle v1="${v1}" v2="${v2}" v3="${v3}"/>\n`;
  }

  return `    <object id="${id}" name="${name}" type="model">\n      <mesh>\n        <vertices>\n${verticesXml}        </vertices>\n        <triangles>\n${trianglesXml}        </triangles>\n      </mesh>\n    </object>`;
}

export async function export3mf(
  geomOrConfig: THREE.BufferGeometry | LampConfig,
  configOrGeom?: LampConfig | THREE.BufferGeometry
): Promise<Blob> {
  let geom: THREE.BufferGeometry | undefined;
  let config: LampConfig;

  if ('isBufferGeometry' in geomOrConfig || (geomOrConfig as any).getAttribute) {
    geom = geomOrConfig as THREE.BufferGeometry;
    config = configOrGeom as LampConfig;
  } else {
    config = geomOrConfig as LampConfig;
    geom = configOrGeom as THREE.BufferGeometry | undefined;
  }

  const zip = new JSZip();

  // Content Types
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`
  );

  // Root Relationships
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`
  );

  // 3D Model XML
  let resourcesXml = '';
  let buildItemsXml = '';

  const hasSocket = config.socketPreset !== 'none' && config.socketDia > 0;
  if (hasSocket && config.printMode === 'shell') {
    const bodyBuffers = buildShadeBodyBuffers(config);
    const spiderBuffers = buildSocketSpiderBuffers(config);

    const bodyObjXml = build3MFObjectXml(1, 'Lampshade Body', bodyBuffers.positions);
    const spiderObjXml = spiderBuffers && spiderBuffers.positions.length > 0
      ? build3MFObjectXml(2, 'Socket Spider Fitter', spiderBuffers.positions)
      : '';

    resourcesXml = `${bodyObjXml}\n${spiderObjXml}`;
    buildItemsXml = `    <item objectid="1"/>\n    <item objectid="2"/>`;
  } else {
    const pos = geom ? (geom.getAttribute('position') as THREE.BufferAttribute) : null;
    const positions = pos ?? buildShadeBodyBuffers(config).positions;
    const bodyObjXml = build3MFObjectXml(1, 'Lampshade Body', positions);

    resourcesXml = bodyObjXml;
    buildItemsXml = `    <item objectid="1"/>`;
  }

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">PrivKnife Parametric Lamp Shade</metadata>
  <metadata name="Designer">PrivKnife 100% In-Browser Studio</metadata>
  <metadata name="SocketPreset">${config.socketPreset.toUpperCase()}</metadata>
  <metadata name="PrintMode">${config.printMode}</metadata>
  <resources>
${resourcesXml}
  </resources>
  <build>
${buildItemsXml}
  </build>
</model>`;

  zip.file('3D/3dmodel.model', modelXml);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml',
    compression: 'DEFLATE',
  });
}

export const exportTo3MF = export3mf;

export async function processLampDesign(
  config: LampConfig,
  format: 'stl' | '3mf' = 'stl'
): Promise<ParametricLampDesignerResult> {
  const geom = generateLampShadeGeometry(config);
  const metrics = computeLampMetrics(geom, config);

  const baseFileName = `PrivKnife_LampShade_${config.curveType}_${config.height}mm_${config.socketPreset.toUpperCase()}`;

  let blob: Blob;
  let fileName: string;
  let mimeType: string;

  if (format === '3mf') {
    blob = await export3mf(geom, config);
    fileName = `${baseFileName}.3mf`;
    mimeType = 'application/vnd.ms-package.3dmanufacturing-3dmodel+xml';
  } else {
    const buffer = exportBinarySTL(geom, baseFileName);
    blob = new Blob([buffer], { type: 'model/stl' });
    fileName = `${baseFileName}.stl`;
    mimeType = 'model/stl';
  }

  geom.dispose();

  return {
    success: true,
    blob,
    fileName,
    fileSize: blob.size,
    mimeType,
    metrics,
  };
}
