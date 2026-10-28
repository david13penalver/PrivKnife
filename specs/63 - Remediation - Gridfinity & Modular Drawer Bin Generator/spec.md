# Spec 63: Remediation — Gridfinity & Modular Drawer Bin Generator

- **Spec ID**: `63`
- **Remediates Tool**: `33 - Gridfinity & Modular Drawer Bin Generator`
- **Slug**: `gridfinity-bin-generator`
- **Category**: `3d`
- **Route**: `/tools/gridfinity-bin-generator`
- **Audit Reference**: [`tools_31_60_audit.md#tool-33`](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-33)
- **Current Audit Verdict**:
  - **Functional**: `⚠️ Partial`
  - **Mobile / UI-UX**: `❌ Poor`
  - **Overall**: `⚠️`
- **Status**: `Ready for Implementation`
- **Priority**: `High`

---

## 1. Executive Summary & Audit Baseline

### What Currently Works
- **Initial State & 3D WebGL Preview**: Loads the default `1×1 (3U)` bin (`41.8 × 41.8 × 24.8 mm`, `1 pocket`, `10.3 g (PLA)`, `~1.8 hrs`) and renders the Gridfinity orange mesh in WebGL with `0` console errors, `0` page errors, and `0` external network requests.
- **Presets & Core Controls**: All 5 curated presets (`1×1 Small Parts Bin (3U)`, `1×2 Dual Compartment (4U)`, `2×2 Deep Storage (6U)`, `3×1 Low-Profile Tool Tray (2U)`, `2×3 6-Pocket Organizer (6U)` updating dimensions to `83.8 × 125.8 × 45.8 mm`, `6 pockets`, `73.4 g`, `~7.7 hrs`), unit width/depth buttons (`1`–`6`), height slider (`2U`–`14U`), stacking lip styles (`Standard Gridfinity` `45.8 mm` vs `Flat Rim` `42 mm` vs `None`), X/Y compartments, finger scoop toggle, label tab toggle, and `Reset Defaults` operate cleanly.
- **Deliverable Exports**:
  - **Binary `.STL`**: `gridfinity-bin-2x3x6U.stl` (`13,084` bytes, `260` triangles, exact binary STL byte length `84 + 260 × 50`).
  - **`.3MF` Archive**: `gridfinity-bin-2x3x6U.3mf` (`4,342` bytes, valid ZIP archive containing `[Content_Types].xml`, `_rels/.rels`, and `3D/3dmodel.model` with `520` vertices and `260` triangles).

### What Fails or Violates Standards
- **No-Op `Base Magnet Pockets` Checkbox & Missing Screw/Scoop/Label Controls in UI & Engine**:
  - Toggling `Base Magnet Pockets (6×2mm neodymium press-fit pockets)` updates the `baseMagnetHoles` signal and calls `rebuildMesh()`, but `generateGridfinityGeometry()` in `engine.ts` **never reads `options.baseMagnetHoles` or `options.baseScrewHoles`**—the exported mesh has solid flat bottom pads with zero magnet or screw pockets (`260` triangles regardless of checkbox state).
  - Furthermore, `baseScrewHoles`, `fingerScoopRadiusMm`, `labelTabWidthMm`, and `labelAngleDeg` exist as signals in `gridfinity-bin-generator.component.ts` (`lines 523–529`) and in `GridfinityBinOptions`, but have no UI controls in the template.
  - Also, the left/right cap triangles of `labelTab` in `engine.ts` (`lines 244–257`) call `addQuad()` with duplicate 1st and 4th vertices, producing degenerate zero-area triangles.
- **Severe Light Mode Contrast Defect (WCAG Failure)**: `.metric-value` (`color: #f3f4f6` on `rgba(255, 255, 255, 0.04)`) and `.slicer-list` (`color: #cbd5e1`) are hardcoded for dark mode, rendering dimensions, compartment count, weight, print time, and slicer recommendations almost invisible in Light Mode (~1.09:1 contrast).
- **Horizontal Page Overflow on `320×640` (`scrollWidth: 365px`) & Desktop Preset Button Overflow**:
  - On `320px` viewports, `scrollWidth` is `365px` (`hasHorizontalScroll: true`), caused by `<h1 class="c-header__title">` and `.unit-btn-row` (`6` buttons in a non-wrapping `display: flex; gap: 6px;` row) overflowing the container width.
  - On Desktop (`> 640px`), `.gridfinity-preset-btn` inherits `white-space: nowrap` from `.c-button`, causing 2-line preset descriptions to spill outside the preset buttons and collide across columns.
- **Missing Touch Orbit & Scroll-Wheel Zoom on 3D Viewport**: `.gridfinity-viewport` only binds mouse drag events (`mousedown`/`mousemove`/`mouseup`/`mouseleave`); neither touch drag nor mouse-wheel zoom is supported.
- **Undersized Touch Targets & Deferred `URL.revokeObjectURL()`**: 6 form controls (3 range sliders at `16px` height using `.c-input--slider` instead of `.c-input__slider` and 3 native `13×13px` checkboxes) are under `32px`, and download blob URLs are pushed to `activeDownloadUrls` instead of being revoked immediately after download trigger.

