import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import JSZip from 'jszip';
import {
  DrawerDividerGridOptions,
  DrawerGridMetrics,
  DrawerGridParts,
  DrawerGridValidationResult,
  DrawerSlatSegment,
  SlatSegmentPlan,
} from './types';

type Stroke = [[number, number], [number, number]];

const FONT_GLYPHS: Record<string, Stroke[]> = {
  A: [[[0, 0], [0.5, 1]], [[0.5, 1], [1, 0]], [[0.2, 0.4], [0.8, 0.4]]],
  B: [[[0, 0], [0, 1]], [[0, 1], [0.75, 1]], [[0.75, 1], [0.75, 0.52]], [[0.75, 0.52], [0, 0.52]], [[0, 0.52], [0.85, 0.52]], [[0.85, 0.52], [0.85, 0]], [[0.85, 0], [0, 0]]],
  C: [[[1, 0.8], [0.3, 1]], [[0.3, 1], [0, 0.7]], [[0, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]], [[0.3, 0], [1, 0.2]]],
  D: [[[0, 0], [0, 1]], [[0, 1], [0.6, 1]], [[0.6, 1], [1, 0.6]], [[1, 0.6], [1, 0.4]], [[1, 0.4], [0.6, 0]], [[0.6, 0], [0, 0]]],
  X: [[[0, 0], [1, 1]], [[0, 1], [1, 0]]],
  Y: [[[0, 1], [0.5, 0.5]], [[1, 1], [0.5, 0.5]], [[0.5, 0.5], [0.5, 0]]],
  '-': [[[0.2, 0.5], [0.8, 0.5]]],
  '0': [[[0.25, 0], [0.75, 0]], [[0.75, 0], [1, 0.25]], [[1, 0.25], [1, 0.75]], [[1, 0.75], [0.75, 1]], [[0.75, 1], [0.25, 1]], [[0.25, 1], [0, 0.75]], [[0, 0.75], [0, 0.25]], [[0, 0.25], [0.25, 0]]],
  '1': [[[0.3, 0.8], [0.5, 1]], [[0.5, 1], [0.5, 0]], [[0.25, 0], [0.75, 0]]],
  '2': [[[0.1, 0.8], [0.5, 1]], [[0.5, 1], [0.9, 0.7]], [[0.9, 0.7], [0, 0]], [[0, 0], [1, 0]]],
  '3': [[[0.1, 0.85], [0.5, 1]], [[0.5, 1], [0.9, 0.75]], [[0.9, 0.75], [0.4, 0.5]], [[0.4, 0.5], [0.9, 0.25]], [[0.9, 0.25], [0.5, 0]]],
  '4': [[[0.8, 0], [0.8, 1]], [[0.8, 1], [0, 0.35]], [[0, 0.35], [1, 0.35]]],
  '5': [[[0.9, 1], [0.1, 1]], [[0.1, 1], [0.1, 0.55]], [[0.1, 0.55], [0.7, 0.55]], [[0.7, 0.55], [0.9, 0.3]], [[0.9, 0.3], [0.6, 0]], [[0.6, 0], [0.1, 0]]],
  '6': [[[0.8, 0.9], [0.3, 1]], [[0.3, 1], [0, 0.7]], [[0, 0.7], [0, 0.25]], [[0, 0.25], [0.3, 0]], [[0.3, 0], [0.7, 0]], [[0.7, 0], [0.9, 0.25]], [[0.9, 0.25], [0.7, 0.5]], [[0.7, 0.5], [0.05, 0.5]]],
  '7': [[[0, 1], [1, 1]], [[1, 1], [0.35, 0]]],
  '8': [[[0.3, 1], [0.7, 1]], [[0.7, 1], [0.9, 0.75]], [[0.9, 0.75], [0.5, 0.5]], [[0.5, 0.5], [0.9, 0.25]], [[0.9, 0.25], [0.7, 0]], [[0.7, 0], [0.3, 0]], [[0.3, 0], [0.1, 0.25]], [[0.1, 0.25], [0.5, 0.5]], [[0.5, 0.5], [0.1, 0.75]], [[0.1, 0.75], [0.3, 1]]],
  '9': [[[0.2, 0.1], [0.7, 0]], [[0.7, 0], [1, 0.3]], [[1, 0.3], [1, 0.75]], [[1, 0.75], [0.7, 1]], [[0.7, 1], [0.3, 1]], [[0.3, 1], [0.1, 0.75]], [[0.1, 0.75], [0.3, 0.5]], [[0.3, 0.5], [0.95, 0.5]]],
};

