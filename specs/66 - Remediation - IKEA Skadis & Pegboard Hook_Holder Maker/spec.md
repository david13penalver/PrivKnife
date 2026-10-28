# Spec 66: Remediation — IKEA Skadis & Pegboard Hook & Holder Maker

- **Spec ID**: `66`
- **Remediates Tool**: `36 - IKEA Skadis & Pegboard Hook & Holder Maker`
- **Slug**: `skadis-pegboard-maker`
- **Category**: `3d`
- **Route**: `/tools/skadis-pegboard-maker`
- **Audit Reference**: [`tools_31_60_audit.md#tool-36`](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-36)
- **Current Audit Verdict**:
  - **Functional**: `⚠️ Partial`
  - **Mobile / UI-UX**: `❌ Poor`
  - **Overall**: `⚠️`
- **Status**: `Ready for Implementation`
- **Priority**: `Critical`

---

## 1. Executive Summary & Audit Baseline

### What Currently Works
- **Initial State & 3D WebGL Preview**: Loads default `Skådis Heavy-Duty Utility Hook` (`24 × 64 × 62.4 mm`, `2 Lugs`, `6.5 g (PLA/PETG)`, `~0.5 hrs`) and renders the blue hook, orange locking wedge, and translucent pegboard wall in WebGL with `0` console errors, `0` page errors, and `0` external network requests.
- **3 Pegboard Systems, Dual-Column Lugs & 5 Presets**:
  - Supports **IKEA Skådis** (`5×15mm` oval slots, `40mm` horizontal / `20mm` staggered pitch, `4.5mm × 4.8mm` T-hooks), **Standard 1" Pegboard** (`25.4mm` spacing, `6.35mm` / `1/4"` holes), and **Mini 1/2" Pegboard** (`12.7mm` spacing, `3.175mm` / `1/8"` holes).
  - Automatically generates `4 Lugs` (dual-column) when `Faceplate Width >= 60mm` on IKEA Skådis (`64 × 64 × 62.4 mm`, `4 Lugs`, `9.5 g`, `~0.7 hrs`).
  - All 5 presets (`Skådis Heavy-Duty Utility Hook`, `Skådis Dual Hammer & Pliers Prong`, `Standard Pegboard Shelf Bracket`, `Skådis Digital Caliper & Tool Holster`, `Skådis Pen & Screwdriver Cup`), optional **Anti-Slip Locking Wedge Clip**, side print-bed orientation (`rotateY(Math.PI / 2)`), and `Reset to Defaults` work cleanly.
- **Deliverable Exports**:
  - **Binary `.STL`**: `ikea_skadis-single_hook-50mm.stl` (`7,884` bytes, `156` triangles, exact binary STL size match `84 + 156 × 50`).
  - **Multi-Object `.3MF`**: `ikea_skadis-single_hook-50mm.3mf` (`2,995` bytes, valid ZIP archive containing `[Content_Types].xml`, `_rels/.rels`, and `3D/3dmodel.model` with 2 objects: `Pegboard single_hook` id=1 and `Locking Wedge` id=2, `312` vertices, `156` triangles).

