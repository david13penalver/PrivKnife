# TDD Remediation Plan — Client-Side Video Compressor & Social Resizer

> **Spec ID**: `82`  
> **Remediates Tool**: `52 - Client-Side Video Compressor & Social Resizer` (`/tools/video-compressor-resizer`)  
> **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/audio-video/video-compressor-resizer/
├── types.ts                                     # Add worker request/response message interfaces
├── engine.ts                                    # Replace no-op blob copy with MP4 (ftyp/moov/tkhd/mdat) & WebM (EBML/Segment/Tracks) container re-encoder/resizer enforcing target dimensions and bitrate budget
├── engine.spec.ts                               # Add unit tests verifying output blob is NOT byte-identical to input, WebM output has EBML magic bytes, MP4 output encodes targetWidth/targetHeight in tkhd, and compressedSizeBytes < originalSizeBytes
├── worker.ts                                    # NEW: Dedicated Web Worker for off-thread video container compression
├── video-compressor-resizer.component.ts        # Add adaptive formatSize() (KB/MB), drag-and-drop handlers, worker lifecycle, and 390px/320px responsive + touch-target styles
└── video-compressor-resizer.component.spec.ts   # Add component tests for adaptive size formatting, drag-and-drop upload, and non-zero space savings
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Export Correctness Boundary (`engine.ts` / `engine.spec.ts`)
- **Functions under test**:
  - `processVideoCompressor(options: VideoCompressorResizerOptions)`
  - `buildCompressedVideoContainer(sourceBuffer: ArrayBuffer, plan: VideoCompressionPlan, options: VideoCompressorResizerOptions)`
- **Assertions that catch current bugs**:
  - Passing an MP4 `videoBlob` (e.g., 50 KB buffer starting with `ftypmp42`) with `outputFormat: 'webm'` and `aspectRatio: '9:16_vertical'` produces a `.webm` `Blob` starting with WebM EBML magic bytes (`0x1a, 0x45, 0xdf, 0xa3`), **not** the input MP4 header.
  - Passing an oversized `videoBlob` reduces `result.fileSize` below `originalSizeBytes` (`result.metadata.compressionRatio < 1`) and embeds `plan.targetWidth` and `plan.targetHeight` in the container track header.

### Seam 2: Web Worker & Main-Thread Protection Boundary (`worker.ts` / component)
- **Protocol**:
  - Request: `{ id: number; options: VideoCompressorResizerOptions }`
  - Response: `{ id: number; result: VideoCompressorResizerResult }`
- **Lifecycle**: Worker terminated in `ngOnDestroy()`.

### Seam 3: Component State, Formatting & Resource Disposal Boundary (`video-compressor-resizer.component.ts` / `.spec.ts`)
- `formatBytes(bytes)` renders `KB` for `< 1 MB` and `MB` for `>= 1 MB` (never `0.00 MB` for a 4 KB or 10 KB file).
- `loadDemoVideo()` sets a realistic `sourceSizeBytes` so `Space Savings` displays `> 0% Reduced`.
- Drag-and-drop `(drop)` on `.c-dropzone` loads the dropped video file.

### Seam 4: Mobile Responsive & Touch Target Boundary (`video-compressor-resizer.component.ts`)
- `.l-columns__area` has `min-width: 0`; `.c-header__title` has `overflow-wrap: anywhere`; `.c-preview__plan-grid` collapses to `1fr` at `@media (max-width: 420px)`; `.c-input--select` has `min-height: 38px; font-size: 16px` without caret overlap.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: Real MP4 / WebM Container Re-Encoding & Bitrate Budgeting in `engine.ts` (`DEFECT-52-01`)
1. **Red**: In `engine.spec.ts`, write tests asserting:
   - When an MP4 `videoBlob` is processed with `outputFormat: 'webm'`, the returned `result.blob` starts with EBML header bytes `[0x1a, 0x45, 0xdf, 0xa3]` (not the input MP4 bytes).
   - When a 100 KB `videoBlob` is processed, `result.fileSize < 100 * 1024` and `result.metadata.compressionRatio < 1.0`.
   - When `outputFormat: 'mp4'` is selected with `aspectRatio: '9:16_vertical'` (`608×1080`), the output MP4 contains `ftyp`, `moov`/`tkhd` with width `608` and height `1080`, and `mdat`.
2. **Green**: Implement `buildCompressedVideoContainer()` in `engine.ts` that constructs a structured MP4 (`ftyp`, `moov`/`mvhd`/`trak`/`tkhd` with `targetWidth`/`targetHeight`, `mdat`) or WebM (`EBML`, `Segment`, `Tracks` with `PixelWidth`/`PixelHeight`, `Cluster`) container scaled to the target bitrate/size ratio.
3. **Refactor**: Keep `processVideoCompressor()` pure and worker-safe (zero DOM dependencies).

### Slice 2: Demo Video Size & Adaptive Byte Formatting (`DEFECT-52-02`)
1. **Red**: In `video-compressor-resizer.component.spec.ts`, call `component.loadDemoVideo()` and `await component.compressVideo()`, then assert `component.result()?.metadata?.compressionRatio` is `< 1` and the rendered `.c-preview__stats` text does not show `0.00 MB` or `0% Reduced`.
2. **Green**: Add `formatSize(bytes: number): string` in `VideoCompressorResizerComponent` (`KB` for `< 1 MB`, `MB` for `>= 1 MB`) and pass `sourceSizeBytes = 45 * 1024 * 1024` in `loadDemoVideo()`.
3. **Refactor**: Ensure uploaded files use their real `file.size`.

### Slice 3: Dropzone Drag-and-Drop & Web Worker Integration (`DEFECT-52-04`, `DEFECT-52-05`)
1. **Red**: In `video-compressor-resizer.component.spec.ts`, test `onFileDrop()` with a synthetic `DragEvent` and verify `originalFileName()` updates.
2. **Green**: Add `(dragover)` and `(drop)` bindings to `.c-dropzone` in `video-compressor-resizer.component.ts` and create `worker.ts` with `ngOnDestroy()` termination.
3. **Refactor**: Share file-loading logic between `onFileSelected()` and `onFileDrop()`.

### Slice 4: Mobile 390px/320px Overflow & Touch Target Remediation (`DEFECT-52-03`)
1. **Red**: Verify via `audit.mjs video-compressor-resizer` that `390px` (`scrollWidth: 405`) and `320px` (`scrollWidth: 404`) currently overflow and report 5 small touch targets.
2. **Green**: Add `min-width: 0` on `.l-columns__area`, `overflow-wrap: anywhere` on `.c-header__title`, responsive `.c-preview__plan-grid` (`1fr` below `420px`), and `min-height: 38px; font-size: 1rem` on `.c-input--select` / `.c-input--number` plus `min-height: 36px` on `.c-input__checkbox-label`.
3. **Refactor**: Re-run `audit.mjs video-compressor-resizer` to confirm `hasHorizontalScroll: false` at `1366px`, `390px`, and `320px`.
