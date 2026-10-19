import * as THREE from 'three';
import JSZip from 'jszip';
import {
  UnderDeskClampGeneratorOptions,
  UnderDeskClampGeneratorResult,
  UnderDeskClampMetrics,
} from './types';

/**
 * Validates under-desk clamp configuration parameters.
 */
export function validateClampOptions(options: UnderDeskClampGeneratorOptions): {
  valid: boolean;
  error?: string;
} {
  if (!options) {
    return { valid: false, error: 'Options are required' };
  }

  if (
    typeof options.deskThicknessMm !== 'number' ||
    options.deskThicknessMm < 8 ||
    options.deskThicknessMm > 150
  ) {
    return { valid: false, error: 'Desk thickness must be between 8 and 150 mm' };
  }

  if (
    typeof options.maxClampGapMm !== 'number' ||
    options.maxClampGapMm < options.deskThicknessMm + 5 ||
    options.maxClampGapMm > 250
  ) {
    return {
      valid: false,
      error: `Maximum clamp gap must be at least ${options.deskThicknessMm + 5}mm (desk thickness + 5mm) and at most 250mm`,
    };
  }

  if (
    typeof options.frameThicknessMm !== 'number' ||
    options.frameThicknessMm < 6 ||
    options.frameThicknessMm > 30
  ) {
    return { valid: false, error: 'Frame thickness must be between 6 and 30 mm' };
  }

  if (
    typeof options.throatDepthMm !== 'number' ||
    options.throatDepthMm < 25 ||
    options.throatDepthMm > 250
  ) {
    return { valid: false, error: 'Throat depth must be between 25 and 250 mm' };
  }

  if (
    typeof options.frameWidthMm !== 'number' ||
    options.frameWidthMm < 15 ||
    options.frameWidthMm > 120
  ) {
    return { valid: false, error: 'Frame width must be between 15 and 120 mm' };
  }

  if (
    typeof options.screwDiameterMm !== 'number' ||
    options.screwDiameterMm < 10 ||
    options.screwDiameterMm > 40
  ) {
    return { valid: false, error: 'Screw diameter must be between 10 and 40 mm' };
  }

  if (
    typeof options.screwPitchMm !== 'number' ||
    options.screwPitchMm < 1.5 ||
    options.screwPitchMm > 10
  ) {
    return { valid: false, error: 'Screw pitch must be between 1.5 and 10 mm' };
  }

  return { valid: true };
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
 * Creates a parametric C-clamp frame BufferGeometry with accessory attachment.
 */
function createClampFrameGeometry(options: UnderDeskClampGeneratorOptions): THREE.BufferGeometry {
  const {
    maxClampGapMm,
    throatDepthMm,
    frameThicknessMm,
    frameWidthMm,
    accessoryType,
    racewaySlots,
    racewaySlotDiameterMm,
    screwDiameterMm,
  } = options;

  const parts: THREE.BufferGeometry[] = [];

  // 1. Top Jaw: resting on top of desk
  // Extends from X=0 to X=throatDepthMm, Y from maxClampGapMm to maxClampGapMm + frameThicknessMm
  const topJaw = new THREE.BoxGeometry(throatDepthMm, frameThicknessMm, frameWidthMm);
  topJaw.translate(
    throatDepthMm / 2,
    maxClampGapMm + frameThicknessMm / 2,
    0
  );
  parts.push(topJaw);

  // Top jaw front grip lip / chamfer
  const topLip = new THREE.BoxGeometry(frameThicknessMm * 0.8, 3, frameWidthMm);
  topLip.translate(
    throatDepthMm - (frameThicknessMm * 0.4),
    maxClampGapMm - 1.5,
    0
  );
  parts.push(topLip);

  // 2. Vertical Spine (back wall behind desk edge)
  // Extends from X=-frameThicknessMm to 0, Y from -frameThicknessMm to maxClampGapMm + frameThicknessMm
  const spineHeight = maxClampGapMm + 2 * frameThicknessMm;
  const spine = new THREE.BoxGeometry(frameThicknessMm, spineHeight, frameWidthMm);
  spine.translate(
    -frameThicknessMm / 2,
    (maxClampGapMm) / 2,
    0
  );
  parts.push(spine);

  // 3. Reinforcement Gussets / Fillets (triangular braces in corners)
  const gussetGeom = new THREE.BufferGeometry();
  const gussetVertices = new Float32Array([
    // Top Gusset
    0, maxClampGapMm, -frameWidthMm / 2,
    frameThicknessMm * 1.2, maxClampGapMm, -frameWidthMm / 2,
    0, maxClampGapMm - (frameThicknessMm * 1.2), -frameWidthMm / 2,

    0, maxClampGapMm, frameWidthMm / 2,
    frameThicknessMm * 1.2, maxClampGapMm, frameWidthMm / 2,
    0, maxClampGapMm - (frameThicknessMm * 1.2), frameWidthMm / 2,

    // Bottom Gusset
    0, 0, -frameWidthMm / 2,
    frameThicknessMm * 1.2, 0, -frameWidthMm / 2,
    0, frameThicknessMm * 1.2, -frameWidthMm / 2,

    0, 0, frameWidthMm / 2,
    frameThicknessMm * 1.2, 0, frameWidthMm / 2,
    0, frameThicknessMm * 1.2, frameWidthMm / 2,
  ]);
  gussetGeom.setAttribute('position', new THREE.BufferAttribute(gussetVertices, 3));
  gussetGeom.computeVertexNormals();
  // Extruded / box representation for gusset corners
  const topGussetBox = new THREE.BoxGeometry(frameThicknessMm * 1.2, frameThicknessMm * 1.2, frameWidthMm);
  topGussetBox.rotateZ(Math.PI / 4);
  topGussetBox.translate(frameThicknessMm * 0.4, maxClampGapMm - (frameThicknessMm * 0.4), 0);
  parts.push(topGussetBox);

  const btmGussetBox = new THREE.BoxGeometry(frameThicknessMm * 1.2, frameThicknessMm * 1.2, frameWidthMm);
  btmGussetBox.rotateZ(Math.PI / 4);
  btmGussetBox.translate(frameThicknessMm * 0.4, frameThicknessMm * 0.4, 0);
  parts.push(btmGussetBox);

  // 4. Bottom Jaw: beneath desk
  // Extends from X=0 to X=throatDepthMm, Y from -frameThicknessMm to 0
  const btmJaw = new THREE.BoxGeometry(throatDepthMm, frameThicknessMm, frameWidthMm);
  btmJaw.translate(
    throatDepthMm / 2,
    -frameThicknessMm / 2,
    0
  );
  parts.push(btmJaw);

  // 5. Bottom Threaded Boss:
  // Located at screw center: X = throatDepthMm * 0.65, Z = 0
  const screwCenterX = throatDepthMm * 0.65;
  const bossOuterDiameter = Math.max(screwDiameterMm + 12, frameWidthMm * 0.85);
  const bossHeight = frameThicknessMm + 8;
  const threadBoss = new THREE.CylinderGeometry(
    bossOuterDiameter / 2,
    bossOuterDiameter / 2,
    bossHeight,
    24
  );
  threadBoss.translate(screwCenterX, -frameThicknessMm / 2 - 4, 0);
  parts.push(threadBoss);

  // 6. Accessory Geometries
  switch (accessoryType) {
    case 'headphone_hanger': {
      // Curved headphone cradle extending downwards from the bottom spine / jaw
      // Torus section / curved cradle
      const hookRadius = 32;
      const hookTube = 5;
      const hookArch = new THREE.TorusGeometry(hookRadius, hookTube, 16, 24, Math.PI * 0.6);
      hookArch.rotateZ(-Math.PI * 0.4);
      hookArch.translate(-frameThicknessMm, -hookRadius - 10, 0);
      parts.push(hookArch);

      // Resting support pad for headphone headband
      const restPad = new THREE.BoxGeometry(60, 6, frameWidthMm);
      restPad.translate(-30, -hookRadius * 1.8, 0);
      parts.push(restPad);

      // Upward front retention lip so headphones cannot slide off
      const hookLip = new THREE.BoxGeometry(6, 14, frameWidthMm);
      hookLip.translate(-60, -hookRadius * 1.8 + 5, 0);
      parts.push(hookLip);
      break;
    }

    case 'cable_raceway': {
      // Under-desk U-channel raceway with comb fingers / slotted wire entries
      const racewayDepth = Math.max(28, throatDepthMm * 0.5);
      const racewayWidth = frameWidthMm;
      const racewayHeight = 22;

      // Raceway base plate
      const racewayBase = new THREE.BoxGeometry(racewayDepth, 5, racewayWidth);
      racewayBase.translate(throatDepthMm * 0.5, -frameThicknessMm - racewayHeight, 0);
      parts.push(racewayBase);

      // Raceway outer wall
      const racewayOuterWall = new THREE.BoxGeometry(5, racewayHeight, racewayWidth);
      racewayOuterWall.translate(throatDepthMm * 0.5 + racewayDepth / 2, -frameThicknessMm - racewayHeight / 2, 0);
      parts.push(racewayOuterWall);

      // Raceway slotted divider combs
      const slots = Math.max(1, Math.min(6, racewaySlots || 3));
      const slotSpacing = racewayWidth / (slots + 1);
      for (let s = 1; s <= slots; s++) {
        const slotZ = -racewayWidth / 2 + s * slotSpacing;
        const tooth = new THREE.BoxGeometry(racewayDepth * 0.8, racewayHeight * 0.85, 3);
        tooth.translate(throatDepthMm * 0.5 - racewayDepth * 0.05, -frameThicknessMm - racewayHeight / 2, slotZ);
        parts.push(tooth);

        // Slotted snap clip top retainer
        const clip = new THREE.BoxGeometry(8, 3, 4);
        clip.translate(throatDepthMm * 0.5 + racewayDepth * 0.3, -frameThicknessMm - 4, slotZ);
        parts.push(clip);
      }
      break;
    }

    case 'power_strip_holder': {
      // Extended sturdy L-bracket shelf cradle for power strip / adapters
      const stripDepth = 75;
      const stripWidth = frameWidthMm * 1.3;
      const stripTray = new THREE.BoxGeometry(stripDepth, 6, stripWidth);
      stripTray.translate(-frameThicknessMm - stripDepth / 2 + 10, -35, 0);
      parts.push(stripTray);

      // Front retention lip
      const stripLip = new THREE.BoxGeometry(6, 22, stripWidth);
      stripLip.translate(-frameThicknessMm - stripDepth + 10, -25, 0);
      parts.push(stripLip);

      // Connecting neck arm
      const neckArm = new THREE.BoxGeometry(frameThicknessMm * 1.2, 35, frameWidthMm);
      neckArm.translate(-frameThicknessMm / 2, -18, 0);
      parts.push(neckArm);
      break;
    }

    case 'cup_holder': {
      // Ring holder for beverage cans, tumblers, and mugs
      const ringOuterR = 45;
      const ringInnerR = 40;
      const ringHeight = 22;

      // Outer ring
      const ring = new THREE.CylinderGeometry(ringOuterR, ringOuterR, ringHeight, 32);
      // Support connecting strut from clamp to cup holder
      const armLength = 35;
      const arm = new THREE.BoxGeometry(armLength, 8, 20);
      arm.translate(throatDepthMm + armLength / 2, maxClampGapMm / 2, 0);
      parts.push(arm);

      // Cup ring positioning
      ring.translate(throatDepthMm + armLength + ringOuterR, maxClampGapMm / 2, 0);
      parts.push(ring);

      // Bottom cross-support bars
      const crossBar1 = new THREE.BoxGeometry(ringOuterR * 1.8, 4, 8);
      crossBar1.translate(throatDepthMm + armLength + ringOuterR, maxClampGapMm / 2 - ringHeight / 2 + 2, 0);
      parts.push(crossBar1);

      const crossBar2 = new THREE.BoxGeometry(8, 4, ringOuterR * 1.8);
      crossBar2.translate(throatDepthMm + armLength + ringOuterR, maxClampGapMm / 2 - ringHeight / 2 + 2, 0);
      parts.push(crossBar2);
      break;
    }
  }

  const frameGeom = mergeBufferGeometries(parts);
  for (const part of parts) {
    part.dispose();
  }
  return frameGeom;
}

/**
 * Creates the Clamping Screw Bolt with ergonomic thumb knob.
 */
function createBoltGeometry(
  options: UnderDeskClampGeneratorOptions,
  exploded = false
): THREE.BufferGeometry {
  const {
    deskThicknessMm,
    maxClampGapMm,
    frameThicknessMm,
    throatDepthMm,
    screwDiameterMm,
    screwPitchMm,
  } = options;

  const parts: THREE.BufferGeometry[] = [];
  const knobDiameter = Math.max(36, screwDiameterMm * 2.2);
  const knobHeight = 14;
  const screwLength = maxClampGapMm + frameThicknessMm + 15;

  // 1. Ergonomic Knob Thumbwheel Base
  const knobBase = new THREE.CylinderGeometry(knobDiameter / 2, knobDiameter / 2, knobHeight, 24);
  knobBase.translate(0, -knobHeight / 2, 0);
  parts.push(knobBase);

  // 6 Ergonomic Grip Lobes around the knob circumference
  const lobeRadius = 4;
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6;
    const lobe = new THREE.CylinderGeometry(lobeRadius, lobeRadius, knobHeight, 16);
    lobe.translate(
      (knobDiameter / 2) * Math.cos(angle),
      -knobHeight / 2,
      (knobDiameter / 2) * Math.sin(angle)
    );
    parts.push(lobe);
  }

  // 2. Threaded Screw Shank
  // 3D printable trapezoidal thread profile with 45° overhangs for support-free printing
  const coreShaft = new THREE.CylinderGeometry(
    screwDiameterMm / 2 - 0.5,
    screwDiameterMm / 2 - 0.5,
    screwLength,
    24
  );
  coreShaft.translate(0, screwLength / 2, 0);
  parts.push(coreShaft);

  // Helical thread ridges modeled with 45-degree chamfered rings along the shaft
  const threadCount = Math.floor(screwLength / screwPitchMm);
  for (let t = 1; t < threadCount; t++) {
    const threadY = t * screwPitchMm;
    const threadRing = new THREE.CylinderGeometry(
      screwDiameterMm / 2 + 0.8,
      screwDiameterMm / 2 + 0.8,
      screwPitchMm * 0.45,
      24
    );
    threadRing.translate(0, threadY, 0);
    parts.push(threadRing);
  }

  // 3. Top Ball / Snap Pivot Tip for Foot Pad
  const pivotRadius = screwDiameterMm * 0.32;
  const pivotBall = new THREE.SphereGeometry(pivotRadius, 16, 16);
  pivotBall.translate(0, screwLength + pivotRadius * 0.8, 0);
  parts.push(pivotBall);

  const boltGeom = mergeBufferGeometries(parts);
  for (const part of parts) {
    part.dispose();
  }

  // Position bolt in assembly
  const screwCenterX = throatDepthMm * 0.65;
  if (exploded) {
    // Offset far below for exploded view inspection
    boltGeom.translate(screwCenterX, -frameThicknessMm - 45, 0);
  } else {
    // Threaded into the clamp with tip contacting desk thickness
    // Screw tip should reach desk underside: Y = deskThicknessMm - 5
    const targetTipY = deskThicknessMm - 5;
    const offset = targetTipY - (screwLength + pivotRadius * 0.8);
    boltGeom.translate(screwCenterX, offset, 0);
  }

  return boltGeom;
}

