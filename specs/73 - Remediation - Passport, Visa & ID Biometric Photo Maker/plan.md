# TDD Remediation Plan: Passport, Visa & ID Biometric Photo Maker

> **Spec ID**: `73`  
> **Tool**: `43 - Passport, Visa & ID Biometric Photo Maker`  
> **Route**: `/tools/passport-biometric-photo`  
> **Category**: `media`  
> **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/media/passport-biometric-photo/
├── types.ts                                   # Add PreviewViewMode ('crop_guide' | 'print_sheet') & worker message types
├── test-fixtures.ts                           # Replace 1x1 red pixel DUMMY_PORTRAIT_DATA_URL with realistic SVG portrait silhouettes
├── engine.ts                                  # Add renderSinglePhotoPreview(), corner-backdrop tinting, fix 300ms loadImageElement timeout, computeBiometricGuidePercentages()
├── engine.spec.ts                             # Seam 1 tests for guide math, single-slot preview, backdrop tinting, and sample fixtures
├── worker.ts                                  # Dedicated Web Worker for high-DPI sheet rendering (Directive 3)
├── passport-biometric-photo.component.ts      # Add panX/panY sliders & canvas pointer drag, preview mode toggle, worker cleanup, BEM classes
├── passport-biometric-photo.component.scss    # Scoped BEM styles (.c-passport__*) using CSS variables (--color-*), responsive 320px rules
└── passport-biometric-photo.component.spec.ts # Seam 3 & 4 tests for pan controls, preview toggle, BEM classes, and worker/URL disposal
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Export Correctness Boundary (`engine.ts` / `engine.spec.ts`)
- **Public Functions Under Test**:
  - `computeBiometricGuidePercentages(spec: PassportSpecification): { crownMinTopPct: number; crownMaxTopPct: number; eyeTopPct: number; chinTopPct: number }`
  - `renderSinglePhotoPreview(imageSource: string | Blob | File, options: PassportBiometricPhotoOptions): Promise<HTMLCanvasElement>`
  - `renderPassportSheet(imageSource: string | Blob | File, options: PassportBiometricPhotoOptions): Promise<RenderSheetResult>`
  - `processPassportPhoto(imageSource: string | Blob | File, options: PassportBiometricPhotoOptions, format: PassportExportFormat): Promise<PassportBiometricPhotoResult>`
- **Concrete Assertions**:
  - `SAMPLE_PORTRAITS` contain distinct, valid SVG/PNG data URLs (> 300 chars each, not the 1×1 pixel placeholder) that decode to recognizable portrait dimensions.
  - `computeBiometricGuidePercentages(PASSPORT_SPECS.us_2x2_inch)` returns distinct head height percentages matching `minHeadHeightMm: 25` (`49.2%`) and `maxHeadHeightMm: 35` (`68.9%`) relative to `heightMm: 50.8`, which differ from `PASSPORT_SPECS.eu_schengen_35x45mm` (`32–36 mm` on `45 mm` height = `71.1%–80.0%`).
  - `renderSinglePhotoPreview()` produces a single-slot canvas (`photoWidthPx × photoHeightPx`) rather than a multi-photo sheet, allowing accurate 1:1 biometric head alignment.

### Seam 2: Web Worker & Main-Thread Protection Boundary (`worker.ts` / `passport-biometric-photo.component.ts`)
- **Protocol**:
  - Request: `{ type: 'RENDER_SHEET', options: PassportBiometricPhotoOptions, format: PassportExportFormat }`
  - Response: `{ type: 'PROGRESS', percent: number } | { type: 'COMPLETE', result: PassportBiometricPhotoResult } | { type: 'ERROR', message: string }`
- **Concrete Assertions**:
  - Component terminates any active worker instance during `ngOnDestroy()`.

### Seam 3: Component State, Controls, Sanitization & Resource Disposal Boundary (`passport-biometric-photo.component.ts` / `passport-biometric-photo.component.spec.ts`)
- **Concrete Assertions**:
  - Changing `panX` and `panY` sliders or dragging (`pointerdown` → `pointermove` → `pointerup`) on the preview canvas updates `panX()` and `panY()` signals and triggers preview re-render.
  - Switching between `'crop_guide'` (Single Biometric Crop View) and `'print_sheet'` (Full Print Sheet View) toggles `.c-passport__biometric-overlay` visibility so the head guide is never stretched over a multi-photo sheet.
  - `resetAdjustments()` resets `zoomLevel` (`1.0`), `tiltAngleDeg` (`0`), `brightness` (`0`), `contrast` (`0`), `panX` (`0`), and `panY` (`0`).
  - `ngOnDestroy()` revokes all created object URLs via `URL.revokeObjectURL()` and terminates any worker.

