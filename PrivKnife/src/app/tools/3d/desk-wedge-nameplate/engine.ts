import * as THREE from 'three';
import { Evaluator, Brush, SUBTRACTION } from 'three-bvh-csg';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import JSZip from 'jszip';
import {
  NameplateConfig,
  NameplateMetrics,
  TextAlignment,
} from './types';

// Standard 5x7 ASCII bitmap font glyphs for deterministic offline / headless text extrusion
const BITMAP_5X7: Record<string, number[]> = {
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
  '.': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04],
  ',': [0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x08],
  '-': [0x00, 0x00, 0x00, 0x1f, 0x00, 0x00, 0x00],
  '/': [0x01, 0x02, 0x04, 0x08, 0x10, 0x00, 0x00],
  ':': [0x00, 0x04, 0x00, 0x00, 0x04, 0x00, 0x00],
  '&': [0x08, 0x14, 0x14, 0x08, 0x15, 0x12, 0x0d],
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
};

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
 * Builds the parametric desk wedge solid base geometry.
 */
export function buildWedgeBaseGeometry(config: NameplateConfig): {
  wedgeGeom: THREE.BufferGeometry;
  faceMetrics: {
    faceCenter: THREE.Vector3;
    faceNormal: THREE.Vector3;
    faceAngleRad: number;
    faceLengthMm: number;
  };
} {
  const shape = new THREE.Shape();
  const d = config.baseDepthMm;
  const h = config.wedgeHeightMm;
  const lip = config.lipHeightMm;
  const top = config.topFlatMm;
  const w = config.wedgeWidthMm;

  // Profile in Z-Y space
  shape.moveTo(0, 0);
  shape.lineTo(d, 0); // Bottom base
  shape.lineTo(d, h); // Back vertical face
  shape.lineTo(d - top, h); // Top horizontal flat ledge
  shape.lineTo(0, lip); // Inclined front face
  shape.lineTo(0, 0); // Front vertical lip
  shape.closePath();

  // Extrude along depth (which will become Width)
  const wedgeGeom = new THREE.ExtrudeGeometry(shape, {
    depth: w,
    bevelEnabled: false,
  });

  // Re-orient: extrusion direction along X (-w/2 to +w/2)
  wedgeGeom.rotateY(Math.PI / 2);
  wedgeGeom.translate(-w / 2, 0, 0);
  wedgeGeom.computeBoundingBox();

  // Incline plane metrics
  const dx = d - top;
  const dy = h - lip;
  const faceLengthMm = Math.hypot(dx, dy);
  const faceAngleRad = Math.atan2(dy, dx); // Angle with horizontal

  // Normal to inclined face in 3D: (0, dx / len, -dy / len)
  const faceNormal = new THREE.Vector3(0, dx / faceLengthMm, -dy / faceLengthMm).normalize();

  // Center of inclined face
  const faceCenter = new THREE.Vector3(0, lip + dy / 2, dx / 2);

  return {
    wedgeGeom,
    faceMetrics: {
      faceCenter,
      faceNormal,
      faceAngleRad,
      faceLengthMm,
    },
  };
}

/**
 * Builds 3D extruded lettering using bitmap voxel font / canvas rasterization.
 */
