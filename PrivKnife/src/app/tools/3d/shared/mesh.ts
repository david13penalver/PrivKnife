import * as THREE from 'three';
import { ADDITION, Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface MeshPart {
  name: string;
  geometry: THREE.BufferGeometry;
  material?: number;
}

export function within(value: number, min: number, max: number): boolean {
  return Number.isFinite(value) && value >= min && value <= max;
}

/** Closed radial profile in counterclockwise order in the radius/Z plane. */
export function revolve(profile: readonly (readonly [number, number])[], segments = 96,
  adjust?: (radius: number, z: number, angle: number, ring: number) => number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const rings = profile.map(([radius, z], ring) => {
    const start = positions.length / 3;
    const count = radius === 0 ? 1 : segments;
    for (let i = 0; i < count; i++) {
      const angle = i * 2 * Math.PI / segments;
      const r = adjust && radius !== 0 ? adjust(radius, z, angle, ring) : radius;
      positions.push(r * Math.cos(angle), r * Math.sin(angle), z);
    }
    return { start, count };
  });
  for (let j = 0; j < rings.length; j++) {
    const current = rings[j];
    const next = rings[(j + 1) % rings.length];
    for (let i = 0; i < segments; i++) {
      const a = current.start + i % current.count;
      const b = current.start + (i + 1) % current.count;
      const c = next.start + (i + 1) % next.count;
      const d = next.start + i % next.count;
      if (a !== b) indices.push(a, b, c);
      if (c !== d) indices.push(a, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function box(width: number, depth: number, height: number, x: number, y: number, bottom: number) {
  return new THREE.BoxGeometry(width, depth, height).translate(x, y, bottom + height / 2);
}

export function cylinder(radius: number, height: number, x: number, y: number, bottom: number, segments = 64, bottomRadius = radius) {
  return new THREE.CylinderGeometry(radius, bottomRadius, height, segments, 1)
    .rotateX(Math.PI / 2).translate(x, y, bottom + height / 2);
}

export function extrude(shape: THREE.Shape, height: number): THREE.BufferGeometry {
  return new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments: 24 });
}

export function weldPositions(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const positions = new THREE.BufferGeometry().setAttribute('position', geometry.attributes['position']);
  positions.setIndex(geometry.index);
  return mergeVertices(positions, 1e-5);
}

/** Combines disjoint parts for STL or transport. The caller owns the returned geometry. */
export function combine(geometries: readonly THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = geometries.map((geometry) => {
    const copy = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    for (const attribute of Object.keys(copy.attributes)) {
      if (attribute !== 'position') copy.deleteAttribute(attribute);
    }
    return copy;
  });
  try {
    const merged = mergeGeometries(flat);
    if (!merged) throw new Error('Could not combine printable meshes.');
    return merged;
  } finally {
    flat.forEach((geometry) => geometry.dispose());
  }
}

/** Takes ownership of the operands, including on error. */
export function booleanMesh(base: THREE.BufferGeometry, feature: THREE.BufferGeometry,
  operation: 'add' | 'subtract',
): THREE.BufferGeometry {
  const evaluator = new Evaluator();
  evaluator.attributes = ['position'];
  Object.assign(evaluator, { useCDTClipping: true });
  evaluator.useGroups = false;
  const baseBrush = new Brush(base);
  const featureBrush = new Brush(feature);
  try {
    const result = evaluator.evaluate(baseBrush, featureBrush, operation === 'add' ? ADDITION : SUBTRACTION);
    const geometry = result.geometry;
    geometry.clearGroups();
    const count = geometry.drawRange.count;
    if (geometry.index && count < geometry.index.count) {
      geometry.setIndex(new THREE.BufferAttribute(geometry.index.array.slice(0, count), 1));
    }
    return geometry;
  } finally {
    base.dispose();
    feature.dispose();
  }
}
