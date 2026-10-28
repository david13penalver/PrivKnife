# Remediation Specification: HEIC & AVIF to JPG_PNG Batch Converter

> **Spec ID**: `74`  
> **Remediates Tool**: `44 - HEIC & AVIF to JPG_PNG Batch Converter`  
> **Slug**: `heic-avif-converter`  
> **Category**: `media`  
> **Route**: `/tools/heic-avif-converter`  
> **Audit Reference**: [`tools_31_60_audit.md#tool-44`](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-44)  
> **Current Audit Verdict**: Functional: `⚠️ Partial` | Mobile: `⚠️ Minor issues` | Overall: `⚠️`  
> **Status**: `Ready for Implementation`  
> **Priority**: `High`

---

## 1. Executive Summary & Audit Baseline

The headless-Chrome audit of **Tool 44 — HEIC & AVIF to JPG/PNG Batch Converter** (`/tools/heic-avif-converter`) across Desktop (`1366×900`), Mobile (`390×844`), and Small Mobile (`320×640`) established the following baseline:

- **What Currently Works**:
  - Batch queuing, proportional resolution downscaling (`3840px`, `1920px`, `1280px`, `800px`, `Original`), quality slider (`20%–100%`), filename suffixing (`-converted`), single-item download, and multi-file `JSZip` archive download (`converted-photos-jpeg-YYYY-MM-DD.zip`) work cleanly for browser-native formats (**AVIF**, **WebP**, **PNG**, **JPEG**).
  - Real `1200×900` AVIF (`photo-landscape.avif`, 5,543 B) and PNG (`1.0 MB`) converted to `800×600` JPEG (`23,369 B`, `ff d8 ff e0`) and packaged into a valid `.zip` (`43,636 B`, `50 4b 03 04`) with 0 network calls and 0 console errors.
