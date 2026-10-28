import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import JSZip from 'jszip';
import {
  CharmShape,
  EmergencyIcon,
  PetIdTagGeneratorOptions,
  PetIdTagGeneratorResult,
  PetTagMetrics,
  TagExportFormat,
} from './types';

// -------------------------------------------------------------
// 1. Parameter Validation
// -------------------------------------------------------------
export function validatePetTagOptions(options: PetIdTagGeneratorOptions): {
  valid: boolean;
  error?: string;
} {
  if (!options) {
    return { valid: false, error: 'Options are required' };
  }

  if (
    typeof options.tagWidthMm !== 'number' ||
    options.tagWidthMm < 20 ||
    options.tagWidthMm > 70
  ) {
    return { valid: false, error: 'Tag width must be between 20 and 70 mm' };
  }

  if (
    typeof options.tagHeightMm !== 'number' ||
    options.tagHeightMm < 15 ||
    options.tagHeightMm > 50
  ) {
    return { valid: false, error: 'Tag height must be between 15 and 50 mm' };
  }

  if (
    typeof options.tagThicknessMm !== 'number' ||
    options.tagThicknessMm < 1.5 ||
    options.tagThicknessMm > 5.0
  ) {
    return { valid: false, error: 'Tag thickness must be between 1.5 and 5.0 mm' };
  }

  if (options.tagFormat === 'collar_slide_on') {
    if (
      typeof options.collarWidthMm !== 'number' ||
      options.collarWidthMm < 12 ||
      options.collarWidthMm > 45
    ) {
      return { valid: false, error: 'Collar width must be between 12 and 45 mm' };
    }
  }

  if (
    typeof options.raisedTextHeightMm !== 'number' ||
    options.raisedTextHeightMm < 0.4 ||
    options.raisedTextHeightMm > 2.0
  ) {
    return { valid: false, error: 'Raised text height must be between 0.4 and 2.0 mm' };
  }

  if (!options.petName || options.petName.trim().length === 0) {
    return { valid: false, error: 'Pet name is required' };
  }

  if (options.petName.trim().length > 20) {
    return { valid: false, error: 'Pet name cannot exceed 20 characters' };
  }

  return { valid: true };
}

// -------------------------------------------------------------
// 2. Safe Buffer Geometry Merging
// -------------------------------------------------------------
function safeMergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  if (geometries.length === 0) return new THREE.BufferGeometry();
  if (geometries.length === 1) return geometries[0].clone();

  const normalized = geometries.map((geom) => {
    let g = geom.index ? geom.toNonIndexed() : geom.clone();
    const attrs = Object.keys(g.attributes);
    for (const attr of attrs) {
      if (attr !== 'position' && attr !== 'normal') {
        g.deleteAttribute(attr);
      }
    }
    if (!g.getAttribute('normal')) {
      g.computeVertexNormals();
    }
    return g;
  });

  const merged = BufferGeometryUtils.mergeGeometries(normalized, false);
  normalized.forEach((g) => g.dispose());
  return merged || new THREE.BufferGeometry();
}

// -------------------------------------------------------------
// 3. Vector Stroke Font & Glyph Rendering
// -------------------------------------------------------------
type Stroke = [[number, number], [number, number]];

