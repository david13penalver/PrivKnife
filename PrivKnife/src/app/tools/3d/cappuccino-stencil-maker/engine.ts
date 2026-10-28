import * as THREE from 'three';
import {
  CappuccinoStencilMakerOptions,
  CappuccinoStencilMakerResult,
  StencilExportFormat,
  StencilMetrics,
  StencilMotif,
} from './types';

// -------------------------------------------------------------
// 1. Validation
// -------------------------------------------------------------
export function validateStencilOptions(options: CappuccinoStencilMakerOptions): {
  valid: boolean;
  error?: string;
} {
  if (!options) {
    return { valid: false, error: 'Options are required' };
  }

  if (
    typeof options.stencilDiameterMm !== 'number' ||
    options.stencilDiameterMm < 60 ||
    options.stencilDiameterMm > 150
  ) {
    return { valid: false, error: 'Stencil diameter must be between 60 and 150 mm' };
  }

  if (
    typeof options.stencilThicknessMm !== 'number' ||
    options.stencilThicknessMm < 0.6 ||
    options.stencilThicknessMm > 4.0
  ) {
    return { valid: false, error: 'Stencil thickness must be between 0.6 and 4.0 mm' };
  }

  if (
    typeof options.handleLengthMm !== 'number' ||
    options.handleLengthMm < 10 ||
    options.handleLengthMm > 100
  ) {
    return { valid: false, error: 'Handle length must be between 10 and 100 mm' };
  }

  if (
    typeof options.bridgeWidthMm !== 'number' ||
    options.bridgeWidthMm < 0.8 ||
    options.bridgeWidthMm > 5.0
  ) {
    return { valid: false, error: 'Bridge width must be between 0.8 and 5.0 mm' };
  }

  if (options.motif === 'custom_text') {
    if (!options.customText || options.customText.trim().length === 0) {
      return { valid: false, error: 'Custom text is required when motif is custom_text' };
    }
    if (options.customText.length > 20) {
      return { valid: false, error: 'Custom text length cannot exceed 20 characters' };
    }
  }

  return { valid: true };
}

// -------------------------------------------------------------
// 2. Vector Typography for Custom Text Stencil
// -------------------------------------------------------------
const FONT_GLYPHS: Record<string, number[][][]> = {
  A: [[[0, 0], [0.5, 1]], [[0.5, 1], [1, 0]], [[0.2, 0.4], [0.8, 0.4]]],
  B: [[[0, 0], [0, 1]], [[0, 1], [0.7, 1]], [[0.7, 1], [0.7, 0.55]], [[0.7, 0.55], [0, 0.55]], [[0, 0.55], [0.8, 0.55]], [[0.8, 0.55], [0.8, 0]], [[0.8, 0], [0, 0]]],
  C: [[[1, 0.85], [0.3, 1]], [[0.3, 1], [0, 0.7]], [[0, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]], [[0.3, 0], [1, 0.15]]],
  D: [[[0, 0], [0, 1]], [[0, 1], [0.6, 1]], [[0.6, 1], [1, 0.7]], [[1, 0.7], [1, 0.3]], [[1, 0.3], [0.6, 0]], [[0.6, 0], [0, 0]]],
  E: [[[0, 0], [0, 1]], [[0, 1], [0.9, 1]], [[0, 0.5], [0.7, 0.5]], [[0, 0], [0.9, 0]]],
  F: [[[0, 0], [0, 1]], [[0, 1], [0.9, 1]], [[0, 0.5], [0.7, 0.5]]],
  G: [[[1, 0.85], [0.3, 1]], [[0.3, 1], [0, 0.7]], [[0, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]], [[0.3, 0], [0.9, 0]], [[0.9, 0], [0.9, 0.5]], [[0.9, 0.5], [0.5, 0.5]]],
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
  '5': [[[0.9, 1], [0.1, 1]], [[0.1, 1], [0.1, 0.55]], [[0.1, 0.55], [0.7, 0.55]], [[0.7, 0.55], [0.9, 0.3]], [[0.9, 0.3], [0.6, 0]]],
  '6': [[[0.8, 0.9], [0.3, 0.7]], [[0.3, 0.7], [0, 0.3]], [[0, 0.3], [0.3, 0]], [[0.3, 0], [0.7, 0]], [[0.7, 0], [0.9, 0.25]], [[0.9, 0.25], [0.7, 0.5]]],
  '7': [[[0, 1], [1, 1]], [[1, 1], [0.35, 0]]],
  '8': [[[0.3, 1], [0.7, 1]], [[0.7, 1], [0.9, 0.75]], [[0.9, 0.75], [0.5, 0.5]], [[0.5, 0.5], [0.9, 0.25]], [[0.9, 0.25], [0.7, 0]], [[0.7, 0], [0.3, 0]], [[0.3, 0], [0.1, 0.25]], [[0.1, 0.25], [0.5, 0.5]], [[0.5, 0.5], [0.1, 0.75]], [[0.1, 0.75], [0.3, 1]]],
  '9': [[[0.2, 0.1], [0.7, 0.3]], [[0.7, 0.3], [1, 0.7]], [[1, 0.7], [0.7, 1]], [[0.7, 1], [0.3, 1]], [[0.3, 1], [0.1, 0.75]], [[0.1, 0.75], [0.3, 0.5]], [[0.3, 0.5], [0.9, 0.5]]],
  '#': [[[0.3, 0], [0.3, 1]], [[0.7, 0], [0.7, 1]], [[0.1, 0.35], [0.9, 0.35]], [[0.1, 0.65], [0.9, 0.65]]],
};

