# Remediation Specification: Cappuccino Stencil & Airbrush Template Maker

- **Spec ID**: `70`
- **Remediates Tool**: `40 - Cappuccino Stencil & Airbrush Template Maker`
- **Slug**: `cappuccino-stencil-maker`
- **Category**: `3d`
- **Route**: `/tools/cappuccino-stencil-maker`
- **Audit Reference**: [`tools_31_60_audit.md#tool-40`](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-40)
- **Current Audit Verdict**: Functional: `⚠️ Partial` | Mobile: `⚠️ Minor issues` | Overall: `⚠️`
- **Status**: `Ready for Implementation`
- **Priority**: `High`

---

## 1. Executive Summary & Audit Baseline

### What Currently Works
- **Presets & 3D Viewport**: All 6 built-in presets (*Classic Latte Art Heart*, *Roasted Coffee Bean*, *Steaming Coffee Mug*, *Barista Rosetta Leaf*, *Cute Cat Paw Print*, and *Custom Name / Monogram*) render in the interactive Three.js viewport with zero console or page errors.
- **Binary `.STL` Export**: Downloads valid binary STL files (e.g., `cappuccino-stencil-heart-95mm.stl`, `32,684` bytes, `652` triangles, exact byte match `84 + 652 × 50`, `0` `NaN` values).
- **Privacy Compliance**: 100% client-side execution with zero external network requests.

### What Fails or Degrades
1. **Broken `.SVG` Export for Curved Contours & Circular Holes (`High`)**:
   - In `generateStencilSvg()`, `pathDataFromPoints()` only reads `c.getPoint(0)` and `c.getPoint(1)` for every `THREE.Curve` and emits a straight `L` segment.
   - As a result, `EllipseCurve` (`absarc`) and `QuadraticBezierCurve` (`quadraticCurveTo`) are collapsed into single straight chords: the `Ø 95 mm` circular stencil outer contour becomes a 6-vertex triangle/wedge (`M 57.50 10.00 L 103.52 45.75 ... L 57.50 10.00 Z`, missing the entire left half of the disc), and full-circle `absarc(0, 2π)` holes (hanging peg hole and cat paw toes) collapse into zero-length points (`M x y L x y Z`).
2. **Light-Mode Contrast Failure (`High`)**:
   - `.c-input__label` (`#e2e8f0`), `.checkbox-label` (`#e2e8f0`), `.metric-value` (`#f8fafc` on `rgba(255, 255, 255, 0.03)`), and `.safety-list` (`#d1d5db`) are hardcoded light colors, rendering form labels, metrics, and food-safety advice nearly invisible in light mode.
3. **No-Op Controls (`autoBridgeIslands` & `rimBevel`) & Missing Custom Silhouette Upload (`Medium`)**:
   - **Bridge Floating Islands (`autoBridgeIslands`)**: Toggling `autoBridgeIslands` only increments `bridgeTabCount` (`Bridge Tabs: 1` vs `0`) without modifying any cutout path or 3D geometry (`778 tris` in both states). Closed-loop letters (`O`, `A`, `B`, `D`, `P`, `Q`, `R`, `0`, `4`, `6`, `8`, `9`) are cut with overlapping stroke slots that leave unbridged or disconnected islands.
   - **Smooth Rim Chamfer (`rimBevel`)**: `generateStencilMesh()` hardcodes `bevelEnabled: false` regardless of `options.rimBevel`.
   - **Unused Image Threshold Fields**: `contrastThreshold` and `invertCutout` exist in `types.ts`, `test-fixtures.ts`, and `validateStencilOptions()`, and Spec §1–§5 specify custom silhouette/SVG upload and `.png` preview export, which are absent from the UI.
4. **Horizontal Overflow on Mobile (`390px` → `405px`, `320px` → `404px`) (`Medium`)**:
   - The `<h1>` header (`Cappuccino Stencil & Airbrush Template Maker`) overflows the right viewport edge on both `390px` and `320px` screens.
