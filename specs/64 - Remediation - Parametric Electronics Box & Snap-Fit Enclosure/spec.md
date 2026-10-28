# Spec 64: Remediation — Parametric Electronics Box & Snap-Fit Enclosure

- **Spec ID**: `64`
- **Remediates Tool**: `34 - Parametric Electronics Box & Snap-Fit Enclosure`
- **Slug**: `electronics-box-enclosure`
- **Category**: `3d`
- **Route**: `/tools/electronics-box-enclosure`
- **Audit Reference**: [`tools_31_60_audit.md#tool-34`](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-34)
- **Current Audit Verdict**:
  - **Functional**: `⚠️ Partial`
  - **Mobile / UI-UX**: `❌ Poor`
  - **Overall**: `⚠️`
- **Status**: `Ready for Implementation`
- **Priority**: `High`

---

## 1. Executive Summary & Audit Baseline

### What Currently Works
- **Initial State & 3D WebGL Preview**: Loads default `DIY Project Box (Snap-Fit)` (`84 × 54 × 34 mm` outer footprint, `288 tris`, `43 g (PLA)`, `~3.8 hrs`), rendering both the base tub and lid side-by-side in WebGL with `0` console errors, `0` page errors, and `0` external network requests.
- **Presets & Controls**: All 4 microcontroller presets (`DIY Project Box`, `Arduino Uno R3/R4 Box` updating to `79 × 62 × 28 mm` and `312 tris`, `ESP32 DevKit Compact Case`, `Raspberry Pi Pico Slider`), dimension sliders (`Inner Length`, `Inner Width`, `Inner Height`, `Wall Thickness`), closure mechanisms (`Cantilever Snap-Fit`, `M3 Screw Bosses`, `Friction Sliding Lid`), `PCB Standoff Height`, `Cable Pass-Through` + `Port Cutout Width`, `Heat Dissipation Cooling Grille Slots`, `Exploded View: ON/OFF` toggle, and `Reset Defaults` operate interactively.
- **Deliverable Exports**:
  - **Binary `.STL`**: `electronics-box-75x58x24mm.stl` (`15,684` bytes, `312` triangles, exact binary STL size match `84 + 312 × 50`).
  - **Multi-Object `.3MF`**: `electronics-box-75x58x24mm.3mf` (`4,033` bytes, valid ZIP archive containing `[Content_Types].xml`, `_rels/.rels`, and `3D/3dmodel.model` with 2 separate `<object>` definitions: `Base Enclosure` id=1 and `Lid Cover` id=2, `624` vertices, `312` triangles).

### What Fails or Violates Standards
- **Flawed Lid Geometry (`ventilationGrille`, `cornerRadiusMm`, and Print-Bed Orientation)**:
  - `ventilationGrille` (`engine.ts` lines 255–267) does **not** cut through-slots in the lid; instead, it appends `0.8 mm` raised solid bars (`lidH` to `lidH + 0.8`) on top of the solid lid plate (`0` to `lidH`), providing zero airflow.
  - When `explodedView: false` (print-bed layout), the lid plate sits at `z = [0, lidH]` while its interlocking lip protrudes downward to `z = -lipProtrusion` (`-4.0 mm` for snap-fit), placing the lid plate floating in mid-air above the bed with only the thin lip touching `z = -4.0 mm` instead of lying flat on its outer top face (`z = 0`) with the lip pointing upward (`+Z`).
  - `cornerRadiusMm` (`3.0 mm` signal in component, specified in `ElectronicsBoxEnclosureOptions`) has no UI slider and is completely ignored by `generateEnclosureGeometries()` in `engine.ts`.
- **Horizontal Page Overflow on Mobile (`390×844` → `421px`, `320×640` → `420px`) & Desktop Preset Button Collision**:
  - `scrollWidth` is `421px` at `390px` viewport and `420px` at `320px` viewport (`hasHorizontalScroll: true`), caused by `.c-header` / `<h1 class="c-header__title">` overflowing horizontally out of the page container.
  - On Desktop (`> 640px`), `.enclosure-preset-btn` inherits `white-space: nowrap` from `.c-button`, causing the 2-line descriptions to overflow out of the preset buttons and collide across columns.
- **Severe Light Mode Contrast Defect (WCAG Failure)**: `.metric-value` (`color: #f3f4f6` on `rgba(255, 255, 255, 0.04)`) and `.slicer-list` (`color: #cbd5e1`) are hardcoded for a dark background, making all telemetry metrics and slicer tips nearly invisible in Light Mode (~1.09:1 contrast).
- **Missing Touch Orbit & Scroll-Wheel Zoom on 3D Viewport**: `.enclosure-viewport` only binds mouse drag events (`mousedown`/`mousemove`/`mouseup`/`mouseleave`); neither touch drag nor mouse-wheel zoom is supported.
- **Undersized Touch Targets & Deferred `URL.revokeObjectURL()`**: 8 form controls (6 range sliders at `16px` height using `.c-input--slider` instead of `.c-input__slider` and 2 native `13×13px` checkboxes) are under `32px`, and download blob URLs are pushed to `activeDownloadUrls` instead of being revoked immediately after download trigger.