const FONT_GLYPHS: Record<string, Stroke[]> = {
  A: [[[0, 0], [0.5, 1]], [[0.5, 1], [1, 0]], [[0.2, 0.4], [0.8, 0.4]]],
  B: [[[0, 0], [0, 1]], [[0, 1], [0.75, 1]], [[0.75, 1], [0.75, 0.5]], [[0.75, 0.5], [0, 0.5]], [[0, 0.5], [0.85, 0.5]], [[0.85, 0.5], [0.85, 0]], [[0.85, 0], [0, 0]]],
  C: [[[1, 0.8], [0.3, 1]], [[0.3, 1], [0, 0.7]], [[0, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]], [[0.3, 0], [1, 0.2]]],
  D: [[[0, 0], [0, 1]], [[0, 1], [0.6, 1]], [[0.6, 1], [1, 0.6]], [[1, 0.6], [1, 0.4]], [[1, 0.4], [0.6, 0]], [[0.6, 0], [0, 0]]],
  E: [[[0, 0], [0, 1]], [[0, 1], [0.8, 1]], [[0, 0.5], [0.6, 0.5]], [[0, 0], [0.8, 0]]],
  F: [[[0, 0], [0, 1]], [[0, 1], [0.8, 1]], [[0, 0.5], [0.6, 0.5]]],
  G: [[[1, 0.8], [0.3, 1]], [[0.3, 1], [0, 0.7]], [[0, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]], [[0.3, 0], [1, 0]], [[1, 0], [1, 0.5]], [[1, 0.5], [0.5, 0.5]]],
  H: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]],
  I: [[[0.5, 0], [0.5, 1]], [[0.2, 1], [0.8, 1]], [[0.2, 0], [0.8, 0]]],
  J: [[[0.8, 1], [0.8, 0.3]], [[0.8, 0.3], [0.5, 0]], [[0.5, 0], [0.2, 0.2]], [[0.2, 0.2], [0.2, 0.4]]],
  K: [[[0, 0], [0, 1]], [[0, 0.45], [0.9, 1]], [[0.2, 0.55], [0.9, 0]]],
  L: [[[0, 1], [0, 0]], [[0, 0], [0.8, 0]]],
  M: [[[0, 0], [0, 1]], [[0, 1], [0.5, 0.3]], [[0.5, 0.3], [1, 1]], [[1, 1], [1, 0]]],
  N: [[[0, 0], [0, 1]], [[0, 1], [1, 0]], [[1, 0], [1, 1]]],
  O: [[[0.3, 0], [0.7, 0]], [[0.7, 0], [1, 0.3]], [[1, 0.3], [1, 0.7]], [[1, 0.7], [0.7, 1]], [[0.7, 1], [0.3, 1]], [[0.3, 1], [0, 0.7]], [[0, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]]],
  P: [[[0, 0], [0, 1]], [[0, 1], [0.8, 1]], [[0.8, 1], [0.8, 0.5]], [[0.8, 0.5], [0, 0.5]]],
  Q: [[[0.3, 0], [0.7, 0]], [[0.7, 0], [1, 0.3]], [[1, 0.3], [1, 0.7]], [[1, 0.7], [0.7, 1]], [[0.7, 1], [0.3, 1]], [[0.3, 1], [0, 0.7]], [[0, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]], [[0.6, 0.3], [1, -0.1]]],
  R: [[[0, 0], [0, 1]], [[0, 1], [0.8, 1]], [[0.8, 1], [0.8, 0.55]], [[0.8, 0.55], [0, 0.55]], [[0.3, 0.55], [0.9, 0]]],
  S: [[[0.9, 0.85], [0.3, 1]], [[0.3, 1], [0, 0.75]], [[0, 0.75], [0.8, 0.5]], [[0.8, 0.5], [1, 0.25]], [[1, 0.25], [0.7, 0]], [[0.7, 0], [0.1, 0.15]]],
  T: [[[0.5, 0], [0.5, 1]], [[0, 1], [1, 1]]],
  U: [[[0, 1], [0, 0.3]], [[0, 0.3], [0.3, 0]], [[0.3, 0], [0.7, 0]], [[0.7, 0], [1, 0.3]], [[1, 0.3], [1, 1]]],
  V: [[[0, 1], [0.5, 0]], [[0.5, 0], [1, 1]]],
  W: [[[0, 1], [0.25, 0]], [[0.25, 0], [0.5, 0.7]], [[0.5, 0.7], [0.75, 0]], [[0.75, 0], [1, 1]]],
  X: [[[0, 0], [1, 1]], [[0, 1], [1, 0]]],
  Y: [[[0, 1], [0.5, 0.5]], [[1, 1], [0.5, 0.5]], [[0.5, 0.5], [0.5, 0]]],
  Z: [[[0, 1], [1, 1]], [[1, 1], [0, 0]], [[0, 0], [1, 0]]],
  '0': [[[0.3, 0], [0.7, 0]], [[0.7, 0], [1, 0.3]], [[1, 0.3], [1, 0.7]], [[1, 0.7], [0.7, 1]], [[0.7, 1], [0.3, 1]], [[0.3, 1], [0, 0.7]], [[0, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]]],
  '1': [[[0.3, 0.8], [0.5, 1]], [[0.5, 1], [0.5, 0]]],
  '2': [[[0.1, 0.8], [0.5, 1]], [[0.5, 1], [0.9, 0.7]], [[0.9, 0.7], [0, 0]], [[0, 0], [1, 0]]],
  '3': [[[0, 0.85], [0.5, 1]], [[0.5, 1], [0.9, 0.75]], [[0.9, 0.75], [0.4, 0.5]], [[0.4, 0.5], [0.9, 0.25]], [[0.9, 0.25], [0.5, 0]]],
  '4': [[[0.8, 0], [0.8, 1]], [[0.8, 1], [0, 0.35]], [[0, 0.35], [1, 0.35]]],
  '5': [[[0.9, 1], [0.1, 1]], [[0.1, 1], [0.1, 0.55]], [[0.1, 0.55], [0.7, 0.55]], [[0.7, 0.55], [0.9, 0.3]], [[0.9, 0.3], [0.6, 0]], [[0.6, 0], [0.1, 0]]],
  '6': [[[0.8, 0.9], [0.3, 0.7]], [[0.3, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]], [[0.3, 0], [0.7, 0]], [[0.7, 0], [0.9, 0.25]], [[0.9, 0.25], [0.7, 0.5]], [[0.7, 0.5], [0.1, 0.5]]],
  '7': [[[0, 1], [1, 1]], [[1, 1], [0.35, 0]]],
  '8': [[[0.3, 1], [0.7, 1]], [[0.7, 1], [0.9, 0.75]], [[0.9, 0.75], [0.5, 0.5]], [[0.5, 0.5], [0.9, 0.25]], [[0.9, 0.25], [0.7, 0]], [[0.7, 0], [0.3, 0]], [[0.3, 0], [0.1, 0.25]], [[0.1, 0.25], [0.5, 0.5]], [[0.5, 0.5], [0.1, 0.75]], [[0.1, 0.75], [0.3, 1]]],
  '9': [[[0.2, 0.1], [0.7, 0.3]], [[0.7, 0.3], [1, 0.7]], [[1, 0.7], [0.7, 1]], [[0.7, 1], [0.3, 1]], [[0.3, 1], [0.1, 0.75]], [[0.1, 0.75], [0.3, 0.5]], [[0.3, 0.5], [0.9, 0.5]]],
  '-': [[[0.2, 0.5], [0.8, 0.5]]],
  '(': [[[0.7, 1], [0.3, 0.5]], [[0.3, 0.5], [0.7, 0]]],
  ')': [[[0.3, 1], [0.7, 0.5]], [[0.7, 0.5], [0.3, 0]]],
  '.': [[[0.4, 0.1], [0.6, 0.1]]],
  ':': [[[0.5, 0.7], [0.5, 0.8]], [[0.5, 0.2], [0.5, 0.3]]],
  '#': [[[0.3, 0], [0.3, 1]], [[0.7, 0], [0.7, 1]], [[0.1, 0.35], [0.9, 0.35]], [[0.1, 0.65], [0.9, 0.65]]],
};