// -------------------------------------------------------------
// 3. Stencil Outer Contour & Handle Generation
// -------------------------------------------------------------
function buildStencilOuterShape(options: CappuccinoStencilMakerOptions): {
  shape: THREE.Shape;
  totalLengthWithHandleMm: number;
} {
  const r = options.stencilDiameterMm / 2;
  const hType = options.handleType;
  const hLen = options.handleLengthMm;
  const hHole = options.handleHole;

  const shape = new THREE.Shape();

  if (hType === 'extended_rod') {
    // Disc with long rectangular wand handle extending towards +X
    const handleHalfW = 7.0; // 14mm width
    const handleTipX = r + hLen;

    shape.moveTo(0, r);
    shape.absarc(0, 0, r, Math.PI / 2, 0.15, true);
    // Transition to rod
    shape.lineTo(handleTipX - 6, handleHalfW);
    shape.absarc(handleTipX - 6, 0, handleHalfW, Math.PI / 2, -Math.PI / 2, true);
    shape.lineTo(r * Math.cos(-0.15), -handleHalfW);
    shape.absarc(0, 0, r, -0.15, Math.PI / 2, true);

    if (hHole) {
      const hole = new THREE.Path();
      hole.absarc(handleTipX - 10, 0, 3.0, 0, Math.PI * 2, false);
      shape.holes.push(hole);
    }

    return { shape, totalLengthWithHandleMm: r + handleTipX };
  } else if (hType === 'dual_ear') {
    // Symmetrical ears at left and right (+X and -X)
    const earW = 20.0;
    const earHalfH = 9.0;
    const earOuterX = r + 15.0;

    shape.moveTo(0, r);
    shape.absarc(0, 0, r, Math.PI / 2, 0.2, true);
    // Right ear
    shape.lineTo(earOuterX, earHalfH);
    shape.absarc(earOuterX - 5, 0, 5, Math.PI / 2, -Math.PI / 2, true);
    shape.lineTo(r * Math.cos(-0.2), -earHalfH);
    // Bottom arc to left
    shape.absarc(0, 0, r, -0.2, -Math.PI + 0.2, true);
    // Left ear
    shape.lineTo(-earOuterX, -earHalfH);
    shape.absarc(-earOuterX + 5, 0, 5, -Math.PI / 2, Math.PI / 2, true);
    shape.lineTo(-r * Math.cos(0.2), earHalfH);
    shape.absarc(0, 0, r, Math.PI - 0.2, Math.PI / 2, true);

    return { shape, totalLengthWithHandleMm: earOuterX * 2 };
  } else {
    // Default thumb tab extending towards +X
    const tabLen = Math.min(hLen, 35.0);
    const tabTipX = r + tabLen;
    const tabHalfH = 11.0;

    shape.moveTo(0, r);
    shape.absarc(0, 0, r, Math.PI / 2, 0.25, true);
    // Curved tab
    shape.lineTo(tabTipX - 8, tabHalfH);
    shape.absarc(tabTipX - 8, 0, tabHalfH, Math.PI / 2, -Math.PI / 2, true);
    shape.lineTo(r * Math.cos(-0.25), -tabHalfH);
    shape.absarc(0, 0, r, -0.25, Math.PI / 2, true);

    if (hHole) {
      const hole = new THREE.Path();
      hole.absarc(tabTipX - 10, 0, 3.0, 0, Math.PI * 2, false);
      shape.holes.push(hole);
    }

    return { shape, totalLengthWithHandleMm: r + tabTipX };
  }
}

