import * as THREE from 'three';
import JSZip from 'jszip';
import {
  HolderStyle,
  PegboardSystem,
  PresetHolder,
  SkadisPegboardMakerOptions,
  SkadisPegboardMakerResult,
  SkadisPegboardMetrics,
} from './types';

/**
 * Validates IKEA Skadis & Pegboard generator options.
 */
export function validateSkadisOptions(options: SkadisPegboardMakerOptions): {
  valid: boolean;
  error?: string;
} {
  if (!options) {
    return { valid: false, error: 'Options are required' };
  }

  if (
    typeof options.hookLengthMm !== 'number' ||
    options.hookLengthMm < 10 ||
    options.hookLengthMm > 250
  ) {
    return { valid: false, error: 'Hook length must be between 10 and 250 mm' };
  }

  if (
    typeof options.hookAngleDeg !== 'number' ||
    options.hookAngleDeg < -10 ||
    options.hookAngleDeg > 45
  ) {
    return { valid: false, error: 'Hook angle must be between -10 and 45 degrees' };
  }

  if (
    typeof options.lipHeightMm !== 'number' ||
    options.lipHeightMm < 0 ||
    options.lipHeightMm > 40
  ) {
    return { valid: false, error: 'Lip height must be between 0 and 40 mm' };
  }

  if (
    typeof options.bracketWidthMm !== 'number' ||
    options.bracketWidthMm < 15 ||
    options.bracketWidthMm > 200
  ) {
    return { valid: false, error: 'Bracket width must be between 15 and 200 mm' };
  }

  if (
    typeof options.toolDiameterMm !== 'number' ||
    options.toolDiameterMm < 6 ||
    options.toolDiameterMm > 120
  ) {
    return { valid: false, error: 'Tool diameter must be between 6 and 120 mm' };
  }

  return { valid: true };
}

/**
 * Creates a hollow cylinder or cup geometry extruded along Y (centered at origin).
 */
export function createHollowCylinderGeometry(
  outerR: number,
  innerR: number,
  height: number,
  bottomThickness = 0,
  segments = 32
): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const wallHeight = height - bottomThickness;

  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: wallHeight,
    bevelEnabled: false,
    curveSegments: segments,
  };
  const tube = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  tube.translate(0, 0, -wallHeight / 2);
  tube.rotateX(Math.PI / 2);
  tube.computeVertexNormals();

  if (bottomThickness > 0) {
    tube.translate(0, bottomThickness / 2, 0);
    parts.push(tube);

    const bottomDisc = new THREE.CylinderGeometry(outerR, outerR, bottomThickness, segments);
    bottomDisc.translate(0, -height / 2 + bottomThickness / 2, 0);
    parts.push(bottomDisc);

    const merged = mergeBufferGeometries(parts);
    for (const p of parts) p.dispose();
    return merged;
  }

  return tube;
}

/**
 * Merges multiple BufferGeometries into a single BufferGeometry.
 */
export function mergeBufferGeometries(
  geometries: THREE.BufferGeometry[]
): THREE.BufferGeometry {
  const valid = geometries.filter(
    (g) => g && g.attributes['position'] && g.attributes['position'].count > 0
  );
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
  merged.computeVertexNormals();
  merged.computeBoundingBox();
  return merged;
}

/**
 * Builds the mounting prongs for the selected pegboard system:
 * - ikea_skadis: Oval slot L-hook + lower stabilizer peg (40mm vertical spacing)
 * - standard_pegboard_1_inch: 1/4" round prongs (25.4mm spacing)
 * - standard_pegboard_half_inch: 1/8" round prongs (12.7mm spacing)
 */
