import { jsPDF } from 'jspdf';
import {
  ClearanceWarning,
  FloorPlanProject,
  FurnitureItem,
  MeasurementUnit,
  Point2D,
  Wall,
  Door,
  WindowOpening,
  Room,
} from './types';
import { DEFAULT_FLOOR_PLAN_OPTIONS, SAMPLE_STUDIO_PLAN } from './test-fixtures';

/**
 * Escapes XML/SVG special characters to prevent XSS / markup injection.
 */
export function escapeXml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Snaps a coordinate value to the nearest grid step.
 */
export function snapToGrid(val: number, step: number): number {
  if (!step || step <= 0) return Math.round(val);
  return Math.round(val / step) * step;
}

/**
 * Calculates Euclidean length of a wall in centimeters.
 */
export function calculateWallLength(wall: Wall): number {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates angle of a wall in degrees (0 - 360).
 */
export function calculateWallAngle(wall: Wall): number {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

/**
 * Calculates area of a 2D polygon using the Shoelace formula.
 * Input points in centimeters, returns area in square meters and square feet.
 */
export function calculatePolygonArea(points: Point2D[]): { areaSqM: number; areaSqFt: number } {
  if (!points || points.length < 3) {
    return { areaSqM: 0, areaSqFt: 0 };
  }

  let totalArea = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    totalArea += points[i].x * points[j].y;
    totalArea -= points[j].x * points[i].y;
  }

  const areaSqCm = Math.abs(totalArea) / 2;
  const areaSqM = areaSqCm / 10000;
  const areaSqFt = areaSqM * 10.7639;

  return { areaSqM, areaSqFt };
}

/**
 * Formats a centimeter measurement into localized metric (m) or imperial (ft' in").
 */
export function formatDimension(cm: number, unit: MeasurementUnit): string {
  if (unit === 'imperial_feet') {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}' ${inches}"`;
  }
  const meters = cm / 100;
  return `${meters.toFixed(2)} m`;
}

/**
 * Calculates oriented or axis-aligned bounding box for furniture item.
 */
export function getItemBoundingBox(item: FurnitureItem): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  const rad = ((item.rotationDeg || 0) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));

  const bbWidth = item.widthCm * cos + item.depthCm * sin;
  const bbHeight = item.widthCm * sin + item.depthCm * cos;

  return {
    minX: item.x - bbWidth / 2,
    minY: item.y - bbHeight / 2,
    maxX: item.x + bbWidth / 2,
    maxY: item.y + bbHeight / 2,
  };
}

/**
 * Checks for collision/clearance warnings among furniture items and walls.
 */
export function checkFurnitureClearances(
  furniture: FurnitureItem[],
  walls: Wall[] = []
): ClearanceWarning[] {
  const warnings: ClearanceWarning[] = [];

  // Pairwise furniture overlap check
  for (let i = 0; i < furniture.length; i++) {
    const a = furniture[i];
    const boxA = getItemBoundingBox(a);

    for (let j = i + 1; j < furniture.length; j++) {
      const b = furniture[j];
      const boxB = getItemBoundingBox(b);

      const overlapX = Math.min(boxA.maxX, boxB.maxX) - Math.max(boxA.minX, boxB.minX);
      const overlapY = Math.min(boxA.maxY, boxB.maxY) - Math.max(boxA.minY, boxB.minY);

      if (overlapX > 0 && overlapY > 0) {
        warnings.push({
          itemId1: a.id,
          itemId2: b.id,
          item1Name: a.name,
          item2Name: b.name,
          type: 'overlap',
          distanceCm: 0,
        });
      }
    }
  }

  // Wall boundary containment check
  if (walls && walls.length > 0) {
    const wallMinX = Math.min(...walls.flatMap((w) => [w.start.x, w.end.x]));
    const wallMaxX = Math.max(...walls.flatMap((w) => [w.start.x, w.end.x]));
    const wallMinY = Math.min(...walls.flatMap((w) => [w.start.y, w.end.y]));
    const wallMaxY = Math.max(...walls.flatMap((w) => [w.start.y, w.end.y]));

    for (const item of furniture) {
      const box = getItemBoundingBox(item);
      if (box.minX < wallMinX || box.maxX > wallMaxX || box.minY < wallMinY || box.maxY > wallMaxY) {
        warnings.push({
          itemId1: item.id,
          itemId2: 'wall-boundary',
          item1Name: item.name,
          item2Name: 'Room Wall Boundary',
          type: 'overlap',
          distanceCm: 0,
        });
      }
    }
  }

  return warnings;
}

