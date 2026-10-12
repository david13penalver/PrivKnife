import * as THREE from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import JSZip from 'jszip';
import {
  ContourData,
  CookieCutterConfig,
  ModelMetrics,
  Point2D,
  PresetShape,
} from './types';

/**
 * Computes the signed area of a 2D polygon.
 * Positive = Counter-Clockwise (CCW), Negative = Clockwise (CW).
 */
export function getSignedArea(poly: Point2D[]): number {
  let area = 0;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += poly[i].x * poly[j].y - poly[j].x * poly[i].y;
  }
  return area / 2;
}

/**
 * Ensures a polygon is oriented Counter-Clockwise (CCW).
 */
export function ensureCCW(poly: Point2D[]): Point2D[] {
  if (poly.length < 3) return poly;
  if (getSignedArea(poly) < 0) {
    return [...poly].reverse();
  }
  return [...poly];
}

/**
 * Calculates a parallel normal offset of a closed 2D polygon.
 * delta > 0 expands outwards; delta < 0 contracts inwards.
 */
export function offsetPolygon(poly: Point2D[], delta: number): Point2D[] {
  const n = poly.length;
  if (n < 3) return poly;

  const ccwPoly = ensureCCW(poly);
  const result: Point2D[] = [];

  for (let i = 0; i < n; i++) {
    const pPrev = ccwPoly[(i - 1 + n) % n];
    const pCurr = ccwPoly[i];
    const pNext = ccwPoly[(i + 1) % n];

    // Normalized incoming edge
    let e1x = pCurr.x - pPrev.x;
    let e1y = pCurr.y - pPrev.y;
    const len1 = Math.hypot(e1x, e1y) || 1;
    e1x /= len1;
    e1y /= len1;

    // Normalized outgoing edge
    let e2x = pNext.x - pCurr.x;
    let e2y = pNext.y - pCurr.y;
    const len2 = Math.hypot(e2x, e2y) || 1;
    e2x /= len2;
    e2y /= len2;

    // Outward normal in CCW is (ey, -ex)
    const n1x = e1y;
    const n1y = -e1x;
    const n2x = e2y;
    const n2y = -e2x;

    // Bisector normal
    let nx = (n1x + n2x) / 2;
    let ny = (n1y + n2y) / 2;
    const nLen = Math.hypot(nx, ny) || 1;
    nx /= nLen;
    ny /= nLen;

    // Miter limit to prevent self-intersection on acute corners
    const dot = n1x * nx + n1y * ny;
    const miter = delta / Math.max(0.25, dot);

    result.push({
      x: Number((pCurr.x + nx * miter).toFixed(3)),
      y: Number((pCurr.y + ny * miter).toFixed(3)),
    });
  }

  return result;
}

/**
 * Scales a polygon to match targetSizeMm on its maximum dimension, centered at (0, 0).
 */
export function scalePolygon(
  poly: Point2D[],
  targetSizeMm: number
): { scaled: Point2D[]; width: number; height: number; scaleFactor: number } {
  if (poly.length === 0) {
    return { scaled: [], width: 0, height: 0, scaleFactor: 1 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of poly) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const rawWidth = Math.max(1, maxX - minX);
  const rawHeight = Math.max(1, maxY - minY);
  const maxDim = Math.max(rawWidth, rawHeight);
  const scale = targetSizeMm / maxDim;

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const scaled = poly.map((p) => ({
    x: Number(((p.x - cx) * scale).toFixed(3)),
    y: Number(((p.y - cy) * scale).toFixed(3)),
  }));

  return {
    scaled,
    width: Number((rawWidth * scale).toFixed(1)),
    height: Number((rawHeight * scale).toFixed(1)),
    scaleFactor: scale,
  };
}

/**
 * Converts a polygon loop to a Three.js Shape.
 */
function polygonToShape(poly: Point2D[]): THREE.Shape {
  const shape = new THREE.Shape();
  if (poly.length === 0) return shape;

  shape.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) {
    shape.lineTo(poly[i].x, poly[i].y);
  }
  shape.closePath();
  return shape;
}