5. **Memory Leak, Missing Touch Controls & Missing Web Worker (`Low`)**:
   - `setupMouseEvents()` registers an anonymous `window.addEventListener('mouseup')` listener that is never removed in `ngOnDestroy()`.
   - Missing touch orbit controls on the 3D canvas and missing `worker.ts`.

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-40-01` — `generateStencilSvg()` Collapses Arcs and Bezier Curves Into Single Chords or Zero-Length Points
- **Severity**: `High`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/cappuccino-stencil-maker/engine.ts#L480-L503)
- **Symptom & Evidence**: Downloading `cappuccino-stencil-heart-95mm.svg` produces a `<path>` whose outer disc contour has only 6 vertices (`M 57.50 10.00 L 103.52 45.75 L 132.50 45.75 L 132.50 69.25 L 103.52 69.25 L 57.50 10.00 Z`), because the 285° circular arc from `(103.52, 69.25)` around the disc to `(103.52, 45.75)` is replaced by a single straight line to `(57.50, 10.00)`! Full-circle holes (`absarc(0, 2π)`) have identical start and end points (`c.getPoint(0) === c.getPoint(1)`), emitting degenerate zero-area paths `M 122.50 57.50 L 122.50 57.50 Z`.
- **Root Cause**: `pathDataFromPoints(path: THREE.Path | THREE.Shape)` iterates `for (const c of curves)` and only samples `c.getPoint(0)` and `c.getPoint(1)` instead of sampling intermediate curve points via `path.getPoints(64)` (or `c.getPoints(32)`).
- **Remediation Specification**:
  - Rewrite `pathDataFromPoints(path: THREE.Path | THREE.Shape)` in `engine.ts` to sample dense points along the contour using `const pts = path.getSpacedPoints ? path.getPoints(64) : [];` (or iterate each curve in `path.curves`, sampling `1` point for `LineCurve` and `32` points for `EllipseCurve` / `QuadraticBezierCurve` / `CubicBezierCurve`), transforming each point `(pt.x + cx, cy - pt.y)` into smooth polygon/polyline path segments closed with `Z`.

### `DEFECT-40-02` — Light-Mode Contrast Failure Across Form Labels, Metrics, and Food Safety Tips
- **Severity**: `High`
- **Category**: `Theme Contrast`
- **Location**: [`cappuccino-stencil-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/cappuccino-stencil-maker/cappuccino-stencil-maker.component.ts#L475-L570)
- **Symptom & Evidence**: In light mode (`mobile.png`, `small.png`), `.c-input__label` (`#e2e8f0`), `.checkbox-label` (`#e2e8f0`), `.metric-value` (`#f8fafc`), `.badge-dim` (`#cbd5e1`), and `.safety-list` (`#d1d5db`) are nearly invisible against the white `.c-card` background.
- **Root Cause**: Hardcoded light hex colors and undefined `--color-text-main` with light fallbacks.
- **Remediation Specification**:
  - Extract inline styles to `cappuccino-stencil-maker.component.scss`.
  - Replace all hardcoded light text colors and `--color-text-main` fallbacks with `var(--color-text-primary, var(--color-text))` and `var(--color-text-secondary, var(--color-text-muted))`.
  - Style `.metric-item` and `.safety-box` with theme-aware surface and border tokens.

### `DEFECT-40-03` — `autoBridgeIslands` and `rimBevel` Checkboxes Have Zero Effect on 3D Geometry
- **Severity**: `Medium`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/cappuccino-stencil-maker/engine.ts#L317-L360), [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/cappuccino-stencil-maker/engine.ts#L429-L432)
- **Symptom & Evidence**:
  1. In `buildMotifCutouts()`, `if (hasIsland && options.autoBridgeIslands) { bridgeTabCount += 1; }` only increments the counter; the actual letter stroke paths are unchanged (`778` triangles whether `autoBridgeIslands` is `true` or `false`). Furthermore, multi-stroke letters overlap self-intersecting `Path` holes inside `stencilShape.holes`.
  2. In `generateStencilMesh()`, `THREE.ExtrudeGeometry(stencilShape, { depth: options.thicknessMm, bevelEnabled: false, curveSegments: 48 })` ignores `options.rimBevel`.
