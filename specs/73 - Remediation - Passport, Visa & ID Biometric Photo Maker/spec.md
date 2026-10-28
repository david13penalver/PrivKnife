# Remediation Specification: Passport, Visa & ID Biometric Photo Maker

> **Spec ID**: `73`  
> **Remediates Tool**: `43 - Passport, Visa & ID Biometric Photo Maker`  
> **Slug**: `passport-biometric-photo`  
> **Category**: `media`  
> **Route**: `/tools/passport-biometric-photo`  
> **Audit Reference**: [`tools_31_60_audit.md#tool-43`](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-43)  
> **Current Audit Verdict**: Functional: `⚠️ Partial` | Mobile: `⚠️ Minor issues` | Overall: `⚠️`  
> **Status**: `Ready for Implementation`  
> **Priority**: `High`

---

## 1. Executive Summary & Audit Baseline

The headless-Chrome audit of **Tool 43 — Passport, Visa & ID Biometric Photo Maker** (`/tools/passport-biometric-photo`) across Desktop (`1366×900`), Mobile (`390×844`), and Small Mobile (`320×640`) established the following baseline:

- **What Currently Works**:
  - Country specification presets (`us_2x2_inch`, `eu_schengen_35x45mm`, `uk_35x45mm`, `canada_50x70mm`, `japan_30x40mm`, `china_33x48mm`), sheet layout calculations (`4x6_inches`, `a4`, `a6`, `single_digital`), and DPI scaling (`300`, `600`) compute accurate millimeter/pixel dimensions and photo yields.
  - Client-side deliverable generation produces valid `.jpg` (`106,393 B`, `ff d8 ff e0`), `.pdf` (`457,166 B`, `%PDF-1.3`), and `.png` (`26,038 B`, `89 50 4e 47`) files with zero external network requests and zero console/page errors.
  - `URL.revokeObjectURL()` cleanup is invoked on component teardown (`ngOnDestroy`).
- **What Fails or Is Incomplete**:
  1. **1×1 Pixel Placeholder Sample Portraits**: All three sample portrait buttons (`Sample Portrait (Neutral)`, `Formal Studio Portrait`, `Child / Infant Portrait`) load `DUMMY_PORTRAIT_DATA_URL` (a 1×1 red pixel PNG), causing the default live preview to display solid red rectangles instead of a recognizable human portrait.
  2. **Biometric Guideline Overlay Misaligned on Multi-Photo Sheets**: `.biometric-overlay` (`Crown of Head`, `Eye Level Centerline`, `Chin Baseline`) is positioned over the entire `.canvas-wrapper` using static CSS percentages (`top: 20%`, `45%`, `75%`). When a multi-photo print sheet (default `4×6″`) is selected, the single-head biometric guide lines stretch across the entire 4- or 6-photo sheet instead of framing a single portrait crop slot, and ignore `currentSpec().minHeadHeightMm` / `maxHeadHeightMm`.
  3. **Missing Pan X / Pan Y Controls**: `panX` and `panY` signals and `setPan(x, y)` exist in `PassportBiometricPhotoComponent` and `engine.ts`, but no UI sliders or canvas pointer-drag interactions exist to reposition an off-center face.
  4. **Background Tint Ineffective on Opaque Portraits & 300ms Image Load Timeout**: `renderSinglePhotoSlot` fills the background color behind the image and draws opaque portraits in `cover` mode directly over it, so background tinting has no effect on standard JPEG uploads unless background replacement is applied; additionally, `loadImageElement` has a 300ms timeout that resolves with an empty `600×600` image if decoding takes longer than 300ms.
  5. **Mobile Overflow (`367px` at `320px`) & Non-Existent Form Classes**: Using `.l-columns__column` instead of `.l-columns__area` omits `min-width: 0`, causing horizontal scroll (`scrollWidth: 367px`) at `320px`. Non-existent classes (`.c-range`, `.c-form-label`, `.c-form-value`, `.c-checkbox-label`) and missing `.l-extremo__area-izquierda` / `__area-derecha` wrappers result in `129×16px` unstyled sliders, a `13×13px` checkbox, `10.4px` tiny text tags, and concatenated label/value text (`Scale / Zoom Level1.00x`).
  6. **Main-Thread 600 DPI Sheet Rendering & Hardcoded Light-Mode Colors**: High-resolution 600 DPI A4 rendering (`4961×7016 px`) runs on the main UI thread without a Web Worker, and inline component styles hardcode light-mode hex values (`#f8fafc`, `#e2e8f0`, `#1e293b`) without BEM `c-` prefixes or i18n translation pipes.

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-43-01` — Built-in Sample Portraits Use a 1×1 Red Pixel Placeholder
- **Severity**: `High`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`test-fixtures.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/passport-biometric-photo/test-fixtures.ts#L206-L231)
- **Symptom & Evidence**: On initial load and when clicking `Sample Portrait (Neutral)`, `Formal Studio Portrait`, or `Child / Infant Portrait`, the preview canvas renders solid red/salmon rectangles (`desktop.png`, `mobile.png`).
- **Root Cause**: `SAMPLE_PORTRAITS` sets `dataUrl: DUMMY_PORTRAIT_DATA_URL` (`iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==`, a 1×1 pixel PNG) for all three entries.
- **Remediation Specification**:
  - Replace the three sample portrait `dataUrl` values in `test-fixtures.ts` with distinct, high-resolution (`600×800`) SVG data URLs (`data:image/svg+xml;utf8,...`) or procedurally generated canvas data URLs depicting realistic biometric portrait silhouettes (head crown, eyes, nose, chin, shoulders, and transparent/studio background) tailored to each sample (`neutral_portrait`, `formal_portrait`, `child_portrait`) so users can immediately see and test biometric alignment and background tinting.