---

## 2. Detailed Defect Registry & Root Cause Analysis

### DEFECT-33-01: `baseMagnetHoles` and `baseScrewHoles` Ignored by `generateGridfinityGeometry()` & Missing UI Controls
- **Severity**: `Critical`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/gridfinity-bin-generator/engine.ts#L52-L68), [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/gridfinity-bin-generator/engine.ts#L123-L159), [`gridfinity-bin-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/gridfinity-bin-generator/gridfinity-bin-generator.component.ts#L219-L250), [`gridfinity-bin-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/gridfinity-bin-generator/gridfinity-bin-generator.component.ts#L523-L529)
- **Symptom & Evidence**:
  - Checking/unchecking `Base Magnet Pockets (6×2mm neodymium press-fit pockets)` produces identical geometry (`260` triangles for `2×3×6U` in both states).
  - `engine.ts` lines 52–68 destructure `options` without `baseMagnetHoles` or `baseScrewHoles`, and lines 123–159 close each 42mm base foot with a single flat bottom quad (`addQuad(positions, [c3MinX, c3MinY, 0], [c3MaxX, c3MinY, 0], ...)`).
  - Signals `baseScrewHoles`, `fingerScoopRadiusMm`, `labelTabWidthMm`, and `labelAngleDeg` (`lines 523–529`) have no corresponding controls in the template.
  - Also, `engine.ts` lines 244–257 pass `[tabMinX, tabRearY, tabBottomZ]` as both `p1` and `p4` to `addQuad()`, emitting a degenerate zero-area triangle on each side of the label tab.
- **Root Cause**:
  - Corner magnet/screw recessed pockets in the Gridfinity base feet and secondary scoop/label sliders were omitted from `generateGridfinityGeometry()` and the template.
- **Remediation Specification**:
  - In `generateGridfinityGeometry()` (`engine.ts`), destructure `baseMagnetHoles` and `baseScrewHoles`. When `baseMagnetHoles` or `baseScrewHoles` is `true`, generate 4 recessed corner pockets per `42×42mm` grid unit at `(±13.0mm, ±13.0mm)` from each cell center on the bottom face (`z = 0`):
    - Magnet pocket: `6.5mm` diameter (`r = 3.25mm`), `2.4mm` depth (`z = 0` to `z = 2.4mm`), octagonal/12-sided recessed bore.
    - Screw hole (when `baseScrewHoles` is `true`): `3.2mm` diameter (`r = 1.6mm`) recessed counterbore extending to `z = 4.5mm`.
  - Fix the label tab side caps (`engine.ts:244-257`) to use a dedicated `addTriangle(positions, p1, p2, p3)` helper instead of passing duplicate vertices to `addQuad()`.
  - Expose UI controls in `gridfinity-bin-generator.component.ts` for `M3 Counterbore Screw Holes` (`baseScrewHoles`), `Scoop Radius` (`fingerScoopRadiusMm`, visible when `fingerScoop()` is `true`), and `Label Tab Width` / `Label Angle` (`labelTabWidthMm`, `labelAngleDeg`, visible when `labelTab()` is `true`).

