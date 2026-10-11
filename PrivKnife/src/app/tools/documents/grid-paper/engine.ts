import { jsPDF } from 'jspdf';
import {
  GridGeometry,
  GridPaperOptions,
  GridPoint,
  LineSegment,
  PaperOrientation,
  PaperSize,
} from './types';

/**
 * Get exact paper dimensions in millimeters.
 */
export function getPaperDimensionsMm(
  size: PaperSize,
  orientation: PaperOrientation,
  custom?: { width: number; height: number }
): { width: number; height: number } {
  let w = 210;
  let h = 297;

  switch (size) {
    case 'a4':
      w = 210;
      h = 297;
      break;
    case 'letter':
      w = 215.9;
      h = 279.4;
      break;
    case 'legal':
      w = 215.9;
      h = 355.6;
      break;
    case 'a3':
      w = 297;
      h = 420;
      break;
    case 'a5':
      w = 148;
      h = 210;
      break;
    case 'custom':
      w = custom?.width || 210;
      h = custom?.height || 297;
      break;
  }

  if (orientation === 'landscape') {
    return {
      width: Math.max(w, h),
      height: Math.min(w, h),
    };
  }

  return {
    width: Math.min(w, h),
    height: Math.max(w, h),
  };
}

/**
 * Clip a line segment (x1, y1)-(x2, y2) to the bounding rectangle [minX, minY, maxX, maxY].
 * Using Cohen-Sutherland clipping algorithm.
 */
function clipLineToBounds(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): LineSegment | null {
  const INSIDE = 0; // 0000
  const LEFT = 1; // 0001
  const RIGHT = 2; // 0010
  const BOTTOM = 4; // 0100
  const TOP = 8; // 1000

  const computeOutCode = (x: number, y: number) => {
    let code = INSIDE;
    if (x < minX) code |= LEFT;
    else if (x > maxX) code |= RIGHT;
    if (y < minY) code |= TOP;
    else if (y > maxY) code |= BOTTOM;
    return code;
  };

  let outcode0 = computeOutCode(x1, y1);
  let outcode1 = computeOutCode(x2, y2);
  let accept = false;

  while (true) {
    if (!(outcode0 | outcode1)) {
      accept = true;
      break;
    } else if (outcode0 & outcode1) {
      break;
    } else {
      let x = 0;
      let y = 0;
      const outcodeOut = outcode0 ? outcode0 : outcode1;

      if (outcodeOut & BOTTOM) {
        x = x1 + ((x2 - x1) * (maxY - y1)) / (y2 - y1);
        y = maxY;
      } else if (outcodeOut & TOP) {
        x = x1 + ((x2 - x1) * (minY - y1)) / (y2 - y1);
        y = minY;
      } else if (outcodeOut & RIGHT) {
        y = y1 + ((y2 - y1) * (maxX - x1)) / (x2 - x1);
        x = maxX;
      } else if (outcodeOut & LEFT) {
        y = y1 + ((y2 - y1) * (minX - x1)) / (x2 - x1);
        x = minX;
      }

      if (outcodeOut === outcode0) {
        x1 = x;
        y1 = y;
        outcode0 = computeOutCode(x1, y1);
      } else {
        x2 = x;
        y2 = y;
        outcode1 = computeOutCode(x2, y2);
      }
    }
  }

  if (accept) {
    return { x1, y1, x2, y2 };
  }
  return null;
}

/**
 * Calculate vector grid coordinates strictly bounded by page margins.
 */
