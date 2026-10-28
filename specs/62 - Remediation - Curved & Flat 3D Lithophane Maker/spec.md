# Spec 62: Remediation — Curved & Flat 3D Lithophane Maker

- **Spec ID**: `62`
- **Remediates Tool**: `32 - Curved & Flat 3D Lithophane Maker`
- **Slug**: `lithophane-maker`
- **Category**: `3d`
- **Route**: `/tools/lithophane-maker`
- **Audit Reference**: [`tools_31_60_audit.md#tool-32`](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-32)
- **Current Audit Verdict**:
  - **Functional**: `✅ Works`
  - **Mobile / UI-UX**: `⚠️ Minor issues`
  - **Overall**: `⚠️`
- **Status**: `Ready for Implementation`
- **Priority**: `High`

---

## 1. Executive Summary & Audit Baseline

### What Currently Works
- **Initial State & Backlit 3D Preview**: Loads with a procedural gradient image (`100 × 80 × 3 mm`, `16,184 tris`, `17.9 g (PLA)`, `~35.1 hrs`) and renders the backlit lithophane mesh in WebGL with `0` console errors, `0` page errors, and `0` external network requests.
- **Image Upload & Sample Patterns**: Uploading custom PNG/JPEG images automatically adjusts the physical width/height aspect ratio (`160×120` PNG → `100 × 75 × 3 mm`, `15,332 tris`, `16.7 g`). Built-in sample patterns (`Sunburst Gradient`, `Portrait Vignette`, `Geometric Grid`), contrast boost, and `Invert Optical Relief` work accurately.
- **Presets & 4 Geometry Styles**: All 4 starting templates (`Curved Desk Portrait`, `Classic Flat Photo Frame`, `360° Cylinder Lampshade`, `LED Night Light Panel`), geometry buttons (`Flat Plate`, `Curved Arc`, `360° Cylinder` producing `35.8 × 110 × 35.8 mm` / `22,960 tris`, `Nightlight Tab`), `Backlight: ON/OFF` toggle, stabilizing foot checkbox, and `Reset Defaults` work properly.
- **Deliverable Exports**:
  - **Binary `.STL`**: `privknife-lithophane-curve_arc-110x85mm.stl` (`2,275,284` bytes, `45,504` triangles at `resolution: 120`, exact binary STL size match `84 + 45504 × 50`).
  - **`.3MF` Archive**: `privknife-lithophane-curve_arc-110x85mm.3mf` (`395,332` bytes, valid ZIP archive containing `[Content_Types].xml`, `_rels/.rels`, and `3D/3dmodel.model` with `22,756` vertices and `45,504` triangles).

### What Fails or Violates Standards
- **Severe Light Mode Contrast Defect (WCAG Failure)**: `.metric-value` uses hardcoded `color: #f3f4f6` on `background: rgba(255, 255, 255, 0.04)` (~1.09:1 contrast against the `#ffffff` card) and `.slicer-list` uses `color: #cbd5e1` on `rgba(59, 130, 246, 0.08)` (~1.42:1 contrast), rendering all 4 telemetry values and slicer recommendations nearly invisible in Light Mode.
- **Preset Button Text Overflow on Desktop (`> 640px`)**: `.c-button` enforces `white-space: nowrap` at viewports `> 640px` (`_c-button.scss` line 23). Because `.litho-preset-btn` does not set `white-space: normal`, the 2-line preset descriptions overflow horizontally out of the preset buttons and overlap adjacent buttons on desktop.
- **Missing Touch Orbit & Scroll-Wheel Zoom on 3D Viewport**: `.litho-viewport` only binds `(mousedown)`, `(mousemove)`, `(mouseup)`, and `(mouseleave)`—neither `OrbitControls` nor `(touchstart)`/`(touchmove)`/`(wheel)` handlers are attached, so mobile users cannot rotate or zoom the 3D preview and desktop users cannot scroll-zoom despite the UI hint `"🖱️ Click & Drag to Orbit • Scroll to Zoom"`.
- **Main-Thread Blocking (`45,504` Triangles + ZIP) & Dead Progress Bar (Directive 3)**: No Web Worker (`worker.ts`) is implemented. High-resolution export (`resolution: 120`, `45,504` triangles + `JSZip` compression) blocks the main UI thread, and the `isGenerating()` / `progressPercent()` signals and `<app-progress-bar>` overlay in the template are dead code that never update.
- **Deferred `URL.revokeObjectURL()` Cleanup (Directive 4)**: `URL.createObjectURL()` calls in `onFileDropped()` and `downloadFormat()` are pushed to `this.activeDownloadUrls` and only revoked in `ngOnDestroy()`, rather than immediately inside `img.onload` / `img.onerror` and right after download trigger.
- **Missing `.PNG` Preview Snapshot Deliverable & Undersized Touch Targets**: Spec 32 specifies `.stl`, `.3mf`, and `.png` preview snapshot exports, but no `.PNG` snapshot button is provided; 9 form controls (7 range sliders at `16px` height using non-existent `.c-input--slider` instead of `.c-input__slider`, and 2 native `13×13px` checkboxes) fall below the `32px` touch target minimum.