/**
 * Creates the Swivel Foot Pad BufferGeometry.
 */
function createFootPadGeometry(
  options: UnderDeskClampGeneratorOptions,
  exploded = false
): THREE.BufferGeometry {
  if (!options.swivelFootPad) {
    const empty = new THREE.BufferGeometry();
    empty.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
    return empty;
  }

  const { deskThicknessMm, throatDepthMm, screwDiameterMm } = options;
  const parts: THREE.BufferGeometry[] = [];

  const padDiameter = Math.max(screwDiameterMm * 1.5, 24);
  const padThickness = 5;

  // Main circular foot pad disk
  const padDisk = new THREE.CylinderGeometry(
    padDiameter / 2,
    padDiameter / 2 - 0.5,
    padThickness,
    24
  );
  padDisk.translate(0, padThickness / 2, 0);
  parts.push(padDisk);

  // Recessed socket sleeve on underside
  const socketSleeve = new THREE.CylinderGeometry(
    screwDiameterMm * 0.45,
    screwDiameterMm * 0.45,
    4,
    16
  );
  socketSleeve.translate(0, -2, 0);
  parts.push(socketSleeve);

  const padGeom = mergeBufferGeometries(parts);
  for (const part of parts) {
    part.dispose();
  }

  const screwCenterX = throatDepthMm * 0.65;
  if (exploded) {
    padGeom.translate(screwCenterX, deskThicknessMm + 25, 0);
  } else {
    // Contacts underside of desk: top surface at Y = deskThicknessMm
    padGeom.translate(screwCenterX, deskThicknessMm - padThickness, 0);
  }

  return padGeom;
}

