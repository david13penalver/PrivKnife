# Remediation Specification: Pet ID Tag & Collar Slide-On Generator

- **Spec ID**: `71`
- **Remediates Tool**: `41 - Pet ID Tag & Collar Slide-On Generator`
- **Slug**: `pet-id-tag-generator`
- **Category**: `3d`
- **Route**: `/tools/pet-id-tag-generator`
- **Audit Reference**: [`tools_31_60_audit.md#tool-41`](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-41)
- **Current Audit Verdict**: Functional: `⚠️ Partial` | Mobile: `⚠️ Minor issues` | Overall: `⚠️`
- **Status**: `Ready for Implementation`
- **Priority**: `High`

---

## 1. Executive Summary & Audit Baseline

### What Currently Works
- **Presets & Mode Tabs**: All 5 presets (*Classic Dog Bone Charm (`LUNA`)*, *Silent Collar Slide-On (`MAX`)*, *Sweet Kitten Heart Charm (`BELLA`)*, *Tactical K9 Shield Tag (`THOR`)*, and *Modern Hexagon Tag (`MILO`)*) and both mode tabs (*Hanging Charm Tag* and *Silent Collar Slide-On*) switch and render with zero console or page errors.
- **Deliverable Exports**:
  - **Dual-Color `.3MF`**: Downloads valid OPC/ZIP `.3mf` archives (e.g., `pet-tag-bone-luna.3mf`, `36,377` bytes, containing `Base Plate`, `Text Lettering (LUNA)`, and `Emergency Icon (paw)` with `0` `NaN` vertices).
  - **Unified `.STL`**: Downloads valid binary `.stl` files (e.g., `pet-tag-bone-luna.stl`, `111,584` bytes, `2,230` triangles, exact byte match `84 + 2230 × 50`).
- **Privacy Compliance**: 100% client-side execution with zero external network requests.

### What Fails or Degrades
1. **Out-of-Bounds Eyelet Hole & Emergency Icon on Bone and Heart Shapes (`High`)**:
   - In `buildTagShape()`, the `bone` contour's top-center waist only reaches `y = neckH / 2 = h * 0.2` (`4.8 mm` at default `h = 24 mm`), and the `heart` contour's top-center cleft only reaches `y = s * 0.35` (`4.41 mm` at `h = 28 mm`).
   - However, `buildTagShape()` places the split-ring eyelet hole at `holeY = halfH - holeR - 2.5` (`7.25 mm` on Bone, `9.25 mm` on Heart) without adding a protruding top eyelet tab lug, placing the hole in empty space outside the tag contour and colliding with the emergency icon (`iconY = h * 0.32 = 7.68 mm`).
   - Additionally, on `bone` tags, the 3rd text line (`MICROCHIPPED` at `y = -h * 0.28 = -6.72 mm`) overhangs the narrow bone waist (`|y| <= 4.8 mm`).
2. **Light-Mode Contrast Failure (`High`)**:
   - `.c-input__label` (`#e2e8f0`), `.checkbox-label` (`#e2e8f0`), `.metric-value` (`#f8fafc` on `rgba(255, 255, 255, 0.03)`), and `.safety-list` (`#d1d5db`) are hardcoded light colors, making form labels, metrics, and pet safety tips nearly invisible in light mode.
3. **Unsubdivided Curved Slide-On Band & Unimplemented `dualSided` Option (`Medium`)**:
   - When `curvedBand` is enabled in `collar_slide_on` mode, `generatePetTagMesh()` displaces the Z coordinates (`dz = -sagitta * (x / halfW)^2`) of a flat `ExtrudeGeometry` whose top and bottom straight edges have no intermediate X vertices, warping long unsubdivided triangles across the span.
   - `dualSided` is defined in `PetIdTagGeneratorOptions`, `DEFAULT_PET_TAG_OPTIONS`, and `PetIdTagGeneratorComponent`, and Spec §3 mentions dual-sided text placement, but `engine.ts` never reads `options.dualSided` and no UI toggle is rendered.
4. **Horizontal Overflow at 320px (`scrollWidth: 333px`) (`Medium`)**:
   - At `320×640`, the `<h1>` title (`Pet ID Tag & Collar Slide-On Generator`) overflows the viewport by `13px`.
