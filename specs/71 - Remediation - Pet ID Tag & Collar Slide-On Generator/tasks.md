# Remediation Tasks: Pet ID Tag & Collar Slide-On Generator (`Spec 71`)

## Phase 1: Engine & Algorithmic Remediation (Seam 1 — Red → Green)
- [ ] **Task 1.1 (Red)**: Add unit tests in `PrivKnife/src/app/tools/3d/pet-id-tag-generator/engine.spec.ts` asserting that on `bone` and `heart` shapes:
  - `baseGeometry` encloses the split-ring hole at `(0, holeY)` with solid material above `holeY + holeR`.
  - `iconGeometry` does not overlap the split-ring hole (`max.y <= holeY - holeR`).
  - `textGeometry` stays within the vertical bounds of the `bone` waist.
- [ ] **Task 1.2 (Green)**: Update `buildTagShape()` and `generatePetTagMesh()` in `PrivKnife/src/app/tools/3d/pet-id-tag-generator/engine.ts` to add an integrated top eyelet lug on `bone` and `heart` charms and position/scale the icon and text lines within shape-safe bounds.
- [ ] **Task 1.3 (Red)**: Add unit tests in `engine.spec.ts` asserting smooth X-subdivided curvature for `collar_slide_on` with `curvedBand: true` and back-face contact text engraving when `dualSided: true`.
- [ ] **Task 1.4 (Green)**: Subdivide the straight horizontal edges of `collar_slide_on` in `buildTagShape()` and implement `dualSided` back-face engraving in `generatePetTagMesh()`.

## Phase 2: Web Worker Offloading & Memory Hygiene (Seam 2 & 3 — Red → Green)
- [ ] **Task 2.1 (Red)**: Add component test in `pet-id-tag-generator.component.spec.ts` verifying `window.removeEventListener('mouseup', ...)` is called in `ngOnDestroy()`.
- [ ] **Task 2.2 (Green)**: Store bound `onWindowMouseUp` handler in `pet-id-tag-generator.component.ts` and remove it in `ngOnDestroy()`.
- [ ] **Task 2.3 (Green)**: Create `PrivKnife/src/app/tools/3d/pet-id-tag-generator/worker.ts` to run `processPetTag()` off the main thread and terminate the worker in `ngOnDestroy()`.
- [ ] **Task 2.4 (Green)**: Revoke download blob URLs after anchor click in `downloadFormat()`.

## Phase 3: Component UI State & Controls (Seam 3 — Red → Green)
- [ ] **Task 3.1 (Red)**: Add component test verifying the `dualSided` checkbox toggle and touch orbit rotation on the 3D canvas.
- [ ] **Task 3.2 (Green)**: Add the `dualSided` checkbox control to the template in `pet-id-tag-generator.component.ts` and add `touchstart`, `touchmove`, and `touchend` listeners in `setupMouseEvents()`.

## Phase 4: Mobile Adaptation, Light/Dark Theme Contrast & BEM Styling (Seam 4)
- [ ] **Task 4.1**: Extract inline styles from `pet-id-tag-generator.component.ts` into `pet-id-tag-generator.component.scss`.
- [ ] **Task 4.2**: Replace `var(--color-text-main, #e2e8f0)` and hardcoded light hex colors on `.c-input__label`, `.checkbox-label`, `.metric-value`, `.badge-dim`, and `.safety-list` with theme-aware CSS variables (`var(--color-text-primary)`, `var(--color-text-secondary)`, `var(--color-surface-alt)`).
- [ ] **Task 4.3**: Add `min-width: 0` and `overflow-wrap: break-word` to `.c-header__title-group`, `.c-header__title`, and `.l-columns__area` so `scrollWidth <= clientWidth` at `320px`.
- [ ] **Task 4.4**: Increase touch target height of inputs, sliders, checkboxes, and buttons to `>= 38px`.

## Phase 5: Verification & Regression Gate
- [ ] **Task 5.1**: Run `npx vitest run src/app/tools/3d/pet-id-tag-generator/` and confirm 100% test pass.
- [ ] **Task 5.2**: Run `npm run build` and verify zero build errors.
- [ ] **Task 5.3**: Run headless Chrome audit (`node $SCRATCH/audit.mjs pet-id-tag-generator`) and verify:
  - `0` console errors, `0` page errors, `0` external network requests.
  - `hasHorizontalScroll: false` at `1366×900`, `390×844`, and `320×640`.
  - Properly enclosed eyelet hole, non-overlapping icon, and in-bounds text on `bone` and `heart` presets.
  - Legible light-mode and dark-mode contrast across all labels, metrics, and safety tips.
