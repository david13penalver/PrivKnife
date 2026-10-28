# Remediation Tasks: Cappuccino Stencil & Airbrush Template Maker (`Spec 70`)

## Phase 1: Engine & Algorithmic Remediation (Seam 1 — Red → Green)
- [ ] **Task 1.1 (Red)**: Add unit test in `PrivKnife/src/app/tools/3d/cappuccino-stencil-maker/engine.spec.ts` asserting that `generateStencilSvg()` samples full circular arcs (`x < 20` and `x > 90` on a `95 mm` disc) and outputs non-degenerate multi-point polygons for circular holes.
- [ ] **Task 1.2 (Green)**: Rewrite `pathDataFromPoints()` in `PrivKnife/src/app/tools/3d/cappuccino-stencil-maker/engine.ts` to sample `32` points per curved segment (`EllipseCurve`, `QuadraticBezierCurve`) for both the outer contour and all cutout holes.
- [ ] **Task 1.3 (Red)**: Add unit tests in `engine.spec.ts` asserting that `autoBridgeIslands: true` introduces physical bridge gaps of `bridgeWidthMm` in island-bearing letters and that `rimBevel: true` enables extrusion chamfering.
- [ ] **Task 1.4 (Green)**: Update `buildMotifCutouts()` and `generateStencilMesh()` in `engine.ts` to apply `bridgeWidthMm` gaps when `autoBridgeIslands` is enabled and pass `bevelEnabled: options.rimBevel` to `THREE.ExtrudeGeometry`.

## Phase 2: Web Worker Offloading & Memory Hygiene (Seam 2 & 3 — Red → Green)
- [ ] **Task 2.1 (Red)**: Add component test in `cappuccino-stencil-maker.component.spec.ts` verifying `window.removeEventListener('mouseup', ...)` is called in `ngOnDestroy()`.
- [ ] **Task 2.2 (Green)**: Store bound `onWindowMouseUp` handler in `cappuccino-stencil-maker.component.ts` and remove it in `ngOnDestroy()`.
- [ ] **Task 2.3 (Green)**: Create `PrivKnife/src/app/tools/3d/cappuccino-stencil-maker/worker.ts` to run `processStencil()` off the main thread and terminate the worker in `ngOnDestroy()`.
- [ ] **Task 2.4 (Green)**: Revoke download blob URLs after anchor click in `downloadFormat()`.

## Phase 3: Component UI State & Touch Controls (Seam 3 — Red → Green)
- [ ] **Task 3.1 (Red)**: Add component test verifying touch orbit rotation on the 3D canvas.
- [ ] **Task 3.2 (Green)**: Add `touchstart`, `touchmove`, and `touchend` listeners in `setupMouseEvents()` in `cappuccino-stencil-maker.component.ts`.

## Phase 4: Mobile Adaptation, Light/Dark Theme Contrast & BEM Styling (Seam 4)
- [ ] **Task 4.1**: Extract inline styles from `cappuccino-stencil-maker.component.ts` into `cappuccino-stencil-maker.component.scss`.
- [ ] **Task 4.2**: Replace `var(--color-text-main, #e2e8f0)` and hardcoded light hex colors on `.c-input__label`, `.checkbox-label`, `.metric-value`, `.badge-dim`, and `.safety-list` with theme-aware CSS variables (`var(--color-text-primary)`, `var(--color-text-secondary)`, `var(--color-surface-alt)`).
- [ ] **Task 4.3**: Add `min-width: 0` and `overflow-wrap: break-word` to `.c-header__title-group`, `.c-header__title`, and `.l-columns__area` so `scrollWidth <= clientWidth` at both `390px` and `320px`.
- [ ] **Task 4.4**: Increase touch target height of inputs, sliders, checkboxes, and buttons to `>= 38px`.

## Phase 5: Verification & Regression Gate
- [ ] **Task 5.1**: Run `npx vitest run src/app/tools/3d/cappuccino-stencil-maker/` and confirm 100% test pass.
- [ ] **Task 5.2**: Run `npm run build` and verify zero build errors.
- [ ] **Task 5.3**: Run headless Chrome audit (`node $SCRATCH/audit.mjs cappuccino-stencil-maker`) and verify:
  - `0` console errors, `0` page errors, `0` external network requests.
  - `hasHorizontalScroll: false` at `1366×900`, `390×844`, and `320×640`.
  - Legible light-mode and dark-mode contrast across all labels, metrics, and safety tips.
  - Valid `.stl` and `.svg` downloads across all motifs.