5. **Memory Leak, Missing Touch Controls & Missing Web Worker (`Low`)**:
   - `setupMouseEvents()` leaks an anonymous `window.addEventListener('mouseup')` listener on destroy, lacks touch orbit handlers, and lacks `worker.ts`.

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-41-01` — Out-of-Bounds Split-Ring Eyelet Hole, Floating Emergency Icon, and Text Overhang on `bone` and `heart` Shapes
- **Severity**: `High`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/pet-id-tag-generator/engine.ts#L388-L459), [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/pet-id-tag-generator/engine.ts#L503-L553)
- **Symptom & Evidence**:
  - On `bone` (`widthMm = 42, heightMm = 24`), at `x = 0`, the top edge of the bone shape is at `y = neckH / 2 = 4.8 mm` and the bottom edge is at `y = -4.8 mm`. Yet `holeY` is placed at `12 - 2.25 - 2.5 = 7.25 mm` (completely outside the bone contour in open air!), `iconY` is placed at `24 * 0.32 = 7.68 mm` (floating in mid-air above the bone neck and overlapping `holeY`!), and `line2` (`MICROCHIPPED`) is placed at `y = -24 * 0.28 = -6.72 mm` (hanging outside the bottom of the bone neck!).
  - On `heart` (`widthMm = 28, heightMm = 28`), the top center cleft is at `(0, 4.41 mm)`, while `holeY` is at `9.25 mm` and `iconY` is at `8.96 mm` (both floating above the cleft in mid-air).
- **Root Cause**: `buildTagShape()` assumes every `hanging_charm` shape reaches `y = +halfH` at `x = 0` when punching the split-ring hole (`holePath.absarc(0, holeY, holeR, ...)`), and `generatePetTagMesh()` uses fixed Y multipliers (`+0.32 * h`, `-0.08 * h`, `-0.28 * h`) without accounting for the recessed top/bottom center profile of `bone` and `heart` or integrating a top eyelet lug into the outer contour.
- **Remediation Specification**:
  1. In `buildTagShape()`:
     - For `bone`: Increase `neckH` to `h * 0.58` and integrate a rounded top center eyelet tab (`lugRadius = holeR + 2.2 mm` centered at `(0, holeY)`) into the top contour between the left and right bone lobes so the split-ring hole at `(0, holeY)` is fully enclosed by solid material.
     - For `heart`: Integrate a rounded top eyelet tab at `(0, holeY)` bridging the heart cleft so the split-ring hole is enclosed by at least `2.0 mm` of wall thickness.
  2. In `generatePetTagMesh()`:
     - Position the emergency icon below the split-ring hole (`iconY = Math.min(holeY - holeR - iconSize * 1.1, usableTopY)`) and clamp/scale `petName`, `phonePrimary`, and `line2` within the actual vertical and horizontal safe bounds of the selected shape (`bone` neck height, `heart` tapered lower V, `shield` crest).

### `DEFECT-41-02` — Light-Mode Contrast Failure Across Form Labels, Metrics, and Safety Advice
- **Severity**: `High`
- **Category**: `Theme Contrast`
- **Location**: [`pet-id-tag-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/pet-id-tag-generator/pet-id-tag-generator.component.ts#L619-L714)
- **Symptom & Evidence**: In light mode (`mobile.png`, `small.png`), `.c-input__label` (`#e2e8f0`), `.checkbox-label` (`#e2e8f0`), `.metric-value` (`#f8fafc`), `.badge-dim` (`#cbd5e1`), and `.safety-list` (`#d1d5db`) are nearly invisible on white card backgrounds.
- **Root Cause**: Hardcoded light hex colors and undefined `--color-text-main` fallback `#e2e8f0`.
- **Remediation Specification**:
  - Extract inline styles to `pet-id-tag-generator.component.scss`.
  - Replace all hardcoded light text colors and `--color-text-main` fallbacks with `var(--color-text-primary, var(--color-text))` and `var(--color-text-secondary, var(--color-text-muted))`.
  - Style `.metric-item` and `.safety-box` with theme-aware surface and border variables.

### `DEFECT-41-03` — Coarse Unsubdivided `curvedBand` Mesh & Unimplemented `dualSided` Engraving Option
- **Severity**: `Medium`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/pet-id-tag-generator/engine.ts#L476-L565), [`pet-id-tag-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/pet-id-tag-generator/pet-id-tag-generator.component.ts#L220-L245)
- **Symptom & Evidence**:
  1. In `buildTagShape()` for `collar_slide_on`, the top and bottom edges of the rounded rectangle are single straight `lineTo` segments from `-halfW + r` to `halfW - r`. When `curvedBand` applies parabolic Z displacement (`dz = -sagitta * (vx / halfW)^2`), there are no intermediate vertices along X on those straight edges, warping the front and back faces.
  2. `options.dualSided` is present in `types.ts` and component signals, but ignored by `engine.ts` and missing from the template.
