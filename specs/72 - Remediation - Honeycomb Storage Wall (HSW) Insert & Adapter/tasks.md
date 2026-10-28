# Remediation Tasks: Honeycomb Storage Wall (HSW) Insert & Adapter (`Spec 72`)

## Phase 1: Engine & Algorithmic Remediation (Seam 1 — Red → Green)
- [ ] **Task 1.1 (Red)**: Add unit tests in `PrivKnife/src/app/tools/3d/hsw-insert-adapter/engine.spec.ts` asserting:
  - `storage_ring` `attachmentGeometry` has no vertices inside `ringDiameterMm / 2` of `(0, standOff)`.
  - `tool_hook` `attachmentGeometry` has `boundingBox.min.z >= frontZ`.
  - `empty_plug` `metrics.totalTriangles` matches the binary STL triangle count.
  - `metrics.acrossFlatsMm` equals `20 + tightnessToleranceMm`.
- [ ] **Task 1.2 (Green)**: Update `safeMergeGeometries()` and `generateHswMesh()` in `PrivKnife/src/app/tools/3d/hsw-insert-adapter/engine.ts` to normalize single-item geometries, shorten the `storage_ring` mounting neck to `standOff - ringInnerDia / 2`, orient the `tool_hook` gusset in `z >= frontZ`, fix `empty_plug` cap geometry, and set `acrossFlatsMm: Math.round(effAcrossFlats * 100) / 100`.
- [ ] **Task 1.3 (Red)**: Add unit test in `engine.spec.ts` asserting that `cellGrid: '2x1'` and `'2x2'` generate ganged multi-cell HSW plugs at canonical HSW pitch with a connecting bridge plate.
- [ ] **Task 1.4 (Green)**: Add `cellGrid?: '1x1' | '2x1' | '2x2'` to `HswInsertAdapterOptions` in `types.ts` and implement multi-cell ganging in `generateHswMesh()` in `engine.ts`.

## Phase 2: Web Worker Offloading & Memory Hygiene (Seam 2 & 3 — Red → Green)
- [ ] **Task 2.1 (Red)**: Add component test in `hsw-insert-adapter.component.spec.ts` verifying `window.removeEventListener('mouseup', ...)` is called in `ngOnDestroy()`.
- [ ] **Task 2.2 (Green)**: Store bound `onWindowMouseUp` handler in `hsw-insert-adapter.component.ts` and remove it in `ngOnDestroy()`.
- [ ] **Task 2.3 (Green)**: Create `PrivKnife/src/app/tools/3d/hsw-insert-adapter/worker.ts` to run `processHsw()` off the main thread and terminate the worker in `ngOnDestroy()`.
- [ ] **Task 2.4 (Green)**: Revoke download blob URLs after anchor click in `downloadFormat()`.

## Phase 3: Component UI State & Controls (Seam 3 — Red → Green)
- [ ] **Task 3.1 (Red)**: Add component test in `hsw-insert-adapter.component.spec.ts` verifying that `resetToDefaults()` resets all option signals (including `hookLengthMm`, `hookAngleDeg`, `magnetDiameterMm`, `magnetDepthMm`, `ringDiameterMm`, and `cellGrid`) to `DEFAULT_HSW_OPTIONS`.
- [ ] **Task 3.2 (Green)**: Fix `resetToDefaults()` in `hsw-insert-adapter.component.ts` to reset all signals from `DEFAULT_HSW_OPTIONS`, add the `cellGrid` (`1×1`, `2×1`, `2×2`) selector in the UI, change `#hookAngle` slider `max="55"` to `max="60"`, and add `touchstart`/`touchmove`/`touchend` listeners in `setupMouseEvents()`.

## Phase 4: Mobile Adaptation, Light/Dark Theme Contrast & BEM Styling (Seam 4)
- [ ] **Task 4.1**: Extract inline styles from `hsw-insert-adapter.component.ts` into `hsw-insert-adapter.component.scss`.
- [ ] **Task 4.2**: Replace `var(--color-text-main, #e2e8f0)` and hardcoded light hex colors on `.c-input__label`, `.checkbox-label`, `.metric-value`, `.badge-dim`, and `.safety-list` with theme-aware CSS variables (`var(--color-text-primary)`, `var(--color-text-secondary)`, `var(--color-surface-alt)`).
- [ ] **Task 4.3**: Add `min-width: 0` and `overflow-wrap: break-word` to `.c-header__title-group`, `.c-header__title`, and `.l-columns__area` so `scrollWidth <= clientWidth` at both `390px` and `320px`.
- [ ] **Task 4.4**: Increase touch target height of inputs, sliders, checkboxes, and buttons to `>= 38px`.

## Phase 5: Verification & Regression Gate
- [ ] **Task 5.1**: Run `npx vitest run src/app/tools/3d/hsw-insert-adapter/` and confirm 100% test pass.
- [ ] **Task 5.2**: Run `npm run build` and verify zero build errors.
- [ ] **Task 5.3**: Run headless Chrome audit (`node $SCRATCH/audit.mjs hsw-insert-adapter`) and verify:
  - `0` console errors, `0` page errors, `0` external network requests.
  - `hasHorizontalScroll: false` at `1366×900`, `390×844`, and `320×640`.
  - Unobstructed `storage_ring` loop and properly braced `tool_hook` gusset in 3D preview and exports.
  - Legible light-mode and dark-mode contrast across all labels, metrics, and workshop tips.
