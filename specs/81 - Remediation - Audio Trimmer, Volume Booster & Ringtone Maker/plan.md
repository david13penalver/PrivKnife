# TDD Remediation Plan — Audio Trimmer, Volume Booster & Ringtone Maker

> **Spec ID**: `81`  
> **Remediates Tool**: `51 - Audio Trimmer, Volume Booster & Ringtone Maker` (`/tools/audio-trimmer-booster`)  
> **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/audio-video/audio-trimmer-booster/
├── types.ts                                  # Add worker request/response message interfaces
├── engine.ts                                 # Add ISO BMFF ftypM4A container builder for .m4r ringtones
├── engine.spec.ts                            # Add unit test verifying .m4r output contains 'ftypM4A ' header and <= 40s clamp
├── worker.ts                                 # NEW: Dedicated Web Worker for off-thread PCM slicing and MP3/WAV/M4R encoding
├── audio-trimmer-booster.component.ts        # Fix cachedAudioBuffer signal reactivity, add drag-and-drop handlers, fix resetToDefaults(), wire worker, fix 390px/320px overflow & touch targets
└── audio-trimmer-booster.component.spec.ts   # Add DOM test clicking "Load Sample Audio Track" and asserting "Trim & Export Audio" button is enabled and clickable
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Export Correctness Boundary (`engine.ts` / `engine.spec.ts`)
- **Functions under test**:
  - `processAudioTrimmer(options: AudioTrimmerBoosterOptions)`
  - `encodeM4rContainer(channels: Float32Array[], sampleRate: number, bitrateKbps?: number)`
- **Assertions that catch current bugs**:
  - Calling `processAudioTrimmer(RINGTONE_M4R_OPTIONS)` returns a `Blob` whose bytes at offset `4..12` equal ASCII `'ftypM4A '` (`66 74 79 70 4d 34 41 20`).

### Seam 2: Web Worker & Main-Thread Protection Boundary (`worker.ts` / component)
- **Protocol**:
  - Request: `{ id: number; options: AudioTrimmerBoosterOptions }` (passing `channelData: Float32Array[]` and `sampleRate: number`)
  - Response: `{ id: number; result: AudioTrimmerBoosterResult }`
- **Lifecycle**: Terminated in `ngOnDestroy()`.

### Seam 3: Component State, Reactivity & Resource Disposal Boundary (`audio-trimmer-booster.component.ts` / `.spec.ts`)
- **DOM & Signal Assertions**:
  - Before loading audio, `fixture.nativeElement.querySelector('button.c-button--primary').disabled` is `true`.
  - After clicking **Load Sample Audio Track** and running `fixture.detectChanges()`, `component.hasAudioData()` is `true` and `fixture.nativeElement.querySelector('button.c-button--primary').disabled` is `false`.
  - Clicking **Trim & Export Audio** in the DOM populates `component.result()`, `component.downloadUrl()`, and renders `.c-preview__stats`.
  - Calling `resetToDefaults()` sets `component.hasAudioData()` back to `false` and clears `component.originalFileName()`.

### Seam 4: Mobile Responsive & Touch Target Boundary (`audio-trimmer-booster.component.ts`)
- `.l-columns__area` has `min-width: 0`; `.c-header__title` has `overflow-wrap: anywhere`; `.c-input--number` and `.c-input--select` have `min-height: 38px; font-size: 16px`; `.c-input--range` has `height: 24px`; `.c-input__checkbox-label` has `min-height: 36px`.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: Fix `cachedAudioBuffer` Signal Reactivity & Button Enablement (`DEFECT-51-01`, `DEFECT-51-05`)
1. **Red**: In `audio-trimmer-booster.component.spec.ts`, write a test that clicks the `Load Sample Audio Track` button in the DOM, calls `fixture.detectChanges()`, and asserts `component.hasAudioData()` is `true` and the `Trim & Export Audio` button's `disabled` property is `false`, followed by `resetToDefaults()` setting `hasAudioData()` back to `false`.
2. **Green**: In `audio-trimmer-booster.component.ts`, change `private cachedAudioBuffer` to `private readonly cachedAudioBuffer = signal<AudioBufferLike | null>(null);`, update `hasAudioData = computed(() => this.cachedAudioBuffer() !== null)`, and clear `this.cachedAudioBuffer.set(null)` in `resetToDefaults()`.
3. **Refactor**: Ensure all references to `cachedAudioBuffer` use signal getter/setter syntax.

### Slice 2: `.m4r` ISO BMFF (`ftypM4A `) Container Packaging (`DEFECT-51-03`)
1. **Red**: In `engine.spec.ts`, add an assertion that `processAudioTrimmer(RINGTONE_M4R_OPTIONS)` produces a `Blob` whose bytes `[4..12]` decode to `'ftypM4A '`.
2. **Green**: Implement `encodeM4rContainer()` in `engine.ts` wrapping the encoded ringtone stream inside a valid ISO BMFF (`ftypM4A `, `moov`, `mdat`) container and call it from `case 'm4r_ringtone'`.
3. **Refactor**: Keep the 40-second ringtone duration clamp intact.

### Slice 3: Drag-and-Drop File Loading & Web Worker Offloading (`DEFECT-51-04`, `DEFECT-51-06`)
1. **Red**: In `audio-trimmer-booster.component.spec.ts`, dispatch a synthetic `drop` event on `.c-dropzone` and assert `onFileDrop()` processes the dropped file; verify `ngOnDestroy()` terminates any active worker.
2. **Green**: Add `(dragover)` and `(drop)` handlers to `.c-dropzone` in `audio-trimmer-booster.component.ts`, and create `worker.ts` for off-thread execution with fallback to `processAudioTrimmer()` when `Worker` is unavailable.
3. **Refactor**: Extract `decodeFile(file: File)` helper shared between `onFileSelected()` and `onFileDrop()`.

### Slice 4: Mobile Overflow & Touch Target Remediation (`DEFECT-51-02`)
1. **Red**: Verify via `audit.mjs audio-trimmer-booster` that `390px` and `320px` report `scrollWidth: 430` and `smallTouchTargetCount: 9`.
2. **Green**: Update component styles with `min-width: 0` on `.l-columns__area`, `overflow-wrap: anywhere` on `.c-header__title`, and touch-friendly heights (`min-height: 38px` on inputs/selects, `height: 24px` on range inputs, `min-height: 36px` on checkbox labels).
3. **Refactor**: Re-run headless Chrome layout report at `1366px`, `390px`, and `320px` to confirm `hasHorizontalScroll: false` and `smallTouchTargetCount === 0`.
