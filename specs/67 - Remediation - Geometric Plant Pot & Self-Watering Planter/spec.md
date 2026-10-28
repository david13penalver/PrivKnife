# Remediation Specification: Geometric Plant Pot & Self-Watering Planter

- **Spec ID**: `67`
- **Remediates Tool**: `37 - Geometric Plant Pot & Self-Watering Planter`
- **Slug**: `geometric-plant-pot`
- **Category**: `3d`
- **Route**: `/tools/geometric-plant-pot`
- **Audit Reference**: [`tools_31_60_audit.md#tool-37`](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-37)
- **Current Audit Verdict**: Functional: `✅ Works` | Mobile: `⚠️ Minor issues` | Overall: `⚠️`
- **Status**: `Ready for Implementation`
- **Priority**: `High`

---

## 1. Executive Summary & Audit Baseline

### What Currently Works
- **3D Viewport & Presets**: The WebGL viewport (`534×380` on desktop) initializes and renders cleanly with zero console or page errors across all 4 presets (*Hexagonal Spiral Self-Watering Planter*, *Low-Poly Faceted Succulent Pot & Saucer*, *Neoclassical Fluted Cachepot*, and *Twisted Decagon Herb Planter*).
- **Interactive Controls**: All 4 aesthetic styles (`twisted_polygon`, `low_poly_faceted`, `vertical_flutes`, `smooth_minimal`), 3 drainage modes (`self_watering_insert`, `drainage_with_saucer`, `decorative_cover`), Exploded View / Assemble View toggle, and Reset to Defaults execute reactively.
- **Deliverable Exports**:
  - **Binary `.STL`**: Downloads valid binary STL files (e.g., `geometric-planter-twisted_polygon-110mm.stl`, `56,484` bytes, `1,128` triangles, exact byte match `84 + 1128 × 50`, `0` `NaN` values).
  - **Multi-Part `.3MF`**: Downloads valid OPC/ZIP `.3mf` archives (`12,832` bytes) containing `[Content_Types].xml`, `_rels/.rels`, and `3D/3dmodel.model` with separate mesh objects (`Outer Planter` and `Self-Watering Insert Basket` or `Drip Saucer`).
- **Privacy Compliance**: Zero external network calls or telemetry during load, interaction, or export.

### What Fails or Degrades
1. **Light-Mode Contrast Failure (`High`)**: `.metric-value` (`#f3f4f6`) and `.tips-list` (`#cbd5e1`) are hardcoded light colors inside `.c-card`, rendering metric readouts and "Watertight Slicing Recommendations" nearly invisible in light mode.
2. **Missing Drainage Holes in Saucer Mode & Zero-Thickness Non-Manifold Insert (`Medium`)**:
   - Selecting *Bottom Drainage with Matching Drip Saucer* (`drainage_with_saucer`) spawns the drip saucer beside the pot, but `createOuterPotGeometry()` ignores `planterType` and seals the pot bottom solid with zero drainage holes.
   - `createReservoirInsertGeometry()` builds the insert basket wall (`CylinderGeometry` with `openEnded: true`), floor (`RingGeometry`), and top lip (`RingGeometry`) as zero-thickness 2D surfaces rather than manifold watertight solids.
3. **Small Mobile (320px) Horizontal Overflow & Unresponsive 2-Column Grids (`Medium`)**: At `320×640`, `scrollWidth` reaches `377px` (`+57px` overflow) because the `<h1>` title overflows and `.btn-grid-2`, `.control-row-2`, and `.metrics-grid` enforce `grid-template-columns: 1fr 1fr` with zero `@media` queries.
4. **`BufferGeometry` Memory Leaks on Every Slider Input (`Medium`)**:
   - `generatePlanterGeometries()` constructs `combinedGeometry` on every call, which is never disposed in `recalculateMetrics()` or `rebuildMesh()`.
   - `createCombinedPrintBedGeometry()` disposes `potClone` but leaks `insertClone` and `saucerClone`.
   - `initThree()` creates a `soilMesh` that is immediately removed from the group by `rebuildMesh()` without disposing its geometry/material.
