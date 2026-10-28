# Remediation Specification: Custom Mechanical Keycap & Switch Tester Maker

- **Spec ID**: `69`
- **Remediates Tool**: `39 - Custom Mechanical Keycap & Switch Tester Maker`
- **Slug**: `keycap-switch-tester-maker`
- **Category**: `3d`
- **Route**: `/tools/keycap-switch-tester-maker`
- **Audit Reference**: [`tools_31_60_audit.md#tool-39`](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-39)
- **Current Audit Verdict**: Functional: `⚠️ Partial` | Mobile: `⚠️ Minor issues` | Overall: `⚠️`
- **Status**: `Ready for Implementation`
- **Priority**: `High`

---

## 1. Executive Summary & Audit Baseline

### What Currently Works
- **Presets & Mode Tabs**: All 6 presets (*Cherry 1U Artisan ESC*, *DSA Uniform Minimalist Blank*, *OEM 2.25U Shift / Enter*, *SA Retro High-Profile*, *2×2 Desk Switch Tester Tray*, and *3×3 Artisan Display Base*) and both mode tabs (*Mechanical Keycap Maker* and *Switch Tester Desk Tray*) switch cleanly with zero console or page errors.
- **Stabilizer Spacing & Export Formats**: Multi-unit keycaps (`2u`, `2.25u`, `6.25u`) generate stabilizer stems at standard Cherry MX offsets (`±11.9 mm` / `±50 mm`), and both `.3mf` (`keycap-cherry-1u-esc.3mf`, `4,736` bytes, 3 objects) and `.stl` (`keycap-cherry-1u-esc.stl`, `12,884` bytes, `256` triangles) download without `NaN` values.
- **Privacy Compliance**: 100% client-side execution with zero external network requests.

### What Fails or Degrades
1. **Light-Mode Contrast Failure (`High`)**: `.c-input__label` (`color: var(--color-text-main, #e2e8f0)`) and `.badge-dim` (`#cbd5e1`) resolve to light gray on a white card in light mode, making all form labels nearly invisible.
2. **Disconnected 4-Pillar MX Stem Without Outer Cylinder (`Medium`)**: `buildMxStemGeometry()` creates a `CylinderGeometry` (`2.75 mm` outer radius) and immediately calls `outerCyl.dispose()` without merging it, returning only 4 floating rectangular `BoxGeometry` pillars (`48` triangles total) with no cylindrical stem barrel connecting them.
3. **Ignored Keycap Dish Curvature, Top Tilt & Flush Inlay (`Medium`)**:
   - `generateKeycapMesh()` ignores `options.dishDepthMm` and `dim.tiltAngleDeg`, producing an identical 16-vertex flat-topped frustum (`28` triangles) regardless of ergonomic profile.
   - `inlaid_multicolor` extrudes the legend `+0.2 mm` above `z = h` instead of inlaying it flush with the top cap surface.
4. **Tilted Mid-Air Switch Tester Slab Instead of Flat-Bottomed Wedge (`Medium`)**: `generateSwitchTesterMesh()` extrudes a flat `6 mm` slab and calls `trayExtrude.rotateX(tiltRad)` directly (`minZ = -2.83 mm`, `maxZ = 8.79 mm`), leaving the tray tilted in mid-air below `Z = 0` without a flat base, hollow bottom switch cavity, or `1.5 mm` top snap-in lip.
5. **Mobile Horizontal Overflow at 390px (`433px`) and 320px (`434px`) (`Medium`)**: The long `<h1>` header (`Custom Mechanical Keycap & Switch Tester Maker`) and `.mode-tabs` overflow the viewport on both mobile sizes.
6. **Memory Leak, Missing Touch Controls & Missing Web Worker (`Low`)**: `setupCanvasInteractions()` leaks an anonymous `window.addEventListener('mouseup')` listener on destroy, lacks touch orbit handlers, and lacks a Web Worker (`worker.ts`).

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-39-01` — Form Labels and Header Badge Invisible in Light Mode
- **Severity**: `High`
- **Category**: `Theme Contrast`
- **Location**: [`keycap-switch-tester-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/keycap-switch-tester-maker/keycap-switch-tester-maker.component.ts#L505-L565)
- **Symptom & Evidence**: In light mode (`mobile.png`, `small.png`), `.c-input__label` resolves to `rgb(226, 232, 240)` (`#e2e8f0`) on a white `.c-card` (`rgb(255, 255, 255)`), and `.badge-dim` resolves to `#cbd5e1`, failing WCAG AA contrast (`< 1.3:1`).
- **Root Cause**: Component styles use undefined `--color-text-main` with fallback `#e2e8f0` and hardcoded `#cbd5e1`.
- **Remediation Specification**:
  - Extract component styles to `keycap-switch-tester-maker.component.scss`.
  - Replace `var(--color-text-main, #e2e8f0)` and `#cbd5e1` with `var(--color-text-primary, var(--color-text))` and `var(--color-text-secondary, var(--color-text-muted))`.
  - Replace dark-only `.metric-item` and `.slicer-notes-card` colors with theme-aware CSS variables.