function isFiniteNum(v: number, min: number, max: number): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

function isFiniteInt(v: number, min: number, max: number): boolean {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
}

/**
 * Parses comma-separated compartment ratios and normalizes to sum 1.0,
 * falling back to equal divisions when empty or malformed.
 */
export function parseNormalizedRatios(raw: string, fallbackCount: number): number[] {
  const safeCount = Math.max(1, Math.min(10, Math.round(fallbackCount || 1)));
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const tokens = raw
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (tokens.length >= 2 && tokens.length <= 10) {
      const sum = tokens.reduce((acc, v) => acc + v, 0);
      if (sum > 0) {
        return tokens.map((v) => v / sum);
      }
    }
  }
  return Array.from({ length: safeCount }, () => 1 / safeCount);
}

/**
 * Validates drawer caliper dimensions, tolerances, bed limits, and split counts.
 */
export function validateDrawerGridOptions(
  options: DrawerDividerGridOptions
): DrawerGridValidationResult {
  if (!options || typeof options !== 'object') {
    return { valid: false, error: 'Configuration options are required.' };
  }
  if (!isFiniteNum(options.drawerWidthMm, 80, 900)) {
    return { valid: false, error: 'Internal drawer width must be between 80 and 900 mm.' };
  }
  if (!isFiniteNum(options.drawerDepthMm, 80, 700)) {
    return { valid: false, error: 'Internal drawer depth must be between 80 and 700 mm.' };
  }
  if (!isFiniteNum(options.dividerHeightMm, 20, 140)) {
    return { valid: false, error: 'Divider height must be between 20 and 140 mm.' };
  }
  if (!isFiniteNum(options.bladeThicknessMm, 2.4, 5.0)) {
    return { valid: false, error: 'Blade thickness must be between 2.4 and 5.0 mm.' };
  }
  if (!isFiniteNum(options.edgeClearanceMm, 0.5, 3.0)) {
    return { valid: false, error: 'Edge fit clearance must be between 0.5 and 3.0 mm.' };
  }
  if (!isFiniteNum(options.notchClearanceMm, 0.15, 0.4)) {
    return { valid: false, error: 'Notch clearance must be between 0.15 and 0.40 mm.' };
  }
  if (!isFiniteInt(options.colCount, 1, 10) || !isFiniteInt(options.rowCount, 1, 10)) {
    return { valid: false, error: 'Columns and rows must be integers between 1 and 10.' };
  }
  if (!isFiniteNum(options.printerBedMm, 180, 350)) {
    return { valid: false, error: 'Printer bed size must be between 180 and 350 mm.' };
  }

  const colRatios = parseNormalizedRatios(options.customColRatios, options.colCount);
  const rowRatios = parseNormalizedRatios(options.customRowRatios, options.rowCount);
  if (colRatios.length < 2 && rowRatios.length < 2) {
    return { valid: false, error: 'Configure at least 2 columns or 2 rows to generate divider slats.' };
  }

  return { valid: true };
}

/**
 * Splits a slat span exceeding maxPieceMm into printable dovetail-jointed segments
 * while guaranteeing every joint stays >= 12mm clear of every half-lap notch.
 */
