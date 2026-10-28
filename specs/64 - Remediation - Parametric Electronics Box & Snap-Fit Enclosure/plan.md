# Plan 64: TDD Implementation Plan — Parametric Electronics Box & Snap-Fit Enclosure Remediation

- **Spec ID**: `64`
- **Remediates Tool**: `34 - Parametric Electronics Box & Snap-Fit Enclosure` (`electronics-box-enclosure`)
- **Route**: `/tools/electronics-box-enclosure`
- **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/3d/electronics-box-enclosure/
├── types.ts                                       # Add worker message interfaces
├── engine.ts                                      # Fix print-bed lid Z>=0 orientation, true through-slot ventilation grille, and cornerRadiusMm bevels
├── engine.spec.ts                                 # Unit tests for lid Z>=0 bed orientation, open grille slots, and cornerRadiusMm geometry changes
├── worker.ts                                      # (New) Dedicated Web Worker for STL/3MF export synthesis
├── electronics-box-enclosure.component.ts         # Add cornerRadiusMm slider, wheel/touch viewport handlers, immediate URL revocation, .c-input__slider
├── electronics-box-enclosure.component.scss       # (New/Extract) Fix 390px/320px header overflow, Light Mode CSS variables, desktop preset wrapping, >=38px touch targets
└── electronics-box-enclosure.component.spec.ts    # Component tests for cornerRadiusMm slider, touch/wheel events, immediate URL revocation, and responsive classes
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Export Correctness Boundary (`engine.ts` / `engine.spec.ts`)
- **Public Functions Under Test**:
  - `generateEnclosureGeometries(options: ElectronicsBoxEnclosureOptions): { baseGeometry; lidGeometry; combinedGeometry }`
  - `processElectronicsEnclosure(options: ElectronicsBoxEnclosureOptions): Promise<ElectronicsEnclosureEngineOutput>`
- **Concrete Assertions**:
  - When `explodedView: false`, `lidGeometry.boundingBox.min.z` is `0` (`>= -1e-5`) and `lidGeometry.boundingBox.max.z` equals `wallThicknessMm + lipProtrusion` (flat print-bed orientation with lip pointing `+Z`).
  - When `ventilationGrille: true` and `explodedView: false`, `lidGeometry.boundingBox.max.z` does **not** increase by `+0.8mm` above the lip/plate, and the lid top plate is segmented into open through-slots (`triangleCount` increases for slot inner walls while keeping top plate at `z = [0, lidH]`).
  - Changing `cornerRadiusMm` from `0` to `4` alters the generated vertex positions/triangle count of `baseGeometry` and `lidGeometry`.

### Seam 2: Web Worker & Main-Thread Protection Boundary (`worker.ts` / Component)
- **Worker Protocol**:
  - Request: `{ id: number; options: ElectronicsBoxEnclosureOptions }`
  - Response: `{ id: number; type: 'result' | 'error'; stlBuffer?: ArrayBuffer; threemfBuffer?: ArrayBuffer; metrics?: ElectronicsBoxMetrics; error?: string }`
- **Concrete Assertions**:
  - Component terminates any active `Worker` in `ngOnDestroy()`.

### Seam 3: Component State, Controls, Viewport Interaction & Resource Disposal Boundary (`electronics-box-enclosure.component.ts` / `.spec.ts`)
- **Concrete Assertions**:
  - Template renders a `.c-input__slider` control for `cornerRadiusMm` that calls `onCornerRadiusChange()`.
  - `onWheel(WheelEvent)` zooms `camera` and `onTouchStart` / `onTouchMove` rotate `assemblyGroup`.
  - `downloadFormat('stl')` calls `URL.revokeObjectURL()` immediately after triggering the anchor click.

