# Plan 65: TDD Implementation Plan — Under-Desk Clamp & Cable Management Generator Remediation

- **Spec ID**: `65`
- **Remediates Tool**: `35 - Under-Desk Clamp & Cable Management Generator` (`under-desk-clamp-generator`)
- **Route**: `/tools/under-desk-clamp-generator`
- **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/3d/under-desk-clamp-generator/
├── types.ts                                          # Add worker message interfaces
├── engine.ts                                         # Hollow tube helper for boss/cup/socket, racewaySlotDiameterMm slots, dispose combinedGeometry in calculateClampMetrics
├── engine.spec.ts                                    # Unit tests for hollow cup/boss/socket, racewaySlotDiameterMm effect, and geometry disposal
├── worker.ts                                         # (New) Dedicated Web Worker for STL/3MF export synthesis
├── under-desk-clamp-generator.component.ts           # Deduplicate generateClampGeometries(), dispose combinedGeometry & deskPreviewMesh, add touch handlers, .c-input__slider
├── under-desk-clamp-generator.component.scss         # (New/Extract) Fix 439px mobile overflow, collapse .control-row-2/.metrics-grid <768px, Light Mode CSS vars
└── under-desk-clamp-generator.component.spec.ts      # Component tests for single-pass rebuildMesh(), deskPreviewMesh disposal, touch handlers, and responsive classes
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Export Correctness Boundary (`engine.ts` / `engine.spec.ts`)
- **Public Functions Under Test**:
  - `createHollowTubeGeometry(outerR: number, innerR: number, height: number, segments?: number): THREE.BufferGeometry`
  - `generateClampGeometries(options: UnderDeskClampOptions, isExploded?: boolean)`
  - `calculateClampMetrics(options: UnderDeskClampOptions): UnderDeskClampMetrics`
- **Concrete Assertions**:
  - For `accessoryType: 'cup_holder'`, the cup ring geometry has internal wall vertices at radius `ringInnerR = 40mm` (not just outer vertices at `45mm` and center `0`).
  - For `accessoryType: 'cable_raceway'`, changing `racewaySlotDiameterMm` from `8` to `16` changes the generated `frameGeometry` vertex positions/triangle count.
  - The foot pad socket (`createSwivelFootPadGeometry`) and clamp lower jaw boss have internal bore vertices at radius `~threadDiameterMm / 2`.

### Seam 2: Web Worker & Main-Thread Protection Boundary (`worker.ts` / Component)
- **Worker Protocol**:
  - Request: `{ id: number; options: UnderDeskClampOptions }`
  - Response: `{ id: number; type: 'result' | 'error'; stlBuffer?: ArrayBuffer; threemfBuffer?: ArrayBuffer; metrics?: UnderDeskClampMetrics; error?: string }`
- **Concrete Assertions**:
  - Component terminates any active `Worker` in `ngOnDestroy()`.

### Seam 3: Component State, Controls, Viewport Interaction & Resource Disposal Boundary (`under-desk-clamp-generator.component.ts` / `.spec.ts`)
- **Concrete Assertions**:
  - `rebuildMesh()` invokes `generateClampGeometries()` **only once** per parameter update and calls `.dispose()` on `combinedGeometry` (and on `footPadGeometry` when `swivelFootPad()` is `false`).
  - `ngOnDestroy()` calls `.dispose()` on `deskPreviewMesh.geometry` and `deskPreviewMesh.material` in addition to `frameMesh`, `screwMesh`, and `footPadMesh`.
  - `onTouchStart(TouchEvent)` and `onTouchMove(TouchEvent)` rotate `cameraTheta` and `cameraPhi` on `.clamp-viewport`.

