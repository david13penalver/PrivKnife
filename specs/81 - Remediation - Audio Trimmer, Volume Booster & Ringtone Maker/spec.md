# Remediation Specification — Audio Trimmer, Volume Booster & Ringtone Maker

> **Spec ID**: `81`  
> **Remediates Tool**: `51 - Audio Trimmer, Volume Booster & Ringtone Maker`  
> **Slug**: `audio-trimmer-booster`  
> **Category**: `audio-video`  
> **Route**: `/tools/audio-trimmer-booster`  
> **Audit Reference**: [`tools_31_60_audit.md#tool-51`](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-51)  
> **Current Audit Verdict**: Functional `❌ Broken` | Mobile `❌ Poor` | Overall `❌`  
> **Status**: `Ready for Implementation`  
> **Priority**: `Critical`

---

## 1. Executive Summary & Audit Baseline

During the headless-Chrome functional and responsive audit across Desktop (`1366×900`), Mobile (`390×844`), and Small Mobile (`320×640`), the **Audio Trimmer, Volume Booster & Ringtone Maker** (`/tools/audio-trimmer-booster`) was found to be **functionally broken in the UI**: clicking **Load Sample Audio Track** or uploading a real `.wav` file updates the dropzone text and waveform bars, **but the primary action button (`Trim & Export Audio`) remains permanently disabled (`disabled="true"`)**.

Direct inspection and testing revealed six defects across Angular signal reactivity, `.m4r` container encoding, drag-and-drop handling, reset behavior, Web Worker offloading, and mobile horizontal overflow:
1. **Primary Action Button Permanently Disabled (`DEFECT-51-01` — Critical Blocker)**: `hasAudioData = computed(() => this.cachedAudioBuffer !== null)` reads a non-reactive plain TypeScript field `private cachedAudioBuffer: AudioBufferLike | null = null;`. Angular evaluates `hasAudioData()` once on component initialization (`false`) and never re-evaluates it when `this.cachedAudioBuffer = buffer` is mutated.
2. **Horizontal Overflow on 390px and 320px Mobile Viewports (`DEFECT-51-02`)**: Both `390px` (`scrollWidth: 430px`) and `320px` (`scrollWidth: 430px`) exhibit horizontal scrolling (`hasHorizontalScroll: true`), and 9 form controls fall below the 32px minimum touch target height.
3. **`.m4r` iPhone Ringtone Export Outputs Raw MP3 Frames (`DEFECT-51-03`)**: In `engine.ts`, `case 'm4r_ringtone'` calls `encodeMp3()` (producing MPEG-1 Layer 3 frames starting with `fffbb004`) and merely renames the file extension to `.m4r` instead of writing a valid ISO BMFF / MP4 (`ftypM4A `) audio container.
4. **Missing Drag-and-Drop Handlers on `.c-dropzone` (`DEFECT-51-04`)**: `.c-dropzone` displays `Drop audio file here or click to browse` but has no `(dragover)` or `(drop)` event listeners, causing dropped audio files to navigate away from the app.
5. **Reset Button Cannot Clear Loaded Audio Track (`DEFECT-51-05`)**: `resetToDefaults()` checks `if (this.cachedAudioBuffer)` and keeps the loaded buffer and filename instead of resetting the tool back to its initial empty state.
6. **Main-Thread MP3 Encoding Without Web Worker (`DEFECT-51-06`)**: `spec.md` Section 1 & 8 (`Directive 3`) require offloading PCM slicing and `@breezystack/lamejs` MP3 encoding to a Web Worker (`worker.ts`), which is missing.

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-51-01` — **Trim & Export Audio** Button Permanently Disabled Due to Non-Signal Dependency in `computed()`
- **Severity**: `Critical`
- **Category**: `Component State & Reactivity`
- **Location**: [`audio-trimmer-booster.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/audio-video/audio-trimmer-booster/audio-trimmer-booster.component.ts#L460-L464) and [`audio-trimmer-booster.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/audio-video/audio-trimmer-booster/audio-trimmer-booster.component.ts#L242-L249)
- **Symptom & Evidence**: After clicking **Load Sample Audio Track** or uploading a `.wav` file, `document.querySelector('button.c-button--primary').disabled` remains `true`. Users cannot trigger `processAudio()` from the UI.
- **Root Cause**:
  ```ts
  private cachedAudioBuffer: AudioBufferLike | null = null;
  hasAudioData = computed(() => this.cachedAudioBuffer !== null);
  ```
  Because `this.cachedAudioBuffer` is a plain class property rather than an Angular `WritableSignal`, Angular tracks zero reactive dependencies inside `hasAudioData`. Once evaluated as `false` during initial render, `hasAudioData()` never updates.
