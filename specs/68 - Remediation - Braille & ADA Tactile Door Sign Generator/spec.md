# Remediation Specification: Braille & ADA Tactile Door Sign Generator

- **Spec ID**: `68`
- **Remediates Tool**: `38 - Braille & ADA Tactile Door Sign Generator`
- **Slug**: `braille-ada-sign-generator`
- **Category**: `3d`
- **Route**: `/tools/braille-ada-sign-generator`
- **Audit Reference**: [`tools_31_60_audit.md#tool-38`](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-38)
- **Current Audit Verdict**: Functional: `❌ Broken` | Mobile: `⚠️ Minor issues` | Overall: `❌`
- **Status**: `Ready for Implementation`
- **Priority**: `Critical`

---

## 1. Executive Summary & Audit Baseline

### What Currently Works
- **Grade 2 Braille Transliteration & 2D Callout**: The client-side Grade 2 Braille transliterator (`translateToGrade2Braille`) accurately maps common ADA contractions and numbers (`RESTROOM` → `⠗⠑⠌⠗⠕⠕⠍`, 7 cells / 21 domes; `OFFICE 204` → `⠷⠋⠊⠉⠑ ⠼⠃⠚⠙`, 10 cells / 26 domes; `CONFERENCE A` → `⠉⠕⠝⠋⠻⠑⠝⠉⠑ ⠁`, 11 cells / 28 domes).
- **Braille Dome & Plaque Base Meshes**: `createBaseGeometry()` and `createBrailleDomesGeometry()` generate valid `BufferGeometry` objects with ADA-compliant dome dimensions (`Ø 1.5 mm`, `2.5 mm` dot pitch, `6.1 mm` cell pitch).
- **Privacy Compliance**: 100% client-side execution with zero external network requests.

### What Fails or Degrades
1. **Critical `NaN` Vertex Corruption Breaking 3D Viewport & All Exports (`Critical`)**:
   - In `createTextGeometry()`, stroke length is calculated as `Math.sqrt(dx * dy + dx * dx)` instead of `Math.sqrt(dx * dx + dy * dy)`. Whenever `dx * dy + dx * dx < 0` (e.g., diagonal strokes in `R`, `M`, `N`, `W`, `X`, `A`, `2`, `4`), `len` becomes `NaN`, injecting thousands of `NaN` vertex coordinates into `textAndIconGeometry`.
   - Every page load and preset switch logs `THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values` and `computeBoundingSphere(): Computed radius is NaN`.
   - `fitCameraToSign()` computes `maxDim = NaN` and sets `camera.position.set(0, NaN, NaN)`, leaving the 3D viewport completely blank/black across all 6 presets.
   - Exported `.3mf` files contain **`4,104` `NaN` attributes** (`conference-a-ada-sign.3mf`) and exported `.stl` files contain **`5,616` `NaN` float32 values** (`conference-a-ada-sign.stl`), rendering every downloaded file unusable in 3D slicers.
2. **Unreactive Secondary Form Controls (`High`)**:
   - Changing `subText`, `plaqueWidthMm`, `plaqueHeightMm`, `plaqueThicknessMm`, `tactileRaiseMm`, `cornerRadiusMm`, `includeFrameBorder`, or `mountHoles` only updates the signal (`.set(...)`) without calling `updatePreviewMesh()`. Adjusting plaque dimensions or toggles leaves the 3D mesh and weight/triangle metrics frozen.
3. **Light-Mode Contrast Failure (`High`)**:
   - `.c-input__label` and `.toggle-row` override text color with `var(--color-text-main, #e2e8f0)` (where `--color-text-main` is undefined in global styles), making all form and checkbox labels nearly invisible (`#e2e8f0` on `#ffffff`) in light mode.
4. **Small Mobile (320px) Horizontal Overflow (`Medium`)**:
   - At `320×640`, `scrollWidth` reaches `360px` (`+40px` overflow) due to the `<h1>` header title (`Braille & ADA Tactile Door Sign Generator`) and 2-column grids.