- **Root Cause**: Unfinished implementation of island bridge splitting and bevel configuration in `engine.ts`.
- **Remediation Specification**:
  1. When `options.autoBridgeIslands` is `true`, shorten/split closed-loop strokes on island-bearing letters (`A`, `B`, `D`, `O`, `P`, `Q`, `R`, `0`, `4`, `6`, `8`, `9`) and compound motifs by `options.bridgeWidthMm` so physical retention bridges remain intact across the stencil disc, and separate disjoint stroke slots so `stencilShape.holes` do not self-intersect.
  2. In `generateStencilMesh()`, when `options.rimBevel` is `true`, enable a subtle chamfer (`bevelEnabled: true, bevelThickness: Math.min(0.2, options.thicknessMm * 0.15), bevelSize: 0.2, bevelSegments: 1`) on the stencil extrusion.

### `DEFECT-40-04` — Horizontal Overflow at 390px (`scrollWidth: 405px`) and 320px (`scrollWidth: 404px`)
- **Severity**: `Medium`
- **Category**: `Mobile & Responsive Layout`
- **Location**: [`cappuccino-stencil-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/cappuccino-stencil-maker/cappuccino-stencil-maker.component.ts#L39-L49)
- **Symptom & Evidence**: `scrollWidth` is `405px` at `390×844` and `404px` at `320×640` due to the long `<h1>` header (`Cappuccino Stencil & Airbrush Template Maker`).
- **Root Cause**: Missing `min-width: 0; overflow-wrap: break-word;` on `.c-header__title-group`, `.c-header__title`, and `.l-columns__area`.
- **Remediation Specification**:
  - Add `min-width: 0; overflow-wrap: break-word;` to `.c-header__title-group`, `.c-header__title`, and `.l-columns__area`.
  - Collapse `.metrics-panel` to `1fr` at `@media (max-width: 420px)` and ensure all controls meet `min-height: 38px`.

### `DEFECT-40-05` — Leaked `window.addEventListener('mouseup')`, Missing Touch Orbit Controls, and Missing Web Worker
- **Severity**: `Low`
- **Category**: `Memory Hygiene` / `Web Worker & Performance`
- **Location**: [`cappuccino-stencil-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/cappuccino-stencil-maker/cappuccino-stencil-maker.component.ts#L846-L876)
- **Symptom & Evidence**: Anonymous `window.addEventListener('mouseup')` is never removed in `ngOnDestroy()`; no touch handlers exist on the 3D canvas; no `worker.ts` exists.
- **Root Cause**: Unstored listener reference and missing touch/worker implementation.
- **Remediation Specification**:
  - Store `onWindowMouseUp` reference and remove it in `ngOnDestroy()`.
  - Add `touchstart`/`touchmove`/`touchend` canvas handlers and `worker.ts` for off-main-thread export.

---

## 3. Target Acceptance Criteria

### Functional & Spec Conformance
- [ ] `generateStencilSvg()` samples curved contours (`EllipseCurve`, `QuadraticBezierCurve`) with `>= 32` points per curve so the outer disc + tab contour has `>= 60` SVG path vertices and circular holes (peg hole, paw toes) are closed multi-point polygons with positive area.
- [ ] Toggling `autoBridgeIslands` modifies the cutout geometry for island-bearing characters (`O`, `A`, `B`, `D`, `P`, `Q`, `R`, `0`, `4`, `6`, `8`, `9`) by introducing physical stencil bridges of width `bridgeWidthMm`.
- [ ] Toggling `rimBevel` changes the `ExtrudeGeometry` bevel configuration and triangle count.
- [ ] Both `.stl` and `.svg` exports download cleanly with `0` `NaN` values.

### Mobile & Responsive Layout
- [ ] `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at `1366×900`, `390×844`, and `320×640`.
- [ ] All form labels, checkbox labels, metric values, and food-safety tips achieve `>= 4.5:1` contrast in both light and dark modes.
- [ ] All interactive controls have touch target height `>= 38px`.

### `AGENTS.md` Prime Directives
- [ ] **Directive 1 & 2**: Zero external network requests.
- [ ] **Directive 3**: Export generation offloaded to `worker.ts`.
- [ ] **Directive 4**: `window` mouseup listener removed in `ngOnDestroy()`, worker terminated, Three.js resources disposed, and blob URLs revoked after download.