/**
 * Converts a polygon loop to a Three.js Path (for inner hole subtraction).
 */
function polygonToPath(poly: Point2D[]): THREE.Path {
  const path = new THREE.Path();
  if (poly.length === 0) return path;

  path.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) {
    path.lineTo(poly[i].x, poly[i].y);
  }
  path.closePath();
  return path;
}

/**
 * Merges an array of BufferGeometries into a single BufferGeometry.
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
 * Builds the 3D Cutter mesh:
 * - Sharp vertical blade wall of thickness bladeWallMm and height bladeHeightMm.
 * - Wide top press flange for ergonomic hand pressing without pain.
 */
export function buildCutterGeometry(
  outerContour: Point2D[],
  config: CookieCutterConfig
): THREE.BufferGeometry {
  const ccwContour = ensureCCW(outerContour);
  const bladeOuterPoly = offsetPolygon(ccwContour, config.bladeWallMm);
  const flangeOuterPoly = offsetPolygon(ccwContour, config.flangeWidthMm);

  // 1. Blade Wall extrusion
  const bladeShape = polygonToShape(bladeOuterPoly);
  bladeShape.holes.push(polygonToPath(ccwContour));

  const bladeGeom = new THREE.ExtrudeGeometry(bladeShape, {
    depth: config.bladeHeightMm,
    bevelEnabled: false,
  });

  // 2. Press Flange extrusion at the top of the blade
  const flangeShape = polygonToShape(flangeOuterPoly);
  flangeShape.holes.push(polygonToPath(ccwContour));

  const flangeGeom = new THREE.ExtrudeGeometry(flangeShape, {
    depth: config.flangeThicknessMm,
    bevelEnabled: false,
  });

  // Position flange at top rim
  flangeGeom.translate(0, 0, config.bladeHeightMm - config.flangeThicknessMm);

  const fullCutter = mergeBufferGeometries([bladeGeom, flangeGeom]);
  fullCutter.computeBoundingBox();
  return fullCutter;
}

/**
 * Builds the 3D Impression Stamp mesh:
 * - Solid backing plate sized to glide smoothly inside the cutter with clearance tolerance.
 * - Embossed detail line ribs.
 * - Ergonomic rear pull knob handle.
 */