---

## 2. Detailed Defect Registry & Root Cause Analysis

### DEFECT-32-01: Unreadable Telemetry Metrics & Slicer Recommendations in Light Mode
- **Severity**: `Critical`
- **Category**: `Theme Contrast`
- **Location**: [`lithophane-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/lithophane-maker/lithophane-maker.component.ts#L538-L577)
- **Symptom & Evidence**:
  - In Light Mode across `desktop.png` (`1366×900`), `mobile.png` (`390×844`), and `small.png` (`320×640`), `.metric-value` (`color: #f3f4f6`) and `.slicer-list` (`color: #cbd5e1`) are rendered in light grey/white text over the white `.c-card` (`#ffffff`), resulting in ~1.09:1 and ~1.42:1 contrast ratios (WCAG minimum is `4.5:1`).
- **Root Cause**:
  - Component styles hardcoded dark-mode colors (`background: rgba(255, 255, 255, 0.04)`, `color: #f3f4f6`, `color: #cbd5e1`, `color: #9ca3af`) instead of PrivKnife's theme-aware CSS custom properties.
- **Remediation Specification**:
  - Replace hardcoded hex colors in `.metric-card`, `.metric-label`, `.metric-value`, `.slicer-box`, `.slicer-title`, and `.slicer-list` with CSS custom properties:
    - `.metric-card`: `background: var(--color-bg-subtle, rgba(148, 163, 184, 0.08)); border: 1px solid var(--color-border, rgba(148, 163, 184, 0.2));`
    - `.metric-label`: `color: var(--color-text-muted);`
    - `.metric-value`: `color: var(--color-text-primary, var(--color-text));`
    - `.slicer-title`: `color: var(--color-primary);`
    - `.slicer-list`: `color: var(--color-text-secondary, var(--color-text));`

### DEFECT-32-02: Preset Button Description Horizontal Overflow on Desktop (`> 640px`)
- **Severity**: `High`
- **Category**: `Mobile & Responsive Layout` / `BEM & Form Accessibility`
- **Location**: [`lithophane-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/lithophane-maker/lithophane-maker.component.ts#L443-L457), [`_c-button.scss`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/styles/04_components/_c-button.scss#L23)
- **Symptom & Evidence**:
  - On Desktop (`1366×900`, visible in `desktop.png`), the 2-column `.litho-presets` buttons (`Curved Desk Portrait`, `Classic Flat Photo Frame`, `360° Cylinder Lampshade`, `LED Night Light Panel`) have long `.preset-desc` subtitles that overflow horizontally outside the button borders and collide with adjacent buttons.
- **Root Cause**:
  - Global `.c-button` sets `white-space: nowrap` on viewports `> 640px`, and `.litho-preset-btn` does not override `white-space: normal; min-width: 0;`.
- **Remediation Specification**:
  - Add `white-space: normal; min-width: 0; height: auto;` to `.litho-preset-btn` and `overflow-wrap: anywhere;` to `.preset-desc` so descriptions wrap cleanly inside the 2-column preset cards on all screen widths.

### DEFECT-32-03: Missing Touch Orbit & Mouse-Wheel Zoom on 3D Viewport
- **Severity**: `High`
- **Category**: `Mobile & Responsive Layout`
- **Location**: [`lithophane-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/lithophane-maker/lithophane-maker.component.ts#L355-L373), [`lithophane-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/lithophane-maker/lithophane-maker.component.ts#L1047-L1070)
- **Symptom & Evidence**:
  - `.litho-viewport` only binds `(mousedown)`, `(mousemove)`, `(mouseup)`, and `(mouseleave)`. Neither `(wheel)` nor `(touchstart)` / `(touchmove)` / `(touchend)` are bound. Mobile users cannot orbit or zoom the 3D lithophane preview at all, and desktop users cannot scroll-zoom despite the overlay text reading `"🖱️ Click & Drag to Orbit • Scroll to Zoom"`.
- **Root Cause**:
  - Custom manual mouse rotation handlers were written without wheel zoom or touch event handlers.
- **Remediation Specification**:
  - Bind `(wheel)="onWheel($event)"`, `(touchstart)="onTouchStart($event)"`, `(touchmove)="onTouchMove($event)"`, and `(touchend)="onTouchEnd()"` on `.litho-viewport` (or attach Three.js `OrbitControls` with `enableDamping = true` and dispose it in `ngOnDestroy()`), supporting single-finger touch orbit, pinch/scroll zoom (`camera.position.z` clamped to `[60, 350]`), and `touch-action: none` on the viewport container.

### DEFECT-32-04: High-Resolution Export Blocks Main Thread, Dead Progress Bar & Deferred `URL.revokeObjectURL()` (Directives 3 & 4)
- **Severity**: `Medium`
- **Category**: `Web Worker & Performance` / `Memory Hygiene`
- **Location**: [`lithophane-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/lithophane-maker/lithophane-maker.component.ts#L821-L896), [`lithophane-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/lithophane-maker/lithophane-maker.component.ts#L1002-L1045)
- **Symptom & Evidence**:
  - `downloadFormat()` calls `await processLithophane(this.activeGrayscaleGrid, this.activeGridW, this.activeGridH, exportOptions)` (`45,504` triangles + `JSZip`) on the main UI thread without updating `this.isGenerating` or `this.progressPercent`, leaving `<app-progress-bar [value]="progressPercent()">` (`lines 364–368`) as dead code.
  - `onFileDropped()` creates an object URL via `URL.createObjectURL(file)` (`line 827`) and only revokes it in `ngOnDestroy()` instead of inside `img.onload` / `img.onerror`. Similarly, `downloadFormat()` pushes blob URLs into `this.activeDownloadUrls` instead of revoking them after triggering the download.
- **Root Cause**:
  - No `worker.ts` was created for `lithophane-maker`, `isGenerating` / `progressPercent` were never wired into `downloadFormat()`, and `URL.revokeObjectURL()` was deferred to component teardown.
- **Remediation Specification**:
  - Create `worker.ts` to run `processLithophane()` off the main thread and post deterministic progress updates (`15%` heightmap, `55%` mesh synthesis, `85%` binary STL / 3MF packaging, `100%` complete) that update `isGenerating` and `progressPercent`.
  - Revoke the uploaded image object URL immediately inside both `img.onload` and `img.onerror` in `onFileDropped()`, and revoke export Blob URLs right after `a.click()` in `downloadFormat()` (and `downloadPngSnapshot()`).

### DEFECT-32-05: Missing `.PNG` Backlit Render Snapshot & 9 Undersized Touch Targets (`.c-input--slider`)
- **Severity**: `Medium`
- **Category**: `Spec Conformance` / `BEM & Form Accessibility`
- **Location**: [`lithophane-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/lithophane-maker/lithophane-maker.component.ts#L122-L320), [`lithophane-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/lithophane-maker/lithophane-maker.component.ts#L392-L420)
- **Symptom & Evidence**:
  - Spec 32 specifies `.stl`, `.3mf`, and `.png` backlit render snapshot deliverables, but only `.STL` and `.3MF` export buttons exist.
  - 7 `<input type="range">` controls use the non-existent class `.c-input--slider` (`16px` tall) instead of `.c-input__slider`, and 2 checkboxes are `13×13px` (`9` small touch targets flagged by `layoutReport`).
- **Root Cause**:
  - Typo in BEM class name (`.c-input--slider` instead of `.c-input__slider`) and omitted PNG snapshot action button.
- **Remediation Specification**:
  - Add a `Snapshot .PNG` button (`downloadPngSnapshot()`) that renders the backlit WebGL scene and downloads `privknife-lithophane-<type>-<W>x<H>mm.png` using `canvas.toBlob()`, revoking the object URL immediately.
  - Replace `.c-input--slider` with `.c-input__slider` (`min-height: 38px`) and style checkbox labels with `min-height: 38px` and `18×18px` checkbox inputs.

---

## 3. Target Acceptance Criteria

### Functional & Spec Conformance
1. Uploading any valid image or selecting any of the 3 sample patterns or 4 presets updates the 3D lithophane heightmap and telemetry metrics accurately.
2. Binary `.STL`, `.3MF`, and backlit `.PNG` snapshot exports all succeed with valid file headers and non-zero byte sizes.
3. Progress overlay (`isGenerating()` and `progressPercent()`) updates deterministically during high-resolution `.STL` / `.3MF` export.

### Mobile & Responsive Layout & Theme Contrast
1. `hasHorizontalScroll === false` (`scrollWidth <= clientWidth`) at `1366×900`, `390×844`, and `320×640`.
2. Preset button descriptions (`.litho-preset-btn`) wrap cleanly inside their grid cells on Desktop (`1366×900`), Mobile (`390×844`), and Small (`320×640`) without horizontal overflow or collision.
3. `.metric-value` and `.slicer-list` achieve `>= 4.5:1` contrast ratio in both Light Mode and Dark Mode.
4. `.litho-viewport` supports mouse drag + scroll-wheel zoom (`onWheel`) on desktop AND touch drag (`onTouchStart` / `onTouchMove`) on mobile.
5. `smallTouchTargetCount === 0` (`>= 32px` height on all sliders and checkbox controls).

### `AGENTS.md` Prime Directives
1. **Directives 1 & 2**: `0` external network requests.
2. **Directive 3**: `worker.ts` executes high-resolution `processLithophane()` off the main thread with progress callbacks.
3. **Directive 4**: `URL.revokeObjectURL()` is called immediately in `img.onload`/`img.onerror` and right after download triggers; Three.js geometry, material, renderer, and active Web Worker are disposed in `ngOnDestroy()`.
