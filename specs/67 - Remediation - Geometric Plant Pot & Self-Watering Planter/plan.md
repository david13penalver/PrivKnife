# Remediation Implementation Plan: Geometric Plant Pot & Self-Watering Planter

- **Spec ID**: `67`
- **Tool**: `37 - Geometric Plant Pot & Self-Watering Planter` (`geometric-plant-pot`)
- **Route**: `/tools/geometric-plant-pot`
- **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/3d/geometric-plant-pot/
├── types.ts                                  # Add WorkerRequest/WorkerResponse message types
├── engine.ts                                 # Fix drainage hole in saucer mode, manifold insert wall/floor thickness, and clone disposal in createCombinedPrintBedGeometry
├── engine.spec.ts                            # NEW/UPDATED: Unit tests for saucer-mode drainage aperture, manifold insert geometry, and zero NaN/leak guarantees
├── worker.ts                                 # NEW: Web Worker wrapper for off-main-thread STL/3MF export generation
├── geometric-plant-pot.component.ts          # Fix combinedGeometry/soilMesh disposal, add touch orbit handlers, wire worker bridge
├── geometric-plant-pot.component.scss        # NEW: Extract styles, fix light-mode contrast variables, add 320px/640px responsive breakpoints & 38px touch targets
└── geometric-plant-pot.component.spec.ts     # Update component tests for disposal, touch events, and responsive/theme classes
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Export Correctness Boundary (`engine.ts` / `engine.spec.ts`)
- **Functions Under Test**:
  - `createOuterPotGeometry(options: GeometricPlantPotOptions): THREE.BufferGeometry`
  - `createReservoirInsertGeometry(options: GeometricPlantPotOptions): THREE.BufferGeometry`
  - `generatePlanterGeometries(options: GeometricPlantPotOptions): GeneratedPlanterGeometries`
  - `processGeometricPlantPot(options: GeometricPlantPotOptions, format: PlanterExportFormat): Promise<GeometricPlantPotResult>`
- **Concrete Assertions**:
  1. When `planterType === 'drainage_with_saucer'`, `createOuterPotGeometry(options)` has zero vertices at `(x = 0, y = 0)` on the floor (`Math.hypot(x, y) >= drainHoleR - 1e-3` for all vertices with `z <= options.bottomThicknessMm + 1e-3`), proving the central drainage aperture is open.
  2. When `planterType === 'self_watering_insert'`, `createReservoirInsertGeometry(options)` has both inner and outer wall surfaces (positive radial thickness) and finite bounding box dimensions with zero `NaN` values.
  3. `createCombinedPrintBedGeometry()` disposes all temporary cloned geometries (`potClone`, `insertClone`, `saucerClone`).

### Seam 2: Web Worker & Main-Thread Protection Boundary (`worker.ts` / `geometric-plant-pot.component.ts`)
- **Protocol**:
  - Request: `{ id: number; options: GeometricPlantPotOptions; format: PlanterExportFormat }`
  - Response: `{ id: number; ok: true; result: GeometricPlantPotResult } | { id: number; ok: false; error: string }`
- **Lifecycle**: Component lazily spawns `Worker` (with direct `processGeometricPlantPot` fallback in headless test environments where `Worker` is undefined) and terminates it in `ngOnDestroy()`.

### Seam 3: Component State, Touch Controls & Resource Disposal Boundary (`geometric-plant-pot.component.ts` / `geometric-plant-pot.component.spec.ts`)
- **Assertions**:
  - Calling `rebuildMesh()` multiple times disposes the previous `outerPotGeometry`, `insertGeometry`, `saucerGeometry`, AND `combinedGeometry`.
  - Dispatching `touchstart`, `touchmove`, and `touchend` on the `<canvas>` updates `planterGroup.rotation.z` and `planterGroup.rotation.x`.
  - Calling `ngOnDestroy()` revokes all object URLs, terminates any active worker, and disposes the WebGLRenderer and scene meshes.

### Seam 4: Mobile Responsive & Theme Styling Boundary (`geometric-plant-pot.component.scss`)
- **Assertions**:
  - `.metric-value` and `.tips-list` use `var(--color-text-primary)` / `var(--color-text-secondary)` instead of `#f3f4f6` / `#cbd5e1`.
  - `.btn-grid-2`, `.control-row-2`, `.metrics-grid`, and `.export-actions` collapse to `1fr` at `@media (max-width: 640px)` with `min-width: 0` on all grid cells and `.c-header__title-group`.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: Saucer-Mode Drainage Hole in `createOuterPotGeometry()`
