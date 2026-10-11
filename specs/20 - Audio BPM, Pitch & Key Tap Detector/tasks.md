# Task List (TDD Vertical Slices): Audio BPM, Pitch & Key Tap Detector

> **Tool**: `20 - Audio BPM, Pitch & Key Tap Detector`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Domain Contracts & Synthetic Audio Fixtures
- [x] **Task 1.1: Define Domain Interfaces & Types**
  - Path: `src/app/tools/audio-video/bpm-tap-detector/types.ts`
  - Types: `TapState`, `BpmAnalysisResult`, `PitchResult`, `KeyResult`, `TempoDescription`, `MetronomeSoundType`, `AudioPlaybackState`.
- [x] **Task 1.2: Create Programmatic Synthetic Audio Test Fixtures**
  - Path: `src/app/tools/audio-video/bpm-tap-detector/test-fixtures.ts`
  - Generate programmatic audio buffers: synthetic sine wave (440 Hz A4), synthetic click train (120 BPM pulses), harmonic chord buffers (C Major, A Minor), and mock tap timestamp sequences.

---

### 🟩 Phase 2: Core DSP Engine Algorithms (Seam 1)
- [x] **Task 2.1: Tap Tempo Math Engine (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, test `calculateTapBpm()` with known timestamps, threshold reset, tempo labeling, and tempo modifiers (`adjustBpm`).
  - **Implementation (Green)**: Implement tap tempo calculation in `engine.ts`.
- [x] **Task 2.2: Pitch & Note Frequency Detection (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, test `detectPitchFromPcm()` on synthetic 440 Hz (A4) and 261.63 Hz (C4) waves. Verify fundamental frequency, note name, octave, and cents detune.
  - **Implementation (Green)**: Implement autocorrelation / zero-crossing pitch detector and `frequencyToMusicalNote()` in `engine.ts`.
- [x] **Task 2.3: 12-Class Chromagram & Musical Key Detection (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, test `detectKeyFromPcm()` on synthetic chords. Verify detection of C Major (8B) and A Minor (8A) with Krumhansl-Schmuckler profiles.
  - **Implementation (Green)**: Implement chroma extraction and Pearson correlation key finder in `engine.ts`.
- [x] **Task 2.4: Audio Buffer BPM & Peak Envelope Detection (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, test `detectBpmFromPcm()` on synthetic click trains at 120 BPM and 140 BPM. Verify BPM accuracy (±1.5 BPM) and confidence calculation.
  - **Implementation (Green)**: Implement low-pass filtering, energy onset envelope, and autocorrelation beat detector in `engine.ts`.
- [x] **Task 2.5: Waveform Peak Downsampler (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, test `extractWaveformPeaks()` returning normalized min/max peaks for canvas rendering.
  - **Implementation (Green)**: Implement downsampling in `engine.ts`.

---

### 🟩 Phase 3: Web Audio Metronome Synthesizer (Seam 2)
- [x] **Task 3.1: Metronome Scheduler & Sound Synthesizer (Red → Green)**
  - **Test (Red)**: In `metronome.spec.ts`, test lookahead scheduling, start/stop state transitions, tempo changes, and oscillator scheduling.
  - **Implementation (Green)**: Implement `MetronomeSynthesizer` in `metronome.ts`.

---

### 🟩 Phase 4: Angular Standalone Component UI & Signals (Seam 3)
- [x] **Task 4.1: Component Layout & State Signals (Red → Green)**
  - **Test (Red)**: In `bpm-tap-detector.component.spec.ts`:
    - Mount component in idle state with default BPM.
    - Click tap button: verify tap counter increments, BPM updates, and tempo descriptor displays.
    - Reset button: clears tap history back to default state.
    - Tempo adjustments (+1, -1, x2, /2) update signals.
  - **Implementation (Green)**: Build `BpmTapDetectorComponent` in `bpm-tap-detector.component.ts`.
- [x] **Task 4.2: Audio File Upload & Analysis Integration (Red → Green)**
  - **Test (Red)**: In `bpm-tap-detector.component.spec.ts`:
    - Process mock audio file: updates detected BPM, key signature badge, and pitch readout.
    - Play/Pause audio playback controls toggle properly.
  - **Implementation (Green)**: Integrate file dropzone and decodeAudioData workflow in component.
- [x] **Task 4.3: Metronome Toggle & Sound Synthesis (Red → Green)**
  - **Test (Red)**: In `bpm-tap-detector.component.spec.ts`:
    - Toggle metronome on/off.
    - Change metronome sound type and volume.
  - **Implementation (Green)**: Connect `MetronomeSynthesizer` with UI controls and beat pulse visual feedback.

---

### 🟩 Phase 5: Privacy Guard Verification (Seam 4)
- [x] **Task 5.1: Zero Network Leakage (Red → Green)**
  - **Test (Red)**: In `bpm-tap-detector.component.spec.ts`, spy on `fetch` and `XMLHttpRequest.prototype.open`, run audio file analysis, tap tempo sequences, and metronome playback, asserting 0 network calls occurred.
  - **Implementation (Green)**: Verify 100% offline isolation.

---

### 🟩 Phase 6: Tool Registry, Routing & Catalog Integration (Seam 5)
- [x] **Task 6.1: Register Tool in Tool Registry (Red → Green)**
  - Create `src/app/tools/audio-video/bpm-tap-detector/index.ts`.
  - Register `bpmTapDetectorTool` in `tool-registry.ts` and test in `tool-registry.spec.ts`.
- [x] **Task 6.2: Configure Route in `app.routes.ts`**
  - Add `/tools/audio-bpm-detector` with aliases `/tools/bpm-tap-detector` and `/tools/tap-tempo`.
- [x] **Task 6.3: Update Home Catalog & Roadmap Index**
  - Add `audio-bpm-detector` to `home.ts` catalog with status `'ready'`.
  - Mark Spec 20 as `[x]` in `specs/README.md`.

---

### 🟩 Phase 7: Final Verification & Build
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Run production build check: `npm run build` (0 errors, 0 budget warnings).