function createMountingProngsGeometry(
  system: PegboardSystem,
  bracketWidthMm: number
): { prongsGeom: THREE.BufferGeometry; prongCount: number } {
  const parts: THREE.BufferGeometry[] = [];
  let prongCount = 0;

  // Determine horizontal column count and spacing
  let colOffsets: number[] = [0];
  if (system === 'ikea_skadis') {
    if (bracketWidthMm >= 60) {
      colOffsets = [-20, 20]; // 40mm horizontal spacing
    }
  } else if (system === 'standard_pegboard_1_inch') {
    if (bracketWidthMm >= 48) {
      colOffsets = [-12.7, 12.7]; // 25.4mm (1") horizontal spacing
    }
  } else {
    if (bracketWidthMm >= 24) {
      colOffsets = [-6.35, 6.35]; // 12.7mm (0.5") horizontal spacing
    }
  }

  for (const zOffset of colOffsets) {
    if (system === 'ikea_skadis') {
      // Top L-hook prong
      // Neck penetrating backward through 5mm board
      const neck = new THREE.BoxGeometry(7, 9, 4.4);
      neck.translate(-3.5, 40, zOffset);
      parts.push(neck);

      // Downward locking tooth behind the board
      const tooth = new THREE.BoxGeometry(3.5, 6, 4.4);
      tooth.translate(-6.5, 34, zOffset);
      parts.push(tooth);

      // Lower stabilizer bumper pin (40mm below top hook, Y = 0)
      const btmPin = new THREE.BoxGeometry(6, 6, 4.4);
      btmPin.translate(-3, 0, zOffset);
      parts.push(btmPin);

      prongCount += 2;
    } else if (system === 'standard_pegboard_1_inch') {
      // 1/4" (6.35mm) hole system with 25.4mm vertical spacing
      const pinRadius = 2.9; // fits 6.35mm hole with 0.55mm clearance
      // Top pin
      const topNeck = new THREE.CylinderGeometry(pinRadius, pinRadius, 8, 16);
      topNeck.rotateZ(Math.PI / 2);
      topNeck.translate(-4, 25.4, zOffset);
      parts.push(topNeck);

      // Upward catch tooth
      const topCatch = new THREE.CylinderGeometry(pinRadius, pinRadius, 6, 16);
      topCatch.translate(-7, 28, zOffset);
      parts.push(topCatch);

      // Lower pin (at Y = 0)
      const btmNeck = new THREE.CylinderGeometry(pinRadius, pinRadius, 7, 16);
      btmNeck.rotateZ(Math.PI / 2);
      btmNeck.translate(-3.5, 0, zOffset);
      parts.push(btmNeck);

      prongCount += 2;
    } else {
      // 1/8" (3.175mm) hole system with 12.7mm vertical spacing
      const pinRadius = 1.45;
      const topNeck = new THREE.CylinderGeometry(pinRadius, pinRadius, 6, 16);
      topNeck.rotateZ(Math.PI / 2);
      topNeck.translate(-3, 12.7, zOffset);
      parts.push(topNeck);

      const topCatch = new THREE.CylinderGeometry(pinRadius, pinRadius, 4, 16);
      topCatch.translate(-5, 14.5, zOffset);
      parts.push(topCatch);

      const btmNeck = new THREE.CylinderGeometry(pinRadius, pinRadius, 5, 16);
      btmNeck.rotateZ(Math.PI / 2);
      btmNeck.translate(-2.5, 0, zOffset);
      parts.push(btmNeck);

      prongCount += 2;
    }
  }

  const merged = mergeBufferGeometries(parts);
  for (const p of parts) p.dispose();

  return { prongsGeom: merged, prongCount };
}

/**
 * Builds the front cantilever holder / accessory:
 * - single_hook: angled cantilever with front lip and optional reinforcement rib
 * - dual_prong: two parallel prongs for pliers / hammers
 * - shelf_bracket: flat horizontal ledge with 45° diagonal truss
 * - tool_holster: slotted cradle for calipers or screwdrivers
 * - cylinder_cup: cylindrical container cup for pens or tools
 */