### DEFECT-33-02: Unreadable Telemetry Metrics & Slicer Recommendations in Light Mode
- **Severity**: `Critical`
- **Category**: `Theme Contrast`
- **Location**: [`gridfinity-bin-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/gridfinity-bin-generator/gridfinity-bin-generator.component.ts#L449-L488)
- **Symptom & Evidence**:
  - In Light Mode (`desktop.png`, `mobile.png`, `small.png`), `.metric-value` (`color: #f3f4f6`) and `.slicer-list` (`color: #cbd5e1`) are rendered over a white `.c-card` (`#ffffff`) at ~1.09:1 and ~1.42:1 contrast ratios.
- **Root Cause**:
  - Hardcoded dark-mode hex colors instead of CSS custom properties.
- **Remediation Specification**:
  - Replace hardcoded `#f3f4f6`, `#cbd5e1`, `#9ca3af`, and `rgba(255, 255, 255, 0.04)` in `.metric-card`, `.metric-label`, `.metric-value`, `.slicer-box`, `.slicer-title`, and `.slicer-list` with `var(--color-bg-subtle)`, `var(--color-border)`, `var(--color-text-primary)`, and `var(--color-text-secondary)`.

### DEFECT-33-03: Horizontal Overflow at `320px` (`scrollWidth: 365px`) & Desktop Preset Button Overflow
- **Severity**: `High`
- **Category**: `Mobile & Responsive Layout`
- **Location**: [`gridfinity-bin-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/gridfinity-bin-generator/gridfinity-bin-generator.component.ts#L363-L390)
- **Symptom & Evidence**:
  - On `320×640` (`small.png`), `scrollWidth` is `365px` (`hasHorizontalScroll: true`), caused by `.c-header__title` and `.unit-btn-row` (`display: flex; gap: 6px;` with 6 buttons that do not wrap or shrink below their padding width).
  - On Desktop (`1366×900`, `desktop.png`), `.gridfinity-preset-btn` inherits `white-space: nowrap` from `.c-button`, causing the 2-line preset descriptions to overflow horizontally out of the buttons.
- **Root Cause**:
  - `.unit-btn-row` lacks `flex-wrap: wrap` (or `grid-template-columns: repeat(6, minmax(0, 1fr))`), `.c-header__title` lacks `overflow-wrap: anywhere`, and `.gridfinity-preset-btn` lacks `white-space: normal`.
- **Remediation Specification**:
  - Change `.unit-btn-row` to `display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px;` with `.unit-btn { min-width: 0; padding-inline: 0; }`.
  - Add `min-width: 0; overflow-wrap: anywhere; white-space: normal;` to `.c-header__title-group` / `.c-header__title`.
  - Add `white-space: normal; min-width: 0; height: auto;` to `.gridfinity-preset-btn`.

### DEFECT-33-04: Missing Touch Orbit & Scroll-Wheel Zoom on 3D Viewport
- **Severity**: `Medium`
- **Category**: `Mobile & Responsive Layout`
- **Location**: [`gridfinity-bin-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/gridfinity-bin-generator/gridfinity-bin-generator.component.ts#L282-L293), [`gridfinity-bin-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/gridfinity-bin-generator/gridfinity-bin-generator.component.ts#L820-L842)
- **Symptom & Evidence**:
  - `.gridfinity-viewport` only binds `(mousedown)`, `(mousemove)`, `(mouseup)`, and `(mouseleave)`. Neither `(wheel)` nor `(touchstart)` / `(touchmove)` / `(touchend)` are implemented, despite the overlay hint stating `"🖱️ Click & Drag to Rotate • Scroll to Zoom"`.
- **Root Cause**:
  - Missing wheel and touch event handlers on `.gridfinity-viewport`.
- **Remediation Specification**:
  - Bind `(wheel)="onWheel($event)"`, `(touchstart)="onTouchStart($event)"`, `(touchmove)="onTouchMove($event)"`, and `(touchend)="onTouchEnd()"` on `.gridfinity-viewport` with `touch-action: none`.

### DEFECT-33-05: 6 Undersized Touch Targets (`.c-input--slider`), Deferred `URL.revokeObjectURL()` & Worker Support
- **Severity**: `Low`
- **Category**: `BEM & Form Accessibility` / `Memory Hygiene` / `Web Worker & Performance`
- **Location**: [`gridfinity-bin-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/gridfinity-bin-generator/gridfinity-bin-generator.component.ts#L135-L250), [`gridfinity-bin-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/gridfinity-bin-generator/gridfinity-bin-generator.component.ts#L780-L815)
- **Symptom & Evidence**:
  - Range sliders use `.c-input--slider` (`16px` tall) instead of `.c-input__slider` (`>= 38px`), and checkboxes are `13×13px`.
  - `downloadFormat()` defers `URL.revokeObjectURL()` until `ngOnDestroy()`.
- **Remediation Specification**:
  - Replace `.c-input--slider` with `.c-input__slider`, style checkboxes at `18×18px` inside `min-height: 38px` labels, revoke download `ObjectURL`s immediately after `a.click()`, and add `worker.ts` for off-main-thread export packaging.

---

## 3. Target Acceptance Criteria

### Functional & Spec Conformance
1. Toggling `Base Magnet Pockets` (`baseMagnetHoles`) or `M3 Screw Holes` (`baseScrewHoles`) visibly adds 4 corner recessed pockets per `42×42mm` base unit and increases the generated triangle count.
2. Adjusting `Scoop Radius`, `Label Tab Width`, and `Label Angle` updates the 3D geometry when `fingerScoop` / `labelTab` are enabled.
3. Zero degenerate (zero-area) triangles are emitted by `generateGridfinityGeometry()`.

### Mobile & Responsive Layout & Theme Contrast
1. `hasHorizontalScroll === false` (`scrollWidth <= clientWidth`) at `1366×900`, `390×844`, and `320×640`.
2. Preset descriptions wrap cleanly on Desktop (`> 640px`), and `.metric-value` / `.slicer-list` achieve `>= 4.5:1` contrast in both Light and Dark themes.
3. `.gridfinity-viewport` supports mouse drag + wheel zoom on desktop and touch drag on mobile.
4. `smallTouchTargetCount === 0`.

### `AGENTS.md` Prime Directives
1. **Directives 1 & 2**: `0` external network requests.
2. **Directive 3**: `worker.ts` offloads `.STL` / `.3MF` packaging.
3. **Directive 4**: Immediate `URL.revokeObjectURL()` after download and complete Three.js + worker disposal in `ngOnDestroy()`.