// -------------------------------------------------------------
// 4. Stencil Cutout Motif Paths
// -------------------------------------------------------------
export interface MotifCutoutResult {
  holes: THREE.Path[];
  bridgeTabCount: number;
  approxCutoutAreaMm2: number;
}

export function buildMotifCutouts(options: CappuccinoStencilMakerOptions): MotifCutoutResult {
  const r = options.stencilDiameterMm / 2;
  const designRadius = r * 0.65; // Motif fits comfortably in center
  const holes: THREE.Path[] = [];
  let bridgeTabCount = 0;
  let approxCutoutAreaMm2 = 0;

  const m = options.motif;

  if (m === 'heart') {
    // Smooth parametric heart curve
    const heartPath = new THREE.Path();
    const pts: [number, number][] = [];
    const scale = designRadius / 16;
    for (let t = 0; t <= Math.PI * 2; t += 0.1) {
      const x = 16 * Math.pow(Math.sin(t), 3) * scale;
      const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * scale;
      pts.push([x, y]);
    }

    heartPath.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      heartPath.lineTo(pts[i][0], pts[i][1]);
    }
    heartPath.closePath();
    holes.push(heartPath);
    approxCutoutAreaMm2 = Math.PI * Math.pow(designRadius * 0.8, 2);
  } else if (m === 'coffee_bean') {
    // Left bean lobe
    const leftLobe = new THREE.Path();
    const s = designRadius;
    leftLobe.moveTo(-2, s * 0.85);
    leftLobe.absarc(-s * 0.35, 0, s * 0.5, Math.PI / 2, (3 * Math.PI) / 2, false);
    leftLobe.lineTo(-2, -s * 0.85);
    leftLobe.quadraticCurveTo(-s * 0.25, 0, -2, s * 0.85);
    leftLobe.closePath();
    holes.push(leftLobe);

    // Right bean lobe
    const rightLobe = new THREE.Path();
    rightLobe.moveTo(2, s * 0.85);
    rightLobe.absarc(s * 0.35, 0, s * 0.5, Math.PI / 2, -Math.PI / 2, true);
    rightLobe.lineTo(2, -s * 0.85);
    rightLobe.quadraticCurveTo(s * 0.25, 0, 2, s * 0.85);
    rightLobe.closePath();
    holes.push(rightLobe);

    approxCutoutAreaMm2 = Math.PI * Math.pow(designRadius * 0.7, 2);
  } else if (m === 'coffee_cup') {
    // Cup body
    const s = designRadius;
    const cupPath = new THREE.Path();
    cupPath.moveTo(-s * 0.6, s * 0.2);
    cupPath.lineTo(s * 0.6, s * 0.2);
    cupPath.quadraticCurveTo(s * 0.5, -s * 0.6, 0, -s * 0.6);
    cupPath.quadraticCurveTo(-s * 0.5, -s * 0.6, -s * 0.6, s * 0.2);
    cupPath.closePath();
    holes.push(cupPath);

    // Cup handle slit
    const handleSlit = new THREE.Path();
    handleSlit.absarc(s * 0.65, 0, s * 0.22, -Math.PI / 2, Math.PI / 2, false);
    handleSlit.lineTo(s * 0.65, s * 0.12);
    handleSlit.absarc(s * 0.65, 0, s * 0.12, Math.PI / 2, -Math.PI / 2, true);
    handleSlit.closePath();
    holes.push(handleSlit);

    // Steam curls
    for (const offset of [-s * 0.25, 0, s * 0.25]) {
      const steam = new THREE.Path();
      steam.moveTo(offset - 1.5, s * 0.35);
      steam.quadraticCurveTo(offset + 6, s * 0.55, offset, s * 0.75);
      steam.lineTo(offset + 3, s * 0.75);
      steam.quadraticCurveTo(offset + 9, s * 0.55, offset + 1.5, s * 0.35);
      steam.closePath();
      holes.push(steam);
    }
    approxCutoutAreaMm2 = s * s * 0.9;
  } else if (m === 'leaf_rosetta') {
    // Multiple symmetrical leaves branching off
    const s = designRadius;
    const leafCount = 5;
    for (let i = 0; i < leafCount; i++) {
      const t = i / (leafCount - 1);
      const ly = -s * 0.7 + t * s * 1.3;
      const lw = (1 - t * 0.3) * s * 0.35;

      const leafLeft = new THREE.Path();
      leafLeft.moveTo(-1.5, ly);
      leafLeft.quadraticCurveTo(-lw, ly + s * 0.1, -1.5, ly + s * 0.2);
      leafLeft.closePath();
      holes.push(leafLeft);

      const leafRight = new THREE.Path();
      leafRight.moveTo(1.5, ly);
      leafRight.quadraticCurveTo(lw, ly + s * 0.1, 1.5, ly + s * 0.2);
      leafRight.closePath();
      holes.push(leafRight);
    }
    approxCutoutAreaMm2 = s * s * 0.6;
  } else if (m === 'cat_paw') {
    // Large center palm pad
    const s = designRadius;
    const pad = new THREE.Path();
    pad.moveTo(-s * 0.35, -s * 0.15);
    pad.quadraticCurveTo(-s * 0.45, -s * 0.55, 0, -s * 0.55);
    pad.quadraticCurveTo(s * 0.45, -s * 0.55, s * 0.35, -s * 0.15);
    pad.quadraticCurveTo(0, -s * 0.3, -s * 0.35, -s * 0.15);
    pad.closePath();
    holes.push(pad);

    // 4 toe pads
    const toes: [number, number, number][] = [
      [-s * 0.38, s * 0.15, s * 0.12],
      [-s * 0.14, s * 0.35, s * 0.13],
      [s * 0.14, s * 0.35, s * 0.13],
      [s * 0.38, s * 0.15, s * 0.12],
    ];
    for (const [tx, ty, tr] of toes) {
      const toe = new THREE.Path();
      toe.absarc(tx, ty, tr, 0, Math.PI * 2, false);
      holes.push(toe);
    }
    approxCutoutAreaMm2 = s * s * 0.75;
  } else if (m === 'star_burst') {
    // 8-pointed star burst
    const s = designRadius;
    const star = new THREE.Path();
    const points = 8;
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const rad = i % 2 === 0 ? s * 0.85 : s * 0.35;
      const x = Math.cos(angle) * rad;
      const y = Math.sin(angle) * rad;
      if (i === 0) star.moveTo(x, y);
      else star.lineTo(x, y);
    }
    star.closePath();
    holes.push(star);
    approxCutoutAreaMm2 = Math.PI * Math.pow(s * 0.5, 2);
  } else {
    // Custom Text Stencil with Bridge Support Tabs
    const text = (options.customText || 'COFFEE').toUpperCase().trim();
    const s = designRadius;
    const charHeight = Math.min(24, (s * 1.6) / (text.length > 5 ? 2 : 1));
    const charWidth = charHeight * 0.65;
    const spacing = charWidth * 0.25;
    const strokeWidth = Math.max(options.bridgeWidthMm, charHeight * 0.2);

    const totalW = text.length * charWidth + (text.length - 1) * spacing;
    let startX = -Math.min(totalW, s * 1.6) / 2;
    const startY = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === ' ') {
        startX += charWidth + spacing;
        continue;
      }

      // Check if letter has an internal island that needs bridging (A, B, D, O, P, Q, R, 0, 4, 6, 8, 9)
      const hasIsland = 'ABDOPQR04689'.includes(char);
      if (hasIsland && options.autoBridgeIslands) {
        bridgeTabCount += 1;
      }

      const glyph = FONT_GLYPHS[char] || FONT_GLYPHS['#'];
      if (glyph) {
        for (const stroke of glyph) {
          const [p1, p2] = stroke;
          let x1 = startX + p1[0] * charWidth;
          let y1 = startY + p1[1] * charHeight - charHeight / 2;
          let x2 = startX + p2[0] * charWidth;
          let y2 = startY + p2[1] * charHeight - charHeight / 2;

          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len < 0.001) continue;

          // If letter has an island and bridging is enabled, shorten the stroke at both ends by half of bridgeWidth
          // so adjacent strokes do not close off the island
          let effectiveLen = len;
          if (hasIsland && options.autoBridgeIslands) {
            const bridgeGap = Math.min(len * 0.4, options.bridgeWidthMm / 2);
            if (len <= bridgeGap * 2 + 0.05) continue;
            const ux = dx / len;
            const uy = dy / len;
            x1 += ux * bridgeGap;
            y1 += uy * bridgeGap;
            x2 -= ux * bridgeGap;
            y2 -= uy * bridgeGap;
            effectiveLen = len - bridgeGap * 2;
          }

          // Create stroke slot polygon
          const angle = Math.atan2(dy, dx);
          const halfThick = strokeWidth / 2;

          const slot = new THREE.Path();
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const nx = -sin * halfThick;
          const ny = cos * halfThick;

          slot.moveTo(x1 + nx, y1 + ny);
          slot.lineTo(x2 + nx, y2 + ny);
          slot.lineTo(x2 - nx, y2 - ny);
          slot.lineTo(x1 - nx, y1 - ny);
          slot.closePath();
          holes.push(slot);

          approxCutoutAreaMm2 += effectiveLen * strokeWidth;
        }
      }

      startX += charWidth + spacing;
    }
  }

  return {
    holes,
    bridgeTabCount,
    approxCutoutAreaMm2: Math.round(approxCutoutAreaMm2),
  };
}