### Seam 4: Mobile Responsive & Theme Styling Boundary (`passport-biometric-photo.component.scss`)
- **Concrete Assertions**:
  - Template uses `.l-columns__area` (never `.l-columns__column`), `.l-extremo__area-izquierda` / `.l-extremo__area-derecha`, `.c-input__slider`, and `.c-input__switch`.
  - All colors reference CSS custom properties (`var(--color-bg-surface)`, `var(--color-bg-subtle)`, `var(--color-border-default)`, `var(--color-text-primary)`, `var(--color-text-secondary)`).
  - At `320px` and `390px` viewports, `scrollWidth <= clientWidth` (`hasHorizontalScroll: false`), slider touch targets are `>= 32px` tall, and `.c-passport__biometric-tag` font size is `>= 12px`.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: Realistic Sample Portraits & Biometric Guide Percentage Math (Seam 1)
- **Red**: In `engine.spec.ts`, write tests asserting:
  1. `SAMPLE_PORTRAITS[0].dataUrl !== SAMPLE_PORTRAITS[1].dataUrl` and each sample `dataUrl` encodes a valid SVG portrait silhouette (`data:image/svg+xml`).
  2. `computeBiometricGuidePercentages(PASSPORT_SPECS['us_2x2_inch'])` and `computeBiometricGuidePercentages(PASSPORT_SPECS['eu_schengen_35x45mm'])` return accurate, country-specific crown/eye/chin vertical percentages.
- **Green**: Update `SAMPLE_PORTRAITS` in `test-fixtures.ts` with three distinct SVG portrait silhouettes (Neutral, Formal Studio, Child/Infant) with transparent backdrops, and implement `computeBiometricGuidePercentages()` in `engine.ts`.
- **Refactor**: Ensure SVG portraits are cleanly formatted and lightweight.

### Slice 2: Single-Photo Biometric Crop Preview vs. Sheet Preview Mode (Seam 1 & Seam 3)
- **Red**: In `engine.spec.ts` and `passport-biometric-photo.component.spec.ts`, write tests asserting:
  1. `renderSinglePhotoPreview(source, options)` renders a canvas with dimensions equal to a single photo (`photoWidthPx × photoHeightPx`) even when `options.printSheetSize === '4x6_inches'`.
  2. `PassportBiometricPhotoComponent` exposes `previewMode` signal (`'crop_guide' | 'print_sheet'`), displays `.c-passport__biometric-overlay` only when `previewMode() === 'crop_guide'` or `printSheetSize() === 'single_digital'`, and binds dynamic `[style.top.%]="guidePercentages().crownMaxTopPct"` on the overlay lines.
- **Green**: Implement `renderSinglePhotoPreview()` in `engine.ts`, remove the 300ms blank-image timeout in `loadImageElement()`, and add the preview mode toggle + dynamic guide line bindings in `passport-biometric-photo.component.ts`.
- **Refactor**: Share `renderSinglePhotoSlot()` between `renderSinglePhotoPreview()` and `renderPassportSheet()`.

### Slice 3: Interactive Pan X / Pan Y Sliders & Canvas Pointer Dragging (Seam 3)
- **Red**: In `passport-biometric-photo.component.spec.ts`, write tests asserting:
  1. Two range inputs for `panX` and `panY` are rendered in the DOM and update `component.panX()` and `component.panY()`.
  2. Dispatching `pointerdown` (`clientX: 100, clientY: 100`), `pointermove` (`clientX: 130, clientY: 85`), and `pointerup` on the preview canvas updates `panX()` and `panY()` proportionally.
- **Green**: Add `panX` and `panY` `.c-input__slider` controls to Card 2 and bind `(pointerdown)`, `(pointermove)`, `(pointerup)`, `(pointercancel)` on `#previewCanvas`.
- **Refactor**: Clamp `panX` and `panY` to `[-200, 200]`.

### Slice 4: BEM Layout, Form Control Standardization, Theme Variables & 320px Responsiveness (Seam 4)
- **Red**: In `passport-biometric-photo.component.spec.ts`, assert that `.l-columns__column`, `.c-range`, `.c-form-label`, and `.c-checkbox-label` do not exist in the compiled template, and that `.l-columns__area`, `.l-extremo__area-izquierda`, `.l-extremo__area-derecha`, `.c-input__slider`, and `.c-input__switch` are present.
- **Green**: Update template markup and extract styles to `passport-biometric-photo.component.scss` using CSS custom properties (`var(--color-*)`), `min-width: 0`, and `0.75rem` (`12px`) `.c-passport__biometric-tag` labels.
- **Refactor**: Verify dark/light mode contrast and 320px/390px layout in headless Chrome.
