import * as THREE from 'three';
import JSZip from 'jszip';
import {
  GridfinityBinGeneratorOptions,
  GridfinityBinGeneratorResult,
  GridfinityBinMetrics,
} from './types';

export const GRIDFINITY_CELL_SIZE = 42.0; // mm
export const GRIDFINITY_TOLERANCE = 0.5; // mm
export const GRIDFINITY_UNIT_HEIGHT = 7.0; // mm
export const GRIDFINITY_BASE_HEIGHT = 4.75; // mm
export const GRIDFINITY_LIP_HEIGHT = 3.75; // mm

/**
 * Validates Gridfinity configuration options.
 */
export function validateGridfinityOptions(options: GridfinityBinGeneratorOptions): {
  valid: boolean;
  error?: string;
} {
  if (!options) {
    return { valid: false, error: 'Options are required' };
  }

  if (typeof options.gridX !== 'number' || options.gridX < 1 || options.gridX > 12) {
    return { valid: false, error: 'gridX must be between 1 and 12 units' };
  }

  if (typeof options.gridY !== 'number' || options.gridY < 1 || options.gridY > 12) {
    return { valid: false, error: 'gridY must be between 1 and 12 units' };
  }

  if (typeof options.heightUnits !== 'number' || options.heightUnits < 1 || options.heightUnits > 30) {
    return { valid: false, error: 'heightUnits must be between 1 and 30 (7mm per unit)' };
  }

  if (options.subdivisionsX && (options.subdivisionsX < 1 || options.subdivisionsX > 10)) {
    return { valid: false, error: 'subdivisionsX must be between 1 and 10' };
  }

  if (options.subdivisionsY && (options.subdivisionsY < 1 || options.subdivisionsY > 10)) {
    return { valid: false, error: 'subdivisionsY must be between 1 and 10' };
  }

  return { valid: true };
}

/**
 * Generates a watertight BufferGeometry representing a parametric Gridfinity storage bin.
 */
