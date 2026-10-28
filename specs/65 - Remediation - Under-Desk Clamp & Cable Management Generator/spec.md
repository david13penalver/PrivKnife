# Spec 65: Remediation — Under-Desk Clamp & Cable Management Generator

- **Spec ID**: `65`
- **Remediates Tool**: `35 - Under-Desk Clamp & Cable Management Generator`
- **Slug**: `under-desk-clamp-generator`
- **Category**: `3d`
- **Route**: `/tools/under-desk-clamp-generator`
- **Audit Reference**: [`tools_31_60_audit.md#tool-35`](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-35)
- **Current Audit Verdict**:
  - **Functional**: `⚠️ Partial`
  - **Mobile / UI-UX**: `❌ Poor`
  - **Overall**: `⚠️`
- **Status**: `Ready for Implementation`
- **Priority**: `Critical`

---

## 1. Executive Summary & Audit Baseline

### What Currently Works
- **Initial State & Multi-Part 3D Preview**: Loads the default `Headphone Cradle Clamp` preset (`42.3 × 125.8 × 134.2 mm`, `66.2 g (PETG/PLA)`, `~4.2 hrs`, `3,808` triangles) and renders a multi-color 3D assembly (blue clamp frame, amber threaded bolt, dark swivel pad, and translucent desk slab) with `0` console errors, `0` page errors, and `0` external network requests.
- **Presets & Controls**: All 4 presets (`Headphone Cradle Clamp`, `Cable Raceway Organizer` updating to `45 × 87 × 132.6 mm`, `89.4 g`, `3,232` triangles, `Under-Desk Power Strip Cradle`, `Desk Edge Mug & Can Holder`), dimension sliders (`Desk Thickness` auto-clamping `maxClampGapMm >= deskThicknessMm + 5`, `Clamp Opening Jaw Gap`, `Throat Depth`, `Clamp Width`, `Spine Wall Thickness`), screw thread controls (`Thread Diameter`, `Thread Pitch`), `Swivel Foot Pad` checkbox, `Exploded View` / `Assemble View` toggle, and `Reset to Defaults` run cleanly.
- **Deliverable Exports**:
  - **Binary `.STL`**: `under-desk-clamp-cable_raceway-30mm.stl` (`161,684` bytes, `3,232` triangles, exact binary STL size match `84 + 3232 × 50`).
  - **Multi-Object `.3MF`**: `under-desk-clamp-cable_raceway-30mm.3mf` (`34,027` bytes, valid ZIP archive containing `[Content_Types].xml`, `_rels/.rels`, and `3D/3dmodel.model` with 3 separate `<object>` meshes: `Clamp Frame`, `Clamping Screw Bolt`, and `Swivel Foot Pad`, `4,629` vertices, `3,232` triangles).

### What Fails or Violates Standards
- **Solid Unperforated Boss/Cup/Pad & Unused `racewaySlotDiameterMm` in `engine.ts` (Critical Mechanical Defect)**:
  - The bottom threaded boss (`engine.ts` lines 247–254) and the swivel foot pad socket (`lines 491–498`) are solid `THREE.CylinderGeometry` primitives with **no internal female hole or socket recess**, so a 3D-printed screw bolt cannot physically pass through the clamp jaw or snap into the foot pad.
  - The `cup_holder` accessory (`engine.ts` lines 335–349) defines `const ringInnerR = 40;` and **never uses it**, constructing a solid `90mm` diameter cylindrical puck (`new THREE.CylinderGeometry(ringOuterR, ringOuterR, ringHeight, 32)`) instead of a hollow cup holder ring.
  - `racewaySlotDiameterMm` (`Slot Dia` slider in UI, line 232) is destructured in `createClampFrameGeometry()` (`engine.ts` line 162) and **never used**—changing the `Slot Dia` slider has zero effect on the generated mesh.
  - `createClampFrameGeometry()` (`engine.ts` lines 199–220) constructs a `gussetGeom` `BufferGeometry` that is never pushed into `parts` and never disposed.
- **Horizontal Page Overflow on Mobile (`390×844` → `439px`, `320×640` → `439px`) & Cramped 2-Column Grids**:
  - `scrollWidth` is `439px` at both `390px` and `320px` viewports (`hasHorizontalScroll: true`), caused by `<h1 class="c-header__title">` overflowing horizontally out of the header container.
  - `.control-row-2` (`grid-template-columns: 1fr 1fr`) and `.metrics-grid` have no `@media (max-width: 768px)` single-column rule, squeezing paired range sliders down to `95px` wide at `320px` (`130px` at `390px`).
