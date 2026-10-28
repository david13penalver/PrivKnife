# TDD Remediation Plan: HEIC & AVIF to JPG_PNG Batch Converter

> **Spec ID**: `74`  
> **Tool**: `44 - HEIC & AVIF to JPG_PNG Batch Converter`  
> **Route**: `/tools/heic-avif-converter`  
> **Category**: `media`  
> **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/media/heic-avif-converter/
├── types.ts                                 # Add Worker request/response interfaces
├── test-fixtures.ts                         # Provide valid decodable sample AVIF/PNG/HEIC fixtures for UI & tests
├── engine.ts                                # Add isHeicContainer() & client-side HEIC decoding, close ImageBitmap, fix 400ms timeout
├── engine.spec.ts                           # Seam 1 tests for HEIC container detection/decoding, ImageBitmap.close(), and batch ZIP
├── worker.ts                                # Web Worker for off-main-thread batch image conversion & ZIP packaging (Directive 3)
├── heic-avif-converter.component.ts         # Add sample batch loader, worker integration, BEM .l-columns__area & .c-input__* classes
├── heic-avif-converter.component.scss       # Scoped BEM styles (.c-heic-converter__*) using CSS variables (--color-*)
└── heic-avif-converter.component.spec.ts    # Seam 3 & 4 tests for sample batch, BEM classes, and worker/URL cleanup
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Export Correctness Boundary (`engine.ts` / `engine.spec.ts`)
- **Public Functions Under Test**:
  - `isHeicContainer(source: File | Blob | Uint8Array): Promise<boolean>`
  - `convertSingleImage(file: File | Blob, options: HeicAvifConverterOptions, id?: string): Promise<ConvertedImageItem>`
  - `processBatch(files: (File | Blob)[], options: HeicAvifConverterOptions, onProgress?: ...): Promise<HeicAvifConverterResult>`
- **Concrete Assertions**:
  - `isHeicContainer()` returns `true` for ISO-BMFF buffers containing `ftypheic`, `ftypmif1`, `ftypheix`, or `.heic`/`.heif` filenames, and `false` for PNG/JPEG/AVIF.
  - `convertSingleImage()` on a `.heic` / `.heif` input decodes to `status: 'done'` with a valid non-empty `convertedBlob` (`image/jpeg`, `image/png`, or `image/webp`) rather than failing with `'Failed to decode image data'`.
  - When `createImageBitmap` returns an `ImageBitmap` with a `.close()` method, `convertSingleImage()` calls `bmp.close()` exactly once after drawing to canvas.

### Seam 2: Web Worker & Main-Thread Protection Boundary (`worker.ts` / `heic-avif-converter.component.ts`)
- **Protocol**:
  - Request: `{ type: 'CONVERT_SINGLE', id: string, file: File | Blob, options: HeicAvifConverterOptions }`
  - Response: `{ type: 'ITEM_DONE', item: ConvertedImageItem }`
- **Concrete Assertions**:
  - Active Web Worker is terminated on `ngOnDestroy()`.

### Seam 3: Component State, Controls, Sanitization & Resource Disposal Boundary (`heic-avif-converter.component.ts` / `heic-avif-converter.component.spec.ts`)
- **Concrete Assertions**:
  - Clicking `"Load Sample Batch"` populates `imageQueue()` with sample items that convert to `status: 'done'`.
  - `clearQueue()` and `ngOnDestroy()` revoke all created object URLs via `URL.revokeObjectURL()`.

### Seam 4: Mobile Responsive & Theme Styling Boundary (`heic-avif-converter.component.scss`)
- **Concrete Assertions**:
  - Template uses `.l-columns__area`, `.l-extremo__area-izquierda`, `.l-extremo__area-derecha`, `.c-input__slider`, `.c-input__control`, and `.c-input__switch`.
  - `scrollWidth <= clientWidth` at `1366px`, `390px`, and `320px`, with `smallTouchTargetCount: 0` and `inputsUnder16px_iOSZoom: 0`.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: HEIC Container Detection, Decoding & `ImageBitmap.close()` Disposal (Seam 1)
- **Red**: In `engine.spec.ts`, write tests asserting:
  1. `isHeicContainer()` identifies ISO-BMFF `ftypheic` / `ftypmif1` headers and `.heic`/`.heif` files.
  2. `convertSingleImage(SAMPLE_HEIC_FILE, DEFAULT_CONVERTER_OPTIONS)` succeeds with `status: 'done'` and a valid `convertedBlob` in browser runtimes.
  3. Spying on `ImageBitmap.prototype.close` (or mock bitmap returned by `createImageBitmap`) verifies `.close()` is called once per converted image.
- **Green**: Implement `isHeicContainer()` and HEIC decoding in `engine.ts`, add `try / finally { element.close?.() }` in `convertSingleImage()`, and remove the premature 400ms blank-canvas timeout on real browser images.
- **Refactor**: Keep decoding helpers modular and pure.

### Slice 2: Web Worker Batch Execution & Sample Batch Loader (Seam 2 & Seam 3)
- **Red**: In `heic-avif-converter.component.spec.ts`, write a test asserting that `loadSampleBatch()` adds sample files to `imageQueue()` and `startBatchConversion()` converts all items while updating `conversionProgress()` to `100`.
- **Green**: Create `worker.ts` and add `loadSampleBatch()` + button in `heic-avif-converter.component.ts`.
- **Refactor**: Ensure worker termination in `ngOnDestroy()`.

### Slice 3: BEM Layout, Form Control Standardization, Theme Variables & 320px Responsiveness (Seam 4)
- **Red**: In `heic-avif-converter.component.spec.ts`, assert that `.l-columns__column`, `.l-extremo__left`, `.l-extremo__right`, `.c-range`, and `.c-checkbox-label` are absent from the template and replaced by `.l-columns__area`, `.l-extremo__area-izquierda`, `.l-extremo__area-derecha`, `.c-input__slider`, `.c-input__control`, and `.c-input__switch`.
- **Green**: Update template classes in `heic-avif-converter.component.ts` and extract dark-mode-ready styles to `heic-avif-converter.component.scss` using CSS custom properties (`var(--color-*)`).
- **Refactor**: Verify 0 overflow and 0 small touch targets at `320px` and `390px`.