function createHolderFrontGeometry(options: SkadisPegboardMakerOptions): THREE.BufferGeometry {
  const {
    holderStyle,
    hookLengthMm,
    hookAngleDeg,
    lipHeightMm,
    bracketWidthMm,
    toolDiameterMm,
    reinforceRib,
  } = options;

  const parts: THREE.BufferGeometry[] = [];
  const baseThick = 4.0;

  // Faceplate that rests against the front surface of the pegboard (X from 0 to baseThick)
  let plateHeight = 52;
  if (options.pegboardSystem === 'ikea_skadis') plateHeight = 56;
  else if (options.pegboardSystem === 'standard_pegboard_1_inch') plateHeight = 42;
  else plateHeight = 28;

  const facePlate = new THREE.BoxGeometry(baseThick, plateHeight, bracketWidthMm);
  facePlate.translate(baseThick / 2, plateHeight / 2 - 6, 0);
  parts.push(facePlate);

  switch (holderStyle) {
    case 'single_hook': {
      // Main cantilever arm
      const armLength = hookLengthMm;
      const armThick = 6.0;
      const armWidth = Math.min(14, bracketWidthMm * 0.7);

      const arm = new THREE.BoxGeometry(armLength, armThick, armWidth);
      arm.translate(armLength / 2, 0, 0);

      // Apply upward tilt angle
      const angleRad = (hookAngleDeg * Math.PI) / 180;
      arm.rotateZ(angleRad);
      arm.translate(baseThick, 15, 0);
      parts.push(arm);

      // Upward retention lip at tip
      const lip = new THREE.BoxGeometry(5.0, lipHeightMm, armWidth);
      const tipX = baseThick + armLength * Math.cos(angleRad);
      const tipY = 15 + armLength * Math.sin(angleRad) + lipHeightMm / 2 - armThick / 2;
      lip.translate(tipX, tipY, 0);
      parts.push(lip);

      // Reinforcement gusset rib underneath
      if (reinforceRib) {
        const ribLen = Math.min(armLength * 0.75, 35);
        const ribHeight = Math.min(plateHeight * 0.45, 20);
        const ribBox = new THREE.BoxGeometry(ribLen, ribHeight, 4.0);
        ribBox.rotateZ(-Math.PI / 4);
        ribBox.translate(baseThick + ribLen * 0.3, 15 - ribHeight * 0.4, 0);
        parts.push(ribBox);
      }
      break;
    }

    case 'dual_prong': {
      const armLength = hookLengthMm;
      const armThick = 6.0;
      const armWidth = 7.0;
      const spacing = bracketWidthMm * 0.65;
      const angleRad = (hookAngleDeg * Math.PI) / 180;

      for (const zSide of [-spacing / 2, spacing / 2]) {
        const arm = new THREE.BoxGeometry(armLength, armThick, armWidth);
        arm.translate(armLength / 2, 0, 0);
        arm.rotateZ(angleRad);
        arm.translate(baseThick, 15, zSide);
        parts.push(arm);

        const lip = new THREE.BoxGeometry(5.0, lipHeightMm, armWidth);
        const tipX = baseThick + armLength * Math.cos(angleRad);
        const tipY = 15 + armLength * Math.sin(angleRad) + lipHeightMm / 2 - armThick / 2;
        lip.translate(tipX, tipY, zSide);
        parts.push(lip);

        if (reinforceRib) {
          const ribBox = new THREE.BoxGeometry(20, 16, 3.5);
          ribBox.rotateZ(-Math.PI / 4);
          ribBox.translate(baseThick + 7, 10, zSide);
          parts.push(ribBox);
        }
      }
      break;
    }

    case 'shelf_bracket': {
      // Horizontal shelf support shelf
      const shelfDepth = hookLengthMm;
      const shelfThick = 5.0;
      const shelfLedge = new THREE.BoxGeometry(shelfDepth, shelfThick, bracketWidthMm);
      shelfLedge.translate(baseThick + shelfDepth / 2, 25, 0);
      parts.push(shelfLedge);

      // Front retention edge lip
      const shelfLip = new THREE.BoxGeometry(5.0, lipHeightMm, bracketWidthMm);
      shelfLip.translate(baseThick + shelfDepth, 25 + lipHeightMm / 2 - shelfThick / 2, 0);
      parts.push(shelfLip);

      // Diagonal 45-degree truss support gusset
      if (reinforceRib) {
        const braceLen = Math.min(shelfDepth * 0.9, 45);
        const brace = new THREE.BoxGeometry(braceLen * 1.3, 4.5, bracketWidthMm * 0.6);
        brace.rotateZ(-Math.PI / 4);
        brace.translate(baseThick + braceLen * 0.45, 25 - braceLen * 0.45, 0);
        parts.push(brace);
      }
      break;
    }

    case 'tool_holster': {
      // Slotted circular or rectangular cradle holster for calipers or screwdrivers
      const outerR = toolDiameterMm / 2 + 4;
      const innerR = toolDiameterMm / 2;
      const holsterHeight = 18;

      const ring = createHollowCylinderGeometry(outerR, innerR, holsterHeight, 0, 32);
      const holsterCenterX = baseThick + outerR + 4;
      ring.translate(holsterCenterX, 20, 0);
      parts.push(ring);

      // Connecting neck from plate to holster
      const neck = new THREE.BoxGeometry(outerR + 4, 8, bracketWidthMm * 0.6);
      neck.translate(baseThick + (outerR + 4) / 2, 20, 0);
      parts.push(neck);

      if (reinforceRib) {
        const rib = new THREE.BoxGeometry((outerR + 4) * 0.8, 12, 4);
        rib.translate(baseThick + (outerR + 4) * 0.4, 20 - 6, 0);
        parts.push(rib);
      }
      break;
    }

    case 'cylinder_cup': {
      // Cylindrical pen/parts cup
      const cupHeight = hookLengthMm;
      const cupOuterR = toolDiameterMm / 2 + 3;
      const cupInnerR = toolDiameterMm / 2;

      // Outer cup cylinder with 3.0mm closed bottom floor
      const cupGeom = createHollowCylinderGeometry(cupOuterR, cupInnerR, cupHeight, 3.0, 32);
      const cupCenterX = baseThick + cupOuterR + 4;
      cupGeom.translate(cupCenterX, cupHeight / 2, 0);
      parts.push(cupGeom);

      // Sturdy attachment neck to faceplate
      const cupNeck = new THREE.BoxGeometry(cupOuterR + 4, cupHeight * 0.7, bracketWidthMm * 0.65);
      cupNeck.translate(baseThick + (cupOuterR + 4) / 2, cupHeight * 0.5, 0);
      parts.push(cupNeck);

      if (reinforceRib) {
        const rib = new THREE.BoxGeometry((cupOuterR + 4) * 0.8, 12, 4);
        rib.translate(baseThick + (cupOuterR + 4) * 0.4, cupHeight * 0.15, 0);
        parts.push(rib);
      }
      break;
    }
  }

  const merged = mergeBufferGeometries(parts);
  for (const p of parts) p.dispose();

  return merged;
}