function renderTextGeometry(
  text: string,
  charHeightMm: number,
  raiseMm: number,
  strokeWidthMm: number,
  posYMm: number
): THREE.BufferGeometry | null {
  const clean = text.toUpperCase().trim();
  if (!clean) return null;

  const charWidthMm = charHeightMm * 0.65;
  const charSpacing = charWidthMm * 0.25;
  const geometries: THREE.BufferGeometry[] = [];

  const totalWidth = clean.length * charWidthMm + (clean.length - 1) * charSpacing;
  let startX = -totalWidth / 2;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === ' ') {
      startX += charWidthMm + charSpacing;
      continue;
    }

    const strokes = FONT_GLYPHS[char];
    if (strokes) {
      for (const stroke of strokes) {
        const [p1, p2] = stroke;
        const x1 = startX + p1[0] * charWidthMm;
        const y1 = posYMm + p1[1] * charHeightMm - charHeightMm / 2;
        const x2 = startX + p2[0] * charWidthMm;
        const y2 = posYMm + p2[1] * charHeightMm - charHeightMm / 2;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.001) continue;

        const angle = Math.atan2(dy, dx);
        const halfThick = strokeWidthMm / 2;

        const rectShape = new THREE.Shape();
        rectShape.moveTo(-halfThick, -halfThick);
        rectShape.lineTo(len + halfThick, -halfThick);
        rectShape.lineTo(len + halfThick, halfThick);
        rectShape.lineTo(-halfThick, halfThick);
        rectShape.closePath();

        const extrudeGeom = new THREE.ExtrudeGeometry(rectShape, {
          depth: raiseMm,
          bevelEnabled: false,
        });

        extrudeGeom.rotateZ(angle);
        extrudeGeom.translate(x1, y1, 0);
        geometries.push(extrudeGeom);
      }
    }

    startX += charWidthMm + charSpacing;
  }

  if (geometries.length === 0) return null;
  const merged = safeMergeGeometries(geometries);
  geometries.forEach((g) => g.dispose());
  return merged;
}

// -------------------------------------------------------------
// 4. Emergency Icon Procedural Geometries
// -------------------------------------------------------------
function buildEmergencyIconGeometry(
  icon: EmergencyIcon,
  sizeMm: number,
  raiseMm: number,
  pos: { x: number; y: number }
): THREE.BufferGeometry | null {
  if (icon === 'none') return null;

  const geometries: THREE.BufferGeometry[] = [];
  const half = sizeMm / 2;

  if (icon === 'medical_cross') {
    const armW = sizeMm * 0.32;
    const shape = new THREE.Shape();
    // 12-point plus shape
    const a = armW / 2;
    shape.moveTo(-a, -half);
    shape.lineTo(a, -half);
    shape.lineTo(a, -a);
    shape.lineTo(half, -a);
    shape.lineTo(half, a);
    shape.lineTo(a, a);
    shape.lineTo(a, half);
    shape.lineTo(-a, half);
    shape.lineTo(-a, a);
    shape.lineTo(-half, a);
    shape.lineTo(-half, -a);
    shape.lineTo(-a, -a);
    shape.closePath();

    const geom = new THREE.ExtrudeGeometry(shape, { depth: raiseMm, bevelEnabled: false });
    geom.translate(pos.x, pos.y, 0);
    geometries.push(geom);
  } else if (icon === 'heart') {
    const shape = new THREE.Shape();
    const s = sizeMm * 0.5;
    shape.moveTo(0, s * 0.3);
    shape.bezierCurveTo(0, s * 0.8, -s, s * 0.8, -s, s * 0.2);
    shape.bezierCurveTo(-s, -s * 0.4, 0, -s * 0.7, 0, -s);
    shape.bezierCurveTo(0, -s * 0.7, s, -s * 0.4, s, s * 0.2);
    shape.bezierCurveTo(s, s * 0.8, 0, s * 0.8, 0, s * 0.3);
    shape.closePath();

    const geom = new THREE.ExtrudeGeometry(shape, { depth: raiseMm, bevelEnabled: false });
    geom.translate(pos.x, pos.y, 0);
    geometries.push(geom);
  } else if (icon === 'paw') {
    // Main palm pad
    const palmShape = new THREE.Shape();
    palmShape.ellipse(0, -sizeMm * 0.15, sizeMm * 0.3, sizeMm * 0.22, 0, Math.PI * 2, false, 0);
    const palmGeom = new THREE.ExtrudeGeometry(palmShape, { depth: raiseMm, bevelEnabled: false });
    palmGeom.translate(pos.x, pos.y, 0);
    geometries.push(palmGeom);

    // 4 toe pads
    const toeRad = sizeMm * 0.11;
    const toeOffsets = [
      { x: -sizeMm * 0.28, y: sizeMm * 0.12 },
      { x: -sizeMm * 0.11, y: sizeMm * 0.25 },
      { x: sizeMm * 0.11, y: sizeMm * 0.25 },
      { x: sizeMm * 0.28, y: sizeMm * 0.12 },
    ];
    for (const to of toeOffsets) {
      const toeShape = new THREE.Shape();
      toeShape.ellipse(0, 0, toeRad, toeRad * 1.25, 0, Math.PI * 2, false, 0);
      const toeGeom = new THREE.ExtrudeGeometry(toeShape, { depth: raiseMm, bevelEnabled: false });
      toeGeom.translate(pos.x + to.x, pos.y + to.y, 0);
      geometries.push(toeGeom);
    }
  } else if (icon === 'microchip') {
    // Square chip
    const bodyW = sizeMm * 0.65;
    const halfB = bodyW / 2;
    const chipShape = new THREE.Shape();
    chipShape.moveTo(-halfB, -halfB);
    chipShape.lineTo(halfB, -halfB);
    chipShape.lineTo(halfB, halfB);
    chipShape.lineTo(-halfB, halfB);
    chipShape.closePath();
    const bodyGeom = new THREE.ExtrudeGeometry(chipShape, { depth: raiseMm, bevelEnabled: false });
    bodyGeom.translate(pos.x, pos.y, 0);
    geometries.push(bodyGeom);

    // Pins on 4 sides
    const pinL = sizeMm * 0.18;
    const pinW = sizeMm * 0.08;
    const pinOffsets = [-sizeMm * 0.16, 0, sizeMm * 0.16];
    for (const po of pinOffsets) {
      // Top and bottom pins
      const pinV = new THREE.BoxGeometry(pinW, pinL, raiseMm);
      const topP = pinV.clone().translate(pos.x + po, pos.y + halfB + pinL / 2, raiseMm / 2);
      const botP = pinV.clone().translate(pos.x + po, pos.y - halfB - pinL / 2, raiseMm / 2);
      geometries.push(topP, botP);
      pinV.dispose();

      // Left and right pins
      const pinH = new THREE.BoxGeometry(pinL, pinW, raiseMm);
      const leftP = pinH.clone().translate(pos.x - halfB - pinL / 2, pos.y + po, raiseMm / 2);
      const rightP = pinH.clone().translate(pos.x + halfB + pinL / 2, pos.y + po, raiseMm / 2);
      geometries.push(leftP, rightP);
      pinH.dispose();
    }
  }

  if (geometries.length === 0) return null;
  const merged = safeMergeGeometries(geometries);
  geometries.forEach((g) => g.dispose());
  return merged;
}