export function buildStampGeometry(
  outerContour: Point2D[],
  innerDetails: Point2D[][],
  config: CookieCutterConfig
): THREE.BufferGeometry {
  const ccwContour = ensureCCW(outerContour);
  // Inward offset plate for clearance
  const stampOutline = offsetPolygon(ccwContour, -config.stampClearanceMm);
  const geomsToMerge: THREE.BufferGeometry[] = [];

  // 1. Backing base plate
  const baseShape = polygonToShape(stampOutline);
  const baseGeom = new THREE.ExtrudeGeometry(baseShape, {
    depth: config.stampBaseThicknessMm,
    bevelEnabled: false,
  });
  geomsToMerge.push(baseGeom);

  // 2. Embossed detail ribs on front of stamp
  const detailZ = config.stampBaseThicknessMm;
  const detailRibThickness = 1.2;

  for (const detail of innerDetails) {
    if (detail.length >= 3) {
      // Closed loop impression
      const detailShape = polygonToShape(detail);
      const detailGeom = new THREE.ExtrudeGeometry(detailShape, {
        depth: config.stampDetailHeightMm,
        bevelEnabled: false,
      });
      detailGeom.translate(0, 0, detailZ);
      geomsToMerge.push(detailGeom);
    } else if (detail.length === 2) {
      // Linear rib line
      const p1 = detail[0];
      const p2 = detail[1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const angle = Math.atan2(dy, dx);

      const rib = new THREE.BoxGeometry(len, detailRibThickness, config.stampDetailHeightMm);
      rib.rotateZ(angle);
      rib.translate((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, detailZ + config.stampDetailHeightMm / 2);
      geomsToMerge.push(rib);
    }
  }

  // 3. Ergonomic Rear Grip Handle Knob
  if (config.stampHandleEnabled) {
    const handleDiameter = 16;
    const handleHeight = 12;
    const handleGeom = new THREE.CylinderGeometry(
      handleDiameter / 2,
      handleDiameter / 2.4,
      handleHeight,
      24
    );
    // Cylinder is aligned along Y by default, rotate to Z
    handleGeom.rotateX(Math.PI / 2);
    // Position on the back side of the stamp plate (Z <= 0)
    handleGeom.translate(0, 0, -handleHeight / 2);
    geomsToMerge.push(handleGeom);
  }

  const fullStamp = mergeBufferGeometries(geomsToMerge);
  fullStamp.computeBoundingBox();
  return fullStamp;
}

/**
 * Traces 2D boundary contours from an image via thresholding and marching squares.
 */
export function traceImageContours(
  imageData: ImageData | null,
  threshold: number,
  invert: boolean
): ContourData {
  if (!imageData) {
    // Fallback circular cookie contour if no image is present
    const circlePts: Point2D[] = [];
    const steps = 36;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      circlePts.push({
        x: Math.cos(angle) * 35,
        y: Math.sin(angle) * 35,
      });
    }
    return {
      outerContour: circlePts,
      innerContours: [],
      bounds: { minX: -35, maxX: 35, minY: -35, maxY: 35, width: 70, height: 70 },
    };
  }

  const { width, height, data } = imageData;
  const binary = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const a = data[i * 4 + 3];

    // Transparent pixels treated as white background
    const brightness = a < 50 ? 255 : (r * 0.299 + g * 0.587 + b * 0.114);
    const isDark = brightness < threshold;
    binary[i] = invert ? (isDark ? 0 : 1) : (isDark ? 1 : 0);
  }

  // Simple outer perimeter boundary scan
  const boundaryPoints: Point2D[] = [];
  const step = Math.max(2, Math.floor(Math.min(width, height) / 60));

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (binary[y * width + x] === 1) {
        // Check if edge pixel (neighbor is 0)
        const isEdge =
          x === 0 ||
          x >= width - step ||
          y === 0 ||
          y >= height - step ||
          binary[y * width + (x - 1)] === 0 ||
          binary[y * width + (x + 1)] === 0 ||
          binary[(y - 1) * width + x] === 0 ||
          binary[(y + 1) * width + x] === 0;

        if (isEdge) {
          boundaryPoints.push({
            x: x - width / 2,
            y: height / 2 - y,
          });
        }
      }
    }
  }

  if (boundaryPoints.length < 8) {
    // Fallback ellipse
    const ellipsePts: Point2D[] = [];
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      ellipsePts.push({ x: Math.cos(a) * 35, y: Math.sin(a) * 35 });
    }
    return {
      outerContour: ellipsePts,
      innerContours: [],
      bounds: { minX: -35, maxX: 35, minY: -35, maxY: 35, width: 70, height: 70 },
    };
  }

  // Sort boundary points radially around centroid
  let cx = 0;
  let cy = 0;
  for (const p of boundaryPoints) {
    cx += p.x;
    cy += p.y;
  }
  cx /= boundaryPoints.length;
  cy /= boundaryPoints.length;

  boundaryPoints.sort((a, b) => {
    const angA = Math.atan2(a.y - cy, a.x - cx);
    const angB = Math.atan2(b.y - cy, b.x - cx);
    return angA - angB;
  });

  // Downsample to clean loop of ~48 points
  const sampled: Point2D[] = [];
  const skip = Math.max(1, Math.floor(boundaryPoints.length / 48));
  for (let i = 0; i < boundaryPoints.length; i += skip) {
    sampled.push(boundaryPoints[i]);
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of sampled) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  return {
    outerContour: sampled,
    innerContours: [],
    bounds: { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY },
  };
}

/**
 * Builds the complete dual-part assembly (Cutter + Stamp) with materials and metrics.
 */
