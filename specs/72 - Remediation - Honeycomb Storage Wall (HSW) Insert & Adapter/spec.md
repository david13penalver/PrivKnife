# Remediation Specification: Honeycomb Storage Wall (HSW) Insert & Adapter

- **Spec ID**: `72`
- **Remediates Tool**: `42 - Honeycomb Storage Wall (HSW) Insert & Adapter`
- **Slug**: `hsw-insert-adapter`
- **Category**: `3d`
- **Route**: `/tools/hsw-insert-adapter`
- **Audit Reference**: [`tools_31_60_audit.md#tool-42`](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-42)
- **Current Audit Verdict**: Functional: `⚠️ Partial` | Mobile: `⚠️ Minor issues` | Overall: `⚠️`
- **Status**: `Ready for Implementation`
- **Priority**: `High`

---

## 1. Executive Summary & Audit Baseline

### What Currently Works
- **Presets & Attachment Modes**: All 6 presets (*M4 Captive Nut Insert*, *Heavy-Duty 40mm Utility Hook*, *8x3mm Neodymium Magnet Holder*, *32mm Tool Ring / Can Holder*, *M3 Threaded Post Standoff*, and *Decorative Flush Blank Plug*) and all 6 attachment types switch and render in the Three.js viewport with zero console or page errors.
- **Deliverable Exports**:
  - **Binary `.STL`**: Downloads valid binary `.stl` files across all 6 insert types (`5,084`–`19,284` bytes, `0` `NaN` vertices, `0` degenerate normals).
  - **Multi-Part `.3MF`**: Downloads valid OPC/ZIP `.3mf` archives (`2,549`–`5,463` bytes) containing `HSW Hex Plug` (`id="1"`) and `HSW Attachment (<type>)` (`id="2"`).
- **Privacy Compliance**: 100% client-side execution with zero external network requests.

### What Fails or Degrades
1. **Severe Attachment Geometry Placement & Boolean Defects (`High`)**:
   - **`storage_ring` Neck Blocks Half the Ring Opening**: The ring center is placed at `y = standOff = ringOuterDia / 2 + 2.0`, so the inner ring hole starts at `y = standOff - ringInnerDia / 2 = 5.5 mm`. Yet `neckGeom` is constructed with height `standOff` centered at `y = standOff / 2` (spanning `y = 0` to `y = standOff`), protruding `16 mm` into the interior of the `32 mm` ring hole and blocking half of the tool loop opening.
   - **`tool_hook` Gusset Rotates Backward Into the Plug**: `gussetShape` (`y ∈ [0, -10]`, extruded along `+Z`) is rotated by `+Math.PI / 4` around X and translated to `(0, -armThick, frontZ)`, swinging the `-10 mm` Y leg backward into the hex plug (`z = frontZ - 7.07 mm`) instead of bracing the underside of the cantilever arm.
   - **`empty_plug` Adds a Solid Bar Across the Center Hole**: Instead of cutting a coin/pry slot into the plug face, `empty_plug` appends a solid `BoxGeometry(8.0, 1.8, 0.8)` to `attachGeometries` right across the `Ø 5 mm` center hole. Furthermore, `safeMergeGeometries()` returns `geometries[0].clone()` without calling `.toNonIndexed()` when `geometries.length === 1`, leaving the `BoxGeometry` indexed (`24` vertices vs `36` indices) and causing `metrics.totalTriangles` to under-report by 4 triangles (`272` reported vs `276` in the exported STL).
2. **Light-Mode Contrast Failure (`High`)**:
   - `.c-input__label` (`#e2e8f0`), `.checkbox-label` (`#e2e8f0`), `.metric-value` (`#f8fafc` on `rgba(255, 255, 255, 0.03)`), `.badge-dim` (`#cbd5e1`), and `.safety-list` (`#d1d5db`) are nearly invisible against white card surfaces in light mode (`desktop.png`, `mobile.png`, `small.png`).
