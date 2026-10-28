# Remediation Task List: HEIC & AVIF to JPG_PNG Batch Converter

> **Spec ID**: `74`  
> **Remediates Tool**: `44 - HEIC & AVIF to JPG_PNG Batch Converter` (`/tools/heic-avif-converter`)  
> **Rule**: Follow strict TDD (`Red → Green → Refactor`). Do not skip verification gates.

---

## Phase 1: Engine & Algorithmic Remediation (Seam 1 — Red → Green)

- [x] **Task 1.1: Implement HEIC/HEIF Container Detection & Client-Side Decoding (`DEFECT-44-01`)**
  - **Red**: In `src/app/tools/media/heic-avif-converter/engine.spec.ts`, add tests asserting `isHeicContainer()` detects ISO-BMFF `ftypheic`/`ftypmif1` headers and `.heic`/`.heif` files, and `convertSingleImage()` decodes `.heic` inputs to `status: 'done'` with a valid JPEG/PNG/WebP `Blob`.
  - **Green**: Implement `isHeicContainer()` and client-side HEIC decoding in `src/app/tools/media/heic-avif-converter/engine.ts` and update `test-fixtures.ts` with valid decodable sample buffers.
- [x] **Task 1.2: Fix Premature 400ms Blank-Canvas Timeout in `loadImageElement` (`DEFECT-44-02`)**
  - **Red**: In `engine.spec.ts`, test `loadImageElement()` with an image that resolves after 450ms and assert it returns the real image dimensions rather than a blank `800×600` fallback canvas.
  - **Green**: Restrict the synthetic fallback in `loadImageElement()` (`engine.ts`) strictly to non-browser test environments (`isJsdom`) or explicit synthetic test fixtures.
- [x] **Task 1.3: Close `ImageBitmap` Instances After Canvas Drawing (`DEFECT-44-03`)**
  - **Red**: In `engine.spec.ts`, mock `globalThis.createImageBitmap` returning an object with `close: vi.fn()` and assert `close()` is called once during `convertSingleImage()`.
  - **Green**: Wrap `ctx.drawImage(element, ...)` in `convertSingleImage()` (`engine.ts`) with a `finally` block that calls `element.close()` when `typeof (element as ImageBitmap).close === 'function'`.

---

## Phase 2: Web Worker Offloading & Memory Hygiene (Seam 2 & 3 — Red → Green)

- [x] **Task 2.1: Add Web Worker for Batch Conversion & Lifecycle Termination (`DEFECT-44-03`)**
  - **Red**: In `heic-avif-converter.component.spec.ts`, assert that batch conversion reports progress cleanly and `ngOnDestroy()` revokes all created object URLs and terminates any active worker.
  - **Green**: Create `src/app/tools/media/heic-avif-converter/worker.ts` (with `OffscreenCanvas` support and main-thread fallback) and wire cleanup in `HeicAvifConverterComponent.ngOnDestroy()`.

---

## Phase 3: Component UI State, Controls & Sample Loader (Seam 3 — Red → Green)

- [x] **Task 3.1: Add "Load Sample Batch" Button to Card 1 (`DEFECT-44-05`)**
  - **Red**: In `heic-avif-converter.component.spec.ts`, assert that clicking `loadSampleBatch()` populates `imageQueue()` with sample items ready for conversion.
  - **Green**: Add `loadSampleBatch()` method and a `"Load Sample Batch"` `.c-button--outline` button in `heic-avif-converter.component.ts`.

---

## Phase 4: Mobile Adaptation, Light/Dark Theme Contrast & BEM Styling (Seam 4)

- [x] **Task 4.1: Replace Non-Existent Layout & Form Classes (`DEFECT-44-04`)**
  - **Red**: In `heic-avif-converter.component.spec.ts`, assert that `.l-columns__area`, `.l-extremo__area-izquierda`, `.l-extremo__area-derecha`, `.c-input__slider`, `.c-input__control`, and `.c-input__switch` are present and `.l-columns__column`, `.l-extremo__left`, `.l-extremo__right`, `.c-range`, and `.c-checkbox-label` are absent.
  - **Green**: Update the template in `heic-avif-converter.component.ts` to use standard PrivKnife layout and input classes, with `font-size: 1rem` (`16px`) on text inputs.
- [x] **Task 4.2: Extract BEM Styles with CSS Custom Properties & Fix 320px Overflow (`DEFECT-44-04`, `DEFECT-44-05`)**
  - Create `src/app/tools/media/heic-avif-converter/heic-avif-converter.component.scss` using `.c-heic-converter__*` BEM classes and CSS variables (`var(--color-bg-subtle)`, `var(--color-bg-surface)`, `var(--color-border-default)`, `var(--color-text-primary)`, `var(--color-text-secondary)`).
  - Ensure header titles and button groups wrap cleanly down to `320px` with `min-width: 0`.

---

## Phase 5: Verification & Regression Gate

- [x] Run unit tests: `npx vitest run src/app/tools/media/heic-avif-converter/` (100% passing).
- [x] Run production build: `npm run build` (0 errors).
- [x] Run headless Chrome audit: `node $SCRATCH/audit.mjs heic-avif-converter` and verify:
  - `consoleErrors: []`, `pageErrors: []`, `externalRequests: []`
  - `hasHorizontalScroll: false` at `1366px`, `390px`, and `320px`
  - `smallTouchTargetCount: 0` and `inputsUnder16px_iOSZoom: 0`
  - Both `.avif` and `.heic` files convert to `Done` and export valid `.jpg`/`.png`/`.zip` files.