/**
 * Dynamically resizes the primary rectangular room boundary and walls.
 */
export function resizeRoomDimensions(
  project: FloorPlanProject,
  newWidthCm: number,
  newDepthCm: number
): FloorPlanProject {
  const width = Math.max(100, Math.round(newWidthCm));
  const depth = Math.max(100, Math.round(newDepthCm));

  const updatedWalls = project.walls.map((w) => {
    // Only adjust perimeter walls that started from 0,0 rectangle
    const newStart = { ...w.start };
    const newEnd = { ...w.end };

    if (w.id === 'w1') {
      newStart.x = 0;
      newStart.y = 0;
      newEnd.x = width;
      newEnd.y = 0;
    } else if (w.id === 'w2') {
      newStart.x = width;
      newStart.y = 0;
      newEnd.x = width;
      newEnd.y = depth;
    } else if (w.id === 'w3') {
      newStart.x = width;
      newStart.y = depth;
      newEnd.x = 0;
      newEnd.y = depth;
    } else if (w.id === 'w4') {
      newStart.x = 0;
      newStart.y = depth;
      newEnd.x = 0;
      newEnd.y = 0;
    }
    return { ...w, start: newStart, end: newEnd };
  });

  const updatedRooms = project.rooms.map((r, idx) => {
    if (idx === 0) {
      return {
        ...r,
        points: [
          { x: 0, y: 0 },
          { x: width, y: 0 },
          { x: width, y: depth },
          { x: 0, y: depth },
        ],
      };
    }
    return r;
  });

  return {
    ...project,
    walls: updatedWalls,
    rooms: updatedRooms,
  };
}

/**
 * Generates an architectural vector SVG string representing the floor plan.
 */
