# Remediation Tasks: Custom Mechanical Keycap & Switch Tester Maker (`Spec 69`)

## Phase 1: Engine & Algorithmic Remediation (Seam 1 — Red → Green)
- [x] **Task 1.1 (Red)**: Add unit test in `PrivKnife/src/app/tools/3d/keycap-switch-tester-maker/engine.spec.ts` asserting that `buildMxStemGeometry()` produces a connected cylindrical stem (`R = 2.75 mm`, `> 100` triangles) around the cruciform slot.
- [x] **Task 1.2 (Green)**: Rewrite `buildMxStemGeometry()` in `PrivKnife/src/app/tools/3d/keycap-switch-tester-maker/engine.ts` using a circular `THREE.Shape` with a 12-vertex cruciform `THREE.Path` hole extruded via `THREE.ExtrudeGeometry`.
- [x] **Task 1.3 (Red)**: Add unit test in `engine.spec.ts` asserting that `dishDepthMm` depresses the center of the keycap top surface, `dim.tiltAngleDeg` tilts the top surface, and `inlaid_multicolor` legends sit flush with the top surface.
- [x] **Task 1.4 (Green)**: Update `generateKeycapMesh()` in `engine.ts` to apply `dishDepthMm`, `dim.tiltAngleDeg`, and flush `inlaid_multicolor` legend placement.
- [x] **Task 1.5 (Red)**: Add unit test in `engine.spec.ts` asserting that `generateSwitchTesterMesh()` with `trayTiltDeg: 8` has a flat bottom at `z = 0` (`boundingBox.min.z === 0`) and includes a `1.5 mm` top switch snap-in lip over a wider lower cavity.
- [x] **Task 1.6 (Green)**: Update `generateSwitchTesterMesh()` in `engine.ts` to build a two-tier hollow frame (`14.0 mm` top plate holes + `15.6 mm` lower housing bays) with bottom vertices anchored at `z = 0`.

## Phase 2: Web Worker Offloading & Memory Hygiene (Seam 2 & 3 — Red → Green)
- [x] **Task 2.1 (Red)**: Add component test in `keycap-switch-tester-maker.component.spec.ts` verifying `window.removeEventListener('mouseup', ...)` is called in `ngOnDestroy()`.
- [x] **Task 2.2 (Green)**: Store bound `onWindowMouseUp` handler in `keycap-switch-tester-maker.component.ts` and remove it in `ngOnDestroy()`.
- [x] **Task 2.3 (Green)**: Create `PrivKnife/src/app/tools/3d/keycap-switch-tester-maker/worker.ts` to run `processKeycapSwitchTester()` off the main thread and terminate the worker in `ngOnDestroy()`.
- [x] **Task 2.4 (Green)**: Revoke download blob URLs after anchor click in `downloadFormat()`.

## Phase 3: Component UI State & Touch Controls (Seam 3 — Red → Green)
- [x] **Task 3.1 (Red)**: Add component test verifying touch orbit rotation on the 3D canvas.
- [x] **Task 3.2 (Green)**: Add `touchstart`, `touchmove`, and `touchend` listeners in `setupCanvasInteractions()` in `keycap-switch-tester-maker.component.ts`.

## Phase 4: Mobile Adaptation, Light/Dark Theme Contrast & BEM Styling (Seam 4)
- [x] **Task 4.1**: Extract inline styles from `keycap-switch-tester-maker.component.ts` into `keycap-switch-tester-maker.component.scss`.
- [x] **Task 4.2**: Replace `var(--color-text-main, #e2e8f0)` and `#cbd5e1` on `.c-input__label`, `.badge-dim`, `.metric-val`, and `.slicer-list` with theme-aware CSS variables (`var(--color-text-primary)`, `var(--color-text-secondary)`, `var(--color-surface-alt)`).
- [x] **Task 4.3**: Add `min-width: 0` and `overflow-wrap: break-word` to `.c-header__title-group`, `.c-header__title`, and `.l-columns__area`, and wrap/stack `.mode-tabs` and grids on mobile so `scrollWidth <= clientWidth` at both `390px` and `320px`.
- [x] **Task 4.4**: Increase touch target height of inputs, sliders, and buttons to `>= 38px`.

## Phase 5: Verification & Regression Gate
- [x] **Task 5.1**: Run `npx vitest run src/app/tools/3d/keycap-switch-tester-maker/` and confirm 100% test pass.
- [x] **Task 5.2**: Run `npm run build` and verify zero build errors.
- [x] **Task 5.3**: Run headless Chrome audit (`node $SCRATCH/audit.mjs keycap-switch-tester-maker`) and verify:
  - `0` console errors, `0` page errors, `0` external network requests.
  - `hasHorizontalScroll: false` at `1366×900`, `390×844`, and `320×640`.
  - Legible light-mode and dark-mode contrast across all labels and metrics.
  - Valid `.stl` and `.3mf` exports in both Keycap and Switch Tester modes.
