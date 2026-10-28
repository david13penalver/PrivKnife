# Plan 66: TDD Implementation Plan — IKEA Skadis & Pegboard Hook & Holder Maker Remediation

- **Spec ID**: `66`
- **Remediates Tool**: `36 - IKEA Skadis & Pegboard Hook & Holder Maker` (`skadis-pegboard-maker`)
- **Route**: `/tools/skadis-pegboard-maker`
- **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/3d/skadis-pegboard-maker/
├── types.ts                                     # Add worker message interfaces
├── engine.ts                                    # Hollow cylinder helper for tool_holster & cylinder_cup, reinforceRib on all 5 styles, dispose combinedGeometry
├── engine.spec.ts                               # Unit tests for hollow tool_holster & cylinder_cup, reinforceRib effect across all 5 styles, and geometry disposal
├── worker.ts                                    # (New) Dedicated Web Worker for STL/3MF export synthesis
├── skadis-pegboard-maker.component.ts           # Deduplicate generateSkadisGeometries(), dispose combinedGeometry & pegboardMesh, add touch handlers, .c-input__slider
├── skadis-pegboard-maker.component.scss         # (New/Extract) Fix 399px mobile overflow, collapse .control-row-2/.metrics-grid <768px, Light Mode CSS vars
└── skadis-pegboard-maker.component.spec.ts      # Component tests for single-pass rebuildMesh(), pegboardMesh disposal, touch handlers, and responsive classes
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Export Correctness Boundary (`engine.ts` / `engine.spec.ts`)
- **Public Functions Under Test**:
  - `createHollowCylinderGeometry(outerR: number, innerR: number, height: number, bottomThickness?: number, segments?: number): THREE.BufferGeometry`
  - `generateSkadisGeometries(options: SkadisPegboardMakerOptions)`
  - `calculateSkadisMetrics(options: SkadisPegboardMakerOptions): SkadisPegboardMetrics`
- **Concrete Assertions**:
  - For `holderStyle: 'tool_holster'`, the holster ring geometry contains inner bore vertices at horizontal radius `innerR = toolDiameterMm / 2` from the ring center (not a solid cylinder).
  - For `holderStyle: 'cylinder_cup'`, the cup geometry contains inner cavity wall vertices at radius `cupInnerR = toolDiameterMm / 2` and a floor at the bottom.
  - Toggling `reinforceRib` (`true` vs `false`) changes the triangle count of `holderGeometry` across all 5 styles (`single_hook`, `dual_prong`, `shelf_bracket`, `tool_holster`, `cylinder_cup`).

### Seam 2: Web Worker & Main-Thread Protection Boundary (`worker.ts` / Component)
- **Worker Protocol**:
  - Request: `{ id: number; options: SkadisPegboardMakerOptions }`
  - Response: `{ id: number; type: 'result' | 'error'; stlBuffer?: ArrayBuffer; threemfBuffer?: ArrayBuffer; metrics?: SkadisPegboardMetrics; error?: string }`
- **Concrete Assertions**:
  - Component terminates any active `Worker` in `ngOnDestroy()`.

### Seam 3: Component State, Controls, Viewport Interaction & Resource Disposal Boundary (`skadis-pegboard-maker.component.ts` / `.spec.ts`)
- **Concrete Assertions**:
  - `rebuildMesh()` invokes `generateSkadisGeometries()` **only once** per parameter update and calls `.dispose()` on `combinedGeometry` (and on `lockingWedgeGeometry` when `lockingWedge()` is `false` or `pegboardSystem() !== 'ikea_skadis'`).
  - `ngOnDestroy()` calls `.dispose()` on `pegboardMesh.geometry` and `pegboardMesh.material` in addition to `holderMesh` and `wedgeMesh`.
  - `onTouchStart(TouchEvent)` and `onTouchMove(TouchEvent)` rotate `cameraTheta` and `cameraPhi` on `.skadis-viewport`.