3. **Missing Multi-Cell Ganging (`1x1`, `2x1`, `2x2`), Hardcoded `acrossFlatsMm` Metric, and Incomplete `resetToDefaults()` (`Medium`)**:
   - Spec §2 & §4 require multi-cell ganging (`1x1`, `2x1`, or `2x2` interconnected HSW plugs at canonical HSW pitch coordinates with a structural backplate), which is completely unimplemented.
   - `metrics.acrossFlatsMm` is hardcoded to `standardAcrossFlats` (`20.0`) instead of `effAcrossFlats` (`20.0 + tightnessToleranceMm`), so adjusting tolerance never updates the UI readout or viewport badge.
   - `resetToDefaults()` only applies `presets[0].options`, leaving `hookLengthMm`, `hookAngleDeg`, `magnetDiameterMm`, `magnetDepthMm`, and `ringDiameterMm` dirty (e.g., `hookLengthMm` stays at `40 mm` after switching from Preset 2 instead of resetting to `35 mm`).
   - The `hookAngle` slider in the template has `max="55"` while `types.ts` and `validateHswOptions()` allow `60`.
4. **Horizontal Overflow on Mobile (`390px` → `421px`, `320px` → `420px`) (`Medium`)**:
   - The `<h1>` header (`Honeycomb Storage Wall (HSW) Insert & Adapter`) overflows the right edge of the viewport on both `390px` and `320px` screens.
5. **Memory Leak, Missing Touch Controls & Missing Web Worker (`Low`)**:
   - `setupMouseEvents()` leaks an anonymous `window.addEventListener('mouseup')` listener on destroy, lacks touch orbit handlers, and lacks `worker.ts`.

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-42-01` — Broken Attachment Geometries (`storage_ring` Neck Intrusion, `tool_hook` Gusset Rotation, `empty_plug` Bar Across Hole, and Indexed `safeMergeGeometries`)
- **Severity**: `High`
- **Category**: `Engine Logic`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/engine.ts#L86-L107), [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/engine.ts#L207-L213), [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/engine.ts#L307-L357)
- **Symptom & Evidence**:
  1. `storage_ring`: `neckGeom = new THREE.BoxGeometry(8.0, standOff, ringHeight)` translated to `y = standOff / 2` spans `y ∈ [0, standOff]`, whereas the ring's inner aperture spans `y ∈ [standOff - ringInnerDia / 2, standOff + ringInnerDia / 2]`. Thus `neckGeom` fills the bottom half of the ring opening (`y = 5.5 mm` to `21.5 mm`).
  2. `tool_hook`: `gussetShape` is extruded along `+Z` and rotated around X by `+Math.PI / 4`, placing vertices at `z = frontZ - 7.07 mm` (penetrating backward into the hex plug).
  3. `empty_plug`: `slotGeom` is added as a positive attachment box across the `Ø 5 mm` hole instead of a flush cap or recessed slot, and `safeMergeGeometries()` returns `geometries[0].clone()` without `.toNonIndexed()`, causing `metrics.totalTriangles` (`272`) to disagree with `exportHswSTL()` (`276`).
- **Root Cause**: Incorrect Y/Z bounds and rotation axes in `generateHswMesh()` and an early return in `safeMergeGeometries()` when `geometries.length === 1` before calling `.toNonIndexed()`.
- **Remediation Specification**:
  1. **`safeMergeGeometries()`**: Remove the `if (geometries.length === 1) return geometries[0].clone();` early return so single-item indexed geometries (`BoxGeometry`, `CylinderGeometry`) are normalized to non-indexed `position` + `normal` attributes identically to multi-item merges.
  2. **`storage_ring`**: Set `neckHeight = standOff - ringInnerDia / 2` (`= ringWall + 2.0 = 5.5 mm`) and translate `neckGeom` to `y = neckHeight / 2` so the mounting bridge connects `y = 0` to the outer/inner lower wall of the ring without entering the `ringInnerDia` aperture (`y > standOff - ringInnerDia / 2`).
  3. **`tool_hook`**: Construct `gussetShape` as a right triangle in the Y–Z plane (`(0, 0)` → `(0, -gussetDrop)` → `(gussetLen, 0)`) extruded along X (`depth: armWidth`, centered at `x = -armWidth / 2`) and translated to `(0, -armThick, frontZ)` so all gusset vertices satisfy `z >= frontZ` and brace directly between the front plug face (`z = frontZ`) and the underside of the hook arm (`y = -armThick`).
  4. **`empty_plug`**: Make the blank plug a solid flush hex cap (`no through-hole obstructed by a bar`) with a clean front face or subtle recessed perimeter groove so it functions as an actual aesthetic blank wall plug.

### `DEFECT-42-02` — Light-Mode Contrast Failure Across Form Labels, Metrics, Badge, and Slicing Tips
- **Severity**: `High`
- **Category**: `Theme Contrast`
- **Location**: [`hsw-insert-adapter.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/hsw-insert-adapter.component.ts#L479-L581)
- **Symptom & Evidence**: Computed styles in light mode (`desktop.png`, `mobile.png`, `small.png`) show `cardBg: rgb(255, 255, 255)`, `labelColor: rgb(226, 232, 240)` (`#e2e8f0`), `metricValColor: rgb(248, 250, 252)` (`#f8fafc`), and `safetyListColor: rgb(209, 213, 219)` (`#d1d5db`), rendering text nearly invisible.
- **Root Cause**: Component inline styles use undefined `--color-text-main` with light fallbacks (`#e2e8f0`, `#f8fafc`) and hardcoded `#cbd5e1` / `#d1d5db`.
- **Remediation Specification**:
  - Extract inline styles to `hsw-insert-adapter.component.scss`.
  - Replace all `--color-text-main` and hardcoded light hex values with `var(--color-text-primary, var(--color-text))` and `var(--color-text-secondary, var(--color-text-muted))`.
  - Style `.metric-item`, `.badge-dim`, and `.safety-box` with theme-aware surface and border variables.