- **Severe Light Mode Contrast Defect (WCAG Failure)**: `.metric-value` (`color: #f3f4f6` on `rgba(255, 255, 255, 0.04)`) and `.tips-list` (`color: #cbd5e1`) are hardcoded for dark mode, rendering telemetry values and slicer instructions nearly invisible in Light Mode (~1.09:1 contrast).
- **Duplicate Geometry Computation & Memory Leaks (Directive 4 Violation)**:
  - `rebuildMesh()` calls `this.recalculateMetrics()` (which calls `generateClampGeometries(options)`, building all 4 geometries including `combinedGeometry`), and then immediately calls `generateClampGeometries(options, options.explodedView)` a second time (`lines 935, 978`), while leaking the unused `combinedGeometry` returned by both calls (and leaking `footPadGeometry` when `swivelFootPad()` is `false`).
  - `ngOnDestroy()` never disposes `deskPreviewMesh` geometry or material (`lines 692–718`).
- **Missing Touch Orbit on 3D Viewport & Undersized Touch Targets**: `.clamp-viewport` binds mouse and `(wheel)` events (`lines 339–343`), but lacks `(touchstart)`/`(touchmove)` handlers for mobile touch screens, and 8 controls (`7` sliders using `.c-input--slider` at `16px` height + `1` checkbox at `13×13px`) fall below `32px`.

---

## 2. Detailed Defect Registry & Root Cause Analysis

### DEFECT-35-01: Solid Unperforated Clamp Boss, Cup Holder Ring & Foot Pad Socket + Ignored `racewaySlotDiameterMm`
- **Severity**: `Critical`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/under-desk-clamp-generator/engine.ts#L162), [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/under-desk-clamp-generator/engine.ts#L199-L220), [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/under-desk-clamp-generator/engine.ts#L247-L254), [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/under-desk-clamp-generator/engine.ts#L335-L370), [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/under-desk-clamp-generator/engine.ts#L491-L498)
- **Symptom & Evidence**:
  - **Cup Holder Ring (`lines 335–349`)**: Defines `const ringInnerR = 40;` (`line 337`) and never uses it, calling `new THREE.CylinderGeometry(ringOuterR, ringOuterR, ringHeight, 32)` to create a solid `90mm` disc.
  - **Bottom Jaw Threaded Boss (`lines 247–254`)**: Calls `new THREE.CylinderGeometry(bossRadius, bossRadius, bossHeight, 24)` over the solid lower jaw (`jawGeom`), creating a solid block with no threaded bore for the bolt to pass through.
  - **Swivel Foot Pad Socket (`lines 491–498`)**: Calls `new THREE.CylinderGeometry(socketOuterR, socketOuterR, socketHeight, 24)` as a solid cylinder with no hollow cavity (`r_inner = threadDiameterMm * 0.36 + 0.3`) to receive the ball tip.
  - **Cable Raceway Slot Diameter (`line 162, 351–370`)**: `racewaySlotDiameterMm` is destructured on line 162 and never referenced—the `cable_raceway` front wall is a solid unslotted wall (`new THREE.BoxGeometry(racewayLen, racewayHeight, wallT)`).
  - **Dead `gussetGeom` Allocation (`lines 199–220`)**: Allocates a `THREE.BufferGeometry` (`gussetGeom`) with vertices and indices, then discards it without adding it to `parts` or calling `.dispose()`.
- **Root Cause**:
  - `THREE.CylinderGeometry` produces solid cylinders; hollow annular rings require `THREE.ExtrudeGeometry` with a circular `THREE.Shape` and circular `THREE.Path` hole (or `THREE.LatheGeometry`).