export function planSlatSplits(
  totalLengthMm: number,
  notchPositions: number[],
  maxPieceMm: number
): SlatSegmentPlan[] {
  if (totalLengthMm <= maxPieceMm + 0.01) {
    return [
      {
        startMm: 0,
        endMm: Number(totalLengthMm.toFixed(2)),
        lengthMm: Number(totalLengthMm.toFixed(2)),
        hasLeftFemale: false,
        hasRightMale: false,
      },
    ];
  }

  const minNotchGap = 12.2;
  const minPieceEdge = 24;
  const splits: number[] = [];
  let cursor = 0;

  while (totalLengthMm - cursor > maxPieceMm + 0.01) {
    const remaining = totalLengthMm - cursor;
    const piecesRemaining = Math.ceil(remaining / maxPieceMm);
    const ideal = cursor + remaining / piecesRemaining;
    const lowBound = cursor + minPieceEdge;
    const highBound = Math.min(totalLengthMm - minPieceEdge, cursor + maxPieceMm);

    let chosen: number | null = null;
    for (let guard of [16, minNotchGap]) {
      let bestDist = Infinity;
      for (let candidate = Math.floor(highBound); candidate >= Math.ceil(lowBound); candidate--) {
        const safeFromNotches = notchPositions.every(
          (n) => Math.abs(candidate - n) >= guard
        );
        if (!safeFromNotches) continue;
        // Prefer balanced split close to ideal that keeps tail within maxPieceMm count budget
        const tailPieces = Math.ceil((totalLengthMm - candidate) / maxPieceMm);
        const penalty = Math.abs(candidate - ideal) + (tailPieces >= piecesRemaining ? 500 : 0);
        if (penalty < bestDist) {
          bestDist = penalty;
          chosen = candidate;
        }
      }
      if (chosen !== null) break;
    }

    const nextSplit = chosen ?? Number(Math.min(highBound, ideal).toFixed(1));
    if (nextSplit <= cursor + 1) break;
    splits.push(Number(nextSplit.toFixed(2)));
    cursor = nextSplit;
  }

  const boundaries = [0, ...splits, Number(totalLengthMm.toFixed(2))];
  const plans: SlatSegmentPlan[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const startMm = boundaries[i];
    const endMm = boundaries[i + 1];
    plans.push({
      startMm,
      endMm,
      lengthMm: Number((endMm - startMm).toFixed(2)),
      hasLeftFemale: i > 0,
      hasRightMale: i < boundaries.length - 2,
      splitLeftMm: i > 0 ? startMm : undefined,
      splitRightMm: i < boundaries.length - 2 ? endMm : undefined,
    });
  }
  return plans;
}

function normalizeGeom(geom: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geom.index ? geom.toNonIndexed() : geom.clone();
  for (const attr of Object.keys(g.attributes)) {
    if (attr !== 'position' && attr !== 'normal') {
      g.deleteAttribute(attr);
    }
  }
  if (!g.getAttribute('normal')) {
    g.computeVertexNormals();
  }
  return g;
}

function safeMerge(geoms: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geoms.length === 0) return new THREE.BufferGeometry();
  const norm = geoms.map((g) => normalizeGeom(g));
  try {
    if (norm.length === 1) return norm[0].clone();
    const merged = BufferGeometryUtils.mergeGeometries(norm, false);
    return merged ?? new THREE.BufferGeometry();
  } finally {
    norm.forEach((g) => g.dispose());
  }
}