### `DEFECT-42-03` — Missing Multi-Cell Ganging (`1x1`/`2x1`/`2x2`), Hardcoded `acrossFlatsMm` Metric, Incomplete `resetToDefaults()`, and `hookAngle` Max Mismatch
- **Severity**: `Medium`
- **Category**: `Spec Conformance` / `Engine Logic`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/engine.ts#L137-L141), [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/engine.ts#L389), [`hsw-insert-adapter.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/hsw-insert-adapter.component.ts#L262), [`hsw-insert-adapter.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/hsw-insert-adapter.component.ts#L704-L711)
- **Symptom & Evidence**:
  1. Multi-cell ganging (`1x1`, `2x1`, `2x2`) required by Spec §2 & §4 is absent.
  2. `metrics.acrossFlatsMm` returns `standardAcrossFlats` (`20`) instead of `Math.round(effAcrossFlats * 100) / 100`, staying at `20 mm` even when `tightnessToleranceMm` is `+0.25 mm`.
  3. Clicking `Reset Defaults` after selecting *Heavy-Duty 40mm Utility Hook* leaves `hookLengthMm` at `40 mm` instead of `DEFAULT_HSW_OPTIONS.hookLengthMm` (`35 mm`).
  4. `#hookAngle` range input has `max="55"` instead of `60`.
- **Root Cause**:
  1. Omission of `cellGrid?: '1x1' | '2x1' | '2x2'` in `HswInsertAdapterOptions` and `generateHswMesh()`.
  2. `acrossFlatsMm: standardAcrossFlats` in `generateHswMesh()`.
  3. `resetToDefaults()` delegates to `applyPreset(this.presets[0])` which only sets a subset of options.
- **Remediation Specification**:
  1. Add optional `cellGrid?: '1x1' | '2x1' | '2x2'` (default `'1x1'`) to `HswInsertAdapterOptions`, cloning the hex plug at canonical HSW center-to-center pitch (`horizontalPitch = 23.6 mm` / `verticalPitch = 20.44 mm`) and joining ganged plugs with a front structural bridge plate when `'2x1'` or `'2x2'` is selected, with UI selector buttons (`1×1 Single`, `2×1 Dual`, `2×2 Quad`).
  2. Set `acrossFlatsMm: Math.round(effAcrossFlats * 100) / 100` in `generateHswMesh()`.
  3. In `resetToDefaults()`, explicitly reset every signal (`insertType`, `nutSize`, `magnetDiameterMm`, `magnetDepthMm`, `hookLengthMm`, `hookAngleDeg`, `ringDiameterMm`, `tightnessToleranceMm`, `retentionTabs`, `plugDepthMm`, `flangeRim`, `cellGrid`) from `DEFAULT_HSW_OPTIONS`.
  4. Change `#hookAngle` slider `max="55"` to `max="60"`.