5. **Memory Leaks, Missing Touch Controls & Missing Web Worker (`Low`)**:
   - `setupCanvasInteractions()` attaches an anonymous `window.addEventListener('mouseup', ...)` listener that is never removed in `ngOnDestroy()`.
   - No `worker.ts` is used to offload mesh/3MF generation, and the 3D canvas has no touch event handlers.

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-38-01` — Euclidean Distance Typo (`Math.sqrt(dx * dy + dx * dx)`) Injects `NaN` Coordinates Into Tactile Text Mesh, Camera, STL, and 3MF
- **Severity**: `Critical`
- **Category**: `Engine Logic`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/braille-ada-sign-generator/engine.ts#L352-L361), [`braille-ada-sign-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/braille-ada-sign-generator/braille-ada-sign-generator.component.ts#L918-L926)
- **Symptom & Evidence**:
  - Console errors on load: `THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values.`
  - `this.camera.position` evaluates to `{ x: 0, y: NaN, z: NaN }`, causing a blank black canvas.
  - `conference-a-ada-sign.3mf` has `4,104` `NaN` vertex strings; `conference-a-ada-sign.stl` has `5,616` `NaN` float32 values.
- **Root Cause**: Line 355 of `engine.ts` computes stroke vector length as:
  ```ts
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dy + dx * dx);
  ```
  When `dx` and `dy` have opposite signs and `|dy| > |dx|` (such as the right leg of `R` from `(0.6, 0.5)` to `(1.0, 0)` where `dx = 0.4, dy = -0.5`, giving `dx * dy + dx * dx = -0.20 + 0.16 = -0.04`), `Math.sqrt(-0.04)` evaluates to `NaN`. Then `len < 0.001` is `false`, `nx = -dy / len` and `ny = dx / len` become `NaN`, and `ExtrudeGeometry` produces `NaN` vertices.
- **Remediation Specification**:
  - Replace `const len = Math.sqrt(dx * dy + dx * dx);` at line 355 of `engine.ts` with `const len = Math.hypot(dx, dy);` and guard `if (!Number.isFinite(len) || len < 0.001) continue;`.
  - In `fitCameraToSign()`, guard `if (!Number.isFinite(maxDim) || maxDim <= 0) return;` before setting camera coordinates.

### `DEFECT-38-02` — Secondary Form Controls Do Not Trigger `updatePreviewMesh()`
- **Severity**: `High`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`braille-ada-sign-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/braille-ada-sign-generator/braille-ada-sign-generator.component.ts#L109-L315)
- **Symptom & Evidence**: Modifying `subText`, `plaqueWidthMm`, `plaqueHeightMm`, `plaqueThicknessMm`, `tactileRaiseMm`, `cornerRadiusMm`, `includeFrameBorder`, or `mountHoles` in the UI updates the signal value in the label/badge (e.g., `250 × 152 × 3.8 mm`), but `currentMetrics().estimatedGrams` remains frozen (`~74.6 g`) and the 3D scene does not update.
- **Root Cause**: The `(ngModelChange)` and `(change)` bindings in the template only call `<signal>.set($event)` without calling `updatePreviewMesh()`, whereas only `onMainTextChange()`, `setPictogram()`, `setBraillePosition()`, `applyPreset()`, and `resetToDefaults()` invoke `updatePreviewMesh()`.
- **Remediation Specification**:
  - Invoke `updatePreviewMesh()` in every template `(ngModelChange)` / `(change)` handler (or create dedicated handler methods / an Angular `effect()` synchronized with the option signals) so every control change immediately regenerates the 3D mesh and metrics.

### `DEFECT-38-03` — Form Labels and Toggle Rows Invisible in Light Mode
- **Severity**: `High`
- **Category**: `Theme Contrast`
- **Location**: [`braille-ada-sign-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/braille-ada-sign-generator/braille-ada-sign-generator.component.ts#L464-L570)
- **Symptom & Evidence**: In light mode (`mobile.png`, `small.png`), `.c-input__label` and `.toggle-row` resolve to `rgb(226, 232, 240)` (`#e2e8f0`) against a white card (`rgb(255, 255, 255)`), and `.badge-dim` resolves to `#cbd5e1`, making all labels unreadable.
- **Root Cause**: Inline styles reference undefined `--color-text-main` with fallback `#e2e8f0` and hardcode `#cbd5e1` on `.badge-dim`.
- **Remediation Specification**:
  - Extract component styles to `braille-ada-sign-generator.component.scss`.
  - Replace `var(--color-text-main, #e2e8f0)` and hardcoded light hex values with `var(--color-text-primary, var(--color-text))` and `var(--color-text-secondary, var(--color-text-muted))`.
  - Replace dark-only card sub-panels (`.braille-callout`, `.metric-item`, `.ada-notes-card`) with theme-aware surface and text tokens.