function buildSlatSegmentGeometry(
  plan: SlatSegmentPlan,
  axis: 'x' | 'y',
  notchPositionsGlobal: number[],
  heightMm: number,
  bladeT: number,
  notchClearanceMm: number,
  includeBaseFeet: boolean
): THREE.BufferGeometry {
  const segLen = plan.lengthMm;
  const hw = (bladeT + notchClearanceMm) / 2;
  const chamfer = 0.4;

  const localNotches = notchPositionsGlobal
    .map((g) => g - plan.startMm)
    .filter((u) => u > hw + 2 && u < segLen - hw - 2)
    .sort((a, b) => a - b);

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);

  // Bottom edge (Y-slats receive bottom upward half-lap slots [0, H/2])
  if (axis === 'y') {
    for (const nu of localNotches) {
      shape.lineTo(nu - hw - chamfer, 0);
      shape.lineTo(nu - hw, chamfer);
      shape.lineTo(nu - hw, heightMm / 2);
      shape.lineTo(nu + hw, heightMm / 2);
      shape.lineTo(nu + hw, chamfer);
      shape.lineTo(nu + hw + chamfer, 0);
    }
  }
  shape.lineTo(segLen, 0);

  // Right end: flat or protruding trapezoidal male dovetail tenon
  const rawNeckH = Math.min(heightMm * 0.44, Math.max(8, heightMm * 0.28));
  const rawHeadH = Math.min(heightMm * 0.72, rawNeckH * 1.45);
  const tenonDepth = 11.0;

  if (plan.hasRightMale) {
    const neckH = rawNeckH - notchClearanceMm;
    const headH = rawHeadH - notchClearanceMm;
    shape.lineTo(segLen, heightMm / 2 - neckH / 2);
    shape.lineTo(segLen + tenonDepth - notchClearanceMm * 0.5, heightMm / 2 - headH / 2);
    shape.lineTo(segLen + tenonDepth - notchClearanceMm * 0.5, heightMm / 2 + headH / 2);
    shape.lineTo(segLen, heightMm / 2 + neckH / 2);
  }
  shape.lineTo(segLen, heightMm);

  // Top edge (X-slats receive top downward half-lap slots [H/2, H])
  if (axis === 'x') {
    for (let i = localNotches.length - 1; i >= 0; i--) {
      const nu = localNotches[i];
      shape.lineTo(nu + hw + chamfer, heightMm);
      shape.lineTo(nu + hw, heightMm - chamfer);
      shape.lineTo(nu + hw, heightMm / 2);
      shape.lineTo(nu - hw, heightMm / 2);
      shape.lineTo(nu - hw, heightMm - chamfer);
      shape.lineTo(nu - hw - chamfer, heightMm);
    }
  }
  shape.lineTo(0, heightMm);

  // Left end: flat or recessed female dovetail mortise
  if (plan.hasLeftFemale) {
    const neckH = rawNeckH + notchClearanceMm;
    const headH = rawHeadH + notchClearanceMm;
    shape.lineTo(0, heightMm / 2 + neckH / 2);
    shape.lineTo(tenonDepth + notchClearanceMm * 0.5, heightMm / 2 + headH / 2);
    shape.lineTo(tenonDepth + notchClearanceMm * 0.5, heightMm / 2 - headH / 2);
    shape.lineTo(0, heightMm / 2 - neckH / 2);
  }
  shape.closePath();

  const rawExtrude = new THREE.ExtrudeGeometry(shape, {
    depth: bladeT,
    bevelEnabled: false,
  });
  let geom = normalizeGeom(rawExtrude);
  rawExtrude.dispose();

  if (includeBaseFeet) {
    // Support-free bottom T-foot wing projecting in +Z above flat plate thickness
    const footZones = [segLen * 0.16, segLen * 0.84].filter(
      (fu) =>
        fu > (plan.hasLeftFemale ? 18 : 6) &&
        fu < segLen - 6 &&
        localNotches.every((nu) => Math.abs(fu - nu) > hw + 6)
    );
    const footGeoms: THREE.BufferGeometry[] = [geom];
    for (const fu of footZones) {
      const fg = new THREE.BoxGeometry(10, 2.0, bladeT + 3.2);
      fg.translate(fu, 1.0, (bladeT + 3.2) / 2);
      footGeoms.push(normalizeGeom(fg));
      fg.dispose();
    }
    if (footGeoms.length > 1) {
      const withFeet = safeMerge(footGeoms);
      footGeoms.forEach((f) => f.dispose());
      geom = withFeet;
    }
  }

  return geom;
}

function buildSlatLabel(text: string, heightMm: number, bladeT: number): THREE.BufferGeometry | null {
  const clean = text.toUpperCase().trim();
  if (!clean) return null;
  const charH = Math.min(7.0, heightMm * 0.25);
  const charW = charH * 0.62;
  const sp = charW * 0.24;
  const st = Math.max(0.48, charH * 0.14);
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
        const halfT = st / 2;
        const s = new THREE.Shape();
        s.moveTo(-halfT, -halfT);
        s.lineTo(len + halfT, -halfT);
        s.lineTo(len + halfT, halfT);
        s.lineTo(-halfT, halfT);
        s.closePath();
        const eg = new THREE.ExtrudeGeometry(s, { depth: 0.45, bevelEnabled: false });
        eg.rotateZ(angle);
        eg.translate(x1, y1, bladeT - 0.08);
        strokes.push(eg);
      }
    }
    cx += charW + sp;
  }
  if (strokes.length === 0) return null;
  const merged = safeMerge(strokes);
  strokes.forEach((s) => s.dispose());
  return merged;
}

