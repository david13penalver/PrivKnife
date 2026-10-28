# Remediation Tasks: Geometric Plant Pot & Self-Watering Planter (`Spec 67`)

## Phase 1: Engine & Algorithmic Remediation (Seam 1 — Red → Green)
- [x] **Task 1.1 (Red)**: Add unit test in `PrivKnife/src/app/tools/3d/geometric-plant-pot/engine.spec.ts` asserting that `createOuterPotGeometry({ ...DEFAULT_PLANTER_OPTIONS, planterType: 'drainage_with_saucer' })` leaves an open central drainage hole (`Math.hypot(x, y) >= 4.0` for all floor vertices) with manifold hole wall faces.
- [x] **Task 1.2 (Green)**: Update `createOuterPotGeometry()` in `PrivKnife/src/app/tools/3d/geometric-plant-pot/engine.ts` to generate an annular floor and cylindrical drainage hole wall when `options.planterType === 'drainage_with_saucer'`.
- [x] **Task 1.3 (Red)**: Add unit test in `engine.spec.ts` asserting that `createReservoirInsertGeometry()` produces 3D manifold extruded solids (non-zero Z thickness on floor and top lip) rather than 2D `RingGeometry` surfaces.
- [x] **Task 1.4 (Green)**: Refactor `createReservoirInsertGeometry()` in `engine.ts` to extrude closed annular `THREE.Shape` profiles with inner holes for the basket wall, floor, wicking column, and top lip.

## Phase 2: Web Worker Offloading & Memory Hygiene (Seam 2 & 3 — Red → Green)
- [x] **Task 2.1 (Red)**: Add unit test verifying that `createCombinedPrintBedGeometry()` disposes all cloned input geometries (`potClone`, `insertClone`, `saucerClone`) and that `rebuildMesh()` disposes `combinedGeometry`.
- [x] **Task 2.2 (Green)**: Fix `createCombinedPrintBedGeometry()` in `engine.ts` to call `geomsToMerge.forEach(g => g.dispose())`, dispose `geoms.combinedGeometry` in `recalculateMetrics()` and `rebuildMesh()` in `geometric-plant-pot.component.ts`, and remove dead `soilMesh` creation in `initThree()`.
- [x] **Task 2.3 (Green)**: Create `PrivKnife/src/app/tools/3d/geometric-plant-pot/worker.ts` to run `processGeometricPlantPot()` off the main thread and terminate the worker in `ngOnDestroy()`.
- [x] **Task 2.4 (Green)**: Revoke download blob URLs after anchor click in `downloadExport()` while retaining safety cleanup in `ngOnDestroy()`.

## Phase 3: Component UI State & Touch Controls (Seam 3 — Red → Green)
- [x] **Task 3.1 (Red)**: Write component test in `geometric-plant-pot.component.spec.ts` verifying that `touchstart`, `touchmove`, and `touchend` events on the 3D viewport canvas rotate `planterGroup`.
- [x] **Task 3.2 (Green)**: Implement `onTouchStart()`, `onTouchMove()`, and `onTouchEnd()` in `geometric-plant-pot.component.ts` and bind `(touchstart)`, `(touchmove)`, and `(touchend)` on `<canvas #viewportCanvas>`.

## Phase 4: Mobile Adaptation, Light/Dark Theme Contrast & BEM Styling (Seam 4)
- [x] **Task 4.1**: Extract inline styles from `geometric-plant-pot.component.ts` into `geometric-plant-pot.component.scss`.
- [x] **Task 4.2**: Replace hardcoded light colors (`#f3f4f6` on `.metric-value`, `#cbd5e1` on `.tips-list`, `rgba(255,255,255,0.03)` on `.metric-item`) with theme-aware CSS variables (`var(--color-text-primary)`, `var(--color-text-secondary)`, `var(--color-surface-alt)`, `var(--color-border)`).
- [x] **Task 4.3**: Add `min-width: 0` and `overflow-wrap: break-word` to `.c-header__title-group`, `.c-header__title`, and `.l-columns__area`, and add `@media (max-width: 640px)` rules collapsing `.btn-grid-2`, `.control-row-2`, `.metrics-grid`, and `.export-actions` to `1fr` so `scrollWidth <= 320px`.
- [x] **Task 4.4**: Increase touch target sizing on range sliders, checkboxes, and small buttons to `min-height: 38px`.

## Phase 5: Verification & Regression Gate
- [x] **Task 5.1**: Run `npx vitest run src/app/tools/3d/geometric-plant-pot/` and confirm 100% test pass.
- [x] **Task 5.2**: Run `npm run build` and verify zero TypeScript or bundler errors.
- [x] **Task 5.3**: Run headless Chrome audit (`node $SCRATCH/audit.mjs geometric-plant-pot`) and verify:
  - `0` console errors, `0` page errors, `0` external network requests.
  - `hasHorizontalScroll: false` at `1366×900`, `390×844`, and `320×640`.
  - Legible light-mode and dark-mode contrast in `desktop.png`, `mobile.png`, and `small.png`.
  - Valid `.stl` and `.3mf` downloads across all 3 planter types.