/**
 * Creates the separate snap-in locking wedge clip for IKEA Skådis.
 */
function createLockingWedgeGeometry(options: SkadisPegboardMakerOptions): THREE.BufferGeometry {
  if (!options.lockingWedge || options.pegboardSystem !== 'ikea_skadis') {
    const empty = new THREE.BufferGeometry();
    empty.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
    return empty;
  }

  const parts: THREE.BufferGeometry[] = [];
  // Small wedge block with thumb tab that slides into the Skådis slot
  const body = new THREE.BoxGeometry(4.2, 12, 4.4);
  body.translate(0, 6, 0);
  parts.push(body);

  // Retaining clip tooth
  const tooth = new THREE.BoxGeometry(2.5, 3, 4.4);
  tooth.translate(2.5, 8, 0);
  parts.push(tooth);

  // Pull tab head
  const head = new THREE.BoxGeometry(8, 4, 7);
  head.translate(0, 13, 0);
  parts.push(head);

  const merged = mergeBufferGeometries(parts);
  for (const p of parts) p.dispose();

  // Position wedge nearby for assembly preview or print layout
  merged.translate(0, 0, 0);
  return merged;
}

/**
 * Creates a combined print bed layout geometry:
 * - Hook lying flat on its side (optimal layer line orientation so prongs do not snap under load)
 * - Locking wedge lying flat beside the hook
 */
function createCombinedPrintBedGeometry(
  holderGeom: THREE.BufferGeometry,
  wedgeGeom: THREE.BufferGeometry,
  options: SkadisPegboardMakerOptions
): THREE.BufferGeometry {
  const holderClone = holderGeom.clone();
  holderClone.computeBoundingBox();

  // Rotate holder onto its side (rotate X by 90 degrees) for print bed orientation
  holderClone.rotateX(Math.PI / 2);
  holderClone.computeBoundingBox();
  if (holderClone.boundingBox) {
    holderClone.translate(
      -holderClone.boundingBox.min.x,
      -holderClone.boundingBox.min.y,
      -holderClone.boundingBox.min.z
    );
  }

  const geomsToMerge: THREE.BufferGeometry[] = [holderClone];

  if (
    options.lockingWedge &&
    wedgeGeom.attributes['position'] &&
    wedgeGeom.attributes['position'].count > 0
  ) {
    const wedgeClone = wedgeGeom.clone();
    wedgeClone.computeBoundingBox();
    if (wedgeClone.boundingBox && holderClone.boundingBox) {
      wedgeClone.translate(
        -wedgeClone.boundingBox.min.x + holderClone.boundingBox.max.x + 15,
        -wedgeClone.boundingBox.min.y,
        -wedgeClone.boundingBox.min.z
      );
    }
    geomsToMerge.push(wedgeClone);
  }

  const combined = mergeBufferGeometries(geomsToMerge);
  holderClone.dispose();
  return combined;
}