export function generateFloorPlanSvg(project: FloorPlanProject): string {
  const { walls, doors, windows, furniture, rooms, options } = project;

  // Determine drawing bounding box
  let minX = 0;
  let maxX = 600;
  let minY = 0;
  let maxY = 500;

  for (const w of walls) {
    minX = Math.min(minX, w.start.x, w.end.x);
    maxX = Math.max(maxX, w.start.x, w.end.x);
    minY = Math.min(minY, w.start.y, w.end.y);
    maxY = Math.max(maxY, w.start.y, w.end.y);
  }

  // Padding
  const pad = 80;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad + 60; // Extra room for title block

  const width = Math.max(800, maxX - minX);
  const height = Math.max(600, maxY - minY);

  // Theme colors
  let bgColor = '#0f2338';
  let gridColor = 'rgba(255, 255, 255, 0.08)';
  let wallFill = '#93c5fd';
  let wallStroke = '#bfdbfe';
  let furnitureFill = 'rgba(56, 189, 248, 0.15)';
  let furnitureStroke = '#38bdf8';
  let textColor = '#f0f6ff';
  let dimensionColor = '#38bdf8';
  let doorStroke = '#f59e0b';

  if (options.themeColor === 'classic_cad_dark') {
    bgColor = '#111827';
    gridColor = 'rgba(255, 255, 255, 0.06)';
    wallFill = '#22c55e';
    wallStroke = '#4ade80';
    furnitureFill = 'rgba(34, 197, 94, 0.12)';
    furnitureStroke = '#22c55e';
    textColor = '#f9fafb';
    dimensionColor = '#eab308';
    doorStroke = '#ef4444';
  } else if (options.themeColor === 'clean_white') {
    bgColor = '#ffffff';
    gridColor = '#e2e8f0';
    wallFill = '#475569';
    wallStroke = '#0f172a';
    furnitureFill = '#f8fafc';
    furnitureStroke = '#334155';
    textColor = '#0f172a';
    dimensionColor = '#2563eb';
    doorStroke = '#d97706';
  }

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="100%" height="100%" style="max-height: 520px; display: block;">
  <defs>
    <pattern id="cadGrid" width="${options.gridSnapStepCm || 50}" height="${options.gridSnapStepCm || 50}" patternUnits="userSpaceOnUse">
      <path d="M ${options.gridSnapStepCm || 50} 0 L 0 0 0 ${options.gridSnapStepCm || 50}" fill="none" stroke="${gridColor}" stroke-width="1" />
    </pattern>
  </defs>

  <!-- Background -->
  <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${bgColor}" />
`;

  // Grid
  if (options.showGrid) {
    svg += `  <rect id="grid" x="${minX}" y="${minY}" width="${width}" height="${height}" fill="url(#cadGrid)" />\n`;
  }

  // Rooms (Polygons & Area readouts)
  svg += `  <g id="rooms">\n`;
  for (const r of rooms) {
    if (r.points && r.points.length >= 3) {
      const ptsStr = r.points.map((p) => `${p.x},${p.y}`).join(' ');
      const { areaSqM, areaSqFt } = calculatePolygonArea(r.points);
      const centerPt = r.points.reduce(
        (acc, p) => ({ x: acc.x + p.x / r.points.length, y: acc.y + p.y / r.points.length }),
        { x: 0, y: 0 }
      );

      svg += `    <polygon points="${ptsStr}" fill="none" stroke="${wallStroke}" stroke-width="1" stroke-dasharray="4 4" opacity="0.4" />\n`;

      if (options.showAreaReadouts) {
        const areaStr =
          options.measurementUnit === 'imperial_feet'
            ? `${areaSqFt.toFixed(1)} sq ft`
            : `${areaSqM.toFixed(1)} m²`;
        svg += `    <text x="${centerPt.x}" y="${centerPt.y}" fill="${textColor}" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle">${escapeXml(r.name)}</text>\n`;
        svg += `    <text x="${centerPt.x}" y="${centerPt.y + 20}" fill="${dimensionColor}" font-family="sans-serif" font-size="12" text-anchor="middle">${escapeXml(areaStr)}</text>\n`;
      }
    }
  }
  svg += `  </g>\n`;

  // Walls
  svg += `  <g id="walls">\n`;
  for (const w of walls) {
    svg += `    <line x1="${w.start.x}" y1="${w.start.y}" x2="${w.end.x}" y2="${w.end.y}" stroke="${wallFill}" stroke-width="${w.thicknessCm || options.wallThicknessCm}" stroke-linecap="square" />\n`;
    svg += `    <line x1="${w.start.x}" y1="${w.start.y}" x2="${w.end.x}" y2="${w.end.y}" stroke="${wallStroke}" stroke-width="2" stroke-linecap="round" />\n`;

    // Wall dimension annotation
    if (options.showDimensions) {
      const len = calculateWallLength(w);
      const midX = (w.start.x + w.end.x) / 2;
      const midY = (w.start.y + w.end.y) / 2;
      const angle = calculateWallAngle(w);
      const dimLabel = formatDimension(len, options.measurementUnit);

      svg += `    <text x="${midX}" y="${midY - 10}" fill="${dimensionColor}" font-family="sans-serif" font-size="12" text-anchor="middle" transform="rotate(${angle > 90 && angle < 270 ? angle + 180 : angle}, ${midX}, ${midY})">${escapeXml(dimLabel)}</text>\n`;
    }
  }
  svg += `  </g>\n`;

  // Windows
  svg += `  <g id="windows">\n`;
  for (const win of windows) {
    const halfW = win.widthCm / 2;
    const depth = win.depthCm || options.wallThicknessCm;
    svg += `    <g transform="translate(${win.x}, ${win.y}) rotate(${win.rotationDeg})">\n`;
    svg += `      <rect x="${-halfW}" y="${-depth / 2}" width="${win.widthCm}" height="${depth}" fill="${bgColor}" stroke="${wallStroke}" stroke-width="2" />\n`;
    svg += `      <line x1="${-halfW}" y1="0" x2="${halfW}" y2="0" stroke="#38bdf8" stroke-width="2" />\n`;
    svg += `    </g>\n`;
  }
  svg += `  </g>\n`;

  // Doors
  svg += `  <g id="doors">\n`;
  for (const d of doors) {
    const swingRadius = d.widthCm;
    const sweepFlag = d.swingDirection === 'left' ? 0 : 1;
    svg += `    <g transform="translate(${d.x}, ${d.y}) rotate(${d.rotationDeg})">\n`;
    // Door panel line
    svg += `      <line x1="0" y1="0" x2="${d.widthCm}" y2="0" stroke="${doorStroke}" stroke-width="3" />\n`;
    // 90 deg quarter arc
    svg += `      <path d="M ${d.widthCm} 0 A ${swingRadius} ${swingRadius} 0 0 ${sweepFlag} 0 ${d.widthCm}" fill="none" stroke="${doorStroke}" stroke-width="1.5" stroke-dasharray="3 3" />\n`;
    svg += `    </g>\n`;
  }
  svg += `  </g>\n`;

  // Furniture
  if (options.showFurniture) {
    svg += `  <g id="furniture">\n`;
    for (const f of furniture) {
      const halfW = f.widthCm / 2;
      const halfD = f.depthCm / 2;
      svg += `    <g transform="translate(${f.x}, ${f.y}) rotate(${f.rotationDeg || 0})">\n`;
      svg += `      <rect x="${-halfW}" y="${-halfD}" width="${f.widthCm}" height="${f.depthCm}" rx="4" fill="${furnitureFill}" stroke="${furnitureStroke}" stroke-width="2" />\n`;
      svg += `      <text x="0" y="4" fill="${textColor}" font-family="sans-serif" font-size="11" text-anchor="middle">${escapeXml(f.name)}</text>\n`;
      svg += `    </g>\n`;
    }
    svg += `  </g>\n`;
  }

  // Title Block & Legend
  const escapedProjectName = escapeXml(project.name || options.projectName);
  const escapedDesignerName = escapeXml(options.designerName);
  const unitLabel = options.measurementUnit === 'metric_meters' ? 'Metric (m)' : 'Imperial (ft)';

  svg += `  <!-- Title Block & Legend -->
  <g id="title-block" transform="translate(${minX + 20}, ${maxY - 70})">
    <rect x="0" y="0" width="340" height="50" fill="${bgColor}" stroke="${wallStroke}" stroke-width="1" rx="4" />
    <text x="12" y="20" fill="${textColor}" font-family="sans-serif" font-size="14" font-weight="bold">${escapedProjectName}</text>
    <text x="12" y="38" fill="${textColor}" font-family="sans-serif" font-size="10">Scale: ${options.blueprintScale} • Unit: ${unitLabel} • ${escapedDesignerName}</text>
  </g>
</svg>`;

  return svg;
}