// -------------------------------------------------------------
// 5. 3D Stencil Procedural Mesh Generation
// -------------------------------------------------------------
export interface StencilMeshResult {
  stencilGeometry: THREE.BufferGeometry;
  metrics: StencilMetrics;
  svgContent: string;
}

export function generateStencilMesh(
  options: CappuccinoStencilMakerOptions
): StencilMeshResult {
  const { shape, totalLengthWithHandleMm } = buildStencilOuterShape(options);
  const { holes, bridgeTabCount, approxCutoutAreaMm2 } = buildMotifCutouts(options);

  // Add motif holes to outer stencil plate
  for (const h of holes) {
    shape.holes.push(h);
  }

  const depth = options.stencilThicknessMm;
  const bevelThickness = Math.min(0.2, depth * 0.15);
  const bevelSize = 0.2;
  const stencilGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: options.rimBevel ? Math.max(0.2, depth - bevelThickness * 2) : depth,
    bevelEnabled: !!options.rimBevel,
    bevelThickness: options.rimBevel ? bevelThickness : 0,
    bevelSize: options.rimBevel ? bevelSize : 0,
    bevelSegments: options.rimBevel ? 1 : 0,
    curveSegments: 48,
  });

  const pos = stencilGeometry.getAttribute('position');
  const totalTriangles = pos ? Math.round(pos.count / 3) : 0;

  // Mass calculation (Food-grade PETG / PLA ~1.25 g/cm3)
  const plateAreaCm2 = (Math.PI * Math.pow(options.stencilDiameterMm / 20, 2)) - (approxCutoutAreaMm2 * 0.01);
  const estimatedGrams = Math.max(5, Math.round(plateAreaCm2 * (depth * 0.1) * 1.25 * 10) / 10);
  const estimatedPrintTimeHours = Math.max(0.4, Math.round((estimatedGrams / 14 + 0.2) * 10) / 10);

  const foodSafetyTips = [
    'Food-Safe Filament: Use natural unpigmented PETG, certified food-grade PLA, or PP (Polypropylene).',
    'Nozzle Hygiene: Use a clean Stainless Steel nozzle to avoid lead leaching from standard brass nozzles.',
    'Sanitization: Wash in lukewarm soapy water. Do NOT use hot dishwasher cycles to prevent thermal warping.',
    'Layer Sealing: Dusting cocoa powder or cinnamon requires smooth top surfaces; enable ironed top layers in your slicer.',
  ];

  const svgContent = generateStencilSvg(options);

  return {
    stencilGeometry,
    metrics: {
      diameterMm: options.stencilDiameterMm,
      totalLengthWithHandleMm: Math.round(totalLengthWithHandleMm * 10) / 10,
      thicknessMm: depth,
      cutoutAreaMm2: approxCutoutAreaMm2,
      bridgeTabCount,
      totalTriangles,
      estimatedGrams,
      estimatedPrintTimeHours,
      foodSafetyTips,
    },
    svgContent,
  };
}