### `DEFECT-39-02` — `buildMxStemGeometry()` Disposes Outer Cylinder and Outputs 4 Disconnected Corner Boxes
- **Severity**: `Medium`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/keycap-switch-tester-maker/engine.ts#L312-L350)
- **Symptom & Evidence**: `buildMxStemGeometry()` allocates `const outerCyl = new THREE.CylinderGeometry(...)` and immediately executes `outerCyl.dispose()`, returning only 4 small `BoxGeometry(quadW, quadH, stemHeight)` quadrants floating inside the cavity without a cylindrical outer barrel (`Ø 5.5 mm`).
- **Root Cause**: The author wrote a comment intending to approximate a cylinder minus a cross slot using 4 corner boxes and discarded `outerCyl` instead of extruding a circular `THREE.Shape` with a cruciform `THREE.Path` hole.
- **Remediation Specification**:
  - Construct a `THREE.Shape` outer circle (`shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false)`) with a 12-vertex cruciform `THREE.Path` hole of arm span `crossSpan = 4.10 + toleranceMm` and arm thickness `crossThick = 1.17 + toleranceMm` (ordered clockwise so it subtracts cleanly), then extrude to `stemHeight` with `THREE.ExtrudeGeometry(shape, { depth: stemHeight, bevelEnabled: false, curveSegments: 32 })`.

### `DEFECT-39-03` — `generateKeycapMesh()` Ignores `dishDepthMm`, `tiltAngleDeg`, and Flush Inlaid Legends
- **Severity**: `Medium`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/keycap-switch-tester-maker/engine.ts#L352-L458)
- **Symptom & Evidence**:
  - `options.dishDepthMm` and `dim.tiltAngleDeg` are never referenced in `generateKeycapMesh()`; the top cap surface is a flat horizontal quad at `z = h`.
  - When `legendStyle === 'inlaid_multicolor'`, the legend is placed from `z = h - 0.6` to `z = h + 0.2` (protruding `+0.2 mm` above the top surface instead of flush at `z = h`) and is not tilted to match the keycap top face.
- **Root Cause**: The 8 outer vertices (`0..7`) of the keycap shell are hardcoded with `z = h` on a single 4-vertex top ring with no grid subdivision for concave dish depression or top-face tilt angle.
- **Remediation Specification**:
  - Subdivide the top surface into a grid (e.g., `nx = 8, ny = 8`), applying profile tilt `zTilt(y) = (y / (topD / 2)) * Math.tan(tiltRad) * (topD / 2)` and cylindrical/spherical dish depression `zDish(x, y) = -options.dishDepthMm * Math.max(0, 1 - (x / (topW * 0.42)) ** 2 - (y / (topD * 0.42)) ** 2)`.
  - For `inlaid_multicolor`, extrude the legend to `depth: 0.6` positioned flush with the top surface (`zTop - 0.6` to `zTop`) and rotate it by `tiltRad`.

