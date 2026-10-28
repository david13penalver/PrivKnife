# Tasks 64: Remediation Checklist — Parametric Electronics Box & Snap-Fit Enclosure

- **Spec ID**: `64`
- **Remediates Tool**: `34 - Parametric Electronics Box & Snap-Fit Enclosure` (`electronics-box-enclosure`)

---

## Phase 1: Engine & Algorithmic Remediation (Seam 1 — Red → Green)
- [x] **1.1 (Red)**: Add unit test in `src/app/tools/3d/electronics-box-enclosure/electronics-box-enclosure.component.spec.ts` asserting that when `explodedView: false`, `lidGeometry.boundingBox.min.z >= 0` so the lid prints flat on its outer face with the lip pointing `+Z` (`DEFECT-34-01`).
- [x] **1.2 (Green)**: Update `generateEnclosureGeometries()` in `engine.ts` so `explodedView: false` places the lid top face on `z = 0` and extends the interlocking lip/snap lugs upward (`+Z`) (`DEFECT-34-01`).
- [x] **1.3 (Red)**: Add unit test asserting `ventilationGrille: true` creates through-slots across the lid thickness (`z = [0, lidH]`) instead of raised bars (`[lidH, lidH + 0.8]`), and varying `cornerRadiusMm` changes enclosure geometry (`DEFECT-34-01`).
- [x] **1.4 (Green)**: Implement segmented through-slot lid ventilation and `cornerRadiusMm` corner geometry in `engine.ts` (`DEFECT-34-01`).

## Phase 2: Web Worker Offloading & Memory Hygiene (Seam 2 & 3 — Red → Green)
- [x] **2.1 (Green)**: Create `src/app/tools/3d/electronics-box-enclosure/worker.ts` to offload `.STL` and `.3MF` export synthesis (`DEFECT-34-05`).
- [x] **2.2 (Red)**: Write component test asserting `downloadFormat('stl')` calls `URL.revokeObjectURL()` immediately after download trigger (`DEFECT-34-05`).
- [x] **2.3 (Green)**: Revoke download Blob URLs immediately after `a.click()` in `downloadFormat()` and terminate any active worker in `ngOnDestroy()` (`DEFECT-34-05`).

## Phase 3: Component UI State, `cornerRadiusMm` Slider & Touch/Wheel Viewport (Seam 3 — Red → Green)
- [x] **3.1 (Red)**: Write component test asserting a `.c-input__slider` control exists for `cornerRadiusMm` and updates the signal and geometry (`DEFECT-34-01`).
- [x] **3.2 (Green)**: Add the `Corner Radius / Bevel` slider (`cornerRadiusMm`) to `electronics-box-enclosure.component.ts` (`DEFECT-34-01`).
- [x] **3.3 (Red)**: Write component test asserting `onWheel()`, `onTouchStart()`, `onTouchMove()`, and `onTouchEnd()` zoom the camera and rotate `assemblyGroup` (`DEFECT-34-04`).
- [x] **3.4 (Green)**: Bind `(wheel)`, `(touchstart)`, `(touchmove)`, and `(touchend)` on `.enclosure-viewport` with `touch-action: none` (`DEFECT-34-04`).

## Phase 4: Mobile Adaptation, Light/Dark Theme Contrast & BEM Styling (Seam 4)
- [x] **4.1 (Red)**: Write component DOM test asserting all range sliders use `.c-input__slider`, `.c-header__title` wraps without horizontal overflow, `.enclosure-preset-btn` sets `white-space: normal`, and `.metric-value` / `.slicer-list` use CSS custom properties (`DEFECT-34-02`, `DEFECT-34-03`, `DEFECT-34-05`).
- [x] **4.2 (Green)**: Update styles in `electronics-box-enclosure.component.ts` / `.scss`: set `min-width: 0; overflow-wrap: anywhere; white-space: normal;` on `.c-header` / `.c-header__title`, set `white-space: normal; height: auto;` on `.enclosure-preset-btn`, replace `#f3f4f6` / `#cbd5e1` with `var(--color-text-primary)` / `var(--color-text-secondary)`, and use `.c-input__slider` with `>= 38px` touch targets (`DEFECT-34-02`, `DEFECT-34-03`, `DEFECT-34-05`).

## Phase 5: Verification & Regression Gate
- [x] **5.1**: Run unit tests: `npx vitest run src/app/tools/3d/electronics-box-enclosure/`
- [x] **5.2**: Run production build check: `npm run build`
- [x] **5.3**: Run headless Chrome audit (`node $SCRATCH/work/electronics-box-enclosure/test.mjs`) and verify:
  - `0` console errors, `0` page errors, `0` external network requests
  - `hasHorizontalScroll: false` at `1366×900`, `390×844`, and `320×640`
  - `smallTouchTargetCount === 0`
  - High-contrast `.metric-value` and `.slicer-list` in Light Mode and non-overflowing preset descriptions on Desktop
  - Valid `.STL` and multi-object `.3MF` exports