/**
 * Generates interlocking half-lap slat segments in both assembled drawer coords
 * and flat bed-packed plate coords (`Z = 0`), with notch-safe dovetail splits.
 */
export function generateDrawerGridParts(
  options: DrawerDividerGridOptions
): DrawerGridParts {
  const check = validateDrawerGridOptions(options);
  if (!check.valid) {
    throw new Error(check.error || 'Invalid drawer divider grid options.');
  }

  const usableWidthMm = Number((options.drawerWidthMm - 2 * options.edgeClearanceMm).toFixed(2));
  const usableDepthMm = Number((options.drawerDepthMm - 2 * options.edgeClearanceMm).toFixed(2));

  const colRatios = parseNormalizedRatios(options.customColRatios, options.colCount);
  const rowRatios = parseNormalizedRatios(options.customRowRatios, options.rowCount);

  // Notch X coords (from X=0 left edge of X-slats) = cumulative colRatios boundaries
  const yNotchPositionsMm: number[] = [];
  let accX = 0;
  for (let i = 0; i < colRatios.length - 1; i++) {
    accX += colRatios[i] * usableWidthMm;
    yNotchPositionsMm.push(Number(accX.toFixed(2)));
  }

  // Notch Y coords (from Y=0 front edge of Y-slats) = cumulative rowRatios boundaries
  const xNotchPositionsMm: number[] = [];
  let accY = 0;
  for (let i = 0; i < rowRatios.length - 1; i++) {
    accY += rowRatios[i] * usableDepthMm;
    xNotchPositionsMm.push(Number(accY.toFixed(2)));
  }

  const maxPieceMm = options.printerBedMm - 16;
  const letterIdx = (idx: number) => String.fromCharCode(65 + (idx % 26));

  interface RawSegmentBuild {
    id: string;
    axis: 'x' | 'y';
    slatIndex: number;
    segmentIndex: number;
    plan: SlatSegmentPlan;
    fixedCoordMm: number;
    notchList: number[];
    splitPositionsMm: number[];
    localGeom: THREE.BufferGeometry;
    localLabel: THREE.BufferGeometry | null;
  }

  const rawBuilds: RawSegmentBuild[] = [];
  let dovetailSplitCount = 0;

  // Build X-axis slats (one per interior row boundary)
  xNotchPositionsMm.forEach((yCoord, rIdx) => {
    const plans = planSlatSplits(usableWidthMm, yNotchPositionsMm, maxPieceMm);
    dovetailSplitCount += Math.max(0, plans.length - 1);
    plans.forEach((plan, sIdx) => {
      const id = plans.length > 1 ? `X${rIdx + 1}-${letterIdx(sIdx)}` : `X${rIdx + 1}`;
      const localGeom = buildSlatSegmentGeometry(
        plan,
        'x',
        yNotchPositionsMm,
        options.dividerHeightMm,
        options.bladeThicknessMm,
        options.notchClearanceMm,
        options.includeBaseFeet
      );
      let localLabel: THREE.BufferGeometry | null = null;
      if (options.includePieceLabels) {
        const lbl = buildSlatLabel(id, options.dividerHeightMm, options.bladeThicknessMm);
        if (lbl) {
          lbl.translate(plan.lengthMm / 2, options.dividerHeightMm * 0.25, 0);
          localLabel = lbl;
        }
      }
      const splitPositionsMm: number[] = [];
      if (plan.splitLeftMm !== undefined) splitPositionsMm.push(plan.splitLeftMm);
      if (plan.splitRightMm !== undefined) splitPositionsMm.push(plan.splitRightMm);

      rawBuilds.push({
        id,
        axis: 'x',
        slatIndex: rIdx,
        segmentIndex: sIdx,
        plan,
        fixedCoordMm: yCoord - usableDepthMm / 2,
        notchList: yNotchPositionsMm,
        splitPositionsMm,
        localGeom,
        localLabel,
      });
    });
  });

  // Build Y-axis slats (one per interior col boundary)
  yNotchPositionsMm.forEach((xCoord, cIdx) => {
    const plans = planSlatSplits(usableDepthMm, xNotchPositionsMm, maxPieceMm);
    dovetailSplitCount += Math.max(0, plans.length - 1);
    plans.forEach((plan, sIdx) => {
      const id = plans.length > 1 ? `Y${cIdx + 1}-${letterIdx(sIdx)}` : `Y${cIdx + 1}`;
      const localGeom = buildSlatSegmentGeometry(
        plan,
        'y',
        xNotchPositionsMm,
        options.dividerHeightMm,
        options.bladeThicknessMm,
        options.notchClearanceMm,
        options.includeBaseFeet
      );
      let localLabel: THREE.BufferGeometry | null = null;
      if (options.includePieceLabels) {
        const lbl = buildSlatLabel(id, options.dividerHeightMm, options.bladeThicknessMm);
        if (lbl) {
          lbl.translate(plan.lengthMm / 2, options.dividerHeightMm * 0.72, 0);
          localLabel = lbl;
        }
      }
      const splitPositionsMm: number[] = [];
      if (plan.splitLeftMm !== undefined) splitPositionsMm.push(plan.splitLeftMm);
      if (plan.splitRightMm !== undefined) splitPositionsMm.push(plan.splitRightMm);

      rawBuilds.push({
        id,
        axis: 'y',
        slatIndex: cIdx,
        segmentIndex: sIdx,
        plan,
        fixedCoordMm: xCoord - usableWidthMm / 2,
        notchList: xNotchPositionsMm,
        splitPositionsMm,
        localGeom,
        localLabel,
      });
    });
  });

  // Shelf-pack every segment cleanly into flat numbered build plates (Z = 0) + assemble 3D copies
  const usablePlateSide = options.printerBedMm - 8;
  const padMm = 8;
  let plateIdx = 0;
  let shelfY = 6;
  const rowH = options.dividerHeightMm + padMm;

  const segments: DrawerSlatSegment[] = rawBuilds.map((item) => {
    if (shelfY + options.dividerHeightMm > usablePlateSide) {
      plateIdx++;
      shelfY = 6;
    }
    const plateOriginX = plateIdx * (options.printerBedMm + 28) - options.printerBedMm / 2 + 6;
    const plateOriginY = shelfY - options.printerBedMm / 2;

    const flatGeometry = item.localGeom.clone();
    flatGeometry.translate(plateOriginX, plateOriginY, 0);
    flatGeometry.computeBoundingBox();

    let labelFlatGeometry: THREE.BufferGeometry | null = null;
    if (item.localLabel) {
      labelFlatGeometry = item.localLabel.clone();
      labelFlatGeometry.translate(plateOriginX, plateOriginY, 0);
      labelFlatGeometry.computeBoundingBox();
    }

    shelfY += rowH;

    // Assembled world transform (upright Z in [0, dividerHeightMm])
    const assembledGeometry = item.localGeom.clone();
    const labelAssembledGeometry = item.localLabel ? item.localLabel.clone() : null;

    const applyAssembledTransform = (g: THREE.BufferGeometry) => {
      g.translate(0, 0, -options.bladeThicknessMm / 2);
      g.rotateX(Math.PI / 2);
      if (item.axis === 'x') {
        g.translate(item.plan.startMm - usableWidthMm / 2, item.fixedCoordMm, 0);
      } else {
        g.rotateZ(Math.PI / 2);
        g.translate(item.fixedCoordMm, item.plan.startMm - usableDepthMm / 2, 0);
      }
      g.computeBoundingBox();
    };

    applyAssembledTransform(assembledGeometry);
    if (labelAssembledGeometry) {
      applyAssembledTransform(labelAssembledGeometry);
    }

    item.localGeom.dispose();
    item.localLabel?.dispose();

    return {
      id: item.id,
      axis: item.axis,
      slatIndex: item.slatIndex,
      segmentIndex: item.segmentIndex,
      plateIndex: plateIdx,
      lengthMm: item.plan.lengthMm,
      flatGeometry,
      assembledGeometry,
      labelFlatGeometry,
      labelAssembledGeometry,
      notchPositionsMm: item.notchList,
      splitPositionsMm: item.splitPositionsMm,
    };
  });

  const buildPlateCount = segments.length > 0 ? plateIdx + 1 : 0;
  const totalRunMm =
    xNotchPositionsMm.length * usableWidthMm + yNotchPositionsMm.length * usableDepthMm;
  const feetFactor = options.includeBaseFeet ? 1.12 : 1.0;
  const estimatedVolumeCm3 = Number(
    Math.max(2, (totalRunMm * options.dividerHeightMm * options.bladeThicknessMm * 0.85 * feetFactor) / 1000).toFixed(2)
  );

  const dispose = () => {
    for (const s of segments) {
      s.flatGeometry.dispose();
      s.assembledGeometry.dispose();
      s.labelFlatGeometry?.dispose();
      s.labelAssembledGeometry?.dispose();
    }
  };

  return {
    segments,
    usableWidthMm,
    usableDepthMm,
    colRatios,
    rowRatios,
    xNotchPositionsMm,
    yNotchPositionsMm,
    dovetailSplitCount,
    buildPlateCount,
    estimatedVolumeCm3,
    dispose,
  };
}