export function build3dTextGeometry(
  text: string,
  fontSizeMm: number,
  depthMm: number,
  maxWidthMm: number,
  alignment: TextAlignment = 'center'
): THREE.BufferGeometry | null {
  if (!text || !text.trim()) return null;

  const cleanText = text.trim().toUpperCase();
  const glyphW = 5;
  const glyphH = 7;
  const glyphSpacing = 1;
  const totalCols = cleanText.length * (glyphW + glyphSpacing) - glyphSpacing;

  // Scale pixel so total glyph height is fontSizeMm, clamped by maxWidth
  let pixelMm = fontSizeMm / glyphH;
  if (totalCols * pixelMm > maxWidthMm * 0.92) {
    pixelMm = (maxWidthMm * 0.92) / totalCols;
  }

  const renderedW = totalCols * pixelMm;
  const renderedH = glyphH * pixelMm;

  let startX = -renderedW / 2;
  if (alignment === 'left') {
    startX = -maxWidthMm / 2 + 6;
  } else if (alignment === 'right') {
    startX = maxWidthMm / 2 - renderedW - 6;
  }

  interface BoxItem {
    cx: number;
    cy: number;
    cz: number;
    hx: number;
    hy: number;
    hz: number;
  }

  const boxes: BoxItem[] = [];

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const bitmap = BITMAP_5X7[char] || BITMAP_5X7[' '] || [0, 0, 0, 0, 0, 0, 0];
    const charStartX = startX + i * (glyphW + glyphSpacing) * pixelMm;

    for (let row = 0; row < glyphH; row++) {
      const rowBits = bitmap[row];
      let runStart = -1;

      for (let col = 0; col < glyphW; col++) {
        const bit = (rowBits >> (glyphW - 1 - col)) & 1;
        if (bit === 1) {
          if (runStart === -1) runStart = col;
        } else {
          if (runStart !== -1) {
            const runLen = col - runStart;
            const w = runLen * pixelMm;
            const h = pixelMm;
            const cx = charStartX + runStart * pixelMm + w / 2;
            const cy = (glyphH - 1 - row) * pixelMm - renderedH / 2 + h / 2;
            const cz = 0;
            boxes.push({ cx, cy, cz, hx: w / 2, hy: h / 2, hz: depthMm / 2 });
            runStart = -1;
          }
        }
      }

      if (runStart !== -1) {
        const runLen = glyphW - runStart;
        const w = runLen * pixelMm;
        const h = pixelMm;
        const cx = charStartX + runStart * pixelMm + w / 2;
        const cy = (glyphH - 1 - row) * pixelMm - renderedH / 2 + h / 2;
        const cz = 0;
        boxes.push({ cx, cy, cz, hx: w / 2, hy: h / 2, hz: depthMm / 2 });
      }
    }
  }

  if (boxes.length === 0) return null;

  const totalBoxes = boxes.length;
  const positions = new Float32Array(totalBoxes * 24 * 3);
  const normals = new Float32Array(totalBoxes * 24 * 3);
  const indices = new Uint32Array(totalBoxes * 36);

  for (let i = 0; i < totalBoxes; i++) {
    const b = boxes[i];
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
 * Builds the complete parametric desk wedge assembly (Base Wedge + 3D Inscription Text).
 * Supports Embossed relief and CSG Debossed recessed carving.
 */
export function buildNameplateAssembly(config: NameplateConfig): {
  wedgeGeom: THREE.BufferGeometry;
  textGeom: THREE.BufferGeometry;
  metrics: NameplateMetrics;
  combinedGroup: THREE.Group;
} {
  const { wedgeGeom, faceMetrics } = buildWedgeBaseGeometry(config);

  // Build Primary Line
  const primaryGeom = build3dTextGeometry(
    config.primaryText,
    config.primaryFontSizeMm,
    config.reliefDepthMm,
    config.wedgeWidthMm,
    config.textAlignment
  );

  let fullTextGeom: THREE.BufferGeometry | null = null;

  if (config.secondaryEnabled && config.secondaryText.trim()) {
    const secondaryGeom = build3dTextGeometry(
      config.secondaryText,
      config.secondaryFontSizeMm,
      config.reliefDepthMm,
      config.wedgeWidthMm,
      config.textAlignment
    );

    if (primaryGeom && secondaryGeom) {
      // Offset primary upwards, secondary downwards along Y in local face space
      const gap = 3;
      primaryGeom.translate(0, config.secondaryFontSizeMm / 2 + gap, 0);
      secondaryGeom.translate(0, -config.primaryFontSizeMm / 2 - gap, 0);
      fullTextGeom = mergeBufferGeometries([primaryGeom, secondaryGeom]);
    } else {
      fullTextGeom = primaryGeom || secondaryGeom;
    }
  } else {
    fullTextGeom = primaryGeom;
  }

  if (!fullTextGeom) {
    fullTextGeom = new THREE.BufferGeometry();
  }

  // Rotate text to align with the inclined face plane
  // Rotation angle: tilt back around X by -(90 - faceAngle)
  const rotAngleX = -((Math.PI / 2) - faceMetrics.faceAngleRad);
  fullTextGeom.rotateX(rotAngleX);

  // Position text onto the face plane
  const reliefOffset =
    config.textMode === 'embossed'
      ? config.reliefDepthMm * 0.45
      : -config.reliefDepthMm * 0.45;

  const targetPos = new THREE.Vector3()
    .copy(faceMetrics.faceCenter)
    .addScaledVector(faceMetrics.faceNormal, reliefOffset);

  fullTextGeom.translate(targetPos.x, targetPos.y, targetPos.z);
  fullTextGeom.computeBoundingBox();

  let finalWedgeGeom = wedgeGeom;

  // If debossed, execute CSG subtraction to carve letters into the wedge body
  if (config.textMode === 'debossed' && fullTextGeom.attributes['position']?.count > 0) {
    try {
      const b1 = new Brush(wedgeGeom);
      const b2 = new Brush(fullTextGeom);
      b1.updateMatrixWorld();
      b2.updateMatrixWorld();

      const evaluator = new Evaluator();
      const result = evaluator.evaluate(b1, b2, SUBTRACTION);
      if (result && result.geometry.attributes['position']?.count > 0) {
        finalWedgeGeom = result.geometry;
      }
    } catch {
      // Fallback to uncarved wedge if CSG fails on non-manifold vertex
      finalWedgeGeom = wedgeGeom;
    }
  }

  finalWedgeGeom.computeBoundingBox();

  // Metrics
  const box = finalWedgeGeom.boundingBox!;
  const dimensionsMm = {
    width: Number((box.max.x - box.min.x).toFixed(1)),
    height: Number((box.max.y - box.min.y).toFixed(1)),
    depth: Number((box.max.z - box.min.z).toFixed(1)),
  };

  const volumeCm3 = (dimensionsMm.width * dimensionsMm.depth * dimensionsMm.height * 0.5) / 1000;
  const estimatedFilamentGrams = Number(Math.max(15, volumeCm3 * 1.24 * 0.35).toFixed(1));
  const filamentSwapLayer = Math.max(1, Math.round(config.wedgeHeightMm / 0.2));

  // Visual Meshes
  const baseMat = new THREE.MeshStandardMaterial({
    color: config.baseColor,
    roughness: 0.35,
    metalness: 0.05,
  });

  const textMat = new THREE.MeshStandardMaterial({
    color: config.textColor,
    roughness: 0.25,
    metalness: 0.15,
  });

  const baseMesh = new THREE.Mesh(finalWedgeGeom, baseMat);
  baseMesh.name = 'wedge-base';

  const textMesh = new THREE.Mesh(fullTextGeom, textMat);
  textMesh.name = 'wedge-text';

  const combinedGroup = new THREE.Group();
  combinedGroup.add(baseMesh);
  combinedGroup.add(textMesh);

  // Center group for clean viewport viewing
  const centerY = (box.max.y + box.min.y) / 2;
  const centerZ = (box.max.z + box.min.z) / 2;
  combinedGroup.position.set(0, -centerY, -centerZ);

  return {
    wedgeGeom: finalWedgeGeom,
    textGeom: fullTextGeom,
    metrics: {
      dimensionsMm,
      inclineAngleDeg: Number(((faceMetrics.faceAngleRad * 180) / Math.PI).toFixed(1)),
      faceLengthMm: Number(faceMetrics.faceLengthMm.toFixed(1)),
      estimatedFilamentGrams,
      filamentSwapLayer,
    },
    combinedGroup,
  };
}

/**
 * Generates an OPC .3mf archive containing separate Base Wedge and Inscribed Text objects.
 */
export async function generateDualColor3mf(
  wedgeGeom: THREE.BufferGeometry,
  textGeom: THREE.BufferGeometry,
  config: NameplateConfig
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

    if (!pos || pos.count === 0) {
      return `      <mesh><vertices></vertices><triangles></triangles></mesh>`;
    }

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

  const baseXml = geomTo3mfXml(wedgeGeom);
  const textXml = geomTo3mfXml(textGeom);

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:m="http://schemas.microsoft.com/3dmanufacturing/material/2015/02">
  <metadata name="Title">Parametric Desk Wedge Nameplate</metadata>
  <metadata name="Designer">PrivKnife 3D Fabrication Suite</metadata>
  <resources>
    <m:colorgroup id="1">
      <m:color color="${config.baseColor.toUpperCase()}"/>
      <m:color color="${config.textColor.toUpperCase()}"/>
    </m:colorgroup>
    <object id="2" name="Wedge Base" type="model" pid="1" pindex="0">
${baseXml}
    </object>
    <object id="3" name="Nameplate Inscription" type="model" pid="1" pindex="1">
${textXml}
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
 * Exports unified and individual binary STL files.
 */
export function generateStlFiles(
  wedgeGeom: THREE.BufferGeometry,
  textGeom: THREE.BufferGeometry
): { unifiedStl: Blob; baseStl: Blob; textStl: Blob } {
  const exporter = new STLExporter();

  // Unified assembly
  const merged = mergeBufferGeometries([wedgeGeom, textGeom]);
  const unifiedData = exporter.parse(new THREE.Mesh(merged), { binary: true });
  const unifiedBuf = unifiedData instanceof DataView ? unifiedData.buffer : (unifiedData as unknown as ArrayBuffer);
  const unifiedStl = new Blob([unifiedBuf], { type: 'model/stl' });

  // Base only
  const baseData = exporter.parse(new THREE.Mesh(wedgeGeom), { binary: true });
  const baseBuf = baseData instanceof DataView ? baseData.buffer : (baseData as unknown as ArrayBuffer);
  const baseStl = new Blob([baseBuf], { type: 'model/stl' });

  // Text only
  const textData = exporter.parse(new THREE.Mesh(textGeom), { binary: true });
  const textBuf = textData instanceof DataView ? textData.buffer : (textData as unknown as ArrayBuffer);
  const textStl = new Blob([textBuf], { type: 'model/stl' });

  return { unifiedStl, baseStl, textStl };
}

/**
 * Packages all deliverables into a full .zip bundle.
 */
export async function generateNameplateZipBundle(
  wedgeGeom: THREE.BufferGeometry,
  textGeom: THREE.BufferGeometry,
  config: NameplateConfig,
  previewBlob?: Blob
): Promise<Blob> {
  const zip = new JSZip();

  // Dual-color 3MF
  const threeMfBlob = await generateDualColor3mf(wedgeGeom, textGeom, config);
  zip.file('desk_nameplate_dual_color.3mf', await threeMfBlob.arrayBuffer());

  // Individual STLs
  const { unifiedStl, baseStl, textStl } = generateStlFiles(wedgeGeom, textGeom);
  zip.file('desk_nameplate_unified.stl', await unifiedStl.arrayBuffer());
  zip.file('desk_nameplate_base.stl', await baseStl.arrayBuffer());
  zip.file('desk_nameplate_text.stl', await textStl.arrayBuffer());

  if (previewBlob) {
    zip.file('preview.png', await previewBlob.arrayBuffer());
  }

  const instructions = `=====================================================
PRIVKNIFE PARAMETRIC DESK WEDGE NAMEPLATE - PRINTING GUIDE
=====================================================
100% In-Browser 3D Fabrication • Zero Data Leaves Your Device

Nameplate Details:
- Dimensions: ${config.wedgeWidthMm} mm wide x ${config.wedgeHeightMm} mm high
- Base Depth: ${config.baseDepthMm} mm
- Primary Text: "${config.primaryText}"
- Secondary Text: "${config.secondaryEnabled ? config.secondaryText : 'None'}"
- Text Style: ${config.textMode.toUpperCase()} (${config.reliefDepthMm} mm)

RECOMMENDED SLICING SETTINGS:
1. Multi-Color (Bambu Lab AMS / Prusa MMU3):
   - Import "desk_nameplate_dual_color.3mf"
   - Assign Slot 1 to "Wedge Base" (${config.baseColor})
   - Assign Slot 2 to "Nameplate Inscription" (${config.textColor})
   - Layer Height: 0.20 mm
   - Wall Loops: 3 loops
   - Top Surface: Monotonic Line

2. Single Extruder (Print Standing Flat on Base):
   - Import "desk_nameplate_unified.stl"
   - Incline orientation: Model prints upright resting on its flat base.
=====================================================`;

  zip.file('README_3D_PRINTING.txt', instructions);

  const uint8 = await zip.generateAsync({ type: 'uint8array' });
  return new Blob([uint8.buffer as ArrayBuffer], { type: 'application/zip' });
}
