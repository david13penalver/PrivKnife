# Remediation Tasks — Audio Trimmer, Volume Booster & Ringtone Maker

> **Spec ID**: `81`  
> **Remediates Tool**: `51 - Audio Trimmer, Volume Booster & Ringtone Maker` (`/tools/audio-trimmer-booster`)

---

## Phase 1: Component Signal Reactivity & Primary Workflow Fix (Seam 3 — Red → Green)
- [x] **Task 1.1 (Red — DOM Button Enablement & Reset Tests)**: Add tests in `src/app/tools/audio-video/audio-trimmer-booster/audio-trimmer-booster.component.spec.ts` verifying that clicking **Load Sample Audio Track** updates `hasAudioData()` to `true`, enables the **Trim & Export Audio** button in the DOM, allows clicking **Trim & Export Audio** to produce a downloadable audio file, and resets `hasAudioData()` to `false` when **Reset** is clicked (`DEFECT-51-01`, `DEFECT-51-05`).
- [x] **Task 1.2 (Green — Convert `cachedAudioBuffer` to `signal` & Fix `resetToDefaults`)**: In `src/app/tools/audio-video/audio-trimmer-booster/audio-trimmer-booster.component.ts`, change `cachedAudioBuffer` to `signal<AudioBufferLike | null>(null)`, update `hasAudioData = computed(() => this.cachedAudioBuffer() !== null)`, and clear `cachedAudioBuffer.set(null)` and `originalFileName.set('')` in `resetToDefaults()` (`DEFECT-51-01`, `DEFECT-51-05`).

## Phase 2: Engine `.m4r` Container & Drag-and-Drop Remediation (Seam 1 & 3 — Red → Green)
- [x] **Task 2.1 (Red — `.m4r` Container Header Test)**: Add a unit test in `src/app/tools/audio-video/audio-trimmer-booster/engine.spec.ts` asserting `processAudioTrimmer(RINGTONE_M4R_OPTIONS)` outputs a `.m4r` blob containing the ISO BMFF `'ftypM4A '` box signature at byte offset 4 (`DEFECT-51-03`).
- [x] **Task 2.2 (Green — `.m4r` Container Builder)**: Implement `encodeM4rContainer()` in `src/app/tools/audio-video/audio-trimmer-booster/engine.ts` and invoke it for `exportFormat === 'm4r_ringtone'` (`DEFECT-51-03`).
- [x] **Task 2.3 (Red & Green — Dropzone Drag-and-Drop)**: Add `(dragover)="$event.preventDefault()"` and `(drop)="onFileDrop($event)"` on `.c-dropzone` in `audio-trimmer-booster.component.ts` and test it in `audio-trimmer-booster.component.spec.ts` (`DEFECT-51-04`).

## Phase 3: Web Worker Offloading & Memory Hygiene (Seam 2 — Red → Green)
- [x] **Task 3.1 (Create `worker.ts` & Wire Lifecycle Cleanup)**: Create `src/app/tools/audio-video/audio-trimmer-booster/worker.ts` to run `processAudioTrimmer()` off the main thread using raw `channelData` and `sampleRate`, and ensure worker termination + `URL.revokeObjectURL()` + `audioContext.close()` in `ngOnDestroy()` (`DEFECT-51-06`).

## Phase 4: Mobile Adaptation, Touch Targets & Theme Styling (Seam 4)
- [x] **Task 4.1 (Fix 390px & 320px Horizontal Overflow)**: Add `min-width: 0` on `.l-columns__area`, `overflow-wrap: anywhere` on `.c-header__title`, and `flex-wrap: wrap` on `.l-extremo` in `audio-trimmer-booster.component.ts` (`DEFECT-51-02`).
- [x] **Task 4.2 (Enlarge Touch Targets & Prevent iOS Auto-Zoom)**: Style `.c-input--number` and `.c-input--select` with `min-height: 38px; font-size: 1rem`, `.c-input--range` with `height: 24px`, and `.c-input__checkbox-label` with `min-height: 36px` (`DEFECT-51-02`).

## Phase 5: Verification & Regression Gate
- [x] **Task 5.1**: Run `npx vitest run src/app/tools/audio-video/audio-trimmer-booster/` and verify 100% test pass.
- [x] **Task 5.2**: Run `npm run build` and verify zero compilation errors.
- [x] **Task 5.3**: Run `node $SCRATCH/audit.mjs audio-trimmer-booster` and verify 0 console/page errors, 0 external network requests, `hasHorizontalScroll: false` at `1366px`, `390px`, and `320px`, and end-to-end UI export of `.wav`, `.mp3`, and `.m4r` files.