- **Remediation Specification**:
  - Create a reusable helper `createHollowTubeGeometry(outerR: number, innerR: number, height: number, segments = 32): THREE.BufferGeometry` in `engine.ts` using `THREE.ExtrudeGeometry` on an annular 2D `THREE.Shape` (with a `THREE.Path` hole of radius `innerR`, extruded along `Y` with `bevelEnabled: false`).
  - **Cup Holder (`cup_holder`)**: Use `createHollowTubeGeometry(ringOuterR, ringInnerR, ringHeight, 32)` for the upper ring so the `80mm` (`2 × ringInnerR`) cup opening is genuinely hollow above the lower coaster base.
  - **Bottom Jaw Bore & Threaded Boss**: Construct the lower jaw around the screw center (`screwCenterZ`) with a hollow cylindrical boss (`createHollowTubeGeometry(bossRadius, threadDiameterMm / 2 + 0.25, bossHeight, 24)`) and internal female thread ridges so the bolt bore is open through the lower jaw.
  - **Swivel Foot Pad Socket**: Use `createHollowTubeGeometry(socketOuterR, threadDiameterMm * 0.36 + 0.25, socketHeight, 24)` on top of the foot pad base disc so the ball head snaps into a hollow socket cup.
  - **Cable Raceway Slots (`racewaySlotDiameterMm`)**: Segment the front lip of `cable_raceway` into vertical fingers separated by gaps of width `racewaySlotDiameterMm` so adjusting the `Slot Dia` slider changes the cable pass-through slot widths and geometry.
  - **Corner Gussets**: Either push `gussetGeom` into `parts` (properly closed) or remove the dead `gussetGeom` allocation on lines 199–220.