5. **Main-Thread Execution & Missing Touch Orbit Controls (`Low`)**: No Web Worker (`worker.ts`) is used for mesh generation/export, the Three.js canvas lacks `touchstart`/`touchmove`/`touchend` listeners, and styles/templates lack BEM prefixes and `TranslocoPipe` i18n bindings.

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-37-01` — Unreadable Hardcoded Light Colors in Light Mode
- **Severity**: `High`
- **Category**: `Theme Contrast`
- **Location**: [`geometric-plant-pot.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/geometric-plant-pot/geometric-plant-pot.component.ts#L527-L568)
- **Symptom & Evidence**: In light mode (`mobile.png`, `small.png`), `.metric-value` renders in `#f3f4f6` (`rgb(243, 244, 246)`) on `rgba(255, 255, 255, 0.03)` over a white `.c-card` surface, and `.tips-list` renders in `#cbd5e1` on `rgba(16, 185, 129, 0.06)`, failing WCAG AA contrast (`< 1.2:1`).
- **Root Cause**: Component inline styles hardcode dark-theme hex colors (`#f3f4f6`, `#cbd5e1`, `#34d399`) and translucent white backgrounds (`rgba(255, 255, 255, 0.03)`) instead of PrivKnife's theme-aware CSS custom properties.
- **Remediation Specification**:
  - Extract inline styles to `geometric-plant-pot.component.scss`.
  - Replace `.metric-value { color: #f3f4f6; }` with `color: var(--color-text-primary, var(--color-text));`.
  - Replace `.metric-item` background/border with `background: var(--color-surface-alt, rgba(148, 163, 184, 0.08)); border: 1px solid var(--color-border, rgba(148, 163, 184, 0.2));`.
  - Replace `.tips-list { color: #cbd5e1; }` with `color: var(--color-text-secondary, var(--color-text));`.

### `DEFECT-37-02` — Sealed Pot Floor in `drainage_with_saucer` Mode & Non-Manifold 2D Insert Surfaces
- **Severity**: `Medium`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/geometric-plant-pot/engine.ts#L155-L277), [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/geometric-plant-pot/engine.ts#L322-L336)
- **Symptom & Evidence**:
  1. When `planterType === 'drainage_with_saucer'`, `createOuterPotGeometry()` still closes the inner and outer bottom center fans to `(0, 0, 0)` and `(0, 0, floorZ)`, creating a completely sealed pot bottom with zero drainage path into the saucer beneath it.
  2. When `planterType === 'self_watering_insert'`, `createReservoirInsertGeometry()` uses an open `CylinderGeometry(..., openEnded: true)` and two zero-thickness `RingGeometry` surfaces (`bottomRing` and `lipRing`), producing non-manifold zero-volume sheet geometry that 3D slicers reject or repair unpredictably.
- **Root Cause**:
  1. `createOuterPotGeometry(options)` never branches on `options.planterType === 'drainage_with_saucer'` when constructing the bottom floor triangles (`r = 0`).
  2. `createReservoirInsertGeometry(options)` uses 2D `RingGeometry` primitives instead of extruding a closed cross-sectional profile or manifold hollow cylinders with wall thickness `t = Math.max(1.6, options.wallThicknessMm * 0.75)`.
- **Remediation Specification**:
  1. In `createOuterPotGeometry(options)`, when `options.planterType === 'drainage_with_saucer'`, replace the solid center fan at `r = 0` with an annular floor ring having a central drainage aperture of radius `drainHoleR = Math.max(4.0, options.topDiameterMm * 0.1)` and connect the inner floor hole ring (`z = floorZ`) to the outer bottom hole ring (`z = 0`) with a manifold cylindrical hole wall.
  2. In `createReservoirInsertGeometry(options)`, replace the open `CylinderGeometry` and 2D `RingGeometry` primitives with a manifold revolution/extrusion (e.g., `THREE.LatheGeometry` or closed inner/outer wall + top flange thickness `2.0 mm` + perforated/annular floor thickness `2.0 mm` + manifold wicking cup).

### `DEFECT-37-03` — `BufferGeometry` Memory Leaks in `generatePlanterGeometries`, `createCombinedPrintBedGeometry`, and `initThree`
- **Severity**: `Medium`
- **Category**: `Memory Hygiene`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/geometric-plant-pot/engine.ts#L445-L475), [`geometric-plant-pot.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/geometric-plant-pot/geometric-plant-pot.component.ts#L912-L956)
- **Symptom & Evidence**:
  1. `createCombinedPrintBedGeometry()` clones `outerPotGeometry`, `insertGeometry`, and `saucerGeometry`, merges them, and only calls `potClone.dispose()`, leaking `insertClone` and `saucerClone`.
  2. `recalculateMetrics()` and `rebuildMesh()` call `generatePlanterGeometries(opts)` on every slider change and discard `result.combinedGeometry` without calling `.dispose()`.
  3. `initThree()` creates `this.soilMesh` (`CylinderGeometry` + `MeshStandardMaterial`), which `rebuildMesh()` immediately removes from `planterGroup` without disposing its geometry or material.
  4. `downloadExport()` retains `URL.createObjectURL(blob)` in `this.objectUrls` until component destruction instead of revoking after download.