function countTriangles(geom: THREE.BufferGeometry): number {
  const idx = geom.getIndex();
  if (idx) return Math.floor(idx.count / 3);
  const pos = geom.getAttribute('position');
  return pos ? Math.floor(pos.count / 3) : 0;
}

function getFlatGeometries(segments: DrawerSlatSegment[]): THREE.BufferGeometry[] {
  const geoms: THREE.BufferGeometry[] = [];
  for (const s of segments) {
    geoms.push(s.flatGeometry);
    if (s.labelFlatGeometry) geoms.push(s.labelFlatGeometry);
  }
  return geoms;
}

/**
 * Computes single-pass grid telemetry directly from already-built slat segments.
 */
export function calculateDrawerGridMetrics(
  options: DrawerDividerGridOptions,
  parts: DrawerGridParts
): DrawerGridMetrics {
  let triangleCount = 0;
  for (const g of getFlatGeometries(parts.segments)) {
    triangleCount += countTriangles(g);
  }
  const estimatedVolumeCm3 = parts.estimatedVolumeCm3;
  const estimatedWeightG = Number((estimatedVolumeCm3 * 1.24).toFixed(1));
  const estimatedPrintTimeHours = Number(
    Math.max(0.25, estimatedWeightG / 20 + options.bladeThicknessMm * 0.08).toFixed(2)
  );

  return {
    usableWidthMm: parts.usableWidthMm,
    usableDepthMm: parts.usableDepthMm,
    totalSlatsCount: parts.segments.length,
    dovetailSplitCount: parts.dovetailSplitCount,
    buildPlateCount: parts.buildPlateCount,
    triangleCount,
    estimatedVolumeCm3,
    estimatedWeightG,
    estimatedPrintTimeHours,
  };
}