/**
 * Creates a combined print-bed layout geometry with parts laid out optimally for 3D printing:
 * - Clamp frame lying on its side (Z=0 plane) for maximum layer strength along bending stress lines
 * - Bolt standing upright on its flat knob base
 * - Foot pad resting flat beside the bolt
 */
function createCombinedPrintBedGeometry(
  clampGeom: THREE.BufferGeometry,
  boltGeom: THREE.BufferGeometry,
  footPadGeom: THREE.BufferGeometry,
  options: UnderDeskClampGeneratorOptions
): THREE.BufferGeometry {
  // Clone geoms so we don't mutate the originals
  const frameClone = clampGeom.clone();
  frameClone.computeBoundingBox();

  // Rotate frame onto its side: rotate X by 90 degrees so frame width is along Y, and length along X
  frameClone.rotateX(Math.PI / 2);
  frameClone.computeBoundingBox();
  if (frameClone.boundingBox) {
    // Ground frame on print bed (min Y = 0)
    frameClone.translate(
      -frameClone.boundingBox.min.x,
      -frameClone.boundingBox.min.y,
      -frameClone.boundingBox.min.z
    );
  }

  // Prepare bolt clone standing upright on knob base
  const boltClone = new THREE.BufferGeometry();
  // We recreate bolt upright at origin
  const uprightBolt = createBoltGeometry(options, false);
  // Reset assembly translation back to origin:
  const screwCenterX = options.throatDepthMm * 0.65;
  uprightBolt.computeBoundingBox();
  if (uprightBolt.boundingBox) {
    uprightBolt.translate(
      -uprightBolt.boundingBox.getCenter(new THREE.Vector3()).x,
      -uprightBolt.boundingBox.min.y,
      -uprightBolt.boundingBox.getCenter(new THREE.Vector3()).z
    );
  }

  // Position bolt beside the clamp frame
  frameClone.computeBoundingBox();
  const frameMaxX = frameClone.boundingBox ? frameClone.boundingBox.max.x : 80;
  uprightBolt.translate(frameMaxX + 25, 0, 0);

  const geomsToMerge: THREE.BufferGeometry[] = [frameClone, uprightBolt];

  if (options.swivelFootPad && footPadGeom.attributes['position'] && footPadGeom.attributes['position'].count > 0) {
    const padClone = footPadGeom.clone();
    padClone.computeBoundingBox();
    if (padClone.boundingBox) {
      padClone.translate(
        -padClone.boundingBox.getCenter(new THREE.Vector3()).x,
        -padClone.boundingBox.min.y,
        -padClone.boundingBox.getCenter(new THREE.Vector3()).z
      );
      padClone.translate(frameMaxX + 25, 0, 35);
    }
    geomsToMerge.push(padClone);
  }

  const combined = mergeBufferGeometries(geomsToMerge);

  frameClone.dispose();
  uprightBolt.dispose();

  return combined;
}