### `DEFECT-42-04` — Horizontal Overflow at 390px (`scrollWidth: 421px`) and 320px (`scrollWidth: 420px`)
- **Severity**: `Medium`
- **Category**: `Mobile & Responsive Layout`
- **Location**: [`hsw-insert-adapter.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/hsw-insert-adapter.component.ts#L39-L49)
- **Symptom & Evidence**: `scrollWidth` is `421px` at `390×844` and `420px` at `320×640` caused by `.c-header__title` overflowing the viewport.
- **Root Cause**: Missing `min-width: 0; overflow-wrap: break-word;` on `.c-header__title-group`, `.c-header__title`, and `.l-columns__area`.
- **Remediation Specification**:
  - Add `min-width: 0; overflow-wrap: break-word;` to `.c-header__title-group`, `.c-header__title`, and `.l-columns__area`.
  - Collapse `.metrics-panel` to `1fr` below `420px` and ensure all controls meet `min-height: 38px`.

### `DEFECT-42-05` — Leaked `window.addEventListener('mouseup')`, Missing Touch Orbit Controls, and Missing Web Worker
- **Severity**: `Low`
- **Category**: `Memory Hygiene` / `Web Worker & Performance`
- **Location**: [`hsw-insert-adapter.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/hsw-insert-adapter/hsw-insert-adapter.component.ts#L857-L886)
- **Symptom & Evidence**: Anonymous `window.addEventListener('mouseup')` is never removed in `ngOnDestroy()`; no touch orbit handlers exist on the 3D canvas; no `worker.ts` exists.
- **Root Cause**: Unstored listener reference and missing touch/worker implementation.
- **Remediation Specification**:
  - Store `onWindowMouseUp` reference and remove it in `ngOnDestroy()`.
  - Add `touchstart`/`touchmove`/`touchend` canvas handlers and `worker.ts` for off-main-thread export.

---

## 3. Target Acceptance Criteria

### Functional & Spec Conformance
- [ ] For `insertType: 'storage_ring'`, no vertex of the mounting neck lies inside the inner ring hole (`Math.hypot(x, y - standOff) >= ringDiameterMm / 2 - 1e-3` for all vertices in `attachmentGeometry`).
- [ ] For `insertType: 'tool_hook'`, all vertices of `attachmentGeometry` lie at or in front of the plug front face (`z >= frontZ - 1e-3`).
- [ ] `safeMergeGeometries()` converts single-item indexed geometries to non-indexed so `metrics.totalTriangles` matches the exported binary STL triangle count (`triCount`) for all 6 insert types.
- [ ] `metrics.acrossFlatsMm` reflects `20.0 + tightnessToleranceMm` (e.g., `20.25` when `tightnessToleranceMm = 0.25`).
- [ ] Multi-cell ganging (`1x1`, `2x1`, `2x2`) generates 1, 2, or 4 interconnected HSW plugs at HSW pitch spacing.
- [ ] `resetToDefaults()` restores every option signal to `DEFAULT_HSW_OPTIONS`.

### Mobile & Responsive Layout
- [ ] `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at `1366×900`, `390×844`, and `320×640`.
- [ ] All form labels, checkbox labels, metric values, and workshop slicing tips achieve `>= 4.5:1` contrast in both light and dark modes.
- [ ] All interactive controls have touch target height `>= 38px`.

### `AGENTS.md` Prime Directives
- [ ] **Directive 1 & 2**: Zero external network requests.
- [ ] **Directive 3**: Export generation offloaded to `worker.ts`.
- [ ] **Directive 4**: `window` mouseup listener removed in `ngOnDestroy()`, worker terminated, Three.js resources disposed, and blob URLs revoked after download.