### `DEFECT-39-04` — `generateSwitchTesterMesh()` Rotates a Flat Slab in Mid-Air Instead of Building a Flat-Bottomed Hollow Frame
- **Severity**: `Medium`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/keycap-switch-tester-maker/engine.ts#L558-L621)
- **Symptom & Evidence**: `generateSwitchTesterMesh()` extrudes a `6 mm` solid slab with `14 × 14 mm` holes and calls `trayExtrude.rotateX(tiltRad)`, putting the front bottom edge at `z = -2.83 mm` and the back bottom edge at `z = +2.83 mm` (unprintable without full-bed supports, and lacking both the `1.5 mm` switch snap-in plate lip and lower clearance cavity for the `5.0 mm` switch bottom housing).
- **Root Cause**: Direct Euler rotation of a uniform-thickness extrusion instead of constructing a flat-bottomed (`z = 0`) wedge enclosure with a `1.5 mm` top switch plate and hollow switch bays (`15.6 × 15.6 mm` below the `14.0 × 14.0 mm` top snap-in lip).
- **Remediation Specification**:
  - Construct the switch tester base as a two-tier structure resting flat on `z = 0`:
    1. Upper switch plate (`1.5 mm` thick) with `14.0 × 14.0 mm` (+ tolerance) MX snap-in cutouts.
    2. Lower support frame (`baseHeight - 1.5 mm` thick) with wider `15.6 × 15.6 mm` cutouts so the `1.5 mm` top plate forms a true overhang lip for switch clips, with bottom vertices sheared/clamped flat to `z = 0` when `trayTiltDeg > 0`.

### `DEFECT-39-05` — Horizontal Overflow on Mobile (`390px` → `433px`, `320px` → `434px`)
- **Severity**: `Medium`
- **Category**: `Mobile & Responsive Layout`
- **Location**: [`keycap-switch-tester-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/keycap-switch-tester-maker/keycap-switch-tester-maker.component.ts#L43-L63), [`keycap-switch-tester-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/keycap-switch-tester-maker/keycap-switch-tester-maker.component.ts#L450-L600)
- **Symptom & Evidence**: `scrollWidth` is `433px` at `390×844` and `434px` at `320×640` because `.c-header__title` and `.mode-tabs` exceed the viewport width.
- **Root Cause**: Missing `min-width: 0; overflow-wrap: break-word;` on `.c-header__title-group`, `.c-header__title`, and `.l-columns__area`, and `.mode-tabs` not wrapping on small screens.
- **Remediation Specification**:
  - Add `min-width: 0; overflow-wrap: break-word;` to `.c-header__title-group`, `.c-header__title`, and `.l-columns__area`.
  - Allow `.mode-tabs` to wrap (`flex-wrap: wrap`) and stack vertically at `@media (max-width: 480px)`.
  - Ensure all controls meet `min-height: 38px`.

### `DEFECT-39-06` — Leaked `window.addEventListener('mouseup')`, Missing Touch Orbit Controls, and Missing Web Worker
- **Severity**: `Low`
- **Category**: `Memory Hygiene` / `Web Worker & Performance`
- **Location**: [`keycap-switch-tester-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/keycap-switch-tester-maker/keycap-switch-tester-maker.component.ts#L838-L868)
- **Symptom & Evidence**: Anonymous `window.addEventListener('mouseup')` is never removed in `ngOnDestroy()`; no touch handlers exist on the 3D canvas; no `worker.ts` exists.
- **Root Cause**: Unstored listener reference and missing touch/worker implementation.
- **Remediation Specification**:
  - Store `onWindowMouseUp` reference and remove it in `ngOnDestroy()`.
  - Add `touchstart`/`touchmove`/`touchend` canvas handlers and `worker.ts` for off-main-thread export.

---

## 3. Target Acceptance Criteria

### Functional & Spec Conformance
- [ ] `buildMxStemGeometry()` produces a single connected manifold cylindrical post (`Ø 5.5 mm`) with an internal cruciform slot (`4.10 mm` span, `1.17 mm` arm thickness + tolerance).
- [ ] `generateKeycapMesh()` applies `options.dishDepthMm` and `dim.tiltAngleDeg` to the top cap surface and places `inlaid_multicolor` legends flush with the top surface.
- [ ] `generateSwitchTesterMesh()` rests flat on `z = 0` (`minZ === 0`) even when `trayTiltDeg > 0` and includes a `1.5 mm` top switch snap-in lip over a wider lower switch housing cavity.
- [ ] All `.stl` and `.3mf` exports succeed with `0` `NaN` values.

### Mobile & Responsive Layout
- [ ] `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at `1366×900`, `390×844`, and `320×640`.
- [ ] Form labels, badges, and metrics achieve `>= 4.5:1` contrast in both light and dark modes.
- [ ] All interactive controls have touch target height `>= 38px`.

### `AGENTS.md` Prime Directives
- [ ] **Directive 1 & 2**: Zero external network requests.
- [ ] **Directive 3**: Export generation offloaded to `worker.ts`.
- [ ] **Directive 4**: `window` mouseup listener removed in `ngOnDestroy()`, worker terminated, Three.js resources disposed, and blob URLs revoked after download.