/**
 * Generates an architectural blueprint PDF using jsPDF.
 */
export async function generateBlueprintPdf(project: FloorPlanProject): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 15;

  const isDark = project.options.themeColor !== 'clean_white';
  const bgColor = isDark ? [15, 35, 56] : [255, 255, 255];
  const strokeColor = isDark ? [147, 197, 253] : [15, 23, 42];
  const textColor = isDark ? [240, 246, 255] : [15, 23, 42];
  const accentColor = [56, 189, 248];

  // Draw background
  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Blueprint Border
  doc.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2]);
  doc.setLineWidth(0.8);
  doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);

  // Inner margin line
  doc.setLineWidth(0.2);
  doc.rect(margin + 2, margin + 2, pageWidth - 2 * (margin + 2), pageHeight - 2 * (margin + 2));

  // Determine drawing bounding box in cm
  let minX = 0;
  let maxX = 600;
  let minY = 0;
  let maxY = 500;

  for (const w of project.walls) {
    minX = Math.min(minX, w.start.x, w.end.x);
    maxX = Math.max(maxX, w.start.x, w.end.x);
    minY = Math.min(minY, w.start.y, w.end.y);
    maxY = Math.max(maxY, w.start.y, w.end.y);
  }

  const planWidthCm = Math.max(100, maxX - minX);
  const planHeightCm = Math.max(100, maxY - minY);

  // Printable area inside border
  const drawWidthMm = pageWidth - 2 * margin - 30;
  const drawHeightMm = pageHeight - 2 * margin - 40;

  const scaleFactor = Math.min(drawWidthMm / planWidthCm, drawHeightMm / planHeightCm);

  const originX = margin + 15 + (drawWidthMm - planWidthCm * scaleFactor) / 2;
  const originY = margin + 15 + (drawHeightMm - planHeightCm * scaleFactor) / 2;

  const toPdfX = (x: number) => originX + (x - minX) * scaleFactor;
  const toPdfY = (y: number) => originY + (y - minY) * scaleFactor;

  // Draw Walls
  doc.setLineWidth(1.2);
  doc.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2]);
  for (const w of project.walls) {
    const x1 = toPdfX(w.start.x);
    const y1 = toPdfY(w.start.y);
    const x2 = toPdfX(w.end.x);
    const y2 = toPdfY(w.end.y);
    doc.line(x1, y1, x2, y2);

    if (project.options.showDimensions) {
      const len = calculateWallLength(w);
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      doc.setFontSize(8);
      doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.text(formatDimension(len, project.options.measurementUnit), midX, midY - 2, {
        align: 'center',
      });
    }
  }

  // Draw Windows
  doc.setDrawColor(56, 189, 248);
  doc.setLineWidth(0.8);
  for (const win of project.windows) {
    const wx = toPdfX(win.x);
    const wy = toPdfY(win.y);
    const ww = (win.widthCm / 2) * scaleFactor;
    doc.line(wx - ww, wy, wx + ww, wy);
  }

  // Draw Doors
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.6);
  for (const d of project.doors) {
    const dx = toPdfX(d.x);
    const dy = toPdfY(d.y);
    const dw = d.widthCm * scaleFactor;
    doc.line(dx, dy, dx + dw, dy);
  }

  // Draw Furniture with effective dimensions for rotation
  if (project.options.showFurniture) {
    doc.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2]);
    doc.setFillColor(isDark ? 28 : 240, isDark ? 55 : 243, isDark ? 85 : 246);
    doc.setLineWidth(0.4);

    for (const f of project.furniture) {
      const isRotated = f.rotationDeg === 90 || f.rotationDeg === 270;
      const effWidth = isRotated ? f.depthCm : f.widthCm;
      const effDepth = isRotated ? f.widthCm : f.depthCm;

      const fx = toPdfX(f.x - effWidth / 2);
      const fy = toPdfY(f.y - effDepth / 2);
      const fw = effWidth * scaleFactor;
      const fh = effDepth * scaleFactor;

      doc.rect(fx, fy, fw, fh, 'FD');
      doc.setFontSize(7);
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.text(f.name, fx + fw / 2, fy + fh / 2 + 1, { align: 'center' });
    }
  }

  // Rooms and Area labels
  if (project.options.showAreaReadouts) {
    doc.setFontSize(10);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    for (const r of project.rooms) {
      if (r.points && r.points.length >= 3) {
        const { areaSqM, areaSqFt } = calculatePolygonArea(r.points);
        const center = r.points.reduce(
          (acc, p) => ({ x: acc.x + p.x / r.points.length, y: acc.y + p.y / r.points.length }),
          { x: 0, y: 0 }
        );
        const areaStr =
          project.options.measurementUnit === 'imperial_feet'
            ? `${areaSqFt.toFixed(1)} sq ft`
            : `${areaSqM.toFixed(1)} m²`;

        doc.text(r.name, toPdfX(center.x), toPdfY(center.y), { align: 'center' });
        doc.setFontSize(8);
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.text(areaStr, toPdfX(center.x), toPdfY(center.y) + 4, { align: 'center' });
      }
    }
  }

  // Professional Title Block (Bottom-Right)
  const tbWidth = 90;
  const tbHeight = 26;
  const tbX = pageWidth - margin - 2 - tbWidth;
  const tbY = pageHeight - margin - 2 - tbHeight;

  doc.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2]);
  doc.setFillColor(isDark ? 10 : 255, isDark ? 25 : 255, isDark ? 42 : 255);
  doc.rect(tbX, tbY, tbWidth, tbHeight, 'FD');

  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(9);
  doc.text(project.name || project.options.projectName, tbX + 3, tbY + 6);

  doc.setFontSize(7);
  doc.text(`Architect / Designer: ${project.options.designerName}`, tbX + 3, tbY + 11);
  doc.text(
    `Scale: ${project.options.blueprintScale}  |  Unit: ${project.options.measurementUnit === 'metric_meters' ? 'Metric' : 'Imperial'}`,
    tbX + 3,
    tbY + 16
  );
  doc.text(
    `Date: ${new Date().toISOString().split('T')[0]}  |  Sheet: A-101`,
    tbX + 3,
    tbY + 21
  );

  // Graphical Bar Scale (Bottom-Left)
  const scaleBarX = margin + 6;
  const scaleBarY = pageHeight - margin - 10;
  doc.setLineWidth(0.5);
  doc.line(scaleBarX, scaleBarY, scaleBarX + 40, scaleBarY);
  doc.line(scaleBarX, scaleBarY - 2, scaleBarX, scaleBarY + 2);
  doc.line(scaleBarX + 20, scaleBarY - 1.5, scaleBarX + 20, scaleBarY + 1.5);
  doc.line(scaleBarX + 40, scaleBarY - 2, scaleBarX + 40, scaleBarY + 2);
  doc.setFontSize(6);
  doc.text('0', scaleBarX, scaleBarY - 3, { align: 'center' });
  doc.text(
    project.options.measurementUnit === 'imperial_feet' ? '5 ft' : '1m',
    scaleBarX + 20,
    scaleBarY - 3,
    { align: 'center' }
  );
  doc.text(
    project.options.measurementUnit === 'imperial_feet' ? '10 ft' : '2m',
    scaleBarX + 40,
    scaleBarY - 3,
    { align: 'center' }
  );
  doc.text(`GRAPHICAL SCALE (${project.options.blueprintScale})`, scaleBarX + 20, scaleBarY + 6, {
    align: 'center',
  });

  return doc.output('blob');
}

