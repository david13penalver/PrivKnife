# Remediation Implementation Plan: Braille & ADA Tactile Door Sign Generator

- **Spec ID**: `68`
- **Tool**: `38 - Braille & ADA Tactile Door Sign Generator` (`braille-ada-sign-generator`)
- **Route**: `/tools/braille-ada-sign-generator`
- **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/3d/braille-ada-sign-generator/
├── types.ts                                          # Add Worker request/response interfaces
├── engine.ts                                         # Fix Math.hypot(dx, dy) in createTextGeometry() to eliminate NaN vertices
├── engine.spec.ts                                    # NEW/UPDATED: Assert 0 NaN floats across all presets, alphabet characters, STL binary, and 3MF XML
├── worker.ts                                         # NEW: Web Worker for off-main-thread STL/3MF generation
├── braille-ada-sign-generator.component.ts           # Wire all secondary controls to updatePreviewMesh(), fix mouseup leak, add touch handlers & worker bridge
├── braille-ada-sign-generator.component.scss         # NEW: Extract styles, fix light-mode contrast variables, fix 320px overflow & 38px touch targets
└── braille-ada-sign-generator.component.spec.ts      # Add tests for reactive secondary controls, mouseup listener cleanup, and touch orbit
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Export Correctness Boundary (`engine.ts` / `engine.spec.ts`)
- **Functions Under Test**:
  - `generateAdaSignMesh(options: BrailleAdaSignGeneratorOptions)`
  - `exportUnifiedStl(base, textAndIcon, braille): ArrayBuffer`
  - `exportMultiColor3mf(base, textAndIcon, braille, options): Promise<Blob>`
  - `processBrailleAdaSign(options, format): Promise<BrailleAdaSignGeneratorResult>`
- **Concrete Assertions**:
  1. For every preset in `ADA_SIGN_PRESETS` and for a test string containing all supported characters (`"ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789-&/"`), every float in `textAndIconGeometry.getAttribute('position').array` is finite (`Number.isFinite(v) === true`).
  2. `exportUnifiedStl()` returns an `ArrayBuffer` where all `triCount * 12` `Float32` normal/vertex values are finite (`0` `NaN`s).
  3. `exportMultiColor3mf()` produces a `3D/3dmodel.model` XML string that does NOT contain `"NaN"`.

### Seam 2: Web Worker & Main-Thread Protection Boundary (`worker.ts` / `braille-ada-sign-generator.component.ts`)
- **Protocol**:
  - Request: `{ id: number; options: BrailleAdaSignGeneratorOptions; format: AdaExportFormat }`
  - Response: `{ id: number; ok: true; result: BrailleAdaSignGeneratorResult } | { id: number; ok: false; error: string }`
- **Lifecycle**: Terminated in `ngOnDestroy()`.

### Seam 3: Component State, Controls & Resource Disposal Boundary (`braille-ada-sign-generator.component.ts` / `braille-ada-sign-generator.component.spec.ts`)
- **Assertions**:
  - Changing `plaqueWidthMm`, `plaqueHeightMm`, `plaqueThicknessMm`, `tactileRaiseMm`, `cornerRadiusMm`, `subText`, `includeFrameBorder`, or `mountHoles` triggers `updatePreviewMesh()` and updates `currentMetrics().estimatedGrams`.
  - `ngOnDestroy()` calls `window.removeEventListener('mouseup', ...)` with the exact bound handler registered in `setupCanvasInteractions()`.

### Seam 4: Mobile Responsive & Theme Styling Boundary (`braille-ada-sign-generator.component.scss`)
- **Assertions**:
  - `.c-input__label`, `.toggle-row`, `.metric-val`, and `.badge-dim` use theme CSS variables (`var(--color-text-primary)`, `var(--color-text-secondary)`) with `>= 4.5:1` contrast in light mode.
  - Header and grids have `min-width: 0; overflow-wrap: break-word;` and collapse to 1 column at `<= 480px`.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: Fix `NaN` Vertex Generation in `createTextGeometry()`
- **Red**: Write a test in `engine.spec.ts` calling `generateAdaSignMesh(DEFAULT_ADA_SIGN_OPTIONS)` (`mainText: 'RESTROOM'`) and asserting `Array.from(textAndIconGeometry.getAttribute('position').array).every(Number.isFinite)`. Observe failure (`NaN` caused by `R` and `M` strokes).
- **Green**: In `engine.ts` line 355, change `const len = Math.sqrt(dx * dy + dx * dx);` to `const len = Math.hypot(dx, dy);`.
- **Refactor**: Also add a finite-bounds check in `fitCameraToSign()` in `braille-ada-sign-generator.component.ts`.

### Slice 2: Reactive Secondary Controls in `BrailleAdaSignGeneratorComponent`
- **Red**: Write a component test in `braille-ada-sign-generator.component.spec.ts` that changes `plaqueWidthMm` from `152` to `250` via the template input event and asserts that `currentMetrics()?.estimatedGrams` increases. Observe failure because `(ngModelChange)="plaqueWidthMm.set($event)"` does not call `updatePreviewMesh()`.
- **Green**: Update all `(ngModelChange)` and `(change)` bindings on `subText`, `plaqueWidthMm`, `plaqueHeightMm`, `plaqueThicknessMm`, `tactileRaiseMm`, `cornerRadiusMm`, `includeFrameBorder`, and `mountHoles` in `braille-ada-sign-generator.component.ts` to call `updatePreviewMesh()`.
- **Refactor**: Group signal setter + preview update into clean component methods.

### Slice 3: Window Listener Cleanup, Touch Orbit & Web Worker Bridge
- **Red**: Write a component test spying on `window.removeEventListener` during `fixture.destroy()` and asserting `'mouseup'` listener removal. Observe failure.
- **Green**: Store `private readonly onWindowMouseUp = () => { this.isDragging = false; };`, register it in `setupCanvasInteractions()`, and remove it in `ngOnDestroy()`. Add `touchstart`/`touchmove`/`touchend` canvas listeners and `worker.ts` for off-main-thread export.
- **Refactor**: Revoke download object URLs after anchor click in `downloadFormat()`.

### Slice 4: Light-Mode Contrast & 320px Mobile Overflow
- **Red**: Verify light-mode computed styles (`#e2e8f0` on `#ffffff`) and `320px` `scrollWidth: 360` in headless Chrome.
- **Green**: Extract styles to `braille-ada-sign-generator.component.scss`, replace `--color-text-main` / `#e2e8f0` / `#cbd5e1` with `var(--color-text-primary)` / `var(--color-text-secondary)`, add `min-width: 0; overflow-wrap: break-word;` on `.c-header__title-group` / `.c-header__title`, and collapse `.btn-grid-2` / `.metrics-panel` below `480px`.
- **Refactor**: Ensure all inputs, sliders, and checkbox labels have `min-height: 38px`.