### What Fails or Violates Standards
- **Solid Instead of Hollow Geometry for `tool_holster` and `cylinder_cup` (Critical Functional Bug)**:
  - In [`createHolderFrontGeometry()`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/engine.ts#L350-L385), the `tool_holster` branch defines `const innerR = toolDiameterMm / 2;` (`line 353`) and **never uses it**, constructing a solid cylinder (`new THREE.CylinderGeometry(outerR, outerR, holsterHeight, 32)`) instead of a hollow ring / slotted holster.
  - Similarly, the `cylinder_cup` branch defines `const cupInnerR = toolDiameterMm / 2;` (`line 372`) and **never uses it**, constructing a solid cylinder block (`new THREE.CylinderGeometry(cupOuterR, cupOuterR - 2, cupHeight, 32)`) instead of a hollow container cup. Printing either style produces an unusable solid plastic block.
  - Furthermore, the `Reinforced Gusset Rib` (`reinforceRib`) checkbox remains visible across all 5 styles, but `createHolderFrontGeometry()` only checks `if (reinforceRib)` in `single_hook` and `dual_prong` (`shelf_bracket` unconditionally adds its diagonal strut regardless of `reinforceRib`, while `tool_holster` and `cylinder_cup` ignore `reinforceRib`).
- **Horizontal Page Overflow on Mobile (`390×844` → `399px`, `320×640` → `399px`) & Cramped 2-Column Grids**:
  - `scrollWidth` is `399px` on both `390px` and `320px` viewports (`hasHorizontalScroll: true`), caused by `<h1 class="c-header__title">IKEA Skadis & Pegboard Hook & Holder Maker</h1>` overflowing the right edge of the header container.
  - `.control-row-2` and `.metrics-grid` (`grid-template-columns: 1fr 1fr`) lack `@media (max-width: 768px)` single-column rules, squeezing paired range sliders down to `95px` wide on `320px` screens.
- **Severe Light Mode Contrast Defect (WCAG Failure)**: `.metric-value` (`color: #f3f4f6` on `rgba(255, 255, 255, 0.04)`) and `.tips-list` (`color: #cbd5e1`) are hardcoded for dark mode, making all 4 telemetry values and slicer recommendations nearly invisible in Light Mode (~1.09:1 contrast).
- **Duplicate Geometry Computation & Memory Leaks (Directive 4 Violation)**:
  - `rebuildMesh()` calls `this.recalculateMetrics()` (which calls `generateSkadisGeometries(options)`, building `holderGeometry`, `lockingWedgeGeometry`, and `combinedGeometry`), and then immediately calls `generateSkadisGeometries(options)` a second time (`lines 891, 932`), while leaking `combinedGeometry` in both calls (and leaking `lockingWedgeGeometry` when `lockingWedge()` is `false` or on non-Skådis pegboards).
  - `ngOnDestroy()` (`lines 639–665`) disposes `holderMesh` and `wedgeMesh`, but never disposes `this.pegboardMesh` geometry or material (`boardGeom` and `boardMat` created in `initThree()` at lines 822–831).
- **Missing Touch Orbit on 3D Viewport & Undersized Touch Targets**: `.skadis-viewport` binds mouse and `(wheel)` events (`lines 317–321`), but lacks `(touchstart)`/`(touchmove)` handlers for mobile touch screens, and 6 controls (`4` sliders using `.c-input--slider` at `16px` height + `2` checkboxes at `13×13px`) fall below `32px`.

---

## 2. Detailed Defect Registry & Root Cause Analysis

### DEFECT-36-01: Solid Instead of Hollow Cylinders for `tool_holster` and `cylinder_cup` + Inconsistent `reinforceRib` Handling
- **Severity**: `Critical`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/engine.ts#L332-L385)
- **Symptom & Evidence**:
  - In `engine.ts` lines 350–369 (`holderStyle === 'tool_holster'`), `const innerR = toolDiameterMm / 2;` (`line 353`) is unused and `new THREE.CylinderGeometry(outerR, outerR, holsterHeight, 32)` creates a solid cylinder. Changing `Inner Opening Diameter` (`toolDiameterMm`) only scales `outerR = innerR + ringWall` while keeping the interior 100% solid.
  - In `engine.ts` lines 370–385 (`holderStyle === 'cylinder_cup'`), `const cupInnerR = toolDiameterMm / 2;` (`line 372`) is unused and `new THREE.CylinderGeometry(cupOuterR, cupOuterR - 2, cupHeight, 32)` creates a solid cylinder block with no interior cavity.
  - In `engine.ts` lines 332–349 (`holderStyle === 'shelf_bracket'`), the diagonal support strut (`braceGeom`) is added unconditionally even when `reinforceRib === false`, whereas `tool_holster` and `cylinder_cup` add no reinforcement gusset under the standoff neck when `reinforceRib === true`.
- **Root Cause**:
  - `THREE.CylinderGeometry` creates a solid capped cylinder rather than a hollow annular wall or cup.
- **Remediation Specification**:
  - Create a helper `createHollowCylinderGeometry(outerR: number, innerR: number, height: number, bottomThickness = 0, segments = 32): THREE.BufferGeometry` in `engine.ts` using `THREE.ExtrudeGeometry` on an annular 2D `THREE.Shape` (outer circle of radius `outerR` with a circular `THREE.Path` hole of radius `innerR`, extruded along `Y`), plus an optional solid bottom disc of height `bottomThickness` when `bottomThickness > 0`.
  - **`tool_holster`**: Use `createHollowCylinderGeometry(outerR, innerR, holsterHeight, 0, 32)` so the tool holster ring has an open `toolDiameterMm` bore through which calipers, screwdrivers, or pliers slide cleanly.
  - **`cylinder_cup`**: Use `createHollowCylinderGeometry(cupOuterR, cupInnerR, cupHeight, 3.0, 32)` so the parts/pen cup has a hollow interior cavity of diameter `toolDiameterMm` and a `3.0mm` closed floor at the bottom.
  - **`reinforceRib`**: Gate the diagonal brace in `shelf_bracket` and add a lower support rib under the standoff neck in `tool_holster` and `cylinder_cup` when `reinforceRib === true` so toggling `Reinforced Gusset Rib` affects all 5 holder styles consistently.

### DEFECT-36-02: Duplicate `generateSkadisGeometries()` Calls & Leaked `combinedGeometry` / `pegboardMesh` (Directive 4)
- **Severity**: `High`
- **Category**: `Memory Hygiene` / `Web Worker & Performance`
- **Location**: [`skadis-pegboard-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/skadis-pegboard-maker.component.ts#L639-L665), [`skadis-pegboard-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/skadis-pegboard-maker.component.ts#L875-L942), [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/engine.ts#L597-L606)
- **Symptom & Evidence**:
  - `rebuildMesh()` (`line 891`) calls `this.recalculateMetrics()` (which calls `calculateSkadisMetrics(options)` → `generateSkadisGeometries(options)`) and then calls `generateSkadisGeometries(options)` a second time (`line 932`).
  - `calculateSkadisMetrics()` (`engine.ts` lines 599–604) disposes `holderGeometry` and `lockingWedgeGeometry`, but **never disposes `combinedGeometry`**. Likewise, `rebuildMesh()` never disposes `combinedGeometry` (nor `lockingWedgeGeometry` when `showWedge` is `false`).
  - `ngOnDestroy()` (`lines 639–665`) disposes `holderMesh` and `wedgeMesh`, but never disposes `this.pegboardMesh` geometry or material (`boardGeom` and `boardMat` created in `initThree()` at lines 822–831).
- **Root Cause**:
  - Missing `combinedGeometry.dispose()` in `calculateSkadisMetrics()` and `rebuildMesh()`, redundant `generateSkadisGeometries()` invocation, and missing `pegboardMesh` disposal in `ngOnDestroy()`.
- **Remediation Specification**:
  - In `calculateSkadisMetrics()` (`engine.ts`), call `combinedGeometry.dispose()` (and allow passing pre-built `combinedGeometry` so `rebuildMesh()` only calls `generateSkadisGeometries(options)` once).
  - In `rebuildMesh()`, call `generateSkadisGeometries(options)` once, update `this.metrics.set(...)`, dispose `combinedGeometry`, and dispose `lockingWedgeGeometry` when `!showWedge`.
  - In `ngOnDestroy()`, dispose `this.pegboardMesh.geometry` and `this.pegboardMesh.material`, and terminate any active Web Worker (`worker.ts`).

### DEFECT-36-03: Horizontal Overflow on Mobile (`390px` & `320px` → `399px`) & Missing Mobile Breakpoints on `.control-row-2` / `.metrics-grid`
- **Severity**: `High`
- **Category**: `Mobile & Responsive Layout`
- **Location**: [`skadis-pegboard-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/skadis-pegboard-maker.component.ts#L43-L53), [`skadis-pegboard-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/skadis-pegboard-maker.component.ts#L441-L445), [`skadis-pegboard-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/skadis-pegboard-maker.component.ts#L502-L506)
- **Symptom & Evidence**:
  - `scrollWidth` is `399px` on both `390×844` and `320×640` viewports (`hasHorizontalScroll: true`), caused by `<h1 class="c-header__title">IKEA Skadis & Pegboard Hook & Holder Maker</h1>` overflowing the right edge of the header.
  - `.control-row-2` and `.metrics-grid` (`grid-template-columns: 1fr 1fr`) lack `@media (max-width: 768px)` single-column rules, squeezing the `Upward Tilt` and `Front Lip` range sliders down to `95px` wide on `320px` screens.
- **Root Cause**:
  - Missing `overflow-wrap: anywhere; white-space: normal; min-width: 0;` on `.c-header` / `.c-header__title` and missing `@media (max-width: 768px)` responsive grid collapse.
- **Remediation Specification**:
  - Add `min-width: 0; overflow-wrap: anywhere; white-space: normal;` to `.c-header`, `.c-header__title-group`, and `.c-header__title`.
  - Add `@media (max-width: 768px) { .control-row-2, .metrics-grid, .style-btn-grid { grid-template-columns: 1fr; } }`.

### DEFECT-36-04: Unreadable Telemetry Metrics & Slicer Recommendations in Light Mode
- **Severity**: `Critical`
- **Category**: `Theme Contrast`
- **Location**: [`skadis-pegboard-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/skadis-pegboard-maker.component.ts#L508-L549)
- **Symptom & Evidence**:
  - In Light Mode (`desktop.png`, `mobile.png`, `small.png`), `.metric-value` (`color: #f3f4f6`) and `.tips-list` (`color: #cbd5e1`) are rendered over a white `.c-card` (`#ffffff`) at ~1.09:1 and ~1.42:1 contrast ratios.
- **Root Cause**:
  - Hardcoded dark-mode hex colors instead of CSS custom properties.
- **Remediation Specification**:
  - Replace hardcoded `#f3f4f6`, `#cbd5e1`, `#9ca3af`, and `rgba(255, 255, 255, 0.04)` in `.metric-card`, `.metric-label`, `.metric-value`, `.slicer-tips-card`, `.tips-title`, and `.tips-list` with `var(--color-bg-subtle)`, `var(--color-border)`, `var(--color-text-primary)`, and `var(--color-text-secondary)`.

### DEFECT-36-05: Missing Touch Orbit on 3D Viewport & 6 Undersized Touch Targets (`.c-input--slider`)
- **Severity**: `Medium`
- **Category**: `Mobile & Responsive Layout` / `BEM & Form Accessibility`
- **Location**: [`skadis-pegboard-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/skadis-pegboard-maker/skadis-pegboard-maker.component.ts#L184-L322)
- **Symptom & Evidence**:
  - `.skadis-viewport` binds mouse and `(wheel)` events (`lines 317–321`), but lacks `(touchstart)`, `(touchmove)`, and `(touchend)` handlers.
  - 4 range sliders use `.c-input--slider` (`16px` tall) instead of `.c-input__slider` (`>= 38px`) and 2 checkboxes are `13×13px`.
- **Remediation Specification**:
  - Bind `(touchstart)="onTouchStart($event)"`, `(touchmove)="onTouchMove($event)"`, and `(touchend)="onTouchEnd()"` on `.skadis-viewport` with `touch-action: none`.
  - Replace `.c-input--slider` with `.c-input__slider` and style checkbox controls with `min-height: 38px`.

---

## 3. Target Acceptance Criteria

### Functional & Spec Conformance
1. `tool_holster` generates a hollow cylindrical ring with internal diameter `toolDiameterMm` (`innerR = toolDiameterMm / 2`).
2. `cylinder_cup` generates a hollow cup container with internal diameter `toolDiameterMm` and a closed floor at the base.
3. Toggling `reinforceRib` (`Reinforced Gusset Rib`) modifies the geometry across all 5 holder styles (`single_hook`, `dual_prong`, `shelf_bracket`, `tool_holster`, and `cylinder_cup`).
4. `rebuildMesh()` calls `generateSkadisGeometries()` only once per input change and disposes all temporary geometries (`combinedGeometry`, unused `lockingWedgeGeometry`, and `pegboardMesh` on destroy).

### Mobile & Responsive Layout & Theme Contrast
1. `hasHorizontalScroll === false` (`scrollWidth <= clientWidth`) at `1366×900`, `390×844`, and `320×640`.
2. `.control-row-2` and `.metrics-grid` collapse to a single column below `768px`.
3. `.metric-value` and `.tips-list` achieve `>= 4.5:1` contrast ratio in both Light Mode and Dark Mode.
4. `.skadis-viewport` supports touch drag rotation on mobile and mouse drag + wheel zoom on desktop.
5. `smallTouchTargetCount === 0`.

### `AGENTS.md` Prime Directives
1. **Directives 1 & 2**: `0` external network requests.
2. **Directive 3**: `worker.ts` offloads `.STL` / `.3MF` packaging.
3. **Directive 4**: Zero leaked `THREE.BufferGeometry` / `THREE.Material` instances across rebuilds and `ngOnDestroy()`, and immediate `URL.revokeObjectURL()` after download.