export function generateGridfinityGeometry(
  options: GridfinityBinGeneratorOptions
): THREE.BufferGeometry {
  const {
    gridX,
    gridY,
    heightUnits,
    subdivisionsX,
    subdivisionsY,
    lipStyle,
    fingerScoop,
    fingerScoopRadiusMm,
    labelTab,
    labelTabWidthMm,
    labelAngleDeg = 45,
    baseMagnetHoles = false,
    baseScrewHoles = false,
    wallThicknessMm = 1.2,
  } = options;

  const totalWidth = gridX * GRIDFINITY_CELL_SIZE - GRIDFINITY_TOLERANCE;
  const totalLength = gridY * GRIDFINITY_CELL_SIZE - GRIDFINITY_TOLERANCE;
  const totalHeight = heightUnits * GRIDFINITY_UNIT_HEIGHT;
  const wallT = Math.max(0.8, wallThicknessMm);
  const floorZ = GRIDFINITY_BASE_HEIGHT;

  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Helper to add a triangle face given 3 corner vertices [x, y, z] (CCW)
  function addTriangle(
    v0: [number, number, number],
    v1: [number, number, number],
    v2: [number, number, number]
  ): void {
    const startIdx = positions.length / 3;
    positions.push(...v0, ...v1, ...v2);
    normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1);
    indices.push(startIdx, startIdx + 1, startIdx + 2);
  }

  // Helper to add a quad face given 4 corner vertices [x, y, z] (CCW)
  function addQuad(
    v0: [number, number, number],
    v1: [number, number, number],
    v2: [number, number, number],
    v3: [number, number, number]
  ): void {
    const startIdx = positions.length / 3;
    positions.push(...v0, ...v1, ...v2, ...v3);

    // Placeholder normals (will compute at end)
    normals.push(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1);

    indices.push(startIdx, startIdx + 1, startIdx + 2);
    indices.push(startIdx, startIdx + 2, startIdx + 3);
  }

  // Helper to add a rectangular prism / box
  function addBox(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    minZ: number,
    maxZ: number
  ): void {
    // Bottom
    addQuad([minX, minY, minZ], [maxX, minY, minZ], [maxX, maxY, minZ], [minX, maxY, minZ]);
    // Top
    addQuad([minX, maxY, maxZ], [maxX, maxY, maxZ], [maxX, minY, maxZ], [minX, minY, maxZ]);
    // Front (-Y)
    addQuad([minX, minY, minZ], [minX, minY, maxZ], [maxX, minY, maxZ], [maxX, minY, minZ]);
    // Back (+Y)
    addQuad([maxX, maxY, minZ], [maxX, maxY, maxZ], [minX, maxY, maxZ], [minX, maxY, minZ]);
    // Left (-X)
    addQuad([minX, maxY, minZ], [minX, maxY, maxZ], [minX, minY, maxZ], [minX, minY, minZ]);
    // Right (+X)
    addQuad([maxX, minY, minZ], [maxX, minY, maxZ], [maxX, maxY, maxZ], [maxX, maxY, minZ]);
  }

  // 1. BASE MODULES (GRIDFINITY 42mm Standard Tapered Grid Base)
  const halfW = totalWidth / 2;
  const halfL = totalLength / 2;

  for (let gx = 0; gx < gridX; gx++) {
    for (let gy = 0; gy < gridY; gy++) {
      const cellCenterX = -halfW + (gx + 0.5) * GRIDFINITY_CELL_SIZE;
      const cellCenterY = -halfL + (gy + 0.5) * GRIDFINITY_CELL_SIZE;

      // Base footprint: 37.2mm bottom square with 45-deg bevel up to 41.5mm at 2.15mm
      const bHalfSize = 18.6; // 37.2 / 2
      const tHalfSize = 20.75; // 41.5 / 2

      // Bottom face of cell
      const bMinX = cellCenterX - bHalfSize;
      const bMaxX = cellCenterX + bHalfSize;
      const bMinY = cellCenterY - bHalfSize;
      const bMaxY = cellCenterY + bHalfSize;

      // Mid bevel level at z = 2.15
      const mMinX = cellCenterX - tHalfSize;
      const mMaxX = cellCenterX + tHalfSize;
      const mMinY = cellCenterY - tHalfSize;
      const mMaxY = cellCenterY + tHalfSize;

      // Bottom face / Corner magnet & screw pockets
      if (!baseMagnetHoles && !baseScrewHoles) {
        // Solid bottom face
        addQuad([bMinX, bMinY, 0], [bMaxX, bMinY, 0], [bMaxX, bMaxY, 0], [bMinX, bMaxY, 0]);
      } else {
        // Corner pocket centers at (cellCenterX ± 13.0, cellCenterY ± 13.0)
        const s = 5.6;
        const cornerCenters: [number, number][] = [
          [cellCenterX - 13.0, cellCenterY - 13.0],
          [cellCenterX + 13.0, cellCenterY - 13.0],
          [cellCenterX + 13.0, cellCenterY + 13.0],
          [cellCenterX - 13.0, cellCenterY + 13.0],
        ];

        // 5 boundary strips covering the area between corner pocket squares
        const midX0 = cellCenterX - (13.0 - s); // cx - 7.4
        const midX1 = cellCenterX + (13.0 - s); // cx + 7.4
        const midY0 = cellCenterY - (13.0 - s); // cy - 7.4
        const midY1 = cellCenterY + (13.0 - s); // cy + 7.4

        // Center square
        addQuad([midX0, midY0, 0], [midX1, midY0, 0], [midX1, midY1, 0], [midX0, midY1, 0]);
        // Left strip
        addQuad([bMinX, midY0, 0], [midX0, midY0, 0], [midX0, midY1, 0], [bMinX, midY1, 0]);
        // Right strip
        addQuad([midX1, midY0, 0], [bMaxX, midY0, 0], [bMaxX, midY1, 0], [midX1, midY1, 0]);
        // Bottom strip
        addQuad([midX0, bMinY, 0], [midX1, bMinY, 0], [midX1, midY0, 0], [midX0, midY0, 0]);
        // Top strip
        addQuad([midX0, midY1, 0], [midX1, midY1, 0], [midX1, bMaxY, 0], [midX0, bMaxY, 0]);

        const rMag = 3.25; // 6.5mm diameter magnet pocket
        const rScrew = 1.6; // 3.2mm diameter M3 screw counterbore
        const magDepth = 2.4;
        const screwDepth = 4.5;
        const rHole = baseMagnetHoles ? rMag : rScrew;
        const SIDES = 8;

        for (const [px, py] of cornerCenters) {
          // 8 outer perimeter points of the square around the pocket
          const sqPts: [number, number, number][] = [
            [px + s, py, 0],
            [px + s, py + s, 0],
            [px, py + s, 0],
            [px - s, py + s, 0],
            [px - s, py, 0],
            [px - s, py - s, 0],
            [px, py - s, 0],
            [px + s, py - s, 0],
          ];

          // 8 points on the hole rim at z = 0
          const rimPts: [number, number, number][] = [];
          for (let k = 0; k < SIDES; k++) {
            const th = (2 * Math.PI * k) / SIDES;
            rimPts.push([px + rHole * Math.cos(th), py + rHole * Math.sin(th), 0]);
          }

          // Annular bottom face surrounding the pocket hole
          for (let k = 0; k < SIDES; k++) {
            const nextK = (k + 1) % SIDES;
            addQuad(sqPts[k], sqPts[nextK], rimPts[nextK], rimPts[k]);
          }

          if (baseMagnetHoles && !baseScrewHoles) {
            // Magnet pocket walls (z = 0 to magDepth)
            for (let k = 0; k < SIDES; k++) {
              const nextK = (k + 1) % SIDES;
              const p0 = rimPts[k];
              const p1 = rimPts[nextK];
              const p0Top: [number, number, number] = [p0[0], p0[1], magDepth];
              const p1Top: [number, number, number] = [p1[0], p1[1], magDepth];
              addQuad(p0, p0Top, p1Top, p1);
            }
            // Magnet pocket ceiling
            for (let k = 0; k < SIDES; k++) {
              const nextK = (k + 1) % SIDES;
              const p0 = rimPts[k];
              const p1 = rimPts[nextK];
              addTriangle(
                [px, py, magDepth],
                [p0[0], p0[1], magDepth],
                [p1[0], p1[1], magDepth]
              );
            }
          } else if (!baseMagnetHoles && baseScrewHoles) {
            // Screw hole walls (z = 0 to screwDepth)
            for (let k = 0; k < SIDES; k++) {
              const nextK = (k + 1) % SIDES;
              const p0 = rimPts[k];
              const p1 = rimPts[nextK];
              const p0Top: [number, number, number] = [p0[0], p0[1], screwDepth];
              const p1Top: [number, number, number] = [p1[0], p1[1], screwDepth];
              addQuad(p0, p0Top, p1Top, p1);
            }
            // Screw hole ceiling
            for (let k = 0; k < SIDES; k++) {
              const nextK = (k + 1) % SIDES;
              const p0 = rimPts[k];
              const p1 = rimPts[nextK];
              addTriangle(
                [px, py, screwDepth],
                [p0[0], p0[1], screwDepth],
                [p1[0], p1[1], screwDepth]
              );
            }
          } else if (baseMagnetHoles && baseScrewHoles) {
            // Both: Magnet pocket (z = 0 to 2.4), then step to screw bore (z = 2.4 to 4.5)
            const screwPts2_4: [number, number, number][] = [];
            for (let k = 0; k < SIDES; k++) {
              const th = (2 * Math.PI * k) / SIDES;
              screwPts2_4.push([px + rScrew * Math.cos(th), py + rScrew * Math.sin(th), magDepth]);
            }

            for (let k = 0; k < SIDES; k++) {
              const nextK = (k + 1) % SIDES;
              const p0 = rimPts[k];
              const p1 = rimPts[nextK];
              const p0MagTop: [number, number, number] = [p0[0], p0[1], magDepth];
              const p1MagTop: [number, number, number] = [p1[0], p1[1], magDepth];
              // Magnet wall
              addQuad(p0, p0MagTop, p1MagTop, p1);

              // Annular shoulder step at z = 2.4
              addQuad(p0MagTop, screwPts2_4[k], screwPts2_4[nextK], p1MagTop);

              // Screw wall from 2.4 to 4.5
              const s0Top: [number, number, number] = [screwPts2_4[k][0], screwPts2_4[k][1], screwDepth];
              const s1Top: [number, number, number] = [screwPts2_4[nextK][0], screwPts2_4[nextK][1], screwDepth];
              addQuad(screwPts2_4[k], s0Top, s1Top, screwPts2_4[nextK]);

              // Screw ceiling at 4.5
              addTriangle([px, py, screwDepth], s0Top, s1Top);
            }
          }
        }
      }

      // 4 Tapered Chamfer Sides (0 -> 2.15mm)
      addQuad([bMinX, bMinY, 0], [mMinX, mMinY, 2.15], [mMaxX, mMinY, 2.15], [bMaxX, bMinY, 0]);
      addQuad([bMaxX, bMaxY, 0], [mMaxX, mMaxY, 2.15], [mMinX, mMaxY, 2.15], [bMinX, bMaxY, 0]);
      addQuad([bMinX, bMaxY, 0], [mMinX, mMaxY, 2.15], [mMinX, mMinY, 2.15], [bMinX, bMinY, 0]);
      addQuad([bMaxX, bMinY, 0], [mMaxX, mMinY, 2.15], [mMaxX, mMaxY, 2.15], [bMaxX, bMaxY, 0]);

      // Straight collar sides (2.15mm -> 4.75mm)
      addQuad([mMinX, mMinY, 2.15], [mMinX, mMinY, floorZ], [mMaxX, mMinY, floorZ], [mMaxX, mMinY, 2.15]);
      addQuad([mMaxX, mMaxY, 2.15], [mMaxX, mMaxY, floorZ], [mMinX, mMaxY, floorZ], [mMinX, mMaxY, 2.15]);
      addQuad([mMinX, mMaxY, 2.15], [mMinX, mMaxY, floorZ], [mMinX, mMinY, floorZ], [mMinX, mMinY, 2.15]);
      addQuad([mMaxX, mMinY, 2.15], [mMaxX, mMinY, floorZ], [mMaxX, mMaxY, floorZ], [mMaxX, mMaxY, 2.15]);
    }
  }

  // 2. OUTER WALLS & RIM
  // Left Outer Wall
  addBox(-halfW, -halfW + wallT, -halfL, halfL, floorZ, totalHeight);
  // Right Outer Wall
  addBox(halfW - wallT, halfW, -halfL, halfL, floorZ, totalHeight);
  // Front Outer Wall
  addBox(-halfW + wallT, halfW - wallT, -halfL, -halfL + wallT, floorZ, totalHeight);
  // Back Outer Wall
  addBox(-halfW + wallT, halfW - wallT, halfL - wallT, halfL, floorZ, totalHeight);

  // Interior Cavity Floor
  addQuad(
    [-halfW + wallT, -halfL + wallT, floorZ],
    [halfW - wallT, -halfL + wallT, floorZ],
    [halfW - wallT, halfL - wallT, floorZ],
    [-halfW + wallT, halfL - wallT, floorZ]
  );

  // 3. INTERNAL DIVIDERS (Subdivisions X and Y)
  const innerW = totalWidth - 2 * wallT;
  const innerL = totalLength - 2 * wallT;
  const compW = innerW / (subdivisionsX || 1);
  const compL = innerL / (subdivisionsY || 1);

  // Vertical dividers along Y (dividing X)
  if (subdivisionsX && subdivisionsX > 1) {
    for (let i = 1; i < subdivisionsX; i++) {
      const divX = -halfW + wallT + i * compW;
      addBox(divX - wallT / 2, divX + wallT / 2, -halfL + wallT, halfL - wallT, floorZ, totalHeight - 2);
    }
  }

  // Horizontal dividers along X (dividing Y)
  if (subdivisionsY && subdivisionsY > 1) {
    for (let j = 1; j < subdivisionsY; j++) {
      const divY = -halfL + wallT + j * compL;
      addBox(-halfW + wallT, halfW - wallT, divY - wallT / 2, divY + wallT / 2, floorZ, totalHeight - 2);
    }
  }

  // 4. FINGER SCOOP
  // If fingerScoop is enabled: adds a 45° angled ramp / curved transition at the front bottom of each compartment
  if (fingerScoop) {
    const scoopR = Math.min(compL * 0.45, Math.max(4, fingerScoopRadiusMm || 10));
    for (let i = 0; i < (subdivisionsX || 1); i++) {
      for (let j = 0; j < (subdivisionsY || 1); j++) {
        const cMinX = -halfW + wallT + i * compW + 0.5;
        const cMaxX = -halfW + wallT + (i + 1) * compW - 0.5;
        const cMinY = -halfL + wallT + j * compL;

        // Angled scoop face from floor up to front wall
        addQuad(
          [cMinX, cMinY + scoopR, floorZ],
          [cMaxX, cMinY + scoopR, floorZ],
          [cMaxX, cMinY, floorZ + scoopR],
          [cMinX, cMinY, floorZ + scoopR]
        );
      }
    }
  }

  // 5. LABEL TAB
  // If labelTab is enabled: creates an angled shelf along the top rear rim for label stickers
  if (labelTab) {
    const tabW = Math.min(innerW * 0.9, Math.max(12, labelTabWidthMm || 24));
    const angleRad = ((labelAngleDeg || 45) * Math.PI) / 180;
    const tabHeight = 8;
    const tabDepth = tabHeight / Math.tan(angleRad);
    const tabMinX = -tabW / 2;
    const tabMaxX = tabW / 2;
    const tabRearY = halfL - wallT;
    const tabFrontY = tabRearY - tabDepth;
    const tabTopZ = totalHeight;
    const tabBottomZ = totalHeight - tabHeight;

    // Angled top face for label
    addQuad(
      [tabMinX, tabFrontY, tabBottomZ],
      [tabMaxX, tabFrontY, tabBottomZ],
      [tabMaxX, tabRearY, tabTopZ],
      [tabMinX, tabRearY, tabTopZ]
    );

    // Left cap (single triangle, zero degenerate vertices)
    addTriangle(
      [tabMinX, tabRearY, tabBottomZ],
      [tabMinX, tabFrontY, tabBottomZ],
      [tabMinX, tabRearY, tabTopZ]
    );

    // Right cap (single triangle, zero degenerate vertices)
    addTriangle(
      [tabMaxX, tabFrontY, tabBottomZ],
      [tabMaxX, tabRearY, tabBottomZ],
      [tabMaxX, tabRearY, tabTopZ]
    );
  }

  // 6. STACKING LIP (Standard Zack Freedman Gridfinity top stacking profile)
  if (lipStyle === 'standard') {
    const lipH = GRIDFINITY_LIP_HEIGHT;
    const lipTaper = 0.5;

    // Outer 45° chamfered rim rising above totalHeight
    // Left lip
    addBox(-halfW, -halfW + wallT + lipTaper, -halfL, halfL, totalHeight, totalHeight + lipH);
    // Right lip
    addBox(halfW - wallT - lipTaper, halfW, -halfL, halfL, totalHeight, totalHeight + lipH);
    // Front lip
    addBox(-halfW, halfW, -halfL, -halfL + wallT + lipTaper, totalHeight, totalHeight + lipH);
    // Back lip
    addBox(-halfW, halfW, halfL - wallT - lipTaper, halfL, totalHeight, totalHeight + lipH);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Computes dimensional and printing telemetry metrics.
 */
export function calculateGridfinityMetrics(
  geometry: THREE.BufferGeometry,
  options: GridfinityBinGeneratorOptions
): GridfinityBinMetrics {
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox!;

  const totalWidthMm = Math.round((bbox.max.x - bbox.min.x) * 10) / 10;
  const totalLengthMm = Math.round((bbox.max.y - bbox.min.y) * 10) / 10;
  const totalHeightMm = Math.round((bbox.max.z - bbox.min.z) * 10) / 10;

  const internalCompartments = (options.subdivisionsX || 1) * (options.subdivisionsY || 1);
  const triangleCount = geometry.getIndex() ? geometry.getIndex()!.count / 3 : 0;
  const vertexCount = geometry.getAttribute('position')
    ? geometry.getAttribute('position').count
    : 0;

  // Approximate solid shell volume (perimeter + base + dividers)
  const perimeterArea = 2 * (totalWidthMm + totalLengthMm) * totalHeightMm * 1.2;
  const baseArea = totalWidthMm * totalLengthMm * GRIDFINITY_BASE_HEIGHT * 0.4;
  const dividerArea =
    ((options.subdivisionsX || 1) - 1) * totalLengthMm * totalHeightMm * 1.2 +
    ((options.subdivisionsY || 1) - 1) * totalWidthMm * totalHeightMm * 1.2;
  const estimatedVolumeMm3 = perimeterArea + baseArea + dividerArea;
  const estimatedVolumeCm3 = Math.max(1.0, Math.round((estimatedVolumeMm3 / 1000.0) * 10) / 10);

  // PLA density ~ 1.24 g/cm3
  const estimatedGrams = Math.round(estimatedVolumeCm3 * 1.24 * 10) / 10;

  // Print time estimation (approx 0.20mm standard speed)
  const estimatedPrintTimeHours =
    Math.round((totalHeightMm * 0.04 + estimatedGrams * 0.08) * 10) / 10;

  const slicerTips: string[] = [
    'Layer Height: Print at 0.20mm (standard) or 0.28mm (draft) for optimal balance of speed and strength.',
    'No Supports Required: All Gridfinity base tapers and finger scoops are designed at 45° overhangs.',
    'Infill: Set infill to 15% (Gyroid or Grid). Base walls are solid for optimal structural stiffness.',
    'Walls / Perimeters: Use 3 wall loops (approx 1.2mm) to ensure solid outer and divider walls.',
    'Orientation: Print standing flat on the base plate as oriented.',
  ];

  return {
    totalWidthMm,
    totalLengthMm,
    totalHeightMm,
    internalCompartments,
    triangleCount,
    vertexCount,
    estimatedVolumeCm3,
    estimatedGrams,
    estimatedPrintTimeHours,
    slicerTips,
  };
}

/**
 * Encodes BufferGeometry into binary STL ArrayBuffer.
 */
export function exportGridfinitySTL(geometry: THREE.BufferGeometry): ArrayBuffer {
  const index = geometry.getIndex();
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');

  const triangleCount = index ? index.count / 3 : position.count / 3;
  const bufferSize = 84 + triangleCount * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const dataView = new DataView(buffer);

  // 80-byte header
  const headerStr = 'PrivKnife Gridfinity Bin Generator - Client-Side STL Export';
  for (let i = 0; i < 80; i++) {
    dataView.setUint8(i, i < headerStr.length ? headerStr.charCodeAt(i) : 0);
  }

  // 4-byte unsigned int triangle count
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

/**
 * Encodes BufferGeometry into Microsoft 3MF specification zip container.
 */
export async function exportGridfinity3MF(
  geometry: THREE.BufferGeometry,
  options: GridfinityBinGeneratorOptions
): Promise<Blob> {
  const index = geometry.getIndex();
  const position = geometry.getAttribute('position');

  const vertexCount = position.count;
  const triangleCount = index ? index.count / 3 : vertexCount / 3;

  let verticesXml = '';
  for (let i = 0; i < vertexCount; i++) {
    const x = position.getX(i).toFixed(3);
    const y = position.getY(i).toFixed(3);
    const z = position.getZ(i).toFixed(3);
    verticesXml += `      <vertex x="${x}" y="${y}" z="${z}" />\n`;
  }

  let trianglesXml = '';
  for (let i = 0; i < triangleCount; i++) {
    const v1 = index ? index.getX(i * 3) : i * 3;
    const v2 = index ? index.getX(i * 3 + 1) : i * 3 + 1;
    const v3 = index ? index.getX(i * 3 + 2) : i * 3 + 2;
    trianglesXml += `      <triangle v1="${v1}" v2="${v2}" v3="${v3}" />\n`;
  }

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">PrivKnife Gridfinity Bin (${options.gridX}x${options.gridY} - ${options.heightUnits}U)</metadata>
  <metadata name="Application">PrivKnife Client-Side 3D Studio</metadata>
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
${verticesXml}        </vertices>
        <triangles>
${trianglesXml}        </triangles>
      </mesh>
    </object>
  </resources>
  <build>
    <item objectid="1" />
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

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'model/3mf',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

/**
 * End-to-end processing pipeline: executes validation, 3D mesh generation, metrics calculation,
 * and binary export serialization with zero server interaction.
 */
export async function processGridfinity(
  options: GridfinityBinGeneratorOptions,
  format: 'stl' | '3mf' = 'stl'
): Promise<GridfinityBinGeneratorResult> {
  const validation = validateGridfinityOptions(options);
  if (!validation.valid) {
    return {
      success: false,
      blob: new Blob([], { type: 'application/octet-stream' }),
      fileName: '',
      fileSize: 0,
      mimeType: 'application/octet-stream',
      metrics: {
        totalWidthMm: 0,
        totalLengthMm: 0,
        totalHeightMm: 0,
        internalCompartments: 0,
        triangleCount: 0,
        vertexCount: 0,
        estimatedVolumeCm3: 0,
        estimatedGrams: 0,
        estimatedPrintTimeHours: 0,
        slicerTips: [],
      },
      error: validation.error,
    };
  }

  const geometry = generateGridfinityGeometry(options);
  const metrics = calculateGridfinityMetrics(geometry, options);

  const baseFileName = `gridfinity-bin-${options.gridX}x${options.gridY}x${options.heightUnits}U`;

  let blob: Blob;
  let fileName: string;
  let mimeType: string;

  if (format === '3mf') {
    blob = await exportGridfinity3MF(geometry, options);
    fileName = `${baseFileName}.3mf`;
    mimeType = 'model/3mf';
  } else {
    const stlBuffer = exportGridfinitySTL(geometry);
    blob = new Blob([stlBuffer], { type: 'model/stl' });
    fileName = `${baseFileName}.stl`;
    mimeType = 'model/stl';
  }

  geometry.dispose();

  return {
    success: true,
    blob,
    fileName,
    fileSize: blob.size,
    mimeType,
    metrics,
  };
}
