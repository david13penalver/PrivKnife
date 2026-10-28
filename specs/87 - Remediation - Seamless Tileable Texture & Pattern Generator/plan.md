# Remediation Implementation Plan: Seamless Tileable Texture & Pattern Generator (Tool 57)

- **Target Tool**: `57` — `seamless-texture-generator`
- **Spec Reference**: [`specs/87 - Remediation - Seamless Tileable Texture & Pattern Generator/spec.md`](file:///home/deivision/Projects/Programming/PrivKnife/specs/87%20-%20Remediation%20-%20Seamless%20Tileable%20Texture%20&%20Pattern%20Generator/spec.md)

---

## 1. Impacted Files

| File Path | Action | Purpose |
| :--- | :--- | :--- |
| [`PrivKnife/src/app/tools/media/seamless-texture-generator/types.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/types.ts) | `MODIFY` | Add `diffusePixels` and `normalPixels` to `SeamlessTextureResult` and define Web Worker message types (`DEFECT-57-03`) |
| [`PrivKnife/src/app/tools/media/seamless-texture-generator/engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/engine.ts) | `MODIFY` | Fix `makeSeamlessTexture()` two-pass separable seam crossfade (`DEFECT-57-01`), implement pure-TS `pixelDataToPngBytes()` without `document.createElement('canvas')` (`DEFECT-57-03`), and support `outputResolutionPx` resampling (`DEFECT-57-04`) |
| [`PrivKnife/src/app/tools/media/seamless-texture-generator/worker.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/worker.ts) | `CREATE` | Dedicated Web Worker for off-main-thread texture synthesis, Sobel normal map generation, and PBR `.zip` packaging (`DEFECT-57-03`) |
| [`PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.ts) | `MODIFY` | Report corrupt file errors in `.c-alert--danger` and call `bitmap.close()` (`DEFECT-57-02`), eliminate duplicate `makeSeamlessTexture()`/`generateNormalMap()` calls in `renderCanvas()` (`DEFECT-57-03`), add `outputResolutionPx` control (`DEFECT-57-04`), and apply strict `.c-texture-gen__*` BEM + mobile responsive fixes (`DEFECT-57-05`) |
| [`PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.spec.ts) | `MODIFY` | Add comprehensive unit tests across all 4 testing seams |

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Pure Engine Unit Tests (`engine.ts`)
- Test `makeSeamlessTexture()` on a horizontal step-gradient image (`left edge = 0`, `right edge = 255`) verifies that pixels across `x = halfW` at `y = 0` (top row, outside the center box `distY >= overlapRadiusY`) and `y = height - 1` are smoothly blended (`|I(halfW) - I(halfW - 1)| < 30`) instead of having a `255` step jump (`DEFECT-57-01`).
- Test `makeSeamlessTexture()` on a vertical step-gradient image (`top edge = 0`, `bottom edge = 255`) verifies that pixels across `y = halfH` at `x = 0` (left column, outside the center box `distX >= overlapRadiusX`) are smoothly blended (`DEFECT-57-01`).
- Test `pixelDataToPngBytes()` produces a valid PNG signature (`0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A`) with valid `IHDR`, `IDAT`, and `IEND` chunks without touching `document` (`DEFECT-57-03`).
- Test `resamplePixelData()` / `processSeamlessTexture()` scales output dimensions to `config.outputResolutionPx` (`DEFECT-57-04`).

### Seam 2: Web Worker Message Contract Tests (`worker.ts`)
- Test the worker message handler processes `{ type: 'PROCESS_TEXTURE', source, config }` and posts `{ type: 'RESULT', result }` with `diffusePixels`, `normalPixels`, and `zipBlob` (`DEFECT-57-03`).

### Seam 3: Component State, Error Recovery & Resource Disposal (`seamless-texture-generator.component.ts`)
- Test `handleFileSelected()` with an invalid/corrupt file sets `errorMessage()` to a non-empty error string and renders `.c-alert--danger` instead of silently loading the sample brick texture (`DEFECT-57-02`).
- Test `handleFileSelected()` calls `bitmap.close()` after drawing a valid `ImageBitmap` (`DEFECT-57-02`).
- Test `renderCanvas()` reads `result().diffusePixels` and `result().normalPixels` directly without calling `makeSeamlessTexture()` or `generateNormalMap()` a second time (`DEFECT-57-03`).

### Seam 4: DOM, BEM, A11y & Security Verification
- Verify all custom classes follow `.c-texture-gen__*`, `.l-*`, or `.g--*` BEM naming with zero hardcoded `#e2e8f0` backgrounds (`DEFECT-57-05`).
- Verify zero network calls (`fetch` / `XMLHttpRequest`) during texture blending, normal map synthesis, and ZIP export.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: Full-Cross Two-Pass Separable Seam Blending & Pure-TS PNG Encoder (`DEFECT-57-01`, `DEFECT-57-03`, `DEFECT-57-04`)
- **RED**: Write unit tests in `seamless-texture-generator.component.spec.ts` asserting that:
  1. On a 64×64 image where column `0` is black (`0`) and column `63` is white (`255`), `makeSeamlessTexture(src, 25, 'linear')` eliminates the jump at `(x = 32, y = 0)` (`Math.abs(out(32, 0) - out(31, 0)) < 25`).
  2. On a 64×64 image where row `0` is black (`0`) and row `63` is white (`255`), `makeSeamlessTexture(src, 25, 'linear')` eliminates the jump at `(x = 0, y = 32)` (`Math.abs(out(0, 32) - out(0, 31)) < 25`).
  3. `processSeamlessTexture()` returns `diffusePixels` and `normalPixels` matching `config.outputResolutionPx` (`e.g., 128×128`) and encodes valid PNG bytes without calling `document.createElement`.
- **GREEN**:
  1. Rewrite `makeSeamlessTexture()` in `engine.ts` as a two-pass separable toroidal crossfade:
     - Pass 1 wraps X by `halfW` and blends within `distX < overlapRadiusX` using `alphaX = smoothWeight(1 - distX / overlapRadiusX, falloff)` between `sourcePixels(x, y)` (at `alphaX = 1` on the seam `x = halfW`) and `shiftedX(x, y)` (at `alphaX = 0` outside the seam band).
     - Pass 2 wraps Pass 1's output in Y by `halfH` and blends within `distY < overlapRadiusY` using `alphaY = smoothWeight(1 - distY / overlapRadiusY, falloff)` between `pass1(x, y)` (at `alphaY = 1` on the seam `y = halfH`) and `shiftedXY(x, y)` (at `alphaY = 0` outside the seam band).
  2. Implement `resamplePixelData(source: PixelData, targetSize: number): PixelData` and pure-TS `pixelDataToPngBytes(pixels: PixelData): Uint8Array` (CRC32 + Adler32 stored/deflated IDAT chunks) in `engine.ts`.
  3. Include `diffusePixels` and `normalPixels` on `SeamlessTextureResult`.
- **REFACTOR**: Extract `computeSeamAlpha(dist: number, radius: number, falloff: BlendFalloff): number` helper in `engine.ts`.

### Slice 2: Web Worker, Single-Pass Canvas Render & Error/Bitmap Handling (`DEFECT-57-02`, `DEFECT-57-03`, `DEFECT-57-04`)
- **RED**: Write component tests asserting that:
  1. Passing a corrupt file to `handleFileSelected()` sets `component.errorMessage()` and renders `.c-alert--danger`.
  2. When `createImageBitmap` resolves a mock bitmap with `close: vi.fn()`, `bitmap.close` is called once.
  3. Changing `outputResolutionPx` via `setOutputResolution(128)` updates `result().width` and `result().height` to `128`.
- **GREEN**:
  1. Create `worker.ts` to run `processSeamlessTexture()` off the main thread.
  2. Update `handleFileSelected()` in `seamless-texture-generator.component.ts` to call `bitmap.close()` in `finally` and set `this.errorMessage.set('Failed to decode image file. Please upload a valid PNG, JPG, or WebP texture.')` when decoding fails.
  3. Update `renderCanvas()` to read `res.diffusePixels` and `res.normalPixels` directly from `this.result()` instead of calling `makeSeamlessTexture()` and `generateNormalMap()` again.
  4. Add the **Output Resolution** `<select id="outputResolution">` control (`64 × 64 px`, `128 × 128 px`, `256 × 256 px`, `512 × 512 px`) in the configuration panel.
- **REFACTOR**: Ensure `ngOnDestroy` terminates any active worker and revokes object URLs.

### Slice 3: Responsive BEM Styling, Dark-Mode Tokens & Touch Target Sizing (`DEFECT-57-05`)
- **RED**: Write DOM tests asserting that all custom classes in `seamless-texture-generator.component.ts` use `.c-texture-gen__*`, `.l-*`, or `.g--*` BEM prefixes and that `#outputResolution` is rendered.
- **GREEN**:
  1. Replace `.tool-page`, `.stats-bar`, `.canvas-viewport`, `.code-box`, `.code-header`, and `.privacy-banner` with `.c-texture-gen__*` BEM classes and CSS custom properties (`var(--color-surface)`, `var(--color-border)`).
  2. Add `overflow-wrap: anywhere` to `.c-header__title`, add `flex-wrap: wrap; gap: 0.5rem` to `.c-card__header.l-extremo`, and ensure all range sliders, checkboxes, and buttons meet `44px` minimum touch target height.
- **REFACTOR**: Verify all tests pass and run headless Chrome layout checks at `1440px`, `390px`, and `320px`.