---

## 2. Detailed Defect Registry & Root Cause Analysis

### DEFECT-34-01: `ventilationGrille` Adds Solid Raised Bars Instead of Open Slots, `cornerRadiusMm` Is Ignored, and Print-Bed Lid Orientation Floats on Lip
- **Severity**: `Critical`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/electronics-box-enclosure/engine.ts#L57-L68), [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/electronics-box-enclosure/engine.ts#L230-L267), [`electronics-box-enclosure.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/electronics-box-enclosure/electronics-box-enclosure.component.ts#L510-L515)
- **Symptom & Evidence**:
  - In `engine.ts` line 232, the lid plate is always generated as a single solid block `pushBox(lidPositions, lidMinX, lidMaxX, -halfW, halfW, 0, lidH)`. Then lines 255–267 (`if (ventilationGrille)`) add solid bars at `z = [lidH, lidH + 0.8]` on top of the solid plate—there are no openings for air to pass through.
  - In print-bed mode (`explodedView === false`), `lidZBase = 0` while the snap/screw lip is placed at `z = [-lipProtrusion, 0]` (`-4.0mm` to `0mm`), so the lid is oriented face-up with `4mm` of downward-hanging snap hooks below `z = 0`, requiring supports across the entire underside of the lid instead of lying flat on its top face at `z = 0` with the lip pointing upward (`+Z`).
  - `cornerRadiusMm` is defined on `ElectronicsBoxEnclosureOptions` and as a signal in `electronics-box-enclosure.component.ts` (`line 510`), but is never destructured in `engine.ts` and has no UI slider.
- **Root Cause**:
  - `generateEnclosureGeometries()` used a solid `pushBox` for the lid plate instead of segmented slats when `ventilationGrille` is active, placed the lid lip in `-Z` during print-bed layout, and omitted corner bevels/radius and the `cornerRadiusMm` UI slider.
- **Remediation Specification**:
  - **Open Ventilation Slots**: When `ventilationGrille` is `true`, construct the lid top plate (`z = [0, lidH]` in print-bed mode) from solid frame borders around the perimeter plus solid bridge slats between open through-slots (`slotW = 2.4mm`), so air passes completely through the lid thickness (`z = 0` to `lidH`).
  - **Support-Free Print-Bed Lid Orientation**: When `explodedView === false`, orient the lid upside-down on the print bed (`z = [0, lidH]` for the top plate and `z = [lidH, lidH + lipProtrusion]` for the interlocking lip/snap hooks pointing `+Z`) so both the base tub (`z >= 0`) and lid (`z >= 0`) lie completely flat at `z = 0` with zero overhangs. Keep `explodedView === true` showing the lid hovering above the base (`lidZBase = outerH + 14`) with its lip pointing downward (`-Z`) toward the tub opening.
  - **Corner Radius / Chamfer (`cornerRadiusMm`)**: Expose the `Corner Radius / Bevel` slider (`0` to `8 mm`) in `electronics-box-enclosure.component.ts` and incorporate `cornerRadiusMm` into the outer corner pillars/chamfers in `generateEnclosureGeometries()`.

