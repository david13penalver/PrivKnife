# Spec 61: Remediation — 3D Parametric Lamp & Lampshade Designer

- **Spec ID**: `61`
- **Remediates Tool**: `31 - 3D Parametric Lamp & Lampshade Designer`
- **Slug**: `parametric-lamp-designer`
- **Category**: `3d`
- **Route**: `/tools/parametric-lamp-designer`
- **Audit Reference**: [`tools_31_60_audit.md#tool-31`](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-31)
- **Current Audit Verdict**:
  - **Functional**: `✅ Works`
  - **Mobile / UI-UX**: `⚠️ Minor issues`
  - **Overall**: `⚠️`
- **Status**: `Ready for Implementation`
- **Priority**: `Medium`

---

## 1. Executive Summary & Audit Baseline

### What Currently Works
- **Initial State & 3D WebGL Preview**: Loads the default `Nordic Flute` preset cleanly (`190.1 × 190.1 × 190 mm`, `70,392` triangles, `~248 grams`, `~8.9 hours`), rendering an interactive illuminated lampshade and printer bed grid in WebGL with `0` console errors, `0` page errors, and `0` external network requests.
- **Presets & Parametric Controls**: All 5 curated presets (`Nordic Flute`, `Origami Lantern`, `Empire Pleat`, `Swirl Ripple`, `Modern Spiral Vase`), profile curves, rib wave shapes, print mode toggle (`Watertight Hollow Shell` vs `Spiralize Vase Mode`, reducing `Origami Lantern` from `1,864` to `816` triangles), socket presets (`E27`, `E14`, `IKEA`, `Custom`, `None`), filament simulation materials, viewport controls (`Bulb ON/OFF`, `Mesh` wireframe, `Reset View`), and `Reset Defaults` operate interactively.
- **Deliverable Exports**:
  - **Binary `.STL`**: `PrivKnife_Shade_hourglass_200mm_E27.stl` (`93,284` bytes, `1,864` triangles, exact binary STL byte match `84 + 1864 × 50`).
  - **`.3MF` Archive**: `PrivKnife_Shade_hourglass_200mm_E27.3mf` (`35,123` bytes, valid ZIP containing `[Content_Types].xml`, `_rels/.rels`, and `3D/3dmodel.model` with `5,592` vertices and `1,864` triangles).
  - **High-Res `.PNG`**: `PrivKnife_LampShade_hourglass_200mm.png` (`66,710` bytes, valid `697 × 520` PNG image).

### What Fails or Violates Standards
- **Mobile Viewport Overlay Collision (`390×844` & `320×640`)**: The top-left canvas badge group (`Bed: 256×256 mm`, `Triangles: 70,392`) and top-right canvas control buttons (`💡 Bulb ON`, `Mesh`, `Reset View`) both use `position: absolute; top: 12px;` and collide/overlap directly on top of each other on narrow viewports.
- **Illegible Canvas Overlay Button Text in Light Mode**: `Mesh` and `Reset View` use `.c-button--outline` (`color: var(--color-text-primary)` which resolves to dark slate `#0f172a` in Light Mode) over the dark `#0f172a` WebGL canvas, rendering their button labels nearly invisible in Light Mode.
- **Duplicate Main-Thread Geometry Generation (`140k+` Triangles per Tick) & Missing Web Worker (Directive 3)**: `metrics` is a `computed()` signal that calls `generateLampShadeGeometry(this.config())` synchronously on the main thread whenever `config()` changes, and `rebuildShadeMesh()` immediately calls `generateLampShadeGeometry(this.config())` a second time—generating `70,392` triangles twice per slider tick on the main UI thread without a Web Worker (`worker.ts`).
- **Three.js Material & Helper Memory Leaks (Directive 4)**: `updateMaterial()` creates a new `THREE.MeshStandardMaterial` without calling `.dispose()` on the replaced material, and `ngOnDestroy()` does not dispose `bulbMesh` geometry/material or `GridHelper`.
- **Small Touch Targets & Misapplied `.c-input` Class**: 17 form controls are flagged below `32×32px` (`<select class="c-input">` rendered at `21px` height and `<input type="range" class="c-input">` at `16px` height) because `.c-input` (the field wrapper class) is applied directly to `<select>` and `<input>` elements instead of `.c-input__control` and `.c-input__slider`.
- **Spec Gaps (`voronoi_perforated` Pattern & Multi-Component `.3MF`)**: Spec 31 specifies a `voronoi_perforated` surface pattern option and multi-object `.3mf` export (separate socket collar/spider ring + shade body objects when a socket is enabled).

