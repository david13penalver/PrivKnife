# Tasks 63: Remediation Checklist — Gridfinity & Modular Drawer Bin Generator

- **Spec ID**: `63`
- **Remediates Tool**: `33 - Gridfinity & Modular Drawer Bin Generator` (`gridfinity-bin-generator`)

---

## Phase 1: Engine & Algorithmic Remediation (Seam 1 — Red → Green)
- [ ] **1.1 (Red)**: Add unit test in `src/app/tools/3d/gridfinity-bin-generator/gridfinity-bin-generator.component.spec.ts` asserting `generateGridfinityGeometry()` generates additional triangles for 4 corner magnet pockets per unit cell when `baseMagnetHoles: true` and M3 counterbores when `baseScrewHoles: true` (`DEFECT-33-01`).
- [ ] **1.2 (Green)**: Implement 4 corner magnet pockets (`6.5mm` dia × `2.4mm` depth) and M3 screw counterbores (`3.2mm` dia × `4.5mm` depth) in the bottom face of each 42mm grid foot in `engine.ts` (`DEFECT-33-01`).
- [ ] **1.3 (Red)**: Add unit test asserting zero degenerate (zero-area) triangles are emitted when `labelTab: true` (`DEFECT-33-01`).
- [ ] **1.4 (Green)**: Replace degenerate `addQuad()` calls for label tab side caps (`engine.ts:244-257`) with `addTriangle()` (`DEFECT-33-01`).

## Phase 2: Web Worker Offloading & Memory Hygiene (Seam 2 & 3 — Red → Green)
- [ ] **2.1 (Green)**: Create `src/app/tools/3d/gridfinity-bin-generator/worker.ts` to offload `.STL` and `.3MF` export synthesis (`DEFECT-33-05`).
- [ ] **2.2 (Red)**: Write component test asserting `downloadFormat('stl')` calls `URL.revokeObjectURL()` immediately after download trigger (`DEFECT-33-05`).
- [ ] **2.3 (Green)**: Revoke download Blob URLs immediately after `a.click()` in `downloadFormat()` and terminate any active worker in `ngOnDestroy()` (`DEFECT-33-05`).

## Phase 3: Component UI State, Secondary Controls & Touch/Wheel Viewport (Seam 3 — Red → Green)
- [ ] **3.1 (Red)**: Write component test asserting UI controls exist and update geometry for `baseScrewHoles`, `fingerScoopRadiusMm`, `labelTabWidthMm`, and `labelAngleDeg` (`DEFECT-33-01`).
- [ ] **3.2 (Green)**: Add `baseScrewHoles` checkbox and conditional `fingerScoopRadiusMm`, `labelTabWidthMm`, and `labelAngleDeg` range sliders in `gridfinity-bin-generator.component.ts` (`DEFECT-33-01`).
- [ ] **3.3 (Red)**: Write component test asserting `onWheel()`, `onTouchStart()`, `onTouchMove()`, and `onTouchEnd()` zoom the camera and rotate `binMesh` (`DEFECT-33-04`).
- [ ] **3.4 (Green)**: Bind `(wheel)`, `(touchstart)`, `(touchmove)`, and `(touchend)` on `.gridfinity-viewport` with `touch-action: none` (`DEFECT-33-04`).

## Phase 4: Mobile Adaptation, Light/Dark Theme Contrast & BEM Styling (Seam 4)
- [ ] **4.1 (Red)**: Write component DOM test asserting all range sliders use `.c-input__slider`, `.unit-btn-row` does not overflow `320px`, `.gridfinity-preset-btn` sets `white-space: normal`, and `.metric-value` / `.slicer-list` use CSS custom properties (`DEFECT-33-02`, `DEFECT-33-03`, `DEFECT-33-05`).
- [ ] **4.2 (Green)**: Update styles in `gridfinity-bin-generator.component.ts` / `.scss`: set `.unit-btn-row { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); }`, `.c-header__title { overflow-wrap: anywhere; white-space: normal; }`, `.gridfinity-preset-btn { white-space: normal; height: auto; }`, replace `#f3f4f6` / `#cbd5e1` with `var(--color-text-primary)` / `var(--color-text-secondary)`, and use `.c-input__slider` with `>= 38px` touch targets (`DEFECT-33-02`, `DEFECT-33-03`, `DEFECT-33-05`).

## Phase 5: Verification & Regression Gate
- [ ] **5.1**: Run unit tests: `npx vitest run src/app/tools/3d/gridfinity-bin-generator/`
- [ ] **5.2**: Run production build check: `npm run build`
- [ ] **5.3**: Run headless Chrome audit (`node $SCRATCH/work/gridfinity-bin-generator/test.mjs`) and verify:
  - `0` console errors, `0` page errors, `0` external network requests
  - `hasHorizontalScroll: false` at `1366×900`, `390×844`, and `320×640`
  - `smallTouchTargetCount === 0`
  - Toggling `Base Magnet Pockets` changes exported triangle count
  - High-contrast `.metric-value` and `.slicer-list` in Light Mode
