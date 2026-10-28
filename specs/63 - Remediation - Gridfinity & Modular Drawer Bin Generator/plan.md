# Plan 63: TDD Implementation Plan — Gridfinity & Modular Drawer Bin Generator Remediation

- **Spec ID**: `63`
- **Remediates Tool**: `33 - Gridfinity & Modular Drawer Bin Generator` (`gridfinity-bin-generator`)
- **Route**: `/tools/gridfinity-bin-generator`
- **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/3d/gridfinity-bin-generator/
├── types.ts                                     # Add worker message interfaces
├── engine.ts                                    # Implement baseMagnetHoles & baseScrewHoles corner pockets; fix degenerate labelTab side triangles
├── engine.spec.ts                               # Unit tests for magnet/screw pockets, scoop/label params, and zero degenerate triangles
├── worker.ts                                    # (New) Dedicated Web Worker for STL/3MF export synthesis
├── gridfinity-bin-generator.component.ts        # Add screw/scoop/label controls, wheel/touch viewport handlers, immediate URL revocation, .c-input__slider
├── gridfinity-bin-generator.component.scss      # (New/Extract) Fix 320px overflow, Light Mode CSS variables, desktop preset text wrapping, >=38px touch targets
└── gridfinity-bin-generator.component.spec.ts   # Component tests for magnet/screw toggles, touch/wheel events, immediate URL revocation, and responsive classes
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Export Correctness Boundary (`engine.ts` / `engine.spec.ts`)
- **Public Functions Under Test**:
  - `generateGridfinityGeometry(options: GridfinityBinOptions): THREE.BufferGeometry`
  - `processGridfinityBin(options: GridfinityBinOptions): Promise<GridfinityEngineOutput>`
- **Concrete Assertions**:
  - `generateGridfinityGeometry({ ...DEFAULT_GRIDFINITY_OPTIONS, baseMagnetHoles: false })` vs `generateGridfinityGeometry({ ...DEFAULT_GRIDFINITY_OPTIONS, baseMagnetHoles: true })`: enabling `baseMagnetHoles` increases triangle count (adding 4 corner magnet recesses per grid cell).
  - Enabling `baseScrewHoles: true` further increases triangle count for the M3 counterbores.
  - Varying `fingerScoopRadiusMm`, `labelTabWidthMm`, and `labelAngleDeg` changes vertex positions when `fingerScoop: true` and `labelTab: true`.
  - Every triangle in `generateGridfinityGeometry(options)` has non-zero cross-product area (`> 1e-6`).

### Seam 2: Web Worker & Main-Thread Protection Boundary (`worker.ts` / Component)
- **Worker Protocol**:
  - Request: `{ id: number; options: GridfinityBinOptions }`
  - Response: `{ id: number; type: 'result' | 'error'; stlBuffer?: ArrayBuffer; threemfBuffer?: ArrayBuffer; metrics?: GridfinityMetrics; error?: string }`
- **Concrete Assertions**:
  - Component terminates any active `Worker` in `ngOnDestroy()`.

### Seam 3: Component State, Controls, Viewport Interaction & Resource Disposal Boundary (`gridfinity-bin-generator.component.ts` / `.spec.ts`)
- **Concrete Assertions**:
  - UI renders controls for `baseScrewHoles`, `fingerScoopRadiusMm` (when `fingerScoop()` is `true`), `labelTabWidthMm`, and `labelAngleDeg` (when `labelTab()` is `true`).
  - `onWheel(WheelEvent)` zooms `camera` and `onTouchStart` / `onTouchMove` rotate `binMesh`.
  - `downloadFormat('stl')` calls `URL.revokeObjectURL()` immediately after triggering the anchor click.

