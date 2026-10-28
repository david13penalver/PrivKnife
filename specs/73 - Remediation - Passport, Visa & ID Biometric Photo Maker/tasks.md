# Remediation Task List: Passport, Visa & ID Biometric Photo Maker

> **Spec ID**: `73`  
> **Remediates Tool**: `43 - Passport, Visa & ID Biometric Photo Maker` (`/tools/passport-biometric-photo`)  
> **Rule**: Follow strict TDD (`Red → Green → Refactor`). Do not skip verification gates.

---

## Phase 1: Engine & Algorithmic Remediation (Seam 1 — Red → Green)

- [ ] **Task 1.1: Replace 1×1 Pixel Placeholder Sample Portraits (`DEFECT-43-01`)**
  - **Red**: In `src/app/tools/media/passport-biometric-photo/engine.spec.ts`, add assertions verifying that `SAMPLE_PORTRAITS` entries (`neutral_portrait`, `formal_portrait`, `child_portrait`) have distinct `dataUrl` strings containing valid SVG portrait silhouettes (`data:image/svg+xml`) rather than the 1×1 pixel `DUMMY_PORTRAIT_DATA_URL`.
  - **Green**: Update `SAMPLE_PORTRAITS` and `DUMMY_PORTRAIT_DATA_URL` in `src/app/tools/media/passport-biometric-photo/test-fixtures.ts` with well-proportioned SVG portrait illustrations (head crown, eye line, chin, shoulders, transparent studio background).
- [ ] **Task 1.2: Implement Dynamic Biometric Guide Percentage Calculation (`DEFECT-43-02`)**
  - **Red**: In `engine.spec.ts`, write unit tests for `computeBiometricGuidePercentages(spec)` verifying country-specific crown min/max, eye level, and chin baseline percentages for US (`50.8×50.8mm`, head `25–35mm`) vs. EU/Schengen (`35×45mm`, head `32–36mm`).
  - **Green**: Implement `computeBiometricGuidePercentages()` in `src/app/tools/media/passport-biometric-photo/engine.ts`.
- [ ] **Task 1.3: Implement Single-Photo Biometric Preview & Fix `loadImageElement` Timeout (`DEFECT-43-02`, `DEFECT-43-04`)**
  - **Red**: In `engine.spec.ts`, test `renderSinglePhotoPreview(source, options)` to assert that it renders a single portrait slot (`photoWidthPx × photoHeightPx`) regardless of `options.printSheetSize`, and test corner-backdrop tinting for opaque studio portraits.
  - **Green**: Implement `renderSinglePhotoPreview()` in `engine.ts`, remove the premature 300ms blank-image timeout in `loadImageElement()` for real browser runtimes, and support corner-sampled backdrop tinting in `renderSinglePhotoSlot()`.

---

## Phase 2: Web Worker Offloading & Memory Hygiene (Seam 2 & 3 — Red → Green)

- [ ] **Task 2.1: Add Web Worker Support & Lifecycle Cleanup (`DEFECT-43-06`)**
  - **Red**: In `passport-biometric-photo.component.spec.ts`, assert that high-DPI generation invokes worker/async pipeline without blocking and that `ngOnDestroy()` revokes all created object URLs and terminates any active worker.
  - **Green**: Create `src/app/tools/media/passport-biometric-photo/worker.ts` (with graceful main-thread fallback in environments without `OffscreenCanvas`) and wire termination in `PassportBiometricPhotoComponent.ngOnDestroy()`.

---

## Phase 3: Component UI State, Controls & Security Fixes (Seam 3 — Red → Green)

- [ ] **Task 3.1: Add Pan X / Pan Y Sliders & Canvas Pointer-Drag Handlers (`DEFECT-43-03`)**
  - **Red**: In `passport-biometric-photo.component.spec.ts`, write tests asserting that changing `panX` / `panY` sliders or dragging with `pointerdown` → `pointermove` → `pointerup` on `#previewCanvas` updates `panX()` and `panY()` signals and refreshes the preview canvas.
  - **Green**: Add Horizontal Pan (`panX`) and Vertical Pan (`panY`) range sliders in Card 2 and attach pointer drag listeners (`touch-action: none`) to `#previewCanvas` in `passport-biometric-photo.component.ts`.
- [ ] **Task 3.2: Add Single-Portrait Crop Guide vs. Print Sheet Preview Mode Toggle (`DEFECT-43-02`)**
  - **Red**: In `passport-biometric-photo.component.spec.ts`, assert that `.c-passport__biometric-overlay` is rendered over the single-photo crop preview with dynamic `[style.top.%]` bindings from `guidePercentages()` and is hidden when previewing the full multi-photo sheet grid.
  - **Green**: Add `previewMode = signal<'crop_guide' | 'print_sheet'>('crop_guide')` and toggle buttons in the preview card header in `passport-biometric-photo.component.ts`.

---

## Phase 4: Mobile Adaptation, Light/Dark Theme Contrast & BEM Styling (Seam 4)

- [ ] **Task 4.1: Standardize BEM Classes, `.l-columns__area`, `.l-extremo__area-*`, and `.c-input__*` (`DEFECT-43-05`)**
  - **Red**: In `passport-biometric-photo.component.spec.ts`, assert that `.l-columns__area`, `.l-extremo__area-izquierda`, `.l-extremo__area-derecha`, `.c-input__slider`, and `.c-input__switch` are used instead of `.l-columns__column`, `.c-range`, `.c-form-label`, and `.c-checkbox-label`.
  - **Green**: Update the template in `passport-biometric-photo.component.ts` so every grid column uses `.l-columns__area`, every `.l-extremo` row wraps its left/right children in `__area-izquierda` / `__area-derecha`, and all sliders/checkboxes use `.c-input__slider` / `.c-input__switch`.
- [ ] **Task 4.2: Replace Hardcoded Light-Mode Colors with CSS Variables & Fix 320px Overflow (`DEFECT-43-05`, `DEFECT-43-07`)**
  - Create `src/app/tools/media/passport-biometric-photo/passport-biometric-photo.component.scss` with BEM `.c-passport__*` classes.
  - Replace hardcoded `#f8fafc`, `#e2e8f0`, `#1e293b`, `#475569`, `#64748b` with `var(--color-bg-subtle)`, `var(--color-bg-surface)`, `var(--color-border-default)`, `var(--color-text-primary)`, and `var(--color-text-secondary)`.
  - Increase `.c-passport__biometric-tag` font size to `0.75rem` (`12px`) and ensure header/button containers wrap cleanly down to `320px`.

---

## Phase 5: Verification & Regression Gate

- [ ] Run unit tests: `npx vitest run src/app/tools/media/passport-biometric-photo/` (100% passing).
- [ ] Run production build: `npm run build` (0 errors, lazy chunk verified).
- [ ] Run headless Chrome layout & functional audit: `node $SCRATCH/audit.mjs passport-biometric-photo` and verify:
  - `consoleErrors: []`, `pageErrors: []`, `externalRequests: []`
  - `hasHorizontalScroll: false` at `1366px`, `390px`, and `320px`
  - `smallTouchTargetCount: 0` and `tinyText: []`
  - Valid `.jpg`, `.pdf`, and `.png` exports with visible portrait silhouette in preview.
