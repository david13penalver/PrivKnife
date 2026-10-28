# Remediation Tasks: Braille & ADA Tactile Door Sign Generator (`Spec 68`)

## Phase 1: Engine & Algorithmic Remediation (Seam 1 — Red → Green)
- [ ] **Task 1.1 (Red)**: Add unit test in `PrivKnife/src/app/tools/3d/braille-ada-sign-generator/engine.spec.ts` asserting that `generateAdaSignMesh()`, `exportUnifiedStl()`, and `exportMultiColor3mf()` produce zero `NaN` values across all 6 presets and the full alphanumeric character set.
- [ ] **Task 1.2 (Green)**: Fix the Euclidean distance formula in `createTextGeometry()` in `PrivKnife/src/app/tools/3d/braille-ada-sign-generator/engine.ts` (`line 355`) from `Math.sqrt(dx * dy + dx * dx)` to `Math.hypot(dx, dy)`.

## Phase 2: Web Worker Offloading & Memory Hygiene (Seam 2 & 3 — Red → Green)
- [ ] **Task 2.1 (Red)**: Add unit test in `braille-ada-sign-generator.component.spec.ts` spying on `window.removeEventListener` and verifying `'mouseup'` cleanup in `ngOnDestroy()`.
- [ ] **Task 2.2 (Green)**: Store bound `onWindowMouseUp` handler in `braille-ada-sign-generator.component.ts` and remove it in `ngOnDestroy()`.
- [ ] **Task 2.3 (Green)**: Create `PrivKnife/src/app/tools/3d/braille-ada-sign-generator/worker.ts` to run `processBrailleAdaSign()` off the main thread and terminate the worker in `ngOnDestroy()`.
- [ ] **Task 2.4 (Green)**: Revoke download blob URLs after anchor click in `downloadFormat()`.

## Phase 3: Component UI State & Controls (Seam 3 — Red → Green)
- [ ] **Task 3.1 (Red)**: Add component test in `braille-ada-sign-generator.component.spec.ts` verifying that updating `subText`, `plaqueWidthMm`, `plaqueHeightMm`, `plaqueThicknessMm`, `tactileRaiseMm`, `cornerRadiusMm`, `includeFrameBorder`, and `mountHoles` triggers `updatePreviewMesh()` and updates `currentMetrics()`.
- [ ] **Task 3.2 (Green)**: Update template bindings in `braille-ada-sign-generator.component.ts` so every parameter change calls `updatePreviewMesh()`.
- [ ] **Task 3.3 (Green)**: Add `touchstart`, `touchmove`, and `touchend` listeners in `setupCanvasInteractions()` for mobile 3D viewport rotation and zoom.

## Phase 4: Mobile Adaptation, Light/Dark Theme Contrast & BEM Styling (Seam 4)
- [ ] **Task 4.1**: Extract inline styles from `braille-ada-sign-generator.component.ts` into `braille-ada-sign-generator.component.scss`.
- [ ] **Task 4.2**: Replace `var(--color-text-main, #e2e8f0)` and hardcoded light hex colors on `.c-input__label`, `.toggle-row`, `.badge-dim`, `.metric-val`, and `.ada-list` with theme-aware CSS variables (`var(--color-text-primary)`, `var(--color-text-secondary)`, `var(--color-surface-alt)`).
- [ ] **Task 4.3**: Add `min-width: 0` and `overflow-wrap: break-word` to `.c-header__title-group`, `.c-header__title`, and `.l-columns__area`, and collapse `.btn-grid-2` and `.metrics-panel` at `@media (max-width: 480px)` to eliminate horizontal overflow at `320px`.
- [ ] **Task 4.4**: Ensure all inputs, sliders, checkboxes, and buttons meet `min-height: 38px`.

## Phase 5: Verification & Regression Gate
- [ ] **Task 5.1**: Run `npx vitest run src/app/tools/3d/braille-ada-sign-generator/` and confirm 100% test pass.
- [ ] **Task 5.2**: Run `npm run build` and verify zero build errors.
- [ ] **Task 5.3**: Run headless Chrome audit (`node $SCRATCH/audit.mjs braille-ada-sign-generator`) and verify:
  - `0` console errors (no `computeBoundingBox` `NaN` errors), `0` page errors, `0` external network requests.
  - Non-blank 3D WebGL preview rendering the sign across all presets.
  - `0` `NaN` values in downloaded `.stl` and `.3mf` files.
  - `hasHorizontalScroll: false` at `1366×900`, `390×844`, and `320×640`.
