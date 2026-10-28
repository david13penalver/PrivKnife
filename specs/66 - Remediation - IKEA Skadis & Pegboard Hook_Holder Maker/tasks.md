# Tasks 66: Remediation Checklist — IKEA Skadis & Pegboard Hook & Holder Maker

- **Spec ID**: `66`
- **Remediates Tool**: `36 - IKEA Skadis & Pegboard Hook & Holder Maker` (`skadis-pegboard-maker`)

---

## Phase 1: Engine & Algorithmic Remediation (Seam 1 — Red → Green)
- [ ] **1.1 (Red)**: Add unit test in `src/app/tools/3d/skadis-pegboard-maker/skadis-pegboard-maker.component.spec.ts` asserting `tool_holster` and `cylinder_cup` generate hollow cylindrical cavities using `innerR` / `cupInnerR` rather than solid cylinders, and toggling `reinforceRib` changes triangle count across all 5 holder styles (`DEFECT-36-01`).
- [ ] **1.2 (Green)**: Implement `createHollowCylinderGeometry(outerR, innerR, height, bottomThickness, segments)` in `engine.ts` and use it for `tool_holster` (`bottomThickness = 0`) and `cylinder_cup` (`bottomThickness = 3.0`), and wire `reinforceRib` into `shelf_bracket`, `tool_holster`, and `cylinder_cup` (`DEFECT-36-01`).

## Phase 2: Web Worker Offloading & Memory Hygiene (Seam 2 & 3 — Red → Green)
- [ ] **2.1 (Red)**: Write component test verifying `rebuildMesh()` calls `generateSkadisGeometries()` only once per input change, disposes `combinedGeometry` (and `lockingWedgeGeometry` when unused), and `ngOnDestroy()` disposes `pegboardMesh.geometry` and `pegboardMesh.material` (`DEFECT-36-02`).
- [ ] **2.2 (Green)**: Deduplicate `generateSkadisGeometries()` in `rebuildMesh()`, dispose `combinedGeometry` in both `calculateSkadisMetrics()` and `rebuildMesh()`, and dispose `pegboardMesh` in `ngOnDestroy()` (`DEFECT-36-02`).
- [ ] **2.3 (Green)**: Create `src/app/tools/3d/skadis-pegboard-maker/worker.ts` for off-main-thread `.STL` / `.3MF` export synthesis (`DEFECT-36-02`).

## Phase 3: Component UI State & Touch Viewport Handlers (Seam 3 — Red → Green)
- [ ] **3.1 (Red)**: Write component test asserting `onTouchStart()`, `onTouchMove()`, and `onTouchEnd()` orbit the 3D camera on `.skadis-viewport` (`DEFECT-36-05`).
- [ ] **3.2 (Green)**: Implement `onTouchStart()`, `onTouchMove()`, and `onTouchEnd()` in `skadis-pegboard-maker.component.ts` and bind them on `.skadis-viewport` with `touch-action: none` (`DEFECT-36-05`).

## Phase 4: Mobile Adaptation, Light/Dark Theme Contrast & BEM Styling (Seam 4)
- [ ] **4.1 (Red)**: Write component DOM test asserting all range sliders use `.c-input__slider`, `.c-header__title` wraps without horizontal overflow, `.control-row-2` and `.metrics-grid` collapse on mobile, and `.metric-value` / `.tips-list` use CSS custom properties (`DEFECT-36-03`, `DEFECT-36-04`, `DEFECT-36-05`).
- [ ] **4.2 (Green)**: Update styles in `skadis-pegboard-maker.component.ts` / `.scss`: set `min-width: 0; overflow-wrap: anywhere; white-space: normal;` on `.c-header` / `.c-header__title`, add `@media (max-width: 768px) { .control-row-2, .metrics-grid { grid-template-columns: 1fr; } }`, replace `#f3f4f6` / `#cbd5e1` with `var(--color-text-primary)` / `var(--color-text-secondary)`, and use `.c-input__slider` with `>= 38px` touch targets (`DEFECT-36-03`, `DEFECT-36-04`, `DEFECT-36-05`).

## Phase 5: Verification & Regression Gate
- [ ] **5.1**: Run unit tests: `npx vitest run src/app/tools/3d/skadis-pegboard-maker/`
- [ ] **5.2**: Run production build check: `npm run build`
- [ ] **5.3**: Run headless Chrome audit (`node $SCRATCH/work/skadis-pegboard-maker/test.mjs`) and verify:
  - `0` console errors, `0` page errors, `0` external network requests
  - `hasHorizontalScroll: false` at `1366×900`, `390×844`, and `320×640`
  - `smallTouchTargetCount === 0`
  - High-contrast `.metric-value` and `.tips-list` in Light Mode
  - Valid `.STL` and 2-object `.3MF` exports