// -------------------------------------------------------------
// 5. 2D Tag Base Shape Generation
// -------------------------------------------------------------
function buildTagShape(options: PetIdTagGeneratorOptions): THREE.Shape {
  const w = options.tagWidthMm;
  const h = options.tagHeightMm;
  const halfW = w / 2;
  const halfH = h / 2;
  const shape = new THREE.Shape();

  if (options.tagFormat === 'collar_slide_on') {
    // Rounded rectangle with collar strap slots
    const r = Math.min(4.0, h * 0.2);
    shape.moveTo(-halfW + r, -halfH);
    const segs = 24;
    for (let i = 1; i <= segs; i++) {
      const x = -halfW + r + (2 * (halfW - r)) * (i / segs);
      shape.lineTo(x, -halfH);
    }
    shape.absarc(halfW - r, -halfH + r, r, -Math.PI / 2, 0, false);
    shape.lineTo(halfW, halfH - r);
    shape.absarc(halfW - r, halfH - r, r, 0, Math.PI / 2, false);
    for (let i = 1; i <= segs; i++) {
      const x = halfW - r - (2 * (halfW - r)) * (i / segs);
      shape.lineTo(x, halfH);
    }
    shape.absarc(-halfW + r, halfH - r, r, Math.PI / 2, Math.PI, false);
    shape.lineTo(-halfW, -halfH + r);
    shape.absarc(-halfW + r, -halfH + r, r, Math.PI, (3 * Math.PI) / 2, false);
    shape.closePath();

    // Two vertical strap slots on left and right
    const slotH = Math.min(options.collarWidthMm, h - 6.0);
    const slotW = options.slotWidthMm;
    const slotR = Math.min(1.5, slotW / 2);
    const slotX = halfW - slotW - 3.0; // Margin from outer edge
    const halfSlotH = slotH / 2;
    const halfSlotW = slotW / 2;

    const makeSlotHole = (cx: number) => {
      const slot = new THREE.Path();
      slot.moveTo(cx - halfSlotW + slotR, -halfSlotH);
      slot.lineTo(cx + halfSlotW - slotR, -halfSlotH);
      slot.absarc(cx + halfSlotW - slotR, -halfSlotH + slotR, slotR, -Math.PI / 2, 0, false);
      slot.lineTo(cx + halfSlotW, halfSlotH - slotR);
      slot.absarc(cx + halfSlotW - slotR, halfSlotH - slotR, slotR, 0, Math.PI / 2, false);
      slot.lineTo(cx - halfSlotW + slotR, halfSlotH);
      slot.absarc(cx - halfSlotW + slotR, halfSlotH - slotR, slotR, Math.PI / 2, Math.PI, false);
      slot.lineTo(cx - halfSlotW, -halfSlotH + slotR);
      slot.absarc(cx - halfSlotW + slotR, -halfSlotH + slotR, slotR, Math.PI, (3 * Math.PI) / 2, false);
      slot.closePath();
      return slot;
    };

    shape.holes.push(makeSlotHole(-slotX));
    shape.holes.push(makeSlotHole(slotX));
    return shape;
  }

  // --- Hanging Charm Formats ---
  const holeR = options.holeDiameterMm / 2;
  const holeY = halfH - holeR - 2.5;

  switch (options.charmShape) {
    case 'bone': {
      // Iconic 4-lobe dog bone contour with integrated top eyelet lug
      const lobeR = h * 0.35;
      const neckW = w * 0.45;
      const neckH = h * 0.58;
      const lx = halfW - lobeR;
      const ly = halfH - lobeR;
      const lugR = holeR + 2.2;

      const dy = neckH / 2 - holeY;
      let dx = lugR;
      let theta1 = Math.PI;
      let theta2 = 0;
      if (Math.abs(dy) < lugR) {
        dx = Math.sqrt(lugR * lugR - dy * dy);
        theta1 = Math.atan2(dy, -dx);
        theta2 = Math.atan2(dy, dx);
      }

      shape.moveTo(-neckW / 2, neckH / 2);
      shape.lineTo(-dx, neckH / 2);
      shape.absarc(0, holeY, lugR, theta1, theta2, true);
      shape.lineTo(neckW / 2, neckH / 2);

      shape.lineTo(lx - lobeR, neckH / 2);
      // Top-right lobe
      shape.absarc(lx, ly, lobeR, Math.PI * 0.75, -Math.PI * 0.1, true);
      // Bottom-right lobe
      shape.absarc(lx, -ly, lobeR, Math.PI * 0.1, -Math.PI * 0.75, true);
      shape.lineTo(neckW / 2, -neckH / 2);
      shape.lineTo(-neckW / 2, -neckH / 2);
      // Bottom-left lobe
      shape.absarc(-lx, -ly, lobeR, -Math.PI * 0.25, -Math.PI * 1.1, true);
      // Top-left lobe
      shape.absarc(-lx, ly, lobeR, -Math.PI * 0.9, Math.PI * 0.25, true);
      shape.closePath();
      break;
    }
    case 'circle': {
      const r = Math.min(halfW, halfH);
      shape.absarc(0, 0, r, 0, Math.PI * 2, false);
      break;
    }
    case 'heart': {
      const s = Math.min(halfW, halfH) * 0.9;
      const lugR = holeR + 2.2;

      shape.moveTo(0, -s);
      shape.bezierCurveTo(-s, -s * 0.7, -s, -s * 0.35, -s, s * 0.25);
      shape.bezierCurveTo(-s, s * 0.9, -lugR, s * 0.9, -lugR, holeY);
      shape.absarc(0, holeY, lugR, Math.PI, 0, true);
      shape.bezierCurveTo(lugR, s * 0.9, s, s * 0.9, s, s * 0.25);
      shape.bezierCurveTo(s, -s * 0.35, 0, -s * 0.7, 0, -s);
      shape.closePath();
      break;
    }
    case 'shield': {
      const r = 4.0;
      shape.moveTo(-halfW + r, halfH);
      shape.lineTo(halfW - r, halfH);
      shape.absarc(halfW - r, halfH - r, r, Math.PI / 2, 0, true);
      shape.lineTo(halfW, 0);
      shape.bezierCurveTo(halfW, -halfH * 0.6, 0, -halfH * 0.9, 0, -halfH);
      shape.bezierCurveTo(0, -halfH * 0.9, -halfW, -halfH * 0.6, -halfW, 0);
      shape.lineTo(-halfW, halfH - r);
      shape.absarc(-halfW + r, halfH - r, r, Math.PI, Math.PI / 2, true);
      shape.closePath();
      break;
    }
    case 'hexagon': {
      const r = Math.min(halfW, halfH);
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
      break;
    }
  }

  // Add split-ring hanging hole near top edge
  const holePath = new THREE.Path();
  holePath.absarc(0, holeY, holeR, 0, Math.PI * 2, true);
  shape.holes.push(holePath);

  return shape;
}