### Seam 4: Mobile Responsive & Theme Styling Boundary (`electronics-box-enclosure.component.scss`)
- **Concrete Assertions**:
  - `.c-header__title` wraps (`overflow-wrap: anywhere; white-space: normal;`) so `390px` and `320px` viewports have zero horizontal overflow (`scrollWidth <= clientWidth`).
  - `.enclosure-preset-btn` sets `white-space: normal`.
  - `.metric-value` and `.slicer-list` use CSS custom properties (`var(--color-text-primary)`, `var(--color-text-secondary)`).

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: Support-Free Lid Bed Orientation (`z >= 0`), True Open Ventilation Grille Slots & `cornerRadiusMm` in `engine.ts` (`DEFECT-34-01`)
1. **Red**:
   - In `electronics-box-enclosure.component.spec.ts` (or `engine.spec.ts`), write tests asserting:
     1. `generateEnclosureGeometries({ ...DEFAULT_ENCLOSURE_OPTIONS, explodedView: false }).lidGeometry` has `boundingBox.min.z >= -1e-4` (no negative `-4mm` overhanging snap hooks below `z = 0`).
     2. `generateEnclosureGeometries({ ...DEFAULT_ENCLOSURE_OPTIONS, ventilationGrille: true })` cuts open through-slots through the lid plate (`z = [0, lidH]`) rather than stacking bars at `[lidH, lidH + 0.8]`.
     3. `generateEnclosureGeometries({ ...DEFAULT_ENCLOSURE_OPTIONS, cornerRadiusMm: 5 })` produces corner-beveled geometry distinct from `cornerRadiusMm: 0`.
2. **Green**:
   - In `engine.ts`:
     - When `explodedView === false`, orient the lid plate at `z = [0, lidH]` with the interlocking lip/snap hooks/screw bosses protruding upward at `z = [lidH, lidH + lipProtrusion]`. When `explodedView === true`, keep `lidZBase = outerH + 14` with the lip protruding downward (`[lidZBase - lipProtrusion, lidZBase]`).
     - When `ventilationGrille === true`, build the lid plate from front/rear/left/right frame rails plus internal bridge slats separating open ventilation slots across `[lidZBase, lidZBase + lidH]`.
     - Apply `cornerRadiusMm` corner reinforcement/chamfer blocks to the enclosure corners and expose the `Corner Radius` slider in `electronics-box-enclosure.component.ts`.
3. **Refactor**:
   - Keep `pushBox` helper clean and well-commented.

### Slice 2: Viewport Touch Orbit, Wheel Zoom, Worker & Immediate URL Revocation (`DEFECT-34-04`, `DEFECT-34-05`)
1. **Red**:
   - Write component tests verifying `onWheel()`, `onTouchStart()`, `onTouchMove()`, and immediate `URL.revokeObjectURL()` during `downloadFormat('stl')`.
2. **Green**:
   - Add `(wheel)`, `(touchstart)`, `(touchmove)`, and `(touchend)` handlers on `.enclosure-viewport`.
   - Create `worker.ts` and revoke download Blob URLs immediately after `a.click()`.
3. **Refactor**:
   - Terminate active worker in `ngOnDestroy()`.

### Slice 3: `390px`/`320px` Horizontal Overflow Fix, Desktop Preset Wrapping & Light Mode Contrast (`DEFECT-34-02`, `DEFECT-34-03`, `DEFECT-34-05`)
1. **Red**:
   - Write component DOM test asserting all range sliders use `.c-input__slider`, `.enclosure-preset-btn` sets `white-space: normal`, and `.metric-value` / `.slicer-list` do not use hardcoded `#f3f4f6` / `#cbd5e1`.
2. **Green**:
   - Update styles so `.c-header`, `.c-header__title-group`, and `.c-header__title` set `min-width: 0; overflow-wrap: anywhere; white-space: normal;`, `.enclosure-preset-btn` sets `white-space: normal; height: auto;`, `.closure-btn-row` wraps on small screens, `.metric-value` / `.slicer-list` use `var(--color-text-primary)` / `var(--color-text-secondary)`, and `.c-input__slider` has `>= 38px` touch height.
3. **Refactor**:
   - Extract styles to `electronics-box-enclosure.component.scss`.