### Seam 4: Mobile Responsive & Theme Styling Boundary (`under-desk-clamp-generator.component.scss`)
- **Concrete Assertions**:
  - `.c-header__title` sets `overflow-wrap: anywhere; white-space: normal;` eliminating the `439px` overflow on `390px`/`320px` viewports.
  - `.control-row-2` and `.metrics-grid` collapse to `grid-template-columns: 1fr` under `@media (max-width: 768px)`.
  - `.metric-value` and `.tips-list` use CSS custom properties (`var(--color-text-primary)`, `var(--color-text-secondary)`).

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: Hollow Tube Boss/Cup/Socket & `racewaySlotDiameterMm` Cable Slots in `engine.ts` (`DEFECT-35-01`)
1. **Red**:
   - In `under-desk-clamp-generator.component.spec.ts` (or `engine.spec.ts`), write tests asserting:
     1. Changing `racewaySlotDiameterMm` from `8` to `16` on `accessoryType: 'cable_raceway'` changes the generated `frameGeometry`.
     2. `cup_holder` ring geometry and `swivelFootPad` socket geometry contain inner wall vertices at `innerR` (created via hollow annular extrusion rather than solid `CylinderGeometry`).
2. **Green**:
   - Implement `createHollowTubeGeometry(outerR, innerR, height, segments)` in `engine.ts` using `THREE.ExtrudeGeometry` on an annular `THREE.Shape` with a circular `THREE.Path` hole.
   - Replace the solid `THREE.CylinderGeometry` calls in the lower jaw thread boss (`lines 247–254`), `cup_holder` ring (`lines 335–349`), and `swivelFootPad` socket (`lines 491–498`) with `createHollowTubeGeometry(...)`.
   - Use `racewaySlotDiameterMm` in `cable_raceway` (`lines 351–370`) to segment the front raceway wall into vertical cable fingers separated by `racewaySlotDiameterMm` slots.
   - Remove the unused `gussetGeom` allocation on lines 199–220.
3. **Refactor**:
   - Ensure all intermediate `ExtrudeGeometry` parts in `engine.ts` have indexed triangles converted cleanly via `toNonIndexed()` before `mergeGeometries()`.

### Slice 2: Deduplicate `generateClampGeometries()` & Dispose `combinedGeometry` / `deskPreviewMesh` (`DEFECT-35-02`)
1. **Red**:
   - Write component tests spying on `generateClampGeometries` and on `.dispose()` for `combinedGeometry` and `deskPreviewMesh.geometry` during `rebuildMesh()` and `ngOnDestroy()`.
2. **Green**:
   - In `calculateClampMetrics()` (`engine.ts`), dispose `combinedGeometry` (or accept pre-built geometries).
   - In `rebuildMesh()` (`under-desk-clamp-generator.component.ts`), call `generateClampGeometries()` once, compute metrics from the resulting geometries, and call `combinedGeometry.dispose()` (plus `footPadGeometry.dispose()` when `swivelFootPad()` is `false`).
   - In `ngOnDestroy()`, dispose `this.deskPreviewMesh.geometry` and `this.deskPreviewMesh.material`.
   - Create `worker.ts` for off-main-thread export generation.
3. **Refactor**:
   - Centralize mesh disposal in a helper method.

### Slice 3: Mobile Touch Viewport, `439px` Overflow Fix, Mobile Grid Collapse & Light Mode Contrast (`DEFECT-35-03`, `DEFECT-35-04`, `DEFECT-35-05`)
1. **Red**:
   - Write component tests asserting `onTouchStart` / `onTouchMove` update camera spherical coordinates, all range sliders use `.c-input__slider`, and `.metric-value` / `.tips-list` do not use hardcoded `#f3f4f6` / `#cbd5e1`.
2. **Green**:
   - Add `(touchstart)="onTouchStart($event)"`, `(touchmove)="onTouchMove($event)"`, and `(touchend)="onTouchEnd()"` on `.clamp-viewport` with `touch-action: none`.
   - Replace `.c-input--slider` with `.c-input__slider` (`min-height: 38px`).
   - Add `min-width: 0; overflow-wrap: anywhere; white-space: normal;` on `.c-header` / `.c-header__title`, `@media (max-width: 768px)` single-column rules for `.control-row-2` and `.metrics-grid`, and CSS custom properties (`var(--color-text-primary)`, `var(--color-text-secondary)`) for `.metric-value` and `.tips-list`.
3. **Refactor**:
   - Move styles to `under-desk-clamp-generator.component.scss`.