// -------------------------------------------------------------
// 6. Complete 3D Pet Tag Procedural Mesh Generation
// -------------------------------------------------------------
export interface PetTagMeshResult {
  baseGeometry: THREE.BufferGeometry;
  textGeometry: THREE.BufferGeometry;
  iconGeometry: THREE.BufferGeometry;
  metrics: PetTagMetrics;
}

export function generatePetTagMesh(options: PetIdTagGeneratorOptions): PetTagMeshResult {
  const shape = buildTagShape(options);
  const thickness = options.tagThicknessMm;
  const raise = options.raisedTextHeightMm;

  // Extrude base plate
  let baseGeometry: THREE.BufferGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
  });

  // Apply collar curvature if enabled
  if (options.tagFormat === 'collar_slide_on' && options.curvedBand) {
    const pos = baseGeometry.getAttribute('position');
    if (pos) {
      const radius = 35.0; // 35mm radius curve conforming to dog's neck
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const curveOffset = (1 - Math.cos(x / radius)) * 6.0;
        pos.setZ(i, z + curveOffset);
      }
      baseGeometry.computeVertexNormals();
    }
  }

  // Text Lettering & Emergency Icon Placement
  const h = options.tagHeightMm;
  const isCharm = options.tagFormat === 'hanging_charm';
  const holeR = options.holeDiameterMm / 2;
  const holeY = (h / 2) - holeR - 2.5;
  const holeBottomY = isCharm ? (holeY - holeR) : (h / 2);

  const isDualSided = !!options.dualSided;
  const isBone = isCharm && options.charmShape === 'bone';
  const neckHalfH = isBone ? (h * 0.58) / 2 : (h / 2);

  // Emergency Icon Geometry
  const iconSize = isBone ? Math.max(3.0, Math.min(4.2, h * 0.17)) : Math.max(3.5, Math.min(6.5, h * 0.22));
  let iconY = 0;
  if (options.emergencyIcon !== 'none') {
    if (isBone) {
      iconY = holeBottomY - (iconSize / 2) - 0.5;
    } else if (isCharm) {
      iconY = holeBottomY - (iconSize / 2) - 1.2;
    } else {
      iconY = h * 0.28;
    }
  }
  const iconGeom = buildEmergencyIconGeometry(options.emergencyIcon, iconSize, raise, { x: 0, y: iconY });
  let iconGeometry = iconGeom ? iconGeom : new THREE.BufferGeometry();

  const frontGeometries: THREE.BufferGeometry[] = [];
  const backGeometries: THREE.BufferGeometry[] = [];

  if (isDualSided) {
    // Front face: Pet Name + Emergency Icon
    const nameHeight = isBone ? Math.min(4.8, h * 0.20) : Math.max(4.0, Math.min(8.0, h * 0.28));
    const nameStroke = Math.max(0.5, nameHeight * 0.16);
    const nameY = options.emergencyIcon !== 'none'
      ? (isBone ? -1.0 : iconY - (iconSize / 2) - (nameHeight / 2) - 1.0)
      : 0;
    const nameGeom = renderTextGeometry(options.petName, nameHeight, raise, nameStroke, nameY);
    if (nameGeom) frontGeometries.push(nameGeom);

    // Back face: Primary Phone + Secondary Phone
    const hasSec = !!options.secondaryPhone;
    if (options.primaryPhone) {
      const phoneHeight = Math.max(3.0, Math.min(5.0, h * 0.18));
      const phoneStroke = Math.max(0.45, phoneHeight * 0.15);
      const phoneY = hasSec ? (isBone ? 2.0 : 3.0) : 0;
      const phoneGeom = renderTextGeometry(options.primaryPhone, phoneHeight, raise, phoneStroke, phoneY);
      if (phoneGeom) backGeometries.push(phoneGeom);
    }
    if (options.secondaryPhone) {
      const secHeight = Math.max(2.4, Math.min(4.2, h * 0.15));
      const secStroke = Math.max(0.4, secHeight * 0.15);
      const secY = isBone ? -2.0 : -3.0;
      const secGeom = renderTextGeometry(options.secondaryPhone, secHeight, raise, secStroke, secY);
      if (secGeom) backGeometries.push(secGeom);
    }
  } else {
    // Single-sided: all text on front face
    if (isBone) {
      // Clamped layout to strictly fit within bone waist [-neckHalfH + 0.8, neckHalfH - 0.8]
      const hasIcon = options.emergencyIcon !== 'none';
      const hasPhone = !!options.primaryPhone;
      const hasSec = !!options.secondaryPhone;

      if (hasIcon) {
        if (hasSec) {
          const nameH = 3.2;
          const nameY = 0.5;
          const nameGeom = renderTextGeometry(options.petName, nameH, raise, nameH * 0.16, nameY);
          if (nameGeom) frontGeometries.push(nameGeom);

          if (hasPhone) {
            const phoneH = 2.4;
            const phoneY = -2.0;
            const phoneGeom = renderTextGeometry(options.primaryPhone, phoneH, raise, phoneH * 0.15, phoneY);
            if (phoneGeom) frontGeometries.push(phoneGeom);
          }

          const secH = 2.0;
          const secY = -4.3;
          const secGeom = renderTextGeometry(options.secondaryPhone, secH, raise, secH * 0.15, secY);
          if (secGeom) frontGeometries.push(secGeom);
        } else if (hasPhone) {
          const nameH = 4.0;
          const nameY = 0.4;
          const nameGeom = renderTextGeometry(options.petName, nameH, raise, nameH * 0.16, nameY);
          if (nameGeom) frontGeometries.push(nameGeom);

          const phoneH = 2.8;
          const phoneY = -2.5;
          const phoneGeom = renderTextGeometry(options.primaryPhone, phoneH, raise, phoneH * 0.15, phoneY);
          if (phoneGeom) frontGeometries.push(phoneGeom);
        } else {
          const nameH = 4.8;
          const nameY = -0.6;
          const nameGeom = renderTextGeometry(options.petName, nameH, raise, nameH * 0.16, nameY);
          if (nameGeom) frontGeometries.push(nameGeom);
        }
      } else {
        if (hasSec) {
          const nameH = 3.6;
          const nameY = 2.8;
          const nameGeom = renderTextGeometry(options.petName, nameH, raise, nameH * 0.16, nameY);
          if (nameGeom) frontGeometries.push(nameGeom);

          if (hasPhone) {
            const phoneH = 2.6;
            const phoneY = 0.2;
            const phoneGeom = renderTextGeometry(options.primaryPhone, phoneH, raise, phoneH * 0.15, phoneY);
            if (phoneGeom) frontGeometries.push(phoneGeom);
          }

          const secH = 2.2;
          const secY = -2.6;
          const secGeom = renderTextGeometry(options.secondaryPhone, secH, raise, secH * 0.15, secY);
          if (secGeom) frontGeometries.push(secGeom);
        } else if (hasPhone) {
          const nameH = 4.5;
          const nameY = 1.8;
          const nameGeom = renderTextGeometry(options.petName, nameH, raise, nameH * 0.16, nameY);
          if (nameGeom) frontGeometries.push(nameGeom);

          const phoneH = 3.2;
          const phoneY = -1.8;
          const phoneGeom = renderTextGeometry(options.primaryPhone, phoneH, raise, phoneH * 0.15, phoneY);
          if (phoneGeom) frontGeometries.push(phoneGeom);
        } else {
          const nameH = 5.5;
          const nameY = 0;
          const nameGeom = renderTextGeometry(options.petName, nameH, raise, nameH * 0.16, nameY);
          if (nameGeom) frontGeometries.push(nameGeom);
        }
      }
    } else {
      // Standard charm / slide-on layout
      const nameHeight = Math.max(4.0, Math.min(8.0, h * 0.28));
      const nameStroke = Math.max(0.6, nameHeight * 0.16);
      const nameY = options.emergencyIcon !== 'none' ? h * 0.08 : h * 0.12;
      const nameGeom = renderTextGeometry(options.petName, nameHeight, raise, nameStroke, nameY);
      if (nameGeom) frontGeometries.push(nameGeom);

      if (options.primaryPhone) {
        const phoneHeight = Math.max(3.0, Math.min(5.5, h * 0.18));
        const phoneStroke = Math.max(0.5, phoneHeight * 0.15);
        const phoneY = options.secondaryPhone ? -h * 0.14 : -h * 0.22;
        const phoneGeom = renderTextGeometry(options.primaryPhone, phoneHeight, raise, phoneStroke, phoneY);
        if (phoneGeom) frontGeometries.push(phoneGeom);
      }

      if (options.secondaryPhone) {
        const secHeight = Math.max(2.4, Math.min(4.5, h * 0.14));
        const secStroke = Math.max(0.45, secHeight * 0.15);
        const secY = -h * 0.32;
        const secGeom = renderTextGeometry(options.secondaryPhone, secHeight, raise, secStroke, secY);
        if (secGeom) frontGeometries.push(secGeom);
      }
    }
  }

  // Front text: placed on top face (z = thickness)
  let frontText = safeMergeGeometries(frontGeometries);
  frontGeometries.forEach((g) => g.dispose());
  if (frontText.getAttribute('position')) {
    frontText.translate(0, 0, thickness);
  }

  // Back text: mirrored in X, placed on back face (z <= 0)
  let backText = safeMergeGeometries(backGeometries);
  backGeometries.forEach((g) => g.dispose());
  if (backText.getAttribute('position')) {
    backText.scale(-1, 1, 1);
    backText.translate(0, 0, -raise);
  }

  const allMergedText: THREE.BufferGeometry[] = [];
  if (frontText.getAttribute('position')) allMergedText.push(frontText);
  if (backText.getAttribute('position')) allMergedText.push(backText);

  let textGeometry = safeMergeGeometries(allMergedText);
  frontText.dispose();
  backText.dispose();

  // Apply curve to text if curvedBand is enabled
  if (options.tagFormat === 'collar_slide_on' && options.curvedBand) {
    const pos = textGeometry.getAttribute('position');
    if (pos) {
      const radius = 35.0;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const curveOffset = (1 - Math.cos(x / radius)) * 6.0;
        pos.setZ(i, z + curveOffset);
      }
      textGeometry.computeVertexNormals();
    }
  }

  if (iconGeom) {
    iconGeometry.translate(0, 0, thickness);
    if (options.tagFormat === 'collar_slide_on' && options.curvedBand) {
      const pos = iconGeometry.getAttribute('position');
      if (pos) {
        const radius = 35.0;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const z = pos.getZ(i);
          const curveOffset = (1 - Math.cos(x / radius)) * 6.0;
          pos.setZ(i, z + curveOffset);
        }
        iconGeometry.computeVertexNormals();
      }
    }
  }

  // Calculate Metrics
  const basePos = baseGeometry.getAttribute('position');
  const baseTriangles = basePos ? Math.round(basePos.count / 3) : 0;

  const textPos = textGeometry.getAttribute('position');
  const textTriangles = textPos ? Math.round(textPos.count / 3) : 0;

  const iconPos = iconGeometry.getAttribute('position');
  const iconTriangles = iconPos ? Math.round(iconPos.count / 3) : 0;

  const totalTriangles = baseTriangles + textTriangles + iconTriangles;

  // Mass estimation (PETG/PLA ~1.25 g/cm3)
  const approxVolCm3 = (options.tagWidthMm * options.tagHeightMm * options.tagThicknessMm * 0.001) * 0.7;
  const estimatedGrams = Math.max(1.5, Math.round(approxVolCm3 * 1.25 * 10) / 10);
  const estimatedPrintTimeHours = Math.max(0.2, Math.round((estimatedGrams / 12 + 0.1) * 10) / 10);

  const petSafetyTips = [
    'Material Recommendation: Print in PETG or Tough PLA for impact resistance and weather endurance against rain and mud.',
    'Silent Slide-On Advantage: Collar slide-on tags eliminate noisy metal jingle and prevent catching on crates, branches, or carpet loops.',
    'Multi-Color 3MF: Contrast is key for readability—use bright white, neon yellow, or glow-in-the-dark filament for Object 2 (Text).',
    'Split Ring Strength: When using hanging charms, attach via a heavy-duty stainless steel dual-loop split ring.',
  ];

  return {
    baseGeometry,
    textGeometry,
    iconGeometry,
    metrics: {
      widthMm: options.tagWidthMm,
      heightMm: options.tagHeightMm,
      thicknessMm: options.tagThicknessMm,
      baseTriangles,
      textTriangles,
      iconTriangles,
      totalTriangles,
      estimatedGrams,
      estimatedPrintTimeHours,
      petSafetyTips,
    },
  };
}

