# Remediation Tasks — Spec 76: Face & License Plate Privacy Blur Tool

> **Tool**: 46 (`face-plate-blur`)
> **Spec**: [spec.md](file:///home/deivision/Projects/Programming/PrivKnife/specs/76%20-%20Remediation%20-%20Face%20&%20License%20Plate%20Privacy%20Blur%20Tool/spec.md)
> **Plan**: [plan.md](file:///home/deivision/Projects/Programming/PrivKnife/specs/76%20-%20Remediation%20-%20Face%20&%20License%20Plate%20Privacy%20Blur%20Tool/plan.md)

---

## Phase 1: Engine Fixes, Brush Censoring & Auto-Detection (`DEFECT-46-01`, `DEFECT-46-02`)
- [x] **Task 1.1 (Red)**: Add unit tests in [`engine.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/engine.spec.ts) for `censorImageBuffer()` (rectangular mosaic, Gaussian blur, solid blackout, and freehand brush stroke points), `detectPrivacyRegions()`, `createSampleCarSaleBlob()`, and non-premature image decoding in `loadImageElement()`.
- [x] **Task 1.2 (Green)**: Update [`types.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/types.ts) to support optional `points?: Array<{ x: number; y: number }>` and `brushRadiusPx?: number` on `CensorRegion`, plus worker message contracts.
- [x] **Task 1.3 (Green)**: Update [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/engine.ts) to:
  - Restrict the 300ms synthetic fallback in `loadImageElement()` strictly to JSDOM test environments (`DEFECT-46-02`).
  - Implement pure buffer-level `censorImageBuffer()` and `applyBrushStrokeCensor()`.
  - Implement `detectPrivacyRegions()` (native `FaceDetector` + client-side skin-tone / plate aspect-ratio heuristic fallback) and `createSampleCarSaleBlob()`.

## Phase 2: Web Worker Offloading (`DEFECT-46-04`)
- [x] **Task 2.1 (Red)**: Add unit tests verifying worker message handling and fallback execution when `Worker` is unavailable.
- [x] **Task 2.2 (Green)**: Create [`worker.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/worker.ts) to execute `censorImageBuffer()` and `detectPrivacyRegions()` off the Angular main thread with progress callbacks (`onProgress`).
- [x] **Task 2.3 (Refactor)**: Ensure any active worker instance is terminated in `ngOnDestroy` (`Directive 4`).

## Phase 3: Interactive Canvas Stage, Coordinate Editors & State Reset (`DEFECT-46-01`, `DEFECT-46-03`)
- [x] **Task 3.1 (Red)**: Add unit tests in [`face-plate-blur.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/face-plate-blur.component.spec.ts) for:
  - Pointer drag rectangle creation (`manual_rect`) and brush stroke painting (`brush_stroke`) on the interactive canvas.
  - Auto-Detect button (`auto_detect_faces`) populating detected regions.
  - Numeric `X`, `Y`, `W`, `H` and effect edits per region in `.c-region-item`.
  - State reset (`previewUrl` and `lastResult` cleared and revoked) when `handleFileSelected()` is called with a new image.
  - `"Load Sample Photo"` button populating a sample image and preset regions.
- [x] **Task 3.2 (Green)**: Replace the static `<img>` preview in [`face-plate-blur.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/face-plate-blur.component.ts) with an interactive `<canvas>` supporting pointer drawing, dragging, and resizing, plus selection mode tabs (`manual_rect`, `brush_stroke`, `auto_detect_faces`), `brushRadiusPx` slider, and editable `X`/`Y`/`W`/`H` inputs per region.
- [x] **Task 3.3 (Green)**: Reset `previewUrl`, `lastResult`, and `errorMessage` (revoking previous blob URLs) inside `handleFileSelected()`, and add the `"Load Sample Photo"` button.

## Phase 4: Responsive Layout, BEM Sliders & Dark-Mode Styling (`DEFECT-46-05`)
- [x] **Task 4.1 (Green)**: Replace `class="c-input__range"` with `class="c-input__slider"` on `#pixelSizeRange`, `#blurRadiusRange`, `#jpegQualityRange`, and `#brushRadiusRange`.
- [x] **Task 4.2 (Green)**: Replace `.g--margin-left-2` on preset region buttons with a responsive flex row (`gap: 0.5rem; flex-wrap: wrap`) and fix `.c-header__title` wrapping so `scrollWidth <= clientWidth` at `320px`.
- [x] **Task 4.3 (Green)**: Replace all hardcoded light-mode hex colors (`#fff`, `#e2e8f0`, `#f8fafc`, `#065f46`, `#64748b`) in [`face-plate-blur.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/face-plate-blur.component.ts) with CSS custom properties (`var(--color-*)`).

## Phase 5: End-to-End & Privacy Verification
- [x] **Task 5.1**: Run `npx vitest run src/app/tools/privacy/face-plate-blur/` and confirm 100% test pass rate.
- [x] **Task 5.2**: Verify in headless Chrome at `1366×900`, `390×844`, and `320×640` that interactive canvas drawing, region coordinate editing, auto-detection, and EXIF-stripped JPEG/PNG downloads succeed with `hasHorizontalScroll: false` and `networkRequests: []`.
