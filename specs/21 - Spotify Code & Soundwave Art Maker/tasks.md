# Task List (TDD Vertical Slices): Spotify Code & Soundwave Art Maker

> **Tool**: `21 - Spotify Code & Soundwave Art Maker`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Domain Contracts & Test Fixtures Setup
- [x] **Task 1.1: Define Domain Interfaces & Types**
  - Path: `src/app/tools/audio-video/soundwave-art-maker/types.ts`
  - Types: `WaveformStyle`, `ArtTheme`, `SoundwaveConfig`, `ThreeDPrintConfig`, `SpotifyCodeData`.
- [x] **Task 1.2: Create Programmatic Synthetic Test Fixtures**
  - Path: `src/app/tools/audio-video/soundwave-art-maker/test-fixtures.ts`
  - Fixtures: `DEFAULT_SOUNDWAVE_CONFIG`, `SAMPLE_PCM_VOICE_MEMO`, `SAMPLE_PCM_HEARTBEAT`, `SAMPLE_NORMALIZED_BARS`.

---

### 🟩 Phase 2: Core Soundwave & Export Engine (Seam 1)
- [x] **Task 2.1: PCM Waveform Sampling & Normalization (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `samplePcmWaveform()` downsamples audio into $N$ normalized bars with smoothing and min-height threshold.
  - **Implementation (Green)**: Implement `samplePcmWaveform()` in `engine.ts`.
- [x] **Task 2.2: Spotify Code & Link Parser (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `parseSpotifyLink()` extracts track URI and generates deterministic bar heights.
  - **Implementation (Green)**: Implement Spotify link parser and code generator in `engine.ts`.
- [x] **Task 2.3: Parametric SVG Vector Generator (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateSoundwaveSvg()` outputs valid XML SVG with center-mirrored, bottom-aligned, and circular geometries with text elements.
  - **Implementation (Green)**: Implement SVG builder in `engine.ts`.
- [x] **Task 2.4: Vector jsPDF Poster Exporter (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateSoundwavePdfBlob()` produces non-empty `application/pdf` Blob.
  - **Implementation (Green)**: Implement PDF generator in `engine.ts`.
- [x] **Task 2.5: 3D Manifold STL Generator (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateSoundwaveStlBlob()` outputs valid binary STL file with positive volume, baseplate layer, and extruded soundwave bars.
  - **Implementation (Green)**: Implement solid 3D STL generator in `engine.ts`.

---

### 🟩 Phase 3: Angular Standalone Component UI & Signals (Seam 2)
- [x] **Task 3.1: Component Layout & State Signals (Red → Green)**
  - **Test (Red)**: In `soundwave-art-maker.component.spec.ts`:
    - Mounts with default preset and live SVG art preview.
    - Changing bar count, symmetry style, colors, and title updates SVG preview reactively.
    - Applying sample presets (Voice Memo, Heartbeat, Song) updates waveform bars.
    - LocalStorage persists configuration and restores on init.
  - **Implementation (Green)**: Build `SoundwaveArtMakerComponent` in `soundwave-art-maker.component.ts`.
- [x] **Task 3.2: Export Actions (SVG, PDF, STL) (Red → Green)**
  - **Test (Red)**: In `soundwave-art-maker.component.spec.ts`:
    - "Download SVG" triggers vector download and revokes Object URL.
    - "Download PDF" triggers printable poster download.
    - "Download 3D STL" triggers slicer-ready 3D model download.
  - **Implementation (Green)**: Wire export handlers and file download triggers.

---

### 🟩 Phase 4: Privacy Guard Verification (Seam 3)
- [x] **Task 4.1: Zero Network Leakage (Red → Green)**
  - **Test (Red)**: In `soundwave-art-maker.component.spec.ts`, spy on `fetch` and `XMLHttpRequest.prototype.open`, run audio file sampling, preset switches, and SVG/PDF/STL exports, asserting 0 network calls occurred.
  - **Implementation (Green)**: Verify 100% offline isolation.

---

### 🟩 Phase 5: Tool Registry, Routing & Catalog Integration (Seam 4)
- [x] **Task 5.1: Register Tool in Tool Registry (Red → Green)**
  - Create `src/app/tools/audio-video/soundwave-art-maker/index.ts`.
  - Register `soundwaveArtMakerTool` in `tool-registry.ts` and test in `tool-registry.spec.ts`.
- [x] **Task 5.2: Configure Route in `app.routes.ts`**
  - Add `/tools/soundwave-art-maker` with aliases `/tools/soundwave-art` and `/tools/spotify-code-maker`.
- [x] **Task 5.3: Update Home Catalog & Roadmap Index**
  - Add `soundwave-art-maker` to `home.ts` catalog with status `'ready'`.
  - Mark Spec 21 as `[x]` in `specs/README.md`.

---

### 🟩 Phase 6: Final Verification & Build
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Run production build check: `npm run build` (0 errors, 0 budget warnings).
