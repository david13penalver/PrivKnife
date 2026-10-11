import jsPDF from 'jspdf';
import {
  ContrastMatrixCell,
  ExtractedColor,
  HslColor,
  RgbColor,
  WcagCompliance,
} from './types';

/**
 * Converts a hex string (#ffffff or ffffff or #fff) to an RgbColor.
 */
export function hexToRgb(hex: string): RgbColor {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Converts R, G, B components to a 6-character hex string (#rrggbb).
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const hex = (
    (1 << 24) +
    (clamp(r) << 16) +
    (clamp(g) << 8) +
    clamp(b)
  )
    .toString(16)
    .slice(1);
  return `#${hex.toLowerCase()}`;
}

/**
 * Converts RGB to HSL.
 */
export function rgbToHsl(r: number, g: number, b: number): HslColor {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Computes W3C relative luminance from sRGB components.
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 */
export function calculateRelativeLuminance(rgb: RgbColor): number {
  const transform = (val: number): number => {
    const s = val / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const rLin = transform(rgb.r);
  const gLin = transform(rgb.g);
  const bLin = transform(rgb.b);

  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/**
 * Calculates W3C WCAG 2.1 contrast ratio between two colors: (L1 + 0.05) / (L2 + 0.05).
 */
export function calculateContrastRatio(
  colorA: ExtractedColor,
  colorB: ExtractedColor
): number {
  const l1 = Math.max(colorA.luminance, colorB.luminance);
  const l2 = Math.min(colorA.luminance, colorB.luminance);
  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * Evaluates WCAG 2.1 compliance levels for a pair of colors.
 */
export function evaluateWcagCompliance(
  colorA: ExtractedColor,
  colorB: ExtractedColor
): WcagCompliance {
  const ratio = Math.round(calculateContrastRatio(colorA, colorB) * 100) / 100;

  return {
    ratio,
    passAaNormal: ratio >= 4.5,
    passAaLarge: ratio >= 3.0,
    passAaaNormal: ratio >= 7.0,
    passAaaLarge: ratio >= 4.5,
    passUi: ratio >= 3.0,
  };
}

/**
 * Builds an N x N contrast matrix cross-evaluating each color pair.
 */
export function buildContrastMatrix(
  palette: ExtractedColor[]
): ContrastMatrixCell[][] {
  const matrix: ContrastMatrixCell[][] = [];

  for (let i = 0; i < palette.length; i++) {
    const row: ContrastMatrixCell[] = [];
    for (let j = 0; j < palette.length; j++) {
      const foreground = palette[i];
      const background = palette[j];
      const compliance = evaluateWcagCompliance(foreground, background);
      row.push({ foreground, background, compliance });
    }
    matrix.push(row);
  }

  return matrix;
}

/**
 * Creates a complete ExtractedColor object from a hex string.
 */
export function createExtractedColor(
  hex: string,
  name?: string
): ExtractedColor {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const luminance = calculateRelativeLuminance(rgb);
  const id = `col-${Math.random().toString(36).substring(2, 9)}`;

  return {
    id,
    hex: rgbToHex(rgb.r, rgb.g, rgb.b),
    rgb,
    hsl,
    luminance,
    name: name || getColorNameFallback(hsl),
  };
}

function getColorNameFallback(hsl: HslColor): string {
  if (hsl.l < 12) return 'Near Black';
  if (hsl.l > 92) return 'Near White';
  if (hsl.s < 10) return 'Neutral Grey';

  const h = hsl.h;
  if (h >= 345 || h < 15) return 'Crimson Red';
  if (h >= 15 && h < 45) return 'Sunset Orange';
  if (h >= 45 && h < 70) return 'Amber Gold';
  if (h >= 70 && h < 160) return 'Forest Green';
  if (h >= 160 && h < 200) return 'Teal Cyan';
  if (h >= 200 && h < 260) return 'Royal Blue';
  if (h >= 260 && h < 315) return 'Deep Purple';
  return 'Rose Magenta';
}

/**
 * Quantizes image data into dominant colors using the Median Cut algorithm.
 */
export function extractPaletteFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  count = 6
): ExtractedColor[] {
  interface Pixel {
    r: number;
    g: number;
    b: number;
  }

  const pixels: Pixel[] = [];
  const totalPixels = width * height;
  const step = Math.max(1, Math.floor(totalPixels / 15000)); // Sample up to 15,000 pixels

  for (let i = 0; i < data.length; i += 4 * step) {
    const a = data[i + 3];
    if (a < 128) continue; // Ignore transparent pixels
    pixels.push({
      r: data[i],
      g: data[i + 1],
      b: data[i + 2],
    });
  }

  if (pixels.length === 0) {
    return [createExtractedColor('#0f172a', 'Dark Slate'), createExtractedColor('#ffffff', 'White')];
  }

  interface ColorBox {
    pixels: Pixel[];
  }

  const boxes: ColorBox[] = [{ pixels }];

  while (boxes.length < count) {
    // Find box with largest channel range
    let bestBoxIndex = -1;
    let maxRange = -1;

    for (let b = 0; b < boxes.length; b++) {
      const box = boxes[b];
      if (box.pixels.length <= 1) continue;

      let minR = 255, maxR = 0;
      let minG = 255, maxG = 0;
      let minB = 255, maxB = 0;

      for (const p of box.pixels) {
        if (p.r < minR) minR = p.r;
        if (p.r > maxR) maxR = p.r;
        if (p.g < minG) minG = p.g;
        if (p.g > maxG) maxG = p.g;
        if (p.b < minB) minB = p.b;
        if (p.b > maxB) maxB = p.b;
      }

      const range = Math.max(maxR - minR, maxG - minG, maxB - minB);
      if (range > maxRange) {
        maxRange = range;
        bestBoxIndex = b;
      }
    }

    if (bestBoxIndex === -1 || maxRange <= 0) break;

    const boxToSplit = boxes.splice(bestBoxIndex, 1)[0];
    let minR = 255, maxR = 0;
    let minG = 255, maxG = 0;
    let minB = 255, maxB = 0;

    for (const p of boxToSplit.pixels) {
      if (p.r < minR) minR = p.r;
      if (p.r > maxR) maxR = p.r;
      if (p.g < minG) minG = p.g;
      if (p.g > maxG) maxG = p.g;
      if (p.b < minB) minB = p.b;
      if (p.b > maxB) maxB = p.b;
    }

    const rRange = maxR - minR;
    const gRange = maxG - minG;
    const bRange = maxB - minB;

    let sortChannel: 'r' | 'g' | 'b' = 'r';
    if (gRange >= rRange && gRange >= bRange) sortChannel = 'g';
    else if (bRange >= rRange && bRange >= gRange) sortChannel = 'b';

    boxToSplit.pixels.sort((a, b) => a[sortChannel] - b[sortChannel]);

    const mid = Math.floor(boxToSplit.pixels.length / 2);
    boxes.push({ pixels: boxToSplit.pixels.slice(0, mid) });
    boxes.push({ pixels: boxToSplit.pixels.slice(mid) });
  }

  const results: ExtractedColor[] = [];
  for (const box of boxes) {
    if (box.pixels.length === 0) continue;
    let sumR = 0, sumG = 0, sumB = 0;
    for (const p of box.pixels) {
      sumR += p.r;
      sumG += p.g;
      sumB += p.b;
    }
    const countP = box.pixels.length;
    const avgR = Math.round(sumR / countP);
    const avgG = Math.round(sumG / countP);
    const avgB = Math.round(sumB / countP);
    results.push(createExtractedColor(rgbToHex(avgR, avgG, avgB)));
  }

  // Sort by luminance (dark to light)
  results.sort((a, b) => a.luminance - b.luminance);

  return results.slice(0, count);
}

/**
 * Encodes extracted palette into an Adobe Swatch Exchange (.ase) binary buffer.
 */
export function encodeAseBinary(
  palette: ExtractedColor[],
  paletteName = 'PrivKnife Palette'
): Uint8Array {
  // Precompute buffer size:
  // Header: 4 ('ASEF') + 4 (version 1.0) + 4 (block count) = 12 bytes
  // For each color block:
  // 2 (type 0x0001) + 4 (block length) + 2 (name length in chars+1) + (name.length + 1)*2 + 4 ('RGB ') + 12 (3 floats) + 2 (type)
  const parts: Uint8Array[] = [];

  // Header: 'ASEF', Version 1.0, count
  const headerBuf = new ArrayBuffer(12);
  const headerView = new DataView(headerBuf);
  headerView.setUint8(0, 0x41); // 'A'
  headerView.setUint8(1, 0x53); // 'S'
  headerView.setUint8(2, 0x45); // 'E'
  headerView.setUint8(3, 0x46); // 'F'
  headerView.setUint16(4, 1, false); // Major version 1
  headerView.setUint16(6, 0, false); // Minor version 0
  headerView.setUint32(8, palette.length, false); // Total color blocks
  parts.push(new Uint8Array(headerBuf));

  for (let i = 0; i < palette.length; i++) {
    const col = palette[i];
    const nameStr = col.name || col.hex;
    const nameLen = nameStr.length + 1; // Includes null terminator

    // Block length = 2 (nameLen) + nameLen * 2 + 4 ('RGB ') + 12 (floats) + 2 (colorType)
    const blockDataLen = 2 + nameLen * 2 + 4 + 12 + 2;

    const blockBuf = new ArrayBuffer(2 + 4 + blockDataLen);
    const blockView = new DataView(blockBuf);
    let offset = 0;

    // Block Type: 0x0001 (Color Entry)
    blockView.setUint16(offset, 0x0001, false);
    offset += 2;

    // Block Length
    blockView.setUint32(offset, blockDataLen, false);
    offset += 4;

    // Name length (in UTF-16 code units)
    blockView.setUint16(offset, nameLen, false);
    offset += 2;

    // Name in UTF-16BE
    for (let c = 0; c < nameStr.length; c++) {
      blockView.setUint16(offset, nameStr.charCodeAt(c), false);
      offset += 2;
    }
    blockView.setUint16(offset, 0, false); // Null terminator
    offset += 2;

    // Color Model: 'RGB ' (0x52, 0x47, 0x42, 0x20)
    blockView.setUint8(offset + 0, 0x52);
    blockView.setUint8(offset + 1, 0x47);
    blockView.setUint8(offset + 2, 0x42);
    blockView.setUint8(offset + 3, 0x20);
    offset += 4;

    // 3 x Float32 (R, G, B normalized 0..1)
    blockView.setFloat32(offset, col.rgb.r / 255, false);
    offset += 4;
    blockView.setFloat32(offset, col.rgb.g / 255, false);
    offset += 4;
    blockView.setFloat32(offset, col.rgb.b / 255, false);
    offset += 4;

    // Color type: 0x0000 = Global, 0x0002 = Normal
    blockView.setUint16(offset, 0x0000, false);
    offset += 2;

    parts.push(new Uint8Array(blockBuf));
  }

  let totalLen = 0;
  for (const p of parts) totalLen += p.length;
  const merged = new Uint8Array(totalLen);
  let cur = 0;
  for (const p of parts) {
    merged.set(p, cur);
    cur += p.length;
  }

  return merged;
}

/**
 * Generates JSON design tokens from extracted palette.
 */
export function generateJsonTokens(palette: ExtractedColor[]): string {
  const tokens = palette.map((col, idx) => ({
    token: `color-${idx + 1}`,
    name: col.name,
    hex: col.hex,
    rgb: col.rgb,
    hsl: col.hsl,
    luminance: Math.round(col.luminance * 1000) / 1000,
  }));

  return JSON.stringify({ generator: 'PrivKnife', tokens }, null, 2);
}

/**
 * Generates CSS custom properties string.
 */
export function generateCssVariables(palette: ExtractedColor[]): string {
  const vars = palette
    .map((col, idx) => `  --color-${idx + 1}: ${col.hex}; /* ${col.name || ''} */`)
    .join('\n');

  return `:root {\n${vars}\n}`;
}

/**
 * Generates a formatted PDF WCAG Compliance Audit Report using jsPDF.
 */
export async function generateWcagPdfReport(
  palette: ExtractedColor[],
  matrix: ContrastMatrixCell[][]
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('WCAG 2.1 Color Accessibility Audit Report', 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Generated 100% In-Browser by PrivKnife', pageWidth - 14, 18, { align: 'right' });

  // Palette Overview Section
  let y = 38;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Extracted Color Palette', 14, y);

  y += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  for (let i = 0; i < palette.length; i++) {
    const col = palette[i];
    // Swatch box
    doc.setFillColor(col.rgb.r, col.rgb.g, col.rgb.b);
    doc.rect(14, y - 4, 12, 6, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(14, y - 4, 12, 6, 'S');

    doc.setTextColor(15, 23, 42);
    doc.text(`${col.name || 'Color ' + (i + 1)}`, 30, y);
    doc.text(`${col.hex.toUpperCase()}`, 75, y);
    doc.text(`RGB(${col.rgb.r}, ${col.rgb.g}, ${col.rgb.b})`, 105, y);
    doc.text(`Lum: ${col.luminance.toFixed(3)}`, 160, y);
    y += 8;
  }

  // Section 2: Contrast Matrix Overview
  y += 8;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('2. WCAG 2.1 Contrast Ratio Matrix', 14, y);

  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Criteria: AA Normal Text (>=4.5:1), AA Large Text (>=3.0:1), AAA Normal Text (>=7.0:1)',
    14,
    y
  );

  y += 10;
  // Matrix Table Header
  const colW = Math.min(22, (pageWidth - 36) / (palette.length + 1));
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('FG \\ BG', 14, y);

  for (let j = 0; j < palette.length; j++) {
    doc.text(palette[j].hex.substring(0, 7), 36 + j * colW, y);
  }

  y += 4;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  // Matrix Rows
  doc.setFont('helvetica', 'normal');
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i];
    doc.setFont('helvetica', 'bold');
    doc.text(palette[i].hex.substring(0, 7), 14, y);
    doc.setFont('helvetica', 'normal');

    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      const r = cell.compliance.ratio;
      if (cell.compliance.passAaaNormal) {
        doc.setTextColor(16, 185, 129); // Green
      } else if (cell.compliance.passAaNormal) {
        doc.setTextColor(37, 99, 235); // Blue
      } else if (cell.compliance.passAaLarge) {
        doc.setTextColor(245, 158, 11); // Amber
      } else {
        doc.setTextColor(239, 68, 68); // Red
      }
      doc.text(`${r}:1`, 36 + j * colW, y);
    }
    y += 6;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  }

  // Footer notes
  y += 10;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text('Audit conducted completely client-side in browser without server data logging.', 14, y);

  return doc.output('blob');
}