/**
 * Serializes a floor plan project to formatted JSON string.
 */
export function exportProjectToJson(project: FloorPlanProject): string {
  return JSON.stringify(project, null, 2);
}

/**
 * Parses and validates a project JSON string.
 */
export function importProjectFromJson(jsonStr: string): FloorPlanProject {
  const data = JSON.parse(jsonStr);
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid project file: not an object');
  }
  if (!Array.isArray(data.walls) || !Array.isArray(data.furniture)) {
    throw new Error('Invalid project file: missing walls or furniture array');
  }
  return {
    version: data.version || '1.0',
    name: data.name || 'Imported Floor Plan',
    options: {
      ...DEFAULT_FLOOR_PLAN_OPTIONS,
      ...(data.options || {}),
    },
    walls: data.walls,
    doors: data.doors || [],
    windows: data.windows || [],
    furniture: data.furniture || [],
    rooms: data.rooms || [],
  };
}

/**
 * Creates standardized starter presets for various room types.
 */
export function createPresetProject(
  preset: 'studio_30m' | 'one_bedroom_50m' | 'office_60m'
): FloorPlanProject {
  if (preset === 'studio_30m') {
    return JSON.parse(JSON.stringify(SAMPLE_STUDIO_PLAN));
  }

  if (preset === 'one_bedroom_50m') {
    return {
      version: '1.0',
      name: '1-Bedroom Suite (50m²)',
      options: { ...DEFAULT_FLOOR_PLAN_OPTIONS, projectName: '1-Bedroom Apartment 50m²' },
      walls: [
        // Exterior perimeter 800x625cm
        { id: 'w1', start: { x: 0, y: 0 }, end: { x: 800, y: 0 }, thicknessCm: 20, isExterior: true },
        { id: 'w2', start: { x: 800, y: 0 }, end: { x: 800, y: 625 }, thicknessCm: 20, isExterior: true },
        { id: 'w3', start: { x: 800, y: 625 }, end: { x: 0, y: 625 }, thicknessCm: 20, isExterior: true },
        { id: 'w4', start: { x: 0, y: 625 }, end: { x: 0, y: 0 }, thicknessCm: 20, isExterior: true },
        // Partition wall separating bedroom (450cm)
        { id: 'w5', start: { x: 450, y: 0 }, end: { x: 450, y: 625 }, thicknessCm: 15, isExterior: false },
      ],
      doors: [
        { id: 'd1', x: 100, y: 625, widthCm: 90, rotationDeg: 0, swingDirection: 'right', isOpenInward: true },
        { id: 'd2', x: 450, y: 300, widthCm: 80, rotationDeg: 90, swingDirection: 'right', isOpenInward: true },
      ],
      windows: [
        { id: 'win1', x: 250, y: 0, widthCm: 160, rotationDeg: 0 },
        { id: 'win2', x: 625, y: 0, widthCm: 140, rotationDeg: 0 },
      ],
      furniture: [
        { id: 'f1', type: 'sofa_3seat', name: 'Living Sofa', x: 220, y: 350, widthCm: 210, depthCm: 90, rotationDeg: 0 },
        { id: 'f2', type: 'bed_king', name: 'King Bed', x: 625, y: 250, widthCm: 180, depthCm: 200, rotationDeg: 0 },
        { id: 'f3', type: 'wardrobe', name: 'Bedroom Wardrobe', x: 740, y: 550, widthCm: 150, depthCm: 60, rotationDeg: 0 },
      ],
      rooms: [
        {
          id: 'r1',
          name: 'Living & Dining',
          points: [
            { x: 0, y: 0 },
            { x: 450, y: 0 },
            { x: 450, y: 625 },
            { x: 0, y: 625 },
          ],
        },
        {
          id: 'r2',
          name: 'Primary Bedroom',
          points: [
            { x: 450, y: 0 },
            { x: 800, y: 0 },
            { x: 800, y: 625 },
            { x: 450, y: 625 },
          ],
        },
      ],
    };
  }

  // office_60m
  return {
    version: '1.0',
    name: 'Open Studio Office (60m²)',
    options: { ...DEFAULT_FLOOR_PLAN_OPTIONS, projectName: 'Creative Studio Office 60m²' },
    walls: [
      { id: 'w1', start: { x: 0, y: 0 }, end: { x: 1000, y: 0 }, thicknessCm: 20, isExterior: true },
      { id: 'w2', start: { x: 1000, y: 0 }, end: { x: 1000, y: 600 }, thicknessCm: 20, isExterior: true },
      { id: 'w3', start: { x: 1000, y: 600 }, end: { x: 0, y: 600 }, thicknessCm: 20, isExterior: true },
      { id: 'w4', start: { x: 0, y: 600 }, end: { x: 0, y: 0 }, thicknessCm: 20, isExterior: true },
    ],
    doors: [
      { id: 'd1', x: 120, y: 600, widthCm: 100, rotationDeg: 0, swingDirection: 'right', isOpenInward: true },
    ],
    windows: [
      { id: 'win1', x: 500, y: 0, widthCm: 250, rotationDeg: 0 },
    ],
    furniture: [
      { id: 'f1', type: 'desk_office', name: 'Office Desk 1', x: 300, y: 200, widthCm: 140, depthCm: 70, rotationDeg: 0 },
      { id: 'f2', type: 'desk_office', name: 'Office Desk 2', x: 500, y: 200, widthCm: 140, depthCm: 70, rotationDeg: 0 },
      { id: 'f3', type: 'dining_table_6', name: 'Conference Table', x: 700, y: 400, widthCm: 180, depthCm: 90, rotationDeg: 0 },
    ],
    rooms: [
      {
        id: 'r1',
        name: 'Open Plan Collaborative Office',
        points: [
          { x: 0, y: 0 },
          { x: 1000, y: 0 },
          { x: 1000, y: 600 },
          { x: 0, y: 600 },
        ],
      },
    ],
  };
}