- **Root Cause**: Incomplete disposal of temporary `BufferGeometry` clones in `engine.ts` and unused `combinedGeometry`/`soilMesh` instances in the component.
- **Remediation Specification**:
  - In `createCombinedPrintBedGeometry()`, iterate `geomsToMerge.forEach(g => g.dispose())` after `safeMergeGeometries(geomsToMerge)`.
  - In `rebuildMesh()`, dispose `geoms.combinedGeometry` immediately after computing metrics, and remove the dead `soilMesh` allocation from `initThree()` (or properly dispose it in `clearGroup()`).
  - Revoke object URLs via `setTimeout(() => URL.revokeObjectURL(url), 1000)` after triggering anchor download, while also tracking any pending URLs for `ngOnDestroy()`.

### `DEFECT-37-04` — Horizontal Overflow at 320px (`scrollWidth: 377px`) & Unresponsive 2-Column Grids
- **Severity**: `Medium`
- **Category**: `Mobile & Responsive Layout`
- **Location**: [`geometric-plant-pot.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/geometric-plant-pot/geometric-plant-pot.component.ts#L452-L525)
- **Symptom & Evidence**: At `320×640`, `document.documentElement.scrollWidth` is `377px` (`57px` horizontal overflow). The `<h1>` title and `.btn-grid-2`, `.control-row-2`, and `.metrics-grid` (`grid-template-columns: 1fr 1fr`) have no `@media` breakpoint rules and no `min-width: 0` on grid children.
- **Root Cause**: Missing responsive media queries and missing `min-width: 0; overflow-wrap: break-word;` on header and grid containers.
- **Remediation Specification**:
  - Add `min-width: 0; overflow-wrap: break-word;` to `.c-header__title-group`, `.c-header__title`, and `.l-columns__area`.
  - Add `@media (max-width: 640px)` collapsing `.btn-grid-2`, `.control-row-2`, `.metrics-grid`, and `.export-actions` to `grid-template-columns: 1fr`.
  - Ensure all interactive controls (buttons, checkbox labels, range sliders) meet `min-height: 38px`.

### `DEFECT-37-05` — Missing Web Worker, Touch Orbit Controls, BEM Classes, and i18n
- **Severity**: `Low`
- **Category**: `Web Worker & Performance` / `BEM & Form Accessibility`
- **Location**: [`geometric-plant-pot.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/geometric-plant-pot/geometric-plant-pot.component.ts#L336-L348)
- **Symptom & Evidence**:
  - No `worker.ts` exists to offload STL/3MF serialization off the main thread.
  - The 3D viewport only binds `(mousedown)`, `(mousemove)`, `(mouseup)`, and `(wheel)`, preventing touch orbit rotation and pinch zoom on mobile devices.
- **Root Cause**: Omission of touch event listeners on the canvas and Web Worker bridge.
- **Remediation Specification**:
  - Add `worker.ts` handling `{ type: 'export', options, format }` off the main thread with automatic main-thread fallback in JSDOM/test environments, terminating the worker in `ngOnDestroy()`.
  - Add `(touchstart)`, `(touchmove)`, and `(touchend)` handlers on the `<canvas>` element for single-finger orbit and two-finger pinch zoom.

---

## 3. Target Acceptance Criteria

### Functional & Spec Conformance
- [ ] All 4 presets and 4 style generators (`twisted_polygon`, `low_poly_faceted`, `vertical_flutes`, `smooth_minimal`) produce finite (`0` `NaN`) vertex coordinates and valid normals.
- [ ] Selecting `drainage_with_saucer` generates a central drainage hole through the outer pot floor (`drainHoleR >= 4.0 mm`) with a manifold hole wall connecting the inner floor and outer bottom base.
- [ ] Selecting `self_watering_insert` generates a manifold 3D insert basket with positive wall/floor/lip thickness (`>= 1.6 mm`) rather than 2D `RingGeometry` sheets.
- [ ] Both `.stl` and `.3mf` exports succeed with exact binary STL size (`84 + 50 * triangles`) and valid multi-object `.3mf` ZIP structure.

### Mobile & Responsive Layout
- [ ] `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at `1366×900`, `390×844`, and `320×640`.
- [ ] All buttons, range inputs, and checkbox rows have touch target height `>= 38px`.
- [ ] Metric values, form labels, and slicer tips use theme-aware CSS variables (`var(--color-text-primary)`, `var(--color-text-secondary)`) and achieve `>= 4.5:1` contrast in both light and dark modes.
- [ ] Single-finger touch drag rotates the 3D planter model on mobile viewports.

### `AGENTS.md` Prime Directives
- [ ] **Directive 1 & 2**: Zero network requests during initialization, parameter updates, and file exports.
- [ ] **Directive 3**: Heavy export generation is offloaded to `worker.ts` (with fallback when `Worker` is unavailable).
- [ ] **Directive 4**: Zero `BufferGeometry` leaks across repeated slider changes (`combinedGeometry`, `insertClone`, and `saucerClone` properly disposed), worker terminated, and object URLs revoked on cleanup.