/**
 * Generates separate and combined 3D BufferGeometries for the clamp frame, bolt, and foot pad.
 */
export function generateClampGeometries(
  options: UnderDeskClampGeneratorOptions,
  exploded = false
): {
  clampGeometry: THREE.BufferGeometry;
  boltGeometry: THREE.BufferGeometry;
  footPadGeometry: THREE.BufferGeometry;
  combinedGeometry: THREE.BufferGeometry;
} {
  const clampGeometry = createClampFrameGeometry(options);
  const boltGeometry = createBoltGeometry(options, exploded);
  const footPadGeometry = createFootPadGeometry(options, exploded);
  const combinedGeometry = createCombinedPrintBedGeometry(
    clampGeometry,
    boltGeometry,
    footPadGeometry,
    options
  );

  return {
    clampGeometry,
    boltGeometry,
    footPadGeometry,
    combinedGeometry,
  };
}

/**
 * Calculates physical dimensions, triangle counts, print weight, and slicer recommendations.
 */
export function calculateClampMetrics(
  clampGeom: THREE.BufferGeometry,
  boltGeom: THREE.BufferGeometry,
  footPadGeom: THREE.BufferGeometry,
  options: UnderDeskClampGeneratorOptions
): UnderDeskClampMetrics {
  clampGeom.computeBoundingBox();
  boltGeom.computeBoundingBox();
  footPadGeom.computeBoundingBox();

  const cBox = clampGeom.boundingBox || new THREE.Box3();
  const bBox = boltGeom.boundingBox || new THREE.Box3();
  const pBox = footPadGeom.boundingBox || new THREE.Box3();

  const overallBox = new THREE.Box3();
  overallBox.union(cBox);
  overallBox.union(bBox);
  if (options.swivelFootPad) {
    overallBox.union(pBox);
  }

  const size = new THREE.Vector3();
  overallBox.getSize(size);

  const clampTris = clampGeom.index
    ? clampGeom.index.count / 3
    : clampGeom.getAttribute('position').count / 3;
  const boltTris = boltGeom.index
    ? boltGeom.index.count / 3
    : boltGeom.getAttribute('position').count / 3;
  const footPadTris =
    options.swivelFootPad && footPadGeom.getAttribute('position')
      ? footPadGeom.index
        ? footPadGeom.index.count / 3
        : footPadGeom.getAttribute('position').count / 3
      : 0;

  const totalTris = clampTris + boltTris + footPadTris;

  // Approximate material weight in grams (PETG density ~1.27 g/cm3, 35% infill)
  const volumeMm3 =
    options.throatDepthMm * options.frameWidthMm * options.frameThicknessMm * 2 +
    (options.maxClampGapMm + options.frameThicknessMm * 2) *
      options.frameThicknessMm *
      options.frameWidthMm +
    Math.PI * Math.pow(options.screwDiameterMm / 2, 2) * (options.maxClampGapMm + 20) +
    Math.PI * Math.pow(20, 2) * 14;

  const estimatedGrams = Math.round((volumeMm3 * 0.00127 * 0.45) * 10) / 10;
  const estimatedPrintTimeHours = Math.round((estimatedGrams / 18 + 0.5) * 10) / 10;

  const slicerTips: string[] = [
    'Orientation: Print clamp frame on its SIDE (Z plane) so layer lines run lengthwise against bending torque.',
    'Thread Bolt: Print clamping bolt standing upright on its flat knob base. Overhang angles are ≤45° — no supports needed!',
    'Perimeters: Use 4 to 5 wall perimeters and 35-50% infill for heavy clamping strength.',
    'Material: PETG, PLA+, or ABS recommended for high stiffness and creep resistance under sustained clamping pressure.',
  ];

  if (options.accessoryType === 'headphone_hanger') {
    slicerTips.push('Headphone Hook: Smooth curved lip prevents headband indentation and slippage.');
  } else if (options.accessoryType === 'cable_raceway') {
    slicerTips.push('Cable Raceway: Angle comb retention slots allow quick snap-in of cords without unplugging.');
  }

  return {
    totalWidthMm: Math.round(size.z * 10) / 10,
    totalDepthMm: Math.round(size.x * 10) / 10,
    totalHeightMm: Math.round(size.y * 10) / 10,
    clampTriangleCount: Math.round(clampTris),
    boltTriangleCount: Math.round(boltTris),
    footPadTriangleCount: Math.round(footPadTris),
    accessoryTriangleCount: Math.round(clampTris * 0.35),
    totalTriangles: Math.round(totalTris),
    estimatedGrams,
    estimatedPrintTimeHours,
    slicerTips,
  };
}