- **What Fails or Is Incomplete**:
  1. **No Client-Side HEIC / HEIF Decoder Implemented**: Despite the tool's primary value proposition ("Convert Apple HEIC/HEIF photos... Supports Apple Live Photos, burst shots, high-efficiency iPhone HEIC"), `engine.ts` does **not** use `heic2any` or `libheif-js` WASM. It calls only `createImageBitmap(source)` and `new Image()`, which lack HEIC/HEIF support in Chrome, Firefox, and Edge on Windows, Linux, and Android. Any `.heic` or `.heif` file uploaded on non-Safari browsers fails with `Error: Failed to decode image data`.
  2. **400ms Blank-Canvas Timeout Fallback in `loadImageElement`**: If `HTMLImageElement` takes longer than `400ms` to decode a large photo, `loadImageElement()` (`engine.ts:161-167`) silently resolves with an empty `800×600` blank canvas, exporting blank white/transparent images instead of waiting for `onload`.
  3. **Missing Web Worker & Unclosed `ImageBitmap` Memory Leak**: Batch conversion of up to 100 images and `JSZip` compression run on the main UI thread (violating Directive 3), and `ImageBitmap` instances created via `createImageBitmap()` (`engine.ts:150`) are never `.close()`d after `ctx.drawImage()` (violating Directive 4).
  4. **Mobile Overflow (`359px` at `320px`), Misapplied Form Classes & Concatenated Labels**: Using `.l-columns__column` instead of `.l-columns__area` causes horizontal overflow (`scrollWidth: 359px`) at `320px`. Non-existent `.l-extremo__left` / `.l-extremo__right`, `.c-range` (`129×16px`), `.c-checkbox-label` (`13×13px`), and `<input type="text" class="c-input">` (`28px` height instead of `.c-input__control`'s `38px`) cause undersized touch targets and concatenated `Compression Quality92%` text.
  5. **Hardcoded Light-Mode Colors & Missing Sample Batch Trigger**: Component styles use unprefixed classes with hardcoded light-mode hex colors (`#f8fafc`, `#e2e8f0`, `#1e293b`), and no UI button is provided to load sample AVIF/HEIC test images.

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-44-01` — Missing `heic2any` / `libheif` WASM Decoder for `.heic` and `.heif` Files
- **Severity**: `High`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/heic-avif-converter/engine.ts#L133-L183)
- **Symptom & Evidence**: Uploading `iphone-photo.heic` in Chrome marks the queue item as `Error` with `errorMessage: "Failed to decode image data"`.
- **Root Cause**: `loadImageElement()` only attempts `createImageBitmap(source)` and `<img src="blob:...">`. Chromium, Firefox, and Edge do not natively decode ISO-BMFF `ftypheic` / `ftypmif1` HEIC/HEIF containers.
- **Remediation Specification**:
  - Add client-side HEIC/HEIF detection (`isHeicContainer(source)` checking file extension `.heic`/`.heif`, MIME type `image/heic`/`image/heif`, or ISO-BMFF `ftyp` box brands `heic`, `heix`, `hevc`, `mif1`, `msf1` at bytes `4..12`).
  - When a HEIC/HEIF file is detected and native `createImageBitmap` fails, decode the HEIC payload using dynamic client-side `heic2any` / `libheif-js` WASM (or a built-in ISO-BMFF HEIF/embedded preview/grid decoder fallback) into a `Blob` / `ImageData` before drawing to the target canvas.

### `DEFECT-44-02` — `loadImageElement` 400ms Timeout Silently Resolves with a Blank 800×600 Canvas
- **Severity**: `Medium`
- **Category**: `Engine Logic`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/heic-avif-converter/engine.ts#L161-L167)
- **Symptom & Evidence**: In `loadImageElement()`, `setTimeout(..., 400)` resolves with a newly created blank `800×600` `<canvas>` if `img.onload` has not fired within 400ms. High-resolution camera photos (> 12 MP) taking > 400ms to decode are silently replaced with blank white/transparent `800×600` images.
- **Root Cause**: A short 400ms timeout intended for mock `File` objects in unit tests runs unconditionally in production browser environments.
- **Remediation Specification**:
  - Restrict the synthetic blank-canvas fallback strictly to non-browser / test environments or synthetic test fixtures, and in real browser execution await `img.onload` / `img.onerror` with a generous timeout (`15000ms`) that rejects with a descriptive error rather than silently outputting a blank image.

### `DEFECT-44-03` — Missing Web Worker & Unclosed `ImageBitmap` Memory Leak (Directives 3 & 4)
- **Severity**: `Medium`
- **Category**: `Web Worker & Performance` / `Memory Hygiene`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/heic-avif-converter/engine.ts#L148-L155), [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/heic-avif-converter/engine.ts#L223-L247), [`heic-avif-converter.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/heic-avif-converter/heic-avif-converter.component.ts#L537-L568)
- **Symptom & Evidence**:
  1. `createImageBitmap(source)` returns an `ImageBitmap` held in `element`, which is drawn to `canvas` at line 240, but `element.close()` is never called—leaking uncompressed GPU/RAM textures across 100-image batches.
  2. All batch image decoding, canvas encoding, and `JSZip` DEFLATE compression execute on the Angular main thread.
- **Root Cause**: Missing `if ('close' in element && typeof element.close === 'function') element.close()` in `convertSingleImage()`, and absence of `worker.ts`.
- **Remediation Specification**:
  - Always call `element.close()` inside a `finally` block in `convertSingleImage()` immediately after `ctx.drawImage()`.
  - Create `worker.ts` (using `OffscreenCanvas` + `createImageBitmap` inside the worker when supported, with automatic fallback to `engine.ts` in environments without `OffscreenCanvas`) and terminate the worker in `ngOnDestroy()`.

### `DEFECT-44-04` — 320px Horizontal Overflow (`359px`), Unstyled Controls & Concatenated Labels
- **Severity**: `Medium`
- **Category**: `Mobile & Responsive Layout` / `BEM & Form Accessibility`
- **Location**: [`heic-avif-converter.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/heic-avif-converter/heic-avif-converter.component.ts#L46-L277)
- **Symptom & Evidence**:
  - At `320px` viewport (`small.png`), `scrollWidth` is `359px` (`hasHorizontalScroll: true`).
  - `smallTouchTargets` flags `range 129x16`, `input[text] 246x28`, and `input[on] 13x13`.
  - `Compression Quality` and `92%` are concatenated (`Compression Quality92%`), and `Convert All (0)` and `Clear Queue` touch with no space between them.
- **Root Cause**:
  - Uses `.l-columns__column` instead of `.l-columns__area` (`min-width: 0` missing).
  - Uses non-existent `.l-extremo__left` / `.l-extremo__right` (or no area classes at all) inside `.l-extremo` instead of `.l-extremo__area-izquierda` / `.l-extremo__area-derecha`.
  - Uses `<input type="range" class="c-range">`, `<input type="text" class="c-input">`, and `<label class="c-checkbox-label">` instead of `.c-input__slider`, `.c-input__control`, and `.c-input__switch`.
- **Remediation Specification**:
  - Replace `.l-columns__column` with `.l-columns__area`.
  - Replace `.l-extremo__left` / `.l-extremo__right` with `.l-extremo__area-izquierda` / `.l-extremo__area-derecha`, and wrap the quality label and percentage value in `.l-extremo__area-izquierda` and `.l-extremo__area-derecha`.
  - Use `.c-input__slider` on the quality range input, `.c-input__control` (with `font-size: 1rem` / `16px` to prevent iOS zoom and `min-height: 38px`) on the filename suffix input, and `.c-input__switch` on the ZIP packaging toggle.

### `DEFECT-44-05` — Hardcoded Light-Mode Hex Colors, Unprefixed Classes & Missing Sample Batch Button
- **Severity**: `Low`
- **Category**: `Theme Contrast` / `Spec Conformance`
- **Location**: [`heic-avif-converter.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/heic-avif-converter/heic-avif-converter.component.ts#L343-L433)
- **Symptom & Evidence**: Inline styles define unprefixed classes (`.stat-card`, `.queue-list-container`, `.queue-item`, `.item-name`) with hardcoded light-mode hex colors (`#f8fafc`, `#e2e8f0`, `#1e293b`, `#64748b`, `#f1f5f9`), breaking dark mode contrast. Additionally, users without an iPhone `.heic` or `.avif` file handy have no "Load Sample Batch" button to test the converter immediately.
- **Root Cause**: Raw hex literals used instead of CSS custom properties (`var(--color-*)`), and `SAMPLE_BATCH_FILES` in `test-fixtures.ts` is not wired to a UI button.
- **Remediation Specification**:
  - Move styles to `heic-avif-converter.component.scss` with BEM `.c-heic-converter__*` classes and CSS custom properties (`var(--color-bg-subtle)`, `var(--color-bg-surface)`, `var(--color-border-default)`, `var(--color-text-primary)`, `var(--color-text-secondary)`).
  - Add a `"Load Sample Batch (AVIF + HEIC)"` button in Card 1 that populates the queue with valid synthetic AVIF/HEIC sample images.

---

## 3. Target Acceptance Criteria

### 3.1 Functional & Spec Conformance
- [ ] Uploading `.heic`, `.heif`, `.avif`, `.webp`, `.png`, or `.jpg` files converts them cleanly into target `.jpg`, `.png`, or `.webp` formats with accurate downscaling and filename suffixes.
- [ ] Clicking `"Load Sample Batch"` queues valid sample images that convert and download as individual files or a `.zip` archive.
- [ ] `loadImageElement()` does not replace slow-loading browser images with a blank `800×600` canvas after 400ms.

### 3.2 Mobile & Responsive Layout & Theme Contrast
- [ ] `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at `1366px`, `390px`, and `320px` (`hasHorizontalScroll: false`).
- [ ] All form controls (`.c-input__slider`, `.c-input__control`, `.c-input__switch`, buttons) have touch targets `>= 32px` (`smallTouchTargetCount: 0`) and text inputs have `font-size >= 16px` (`inputsUnder16px_iOSZoom: 0`).
- [ ] All `.l-extremo` rows use `.l-extremo__area-izquierda` and `.l-extremo__area-derecha`.
- [ ] Dark and Light themes render with proper contrast using CSS variables (`var(--color-*)`).

### 3.3 `AGENTS.md` Prime Directives
- [ ] **Directive 1 & 2**: 0 external network requests during HEIC/AVIF decoding and ZIP packaging.
- [ ] **Directive 3**: Batch conversion offloads heavy work via `worker.ts` (with fallback) and updates deterministic progress (`0..100%`).
- [ ] **Directive 4**: Every `ImageBitmap` is `.close()`d immediately after canvas drawing, every `ObjectURL` is revoked on `clearQueue()` and `ngOnDestroy()`, and any active worker is terminated in `ngOnDestroy()`.