export function buildCookieCutterAssembly(
  preset: PresetShape | ContourData,
  config: CookieCutterConfig
): {
  cutterGeom: THREE.BufferGeometry;
  stampGeom: THREE.BufferGeometry;
  metrics: ModelMetrics;
  combinedGroup: THREE.Group;
} {
  const outerRaw = preset.outerContour;
  const innerRaw =
    'innerDetails' in preset
      ? preset.innerDetails
      : 'innerContours' in preset
        ? (preset as ContourData).innerContours
        : [];

  // Scale outer contour
  const { scaled: scaledOuter, scaleFactor } = scalePolygon(outerRaw, config.targetSizeMm);

  // Scale inner details using same scale factor
  const scaledInner = innerRaw.map((loop) =>
    loop.map((p) => ({
      x: Number((p.x * scaleFactor).toFixed(3)),
      y: Number((p.y * scaleFactor).toFixed(3)),
    }))
  );

  const cutterGeom = buildCutterGeometry(scaledOuter, config);
  const stampGeom = buildStampGeometry(scaledOuter, scaledInner, config);

  cutterGeom.computeBoundingBox();
  stampGeom.computeBoundingBox();

  const cBox = cutterGeom.boundingBox!;
  const sBox = stampGeom.boundingBox!;

  const cutterDim = {
    width: Number((cBox.max.x - cBox.min.x).toFixed(1)),
    height: Number((cBox.max.y - cBox.min.y).toFixed(1)),
    depth: Number((cBox.max.z - cBox.min.z).toFixed(1)),
  };

  const stampDim = {
    width: Number((sBox.max.x - sBox.min.x).toFixed(1)),
    height: Number((sBox.max.y - sBox.min.y).toFixed(1)),
    depth: Number((sBox.max.z - sBox.min.z).toFixed(1)),
  };

  // Rough PLA filament estimation (density ~1.24 g/cm³)
  const estVolumeCm3 =
    (cutterDim.width * config.bladeWallMm * 2 * config.bladeHeightMm +
      stampDim.width * stampDim.height * config.stampBaseThicknessMm * 0.4) /
    1000;
  const estimatedFilamentGrams = Number(Math.max(8, estVolumeCm3 * 1.24).toFixed(1));

  // Materials and group
  const cutterMaterial = new THREE.MeshStandardMaterial({
    color: config.cutterColor,
    roughness: 0.35,
    metalness: 0.05,
  });

  const stampMaterial = new THREE.MeshStandardMaterial({
    color: config.stampColor,
    roughness: 0.4,
    metalness: 0.05,
  });

  const cutterMesh = new THREE.Mesh(cutterGeom, cutterMaterial);
  cutterMesh.name = 'cutter';

  const stampMesh = new THREE.Mesh(stampGeom, stampMaterial);
  stampMesh.name = 'stamp';

  const combinedGroup = new THREE.Group();
  combinedGroup.add(cutterMesh);
  combinedGroup.add(stampMesh);

  return {
    cutterGeom,
    stampGeom,
    metrics: {
      cutterDimensionsMm: cutterDim,
      stampDimensionsMm: stampDim,
      estimatedFilamentGrams,
      outerVertexCount: scaledOuter.length,
      innerDetailLoops: scaledInner.length,
    },
    combinedGroup,
  };
}

/**
 * Serializes the cutter and stamp into a multi-part .3mf archive.
 */