function serializeGeometriesToBinaryStl(geoms: THREE.BufferGeometry[]): ArrayBuffer {
  let totalTris = 0;
  for (const g of geoms) totalTris += countTriangles(g);

  const buffer = new ArrayBuffer(84 + totalTris * 50);
  const view = new DataView(buffer);

  const header = 'PrivKnife Binary STL - Parametric Drawer Divider Grid';
  for (let i = 0; i < 80; i++) {
    view.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }
  view.setUint32(80, totalTris, true);

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

/**
 * Exports all flat-packed slat segments & embossed ID labels as a valid binary .STL ArrayBuffer.
 */
export function exportToBinaryStl(parts: DrawerGridParts): ArrayBuffer {
  return serializeGeometriesToBinaryStl(getFlatGeometries(parts.segments));
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
  const clean = (hex || '').trim().replace(/^#/, '');
  return /^[0-9a-fA-F]{6}$/.test(clean) ? `#${clean.toUpperCase()}FF` : fallback;
}

function serialize3mfObject(
  geom: THREE.BufferGeometry,
  id: number,
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

  return `    <object id="${id}" name="${escapeXml(name)}" pid="1" pindex="${materialIndex}" type="model">
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
 * Exports each slat segment (plus piece label) into a flat-plate OPC .3MF archive.
 */
export async function exportTo3mf(
  options: DrawerDividerGridOptions,
  parts: DrawerGridParts
): Promise<Blob> {
  const color = to3mfColor(options.filamentColorHex, '#10B981FF');
  const objects: string[] = [];
  const items: string[] = [];
  let nextId = 2;

  for (const seg of parts.segments) {
    const id = nextId++;
    objects.push(serialize3mfObject(seg.flatGeometry, id, `Slat ${seg.id} (Plate ${seg.plateIndex + 1})`, 0));
    items.push(`    <item objectid="${id}" />`);

    if (seg.labelFlatGeometry && countTriangles(seg.labelFlatGeometry) > 0) {
      const lid = nextId++;
      objects.push(serialize3mfObject(seg.labelFlatGeometry, lid, `Label ${seg.id}`, 1));
      items.push(`    <item objectid="${lid}" />`);
    }
  }

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">${escapeXml(`Drawer Divider Grid ${parts.usableWidthMm}x${parts.usableDepthMm}mm`)}</metadata>
  <metadata name="Application">PrivKnife Client-Side 3D Studio</metadata>
  <resources>
    <basematerials id="1">
      <base name="Divider Slat Filament" displaycolor="${color}" />
      <base name="Emboss ID Label Filament" displaycolor="#F8FAFCFF" />
    </basematerials>
${objects.join('\n')}
  </resources>
  <build>
${items.join('\n')}
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

/**
 * Packages numbered build-plate .STL files centered per bed + assembly-guide.txt into a .ZIP archive.
 */
export async function exportPlateZip(
  options: DrawerDividerGridOptions,
  parts: DrawerGridParts
): Promise<Blob> {
  const zip = new JSZip();
  const guideLines: string[] = [
    'PrivKnife Drawer Divider & Interlocking Grid Pack',
    `Usable Drawer Envelope: ${parts.usableWidthMm} x ${parts.usableDepthMm} x ${options.dividerHeightMm} mm`,
    `Printer Bed Limit: ${options.printerBedMm} x ${options.printerBedMm} mm`,
    `Total Slats: ${parts.segments.length} | Dovetail Joints: ${parts.dovetailSplitCount} | Plates: ${parts.buildPlateCount}`,
    '',
    'Piece Index:',
  ];

  for (let plateIdx = 0; plateIdx < parts.buildPlateCount; plateIdx++) {
    const plateSegs = parts.segments.filter((s) => s.plateIndex === plateIdx);
    const shiftX = -plateIdx * (options.printerBedMm + 28);
    const recentered: THREE.BufferGeometry[] = [];

    for (const seg of plateSegs) {
      const g = seg.flatGeometry.clone();
      g.translate(shiftX, 0, 0);
      recentered.push(g);
      if (seg.labelFlatGeometry) {
        const lg = seg.labelFlatGeometry.clone();
        lg.translate(shiftX, 0, 0);
        recentered.push(lg);
      }
      guideLines.push(
        `- ${seg.id} (Plate ${plateIdx + 1}): length ${seg.lengthMm} mm, axis=${seg.axis.toUpperCase()}`
      );
    }

    const plateBuf = serializeGeometriesToBinaryStl(recentered);
    recentered.forEach((g) => g.dispose());
    zip.file(`plate-${plateIdx + 1}.stl`, plateBuf);
  }

  zip.file('assembly-guide.txt', guideLines.join('\n'));
  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

export function buildDrawerGridFileBase(options: DrawerDividerGridOptions): string {
  return `privknife-drawer-grid-${Math.round(options.drawerWidthMm)}x${Math.round(
    options.drawerDepthMm
  )}mm`;
}