export function calculateGridGeometry(options: GridPaperOptions): GridGeometry {
  const { width: paperWidthMm, height: paperHeightMm } = getPaperDimensionsMm(
    options.paperSize,
    options.orientation,
    { width: options.customWidth, height: options.customHeight }
  );

  const marginLeft = Math.max(0, options.marginLeft);
  const marginRight = Math.max(0, options.marginRight);
  const marginTop = Math.max(0, options.marginTop);
  const marginBottom = Math.max(0, options.marginBottom);

  const printableX = marginLeft;
  const printableY = marginTop;
  const printableWidth = Math.max(0, paperWidthMm - marginLeft - marginRight);
  const printableHeight = Math.max(0, paperHeightMm - marginTop - marginBottom);

  const maxX = printableX + printableWidth;
  const maxY = printableY + printableHeight;

  const spacing = Math.max(1, options.spacing || 5);
  const dots: GridPoint[] = [];
  const lines: LineSegment[] = [];

  const style = options.gridStyle;

  if (style === 'dot') {
    // Generate dot grid
    for (let x = printableX; x <= maxX + 0.001; x += spacing) {
      for (let y = printableY; y <= maxY + 0.001; y += spacing) {
        dots.push({ x: Math.min(x, maxX), y: Math.min(y, maxY) });
      }
    }
  } else if (style === 'square') {
    // Vertical lines
    let col = 0;
    for (let x = printableX; x <= maxX + 0.001; x += spacing) {
      const isMajor =
        options.accentMajorLines && col % Math.max(1, options.majorInterval || 5) === 0;
      const actualX = Math.min(x, maxX);
      lines.push({
        x1: actualX,
        y1: printableY,
        x2: actualX,
        y2: maxY,
        isMajor,
      });
      col++;
    }

    // Horizontal lines
    let row = 0;
    for (let y = printableY; y <= maxY + 0.001; y += spacing) {
      const isMajor =
        options.accentMajorLines && row % Math.max(1, options.majorInterval || 5) === 0;
      const actualY = Math.min(y, maxY);
      lines.push({
        x1: printableX,
        y1: actualY,
        x2: maxX,
        y2: actualY,
        isMajor,
      });
      row++;
    }
  } else if (style === 'isometric') {
    // Triangular 60° isometric grid
    const dy = spacing * (Math.sqrt(3) / 2);

    // 1. Horizontal lines
    for (let y = printableY; y <= maxY + 0.001; y += dy) {
      const actualY = Math.min(y, maxY);
      lines.push({
        x1: printableX,
        y1: actualY,
        x2: maxX,
        y2: actualY,
      });
    }

    // 2. +60° and -60° diagonal lines
    const tan60 = Math.tan(Math.PI / 3); // sqrt(3) ~ 1.732
    const totalSpan = printableWidth + printableHeight * 2;

    for (let offset = -totalSpan; offset <= totalSpan; offset += spacing) {
      // Line: y - printableY = tan60 * (x - offset) => y = tan60 * (x - offset) + printableY
      // Let x from minX-10 to maxX+10, compute y, then clip
      const xA = printableX - 50;
      const yA = tan60 * (xA - (printableX + offset)) + printableY;
      const xB = maxX + 50;
      const yB = tan60 * (xB - (printableX + offset)) + printableY;

      const clipped1 = clipLineToBounds(xA, yA, xB, yB, printableX, printableY, maxX, maxY);
      if (clipped1) lines.push(clipped1);

      // -60° diagonal: y = -tan60 * (x - (printableX + offset)) + printableY
      const yC = -tan60 * (xA - (printableX + offset)) + printableY;
      const yD = -tan60 * (xB - (printableX + offset)) + printableY;
      const clipped2 = clipLineToBounds(xA, yC, xB, yD, printableX, printableY, maxX, maxY);
      if (clipped2) lines.push(clipped2);
    }
  } else if (style === 'hexagonal') {
    // Regular honeycomb hexagons
    // Radius of circumscribed circle: R = spacing / sqrt(3)
    const R = spacing / Math.sqrt(3);
    const colStep = 1.5 * R;
    const rowStep = spacing;

    let colIndex = 0;
    for (let cx = printableX; cx <= maxX + R; cx += colStep) {
      const yOffset = colIndex % 2 === 1 ? rowStep / 2 : 0;

      for (let cy = printableY + yOffset - rowStep; cy <= maxY + rowStep; cy += rowStep) {
        // Hexagon vertices around center (cx, cy)
        const vertices: GridPoint[] = [];
        for (let a = 0; a < 6; a++) {
          const angle = (Math.PI / 3) * a;
          vertices.push({
            x: cx + R * Math.cos(angle),
            y: cy + R * Math.sin(angle),
          });
        }

        // Draw 6 sides
        for (let i = 0; i < 6; i++) {
          // Avoid duplicate lines by only drawing top/right/bottom-right edges
          if (i === 0 || i === 1 || i === 2) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % 6];
            const clipped = clipLineToBounds(
              v1.x,
              v1.y,
              v2.x,
              v2.y,
              printableX,
              printableY,
              maxX,
              maxY
            );
            if (clipped) lines.push(clipped);
          }
        }
      }
      colIndex++;
    }
  } else if (style === 'ruled') {
    // Ruled / Lined paper
    for (let y = printableY; y <= maxY + 0.001; y += spacing) {
      const actualY = Math.min(y, maxY);
      lines.push({
        x1: printableX,
        y1: actualY,
        x2: maxX,
        y2: actualY,
      });
    }

    // Optional margin vertical line (e.g. pink or red left margin)
    if (options.marginLine) {
      lines.push({
        x1: printableX,
        y1: printableY,
        x2: printableX,
        y2: maxY,
        isMajor: true,
      });
    }
  }

  return {
    paperWidthMm,
    paperHeightMm,
    printableX,
    printableY,
    printableWidth,
    printableHeight,
    dots,
    lines,
  };
}

/**
 * Helper to convert hex color and opacity to an rgba string.
 */