---

## 2. Detailed Defect Registry & Root Cause Analysis

### DEFECT-31-01: Mobile Canvas Overlay Collision & Unreadable `.c-button--outline` Overlay Buttons in Light Mode
- **Severity**: `High`
- **Category**: `Mobile & Responsive Layout` / `Theme Contrast`
- **Location**: [`parametric-lamp-designer.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/parametric-lamp-designer/parametric-lamp-designer.component.ts#L473-L509)
- **Symptom & Evidence**:
  - At `390×844` (`mobile.png`) and `320×640` (`small.png`), the left badge cluster (`Bed: 256×256 mm`, `Triangles: 70,392`) and right action buttons (`💡 Bulb ON`, `Mesh`, `Reset View`) overlap horizontally at `top: 12px` inside the 3D viewport card.
  - In Light Mode (`desktop.png`, `mobile.png`, `small.png`), the `Mesh` and `Reset View` buttons use `class="c-button c-button--small c-button--outline"`, whose text color `var(--color-text-primary)` is `#0f172a` against the `#0f172a` WebGL canvas (~1.0:1 contrast ratio).
- **Root Cause**:
  - Both overlay containers use inline `style="position: absolute; top: 12px; left: 12px;"` and `style="position: absolute; top: 12px; right: 12px;"` with no responsive flex bar or media-query wrapping.
  - `.c-button--outline` assumes a theme-colored card background (`var(--color-bg-surface)`) rather than an always-dark WebGL viewport background.
- **Remediation Specification**:
  - Replace the two colliding `position: absolute` inline-styled overlay divs with a structured `.c-lamp-designer__viewport-hud` flex container (`display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.5rem; padding: 0.75rem;`) positioned cleanly at the top of the viewport (or as a dedicated toolbar header above the canvas on `< 640px`).
  - Style viewport HUD buttons with explicit dark-surface contrast (`background: rgba(15, 23, 42, 0.82); color: #f8fafc; border: 1px solid rgba(148, 163, 184, 0.35); backdrop-filter: blur(6px);`) so they remain legible in both Light and Dark themes.
  - Reorder mobile layout (`@media (max-width: 900px)`) so the 3D preview card appears near the top (or remains sticky) rather than buried below 1,400px of configuration cards.

### DEFECT-31-02: Duplicate Synchronous `generateLampShadeGeometry()` Execution & Missing Web Worker (Directive 3)
- **Severity**: `High`
- **Category**: `Web Worker & Performance`
- **Location**: [`parametric-lamp-designer.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/parametric-lamp-designer/parametric-lamp-designer.component.ts#L619-L629), [`parametric-lamp-designer.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/parametric-lamp-designer/parametric-lamp-designer.component.ts#L831-L861)
- **Symptom & Evidence**:
  - Every slider `input` event triggers `this.config.set(...)`, which evaluates `readonly metrics = computed<LampMetrics>(() => { const geom = generateLampShadeGeometry(this.config()); ... })` (`70,392` triangles) and then calls `rebuildShadeMesh()`, which calls `generateLampShadeGeometry(this.config())` a second time (`140,784` triangles generated synchronously on the main thread per slider drag event).
  - No `worker.ts` exists to offload heavy mesh synthesis or binary `.STL` / `.3MF` serialization off the main thread.
- **Root Cause**:
  - `metrics` was implemented as a `computed()` signal that reconstructs the entire `THREE.BufferGeometry` from scratch and disposes it, duplicating the work already done in `rebuildShadeMesh()`.
- **Remediation Specification**:
  - Convert `metrics` to a writable `signal<LampMetrics>` updated directly inside `rebuildShadeMesh()` using the single generated `THREE.BufferGeometry` (`calculateLampMetrics(cfg, geom)`), eliminating the duplicate `70,392`-triangle computation.
  - Add `worker.ts` to offload high-resolution mesh vertex/index buffer generation and `.STL` / `.3MF` package creation off the main UI thread with progress callbacks (`onProgress`), falling back gracefully in environments without `Worker` (e.g., unit test runner).

### DEFECT-31-03: Unreleased Three.js Materials, `bulbMesh`, and `GridHelper` (Directive 4)
- **Severity**: `Medium`
- **Category**: `Memory Hygiene`
- **Location**: [`parametric-lamp-designer.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/parametric-lamp-designer/parametric-lamp-designer.component.ts#L647-L665), [`parametric-lamp-designer.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/parametric-lamp-designer/parametric-lamp-designer.component.ts#L879-L884)
- **Symptom & Evidence**:
  - `updateMaterial()` creates `const newMat = new THREE.MeshStandardMaterial(...)` and assigns `this.shadeMesh.material = newMat` without calling `.dispose()` on the previous `this.shadeMesh.material`.
  - `ngOnDestroy()` disposes `this.shadeMesh.geometry`, `this.shadeMesh.material`, `this.controls`, and `this.renderer`, but never disposes `this.bulbMesh.geometry`, `this.bulbMesh.material`, or `this.gridHelper` (`geometry`/`material`), nor terminates any active Web Worker.
- **Root Cause**:
  - Missing `.dispose()` calls during material replacement in `updateMaterial()` and incomplete scene traversal in `ngOnDestroy()`.
- **Remediation Specification**:
  - In `updateMaterial()`, dispose the old material (`if (this.shadeMesh.material) (this.shadeMesh.material as THREE.Material).dispose();`) before assigning `newMat`.
  - In `ngOnDestroy()`, dispose `this.bulbMesh` geometry & material, dispose `this.gridHelper` geometry & material (or traverse `this.scene` to dispose all `Mesh`/`LineSegments` geometries and materials), and terminate the Web Worker if active.

### DEFECT-31-04: 17 Undersized Touch Targets & Misapplied `.c-input` Class on `<select>` and `<input type="range">`
- **Severity**: `Medium`
- **Category**: `BEM & Form Accessibility`
- **Location**: [`parametric-lamp-designer.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/parametric-lamp-designer/parametric-lamp-designer.component.ts#L105-L450), [`_c-input.scss`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/styles/04_components/_c-input.scss#L23-L92)
- **Symptom & Evidence**:
  - Headless Chrome audit flagged `17` small touch targets across all viewports (`select.c-input` at `21px` height and `input[type="range"].c-input` at `16px` height).
- **Root Cause**:
  - In PrivKnife's design system (`_c-input.scss`), `.c-input` is the flex wrapper `<div>`, `.c-input__control` styles `<select>` / `<input>` (`min-height: 38px`), and `.c-input__slider` styles `<input type="range">`. Applying `.c-input` directly to `<select>` and `<input type="range">` leaves them unstyled with browser-default `16px–21px` heights.
  - Also, inline `style="..."` attributes and unprefixed `.lamp-workspace` classes are used instead of BEM classes.
- **Remediation Specification**:
  - Replace `<select class="c-input">` with `<select class="c-input__control">` and `<input type="range" class="c-input">` with `<input type="range" class="c-input__slider">`.
  - Ensure `.c-input__slider` and checkbox labels have a minimum touch target height of `>= 38px` (`min-height: 38px; cursor: pointer;`).
  - Move inline styles into [`parametric-lamp-designer.component.scss`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/parametric-lamp-designer/parametric-lamp-designer.component.scss) using strict BEM classes (`.c-lamp-designer`, `.c-lamp-designer__viewport`, `.c-lamp-designer__hud`, etc.).

### DEFECT-31-05: Spec Conformance — `voronoi_perforated` Rib Pattern & Multi-Object `.3MF` Export
- **Severity**: `Low`
- **Category**: `Spec Conformance`
- **Location**: [`types.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/parametric-lamp-designer/types.ts#L10-L25), [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/parametric-lamp-designer/engine.ts#L45-L90), [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/parametric-lamp-designer/engine.ts#L315-L395)
- **Symptom & Evidence**:
  - Spec 31 specifies cellular/voronoi relief modulation (`voronoi`) and multi-part `.3mf` export (exporting the shade body and socket fitter assembly as distinct `<object>` resources when a socket fitter is enabled). Currently `RibWaveType` has `sine | pleat | scallop | gear` and `exportTo3MF` writes a single merged `<object id="1">`.
- **Root Cause**:
  - `voronoi` cellular modulation and multi-object `.3mf` packaging were omitted in the initial implementation.
- **Remediation Specification**:
  - Add `'voronoi'` (`Voronoi Cellular Relief`) to `RibWaveType` in `types.ts` and implement deterministic 2D cellular distance modulation in `evaluateRibWave()` in `engine.ts`.
  - Enhance `exportTo3MF()` in `engine.ts` so that when `socketPreset !== 'none'` and `printMode === 'hollow_shell'`, the `.3mf` `3D/3dmodel.model` contains two named mesh objects (`id="1" name="Lampshade Body"` and `id="2" name="Socket Spider Fitter"`) referenced in `<build>`, or cleanly exports all parts with proper metadata.

---

## 3. Target Acceptance Criteria

### Functional & Spec Conformance
1. All 5 presets (`Nordic Flute`, `Origami Lantern`, `Empire Pleat`, `Swirl Ripple`, `Modern Spiral Vase`) and all rib wave types (including `voronoi`) generate watertight, valid `THREE.BufferGeometry` meshes.
2. Binary `.STL`, `.3MF`, and `.PNG` exports produce valid non-empty files matching exact geometry triangle/vertex counts.
3. Updating any slider calculates `generateLampShadeGeometry()` **only once** per change (verified by spy test).

### Mobile & Responsive Layout & Theme Contrast
1. `hasHorizontalScroll === false` (`scrollWidth <= clientWidth`) at `1366×900`, `390×844`, and `320×640`.
2. Top-left viewport badges and top-right viewport action buttons (`Bulb ON/OFF`, `Mesh`, `Reset View`) **never overlap** at `390px` or `320px`.
3. Viewport HUD buttons (`Bulb ON`, `Mesh`, `Reset View`) maintain `>= 4.5:1` contrast ratio in both Light Mode and Dark Mode.
4. All `<select>` controls use `.c-input__control` (`min-height: 38px`) and all `<input type="range">` controls use `.c-input__slider` with touch target height `>= 32px` (`0` smallTouchTargets flagged by `layoutReport`).

### `AGENTS.md` Prime Directives
1. **Directives 1 & 2 (Zero Server / Zero Telemetry)**: `0` external network requests during load, interaction, and export.
2. **Directive 3 (Protect Main UI Thread)**: `worker.ts` handles heavy geometry/export synthesis off the main thread with progress updates.
3. **Directive 4 (Strict Memory Hygiene)**: Replacing materials in `updateMaterial()` disposes the old `THREE.Material`; `ngOnDestroy()` disposes `shadeMesh`, `bulbMesh`, `gridHelper`, `controls`, `renderer`, and terminates any active Web Worker; `URL.revokeObjectURL()` is invoked immediately after download triggers.