- **Red**: Write a test in `engine.spec.ts` passing `planterType: 'drainage_with_saucer'` to `createOuterPotGeometry()` and asserting that no floor vertex has radial distance `< 4.0 mm` from the Z-axis (`Math.hypot(x, y) >= 4.0`). Observe failure because the floor currently converges to `(0, 0, 0)` and `(0, 0, floorZ)`.
- **Green**: Update `createOuterPotGeometry()` in `engine.ts` so that when `options.planterType === 'drainage_with_saucer'`, the inner floor ring (`z = floorZ`) and outer bottom ring (`z = 0`) terminate at an inner aperture ring of radius `drainHoleR = Math.max(4.0, Math.min(innerR0 * 0.35, 12.0))`, stitched together with a vertical cylindrical wall of `segments` quads.
- **Refactor**: Extract helper `appendAnnularCapAndHoleWall()` to keep `createOuterPotGeometry()` concise.

### Slice 2: Manifold Solid Thickness for `createReservoirInsertGeometry()`
- **Red**: Write a test in `engine.spec.ts` verifying that `createReservoirInsertGeometry()` contains vertices on both the top and bottom faces of the top flange lip (`z = potH` and `z = potH - lipThick`) and floor (`z = floorZ` and `z = floorZ + basketWallThick`). Observe failure because `RingGeometry` is 2D planar.
- **Green**: Replace the open `CylinderGeometry` and 2D `RingGeometry` primitives in `createReservoirInsertGeometry()` with closed extruded shapes (`THREE.Shape` with inner hole `THREE.Path` passed to `THREE.ExtrudeGeometry`) for the basket cylinder wall, perforated floor plate, top resting flange lip, and wicking leg cylinder.
- **Refactor**: Ensure every sub-geometry is passed through `safeMergeGeometries()` and disposed immediately after merging.

### Slice 3: Fix Geometry Clone Leaks in Engine & Component
- **Red**: Write a unit test spying on `THREE.BufferGeometry.prototype.dispose` during `generatePlanterGeometries()` and `component.rebuildMesh()`, asserting that `combinedGeometry`, `insertClone`, and `saucerClone` are disposed.
- **Green**:
  - In `engine.ts`, replace `potClone.dispose()` in `createCombinedPrintBedGeometry()` with `geomsToMerge.forEach((g) => g.dispose())`.
  - In `geometric-plant-pot.component.ts`, call `geoms.combinedGeometry.dispose()` inside `recalculateMetrics()` and `rebuildMesh()`, and remove the unused `this.soilMesh` creation from `initThree()`.
- **Refactor**: Centralize mesh disposal in `clearGroup()`.

### Slice 4: Touch Orbit Controls & Web Worker Export Bridge
- **Red**: Write a component test dispatching synthetic `TouchEvent`s (`touchstart` at `(100, 100)`, `touchmove` at `(150, 120)`, `touchend`) on the canvas and asserting `onTouchStart`/`onTouchMove` rotate the group.
- **Green**: Add `onTouchStart(event: TouchEvent)`, `onTouchMove(event: TouchEvent)`, and `onTouchEnd()` methods to `GeometricPlantPotComponent` and bind them in the template; create `worker.ts` and wire `downloadExport()` to use it when `typeof Worker !== 'undefined'`.
- **Refactor**: Share rotation clamping logic (`[-Math.PI / 2.2, 0.2]`) between mouse and touch handlers.

### Slice 5: Light-Mode Contrast & 320px Responsive Layout
- **Red**: Inspect computed styles and `layoutReport` at `320×640` (`scrollWidth: 377` and `#f3f4f6` light-on-light text).
- **Green**: Move inline styles to `geometric-plant-pot.component.scss`, replace hardcoded light colors with `var(--color-text-primary)` / `var(--color-text-secondary)`, add `min-width: 0` and `overflow-wrap: break-word` to header and grid items, and add `@media (max-width: 640px)` rules collapsing 2-column grids to `1fr`.
- **Refactor**: Verify both light and dark modes in headless Chrome at `1366px`, `390px`, and `320px`.
