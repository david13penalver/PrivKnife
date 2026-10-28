# Implementation Plan — Spec 76: Face & License Plate Privacy Blur Tool Remediation

> **Tool**: 46 (`face-plate-blur`)
> **Spec Reference**: [spec.md](file:///home/deivision/Projects/Programming/PrivKnife/specs/76%20-%20Remediation%20-%20Face%20&%20License%20Plate%20Privacy%20Blur%20Tool/spec.md)

---

## 1. Architecture & Impacted Files

| File Path | Action | Responsibility |
| :--- | :--- | :--- |
| [`src/app/tools/privacy/face-plate-blur/types.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/types.ts) | **Modify** | Extend `CensorRegion` with optional `points?: Array<{ x: number; y: number }>` and `brushRadiusPx?: number` for brush strokes; define worker request/response message interfaces. |
| [`src/app/tools/privacy/face-plate-blur/engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/engine.ts) | **Modify** | Fix `loadImageElement()` 300ms timeout (`DEFECT-46-02`), add pure buffer-level censoring (`censorImageBuffer`) supporting both rectangular boxes and brush strokes, add client-side auto-detection (`detectPrivacyRegions`), and add `createSampleCarSaleBlob()`. |
| [`src/app/tools/privacy/face-plate-blur/worker.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/worker.ts) | **Create** | Web Worker offloading pixel-buffer censoring (`mosaic_pixelation`, `gaussian_blur`, `solid_blackout`) and auto-detection with progress notifications (`DEFECT-46-04`). |
| [`src/app/tools/privacy/face-plate-blur/face-plate-blur.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/face-plate-blur.component.ts) | **Modify** | Replace static `<img>` with interactive `<canvas>` supporting pointer rectangle drawing, dragging/resizing, brush strokes, and editable region coordinate inputs (`DEFECT-46-01`); reset stale state and add sample loader (`DEFECT-46-03`); wire worker (`DEFECT-46-04`); fix `.c-input__slider`, `320px` overflow, and CSS variables (`DEFECT-46-05`). |
| [`src/app/tools/privacy/face-plate-blur/engine.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/engine.spec.ts) | **Modify** | Add unit tests for brush-stroke censoring, buffer-level pixel transforms, auto-detection, and non-premature image loading. |
| [`src/app/tools/privacy/face-plate-blur/face-plate-blur.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/face-plate-blur/face-plate-blur.component.spec.ts) | **Modify** | Add unit tests for interactive canvas pointer drawing, coordinate input updates, selection mode switching, state reset on new file upload, sample photo loading, and zero-network privacy assertions. |

---

## 2. Pre-Agreed Testing Seams

To ensure deterministic, fast unit tests in Vitest + JSDOM alongside headless Chrome verification:

1. **Buffer-First Censoring Seam (`censorImageBuffer`)**:
   - Decouple pixel transformations (`applyMosaicPixelation`, `applyGaussianBlur`, `applyBlackoutBox`, `applyBrushStrokeCensor`) to operate directly on `{ data: Uint8ClampedArray, width: number, height: number }` so both `engine.spec.ts` and `worker.ts` can test exact pixel mutations without requiring a browser `<canvas>` rasterizer.
2. **Environment-Gated Image Loader Seam (`loadImageElement`)**:
   - Check `isJsdomEnvironment()` (`typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)`). Only use the instant synthetic fallback in JSDOM; in real browsers, await `img.onload` / `img.onerror`.
3. **Canvas Pointer Coordinate Mapper Seam (`mapPointerToImageCoords`)**:
   - Expose a pure helper on the component/engine that converts client pointer coordinates `(clientX, clientY)` + canvas `DOMRect` + natural `(imageWidth, imageHeight)` into clamped image-space coordinates `(x, y)` so pointer drawing and dragging can be unit-tested deterministically in JSDOM.
4. **Auto-Detection Seam (`detectPrivacyRegions`)**:
   - Allow injecting a custom detector or running the deterministic pixel-buffer heuristic detector on synthetic test buffers containing skin-tone ovals (faces) and high-contrast horizontal rectangles (license plates).

---

## 3. TDD Vertical Slices

### Slice 1 — Fix `loadImageElement()` Timeout & Extract Pure Buffer Censoring (`DEFECT-46-02`)
- **Red**: Write unit test in `engine.spec.ts` verifying `censorImageBuffer()` mutates exact pixels for `mosaic_pixelation`, `gaussian_blur`, `solid_blackout`, and `brush_stroke` paths, and that `loadImageElement()` does not cut off browser image loading at 300ms.
- **Green**: Refactor `engine.ts` to gate the JSDOM fallback behind `isJsdomEnvironment()` and implement `censorImageBuffer()` + `applyBrushStrokeCensor()`.
- **Refactor**: Keep `applyPrivacyCensors()` as a high-level orchestrator that delegates pixel manipulation to `censorImageBuffer()`.

### Slice 2 — Client-Side Auto-Detection & Sample Image Generator (`DEFECT-46-01`, `DEFECT-46-03`)
- **Red**: Write unit test in `engine.spec.ts` asserting `detectPrivacyRegions()` identifies face and license-plate bounding boxes from a synthetic car-sale image buffer and `createSampleCarSaleBlob()` returns a valid PNG blob.
- **Green**: Implement `detectPrivacyRegions()` (using browser `FaceDetector` if available, falling back to connected-component skin-tone and plate aspect-ratio detection) and `createSampleCarSaleBlob()`.
- **Refactor**: Normalize detected bounding boxes within `[0..width, 0..height]`.

### Slice 3 — Interactive Canvas Drawing, Coordinate Editors & State Reset (`DEFECT-46-01`, `DEFECT-46-03`)
- **Red**: Write component tests in `face-plate-blur.component.spec.ts` verifying:
  - Switching `selectionMode` between `manual_rect`, `brush_stroke`, and `auto_detect_faces`.
  - Pointer down/move/up on the interactive canvas adds a new `CensorRegion` with accurately mapped coordinates.
  - Editing numeric `X`, `Y`, `W`, `H` inputs in `.c-region-item` updates the corresponding region and re-renders the canvas overlay.
  - Calling `handleFileSelected()` clears stale `previewUrl` and `lastResult`.
  - Clicking `"Load Sample Photo"` populates `originalImage` and sample regions.
- **Green**: Update `face-plate-blur.component.ts` template and logic with the interactive `<canvas>`, mode selector, brush radius slider, per-region coordinate inputs, state reset in `handleFileSelected()`, and `loadSamplePhoto()`.
- **Refactor**: Ensure `URL.revokeObjectURL()` is called whenever `previewUrl` or `originalUrl` is replaced.

### Slice 4 — Web Worker Integration & Responsive / Theme Polish (`DEFECT-46-04`, `DEFECT-46-05`)
- **Red**: Write tests verifying worker delegation with main-thread fallback, `.c-input__slider` class usage on all range inputs, and zero horizontal overflow at `320px`.
- **Green**: Create `worker.ts`, wire worker execution into `runCensoring()` and `runAutoDetection()` with `ngOnDestroy` termination, replace `.c-input__range` with `.c-input__slider`, fix button flex wrapping, and replace all hardcoded hex colors with `var(--color-*)` tokens.
- **Refactor**: Run full unit test suite and headless Chrome verification across `1366×900`, `390×844`, and `320×640`.