### `DEFECT-38-04` — Horizontal Overflow at 320px (`scrollWidth: 360px`)
- **Severity**: `Medium`
- **Category**: `Mobile & Responsive Layout`
- **Location**: [`braille-ada-sign-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/braille-ada-sign-generator/braille-ada-sign-generator.component.ts#L43-L53)
- **Symptom & Evidence**: At `320×640`, `document.documentElement.scrollWidth` is `360px` (`+40px` horizontal overflow) caused by the `<h1>` header title and `.btn-grid-2` / `.metrics-panel` widths.
- **Root Cause**: Missing `min-width: 0; overflow-wrap: break-word;` on `.c-header__title-group` / `.c-header__title` and `.btn-grid-2` staying 2-column at `320px`.
- **Remediation Specification**:
  - Add `min-width: 0; overflow-wrap: break-word;` to `.c-header__title-group`, `.c-header__title`, and `.l-columns__area`.
  - Collapse `.btn-grid-2` and `.metrics-panel` to `grid-template-columns: 1fr` at `@media (max-width: 480px)`.
  - Ensure all interactive controls (inputs, sliders, checkboxes, buttons) meet `min-height: 38px`.

### `DEFECT-38-05` — Leaked `window.addEventListener('mouseup')`, Missing Touch Orbit Controls, and Missing Web Worker
- **Severity**: `Low`
- **Category**: `Memory Hygiene` / `Web Worker & Performance`
- **Location**: [`braille-ada-sign-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/braille-ada-sign-generator/braille-ada-sign-generator.component.ts#L835-L865)
- **Symptom & Evidence**:
  - `setupCanvasInteractions()` registers an anonymous `window.addEventListener('mouseup', () => { this.isDragging = false; })` that is never removed in `ngOnDestroy()`.
  - No touch event listeners exist on the 3D canvas.
  - No `worker.ts` exists to offload `.stl`/`.3mf` export generation.
- **Root Cause**: Unstored window listener reference and omission of touch handlers / Web Worker.
- **Remediation Specification**:
  - Store `private readonly onWindowMouseUp = () => { this.isDragging = false; };` and remove it via `window.removeEventListener('mouseup', this.onWindowMouseUp)` in `ngOnDestroy()`.
  - Add `touchstart`/`touchmove`/`touchend` handlers on the 3D canvas.
  - Create `worker.ts` for off-main-thread export processing and terminate it in `ngOnDestroy()`.

---

## 3. Target Acceptance Criteria

### Functional & Spec Conformance
- [ ] `generateAdaSignMesh()` produces **zero `NaN` or `Infinity` values** in `baseGeometry`, `textAndIconGeometry`, and `brailleGeometry` for all 6 presets and for every supported character (`A–Z`, `0–9`, `-`, `&`, `/`).
- [ ] Zero `THREE.BufferGeometry.computeBoundingBox()` console errors occur during initialization, preset switching, or text editing.
- [ ] All exported `.stl` and `.3mf` files contain zero `NaN` vertex coordinates or normals.
- [ ] Changing any secondary control (`subText`, `plaqueWidthMm`, `plaqueHeightMm`, `plaqueThicknessMm`, `tactileRaiseMm`, `cornerRadiusMm`, `includeFrameBorder`, `mountHoles`) immediately updates the 3D preview mesh and `currentMetrics()`.

### Mobile & Responsive Layout
- [ ] `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at `1366×900`, `390×844`, and `320×640`.
- [ ] All form labels, checkbox rows, metric values, and ADA notes achieve WCAG AA contrast (`>= 4.5:1`) in both light and dark modes.
- [ ] All inputs, sliders, checkboxes, and buttons have touch target height `>= 38px`.

### `AGENTS.md` Prime Directives
- [ ] **Directive 1 & 2**: Zero external network requests.
- [ ] **Directive 3**: Export processing runs via `worker.ts` (with main-thread fallback in JSDOM).
- [ ] **Directive 4**: `window` mouseup listener removed in `ngOnDestroy()`, worker terminated, Three.js geometries/materials disposed, and blob URLs revoked after download.