/**
 * Generates separate and combined 3D BufferGeometries for the pegboard holder and locking wedge.
 */
export function generateSkadisGeometries(options: SkadisPegboardMakerOptions): {
  holderGeometry: THREE.BufferGeometry;
  lockingWedgeGeometry: THREE.BufferGeometry;
  combinedGeometry: THREE.BufferGeometry;
  prongCount: number;
} {
  const { prongsGeom, prongCount } = createMountingProngsGeometry(
    options.pegboardSystem,
    options.bracketWidthMm
  );
  const frontGeom = createHolderFrontGeometry(options);
  const holderGeometry = mergeBufferGeometries([frontGeom, prongsGeom]);

  prongsGeom.dispose();
  frontGeom.dispose();

  const lockingWedgeGeometry = createLockingWedgeGeometry(options);
  const combinedGeometry = createCombinedPrintBedGeometry(
    holderGeometry,
    lockingWedgeGeometry,
    options
  );

  return {
    holderGeometry,
    lockingWedgeGeometry,
    combinedGeometry,
    prongCount,
  };
}

/**
 * Calculates physical dimensions, print weight, and slicer recommendations.
 */
export function calculateSkadisMetrics(
  holderGeom: THREE.BufferGeometry,
  wedgeGeom: THREE.BufferGeometry,
  options: SkadisPegboardMakerOptions
): SkadisPegboardMetrics {
  holderGeom.computeBoundingBox();
  const box = holderGeom.boundingBox || new THREE.Box3();
  const size = new THREE.Vector3();
  box.getSize(size);

  const hTris = holderGeom.index
    ? holderGeom.index.count / 3
    : holderGeom.getAttribute('position').count / 3;
  const wTris =
    options.lockingWedge && wedgeGeom.getAttribute('position')
      ? wedgeGeom.index
        ? wedgeGeom.index.count / 3
        : wedgeGeom.getAttribute('position').count / 3
      : 0;

  const totalTris = Math.round(hTris + wTris);

  // Approximate filament weight (g) assuming PLA/PETG density 1.25 g/cm3 with 35% infill
  const approxVolumeMm3 =
    options.hookLengthMm * 8 * 10 +
    options.bracketWidthMm * 50 * 4 +
    (options.holderStyle === 'cylinder_cup'
      ? Math.PI * Math.pow(options.toolDiameterMm / 2, 2) * 5
      : 0);

  const estimatedGrams = Math.max(6.5, Math.round((approxVolumeMm3 * 0.00125 * 0.45) * 10) / 10);
  const estimatedPrintTimeHours = Math.max(0.4, Math.round((estimatedGrams / 20 + 0.2) * 10) / 10);

  const slicerTips: string[] = [
    'Print Orientation: Print hook on its SIDE so layer lines run along the arm. This prevents the hook or prongs from snapping along layer lines under weight.',
    'Perimeters: Use 4 to 5 wall perimeters for strong prongs and rigidity.',
    'Infill: 30-40% gyroid or grid infill provides excellent impact and bend resistance.',
    'Material: PLA is stiff and great for tool racks; PETG is recommended for heavy loads and high toughness.',
  ];

  if (options.pegboardSystem === 'ikea_skadis') {
    slicerTips.push('Skådis Fit: Prongs are tuned for standard 5x15mm Skådis slots with 0.3mm clearance.');
  }

  return {
    totalWidthMm: Math.round(size.z * 10) / 10,
    totalDepthMm: Math.round(size.x * 10) / 10,
    totalHeightMm: Math.round(size.y * 10) / 10,
    prongCount: options.bracketWidthMm >= 60 ? 4 : 2,
    triangleCount: totalTris,
    estimatedGrams,
    estimatedPrintTimeHours,
    slicerTips,
  };
}

/**
 * Encodes a BufferGeometry into a binary STL ArrayBuffer.
 */
