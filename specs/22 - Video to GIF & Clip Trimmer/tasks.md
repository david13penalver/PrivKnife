# Task List (TDD Vertical Slices): Video to GIF & Clip Trimmer

> **Tool**: `22 - Video to GIF & Clip Trimmer`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Domain Contracts & Synthetic Fixtures Setup
- [x] **Task 1.1: Define Domain Interfaces & Types**
  - Path: `src/app/tools/audio-video/video-gif-trimmer/types.ts`
  - Types: `OutputFormat`, `ResolutionPreset`, `TrimmerConfig`, `ConversionProgress`, `VideoMetadata`, `GifEncoderOptions`.
- [x] **Task 1.2: Create Programmatic Synthetic Test Fixtures**
  - Path: `src/app/tools/audio-video/video-gif-trimmer/test-fixtures.ts`
  - Fixtures: `DEFAULT_TRIMMER_CONFIG`, `createSyntheticImageData()`, `createTestFrameSequence()`.

---

### 🟩 Phase 2: GIF89a Binary Encoder & Math Engine (Seam 1)
- [x] **Task 2.1: GIF89a Binary LZW Encoder (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `encodeGifFrames()` generates valid binary GIF with `GIF89a` header, Netscape application block, graphic control extension, image descriptor, and trailer byte `0x3B`.
  - **Implementation (Green)**: Implement `encodeGifFrames()` in `gif-encoder.ts`.
- [x] **Task 2.2: Color Quantization & Palette Generator (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `quantizePalette()` builds an indexed color table up to 256 colors with accurate Euclidean color matching.
  - **Implementation (Green)**: Implement color quantizer in `gif-encoder.ts`.
- [x] **Task 2.3: Dimension Scaler & Aspect Ratio Math (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `scaleDimensions()` correctly scales 1080p, 720p, 480p, and vertical 9:16 videos preserving aspect ratios.
  - **Implementation (Green)**: Implement `scaleDimensions()` in `engine.ts`.
- [x] **Task 2.4: Timeline Bounds & Time Formatter (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `calculateTrimBounds()` clamps start/end times and `formatVideoTime()` outputs `MM:SS.ms`.
  - **Implementation (Green)**: Implement trim bounds validator and formatter in `engine.ts`.

---

### 🟩 Phase 3: Angular Standalone Component UI & Signals (Seam 2)
- [x] **Task 3.1: Component Layout & State Signals (Red → Green)**
  - **Test (Red)**: In `video-gif-trimmer.component.spec.ts`:
    - Mounts in idle state with dropzone.
    - Video loading simulates metadata extraction and sets duration/timeline bounds.
    - Timeline scrubber updates start and end time signals.
    - Output format (GIF vs Video), resolution, and FPS selections update config.
  - **Implementation (Green)**: Build `VideoGifTrimmerComponent` in `video-gif-trimmer.component.ts`.
- [x] **Task 3.2: Conversion Progress & Download Actions (Red → Green)**
  - **Test (Red)**: In `video-gif-trimmer.component.spec.ts`:
    - Simulated conversion updates progress state and produces output preview.
    - Download button triggers file download and revokes Object URL.
    - Reset/Clear button restores initial empty state.
  - **Implementation (Green)**: Wire conversion handler, progress signal, and download logic.

---

### 🟩 Phase 4: Privacy Guard Verification (Seam 3)
- [x] **Task 4.1: Zero Network Leakage (Red → Green)**
  - **Test (Red)**: In `video-gif-trimmer.component.spec.ts`, spy on `fetch` and `XMLHttpRequest.prototype.open`, run file loading, timeline trimming, conversion simulation, and download, asserting 0 network calls occurred.
  - **Implementation (Green)**: Verify 100% offline isolation.

---

### 🟩 Phase 5: Tool Registry, Routing & Catalog Integration (Seam 4)
- [x] **Task 5.1: Register Tool in Tool Registry (Red → Green)**
  - Create `src/app/tools/audio-video/video-gif-trimmer/index.ts`.
  - Register `videoGifTrimmerTool` in `tool-registry.ts` and test in `tool-registry.spec.ts`.
- [x] **Task 5.2: Configure Route in `app.routes.ts`**
  - Add `/tools/video-to-gif` with aliases `/tools/video-trimmer` and `/tools/gif-converter`.
- [x] **Task 5.3: Update Home Catalog & Roadmap Index**
  - Add `video-to-gif` to `home.ts` catalog with status `'ready'`.
  - Mark Spec 22 as `[x]` in `specs/README.md`.

---

### 🟩 Phase 6: Final Verification & Build
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Run production build check: `npm run build` (0 errors, 0 budget warnings).
