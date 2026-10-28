# Remediation Implementation Plan: Cappuccino Stencil & Airbrush Template Maker

- **Spec ID**: `70`
- **Tool**: `40 - Cappuccino Stencil & Airbrush Template Maker` (`cappuccino-stencil-maker`)
- **Route**: `/tools/cappuccino-stencil-maker`
- **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/3d/cappuccino-stencil-maker/
├── types.ts                                        # Add Worker request/response interfaces
├── engine.ts                                       # Fix generateStencilSvg() curve sampling, implement physical bridge gaps for autoBridgeIslands, and wire rimBevel in generateStencilMesh()
├── engine.spec.ts                                  # NEW/UPDATED: Assert SVG curve point density (>60 outer points, non-degenerate circular holes), autoBridgeIslands geometry change, and rimBevel effect
├── worker.ts                                       # NEW: Web Worker for off-main-thread STL/SVG export
├── cappuccino-stencil-maker.component.ts           # Fix mouseup leak, add touch orbit handlers, wire worker bridge
├── cappuccino-stencil-maker.component.scss         # NEW: Extract styles, fix light-mode contrast variables, fix 390px/320px overflow & 38px touch targets
└── cappuccino-stencil-maker.component.spec.ts      # Add tests for mouseup cleanup, touch orbit, and responsive/theme classes
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Export Correctness Boundary (`engine.ts` / `engine.spec.ts`)
- **Functions Under Test**:
  - `generateStencilSvg(options: CappuccinoStencilMakerOptions): string`
  - `generateStencilMesh(options: CappuccinoStencilMakerOptions)`
  - `processStencil(options, format)`
- **Concrete Assertions**:
  1. `generateStencilSvg(DEFAULT_STENCIL_OPTIONS)` produces an `<svg>` string where the outer contour subpath starts with `M` followed by at least `60` `L` segments spanning both `x < 57.5` (left half of disc) and `x > 57.5` (right half of disc), and the hanging peg hole subpath has at least `24` distinct vertices.
  2. For `motifType: 'custom_text', customText: 'COFFEE'`, `generateStencilMesh({ ...opts, autoBridgeIslands: true })` vs `autoBridgeIslands: false` produces different cutout hole paths (island-bearing `O` is split by `bridgeWidthMm`).
  3. `generateStencilMesh({ ...DEFAULT_STENCIL_OPTIONS, rimBevel: true })` produces a higher `totalTriangles` count than `rimBevel: false`.

### Seam 2: Web Worker & Main-Thread Protection Boundary (`worker.ts` / `cappuccino-stencil-maker.component.ts`)
- **Protocol**:
  - Request: `{ id: number; options: CappuccinoStencilMakerOptions; format: StencilExportFormat }`
  - Response: `{ id: number; ok: true; result: CappuccinoStencilMakerResult } | { id: number; ok: false; error: string }`
- **Lifecycle**: Terminated in `ngOnDestroy()`.

### Seam 3: Component State, Touch Controls & Resource Disposal Boundary (`cappuccino-stencil-maker.component.ts` / `cappuccino-stencil-maker.component.spec.ts`)
- **Assertions**:
  - `ngOnDestroy()` removes the window `'mouseup'` listener and terminates the worker.
  - Touch events on the canvas rotate `objectGroup`.

### Seam 4: Mobile Responsive & Theme Styling Boundary (`cappuccino-stencil-maker.component.scss`)
- **Assertions**:
  - `.c-input__label`, `.checkbox-label`, `.metric-value`, and `.safety-list` use `var(--color-text-primary)` / `var(--color-text-secondary)`.
  - `scrollWidth <= clientWidth` at `390px` and `320px`.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: Fix Curved Path Sampling in `generateStencilSvg()`
- **Red**: Write a test in `engine.spec.ts` calling `generateStencilSvg(DEFAULT_STENCIL_OPTIONS)` and asserting that parsed `<path d="...">` coordinates include points with `x < 20` (left edge of the `Ø 95 mm` disc centered at `cx = 57.5`). Observe failure because all 6 outer points currently have `x >= 57.50`.
- **Green**: Update `pathDataFromPoints()` in `engine.ts` to sample each curve in `path.curves` with `c.getPoints(c.type === 'LineCurve' ? 1 : 32)` (deduplicating consecutive identical points) and emit `M` + `L` coordinates for the outer shape and every hole in `shape.holes`.
- **Refactor**: Ensure SVG coordinates remain formatted to `2` decimal places with zero `NaN` values.

### Slice 2: Physical Stencil Bridges (`autoBridgeIslands`) & Rim Chamfer (`rimBevel`)
- **Red**: Write tests in `engine.spec.ts` asserting that:
  1. `generateStencilMesh({ ...DEFAULT_STENCIL_OPTIONS, motifType: 'custom_text', customText: 'O', autoBridgeIslands: true })` splits the `O` loop into disjoint top/bottom or left/right arcs separated by `bridgeWidthMm` compared to `autoBridgeIslands: false`.
  2. `generateStencilMesh({ ...DEFAULT_STENCIL_OPTIONS, rimBevel: true }).metrics.totalTriangles > generateStencilMesh({ ...DEFAULT_STENCIL_OPTIONS, rimBevel: false }).metrics.totalTriangles`.
- **Green**:
  1. In `buildMotifCutouts()`, separate stroke segments by a gap of `bridgeWidthMm * 0.5` when `autoBridgeIslands` is enabled on island-bearing glyphs (`A`, `B`, `D`, `O`, `P`, `Q`, `R`, `0`, `4`, `6`, `8`, `9`) and offset non-bridged intersecting strokes slightly so `ExtrudeGeometry` triangulates every letter cleanly.
  2. In `generateStencilMesh()`, configure `bevelEnabled: options.rimBevel, bevelThickness: options.rimBevel ? Math.min(0.2, options.thicknessMm * 0.15) : 0, bevelSize: options.rimBevel ? 0.2 : 0, bevelSegments: 1`.
- **Refactor**: Verify `0` `NaN` vertices across all presets with both `rimBevel: true` and `rimBevel: false`.

### Slice 3: Window Listener Cleanup, Touch Orbit & Web Worker Bridge
- **Red**: Write a component test spying on `window.removeEventListener('mouseup', ...)` on destroy.
- **Green**: Store `onWindowMouseUp` and remove it in `ngOnDestroy()`; add `touchstart`/`touchmove`/`touchend` canvas listeners and `worker.ts`.
- **Refactor**: Revoke download object URLs after anchor click.

### Slice 4: Light-Mode Contrast & 390px/320px Mobile Overflow Fix
- **Red**: Check `layoutReport` at `390px` (`scrollWidth: 405`) and `320px` (`scrollWidth: 404`) and light-mode text colors (`#e2e8f0`, `#f8fafc`, `#d1d5db`).
- **Green**: Extract styles to `cappuccino-stencil-maker.component.scss`, replace hardcoded light colors with `var(--color-text-primary)` / `var(--color-text-secondary)`, and add `min-width: 0; overflow-wrap: break-word;` on `.c-header__title-group`, `.c-header__title`, and `.l-columns__area`.
- **Refactor**: Verify 38px minimum touch target heights.