### DEFECT-34-02: Horizontal Page Overflow on Mobile (`390px` → `421px`, `320px` → `420px`) & Desktop Preset Button Overflow
- **Severity**: `High`
- **Category**: `Mobile & Responsive Layout`
- **Location**: [`electronics-box-enclosure.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/electronics-box-enclosure/electronics-box-enclosure.component.ts#L46-L56), [`electronics-box-enclosure.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/electronics-box-enclosure/electronics-box-enclosure.component.ts#L363-L377)
- **Symptom & Evidence**:
  - Headless Chrome audit measured `scrollWidth: 421` at `390×844` and `scrollWidth: 420` at `320×640` (`hasHorizontalScroll: true`), visibly clipping the page header title on the right edge in `mobile.png` and `small.png`.
  - On Desktop (`1366×900`, `desktop.png`), `.enclosure-preset-btn` inherits `white-space: nowrap` from `.c-button`, causing the 2-line descriptions to overflow out of the preset buttons.
- **Root Cause**:
  - `.c-header` / `.c-header__title` does not wrap long titles on narrow viewports, and `.enclosure-preset-btn` does not override `.c-button`'s `white-space: nowrap`.
- **Remediation Specification**:
  - Add `min-width: 0; overflow-wrap: anywhere; white-space: normal;` to `.c-header`, `.c-header__title-group`, and `.c-header__title`, and `flex-wrap: wrap;` on `.l-page__header`.
  - Add `white-space: normal; min-width: 0; height: auto;` to `.enclosure-preset-btn` and `flex-wrap: wrap;` on `.closure-btn-row`.

### DEFECT-34-03: Unreadable Telemetry Metrics & Slicer Recommendations in Light Mode
- **Severity**: `Critical`
- **Category**: `Theme Contrast`
- **Location**: [`electronics-box-enclosure.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/electronics-box-enclosure/electronics-box-enclosure.component.ts#L435-L474)
- **Symptom & Evidence**:
  - In Light Mode (`desktop.png`, `mobile.png`, `small.png`), `.metric-value` (`color: #f3f4f6`) and `.slicer-list` (`color: #cbd5e1`) are rendered over a white `.c-card` (`#ffffff`) at ~1.09:1 and ~1.42:1 contrast ratios.
- **Root Cause**:
  - Hardcoded dark-mode hex colors instead of CSS custom properties.
- **Remediation Specification**:
  - Replace hardcoded `#f3f4f6`, `#cbd5e1`, `#9ca3af`, and `rgba(255, 255, 255, 0.04)` in `.metric-card`, `.metric-label`, `.metric-value`, `.slicer-box`, `.slicer-title`, and `.slicer-list` with `var(--color-bg-subtle)`, `var(--color-border)`, `var(--color-text-primary)`, and `var(--color-text-secondary)`.

### DEFECT-34-04: Missing Touch Orbit & Scroll-Wheel Zoom on 3D Viewport
- **Severity**: `Medium`
- **Category**: `Mobile & Responsive Layout`
- **Location**: [`electronics-box-enclosure.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/electronics-box-enclosure/electronics-box-enclosure.component.ts#L282-L293), [`electronics-box-enclosure.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/electronics-box-enclosure/electronics-box-enclosure.component.ts#L800-L822)
- **Symptom & Evidence**:
  - `.enclosure-viewport` only binds `(mousedown)`, `(mousemove)`, `(mouseup)`, and `(mouseleave)`. Neither `(wheel)` nor `(touchstart)` / `(touchmove)` / `(touchend)` are bound.
- **Root Cause**:
  - Missing wheel and touch event handlers on `.enclosure-viewport`.
- **Remediation Specification**:
  - Bind `(wheel)="onWheel($event)"`, `(touchstart)="onTouchStart($event)"`, `(touchmove)="onTouchMove($event)"`, and `(touchend)="onTouchEnd()"` on `.enclosure-viewport` with `touch-action: none`.

### DEFECT-34-05: 8 Undersized Touch Targets (`.c-input--slider`), Deferred `URL.revokeObjectURL()` & Worker Support
- **Severity**: `Low`
- **Category**: `BEM & Form Accessibility` / `Memory Hygiene` / `Web Worker & Performance`
- **Location**: [`electronics-box-enclosure.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/electronics-box-enclosure/electronics-box-enclosure.component.ts#L94-L242), [`electronics-box-enclosure.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/electronics-box-enclosure/electronics-box-enclosure.component.ts#L760-L795)
- **Symptom & Evidence**:
  - 6 range sliders use `.c-input--slider` (`16px` tall) instead of `.c-input__slider` (`>= 38px`), and 2 checkboxes are `13×13px`.
  - `downloadFormat()` defers `URL.revokeObjectURL()` until `ngOnDestroy()`.
- **Remediation Specification**:
  - Replace `.c-input--slider` with `.c-input__slider`, style checkboxes at `18×18px` inside `min-height: 38px` labels, revoke download `ObjectURL`s immediately after `a.click()`, and add `worker.ts` for off-main-thread export packaging.

---

## 3. Target Acceptance Criteria

### Functional & Spec Conformance
1. In print-bed mode (`explodedView === false`), both `baseGeometry` and `lidGeometry` have minimum Z coordinate `>= 0` (the lid lies flat on its outer top face at `z = 0` with its interlocking lip pointing `+Z`).
2. Enabling `ventilationGrille` creates genuine through-slots in the lid plate (`z = 0` to `lidH`) rather than raised bars on top of an unperforated plate.
3. Adjusting the `Corner Radius / Bevel` (`cornerRadiusMm`) slider updates the enclosure geometry.

### Mobile & Responsive Layout & Theme Contrast
1. `hasHorizontalScroll === false` (`scrollWidth <= clientWidth`) at `1366×900`, `390×844`, and `320×640`.
2. Preset descriptions wrap cleanly on Desktop (`> 640px`), and `.metric-value` / `.slicer-list` achieve `>= 4.5:1` contrast in both Light and Dark themes.
3. `.enclosure-viewport` supports mouse drag + wheel zoom on desktop and touch drag on mobile.
4. `smallTouchTargetCount === 0`.

### `AGENTS.md` Prime Directives
1. **Directives 1 & 2**: `0` external network requests.
2. **Directive 3**: `worker.ts` offloads `.STL` / `.3MF` packaging.
3. **Directive 4**: Immediate `URL.revokeObjectURL()` after download and complete Three.js + worker disposal in `ngOnDestroy()`.