function hexToRgba(hex: string, opacity: number): string {
  const sanitized = hex.replace('#', '');
  let r = 148;
  let g = 163;
  let b = 184;

  if (sanitized.length === 6) {
    r = parseInt(sanitized.substring(0, 2), 16);
    g = parseInt(sanitized.substring(2, 4), 16);
    b = parseInt(sanitized.substring(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0.05, Math.min(1, opacity))})`;
}

/**
 * Helper to convert hex to RGB numbers.
 */
function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.replace('#', '');
  if (sanitized.length === 6) {
    return [
      parseInt(sanitized.substring(0, 2), 16),
      parseInt(sanitized.substring(2, 4), 16),
      parseInt(sanitized.substring(4, 6), 16),
    ];
  }
  return [148, 163, 184];
}

/**
 * Generate full SVG string markup for live browser preview.
 */
export function generatePaperSvg(options: GridPaperOptions): string {
  const geometry = calculateGridGeometry(options);
  const color = options.strokeColor || '#94a3b8';
  const opacity = options.strokeOpacity ?? 0.75;
  const strokeRgba = hexToRgba(color, opacity);
  const strokeWidth = options.strokeWidth || 0.4;
  const majorStrokeWidth = options.majorStrokeWidth || 0.9;
  const dotRadius = options.dotRadius || 0.35;

  let elements = '';

  if (options.gridStyle === 'dot') {
    for (const dot of geometry.dots) {
      elements += `<circle cx="${dot.x.toFixed(2)}" cy="${dot.y.toFixed(2)}" r="${dotRadius}" fill="${strokeRgba}" />`;
    }
  } else {
    for (const line of geometry.lines) {
      const sw = line.isMajor ? majorStrokeWidth : strokeWidth;
      const stroke = line.isMajor && options.marginLine ? '#f43f5e' : strokeRgba;
      elements += `<line x1="${line.x1.toFixed(2)}" y1="${line.y1.toFixed(2)}" x2="${line.x2.toFixed(2)}" y2="${line.y2.toFixed(2)}" stroke="${stroke}" stroke-width="${sw}" />`;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${geometry.paperWidthMm} ${geometry.paperHeightMm}" width="100%" height="100%" style="background:#ffffff; display:block;">${elements}</svg>`;
}

/**
 * Generate precision vector PDF using jsPDF.
 */
export async function generatePaperPdf(
  options: GridPaperOptions
): Promise<{ blob: Blob; buffer: Uint8Array; dataUri: string }> {
  const geometry = calculateGridGeometry(options);
  const isLandscape = options.orientation === 'landscape';

  const pdf = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [geometry.paperWidthMm, geometry.paperHeightMm],
    compress: true,
  });

  const [r, g, b] = hexToRgb(options.strokeColor || '#94a3b8');
  const opacity = options.strokeOpacity ?? 0.75;
  const dotRadius = options.dotRadius || 0.35;
  const strokeWidthMm = (options.strokeWidth || 0.4) * 0.352778; // pt to mm
  const majorWidthMm = (options.majorStrokeWidth || 0.9) * 0.352778;

  // Set line cap and join for crisp rendering
  pdf.setLineCap('square');

  if (options.gridStyle === 'dot') {
    pdf.setFillColor(r, g, b);
    // Draw dots as small filled circles
    for (const dot of geometry.dots) {
      pdf.circle(dot.x, dot.y, dotRadius, 'F');
    }
  } else {
    pdf.setDrawColor(r, g, b);
    for (const line of geometry.lines) {
      if (line.isMajor && options.marginLine) {
        // Red margin line
        pdf.setDrawColor(244, 63, 94);
        pdf.setLineWidth(majorWidthMm);
      } else if (line.isMajor) {
        pdf.setDrawColor(r, g, b);
        pdf.setLineWidth(majorWidthMm);
      } else {
        pdf.setDrawColor(r, g, b);
        pdf.setLineWidth(strokeWidthMm);
      }
      pdf.line(line.x1, line.y1, line.x2, line.y2);
    }
  }

  const blob = pdf.output('blob');
  const buffer = new Uint8Array(pdf.output('arraybuffer'));
  const dataUri = pdf.output('datauristring');

  return { blob, buffer, dataUri };
}

/**
 * Create initial default options.
 */
export function createDefaultOptions(): GridPaperOptions {
  return {
    gridStyle: 'dot',
    paperSize: 'a4',
    customWidth: 210,
    customHeight: 297,
    orientation: 'portrait',
    spacing: 5,
    strokeColor: '#94a3b8',
    strokeOpacity: 0.75,
    strokeWidth: 0.5,
    dotRadius: 0.35,
    marginTop: 10,
    marginBottom: 10,
    marginLeft: 10,
    marginRight: 10,
    accentMajorLines: false,
    majorInterval: 5,
    majorStrokeWidth: 1.0,
    marginLine: false,
  };
}
