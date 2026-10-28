# Spec 76 — Remediation: Face & License Plate Privacy Blur Tool

> **Tool Number**: 46
> **Tool Slug**: `face-plate-blur`
> **Category**: `privacy`
> **Route**: `/tools/face-plate-blur`
> **Original Spec**: [specs/46 - Face & License Plate Privacy Blur Tool/spec.md](file:///home/deivision/Projects/Programming/PrivKnife/specs/46%20-%20Face%20&%20License%20Plate%20Privacy%20Blur%20Tool/spec.md)
> **Audit Reference**: [tools_31_60_audit.md — Tool 46](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-46)
> **Remediation Priority**: `High`
> **Overall Audit Status**: `⚠️ Partial` (Functional: `⚠️ Partial` | Mobile: `⚠️ Minor issues`)

---

## 1. Executive Summary & Audit Baseline

### 1.1 Current State & What Works
The **Face & License Plate Privacy Blur Tool** (`face-plate-blur`) executes 100% client-side with zero network calls (`networkRequests: []`). In headless Chrome end-to-end verification, uploading a `400×350` synthetic car-sale photo (`car-sale-test.png`) and clicking `+ Add Face Box` (`mosaic_pixelation`) and `+ Add License Plate Box` (`solid_blackout`), then running `Apply Privacy Censors`, produced valid EXIF-stripped JPEG (`car-sale-sanitized.jpg`, `4,268 B`) and PNG (`car-sale-sanitized.png`, `17,567 B`) downloads. Pixel-level verification confirmed the license plate region at `(200, 280)` was rendered as solid black `[0, 0, 0, 255]` and the face region at `(150, 120)` was mosaic-averaged to `[226, 161, 161, 255]`. `cleanUpUrls()` properly revokes created object URLs via `URL.revokeObjectURL()`.

### 1.2 Why Remediation Is Required
Despite functional canvas censoring algorithms in [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/engine.ts), the tool fails its core interactive usability requirement:
1. **No Interactive Canvas Drawing or Coordinate Editing (`DEFECT-46-01`, High)**: Users cannot draw, drag, resize, or even type custom coordinates for censor regions. The preview is a static `<img>` tag (`face-plate-blur.component.ts#L269-L281`) with zero pointer interaction, and the only way to add regions is via two buttons (`+ Add Face Box` and `+ Add License Plate Box`) that hardcode fixed coordinates (`{ x: 120, y: 80, width: 140, height: 160 }` and `{ x: 100, y: 250, width: 200, height: 70 }`). Furthermore, `selectionMode` (`'manual_rect' | 'brush_stroke' | 'auto_detect_faces'`) and `brushRadiusPx` signals (`#L414-L415`) are dead code.
2. **Premature 300ms Image Load Timeout (`DEFECT-46-02`, Medium)**: `loadImageElement()` (`engine.ts#L85-L90`) resolves with an unloaded `800×600` `HTMLImageElement` after `300ms`, silently producing blank exports on high-resolution photos that take >300ms to decode.
3. **Stale Censored Preview on Re-Upload & Missing Sample Photo (`DEFECT-46-03`, Medium)**: `handleFileSelected()` (`face-plate-blur.component.ts#L495-L505`) updates `originalImage` without clearing `previewUrl` or `lastResult`, and there is no `"Load Sample Photo"` button for quick testing.
4. **Main-Thread Image Censoring Without Web Worker (`DEFECT-46-04`, Medium)**: Full-resolution mosaic, Gaussian blur, and blackout processing run synchronously on the Angular main thread (`Directive 3`).
5. **Mobile Overflow at 320px, Non-Existent `.c-input__range`, and Hardcoded Light-Mode Colors (`DEFECT-46-05`, Low)**: At `320×640`, `scrollWidth` is `333px` (`hasHorizontalScroll: true`), range inputs use `.c-input__range` (`16px` tall) instead of `.c-input__slider`, `.g--margin-left-2` misaligns wrapped buttons at `320px`, and styles hardcode light-mode hex values (`#fff`, `#e2e8f0`, `#f8fafc`, `#065f46`, `#64748b`).

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-46-01` — Static `<img>` Preview with Hardcoded Censor Box Coordinates & Dead Selection Mode Signals
- **Severity**: `High`
- **Category**: `Spec Conformance` / `Interactive Controls`
- **Location**:
  - [`face-plate-blur.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/face-plate-blur.component.ts#L148-L203)
  - [`face-plate-blur.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/face-plate-blur.component.ts#L265-L283)
  - [`face-plate-blur.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/face-plate-blur.component.ts#L414-L485)
  - [`types.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/types.ts#L1-L40)
- **Audit Evidence**:
  - Clicking `+ Add Face Box` always inserts `{ x: 120, y: 80, width: 140, height: 160 }` (`addPresetFaceRegion()` at `#L441-L453`), and clicking `+ Add License Plate Box` always inserts `{ x: 100, y: 250, width: 200, height: 70 }` (`addPresetPlateRegion()` at `#L455-L467`).
  - The `.c-region-item` list (`#L166-L195`) displays `({{ region.x }}, {{ region.y }} - {{ region.width }}×{{ region.height }}px)` as read-only text with no editable inputs.
  - The preview container (`#L265-L283`) renders `<img [src]="previewUrl() || originalUrl()">` with no `<canvas>` overlay or pointer handlers (`pointerdown`, `pointermove`, `pointerup`).
  - `selectionMode = signal<SelectionMode>('manual_rect')` (`#L414`) and `brushRadiusPx = signal<number>(20)` (`#L415`) are declared on the component class and in `types.ts` (`'manual_rect' | 'brush_stroke' | 'auto_detect_faces'`), but are never referenced in the template or `engine.ts`.
- **Root Cause**: The MVP implementation scaffolded the preset region buttons and read-only list without implementing the interactive `<canvas>` bounding-box/brush overlay, numeric coordinate editors, or client-side face/plate detection.
- **Required Fix**:
  1. Replace the static `<img>` preview with an interactive `<canvas>` stage that renders the source or censored image along with interactive region overlays (dashed bounding boxes with corner resize handles and label badges).
  2. Wire `selectionMode()` UI tabs (`Manual Rectangle`, `Brush Stroke`, `Auto-Detect Faces & Plates`) and `brushRadiusPx()` slider:
     - In `manual_rect` mode, pointer drag on the canvas draws a new `CensorRegion` (`x`, `y`, `width`, `height` mapped to natural image coordinates), and dragging existing regions or their handles moves/resizes them.
     - In `brush_stroke` mode, pointer drag paints brush path points (`points: Array<{ x: number; y: number }>`, `brushRadiusPx`) censored by `engine.ts`.
     - In `auto_detect_faces` mode, invoke browser `FaceDetector` API when available with a deterministic client-side skin-tone / high-contrast plate aspect-ratio heuristic fallback in [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/engine.ts) so automated detection works offline across all browsers.
  3. Add editable numeric `X`, `Y`, `W`, `H` inputs and per-region `CensorEffect` selector inside `.c-region-item` for keyboard/screen-reader accessibility and pixel-exact adjustment.

---

### `DEFECT-46-02` — Premature 300ms Timeout in `loadImageElement()` Produces Blank Output on Large Photos
- **Severity**: `Medium`
- **Category**: `Engine Logic`
- **Location**:
  - [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/engine.ts#L69-L97)
- **Audit Evidence**:
  - Lines 85–90 of `engine.ts` register:
    ```ts
    setTimeout(() => {
      URL.revokeObjectURL(url);
      img.width = 800;
      img.height = 600;
      resolve(img);
    }, 300);
    ```
  - If a 12MP smartphone photo takes >300ms to decode, `loadImageElement()` revokes the blob URL and resolves an incomplete `HTMLImageElement` with forced `800×600` dimensions, causing `ctx.drawImage(img, ...)` to draw nothing and exporting a blank canvas.
- **Root Cause**: A 300ms timeout was added so JSDOM unit tests (where `img.onload` does not fire automatically) would resolve, without gating it behind an environment check.
- **Required Fix**:
  - Detect JSDOM/test environments explicitly (`typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)`) before using the synthetic fallback, and in real browsers wait for `img.onload` / `img.onerror` (or use `createImageBitmap(blob)` where supported) with a generous 15-second timeout that rejects with a descriptive error rather than silently returning an empty image.

---

### `DEFECT-46-03` — Stale `previewUrl` / `lastResult` on New File Selection & Missing Sample Photo Loader
- **Severity**: `Medium`
- **Category**: `Component State`
- **Location**:
  - [`face-plate-blur.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/face-plate-blur.component.ts#L495-L505)
- **Audit Evidence**:
  - `handleFileSelected(files: File[])` (`#L495-L505`) sets `this.originalImage.set(file)` and `this.originalUrl.set(url)`, but does not clear `this.previewUrl.set(null)` or `this.lastResult.set(null)` or revoke the previous `previewUrl`. Because the preview binds `[src]="previewUrl() || originalUrl()"` (`#L270`), uploading a second image continues displaying the first image's censored result and downloading the old file until `Apply Privacy Censors` is clicked again.
  - No `"Load Sample Photo"` button is provided in the input header.
- **Root Cause**: Incomplete state reset inside `handleFileSelected()`.
- **Required Fix**:
  - Reset `previewUrl.set(null)`, `lastResult.set(null)`, `regions.set([])`, and `errorMessage.set(null)` (revoking previous blob URLs) inside `handleFileSelected()`.
  - Add a `"Load Sample Photo"` button (`<app-button variant="outline" size="small">`) that generates a deterministic client-side sample image containing a stylized face and license plate with pre-populated regions.

---

### `DEFECT-46-04` — Synchronous Main-Thread Censoring Without Web Worker (`Directive 3`)
- **Severity**: `Medium`
- **Category**: `Web Worker & Performance`
- **Location**:
  - [`face-plate-blur.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/face-plate-blur.component.ts#L521-L561)
  - [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/engine.ts#L257-L308)
- **Audit Evidence**:
  - `applyPrivacyCensors()` runs nested pixel loops (`applyMosaicPixelation`, `applyGaussianBlur`, `applyBlackoutBox`) over `ImageData` on the Angular UI thread. No `worker.ts` exists in `src/app/tools/privacy/face-plate-blur/`.
- **Root Cause**: Pixel-buffer manipulation (`applyCensorRegionsToImageData`) is tightly coupled with DOM `<canvas>` creation inside `engine.ts`.
- **Required Fix**:
  - Extract pure `ImageData` / `Uint8ClampedArray` pixel-processing and auto-detection functions in `engine.ts` (`censorImageBuffer`, `detectPrivacyRegionsInBuffer`), and create [`worker.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/worker.ts) using `OffscreenCanvas` / pixel-buffer transfer with progress reporting and clean worker termination in `ngOnDestroy`.

---

### `DEFECT-46-05` — 320px Horizontal Overflow, Non-Existent `.c-input__range`, Button Margin Wrap Glitch, and Hardcoded Light-Mode Colors
- **Severity**: `Low`
- **Category**: `Mobile & Responsive Layout` / `Theme Contrast` / `BEM & Form Accessibility`
- **Location**:
  - [`face-plate-blur.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/face-plate-blur.component.ts#L119-L137)
  - [`face-plate-blur.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/face-plate-blur.component.ts#L156-L163)
  - [`face-plate-blur.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/face-plate-blur.component.ts#L325-L407)
- **Audit Evidence**:
  - At `320×640`, `document.documentElement.scrollWidth` is `333px` (`clientWidth: 320px`, `hasHorizontalScroll: true`).
  - Range inputs (`#pixelSizeRange`, `#blurRadiusRange`, `#jpegQualityRange`) use `class="c-input__range"`, which does not exist in `_c-input.scss`, resulting in a `16px`-tall touch target (`574×16` desktop, `316×16` at 390px, `246×16` at 320px) instead of `.c-input__slider`.
  - `+ Add License Plate Box` (`#L160`) uses `class="g--margin-left-2"`, causing a `8px` left indentation when wrapped onto a second line at `320px`.
  - Component styles (`#L325-L407`) hardcode light-mode colors (`#fff`, `#e2e8f0`, `#f8fafc`, `#065f46`, `#64748b`).
- **Root Cause**: Custom inline component styles bypassed `_c-input.scss` classes and CSS custom properties.
- **Required Fix**:
  - Replace `.c-input__range` with `.c-input__slider`.
  - Replace `.g--margin-left-2` on the preset buttons with a flex container using `gap: 0.5rem; flex-wrap: wrap`.
  - Add `overflow-wrap: anywhere` / responsive sizing to prevent `320px` overflow.
  - Replace all hardcoded hex colors with `var(--color-surface)`, `var(--color-surface-alt)`, `var(--color-border)`, `var(--color-text)`, `var(--color-text-muted)`, and `var(--color-success)`.

---

## 3. Target Acceptance Criteria

1. **Interactive Canvas Drawing & Region Editing (`DEFECT-46-01`)**:
   - Users can draw rectangular censor regions (`manual_rect`) and freehand brush paths (`brush_stroke`, controlled by `brushRadiusPx`) directly on the interactive `<canvas>` preview, drag/resize existing regions, auto-detect face/plate regions (`auto_detect_faces`), and edit each region's `X`, `Y`, `W`, `H` coordinates and `CensorEffect` via numeric/select inputs.
2. **Reliable Large-Image Decoding (`DEFECT-46-02`)**:
   - `loadImageElement()` awaits real browser image decoding without a 300ms cutoff, while keeping deterministic synthetic decoding strictly for JSDOM unit tests.
3. **Clean State Reset & Sample Loader (`DEFECT-46-03`)**:
   - Selecting a new image clears and revokes any previous `previewUrl` and `lastResult`, and clicking `"Load Sample Photo"` loads a built-in test image with sample face and license plate regions.
4. **Web Worker Offloading (`DEFECT-46-04`)**:
   - Pixel-buffer censoring and heuristic region detection execute inside `worker.ts` with deterministic progress callbacks and graceful fallback, and the worker is terminated on destroy.
5. **Responsive Layout, Standard BEM Sliders & Dark-Mode Tokens (`DEFECT-46-05`)**:
   - Zero horizontal scroll (`scrollWidth <= clientWidth`) at `1366×900`, `390×844`, and `320×640`; all sliders use `.c-input__slider`; all component styles use `var(--color-*)` tokens.
6. **Zero Network Exfiltration (`Directive 1 & 2`)**:
   - Zero external network requests (`connect-src 'self' blob: data:`) during all image loading, auto-detection, censoring, and export flows.