### Seam 4: Mobile Responsive & Theme Styling Boundary (`gridfinity-bin-generator.component.scss`)
- **Concrete Assertions**:
  - `.unit-btn-row` uses a 6-column responsive grid (`minmax(0, 1fr)`) that fits within `320px` without horizontal scroll.
  - `.gridfinity-preset-btn` sets `white-space: normal`.
  - `.metric-value` and `.slicer-list` use CSS custom properties (`var(--color-text-primary)`, `var(--color-text-secondary)`).

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: Base Magnet Pockets, M3 Screw Holes & Non-Degenerate Label Caps in `engine.ts` (`DEFECT-33-01`)
1. **Red**:
   - Write a test in `gridfinity-bin-generator.component.spec.ts` (or `engine.spec.ts`) asserting that `generateGridfinityGeometry({ ...DEFAULT_GRIDFINITY_OPTIONS, baseMagnetHoles: true })` has strictly more triangles than `baseMagnetHoles: false`, `baseScrewHoles: true` has strictly more triangles than `baseScrewHoles: false`, and zero triangles have zero area when `labelTab: true`.
2. **Green**:
   - In `engine.ts`, implement 4 corner recessed cylindrical pockets (`r = 3.25mm`, `depth = 2.4mm` for magnets; `r = 1.6mm`, `depth = 4.5mm` for M3 screws) at `(±13mm, ±13mm)` from each 42mm cell center on the bottom face (`z = 0`) when `baseMagnetHoles` / `baseScrewHoles` are enabled.
   - Replace the degenerate `addQuad` calls on lines 244–257 with `addTriangle(positions, p1, p2, p3)`.
3. **Refactor**:
   - Extract `addBottomFootWithPockets(...)` helper in `engine.ts` to keep cell base synthesis modular.

### Slice 2: Expose Missing Scoop, Label & Screw Controls in Component UI (`DEFECT-33-01`, `DEFECT-33-05`)
1. **Red**:
   - In `gridfinity-bin-generator.component.spec.ts`, assert that enabling `fingerScoop` renders a range slider for `fingerScoopRadiusMm`, enabling `labelTab` renders sliders for `labelTabWidthMm` and `labelAngleDeg`, and a checkbox exists for `baseScrewHoles`.
2. **Green**:
   - Add the `baseScrewHoles` checkbox and conditional `fingerScoopRadiusMm`, `labelTabWidthMm`, and `labelAngleDeg` sliders (using `.c-input__slider`) in `gridfinity-bin-generator.component.ts`.
3. **Refactor**:
   - Ensure `resetToDefaults()` resets all 4 secondary signals cleanly.

### Slice 3: Viewport Touch Orbit, Wheel Zoom, Worker & Immediate URL Revocation (`DEFECT-33-04`, `DEFECT-33-05`)
1. **Red**:
   - Write component tests verifying `onWheel()`, `onTouchStart()`, `onTouchMove()`, and immediate `URL.revokeObjectURL()` during `downloadFormat('stl')`.
2. **Green**:
   - Add `(wheel)`, `(touchstart)`, `(touchmove)`, and `(touchend)` handlers on `.gridfinity-viewport`.
   - Create `worker.ts` and revoke download Blob URLs immediately after `a.click()`.
3. **Refactor**:
   - Terminate active worker in `ngOnDestroy()`.

### Slice 4: `320px` Horizontal Overflow Fix, Desktop Preset Wrapping & Light Mode Contrast (`DEFECT-33-02`, `DEFECT-33-03`)
1. **Red**:
   - Write component DOM test asserting all range sliders use `.c-input__slider`, `.gridfinity-preset-btn` sets `white-space: normal`, and `.metric-value` / `.slicer-list` do not use hardcoded `#f3f4f6` / `#cbd5e1`.
2. **Green**:
   - Update styles so `.unit-btn-row` uses `display: grid; grid-template-columns: repeat(6, minmax(0, 1fr));`, `.c-header__title` sets `overflow-wrap: anywhere; white-space: normal;`, `.gridfinity-preset-btn` sets `white-space: normal`, and `.metric-value` / `.slicer-list` use `var(--color-text-primary)` / `var(--color-text-secondary)`.
3. **Refactor**:
   - Move inline styles to `gridfinity-bin-generator.component.scss`.
