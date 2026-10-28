# Remediation Specification: Seamless Tileable Texture & Pattern Generator (Tool 57)

- **Target Tool**: `57` — `seamless-texture-generator` (Seamless Tileable Texture & Pattern Generator)
- **Category**: `media`
- **Original Spec**: [`specs/57 - Seamless Tileable Texture & Pattern Generator/spec.md`](file:///home/deivision/Projects/Programming/PrivKnife/specs/57%20-%20Seamless%20Tileable%20Texture%20&%20Pattern%20Generator/spec.md)
- **Audit Report**: [`tools_31_60_audit.md` §57](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md)
- **Source Directory**: [`PrivKnife/src/app/tools/media/seamless-texture-generator/`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/)
- **Remediation Priority**: `High`

---

## 1. Executive Summary & Audit Baseline

- **Audit Verdict**: Functional `✅ Works` | Mobile `⚠️ Minor issues` | Overall `⚠️`
- **Desktop / Mobile / Small Screenshots**:
  - `desktop.png`, `mobile.png`, `mobile-small.png` (`$SCRATCH/shots/seamless-texture-generator/`)
  - `functional-grid-blend.png`, `functional-normal-map.png` (`$SCRATCH/shots/seamless-texture-generator/`)
- **Defect Summary Table**:

| Defect ID | Severity | Category | Summary |
| :--- | :--- | :--- | :--- |
| `DEFECT-57-01` | `High` | `Engine Logic` | `makeSeamlessTexture()` uses `if (distX < overlapRadiusX && distY < overlapRadiusY)` (`&&` instead of separable X and Y passes), leaving the vertical seam outside the center (`distY >= overlapRadiusY`) and horizontal seam outside the center (`distX >= overlapRadiusX`) completely unblended |
| `DEFECT-57-02` | `Medium` | `Component State & Error Handling` / `Memory Hygiene` | Dropping an invalid/corrupt image file (`invalid.png`) silently catches the error and loads the synthetic brick sample instead of displaying an error alert; `ImageBitmap.close()` is never called after drawing |
| `DEFECT-57-03` | `Medium` | `Web Worker & Performance` / `Engine Purity` | Missing `worker.ts`; every slider adjustment runs `makeSeamlessTexture()` and `generateNormalMap()` twice on the main thread (once in `processTexture()` along with `JSZip.generateAsync()`, and a second time 10ms later in `renderCanvas()`); `engine.ts` contains DOM calls (`document.createElement('canvas')`) and placeholder `'data:image/png;base64,mock'` strings |
| `DEFECT-57-04` | `Low` | `Spec Conformance` | `outputResolutionPx` (`signal<number>(256)`) is defined in the component and `TextureGeneratorConfig` but has no UI selector and is ignored by `engine.ts`, while `handleFileSelected()` hard-clamps uploaded images to `512px` |
| `DEFECT-57-05` | `Low` | `Mobile & Responsive Layout` / `Theme Contrast` / `BEM` | Horizontal overflow at `390px` and `320px` (`399px`) from `.c-header__title`; cramped **Texture Viewport** card header where 4 tab buttons collide with title; 4 undersized touch targets; non-BEM classes and hardcoded `.code-header { background: #e2e8f0 }` |

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-57-01` — `makeSeamlessTexture()` Only Blends a Small Center Rectangle Instead of the Full Vertical & Horizontal Cross Seams
- **Severity**: `High`
- **Category**: `Engine Logic`
- **Location**:
  - [`engine.ts#L45-L108`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/engine.ts#L45-L108) (`makeSeamlessTexture`)
- **Audit Evidence & Reproduction Steps**:
  1. Navigate to `http://127.0.0.1:4300/tools/seamless-texture-generator`, click **Load Sample Brick Texture (64x64)**, or upload an image with a bright border / gradient.
  2. Switch to **1x1 Tile** or **3x3 Tiled Grid** and drag **Edge Overlap %** to `35%`.
  3. Inspect the vertical line `x = width / 2` near the top/bottom edges (`y < height / 2 - overlapRadiusY` or `y > height / 2 + overlapRadiusY`) and the horizontal line `y = height / 2` near the left/right edges (`x < width / 2 - overlapRadiusX` or `x > width / 2 + overlapRadiusX`): sharp unblended seam discontinuities remain visible across the entire cross outside the tiny central box (`functional-grid-blend.png`).
- **Root Cause Analysis**:
  - After wrap-shifting by `(halfW, halfH)` (`lines 54-67`), the original outer boundaries of the image meet along the entire vertical line `x = halfW` (for *all* `y ∈ [0, height)`) and the entire horizontal line `y = halfH` (for *all* `x ∈ [0, width)`).
  - However, [`engine.ts#L73`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/engine.ts#L73) checks:
    ```ts
    if (distX < overlapRadiusX && distY < overlapRadiusY) {
    ```
    Because it uses `&&`, any pixel along the vertical seam `x = halfW` where `distY >= overlapRadiusY` fails the condition and is not blended at all! Similarly, any pixel along the horizontal seam `y = halfH` where `distX >= overlapRadiusX` is skipped.
  - Furthermore, inside the `if` block (`lines 75-77`), `weight = Math.min(wx, wy)` approaches `0` at the seam center (`distX = 0` or `distY = 0`), where it blends `shifted` (which has the hard discontinuity right at `x = halfW` and `y = halfH`!) with `sourcePixels` using `s * (1 - weight) + o * weight`, meaning at `distX = 0` (`weight = 0`) it outputs `100%` of `shifted`—preserving the exact hard seam at `x = halfW` and `y = halfH`!
  - **Correct Mathematical Fix**: Perform a two-pass separable toroidal crossfade (or blend `shifted` against `sourcePixels` with weight peaking at `1.0` at the seam center `distX = 0` / `distY = 0` and decaying smoothly to `0.0` at `distX = overlapRadiusX` / `distY = overlapRadiusY`):
    - **Pass 1 (Horizontal wrap & vertical seam blend at `x = halfW`)**: Shift `sourcePixels` horizontally by `halfW`. For pixels with `distX = Math.abs(x - halfW) < overlapRadiusX`, compute smoothstep weight `alphaX = smoothstep(1 - distX / overlapRadiusX)` (`1.0` right on the seam `x = halfW`, `0.0` at `overlapRadiusX`) and blend with the unshifted `sourcePixels` row `(x, y)` (which is continuous across `x = halfW`).
    - **Pass 2 (Vertical wrap & horizontal seam blend at `y = halfH`)**: Shift Pass 1's buffer vertically by `halfH`. For pixels with `distY = Math.abs(y - halfH) < overlapRadiusY`, compute smoothstep weight `alphaY = smoothstep(1 - distY / overlapRadiusY)` (`1.0` right on the seam `y = halfH`, `0.0` at `overlapRadiusY`) and blend with the unshifted Pass 1 buffer `(x, y)` (which is continuous across `y = halfH`).

### `DEFECT-57-02` — Corrupt/Invalid Image Upload Silently Falls Back to Brick Sample & Leaks `ImageBitmap`
- **Severity**: `Medium`
- **Category**: `Component State & Error Handling` / `Memory Hygiene`
- **Location**:
  - [`seamless-texture-generator.component.ts#L487-L518`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.ts#L487-L518) (`handleFileSelected`)
- **Audit Evidence & Reproduction Steps**:
  1. Drop a non-image file (`invalid.png` containing `"NOT_AN_IMAGE"`) into `<app-dropzone>`.
  2. Instead of displaying an error alert, `handleFileSelected()` catches the `createImageBitmap` rejection and silently calls `loadSampleBrickTexture()`, loading the 64×64 brick texture while retaining the uploaded filename.
- **Root Cause Analysis**:
  - In [`handleFileSelected()`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.ts#L506-L510):
    ```ts
    } catch {
      // Fallback in headless/unit test environments where createImageBitmap fails on mock files
      this.loadSampleBrickTexture();
    }
    ```
    This swallows genuine user file errors (`errorMessage` is never set). Additionally, when `createImageBitmap(file)` succeeds (`line 494`), `bitmap.close()` is never called after `ctx.drawImage(bitmap, ...)`, leaking GPU/bitmap memory (Directive 4).

### `DEFECT-57-03` — Duplicate Main-Thread Texture/Normal Computation on Every Slider Tick & DOM Impurity in `engine.ts`
- **Severity**: `Medium`
- **Category**: `Web Worker & Performance` / `Engine Purity`
- **Location**:
  - [`seamless-texture-generator.component.ts#L534-L617`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.ts#L534-L617) (`processTexture`, `renderCanvas`)
  - [`engine.ts#L183-L206`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/engine.ts#L183-L206) (`pixelDataToPngBytes`)
  - [`engine.ts#L257-L283`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/engine.ts#L257-L283) (`processSeamlessTexture`)
- **Audit Evidence & Reproduction Steps**:
  1. Drag **Edge Overlap %** or **Normal Map Strength**: `processTexture()` calls `processSeamlessTexture()` (which runs `makeSeamlessTexture()`, `generateNormalMap()`, two `canvas.toDataURL('image/png')` encodes, and `JSZip.generateAsync()`), and 10ms later `setTimeout(() => this.renderCanvas(), 10)` runs `makeSeamlessTexture()` and `generateNormalMap()` a second time on the main thread!
  2. Inspect `result().diffuseDataUrl` and `result().normalMapDataUrl` (`engine.ts#L276-L277`): they are hardcoded to `'data:image/png;base64,mock'` and `'data:image/png;base64,mockNormal'`.
- **Root Cause Analysis**:
  - `processSeamlessTexture()` discards the `seamless` and `normalMap` `PixelData` buffers instead of returning them on `SeamlessTextureResult`, forcing `renderCanvas()` to recompute both algorithms from scratch.
  - Furthermore, building the `.zip` archive via `JSZip` on every single slider input tick is wasteful when the user hasn't clicked **Download PBR Pack (.zip)**, and there is no `worker.ts` to offload `makeSeamlessTexture()` + `generateNormalMap()` off the main thread.

### `DEFECT-57-04` — `outputResolutionPx` Signal Is Unused and Missing from UI Controls
- **Severity**: `Low`
- **Category**: `Spec Conformance`
- **Location**:
  - [`seamless-texture-generator.component.ts#L438`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.ts#L438)
  - [`seamless-texture-generator.component.ts#L495-L496`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.ts#L495-L496)
- **Audit Evidence & Reproduction Steps**:
  1. `outputResolutionPx = signal<number>(DEFAULT_TEXTURE_CONFIG.outputResolutionPx)` is declared in `seamless-texture-generator.component.ts` and passed in `TextureGeneratorConfig`, but there is no UI selector for output resolution (`64px`, `128px`, `256px`, `512px`, `1024px` / `Original`) and `engine.ts` never resamples to `config.outputResolutionPx`.
- **Root Cause Analysis**:
  - `engine.ts` ignores `config.outputResolutionPx`, and the template omits the resolution selector.

### `DEFECT-57-05` — Mobile Horizontal Overflow, Cramped Viewport Header, Small Touch Targets, and Non-BEM Classes
- **Severity**: `Low`
- **Category**: `Mobile & Responsive Layout` / `Theme Contrast` / `BEM`
- **Location**:
  - [`seamless-texture-generator.component.ts#L31-L38`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.ts#L31-L38)
  - [`seamless-texture-generator.component.ts#L244-L284`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.ts#L244-L284)
  - [`seamless-texture-generator.component.ts#L345-L423`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/seamless-texture-generator/seamless-texture-generator.component.ts#L345-L423)
- **Audit Evidence & Reproduction Steps**:
  1. At `390×844` and `320×568`, `scrollWidth` is `399px` due to `.c-header__title`.
  2. In the **Texture Viewport** `.c-card__header.l-extremo`, the title and 4 tab buttons (`1x1 Tile`, `2x2 Grid`, `3x3 Tiled Grid`, `Normal Map`) squeeze into a single row on mobile (`mobile.png`).
  3. 4 touch targets (`2` range inputs at `16px` height and `2` checkboxes at `13×13px`) are under `32px`.
  4. Non-BEM classes (`.tool-page`, `.stats-bar`, `.canvas-viewport`, `.code-box`, `.code-header`) and hardcoded `.code-header { background: #e2e8f0; color: #334155 }` are used.
- **Root Cause Analysis**:
  - Missing `overflow-wrap: anywhere` on `.c-header__title`, missing `flex-wrap: wrap` on `.c-card__header.l-extremo`, unstyled range/checkbox inputs, and legacy non-BEM CSS classes.

---

## 3. Target Acceptance Criteria

1. **Full-Cross Two-Pass Seamless Blending (`DEFECT-57-01`)**:
   - `makeSeamlessTexture()` MUST eliminate both the entire vertical wrap seam (`x = halfW` for all `y ∈ [0, height)`) and the entire horizontal wrap seam (`y = halfH` for all `x ∈ [0, width)`) using a two-pass separable toroidal crossfade whose blend weight is `1.0` at the seam center (`distX = 0` / `distY = 0`) and `0.0` at `overlapRadiusX` / `overlapRadiusY`.
   - Adjacent pixels across `x = halfW - 1` vs `x = halfW` (at any `y`, including `y = 0`) and across `y = halfH - 1` vs `y = halfH` (at any `x`, including `x = 0`) MUST transition smoothly when `edgeOverlapPercent > 0`.
2. **Error Handling & Bitmap Disposal (`DEFECT-57-02`)**:
   - Dropping an invalid/corrupt image file MUST set a user-visible `errorMessage` rendered in `.c-alert--danger` (not silently load the brick sample).
   - `bitmap.close()` MUST be called in a `finally` block immediately after drawing an `ImageBitmap` to canvas.
3. **Single-Pass Engine + Web Worker Offloading (`DEFECT-57-03`)**:
   - `engine.ts` MUST have zero DOM dependencies (`document.createElement` removed from `engine.ts`; use a pure-TS uncompressed/zlib PNG encoder in `pixelDataToPngBytes` so it runs cleanly inside a Web Worker and Node/Vitest).
   - `SeamlessTextureResult` MUST include `diffusePixels: PixelData` and `normalPixels: PixelData` so `renderCanvas()` paints directly from the computed buffers without running `makeSeamlessTexture()` or `generateNormalMap()` a second time.
   - Provide `worker.ts` to offload `makeSeamlessTexture()` and `generateNormalMap()` off the main thread.
4. **Configurable Output Resolution (`DEFECT-57-04`)**:
   - Expose `outputResolutionPx` (`64`, `128`, `256`, `512`) in the **Seamless Synthesis Controls** card and resample output `PixelData` in `engine.ts` when `config.outputResolutionPx` differs from input dimensions.
5. **Responsive BEM Layout & Touch Targets (`DEFECT-57-05`)**:
   - Zero horizontal overflow (`scrollWidth <= clientWidth`) at `1440px`, `390px`, and `320px`.
   - Wrap `.c-card__header.l-extremo` cleanly on mobile viewports, enforce `>= 44px` touch targets on all sliders/checkboxes/buttons, and replace all non-BEM classes and hardcoded `#e2e8f0` backgrounds with `.c-texture-gen__*` BEM classes and CSS custom properties.