// -------------------------------------------------------------
// 6. Vector SVG Generation for Laser Cutting
// -------------------------------------------------------------
export function generateStencilSvg(options: CappuccinoStencilMakerOptions): string {
  const { shape, totalLengthWithHandleMm } = buildStencilOuterShape(options);
  const { holes } = buildMotifCutouts(options);

  const r = options.stencilDiameterMm / 2;
  const padding = 10;
  const totalW = totalLengthWithHandleMm + padding * 2;
  const totalH = options.stencilDiameterMm + padding * 2;

  function pathDataFromPoints(curves: THREE.Curve<THREE.Vector2>[]): string {
    if (!curves || curves.length === 0) return '';
    let d = '';
    let isFirst = true;
    for (let i = 0; i < curves.length; i++) {
      const c = curves[i];
      const isCurved = !(c instanceof THREE.LineCurve);
      const divisions = isCurved ? 32 : 1;
      const pts = c.getPoints(divisions);
      for (let j = 0; j < pts.length; j++) {
        if (!isFirst && j === 0) continue;
        const pt = pts[j];
        const sx = (pt.x + r + padding).toFixed(2);
        const sy = (-pt.y + r + padding).toFixed(2);
        if (isFirst) {
          d += `M ${sx} ${sy} `;
          isFirst = false;
        } else {
          d += `L ${sx} ${sy} `;
        }
      }
    }
    d += 'Z ';
    return d;
  }

  // Generate outer path
  let pathD = pathDataFromPoints(shape.curves);

  // Generate handle holes if present in outer shape
  for (const handleHole of shape.holes) {
    if (handleHole.curves.length > 0) {
      pathD += pathDataFromPoints(handleHole.curves);
    }
  }

  // Generate cutout holes paths
  for (const hole of holes) {
    if (hole.curves.length > 0) {
      pathD += pathDataFromPoints(hole.curves);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW.toFixed(1)} ${totalH.toFixed(1)}" width="${totalW.toFixed(1)}mm" height="${totalH.toFixed(1)}mm">
  <title>Cappuccino Stencil - ${options.motif}</title>
  <path d="${pathD}" fill="#1e293b" fill-rule="evenodd" stroke="#0ea5e9" stroke-width="0.3" />
</svg>`;
}

// -------------------------------------------------------------
// 7. Binary STL Serialization & Execution Pipeline
// -------------------------------------------------------------
export function exportStencilSTL(geometry: THREE.BufferGeometry): ArrayBuffer {
  const index = geometry.getIndex();
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');

  const triangleCount = index ? index.count / 3 : position.count / 3;
  const bufferSize = 84 + triangleCount * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const dataView = new DataView(buffer);

  const header = 'PrivKnife Client-Side Cappuccino Stencil & Airbrush Template Maker';
  for (let i = 0; i < 80; i++) {
    dataView.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }

  dataView.setUint32(80, triangleCount, true);

  let offset = 84;
  for (let i = 0; i < triangleCount; i++) {
    const idx0 = index ? index.getX(i * 3) : i * 3;
    const idx1 = index ? index.getX(i * 3 + 1) : i * 3 + 1;
    const idx2 = index ? index.getX(i * 3 + 2) : i * 3 + 2;

    const nX = normal ? normal.getX(idx0) : 0;
    const nY = normal ? normal.getY(idx0) : 0;
    const nZ = normal ? normal.getZ(idx0) : 0;

    dataView.setFloat32(offset, nX, true);
    dataView.setFloat32(offset + 4, nY, true);
    dataView.setFloat32(offset + 8, nZ, true);

    dataView.setFloat32(offset + 12, position.getX(idx0), true);
    dataView.setFloat32(offset + 16, position.getY(idx0), true);
    dataView.setFloat32(offset + 20, position.getZ(idx0), true);

    dataView.setFloat32(offset + 24, position.getX(idx1), true);
    dataView.setFloat32(offset + 28, position.getY(idx1), true);
    dataView.setFloat32(offset + 32, position.getZ(idx1), true);

    dataView.setFloat32(offset + 36, position.getX(idx2), true);
    dataView.setFloat32(offset + 40, position.getY(idx2), true);
    dataView.setFloat32(offset + 44, position.getZ(idx2), true);

    dataView.setUint16(offset + 48, 0, true);
    offset += 50;
  }

  return buffer;
}

export async function processStencil(
  options: CappuccinoStencilMakerOptions,
  format: StencilExportFormat = 'stl'
): Promise<CappuccinoStencilMakerResult> {
  const validation = validateStencilOptions(options);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid stencil configuration');
  }

  const { stencilGeometry, metrics, svgContent } = generateStencilMesh(options);
  const slug = `cappuccino-stencil-${options.motif}-${options.stencilDiameterMm}mm`;

  try {
    if (format === 'svg') {
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      return {
        success: true,
        blob,
        fileName: `${slug}.svg`,
        fileSize: blob.size,
        mimeType: 'image/svg+xml',
        metrics,
        svgContent,
      };
    } else {
      const stlBuffer = exportStencilSTL(stencilGeometry);
      const blob = new Blob([stlBuffer], { type: 'model/stl' });
      return {
        success: true,
        blob,
        fileName: `${slug}.stl`,
        fileSize: blob.size,
        mimeType: 'model/stl',
        metrics,
        svgContent,
      };
    }
  } finally {
    stencilGeometry.dispose();
  }
}