// -------------------------------------------------------------
// 7. Binary STL & Multi-Color 3MF Serialization
// -------------------------------------------------------------
export function exportPetTagSTL(
  baseGeom: THREE.BufferGeometry,
  textGeom: THREE.BufferGeometry,
  iconGeom: THREE.BufferGeometry
): ArrayBuffer {
  const parts: THREE.BufferGeometry[] = [baseGeom];
  if (textGeom.getAttribute('position')) parts.push(textGeom);
  if (iconGeom.getAttribute('position')) parts.push(iconGeom);

  const unified = safeMergeGeometries(parts);
  const pos = unified.getAttribute('position');
  const triCount = pos ? Math.floor(pos.count / 3) : 0;

  const bufferSize = 84 + triCount * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const dv = new DataView(buffer);

  // 80-byte header
  const headerStr = 'PrivKnife Pet ID Tag Generator (Binary STL)';
  for (let i = 0; i < headerStr.length && i < 80; i++) {
    dv.setUint8(i, headerStr.charCodeAt(i));
  }

  // 4-byte triangle count
  dv.setUint32(80, triCount, true);

  let offset = 84;
  const p1 = new THREE.Vector3();
  const p2 = new THREE.Vector3();
  const p3 = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let i = 0; i < triCount; i++) {
    const idx = i * 3;
    p1.fromBufferAttribute(pos, idx);
    p2.fromBufferAttribute(pos, idx + 1);
    p3.fromBufferAttribute(pos, idx + 2);

    // Compute face normal
    p2.clone().sub(p1).cross(p3.clone().sub(p1)).normalize();
    normal.copy(p2).sub(p1).cross(p3.sub(p1)).normalize();

    // Normal
    dv.setFloat32(offset, normal.x, true);
    dv.setFloat32(offset + 4, normal.y, true);
    dv.setFloat32(offset + 8, normal.z, true);

    // Vertex 1
    dv.setFloat32(offset + 12, p1.x, true);
    dv.setFloat32(offset + 16, p1.y, true);
    dv.setFloat32(offset + 20, p1.z, true);

    // Vertex 2
    dv.setFloat32(offset + 24, p2.x, true);
    dv.setFloat32(offset + 28, p2.y, true);
    dv.setFloat32(offset + 32, p2.z, true);

    // Vertex 3
    dv.setFloat32(offset + 36, p3.x, true);
    dv.setFloat32(offset + 40, p3.y, true);
    dv.setFloat32(offset + 44, p3.z, true);

    // 2-byte attribute byte count
    dv.setUint16(offset + 48, 0, true);
    offset += 50;
  }

  unified.dispose();
  return buffer;
}