### `DEFECT-43-02` — Biometric Head-Guide Overlay Stretched Over Full Multi-Photo Sheet
- **Severity**: `Medium`
- **Category**: `Spec Conformance`
- **Location**: [`passport-biometric-photo.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/passport-biometric-photo/passport-biometric-photo.component.ts#L328-L346), [`passport-biometric-photo.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/passport-biometric-photo/passport-biometric-photo.component.ts#L492-L529)
- **Symptom & Evidence**: When `printSheetSize` is `4x6_inches` (default), `a4`, or `a6`, `previewCanvas` renders a multi-photo sheet grid while `.biometric-overlay` draws a single set of `Crown of Head`, `Eye Level Centerline`, and `Chin Baseline` dashed lines across the entire sheet. Furthermore, the lines are fixed at CSS `top: 20%`, `45%`, and `75%` regardless of the selected country's `minHeadHeightMm` / `maxHeadHeightMm`.
- **Root Cause**: The component uses a single canvas for both multi-photo print sheet preview and single-photo biometric alignment, and hardcodes `.biometric-line--crown { top: 20%; }` and `.biometric-line--chin { top: 75%; }`.
- **Remediation Specification**:
  - Add a preview view mode toggle (`'crop_guide' | 'print_sheet'`) or dual preview where **Biometric Crop View** renders a single portrait slot (`renderSinglePhotoPreview`) with the biometric overlay accurately positioned using computed percentages derived from `currentSpec()`:
    - `chinTopPct = 82` (or standard ICAO chin baseline),
    - `crownMaxTopPct = chinTopPct - (currentSpec().maxHeadHeightMm / currentSpec().heightMm) * 100`,
    - `crownMinTopPct = chinTopPct - (currentSpec().minHeadHeightMm / currentSpec().heightMm) * 100`,
  - When viewing the **Print Sheet View**, hide the single-head `.biometric-overlay` so cut guidelines on the tiled sheet are unobstructed.

### `DEFECT-43-03` — Missing UI Controls & Pointer Drag for `panX` and `panY`
- **Severity**: `Medium`
- **Category**: `Spec Conformance`
- **Location**: [`passport-biometric-photo.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/passport-biometric-photo/passport-biometric-photo.component.ts#L603-L604), [`passport-biometric-photo.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/passport-biometric-photo/passport-biometric-photo.component.ts#L689-L693)
- **Symptom & Evidence**: `panX` and `panY` signals and `setPan(x, y)` exist in the component class, and `engine.ts` applies `options.panX` and `options.panY` during rendering, but there are no sliders or canvas drag handlers in the template.
- **Root Cause**: Template controls for horizontal/vertical pan and pointer drag on the preview canvas were omitted.
- **Remediation Specification**:
  - Add **Horizontal Pan (`panX`)** and **Vertical Pan (`panY`)** range sliders (`-200` to `+200 px`, step `2`) in Card 2 (`2. Framing & Adjustments`).
  - Add `pointerdown`, `pointermove`, `pointerup`, and `pointercancel` handlers on the biometric preview canvas (`touch-action: none`) so users can drag the portrait directly to align the eyes and crown on both desktop and mobile.

### `DEFECT-43-04` — `loadImageElement` 300ms Blank Fallback & Background Tint Handling
- **Severity**: `Medium`
- **Category**: `Engine Logic`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/passport-biometric-photo/engine.ts#L195-L200), [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/passport-biometric-photo/engine.ts#L340-L350)
- **Symptom & Evidence**:
  1. `loadImageElement()` sets a `300ms` timeout that resolves with an unloaded `600×600` `HTMLImageElement` if a large DSLR portrait takes >300ms to decode, producing a blank white output sheet.
  2. When an opaque JPEG with a near-white/studio background is uploaded, `renderSinglePhotoSlot` only fills the background behind the image, so selecting `Off-White`, `Light Grey`, or `Light Blue` has no visible effect unless the image has alpha transparency.
- **Root Cause**: Over-aggressive 300ms timeout intended for unit test environments, and lack of corner-sampled studio background replacement for opaque images.
- **Remediation Specification**:
  - In `loadImageElement()`, restrict the short timeout fallback strictly to test/headless environments without real image decoding (`isJsdom`), or increase the browser timeout to `10000ms` while properly awaiting `img.onload` / `img.onerror`.
  - In `renderSinglePhotoSlot()`, when `options.backgroundColor !== 'original'`, sample the top-left/top-right corner pixels of the source portrait; if the image is opaque (`alpha === 255`) with a uniform light backdrop, replace pixels within a color-distance tolerance of the corner backdrop with the target `bgMap[options.backgroundColor]` tint.

### `DEFECT-43-05` — 320px Horizontal Overflow (`367px`), Unstyled Sliders & Concatenated Labels
- **Severity**: `Medium`
- **Category**: `Mobile & Responsive Layout` / `BEM & Form Accessibility`
- **Location**: [`passport-biometric-photo.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/passport-biometric-photo/passport-biometric-photo.component.ts#L74-L250)
- **Symptom & Evidence**:
  - At `320px` viewport (`small.png`), `document.documentElement.scrollWidth` is `367px` (`hasHorizontalScroll: true`).
  - Range sliders render at `129×16 px` (`smallTouchTargets: 5`), the checkbox renders at `13×13 px`, and `.biometric-tag` text renders at `10.4px` (`tinyText: 3`).
  - Slider labels and values are concatenated with zero spacing: `Scale / Zoom Level1.00x`, `Head Tilt Correction0.0°`, `Brightness0`, `Contrast0`.
- **Root Cause**:
  - Grid columns use non-existent `.l-columns__column` instead of `.l-columns__area` (which defines `min-width: 0; width: 100%` in `src/styles/03_layout/_l-columns.scss`).
  - `.l-extremo` is used without child `.l-extremo__area-izquierda` and `.l-extremo__area-derecha` wrappers (`_l-extremo.scss` relies on `margin-right: auto` / `margin-left: auto` on those area classes).
  - Form inputs use non-existent `.c-form-group`, `.c-form-label`, `.c-form-value`, `.c-range`, and `.c-checkbox-label` instead of `.c-input`, `.c-input__label`, `.c-input__slider`, and `.c-input__switch`.
- **Remediation Specification**:
  - Replace all `.l-columns__column` elements with `.l-columns__area`.
  - Wrap `.l-extremo` left/right children in `.l-extremo__area-izquierda` and `.l-extremo__area-derecha`.
  - Replace `.c-form-group`, `.c-form-label`, `.c-range`, and `.c-checkbox-label` with `.c-input`, `.c-input__label`, `.c-input__slider` (with min touch height `>= 32px` via padding/thumb sizing), and `.c-input__switch`.
  - Increase `.c-passport__biometric-tag` font size from `0.65rem` (`10.4px`) to `0.75rem` (`12px`) and ensure `.c-header__title` wraps cleanly (`overflow-wrap: break-word; min-width: 0`) so `scrollWidth <= 320px` at `320px` viewport.

### `DEFECT-43-06` — High-DPI Sheet Generation Runs on Main Thread (Directive 3)
- **Severity**: `Medium`
- **Category**: `Web Worker & Performance`
- **Location**: [`passport-biometric-photo.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/passport-biometric-photo/passport-biometric-photo.component.ts#L763-L783)
- **Symptom & Evidence**: Exporting an A4 sheet at 600 DPI creates and encodes a `4961×7016 px` canvas (~34.8 megapixels) on the main UI thread.
- **Root Cause**: No Web Worker (`worker.ts`) is implemented; `generateDeliverable()` executes `processPassportPhoto()` directly on the Angular UI thread.
- **Remediation Specification**:
  - Create `worker.ts` (or use `OffscreenCanvas` worker bridge with graceful main-thread microtask fallback when `OffscreenCanvas` or `Worker` is unavailable in unit tests) to offload high-DPI image processing and blob encoding, reporting progress (`0..100%`) and terminating the worker in `ngOnDestroy()`.

### `DEFECT-43-07` — Unprefixed CSS Classes, Hardcoded Light-Mode Hex Colors & Missing i18n
- **Severity**: `Low`
- **Category**: `Theme Contrast` / `BEM & Form Accessibility`
- **Location**: [`passport-biometric-photo.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/passport-biometric-photo/passport-biometric-photo.component.ts#L445-L579)
- **Symptom & Evidence**: Component inline styles use unprefixed classes (`.preset-strip`, `.preset-label`, `.preview-container`, `.metrics-grid`, `.metric-item`, `.notes-title`, `.notes-list`) with hardcoded light-mode colors (`background: #f8fafc`, `border: 1px solid #e2e8f0`, `color: #1e293b`, `color: #475569`), which fail dark-mode theme adaptation.
- **Root Cause**: Styles were written inline with raw hex values instead of PrivKnife's BEM `c-` namespace and CSS custom properties (`var(--color-bg-subtle)`, `var(--color-bg-surface)`, `var(--color-border-default)`, `var(--color-text-primary)`, `var(--color-text-secondary)`).
- **Remediation Specification**:
  - Extract styles to `passport-biometric-photo.component.scss` (or scoped BEM classes `.c-passport__*`), replace all hardcoded light-mode hex values with CSS custom properties (`var(--color-*)`), and wire `TranslatePipe` (`| translate`) with fallback strings.

---

## 3. Target Acceptance Criteria

### 3.1 Functional & Spec Conformance
- [ ] All three sample portraits (`neutral_portrait`, `formal_portrait`, `child_portrait`) render recognizable multi-00px portrait silhouettes with head, eyes, and shoulders rather than a 1×1 red pixel.
- [ ] Biometric guideline overlay (`Crown of Head`, `Eye Level Centerline`, `Chin Baseline`) accurately frames a single portrait crop view using `currentSpec().minHeadHeightMm` and `maxHeadHeightMm` ratios, and does not stretch across a multi-photo sheet grid.
- [ ] Users can adjust `panX` and `panY` via both UI range sliders (`-200..+200 px`) and direct pointer dragging on the preview canvas.
- [ ] Background tinting (`pure_white`, `off_white`, `light_grey`, `light_blue`) visibly updates the portrait backdrop, and `loadImageElement` does not time out after 300ms on real browser images.
- [ ] Exporting `.jpg`, `.pdf`, and `.png` deliverables across all 6 country presets and 4 sheet sizes produces valid files with accurate pixel dimensions.

### 3.2 Mobile & Responsive Layout & Theme Contrast
- [ ] `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at `1366px`, `390px`, and `320px` viewports (`hasHorizontalScroll: false`).
- [ ] All interactive controls (`button`, `input[type=range]`, checkbox switch) meet touch target minimums (`>= 32px`, target `>= 38px`), and all text is `>= 12px` (`tinyText: []`).
- [ ] All `.l-extremo` rows use `.l-extremo__area-izquierda` and `.l-extremo__area-derecha` so labels and values never concatenate.
- [ ] All surfaces, borders, and text use CSS custom properties (`var(--color-*)`) with legible contrast in both Light and Dark themes.

### 3.3 `AGENTS.md` Prime Directives
- [ ] **Directive 1 & 2 (Zero Server Ingestion & Zero Telemetry)**: 0 external network requests during all operations.
- [ ] **Directive 3 (Protect Main UI Thread)**: High-DPI export offloads heavy pixel work via `worker.ts` (with safe fallback) and reports progress.
- [ ] **Directive 4 (Strict Memory Hygiene)**: Every `URL.createObjectURL()` is revoked via `URL.revokeObjectURL()` on reset and in `ngOnDestroy()`, and any active Web Worker is terminated in `ngOnDestroy()`.
