# Tasks 65: Remediation Checklist — Under-Desk Clamp & Cable Management Generator

- **Spec ID**: `65`
- **Remediates Tool**: `35 - Under-Desk Clamp & Cable Management Generator` (`under-desk-clamp-generator`)

---

## Phase 1: Engine & Algorithmic Remediation (Seam 1 — Red → Green)
- [x] **1.1 (Red)**: Add unit test in `src/app/tools/3d/under-desk-clamp-generator/under-desk-clamp-generator.component.spec.ts` asserting `cup_holder` ring, bottom thread boss, and `swivelFootPad` socket are hollow annular tubes rather than solid cylinders, and changing `racewaySlotDiameterMm` alters the `cable_raceway` geometry (`DEFECT-35-01`).
- [x] **1.2 (Green)**: Implement `createHollowTubeGeometry(outerR, innerR, height, segments)` in `engine.ts` and use it for the lower jaw thread boss, `cup_holder` ring (`ringInnerR = 40`), and `swivelFootPad` socket; use `racewaySlotDiameterMm` to cut vertical cable slots in the `cable_raceway` front wall; remove dead `gussetGeom` allocation (`DEFECT-35-01`).

## Phase 2: Web Worker Offloading & Memory Hygiene (Seam 2 & 3 — Red → Green)
- [x] **2.1 (Red)**: Write component test verifying `rebuildMesh()` calls `generateClampGeometries()` only once per input change, disposes `combinedGeometry` (and `footPadGeometry` when `swivelFootPad` is `false`), and `ngOnDestroy()` disposes `deskPreviewMesh.geometry` and `deskPreviewMesh.material` (`DEFECT-35-02`).
- [x] **2.2 (Green)**: Deduplicate `generateClampGeometries()` in `rebuildMesh()`, dispose `combinedGeometry` in both `calculateClampMetrics()` and `rebuildMesh()`, and dispose `deskPreviewMesh` in `ngOnDestroy()` (`DEFECT-35-02`).
- [x] **2.3 (Green)**: Create `src/app/tools/3d/under-desk-clamp-generator/worker.ts` for off-main-thread `.STL` / `.3MF` export synthesis (`DEFECT-35-02`).

## Phase 3: Component UI State & Touch Viewport Handlers (Seam 3 — Red → Green)
- [x] **3.1 (Red)**: Write component test asserting `onTouchStart()`, `onTouchMove()`, and `onTouchEnd()` orbit the 3D camera on `.clamp-viewport` (`DEFECT-35-05`).
- [x] **3.2 (Green)**: Implement `onTouchStart()`, `onTouchMove()`, and `onTouchEnd()` in `under-desk-clamp-generator.component.ts` and bind them on `.clamp-viewport` with `touch-action: none` (`DEFECT-35-05`).

## Phase 4: Mobile Adaptation, Light/Dark Theme Contrast & BEM Styling (Seam 4)
- [x] **4.1 (Red)**: Write component DOM test asserting all range sliders use `.c-input__slider`, `.c-header__title` wraps without horizontal overflow, `.control-row-2` and `.metrics-grid` collapse on mobile, and `.metric-value` / `.tips-list` use CSS custom properties (`DEFECT-35-03`, `DEFECT-35-04`, `DEFECT-35-05`).
- [x] **4.2 (Green)**: Update styles in `under-desk-clamp-generator.component.ts` / `.scss`: set `min-width: 0; overflow-wrap: anywhere; white-space: normal;` on `.c-header` / `.c-header__title`, add `@media (max-width: 768px) { .control-row-2, .metrics-grid { grid-template-columns: 1fr; } }`, replace `#f3f4f6` / `#cbd5e1` with `var(--color-text-primary)` / `var(--color-text-secondary)`, and use `.c-input__slider` with `>= 38px` touch targets (`DEFECT-35-03`, `DEFECT-35-04`, `DEFECT-35-05`).

## Phase 5: Verification & Regression Gate
- [x] **5.1**: Run unit tests: `npx vitest run src/app/tools/3d/under-desk-clamp-generator/`
- [x] **5.2**: Run production build check: `npm run build`
- [x] **5.3**: Run headless Chrome audit (`node $SCRATCH/work/under-desk-clamp-generator/test.mjs`) and verify:
  - `0` console errors, `0` page errors, `0` external network requests
  - `hasHorizontalScroll: false` at `1366×900`, `390×844`, and `320×640`
  - `smallTouchTargetCount === 0`
  - High-contrast `.metric-value` and `.tips-list` in Light Mode
  - Valid `.STL` and 3-object `.3MF` exports