### Seam 4: Mobile Responsive & Theme Styling Boundary (`skadis-pegboard-maker.component.scss`)
- **Concrete Assertions**:
  - `.c-header__title` sets `overflow-wrap: anywhere; white-space: normal;` eliminating the `399px` overflow on `390px`/`320px` viewports.
  - `.control-row-2` and `.metrics-grid` collapse to `grid-template-columns: 1fr` under `@media (max-width: 768px)`.
  - `.metric-value` and `.tips-list` use CSS custom properties (`var(--color-text-primary)`, `var(--color-text-secondary)`).

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: Hollow `tool_holster` & `cylinder_cup` Geometries + Consistent `reinforceRib` Support (`DEFECT-36-01`)
1. **Red**:
   - In `skadis-pegboard-maker.component.spec.ts` (or `engine.spec.ts`), write tests asserting:
     1. `generateSkadisGeometries({ ...DEFAULT_SKADIS_OPTIONS, holderStyle: 'tool_holster', toolDiameterMm: 28 })` produces hollow annular geometry with inner wall vertices at radius `14mm` around the ring center.
     2. `generateSkadisGeometries({ ...DEFAULT_SKADIS_OPTIONS, holderStyle: 'cylinder_cup', toolDiameterMm: 48 })` produces hollow cup geometry with inner wall vertices at radius `24mm`.
     3. For each of the 5 `HolderStyle` values (`single_hook`, `dual_prong`, `shelf_bracket`, `tool_holster`, `cylinder_cup`), `generateSkadisGeometries({ ...opts, reinforceRib: true }).holderGeometry` has strictly more triangles than `reinforceRib: false`.
2. **Green**:
   - Implement `createHollowCylinderGeometry(outerR, innerR, height, bottomThickness, segments)` in `engine.ts` using `THREE.ExtrudeGeometry` on an annular `THREE.Shape` with a circular `THREE.Path` hole, plus a bottom disc when `bottomThickness > 0`.
   - Use `createHollowCylinderGeometry(outerR, innerR, holsterHeight, 0, 32)` in `tool_holster` and `createHollowCylinderGeometry(cupOuterR, cupInnerR, cupHeight, 3.0, 32)` in `cylinder_cup`.
   - Gate `braceGeom` in `shelf_bracket` behind `if (reinforceRib)` and add a lower gusset rib under the neck in `tool_holster` and `cylinder_cup` when `reinforceRib` is `true`.
3. **Refactor**:
   - Ensure all extruded parts are converted via `toNonIndexed()` before `mergeGeometries()`.

### Slice 2: Deduplicate `generateSkadisGeometries()` & Dispose `combinedGeometry` / `pegboardMesh` (`DEFECT-36-02`)
1. **Red**:
   - Write component tests spying on `generateSkadisGeometries` and on `.dispose()` for `combinedGeometry` and `pegboardMesh.geometry` during `rebuildMesh()` and `ngOnDestroy()`.
2. **Green**:
   - In `calculateSkadisMetrics()` (`engine.ts`), dispose `combinedGeometry` (or accept pre-built `combinedGeometry`).
   - In `rebuildMesh()` (`skadis-pegboard-maker.component.ts`), call `generateSkadisGeometries()` once, compute metrics from the resulting geometry, and call `combinedGeometry.dispose()` (plus `lockingWedgeGeometry.dispose()` when `!showWedge`).
   - In `ngOnDestroy()`, dispose `this.pegboardMesh.geometry` and `this.pegboardMesh.material`.
   - Create `worker.ts` for off-main-thread export generation.
3. **Refactor**:
   - Consolidate Three.js mesh disposal into a helper method.

### Slice 3: Mobile Touch Viewport, `399px` Overflow Fix, Mobile Grid Collapse & Light Mode Contrast (`DEFECT-36-03`, `DEFECT-36-04`, `DEFECT-36-05`)
1. **Red**:
   - Write component tests asserting `onTouchStart` / `onTouchMove` update camera spherical coordinates, all range sliders use `.c-input__slider`, and `.metric-value` / `.tips-list` do not use hardcoded `#f3f4f6` / `#cbd5e1`.
2. **Green**:
   - Add `(touchstart)="onTouchStart($event)"`, `(touchmove)="onTouchMove($event)"`, and `(touchend)="onTouchEnd()"` on `.skadis-viewport` with `touch-action: none`.
   - Replace `.c-input--slider` with `.c-input__slider` (`min-height: 38px`).
   - Add `min-width: 0; overflow-wrap: anywhere; white-space: normal;` on `.c-header` / `.c-header__title`, `@media (max-width: 768px)` single-column rules for `.control-row-2` and `.metrics-grid`, and CSS custom properties (`var(--color-text-primary)`, `var(--color-text-secondary)`) for `.metric-value` and `.tips-list`.
3. **Refactor**:
   - Move styles to `skadis-pegboard-maker.component.scss`.
