import QRCode from 'qrcode';
import jsQR from 'jsqr';
import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import JSZip from 'jszip';
import {
  PhysicalDimensions,
  QrErrorCorrectionLevel,
  QrMatrix,
  QrStandConfig,
  ScannabilityReport,
} from './types';

// Standard 5x7 ASCII bitmap font glyphs (rows from top to bottom, 5 bits each: bit 4 to bit 0)
const FONT_5X7: Record<string, number[]> = {
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  '!': [0x04, 0x04, 0x04, 0x04, 0x00, 0x00, 0x04],
  '"': [0x0a, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00],
  '#': [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  '$': [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  '%': [0x18, 0x19, 0x02, 0x04, 0x08, 0x13, 0x03],
  '&': [0x08, 0x14, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "'": [0x04, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '*': [0x00, 0x04, 0x15, 0x0e, 0x15, 0x04, 0x00],
  '+': [0x00, 0x04, 0x04, 0x1f, 0x04, 0x04, 0x00],
  ',': [0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x08],
  '-': [0x00, 0x00, 0x00, 0x1f, 0x00, 0x00, 0x00],
  '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04],
  '/': [0x01, 0x02, 0x04, 0x08, 0x10, 0x00, 0x00],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  '3': [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ':': [0x00, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00],
  ';': [0x00, 0x04, 0x00, 0x00, 0x04, 0x08, 0x00],
  '<': [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
  '=': [0x00, 0x1f, 0x00, 0x1f, 0x00, 0x00, 0x00],
  '>': [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
  '?': [0x0e, 0x11, 0x01, 0x02, 0x04, 0x00, 0x04],
  '@': [0x0e, 0x11, 0x17, 0x15, 0x17, 0x10, 0x0f],
  'A': [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  'B': [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  'C': [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  'D': [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  'E': [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  'F': [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  'G': [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  'H': [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  'I': [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  'J': [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  'K': [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  'L': [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  'M': [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  'N': [0x11, 0x11, 0x19, 0x15, 0x13, 0x11, 0x11],
  'O': [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  'P': [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  'Q': [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  'R': [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  'S': [0x0e, 0x11, 0x10, 0x0e, 0x01, 0x11, 0x0e],
  'T': [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  'U': [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  'V': [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  'W': [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
  'X': [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  'Y': [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  'Z': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '_': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f],
};

/**
 * Encodes text into a 2D boolean QR matrix using the qrcode library.
 */
export function generateQrMatrix(
  text: string,
  errorCorrection: QrErrorCorrectionLevel = 'M'
): QrMatrix {
  const cleanText = text.trim() || 'https://privknife.dev';
  const qr = QRCode.create(cleanText, { errorCorrectionLevel: errorCorrection });
  const size = qr.modules.size;
  const modules: boolean[][] = [];

  for (let y = 0; y < size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x++) {
      row.push(qr.modules.get(x, y) === 1);
    }
    modules.push(row);
  }

  return { size, modules };
}

/**
 * Calculates luminance for contrast ratio checking.
 */
export function getRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Simulates camera QR scanning via jsQR and computes diagnostic print metrics.
 */
export function checkScannability(
  text: string,
  matrix: QrMatrix,
  config: QrStandConfig
): ScannabilityReport {
  const size = matrix.size;
  const scale = 8;
  const quietZone = 4;
  const canvasSize = (size + quietZone * 2) * scale;
  const pixelData = new Uint8ClampedArray(canvasSize * canvasSize * 4);
  pixelData.fill(255); // White background

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matrix.modules[y][x]) {
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = (quietZone + x) * scale + dx;
            const py = (quietZone + y) * scale + dy;
            const idx = (py * canvasSize + px) * 4;
            pixelData[idx] = 0;
            pixelData[idx + 1] = 0;
            pixelData[idx + 2] = 0;
            pixelData[idx + 3] = 255;
          }
        }
      }
    }
  }

  const decoded = jsQR(pixelData, canvasSize, canvasSize);
  const isDecoded = decoded !== null && decoded.data.length > 0;
  const decodedData = decoded ? decoded.data : null;

  // Physical calculations
  const qrPhysicalMm = size * config.moduleSizeMm;
  const subtextExtraHeight = config.subtextEnabled && config.subtext.trim() ? 12 + config.marginMm : 0;
  const keychainExtraHeight = config.baseShape === 'keychain' ? 12 : 0;
  const totalWidthMm = Number((qrPhysicalMm + config.marginMm * 2).toFixed(1));
  const totalHeightMm = Number(
    (qrPhysicalMm + config.marginMm * 2 + subtextExtraHeight + keychainExtraHeight).toFixed(1)
  );
  const totalDepthMm = Number(
    (
      config.baseThicknessMm +
      config.qrReliefMm +
      (config.baseShape === 'desk-stand' ? 24 : 0)
    ).toFixed(1)
  );

  const notes: string[] = [];
  let score = 100;

  if (!isDecoded) {
    score -= 50;
    notes.push('⚠️ QR code pattern could not be recognized by decoder. Reduce content length or adjust error correction.');
  } else {
    notes.push('✅ QR code decodes accurately with standard camera decoders.');
  }

  if (config.moduleSizeMm < 1.6) {
    score -= 20;
    notes.push(`⚠️ Module size (${config.moduleSizeMm.toFixed(1)}mm) is below the 1.6mm recommended minimum for standard 0.4mm nozzles.`);
  } else {
    notes.push(`✅ Module size (${config.moduleSizeMm.toFixed(1)}mm) provides crisp extrusion paths for 0.4mm nozzles.`);
  }

  const contrast = getContrastRatio(config.baseColor, config.qrColor);
  if (contrast < 4.5) {
    score -= 25;
    notes.push(`⚠️ Color contrast ratio (${contrast.toFixed(1)}:1) is low. Use high-contrast filaments for reliable scanning.`);
  } else {
    notes.push(`✅ High contrast ratio (${contrast.toFixed(1)}:1) ensures fast optical recognition.`);
  }

  if (config.qrReliefMm < 0.6) {
    notes.push('ℹ️ Low relief height (<0.6mm). Recommend at least 3 layers (0.6mm–1.2mm) for color opacity.');
  }

  const filamentSwapLayer = Math.max(1, Math.round(config.baseThicknessMm / 0.2));

  return {
    isScannable: isDecoded && score >= 50,
    decodedData,
    moduleCount: size * size,
    physicalDimensions: {
      widthMm: totalWidthMm,
      heightMm: totalHeightMm,
      depthMm: totalDepthMm,
    },
    minimumFeatureMm: config.moduleSizeMm,
    qualityScore: Math.max(10, Math.min(100, score)),
    filamentSwapLayer,
    notes,
  };
}

/**
 * Appends a 3D box of half-extents (hx, hy, hz) centered at (cx, cy, cz)
 * into vertex and normal Float32Arrays and index Uint32Array.
 */
function appendBox(
  cx: number,
  cy: number,
  cz: number,
  hx: number,
  hy: number,
  hz: number,
  positions: Float32Array,
  normals: Float32Array,
  indices: Uint32Array,
  boxIndex: number
): void {
  const vOffset = boxIndex * 24;
  const pOffset = boxIndex * 24 * 3;
  const iOffset = boxIndex * 36;

  // 6 faces * 4 vertices = 24 vertices
  // Face 0: +Z (top)
  const v = [
    // +Z
    cx - hx, cy - hy, cz + hz, 0, 0, 1,
    cx + hx, cy - hy, cz + hz, 0, 0, 1,
    cx + hx, cy + hy, cz + hz, 0, 0, 1,
    cx - hx, cy + hy, cz + hz, 0, 0, 1,
    // -Z
    cx - hx, cy - hy, cz - hz, 0, 0, -1,
    cx - hx, cy + hy, cz - hz, 0, 0, -1,
    cx + hx, cy + hy, cz - hz, 0, 0, -1,
    cx + hx, cy - hy, cz - hz, 0, 0, -1,
    // +Y
    cx - hx, cy + hy, cz - hz, 0, 1, 0,
    cx - hx, cy + hy, cz + hz, 0, 1, 0,
    cx + hx, cy + hy, cz + hz, 0, 1, 0,
    cx + hx, cy + hy, cz - hz, 0, 1, 0,
    // -Y
    cx - hx, cy - hy, cz - hz, 0, -1, 0,
    cx + hx, cy - hy, cz - hz, 0, -1, 0,
    cx + hx, cy - hy, cz + hz, 0, -1, 0,
    cx - hx, cy - hy, cz + hz, 0, -1, 0,
    // +X
    cx + hx, cy - hy, cz - hz, 1, 0, 0,
    cx + hx, cy + hy, cz - hz, 1, 0, 0,
    cx + hx, cy + hy, cz + hz, 1, 0, 0,
    cx + hx, cy - hy, cz + hz, 1, 0, 0,
    // -X
    cx - hx, cy - hy, cz - hz, -1, 0, 0,
    cx - hx, cy - hy, cz + hz, -1, 0, 0,
    cx - hx, cy + hy, cz + hz, -1, 0, 0,
    cx - hx, cy + hy, cz - hz, -1, 0, 0,
  ];

  for (let i = 0; i < 24; i++) {
    const srcIdx = i * 6;
    const dstIdx = pOffset + i * 3;
    positions[dstIdx] = v[srcIdx];
    positions[dstIdx + 1] = v[srcIdx + 1];
    positions[dstIdx + 2] = v[srcIdx + 2];
    normals[dstIdx] = v[srcIdx + 3];
    normals[dstIdx + 1] = v[srcIdx + 4];
    normals[dstIdx + 2] = v[srcIdx + 5];
  }

  // 12 triangles (2 per face)
  const faceIndices = [
    0, 1, 2, 0, 2, 3, // +Z
    4, 5, 6, 4, 6, 7, // -Z
    8, 9, 10, 8, 10, 11, // +Y
    12, 13, 14, 12, 14, 15, // -Y
    16, 17, 18, 16, 18, 19, // +X
    20, 21, 22, 20, 22, 23, // -X
  ];

  for (let i = 0; i < 36; i++) {
    indices[iOffset + i] = vOffset + faceIndices[i];
  }
}

/**
 * Builds a watertight BufferGeometry representing all raised QR modules.
 * Merges contiguous horizontal runs into single extruded boxes for high performance.
 */
export function buildQrModulesGeometry(
  matrix: QrMatrix,
  config: QrStandConfig,
  originX: number,
  originY: number,
  originZ: number
): THREE.BufferGeometry {
  const size = matrix.size;
  const modSize = config.moduleSizeMm;
  const relief = config.qrReliefMm;

  // Step 1: Collect runs of dark modules
  interface BoxRun {
    cx: number;
    cy: number;
    cz: number;
    hx: number;
    hy: number;
    hz: number;
  }

  const runs: BoxRun[] = [];

  for (let y = 0; y < size; y++) {
    let runStart = -1;
    for (let x = 0; x < size; x++) {
      if (matrix.modules[y][x]) {
        if (runStart === -1) runStart = x;
      } else {
        if (runStart !== -1) {
          const runLength = x - runStart;
          const boxWidth = runLength * modSize;
          const boxHeight = modSize;
          const cx = originX + runStart * modSize + boxWidth / 2;
          const cy = originY + (size - 1 - y) * modSize + boxHeight / 2;
          const cz = originZ + relief / 2;
          runs.push({
            cx,
            cy,
            cz,
            hx: boxWidth / 2,
            hy: boxHeight / 2,
            hz: relief / 2,
          });
          runStart = -1;
        }
      }
    }
    if (runStart !== -1) {
      const runLength = size - runStart;
      const boxWidth = runLength * modSize;
      const boxHeight = modSize;
      const cx = originX + runStart * modSize + boxWidth / 2;
      const cy = originY + (size - 1 - y) * modSize + boxHeight / 2;
      const cz = originZ + relief / 2;
      runs.push({
        cx,
        cy,
        cz,
        hx: boxWidth / 2,
        hy: boxHeight / 2,
        hz: relief / 2,
      });
    }
  }

  const totalBoxes = runs.length;
  const positions = new Float32Array(totalBoxes * 24 * 3);
  const normals = new Float32Array(totalBoxes * 24 * 3);
  const indices = new Uint32Array(totalBoxes * 36);

  for (let i = 0; i < totalBoxes; i++) {
    const b = runs[i];
    appendBox(b.cx, b.cy, b.cz, b.hx, b.hy, b.hz, positions, normals, indices, i);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingBox();

  return geometry;
}

/**
 * Builds 3D extruded subtext using an offline 5x7 bitmap font.
 * Automatically fits text within target width and generates sharp 3D relief boxes.
 */
export function buildSubtextGeometry(
  subtext: string,
  config: QrStandConfig,
  targetWidthMm: number,
  originX: number,
  originY: number,
  originZ: number
): THREE.BufferGeometry | null {
  if (!config.subtextEnabled || !subtext.trim()) return null;

  const text = subtext.trim().toUpperCase();
  const glyphWidth = 5;
  const glyphHeight = 7;
  const glyphSpacing = 1;
  const totalCols = text.length * (glyphWidth + glyphSpacing) - glyphSpacing;

  // Fit into target width (max height ~8mm)
  const maxPixelMmByWidth = (targetWidthMm * 0.9) / totalCols;
  const pixelMm = Math.min(1.1, Math.max(0.4, maxPixelMmByWidth));
  const renderedWidth = totalCols * pixelMm;
  const renderedHeight = glyphHeight * pixelMm;
  const startX = originX + (targetWidthMm - renderedWidth) / 2;
  const relief = config.qrReliefMm;

  interface TextRun {
    cx: number;
    cy: number;
    cz: number;
    hx: number;
    hy: number;
    hz: number;
  }

  const textRuns: TextRun[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const bitmap = FONT_5X7[char] || FONT_5X7['?'] || FONT_5X7[' '];
    const charStartX = startX + i * (glyphWidth + glyphSpacing) * pixelMm;

    for (let row = 0; row < glyphHeight; row++) {
      const rowBits = bitmap[row];
      let runStart = -1;

      for (let col = 0; col < glyphWidth; col++) {
        const bit = (rowBits >> (glyphWidth - 1 - col)) & 1;
        if (bit === 1) {
          if (runStart === -1) runStart = col;
        } else {
          if (runStart !== -1) {
            const runLength = col - runStart;
            const w = runLength * pixelMm;
            const h = pixelMm;
            const cx = charStartX + runStart * pixelMm + w / 2;
            const cy = originY + (glyphHeight - 1 - row) * pixelMm + h / 2;
            const cz = originZ + relief / 2;
            textRuns.push({ cx, cy, cz, hx: w / 2, hy: h / 2, hz: relief / 2 });
            runStart = -1;
          }
        }
      }

      if (runStart !== -1) {
        const runLength = glyphWidth - runStart;
        const w = runLength * pixelMm;
        const h = pixelMm;
        const cx = charStartX + runStart * pixelMm + w / 2;
        const cy = originY + (glyphHeight - 1 - row) * pixelMm + h / 2;
        const cz = originZ + relief / 2;
        textRuns.push({ cx, cy, cz, hx: w / 2, hy: h / 2, hz: relief / 2 });
      }
    }
  }

  if (textRuns.length === 0) return null;

  const totalBoxes = textRuns.length;
  const positions = new Float32Array(totalBoxes * 24 * 3);
  const normals = new Float32Array(totalBoxes * 24 * 3);
  const indices = new Uint32Array(totalBoxes * 36);

  for (let i = 0; i < totalBoxes; i++) {
    const b = textRuns[i];
    appendBox(b.cx, b.cy, b.cz, b.hx, b.hy, b.hz, positions, normals, indices, i);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingBox();

  return geometry;
}

/**
 * Creates a rounded rectangular 2D shape with optional top keychain tab hole.
 */
function createBaseShape(
  width: number,
  height: number,
  radius: number,
  baseShape: string,
  holeDiameter: number
): THREE.Shape {
  const shape = new THREE.Shape();
  const r = Math.min(radius, Math.min(width, height) / 4);

  if (baseShape === 'keychain') {
    // Plaque with rounded top tab
    const tabRadius = 9;
    const tabCenterX = width / 2;
    const tabCenterY = height;

    shape.moveTo(r, 0);
    shape.lineTo(width - r, 0);
    shape.absarc(width - r, r, r, -Math.PI / 2, 0, false);
    shape.lineTo(width, height - r);
    shape.absarc(width - r, height - r, r, 0, Math.PI / 2, false);

    // Tab shoulder to tab arc
    shape.lineTo(tabCenterX + tabRadius, height);
    shape.absarc(tabCenterX, tabCenterY, tabRadius, 0, Math.PI, false);
    shape.lineTo(r, height);

    shape.absarc(r, height - r, r, Math.PI / 2, Math.PI, false);
    shape.lineTo(0, r);
    shape.absarc(r, r, r, Math.PI, Math.PI * 1.5, false);

    // Punch hole through tab
    const holeRadius = Math.max(1.5, holeDiameter / 2);
    const holePath = new THREE.Path();
    holePath.absarc(tabCenterX, tabCenterY, holeRadius, 0, Math.PI * 2, true);
    shape.holes.push(holePath);
  } else {
    // Clean rounded rectangle
    shape.moveTo(r, 0);
    shape.lineTo(width - r, 0);
    shape.absarc(width - r, r, r, -Math.PI / 2, 0, false);
    shape.lineTo(width, height - r);
    shape.absarc(width - r, height - r, r, 0, Math.PI / 2, false);
    shape.lineTo(r, height);
    shape.absarc(r, height - r, r, Math.PI / 2, Math.PI, false);
    shape.lineTo(0, r);
    shape.absarc(r, r, r, Math.PI, Math.PI * 1.5, false);
  }

  return shape;
}

/**
 * Merges two BufferGeometries into a single BufferGeometry.
 */
export function mergeBufferGeometries(
  geometries: THREE.BufferGeometry[]
): THREE.BufferGeometry {
  const valid = geometries.filter((g) => g && g.attributes['position']);
  if (valid.length === 0) return new THREE.BufferGeometry();
  if (valid.length === 1) return valid[0].clone();

  let totalVertices = 0;
  let totalIndices = 0;

  for (const g of valid) {
    const pos = g.attributes['position'];
    totalVertices += pos.count;
    if (g.index) {
      totalIndices += g.index.count;
    } else {
      totalIndices += pos.count;
    }
  }

  const mergedPos = new Float32Array(totalVertices * 3);
  const mergedNorm = new Float32Array(totalVertices * 3);
  const mergedIdx = new Uint32Array(totalIndices);

  let vertexOffset = 0;
  let indexOffset = 0;

  for (const g of valid) {
    const pos = g.attributes['position'];
    const norm = g.attributes['normal'];
    const idx = g.index;
    const count = pos.count;

    for (let i = 0; i < count * 3; i++) {
      mergedPos[vertexOffset * 3 + i] = pos.array[i];
      if (norm) {
        mergedNorm[vertexOffset * 3 + i] = norm.array[i];
      }
    }

    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        mergedIdx[indexOffset + i] = vertexOffset + idx.array[i];
      }
      indexOffset += idx.count;
    } else {
      for (let i = 0; i < count; i++) {
        mergedIdx[indexOffset + i] = vertexOffset + i;
      }
      indexOffset += count;
    }

    vertexOffset += count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
  merged.setIndex(new THREE.BufferAttribute(mergedIdx, 1));
  merged.computeBoundingBox();
  return merged;
}

/**
 * Builds the base geometry (plaque, keychain, or desk stand with kickstand).
 */
export function buildBasePlateGeometry(
  matrix: QrMatrix,
  config: QrStandConfig
): {
  baseGeometry: THREE.BufferGeometry;
  qrLayout: {
    qrOriginX: number;
    qrOriginY: number;
    totalWidth: number;
    totalHeight: number;
    subtextOriginY: number;
  };
} {
  const qrSizeMm = matrix.size * config.moduleSizeMm;
  const margin = config.marginMm;
  const totalWidth = qrSizeMm + margin * 2;
  const subtextHeight = config.subtextEnabled && config.subtext.trim() ? 10 + margin : 0;
  const plaqueHeight = qrSizeMm + margin * 2 + subtextHeight;
  const thickness = config.baseThicknessMm;

  const shape = createBaseShape(
    totalWidth,
    plaqueHeight,
    config.cornerRadiusMm,
    config.baseShape,
    config.keychainHoleDiameterMm
  );

  const plaqueGeom = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
  });

  let finalBaseGeom: THREE.BufferGeometry = plaqueGeom;

  // For Desk Stand: Attach an angled triangular rear kickstand
  if (config.baseShape === 'desk-stand') {
    const angleRad = (config.standAngleDeg * Math.PI) / 180;
    const kickstandDepth = Math.max(16, Math.min(36, plaqueHeight * Math.cos(angleRad) * 1.5));
    const kickstandWidth = Math.max(12, totalWidth * 0.4);
    const kickstandHeight = plaqueHeight * 0.55;
    const kickstandThickness = 4.0;

    // Build triangular prism support leg
    const kickstandShape = new THREE.Shape();
    kickstandShape.moveTo(0, 0);
    kickstandShape.lineTo(0, kickstandHeight);
    kickstandShape.lineTo(-kickstandDepth, 0);
    kickstandShape.closePath();

    const legGeom = new THREE.ExtrudeGeometry(kickstandShape, {
      depth: kickstandThickness,
      bevelEnabled: false,
    });

    // Position leg on the back of the plaque (z = 0)
    legGeom.rotateY(-Math.PI / 2);
    legGeom.translate(
      (totalWidth - kickstandThickness) / 2,
      plaqueHeight * 0.1,
      0
    );

    finalBaseGeom = mergeBufferGeometries([plaqueGeom, legGeom]);
  }

  finalBaseGeom.computeBoundingBox();

  const qrOriginX = margin;
  const qrOriginY = margin + subtextHeight;
  const subtextOriginY = margin;

  return {
    baseGeometry: finalBaseGeom,
    qrLayout: {
      qrOriginX,
      qrOriginY,
      totalWidth,
      totalHeight: plaqueHeight,
      subtextOriginY,
    },
  };
}

/**
 * Builds the complete 3D scene model containing base plate and foreground QR/text components.
 */
export function buildQrModel(
  matrix: QrMatrix,
  config: QrStandConfig
): {
  baseGeometry: THREE.BufferGeometry;
  qrGeometry: THREE.BufferGeometry;
  combinedMesh: THREE.Group;
  scannability: ScannabilityReport;
} {
  const { baseGeometry, qrLayout } = buildBasePlateGeometry(matrix, config);

  const qrModulesGeom = buildQrModulesGeometry(
    matrix,
    config,
    qrLayout.qrOriginX,
    qrLayout.qrOriginY,
    config.baseThicknessMm
  );

  let fullQrGeom = qrModulesGeom;

  if (config.subtextEnabled && config.subtext.trim()) {
    const textGeom = buildSubtextGeometry(
      config.subtext,
      config,
      qrLayout.totalWidth,
      0,
      qrLayout.subtextOriginY,
      config.baseThicknessMm
    );
    if (textGeom) {
      fullQrGeom = mergeBufferGeometries([qrModulesGeom, textGeom]);
    }
  }

  // Create materials and meshes
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: config.baseColor,
    roughness: 0.35,
    metalness: 0.05,
  });

  const qrMaterial = new THREE.MeshStandardMaterial({
    color: config.qrColor,
    roughness: 0.25,
    metalness: 0.1,
  });

  const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
  const qrMesh = new THREE.Mesh(fullQrGeom, qrMaterial);

  const group = new THREE.Group();
  group.add(baseMesh);
  group.add(qrMesh);

  // Center group for clean viewport viewing
  baseGeometry.computeBoundingBox();
  const bb = baseGeometry.boundingBox!;
  const centerX = (bb.max.x + bb.min.x) / 2;
  const centerY = (bb.max.y + bb.min.y) / 2;
  const centerZ = (bb.max.z + bb.min.z) / 2;
  group.position.set(-centerX, -centerY, -centerZ);

  const scannability = checkScannability(config.text, matrix, config);

  return {
    baseGeometry,
    qrGeometry: fullQrGeom,
    combinedMesh: group,
    scannability,
  };
}

/**
 * Generates an OPC .3mf archive containing dual-material discrete components.
 * Fully compatible with Bambu Studio, OrcaSlicer, PrusaSlicer, and Creality Print.
 */
export async function generate3mf(
  baseGeometry: THREE.BufferGeometry,
  qrGeometry: THREE.BufferGeometry,
  config: QrStandConfig
): Promise<Blob> {
  const zip = new JSZip();

  // 1. [Content_Types].xml
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`
  );

  // 2. _rels/.rels
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`
  );

  // Helper to serialize geometry to 3MF mesh XML
  function meshTo3mfXml(geom: THREE.BufferGeometry): string {
    const pos = geom.attributes['position'];
    const idx = geom.index;
    const vLines: string[] = [];
    const tLines: string[] = [];

    for (let i = 0; i < pos.count; i++) {
      vLines.push(
        `        <vertex x="${pos.getX(i).toFixed(3)}" y="${pos.getY(i).toFixed(3)}" z="${pos.getZ(i).toFixed(3)}"/>`
      );
    }

    if (idx) {
      for (let i = 0; i < idx.count; i += 3) {
        tLines.push(
          `        <triangle v1="${idx.getX(i)}" v2="${idx.getX(i + 1)}" v3="${idx.getX(i + 2)}"/>`
        );
      }
    } else {
      for (let i = 0; i < pos.count; i += 3) {
        tLines.push(`        <triangle v1="${i}" v2="${i + 1}" v3="${i + 2}"/>`);
      }
    }

    return `      <mesh>
      <vertices>
${vLines.join('\n')}
      </vertices>
      <triangles>
${tLines.join('\n')}
      </triangles>
    </mesh>`;
  }

  const baseMeshXml = meshTo3mfXml(baseGeometry);
  const qrMeshXml = meshTo3mfXml(qrGeometry);

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
  <metadata name="Title">PrivKnife 3D QR Code Stand</metadata>
  <metadata name="Designer">PrivKnife Client-Side 3D Fabrication</metadata>
  <metadata name="Application">PrivKnife 100% In-Browser 3D Engine</metadata>
  <resources>
    <m:colorgroup id="1">
      <m:color color="${config.baseColor.toUpperCase()}"/>
      <m:color color="${config.qrColor.toUpperCase()}"/>
    </m:colorgroup>
    <object id="2" name="Base Plate" type="model" pid="1" pindex="0">
${baseMeshXml}
    </object>
    <object id="3" name="QR Code Details" type="model" pid="1" pindex="1">
${qrMeshXml}
    </object>
  </resources>
  <build>
    <item objectid="2"/>
    <item objectid="3"/>
  </build>
</model>`;

  zip.file('3D/3dmodel.model', modelXml);

  const uint8 = await zip.generateAsync({ type: 'uint8array' });
  return new Blob([uint8.buffer as ArrayBuffer], { type: 'model/3mf' });
}

/**
 * Serializes geometries to a single unified binary STL file.
 */
export function generateStl(
  baseGeometry: THREE.BufferGeometry,
  qrGeometry: THREE.BufferGeometry
): Blob {
  const merged = mergeBufferGeometries([baseGeometry, qrGeometry]);
  const mesh = new THREE.Mesh(merged);
  const exporter = new STLExporter();
  const stlData = exporter.parse(mesh, { binary: true });

  const buffer = stlData instanceof DataView ? stlData.buffer : (stlData as unknown as ArrayBuffer);
  return new Blob([buffer], { type: 'model/stl' });
}

/**
 * Packages all export deliverables (.3mf, .stl, individual components, print instructions) into a .zip.
 */
export async function generateExportBundleZip(
  baseGeometry: THREE.BufferGeometry,
  qrGeometry: THREE.BufferGeometry,
  config: QrStandConfig,
  previewPngBlob?: Blob
): Promise<Blob> {
  const zip = new JSZip();

  // Dual-color 3MF
  const threeMfBlob = await generate3mf(baseGeometry, qrGeometry, config);
  zip.file('qr_stand_dual_color.3mf', await threeMfBlob.arrayBuffer());

  // Unified STL
  const unifiedStlBlob = generateStl(baseGeometry, qrGeometry);
  zip.file('qr_stand_unified.stl', await unifiedStlBlob.arrayBuffer());

  // Individual STLs for split slicers
  const exporter = new STLExporter();
  const baseStl = exporter.parse(new THREE.Mesh(baseGeometry), { binary: true });
  zip.file('qr_stand_base.stl', baseStl instanceof DataView ? baseStl.buffer : (baseStl as unknown as ArrayBuffer));

  const qrStl = exporter.parse(new THREE.Mesh(qrGeometry), { binary: true });
  zip.file('qr_stand_qr_relief.stl', qrStl instanceof DataView ? qrStl.buffer : (qrStl as unknown as ArrayBuffer));

  if (previewPngBlob) {
    zip.file('preview.png', await previewPngBlob.arrayBuffer());
  }

  // Slicer guidelines
  const instructions = `=====================================================
PRIVKNIFE 3D QR STAND & KEYCHAIN - PRINTING GUIDE
=====================================================
100% In-Browser 3D Fabrication • Zero Data Leaves Your Device

Model Specifications:
- Base Dimensions: ${(config.marginMm * 2 + 21 * config.moduleSizeMm).toFixed(1)} mm wide
- Base Thickness: ${config.baseThicknessMm.toFixed(2)} mm
- QR Relief Height: ${config.qrReliefMm.toFixed(2)} mm
- Stand Style: ${config.baseShape}
- Error Correction Level: ${config.errorCorrection}

RECOMMENDED SLICING SETTINGS:
1. Multi-Color (Bambu Lab AMS / Prusa MMU):
   - Import "qr_stand_dual_color.3mf"
   - Assign Filament 1 to "Base Plate" (${config.baseColor})
   - Assign Filament 2 to "QR Code Details" (${config.qrColor})
   - Layer Height: 0.20 mm
   - First Layer Height: 0.20 mm
   - Top Surface Pattern: Monotonic Line

2. Single Extruder (Manual Color Swap at Height):
   - Import "qr_stand_unified.stl"
   - Set Layer Height: 0.20 mm
   - Add a PAUSE or M600 filament swap command at:
     Layer ${Math.round(config.baseThicknessMm / 0.2)} (Z = ${config.baseThicknessMm.toFixed(2)} mm)
   - Swap from base color to high-contrast foreground color.

Scan Reliability Tips:
- Use matte filaments (matte PLA / PETG) to avoid glare when scanned under direct light.
- Ensure minimum module size >= 1.6 mm for standard 0.4 mm nozzles.
=====================================================`;

  zip.file('README_3D_PRINTING.txt', instructions);

  const uint8 = await zip.generateAsync({ type: 'uint8array' });
  return new Blob([uint8.buffer as ArrayBuffer], { type: 'application/zip' });
}
