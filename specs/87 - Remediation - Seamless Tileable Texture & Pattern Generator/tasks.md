# Remediation Tasks: Seamless Tileable Texture & Pattern Generator (Tool 57)

- **Target Tool**: `57` — `seamless-texture-generator`
- **Spec Reference**: [`specs/87 - Remediation - Seamless Tileable Texture & Pattern Generator/spec.md`](file:///home/deivision/Projects/Programming/PrivKnife/specs/87%20-%20Remediation%20-%20Seamless%20Tileable%20Texture%20&%20Pattern%20Generator/spec.md)
- **Plan Reference**: [`specs/87 - Remediation - Seamless Tileable Texture & Pattern Generator/plan.md`](file:///home/deivision/Projects/Programming/PrivKnife/specs/87%20-%20Remediation%20-%20Seamless%20Tileable%20Texture%20&%20Pattern%20Generator/plan.md)

---

## Phase 1: Engine & Worker Remediation (`engine.ts`, `worker.ts`, `types.ts`)

- [x] **Task 1.1 (RED — `DEFECT-57-01`)**: Add failing unit tests in [`seamless-texture-generator.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.spec.ts) verifying that `makeSeamlessTexture()` smoothly blends both the vertical seam (`x = halfW` at `y = 0` and `y = height - 1`) and the horizontal seam (`y = halfH` at `x = 0` and `x = width - 1`) outside the center box.
- [x] **Task 1.2 (GREEN — `DEFECT-57-01`)**: Rewrite `makeSeamlessTexture()` in [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/engine.ts) using a two-pass separable toroidal crossfade where seam weight is `1.0` at `distX = 0` / `distY = 0` and `0.0` at `overlapRadiusX` / `overlapRadiusY`.
- [x] **Task 1.3 (RED — `DEFECT-57-03`, `DEFECT-57-04`)**: Add failing unit tests verifying that `pixelDataToPngBytes()` runs without `document.createElement('canvas')`, `processSeamlessTexture()` returns `diffusePixels` and `normalPixels`, and `config.outputResolutionPx` resamples output dimensions.
- [x] **Task 1.4 (GREEN — `DEFECT-57-03`, `DEFECT-57-04`)**: Implement pure-TS `pixelDataToPngBytes()` (CRC32 + uncompressed deflate IDAT) and `resamplePixelData()` in [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/engine.ts), update [`types.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/types.ts), and create [`worker.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/worker.ts).

---

## Phase 2: Component State, Error Handling & Resource Disposal (`seamless-texture-generator.component.ts`)

- [x] **Task 2.1 (RED — `DEFECT-57-02`, `DEFECT-57-03`, `DEFECT-57-04`)**: Add failing component tests in [`seamless-texture-generator.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.spec.ts) asserting that invalid files set `errorMessage()` (rendering `.c-alert--danger`), valid `ImageBitmap` instances have `.close()` called, `renderCanvas()` reuses `result().diffusePixels` / `normalPixels` without re-invoking `makeSeamlessTexture()`, and `#outputResolution` updates `outputResolutionPx`.
- [x] **Task 2.2 (GREEN — `DEFECT-57-02`, `DEFECT-57-03`, `DEFECT-57-04`)**: Update [`seamless-texture-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.ts) to set `errorMessage` on decode failure, call `bitmap.close()` in `finally`, render directly from `result().diffusePixels` / `normalPixels`, expose the `#outputResolution` select control, and terminate any worker on `ngOnDestroy()`.

---

## Phase 3: DOM Security & Sanitization

- [x] **Task 3.1**: Verify that file names used in the CSS snippet and `.zip` archive are sanitized against special characters and that no `innerHTML` or `bypassSecurityTrustHtml` is used.

---

## Phase 4: Styling, BEM Compliance & Responsive Layout

- [x] **Task 4.1 (RED — `DEFECT-57-05`)**: Add DOM/style tests in [`seamless-texture-generator.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.spec.ts) asserting `.c-texture-gen__*` BEM class usage.
- [x] **Task 4.2 (GREEN — `DEFECT-57-05`)**: Refactor template and styles in [`seamless-texture-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.ts) to use `.c-texture-gen__*` BEM classes, replace hardcoded `#e2e8f0` colors with CSS custom properties, wrap `.c-card__header.l-extremo` cleanly on mobile, fix `.c-header__title` wrapping (`overflow-wrap: anywhere`), and enforce `>= 44px` touch targets.

---

## Phase 5: Final Verification & Regression Gate

- [x] **Task 5.1**: Run `npx vitest run src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.spec.ts` and verify 100% of unit and privacy tests pass.
- [x] **Task 5.2**: Verify in headless Chrome at `1440×900`, `390×844`, and `320×568` that `scrollWidth <= clientWidth`, `smallTouchTargets === 0`, and seam blending eliminates both full vertical and horizontal wrap seams.