export async function exportPetTag3MF(
  baseGeom: THREE.BufferGeometry,
  textGeom: THREE.BufferGeometry,
  iconGeom: THREE.BufferGeometry,
  options: PetIdTagGeneratorOptions
): Promise<Blob> {
  function serializeMeshXml(geom: THREE.BufferGeometry, id: number, name: string): string {
    const nonIndexed = geom.index ? geom.toNonIndexed() : geom;
    const pos = nonIndexed.getAttribute('position');
    const vCount = pos ? pos.count : 0;
    const tCount = Math.floor(vCount / 3);

    let vXml = '';
    for (let i = 0; i < vCount; i++) {
      vXml += `        <vertex x="${pos.getX(i).toFixed(3)}" y="${pos.getY(i).toFixed(3)}" z="${pos.getZ(i).toFixed(3)}" />\n`;
    }

    let tXml = '';
    for (let i = 0; i < tCount; i++) {
      const idx = i * 3;
      tXml += `        <triangle v1="${idx}" v2="${idx + 1}" v3="${idx + 2}" />\n`;
    }

    if (geom.index) nonIndexed.dispose();

    return `    <object id="${id}" name="${name}" type="model">
      <mesh>
        <vertices>
${vXml}        </vertices>
        <triangles>
${tXml}        </triangles>
      </mesh>
    </object>\n`;
  }

  let objectsXml = '';
  let buildItemsXml = '';

  // Object 1: Base Plate
  objectsXml += serializeMeshXml(baseGeom, 1, 'Base Plate');
  buildItemsXml += `    <item objectid="1" />\n`;

  // Object 2: Text Lettering
  if (textGeom.getAttribute('position') && textGeom.getAttribute('position').count > 0) {
    objectsXml += serializeMeshXml(textGeom, 2, `Text Lettering (${options.petName})`);
    buildItemsXml += `    <item objectid="2" />\n`;
  }

  // Object 3: Emergency Icon
  if (iconGeom.getAttribute('position') && iconGeom.getAttribute('position').count > 0) {
    objectsXml += serializeMeshXml(iconGeom, 3, `Emergency Icon (${options.emergencyIcon})`);
    buildItemsXml += `    <item objectid="3" />\n`;
  }

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">Pet ID Tag - PrivKnife</metadata>
  <metadata name="Designer">PrivKnife Client-Side Studio</metadata>
  <resources>
${objectsXml}  </resources>
  <build>
${buildItemsXml}  </build>
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

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'model/3mf',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

// -------------------------------------------------------------
// 8. End-to-End Pipeline
// -------------------------------------------------------------
export async function processPetTag(
  options: PetIdTagGeneratorOptions,
  format: TagExportFormat = '3mf_multicolor'
): Promise<PetIdTagGeneratorResult> {
  const validation = validatePetTagOptions(options);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid options');
  }

  const { baseGeometry, textGeometry, iconGeometry, metrics } = generatePetTagMesh(options);
  const nameSlug = options.petName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const formatSlug = options.tagFormat === 'collar_slide_on' ? 'collar-slide' : options.charmShape;
  const fileNameBase = `pet-tag-${formatSlug}-${nameSlug}`;

  try {
    if (format === '3mf_multicolor') {
      const blob = await exportPetTag3MF(baseGeometry, textGeometry, iconGeometry, options);
      return {
        success: true,
        blob,
        fileName: `${fileNameBase}.3mf`,
        fileSize: blob.size,
        mimeType: 'model/3mf',
        metrics,
      };
    } else {
      const buffer = exportPetTagSTL(baseGeometry, textGeometry, iconGeometry);
      const blob = new Blob([buffer], { type: 'model/stl' });
      return {
        success: true,
        blob,
        fileName: `${fileNameBase}.stl`,
        fileSize: blob.size,
        mimeType: 'model/stl',
        metrics,
      };
    }
  } finally {
    baseGeometry.dispose();
    textGeometry.dispose();
    iconGeometry.dispose();
  }
}
