# Task List (TDD Vertical Slices): EXIF & Privacy Metadata Stripper

> **Tool**: `01 - EXIF & Privacy Metadata Stripper`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Test Fixtures & Domain Contracts
- [x] **Task 1.1: Create Domain Interfaces**
  - Path: `src/app/tools/privacy/exif-stripper/types.ts`
  - Define `ExifTag`, `ParsedMetadata`, `StrippedResult`, and `ExifCategory`.
- [x] **Task 1.2: Build Synthetic Test Fixtures**
  - Path: `src/app/tools/privacy/exif-stripper/test-fixtures.ts`
  - Synthetic independent binary fixtures:
    - `createMockJpegWithExif()`: Minimal JPEG starting with `0xFFD8` containing `APP1` segment with Camera Model and GPS tags.
    - `createMockJpegClean()`: Minimal JPEG without any `APP` metadata markers.
    - `createMockPngWithMetadata()`: Minimal valid PNG containing `tEXt` and `eXIf` chunks.
    - `createMockCorruptedFile()`: Invalid byte array.

---

### 🟩 Phase 2: Engine Binary Processing (Seam 1)
- [x] **Task 2.1: JPEG Metadata Parsing (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `parseMetadata(jpegWithExif, 'image/jpeg')` identifies `format: 'jpeg'`, `hasMetadata: true`, tag count > 0, and extracts Camera/GPS details.
  - **Implementation (Green)**: Implement `parseJpegMetadata()` in `engine.ts` scanning JPEG markers and reading TIFF header within `APP1`.
- [x] **Task 2.2: JPEG Metadata Stripping (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `stripMetadata(jpegWithExif, 'image/jpeg')` returns `cleanedBuffer` where `APP1` is removed, byte length is reduced, and re-running `parseMetadata()` reports `hasMetadata: false` and `tagCount: 0`.
  - **Implementation (Green)**: Implement `stripJpegMetadata()` in `engine.ts` slicing out all `APP1`-`APP15` segments while keeping image framing intact.
- [x] **Task 2.3: PNG Metadata Parsing & Stripping (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `parseMetadata(pngWithMeta, 'image/png')` detects `tEXt`/`eXIf` chunks, and `stripMetadata(pngWithMeta, 'image/png')` produces a clean PNG retaining only critical chunks (`IHDR`, `IDAT`, `IEND`).
  - **Implementation (Green)**: Implement `parsePngMetadata()` and `stripPngMetadata()` in `engine.ts` via chunk iteration and filtering.
- [x] **Task 2.4: Edge Cases & Corrupt Buffer Handling (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert empty or invalid byte arrays throw a clear `Error` or return `format: 'unknown'` without crashing.
  - **Implementation (Green)**: Add file signature validation in `engine.ts`.

---

### 🟩 Phase 3: Angular Standalone Component UI (Seam 2)
- [x] **Task 3.1: File Ingestion & Inspection View (Red → Green)**
  - **Test (Red)**: In `exif-stripper.component.spec.ts`, assert that dropping a JPEG file triggers inspection and renders:
    - Image preview and file details
    - "Before: X Tags Detected" indicator
    - Breakdown table with sensitive tags marked with warning badges
  - **Implementation (Green)**: Build `ExifStripperComponent` with Angular Signals (`file`, `metadata`, `previewUrl`) and BEM template.
- [x] **Task 3.2: Stripping & Download Action (Red → Green)**
  - **Test (Red)**: In `exif-stripper.component.spec.ts`, assert that clicking "Strip Metadata & Download":
    - Calls `stripMetadata()`
    - Creates a cleaned `Blob`
    - Displays "After: 0 Tags Remaining" success state
    - Triggers client-side download anchor
  - **Implementation (Green)**: Add strip action handler in `ExifStripperComponent`.
- [x] **Task 3.3: Memory Hygiene & Reset (Red → Green)**
  - **Test (Red)**: In `exif-stripper.component.spec.ts`, assert that clicking "Clear / Reset" or component destruction (`ngOnDestroy`) calls `URL.revokeObjectURL()`.
  - **Implementation (Green)**: Implement lifecycle cleanup via `DestroyRef` or `ngOnDestroy`.

---

### 🟩 Phase 4: Privacy & Zero-Exfiltration Guard (Seam 2)
- [x] **Task 4.1: Zero Network Requests Verification (Red → Green)**
  - **Test (Red)**: In `exif-stripper.component.spec.ts`, spy on `window.fetch` and `XMLHttpRequest.prototype.open`, run the full upload & strip workflow, and assert 0 calls were dispatched.
  - **Implementation (Green)**: Verify engine and component remain strictly local.

---

### 🟩 Phase 5: Tool Registry & Routing (Seam 3)
- [x] **Task 5.1: Register Tool in Tool Registry (Red → Green)**
  - **Test (Red)**: In `tool-registry.spec.ts`, assert that tool `exif-stripper` is defined, has category `'privacy'`, and has `isFullyClientSide: true`.
  - **Implementation (Green)**: Create `src/app/tools/privacy/exif-stripper/index.ts` and register in `src/app/tools/tool-registry.ts`.
- [x] **Task 5.2: Lazy Route in `app.routes.ts`**
  - Add route `{ path: 'tools/exif-stripper', ... }` with keyword-rich SEO title and meta description.

---

### 🟩 Phase 6: Final Verification
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Production build check: `npm run build` (0 errors, 0 warnings).
- [x] Update `specs/README.md` catalog status to completed `[x]`.
