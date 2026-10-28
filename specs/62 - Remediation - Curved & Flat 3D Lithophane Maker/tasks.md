# Tasks 62: Remediation Checklist — Curved & Flat 3D Lithophane Maker

- **Spec ID**: `62`
- **Remediates Tool**: `32 - Curved & Flat 3D Lithophane Maker` (`lithophane-maker`)

---

## Phase 1: Engine & Algorithmic Remediation (Seam 1 — Red → Green)
- [x] **1.1 (Red)**: Add unit test in `src/app/tools/3d/lithophane-maker/lithophane-maker.component.spec.ts` (or `engine.spec.ts`) asserting `processLithophane(grid, w, h, options, onProgress)` invokes `onProgress` with monotonically increasing values up to `100` (`DEFECT-32-04`).
- [x] **1.2 (Green)**: Add optional `onProgress?: (percent: number) => void` callback parameter to `processLithophane()` in `engine.ts` (`DEFECT-32-04`).

## Phase 2: Web Worker Offloading & Memory Hygiene (Seam 2 & 3 — Red → Green)
- [x] **2.1 (Green)**: Create `src/app/tools/3d/lithophane-maker/worker.ts` to execute high-resolution `processLithophane()` off the main thread and post progress/result messages (`DEFECT-32-04`).
- [x] **2.2 (Red)**: Write component test asserting `downloadFormat('stl')` updates `isGenerating()` and `progressPercent()` and calls `URL.revokeObjectURL()` immediately after download trigger (`DEFECT-32-04`).
- [x] **2.3 (Green)**: Wire `downloadFormat()` in `lithophane-maker.component.ts` to `worker.ts` (with direct fallback when `Worker` is unavailable), updating `isGenerating` / `progressPercent` and calling `URL.revokeObjectURL(url)` right after `a.click()` (`DEFECT-32-04`).
- [x] **2.4 (Red)**: Write component test asserting `onFileDropped()` calls `URL.revokeObjectURL(objectUrl)` inside `img.onload` / `img.onerror` and `ngOnDestroy()` terminates any active worker (`DEFECT-32-04`).
- [x] **2.5 (Green)**: Call `URL.revokeObjectURL(objectUrl)` immediately inside `img.onload` and `img.onerror` in `onFileDropped()`, and terminate active worker in `ngOnDestroy()` (`DEFECT-32-04`).

## Phase 3: Component UI State, Touch/Wheel Viewport & PNG Export (Seam 3 — Red → Green)
- [x] **3.1 (Red)**: Write component test asserting `onWheel()`, `onTouchStart()`, `onTouchMove()`, and `onTouchEnd()` zoom the camera and rotate `lithoMesh` (`DEFECT-32-03`).
- [x] **3.2 (Green)**: Implement `onWheel()`, `onTouchStart()`, `onTouchMove()`, and `onTouchEnd()` in `lithophane-maker.component.ts` and bind `(wheel)`, `(touchstart)`, `(touchmove)`, and `(touchend)` on `.litho-viewport` with `touch-action: none` (`DEFECT-32-03`).
- [x] **3.3 (Red)**: Write component test asserting `downloadPngSnapshot()` renders the backlit lithophane canvas and downloads a `.png` snapshot (`DEFECT-32-05`).
- [x] **3.4 (Green)**: Implement `downloadPngSnapshot()` and add the `Snapshot .PNG` button to the export bar in `lithophane-maker.component.ts` (`DEFECT-32-05`).

## Phase 4: Mobile Adaptation, Light/Dark Theme Contrast & BEM Styling (Seam 4)
- [x] **4.1 (Red)**: Write component DOM test asserting all range sliders use `.c-input__slider` (not `.c-input--slider`), `.litho-preset-btn` sets `white-space: normal`, and `.metric-value` / `.slicer-list` use CSS custom properties instead of `#f3f4f6` / `#cbd5e1` (`DEFECT-32-01`, `DEFECT-32-02`, `DEFECT-32-05`).
- [x] **4.2 (Green)**: Replace `.c-input--slider` with `.c-input__slider`, add `white-space: normal; min-width: 0; height: auto;` to `.litho-preset-btn`, replace hardcoded dark-mode hex colors in `.metric-card`, `.metric-value`, `.slicer-title`, and `.slicer-list` with `var(--color-bg-subtle)`, `var(--color-text-primary)`, and `var(--color-text-secondary)`, and enforce `>= 38px` touch target height on sliders and checkboxes (`DEFECT-32-01`, `DEFECT-32-02`, `DEFECT-32-05`).

## Phase 5: Verification & Regression Gate
- [x] **5.1**: Run unit tests: `npx vitest run src/app/tools/3d/lithophane-maker/`
- [x] **5.2**: Run production build check: `npm run build`
- [x] **5.3**: Run headless Chrome audit (`node $SCRATCH/work/lithophane-maker/test.mjs`) and verify:
  - `0` console errors, `0` page errors, `0` external network requests
  - `hasHorizontalScroll: false` at `1366×900`, `390×844`, and `320×640`
  - `smallTouchTargetCount === 0`
  - High-contrast `.metric-value` and `.slicer-list` in Light Mode and non-overflowing preset descriptions on Desktop
  - Valid `.STL`, `.3MF`, and `.PNG` exports