- **Remediation Specification**:
  - Replace `private cachedAudioBuffer: AudioBufferLike | null = null;` with `private readonly cachedAudioBuffer = signal<AudioBufferLike | null>(null);`.
  - Update `hasAudioData = computed(() => this.cachedAudioBuffer() !== null);`.
  - Update `loadSyntheticSample()`, `processAudio()`, and `resetToDefaults()` to call `this.cachedAudioBuffer.set(...)` and `this.cachedAudioBuffer()`.

### `DEFECT-51-02` — Horizontal Overflow at 390px and 320px (`scrollWidth: 430px`) & Small Touch Targets
- **Severity**: `High`
- **Category**: `Mobile & Responsive Layout` / `BEM & Form Accessibility`
- **Location**: [`audio-trimmer-booster.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/audio-video/audio-trimmer-booster/audio-trimmer-booster.component.ts#L26-L38) and [`audio-trimmer-booster.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/audio-video/audio-trimmer-booster/audio-trimmer-booster.component.ts#L338-L439)
- **Symptom & Evidence**: At `390px` and `320px`, `scrollWidth` is `430px` (`hasHorizontalScroll: true`), and 9 form inputs/selects/sliders measure under 32px in height (`28px` number inputs, `21px` `<select>`, `16px` range sliders, `13×13px` checkbox).
- **Root Cause**: Component styles contain zero `@media` queries, lack `min-width: 0` on `.l-columns__area`, and do not set minimum touch-target heights (`min-height: 38px`) on `.c-input`, `.c-input--select`, `.c-input--range`, and `.c-input__checkbox-label`.
- **Remediation Specification**:
  - Add `min-width: 0` on `.l-columns__area`, `overflow-wrap: anywhere` on `.c-header__title`, and `flex-wrap: wrap; gap: 0.5rem` on `.l-extremo`.
  - Enforce `min-height: 38px; padding: 0.4rem 0.65rem; font-size: 1rem` on `.c-input--number` and `.c-input--select`, `min-height: 28px` on `.c-input--range`, and `min-height: 36px` on `.c-input__checkbox-label`.

### `DEFECT-51-03` — `.m4r` Ringtone Deliverable Writes MP3 Frames Instead of an ISO BMFF / M4A Container
- **Severity**: `Medium`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/audio-video/audio-trimmer-booster/engine.ts#L365-L374)
- **Symptom & Evidence**: Exporting `m4r_ringtone` produces `privknife_demo_synth_trimmed.m4r` whose first 4 bytes are `fffbb004` (MP3 frame sync) rather than an ISO Base Media File Format (`ftypM4A `) container required by Apple iOS/Finder ringtones.
- **Root Cause**: `case 'm4r_ringtone'` calls `encodeMp3()` directly without wrapping the audio stream in an MP4/M4A (`ftypM4A `) container.
- **Remediation Specification**:
  - Implement `encodeM4rContainer(channels: Float32Array[], sampleRate: number, bitrateKbps?: number): Promise<Uint8Array>` in `engine.ts` that builds a valid ISO BMFF (`ftypM4A `, `moov`/`trak`/`mdia`/`minf`/`stbl`, `mdat`) container wrapping the encoded audio payload so the resulting `.m4r` starts with a standard `ftypM4A ` box header at offset 4 (`66 74 79 70 4d 34 41 20`) and enforces the 40-second maximum ringtone duration.

### `DEFECT-51-04` — Missing `(dragover)` and `(drop)` Handlers on `.c-dropzone`
- **Severity**: `Medium`
- **Category**: `Component State & UX`
- **Location**: [`audio-trimmer-booster.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/audio-video/audio-trimmer-booster/audio-trimmer-booster.component.ts#L47-L62)
- **Symptom & Evidence**: `.c-dropzone` prompts `Drop audio file here or click to browse` but only binds `(change)="onFileSelected($event)"` on `<input type="file">`.
- **Root Cause**: Missing `(dragover)` and `(drop)` bindings on `.c-dropzone`.
- **Remediation Specification**:
  - Add `(dragover)="$event.preventDefault()"` and `(drop)="onFileDrop($event)"` on `.c-dropzone`, delegating `event.dataTransfer?.files[0]` to a shared `loadAudioFile(file: File)` method.

### `DEFECT-51-05` — `resetToDefaults()` Does Not Clear Loaded Audio Track
- **Severity**: `Low`
- **Category**: `Component State & UX`
- **Location**: [`audio-trimmer-booster.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/audio-video/audio-trimmer-booster/audio-trimmer-booster.component.ts#L627-L648)
- **Symptom & Evidence**: After loading a sample or uploaded track, clicking **Reset** leaves `originalFileName()` as `'privknife_demo_synth.wav'` and keeps `cachedAudioBuffer` in memory.
- **Root Cause**: `if (this.cachedAudioBuffer)` branch in `resetToDefaults()` preserves `cachedAudioBuffer` instead of clearing it.
- **Remediation Specification**:
  - In `resetToDefaults()`, set `this.cachedAudioBuffer.set(null)`, `this.originalFileName.set('')`, `this.startTimeSec.set(0)`, `this.endTimeSec.set(30)`, `this.totalDurationSec.set(30)`, and call `this.resetWaveform()`.

### `DEFECT-51-06` — Missing Web Worker (`worker.ts`) for Off-Thread Audio Encoding
- **Severity**: `Medium`
- **Category**: `Web Worker & Performance`
- **Location**: [`audio-trimmer-booster/`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/audio-video/audio-trimmer-booster/)
- **Symptom & Evidence**: `spec.md` Section 1 & 6 (`Directive 3`) require a dedicated Web Worker (`worker.ts`) for PCM processing and `@breezystack/lamejs` MP3 encoding, which is missing.
- **Root Cause**: `processAudio()` runs `processAudioTrimmer()` synchronously/asynchronously on the main thread.
- **Remediation Specification**:
  - Create `src/app/tools/audio-video/audio-trimmer-booster/worker.ts` that accepts transferable/cloned `channelData: Float32Array[]`, `sampleRate`, and `AudioTrimmerBoosterOptions`, runs `processAudioTrimmer()`, and posts back the encoded result, with clean termination in `ngOnDestroy()`.

---

## 3. Target Acceptance Criteria

### 3.1. Functional & Spec Conformance
- [ ] **AC-51-01 (Reactive Button Enablement)**: Clicking **Load Sample Audio Track** or selecting/dropping an audio file immediately updates `hasAudioData()` to `true` and enables the **Trim & Export Audio** button (`disabled === false`).
- [ ] **AC-51-02 (End-to-End WAV, MP3 & M4R Exports)**: Clicking **Trim & Export Audio** in the UI produces valid downloadable `.wav` (`RIFF....WAVE`), `.mp3` (MPEG frame sync `0xFF 0xFB`), and `.m4r` (`ftypM4A ` box header, `<= 40s` duration) files and renders the `<audio controls>` player and `.c-preview__stats` metadata.
- [ ] **AC-51-03 (Drag-and-Drop & Full Reset)**: Dragging an audio file onto `.c-dropzone` loads it, and clicking **Reset** clears `cachedAudioBuffer()`, `originalFileName()`, `downloadUrl()`, and restores the initial 30s empty waveform.

### 3.2. Mobile & Responsive Layout & Touch Targets
- [ ] **AC-51-04 (Zero Horizontal Overflow)**: `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at `1366px`, `390px`, and `320px`.
- [ ] **AC-51-05 (Touch Targets)**: Number inputs, `<select>` dropdowns, range sliders, and checkbox labels meet minimum touch-target dimensions (`>= 32px` height; `>= 20px` for range sliders) and `font-size >= 16px` on mobile.

### 3.3. `AGENTS.md` Prime Directives
- [ ] **AC-51-06 (Directives 1 & 2 — Zero Network)**: Zero external network requests during all audio decoding, trimming, and encoding workflows.
- [ ] **AC-51-07 (Directive 3 — Web Worker)**: `worker.ts` exists for off-thread PCM/MP3 processing and is terminated in `ngOnDestroy()`.
- [ ] **AC-51-08 (Directive 4 — Memory Hygiene)**: `downloadUrl` is revoked via `URL.revokeObjectURL()` on re-export, reset, and `ngOnDestroy()`, and `AudioContext` is closed in `ngOnDestroy()`.
