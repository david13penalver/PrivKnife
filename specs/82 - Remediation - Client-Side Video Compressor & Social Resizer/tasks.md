# Remediation Tasks — Client-Side Video Compressor & Social Resizer

> **Spec ID**: `82`  
> **Remediates Tool**: `52 - Client-Side Video Compressor & Social Resizer` (`/tools/video-compressor-resizer`)

---

## Phase 1: Engine Container Re-Encoding & Bitrate Compression (Seam 1 — Red → Green)
- [x] **Task 1.1 (Red — Container Transcoding & Compression Ratio Tests)**: Add unit tests in `src/app/tools/audio-video/video-compressor-resizer/engine.spec.ts` verifying that `processVideoCompressor()` transforms an MP4 input into a valid WebM EBML container (`0x1a, 0x45, 0xdf, 0xa3`) when `outputFormat === 'webm'`, writes `plan.targetWidth` and `plan.targetHeight` into the MP4 `tkhd` / WebM `Tracks` header, and reduces output byte size (`compressedSizeBytes < originalSizeBytes`) (`DEFECT-52-01`).
- [x] **Task 1.2 (Green — Implement `buildCompressedVideoContainer` in `engine.ts`)**: Replace the no-op buffer copy in `src/app/tools/audio-video/video-compressor-resizer/engine.ts` with `buildCompressedVideoContainer()` supporting MP4 (`ftyp`, `moov`/`tkhd`, `mdat`) and WebM (`EBML`, `Segment`/`Tracks`, `Cluster`) container generation with bitrate-budgeted payload sizing (`DEFECT-52-01`).

## Phase 2: Web Worker Offloading & Memory Hygiene (Seam 2 — Red → Green)
- [x] **Task 2.1 (Create `worker.ts` & Wire Worker Lifecycle)**: Create `src/app/tools/audio-video/video-compressor-resizer/worker.ts` to execute `processVideoCompressor()` off the main thread and terminate any active worker in `ngOnDestroy()` (`DEFECT-52-05`).

## Phase 3: Component UI State, Adaptive Size Formatting & Drag-and-Drop (Seam 3 — Red → Green)
- [x] **Task 3.1 (Red — Adaptive Byte Formatting & Drag-and-Drop Tests)**: Add tests in `src/app/tools/audio-video/video-compressor-resizer/video-compressor-resizer.component.spec.ts` verifying `formatSize()` formats sub-MB sizes in `KB` (never `0.00 MB`), `loadDemoVideo()` produces non-zero space savings after compression, and `onFileDrop()` loads a dropped video file (`DEFECT-52-02`, `DEFECT-52-04`).
- [x] **Task 3.2 (Green — Implement `formatSize`, Demo Size & Dropzone Handlers)**: Add `formatSize(bytes)` in `video-compressor-resizer.component.ts`, pass realistic original size in `loadDemoVideo()`, and bind `(dragover)` and `(drop)` on `.c-dropzone` (`DEFECT-52-02`, `DEFECT-52-04`).

## Phase 4: Mobile Adaptation & Touch Target Styling (Seam 4)
- [x] **Task 4.1 (Fix 390px & 320px Horizontal Overflow)**: Add `min-width: 0` on `.l-columns__area`, `overflow-wrap: anywhere` on `.c-header__title`, and `@media (max-width: 420px)` collapsing `.c-preview__plan-grid` to `1fr` in `video-compressor-resizer.component.ts` (`DEFECT-52-03`).
- [x] **Task 4.2 (Touch Targets & `<select>` Caret Spacing)**: Style `.c-input--select` and `.c-input--number` with `min-height: 38px; font-size: 1rem` and `.c-input__checkbox-label` with `min-height: 36px` (`DEFECT-52-03`).

## Phase 5: Verification & Regression Gate
- [x] **Task 5.1**: Run `npx vitest run src/app/tools/audio-video/video-compressor-resizer/` and verify 100% test pass.
- [x] **Task 5.2**: Run `npm run build` and verify zero compilation errors.
- [x] **Task 5.3**: Run `node $SCRATCH/audit.mjs video-compressor-resizer` and verify 0 console/page errors, 0 external network requests, `hasHorizontalScroll: false` at `1366px`, `390px`, and `320px`, and valid `.mp4` and `.webm` deliverables.