- **Root Cause**:
  1. `lineTo` creates a single 2-point `LineCurve` with zero interior vertices along X.
  2. `dualSided` was left unwired in `generatePetTagMesh()` and the UI template.
- **Remediation Specification**:
  1. Subdivide the top and bottom straight edges of `collar_slide_on` into `24` colinear segments along X so parabolic Z-bending produces a smooth, uniform cylindrical arc.
  2. When `options.dualSided` is `true`, place `phonePrimary` and `line2` on the back face (`z = 0`, mirrored in X so it reads left-to-right when viewing the back of the tag) while keeping `petName` and the icon centered on the front face, and add a "Dual-Sided Engraving (Phone on Back)" checkbox in the UI.

### `DEFECT-41-04` — Horizontal Overflow at 320px (`scrollWidth: 333px`)
- **Severity**: `Medium`
- **Category**: `Mobile & Responsive Layout`
- **Location**: [`pet-id-tag-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/pet-id-tag-generator/pet-id-tag-generator.component.ts#L40-L50)
- **Symptom & Evidence**: At `320×640`, `scrollWidth` is `333px` (`+13px` horizontal overflow) caused by `.c-header__title`.
- **Root Cause**: Missing `min-width: 0; overflow-wrap: break-word;` on `.c-header__title-group`, `.c-header__title`, and `.l-columns__area`.
- **Remediation Specification**:
  - Add `min-width: 0; overflow-wrap: break-word;` to `.c-header__title-group`, `.c-header__title`, and `.l-columns__area`.
  - Wrap `.mode-tabs` and collapse `.metrics-panel` on small viewports; ensure all interactive controls have `min-height: 38px`.

### `DEFECT-41-05` — Leaked `window.addEventListener('mouseup')`, Missing Touch Orbit Controls, and Missing Web Worker
- **Severity**: `Low`
- **Category**: `Memory Hygiene` / `Web Worker & Performance`
- **Location**: [`pet-id-tag-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/3d/pet-id-tag-generator/pet-id-tag-generator.component.ts#L1032-L1062)
- **Symptom & Evidence**: Anonymous `window.addEventListener('mouseup')` is never removed in `ngOnDestroy()`; no touch orbit handlers exist on the 3D canvas; no `worker.ts` exists.
- **Root Cause**: Unstored listener reference and missing touch/worker implementation.
- **Remediation Specification**:
  - Store `onWindowMouseUp` reference and remove it in `ngOnDestroy()`.
  - Add `touchstart`/`touchmove`/`touchend` canvas handlers and `worker.ts` for off-main-thread export.

---

## 3. Target Acceptance Criteria

### Functional & Spec Conformance
- [ ] On all 5 charm shapes (`bone`, `heart`, `circle`, `shield`, `hexagon`), the split-ring eyelet hole (`holeY ± holeR`) is completely enclosed within the outer tag contour (`baseGeometry` bounding contour at `x = 0` extends at least `1.8 mm` above `holeY + holeR`).
- [ ] The emergency icon (`iconGeometry`) does not overlap the split-ring hole (`iconMaxY < holeY - holeR`) and all text lines (`textGeometry`) stay inside the vertical/horizontal bounds of the tag body (including the `bone` waist).
- [ ] Enabling `dualSided` places secondary contact text on the back face (`z <= 0`) and displays a working UI toggle.
- [ ] Enabling `curvedBand` on `collar_slide_on` bends a subdivided top/bottom contour smoothly across X with `0` `NaN` values.

### Mobile & Responsive Layout
- [ ] `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at `1366×900`, `390×844`, and `320×640`.
- [ ] All form labels, checkbox labels, metric values, and safety notes achieve `>= 4.5:1` contrast in both light and dark modes.
- [ ] All interactive controls have touch target height `>= 38px`.

### `AGENTS.md` Prime Directives
- [ ] **Directive 1 & 2**: Zero external network requests.
- [ ] **Directive 3**: Export generation offloaded to `worker.ts`.
- [ ] **Directive 4**: `window` mouseup listener removed in `ngOnDestroy()`, worker terminated, Three.js resources disposed, and blob URLs revoked after download.