### DEFECT-35-02: Duplicate `generateClampGeometries()` Calls & Leaked `combinedGeometry` / `deskPreviewMesh` (Directive 4)
- **Severity**: `High`
- **Category**: `Memory Hygiene` / `Web Worker & Performance`
- **Location**: [`under-desk-clamp-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/under-desk-clamp-generator/under-desk-clamp-generator.component.ts#L692-L718), [`under-desk-clamp-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/under-desk-clamp-generator/under-desk-clamp-generator.component.ts#L920-L995)
- **Symptom & Evidence**:
  - `rebuildMesh()` (`line 933`) calls `this.recalculateMetrics()` (which calls `generateClampGeometries(options)`, building `frameGeometry`, `screwGeometry`, `footPadGeometry`, and `combinedGeometry`) and then calls `generateClampGeometries(options, options.explodedView)` a second time (`line 978`).
  - Neither `recalculateMetrics()` nor `rebuildMesh()` disposes `combinedGeometry` (or `footPadGeometry` when `swivelFootPad()` is `false`).
  - `ngOnDestroy()` (`lines 692–718`) disposes `frameMesh`, `screwMesh`, and `footPadMesh`, but never disposes `this.deskPreviewMesh` geometry/material (`deskGeom` and `deskMat` created in `initThree()` at lines 881–889).
- **Root Cause**:
  - `calculateClampMetrics(options)` internally calls `generateClampGeometries(options)` and only disposes `frameGeometry`, `screwGeometry`, and `footPadGeometry`, forgetting `combinedGeometry`. Meanwhile `rebuildMesh()` also calls `generateClampGeometries()` without disposing `combinedGeometry`.
- **Remediation Specification**:
  - In `calculateClampMetrics()` (`engine.ts` line 623), accept optional pre-built geometries or dispose `combinedGeometry` alongside `frameGeometry`, `screwGeometry`, and `footPadGeometry`.
  - In `rebuildMesh()`, call `generateClampGeometries()` once, update `this.metrics.set(...)` directly, and dispose `combinedGeometry` (plus `footPadGeometry` when `!this.swivelFootPad()`).
  - In `ngOnDestroy()`, dispose `this.deskPreviewMesh.geometry` and `this.deskPreviewMesh.material`, and terminate any active Web Worker (`worker.ts`).

### DEFECT-35-03: Horizontal Overflow on Mobile (`390px` & `320px` → `439px`) & Missing Mobile Breakpoints on `.control-row-2` / `.metrics-grid`
- **Severity**: `High`
- **Category**: `Mobile & Responsive Layout`
- **Location**: [`under-desk-clamp-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/under-desk-clamp-generator/under-desk-clamp-generator.component.ts#L43-L53), [`under-desk-clamp-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/under-desk-clamp-generator/under-desk-clamp-generator.component.ts#L455-L459), [`under-desk-clamp-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/under-desk-clamp-generator/under-desk-clamp-generator.component.ts#L517-L522)
- **Symptom & Evidence**:
  - `scrollWidth` is `439px` on both `390×844` and `320×640` viewports (`hasHorizontalScroll: true`), caused by `<h1 class="c-header__title">Under-Desk Clamp & Cable Management Generator</h1>` overflowing the right edge of the header.
  - `.control-row-2` and `.metrics-grid` (`grid-template-columns: 1fr 1fr`) lack `@media (max-width: 768px)` single-column rules, crushing paired sliders down to `95px` wide on `320px` screens.
- **Root Cause**:
  - Missing `overflow-wrap: anywhere; white-space: normal; min-width: 0;` on `.c-header` / `.c-header__title` and missing `@media (max-width: 768px)` responsive grid collapse.
- **Remediation Specification**:
  - Add `min-width: 0; overflow-wrap: anywhere; white-space: normal;` to `.c-header`, `.c-header__title-group`, and `.c-header__title`.
  - Add `@media (max-width: 768px) { .control-row-2, .metrics-grid, .accessory-btn-grid { grid-template-columns: 1fr; } }`.

### DEFECT-35-04: Unreadable Telemetry Metrics & Slicer Recommendations in Light Mode
- **Severity**: `Critical`
- **Category**: `Theme Contrast`
- **Location**: [`under-desk-clamp-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/under-desk-clamp-generator/under-desk-clamp-generator.component.ts#L517-L558)
- **Symptom & Evidence**:
  - In Light Mode (`desktop.png`, `mobile.png`, `small.png`), `.metric-value` (`color: #f3f4f6`) and `.tips-list` (`color: #cbd5e1`) are rendered over a white `.c-card` (`#ffffff`) at ~1.09:1 and ~1.42:1 contrast ratios.
- **Root Cause**:
  - Hardcoded dark-mode hex colors instead of CSS custom properties.
- **Remediation Specification**:
  - Replace hardcoded `#f3f4f6`, `#cbd5e1`, `#9ca3af`, and `rgba(255, 255, 255, 0.04)` in `.metric-card`, `.metric-label`, `.metric-value`, `.slicer-tips-card`, `.tips-title`, and `.tips-list` with `var(--color-bg-subtle)`, `var(--color-border)`, `var(--color-text-primary)`, and `var(--color-text-secondary)`.

### DEFECT-35-05: Missing Touch Orbit on 3D Viewport & 8 Undersized Touch Targets (`.c-input--slider`)
- **Severity**: `Medium`
- **Category**: `Mobile & Responsive Layout` / `BEM & Form Accessibility`
- **Location**: [`under-desk-clamp-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/under-desk-clamp-generator/under-desk-clamp-generator.component.ts#L162-L344)
- **Symptom & Evidence**:
  - `.clamp-viewport` binds mouse and `(wheel)` events (`lines 339–343`), but lacks `(touchstart)`, `(touchmove)`, and `(touchend)` handlers.
  - 7 range sliders use `.c-input--slider` (`16px` tall) instead of `.c-input__slider` (`>= 38px`) and 1 checkbox is `13×13px`.
- **Remediation Specification**:
  - Bind `(touchstart)="onTouchStart($event)"`, `(touchmove)="onTouchMove($event)"`, and `(touchend)="onTouchEnd()"` on `.clamp-viewport` with `touch-action: none`.
  - Replace `.c-input--slider` with `.c-input__slider` and style checkbox controls with `min-height: 38px`.

---

## 3. Target Acceptance Criteria

### Functional & Spec Conformance
1. `cup_holder` generates a hollow cup ring (inner opening radius `40mm`) rather than a solid cylinder.
2. The lower clamp jaw thread boss and swivel foot pad socket have genuine hollow internal bores.
3. Changing `racewaySlotDiameterMm` (`Slot Dia`) alters the cable raceway front slot geometry and triangle/vertex positions.
4. `rebuildMesh()` invokes `generateClampGeometries()` only once per input change and disposes all temporary geometries (`combinedGeometry`, unused `footPadGeometry`, and `deskPreviewMesh` on destroy).

### Mobile & Responsive Layout & Theme Contrast
1. `hasHorizontalScroll === false` (`scrollWidth <= clientWidth`) at `1366×900`, `390×844`, and `320×640`.
2. `.control-row-2` and `.metrics-grid` collapse to a single column below `768px`.
3. `.metric-value` and `.tips-list` achieve `>= 4.5:1` contrast ratio in both Light Mode and Dark Mode.
4. `.clamp-viewport` supports touch drag rotation on mobile and mouse drag + wheel zoom on desktop.
5. `smallTouchTargetCount === 0`.

### `AGENTS.md` Prime Directives
1. **Directives 1 & 2**: `0` external network requests.
2. **Directive 3**: `worker.ts` offloads `.STL` / `.3MF` packaging.
3. **Directive 4**: Zero leaked `THREE.BufferGeometry` / `THREE.Material` instances across rebuilds and `ngOnDestroy()`, and immediate `URL.revokeObjectURL()` after download.