export async function generateDualPart3mf(
  cutterGeom: THREE.BufferGeometry,
  stampGeom: THREE.BufferGeometry,
  config: CookieCutterConfig
): Promise<Blob> {
  const zip = new JSZip();

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`
  );

  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`
  );

  function geomTo3mfXml(geom: THREE.BufferGeometry): string {
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

  const cutterXml = geomTo3mfXml(cutterGeom);
  const stampXml = geomTo3mfXml(stampGeom);

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
  <metadata name="Title">Cookie Cutter &amp; Stamp Set</metadata>
  <metadata name="Designer">PrivKnife Client-Side 3D Fabrication</metadata>
  <resources>
    <m:colorgroup id="1">
      <m:color color="${config.cutterColor.toUpperCase()}"/>
      <m:color color="${config.stampColor.toUpperCase()}"/>
    </m:colorgroup>
    <object id="2" name="Cutting Blade" type="model" pid="1" pindex="0">
${cutterXml}
    </object>
    <object id="3" name="Impression Stamp" type="model" pid="1" pindex="1">
${stampXml}
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
 * Generates single-part and combined STL files.
 */
export function generateStlFiles(
  cutterGeom: THREE.BufferGeometry,
  stampGeom: THREE.BufferGeometry
): { unifiedStl: Blob; cutterStl: Blob; stampStl: Blob } {
  const exporter = new STLExporter();

  // Unified assembly
  const merged = mergeBufferGeometries([cutterGeom, stampGeom]);
  const unifiedData = exporter.parse(new THREE.Mesh(merged), { binary: true });
  const unifiedBuf = unifiedData instanceof DataView ? unifiedData.buffer : (unifiedData as unknown as ArrayBuffer);
  const unifiedStl = new Blob([unifiedBuf], { type: 'model/stl' });

  // Cutter only
  const cutterData = exporter.parse(new THREE.Mesh(cutterGeom), { binary: true });
  const cutterBuf = cutterData instanceof DataView ? cutterData.buffer : (cutterData as unknown as ArrayBuffer);
  const cutterStl = new Blob([cutterBuf], { type: 'model/stl' });

  // Stamp only
  const stampData = exporter.parse(new THREE.Mesh(stampGeom), { binary: true });
  const stampBuf = stampData instanceof DataView ? stampData.buffer : (stampData as unknown as ArrayBuffer);
  const stampStl = new Blob([stampBuf], { type: 'model/stl' });

  return { unifiedStl, cutterStl, stampStl };
}

/**
 * Packages all export deliverables into a complete .zip download.
 */
export async function generateCutterZipBundle(
  cutterGeom: THREE.BufferGeometry,
  stampGeom: THREE.BufferGeometry,
  config: CookieCutterConfig,
  previewBlob?: Blob
): Promise<Blob> {
  const zip = new JSZip();

  // 3MF
  const threeMfBlob = await generateDualPart3mf(cutterGeom, stampGeom, config);
  zip.file('cookie_cutter_set_dual_part.3mf', await threeMfBlob.arrayBuffer());

  // Individual STLs
  const { cutterStl, stampStl, unifiedStl } = generateStlFiles(cutterGeom, stampGeom);
  zip.file('cookie_cutter_blade.stl', await cutterStl.arrayBuffer());
  zip.file('cookie_cutter_stamp.stl', await stampStl.arrayBuffer());
  zip.file('cookie_cutter_assembly.stl', await unifiedStl.arrayBuffer());

  if (previewBlob) {
    zip.file('preview.png', await previewBlob.arrayBuffer());
  }

  const instructions = `=====================================================
PRIVKNIFE CUSTOM COOKIE CUTTER & STAMP - 3D PRINTING GUIDE
=====================================================
100% In-Browser 3D Fabrication • Zero Data Leaves Your Device

Cutter Specifications:
- Target Dimensions: ${config.targetSizeMm} mm
- Blade Height: ${config.bladeHeightMm} mm
- Blade Wall Thickness: ${config.bladeWallMm} mm
- Press Flange Width: ${config.flangeWidthMm} mm
- Stamp Clearance Gap: ${config.stampClearanceMm} mm

RECOMMENDED SLICER SETTINGS:
1. Material: Food-Safe PLA or PETG (Certified food contact filament recommended).
2. Layer Height: 0.20 mm (0.16 mm for smoother cutting edge).
3. Wall Loops / Perimeters: 3–4 loops (Ensures solid cutting blade walls without infill gaps).
4. Top/Bottom Shells: 4 layers.
5. Infill: 20% Gyroid or Grid.

FOOD SAFETY & WASHING TIPS:
- Wash thoroughly by hand with lukewarm soapy water before and after use.
- Do NOT wash in high-temperature dishwashers (PLA warps above 55°C).
- Use food-safe epoxy coating if reusing frequently for commercial confectionery.
=====================================================`;

  zip.file('README_3D_PRINTING.txt', instructions);

  const uint8 = await zip.generateAsync({ type: 'uint8array' });
  return new Blob([uint8.buffer as ArrayBuffer], { type: 'application/zip' });
}