export function exportSkadisSTL(geometry: THREE.BufferGeometry): ArrayBuffer {
  const index = geometry.getIndex();
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');

  const triangleCount = index ? index.count / 3 : position.count / 3;
  const bufferSize = 84 + triangleCount * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const dataView = new DataView(buffer);

  const header = 'PrivKnife Client-Side 3D Skadis & Pegboard Hook Maker';
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

/**
 * Encodes holder and locking wedge geometries into a multi-object Microsoft 3MF package.
 */
export async function exportSkadis3MF(
  holderGeom: THREE.BufferGeometry,
  wedgeGeom: THREE.BufferGeometry,
  options: SkadisPegboardMakerOptions
): Promise<Blob> {
  function serializeMeshXml(geom: THREE.BufferGeometry, id: number, name: string): string {
    const index = geom.getIndex();
    const pos = geom.getAttribute('position');
    if (!pos || pos.count === 0) return '';
    const vCount = pos.count;
    const tCount = index ? index.count / 3 : vCount / 3;

    let vXml = '';
    for (let i = 0; i < vCount; i++) {
      vXml += `        <vertex x="${pos.getX(i).toFixed(3)}" y="${pos.getY(i).toFixed(3)}" z="${pos.getZ(i).toFixed(3)}" />\n`;
    }

    let tXml = '';
    for (let i = 0; i < tCount; i++) {
      const v1 = index ? index.getX(i * 3) : i * 3;
      const v2 = index ? index.getX(i * 3 + 1) : i * 3 + 1;
      const v3 = index ? index.getX(i * 3 + 2) : i * 3 + 2;
      tXml += `        <triangle v1="${v1}" v2="${v2}" v3="${v3}" />\n`;
    }

    return `    <object id="${id}" name="${name}" type="model">
      <mesh>
        <vertices>
${vXml}        </vertices>
        <triangles>
${tXml}        </triangles>
      </mesh>
    </object>\n`;
  }

  const holderXml = serializeMeshXml(holderGeom, 1, `Pegboard ${options.holderStyle}`);
  const wedgeXml = options.lockingWedge ? serializeMeshXml(wedgeGeom, 2, 'Locking Wedge') : '';

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">PrivKnife Pegboard Hook (${options.pegboardSystem})</metadata>
  <metadata name="Application">PrivKnife Client-Side 3D Studio</metadata>
  <resources>
${holderXml}${wedgeXml}  </resources>
  <build>
    <item objectid="1" />
${options.lockingWedge ? '    <item objectid="2" transform="1 0 0 0 1 0 0 0 1 35 0 0" />\n' : ''}  </build>
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
export async function processSkadisHolder(
  options: SkadisPegboardMakerOptions,
  format: 'stl' | '3mf' = 'stl'
): Promise<SkadisPegboardMakerResult> {
  const validation = validateSkadisOptions(options);
  if (!validation.valid) {
    return {
      success: false,
      blob: new Blob([], { type: 'application/octet-stream' }),
      fileName: '',
      fileSize: 0,
      mimeType: 'application/octet-stream',
      metrics: {
        totalWidthMm: 0,
        totalDepthMm: 0,
        totalHeightMm: 0,
        prongCount: 0,
        triangleCount: 0,
        estimatedGrams: 0,
        estimatedPrintTimeHours: 0,
        slicerTips: [],
      },
      error: validation.error,
    };
  }

  const { holderGeometry, lockingWedgeGeometry, combinedGeometry, prongCount } =
    generateSkadisGeometries(options);
  const metrics = calculateSkadisMetrics(holderGeometry, lockingWedgeGeometry, options);
  metrics.prongCount = prongCount;

  const baseFileName = `${options.pegboardSystem}-${options.holderStyle}-${options.hookLengthMm}mm`;

  let blob: Blob;
  let fileName: string;
  let mimeType: string;

  if (format === '3mf') {
    blob = await exportSkadis3MF(holderGeometry, lockingWedgeGeometry, options);
    fileName = `${baseFileName}.3mf`;
    mimeType = 'model/3mf';
  } else {
    const stlBuffer = exportSkadisSTL(combinedGeometry);
    blob = new Blob([stlBuffer], { type: 'model/stl' });
    fileName = `${baseFileName}.stl`;
    mimeType = 'model/stl';
  }

  holderGeometry.dispose();
  lockingWedgeGeometry.dispose();
  combinedGeometry.dispose();

  return {
    success: true,
    blob,
    fileName,
    fileSize: blob.size,
    mimeType,
    metrics,
  };
}
