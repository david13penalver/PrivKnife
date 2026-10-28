# Remediation Implementation Plan: Custom Mechanical Keycap & Switch Tester Maker

- **Spec ID**: `69`
- **Tool**: `39 - Custom Mechanical Keycap & Switch Tester Maker` (`keycap-switch-tester-maker`)
- **Route**: `/tools/keycap-switch-tester-maker`
- **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/3d/keycap-switch-tester-maker/
├── types.ts                                          # Add Worker request/response types
├── engine.ts                                         # Fix manifold MX stem extrusion, keycap top dish/tilt & flush inlay, and flat-bottomed switch tester frame with 1.5mm snap lip
├── engine.spec.ts                                    # NEW/UPDATED: Unit tests for connected MX stem cylinder, dishDepthMm/tiltAngleDeg effect, and switch tester minZ === 0
├── worker.ts                                         # NEW: Web Worker for off-main-thread STL/3MF export
├── keycap-switch-tester-maker.component.ts           # Fix mouseup leak, add touch orbit handlers, wire worker bridge
├── keycap-switch-tester-maker.component.scss         # NEW: Extract styles, fix light-mode contrast variables, fix 390px/320px overflow & 38px touch targets
└── keycap-switch-tester-maker.component.spec.ts      # Add tests for mouseup cleanup, touch orbit, and responsive/theme classes
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Export Correctness Boundary (`engine.ts` / `engine.spec.ts`)
- **Functions Under Test**:
  - `generateKeycapMesh(options: KeycapSwitchTesterOptions)`
  - `generateSwitchTesterMesh(options: KeycapSwitchTesterOptions)`
  - `processKeycapSwitchTester(options, format)`
- **Concrete Assertions**:
  1. `generateKeycapMesh()` returns a `stemGeometry` with `> 100` triangles and outer perimeter vertices at radius `~2.75 mm` (`Math.hypot(x, y) >= 2.7`), proving the outer cylinder barrel is present around the cross slot.
  2. Changing `dishDepthMm` from `0` to `1.2` lowers the center top Z coordinate of `shellGeometry` by `~1.2 mm`.
  3. `generateSwitchTesterMesh({ ...DEFAULT_KEYCAP_TESTER_OPTIONS, mode: 'switch_tester', trayTiltDeg: 8 })` produces a `shellGeometry` whose bounding box minimum Z is `0` (`Math.abs(box.min.z) < 1e-3`) and which contains both the `14.0 mm` top plate aperture and `15.6 mm` lower cavity.

### Seam 2: Web Worker & Main-Thread Protection Boundary (`worker.ts` / `keycap-switch-tester-maker.component.ts`)
- **Protocol**:
  - Request: `{ id: number; options: KeycapSwitchTesterOptions; format: KeycapExportFormat }`
  - Response: `{ id: number; ok: true; result: KeycapSwitchTesterResult } | { id: number; ok: false; error: string }`
- **Lifecycle**: Terminated in `ngOnDestroy()`.

### Seam 3: Component State, Touch Controls & Resource Disposal Boundary (`keycap-switch-tester-maker.component.ts` / `keycap-switch-tester-maker.component.spec.ts`)
- **Assertions**:
  - `ngOnDestroy()` removes the window `'mouseup'` listener and terminates the worker.
  - Touch events on the canvas rotate `meshGroup`.

### Seam 4: Mobile Responsive & Theme Styling Boundary (`keycap-switch-tester-maker.component.scss`)
- **Assertions**:
  - `.c-input__label` and `.badge-dim` use `var(--color-text-primary)` / `var(--color-text-secondary)`.
  - `scrollWidth <= clientWidth` at `390px` and `320px`.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: Manifold Cylindrical MX Cross Stem (`buildMxStemGeometry`)
- **Red**: Write a test in `engine.spec.ts` asserting that `generateKeycapMesh(DEFAULT_KEYCAP_TESTER_OPTIONS).stemGeometry` has vertices on the `R = 2.75 mm` circle (`maxRadius >= 2.70 mm`) and `> 100` triangles. Observe failure (`48` triangles from 4 small boxes).
- **Green**: Rewrite `buildMxStemGeometry()` in `engine.ts` to create a circular `THREE.Shape` (`R = 2.75 mm`) with a 12-vertex cruciform `THREE.Path` hole (`crossSpan = 4.10 + toleranceMm`, `crossThick = 1.17 + toleranceMm`) and extrude it with `THREE.ExtrudeGeometry`.
- **Refactor**: Reuse `buildMxStemGeometry()` cleanly across center and stabilizer stems.

### Slice 2: Keycap Top Tilt, Concave Dish & Flush Inlaid Legend
- **Red**: Write a test in `engine.spec.ts` comparing the center top vertex Z of `generateKeycapMesh({ ...DEFAULT_KEYCAP_TESTER_OPTIONS, dishDepthMm: 0 })` vs `dishDepthMm: 1.2`, asserting a `~1.2 mm` difference, and checking that `inlaid_multicolor` legend `maxZ` does not exceed the top rim. Observe failure.
- **Green**: Update `generateKeycapMesh()` to apply `dim.tiltAngleDeg` and `options.dishDepthMm` across the top cap surface and position `inlaid_multicolor` legends flush with the top surface.
- **Refactor**: Keep vertex indexing deterministic and manifold.

### Slice 3: Flat-Bottomed Switch Tester Wedge Frame with `1.5 mm` Snap-In Lip
- **Red**: Write a test in `engine.spec.ts` calling `generateSwitchTesterMesh({ ...DEFAULT_KEYCAP_TESTER_OPTIONS, mode: 'switch_tester', trayTiltDeg: 8 })` and asserting `boundingBox.min.z === 0`. Observe failure (`min.z === -2.83`).
- **Green**: Update `generateSwitchTesterMesh()` to construct a two-tier switch frame (`1.5 mm` top plate with `14.0 mm` holes over a lower body with `15.6 mm` holes) whose top surface is inclined by `trayTiltDeg` while its bottom vertices remain flat at `z = 0`.
- **Refactor**: Clean up intermediate `ExtrudeGeometry` objects after merging.

### Slice 4: Window Listener Cleanup, Touch Orbit & Web Worker Bridge
- **Red**: Write a component test spying on `window.removeEventListener('mouseup', ...)` on destroy.
- **Green**: Store `onWindowMouseUp` and remove it in `ngOnDestroy()`; add touch orbit handlers and `worker.ts`.
- **Refactor**: Revoke download object URLs after anchor click.

### Slice 5: Light-Mode Contrast & 390px/320px Mobile Overflow Fix
- **Red**: Check `layoutReport` at `390px` (`scrollWidth: 433`) and `320px` (`scrollWidth: 434`) and light-mode label contrast (`#e2e8f0` on `#ffffff`).
- **Green**: Extract styles to `keycap-switch-tester-maker.component.scss`, replace `--color-text-main` / `#e2e8f0` with `var(--color-text-primary)`, add `min-width: 0; overflow-wrap: break-word;` on `.c-header__title-group` / `.c-header__title`, wrap `.mode-tabs`, and collapse grids on mobile.
- **Refactor**: Verify 38px minimum touch target heights.
