# Task List (TDD Vertical Slices): Subtitles Timestamp Shifter & SRT-VTT Converter

> **Tool**: `15 - Subtitles Timestamp Shifter & SRT-VTT Converter`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Domain Contracts & Test Fixtures Setup
- [x] **Task 1.1: Define Domain Types**
  - Path: `src/app/tools/media/subtitles-shifter/types.ts`
  - Define `SubtitleCue`, `SubtitleFormat`, `ShiftOptions`, `ParsedSubtitleFile`, `FpsPreset`.
- [x] **Task 1.2: Create Programmatic Test Fixtures**
  - Path: `src/app/tools/media/subtitles-shifter/test-fixtures.ts`
  - Define valid sample SRT content, sample WebVTT content, and expected transformed outputs.

---

### 🟩 Phase 2: Core Subtitle Engine & Shifting Algorithms (Seam 1)
- [x] **Task 2.1: Implement Unified Subtitle Parser (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `parseSubtitles()` accurately parses both SRT and WebVTT timestamps and text cues.
  - **Implementation (Green)**: Implement regex-based parser in `engine.ts`.
- [x] **Task 2.2: Implement Millisecond Shifter & FPS Scaler (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `applyTimeShift()` adjusts start/end times with forward/backward offsets and FPS scale factors, clamping at 0ms.
  - **Implementation (Green)**: Implement offset & scaling algorithms in `engine.ts`.
- [x] **Task 2.3: Implement SRT & WebVTT Serializers (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `serializeSubtitles()` converts cues into spec-compliant SRT and WebVTT text formats.
  - **Implementation (Green)**: Implement string serializers in `engine.ts`.
- [x] **Task 2.4: Implement Blob Exporter (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `exportSubtitleBlob()` returns a valid text Blob with appropriate mime type.
  - **Implementation (Green)**: Implement Blob exporter in `engine.ts`.

---

### 🟩 Phase 3: Angular Standalone Component UI & Signals (Seam 2)
- [x] **Task 3.1: Component Layout & State Signals (Red → Green)**
  - **Test (Red)**: In `subtitles-shifter.component.spec.ts`, assert:
    - Component initializes with empty or sample state.
    - Uploading or loading demo subtitle updates cue list.
    - Adjusting offset (+/- ms, s, min) and FPS reactively updates preview cues.
    - Format toggle switches output between SRT and VTT.
  - **Implementation (Green)**: Build `SubtitlesShifterComponent` with dropzone, shift controls, and side-by-side table preview.
- [x] **Task 3.2: Export & Clipboard Action (Red → Green)**
  - **Test (Red)**: In `subtitles-shifter.component.spec.ts`, assert:
    - "Copy Subtitles" copies converted content to clipboard with feedback state.
    - "Download Subtitles" triggers download and immediately revokes object URL.
  - **Implementation (Green)**: Wire export actions and clipboard handler.

---

### 🟩 Phase 4: Privacy Guard Verification (Seam 2)
- [x] **Task 4.1: Zero Network Leakage (Red → Green)**
  - **Test (Red)**: In `subtitles-shifter.component.spec.ts`, spy on `fetch` and `XMLHttpRequest.prototype.open`, run parsing and download, and assert 0 network calls occurred.
  - **Implementation (Green)**: Verify 100% offline isolation.

---

### 🟩 Phase 5: Tool Registry, Routing & Platform Integration (Seam 3)
- [x] **Task 5.1: Register Tool in Tool Registry (Red → Green)**
  - Create `src/app/tools/media/subtitles-shifter/index.ts` and add `subtitlesShifterTool` to `TOOL_REGISTRY`.
- [x] **Task 5.2: Configure Route in `app.routes.ts`**
  - Add `/tools/subtitles-shifter` (and aliases) with complete SEO metadata.
- [x] **Task 5.3: Update Home Catalog & Specs Roadmap**
  - Update `home.ts` status to `'ready'` with link to `/tools/subtitles-shifter`.
  - Mark Spec 15 as `[x]` in `specs/README.md`.

---

### 🟩 Phase 6: Final Verification & Build
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Run production build check: `npm run build` (0 errors, 0 warnings).