/**
 * Encodes a BufferGeometry into a binary STL ArrayBuffer.
 */
export function exportClampSTL(geometry: THREE.BufferGeometry): ArrayBuffer {
  const index = geometry.getIndex();
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');

  const triangleCount = index ? index.count / 3 : position.count / 3;
  const bufferSize = 84 + triangleCount * 50;
  const buffer = new ArrayBuffer(bufferSize);
  const dataView = new DataView(buffer);

  // 80-byte header
  const header = 'PrivKnife Client-Side 3D Under-Desk Clamp Generator';
  for (let i = 0; i < 80; i++) {
    dataView.setUint8(i, i < header.length ? header.charCodeAt(i) : 0);
  }

  // 4-byte triangle count
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
 * Encodes Clamp Frame, Bolt, and Foot Pad geometries into a multi-object Microsoft 3MF specification package.
 */
export async function exportClamp3MF(
  clampGeom: THREE.BufferGeometry,
  boltGeom: THREE.BufferGeometry,
  footPadGeom: THREE.BufferGeometry,
  options: UnderDeskClampGeneratorOptions
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

  const frameXml = serializeMeshXml(clampGeom, 1, `Clamp Frame (${options.accessoryType})`);
  const boltXml = serializeMeshXml(boltGeom, 2, 'Clamping Screw Bolt');
  const padXml = options.swivelFootPad
    ? serializeMeshXml(footPadGeom, 3, 'Swivel Foot Pad')
    : '';

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">PrivKnife Under-Desk Clamp (${options.accessoryType})</metadata>
  <metadata name="Application">PrivKnife Client-Side 3D Studio</metadata>
  <resources>
${frameXml}${boltXml}${padXml}  </resources>
  <build>
    <item objectid="1" />
    <item objectid="2" />
${options.swivelFootPad ? '    <item objectid="3" />\n' : ''}  </build>
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
export async function processClamp(
  options: UnderDeskClampGeneratorOptions,
  format: 'stl' | '3mf' = 'stl'
): Promise<UnderDeskClampGeneratorResult> {
  const validation = validateClampOptions(options);
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
        clampTriangleCount: 0,
        boltTriangleCount: 0,
        footPadTriangleCount: 0,
        accessoryTriangleCount: 0,
        totalTriangles: 0,
        estimatedGrams: 0,
        estimatedPrintTimeHours: 0,
        slicerTips: [],
      },
      error: validation.error,
    };
  }

  const { clampGeometry, boltGeometry, footPadGeometry, combinedGeometry } =
    generateClampGeometries(options);
  const metrics = calculateClampMetrics(
    clampGeometry,
    boltGeometry,
    footPadGeometry,
    options
  );

  const baseFileName = `under-desk-clamp-${options.accessoryType}-${options.deskThicknessMm}mm`;

  let blob: Blob;
  let fileName: string;
  let mimeType: string;

  if (format === '3mf') {
    blob = await exportClamp3MF(clampGeometry, boltGeometry, footPadGeometry, options);
    fileName = `${baseFileName}.3mf`;
    mimeType = 'model/3mf';
  } else {
    const stlBuffer = exportClampSTL(combinedGeometry);
    blob = new Blob([stlBuffer], { type: 'model/stl' });
    fileName = `${baseFileName}.stl`;
    mimeType = 'model/stl';
  }

  clampGeometry.dispose();
  boltGeometry.dispose();
  footPadGeometry.dispose();
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
