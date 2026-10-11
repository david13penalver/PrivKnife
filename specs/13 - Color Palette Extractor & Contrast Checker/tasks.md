# Task List (TDD Vertical Slices): Color Palette Extractor & Contrast Checker

> **Tool**: `13 - Color Palette Extractor & Contrast Checker`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Domain Contracts & Test Fixtures Setup
- [x] **Task 1.1: Define Domain Types**
  - Path: `src/app/tools/dev/color-palette-extractor/types.ts`
  - Define `ExtractedColor`, `WcagCompliance`, `ContrastMatrixCell`, `PaletteExtractionOptions`.
- [x] **Task 1.2: Create Programmatic Test Fixtures**
  - Path: `src/app/tools/dev/color-palette-extractor/test-fixtures.ts`
  - Define sample palettes, mock canvas image data, and test color pairs.

---

### 🟩 Phase 2: Core Color & Accessibility Engine (Seam 1)
- [x] **Task 2.1: Implement Color Conversion & W3C Luminance / Contrast Math (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `calculateRelativeLuminance()` and `calculateContrastRatio()` match known W3C standards (black/white = 21:1, identical = 1:1, #2563eb/#ffffff = 4.67:1).
  - **Implementation (Green)**: Implement sRGB conversion and contrast ratio formulas in `engine.ts`.
- [x] **Task 2.2: Implement WCAG 2.1 Compliance & Matrix Generator (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `evaluateWcagCompliance()` and `buildContrastMatrix()` correctly tag AA Normal (4.5), AA Large (3.0), and AAA (7.0).
  - **Implementation (Green)**: Implement evaluation and $N \times N$ matrix builder in `engine.ts`.
- [x] **Task 2.3: Implement Pure In-Memory Palette Quantization (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `extractPaletteFromImageData()` clusters and extracts dominant colors from pixel buffer.
  - **Implementation (Green)**: Implement median cut quantization in `engine.ts`.
- [x] **Task 2.4: Implement Adobe ASE Binary & PDF Audit Exporter (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `encodeAseBinary()` produces valid `ASEF` binary buffer, `generateJsonTokens()`, `generateCssVariables()`, and `generateWcagPdfReport()` output non-empty documents.
  - **Implementation (Green)**: Implement ASE binary encoder, JSON/CSS formatters, and jsPDF report builder in `engine.ts`.

---

### 🟩 Phase 3: Angular Standalone Component UI & Signals (Seam 2)
- [x] **Task 3.1: Component Layout & State Signals (Red → Green)**
  - **Test (Red)**: In `color-palette-extractor.component.spec.ts`, assert:
    - Component initializes with sample palette and generated matrix.
    - Dropping an image triggers palette extraction.
    - User can add, edit, and delete swatches reactively.
  - **Implementation (Green)**: Build `ColorPaletteExtractorComponent` with dropzone, eyedropper, and swatches.
- [x] **Task 3.2: Interactive Contrast Matrix & Pair Preview (Red → Green)**
  - **Test (Red)**: In `color-palette-extractor.component.spec.ts`, assert:
    - Matrix grid renders with compliance score badges.
    - Selecting a cell updates active foreground/background preview pair.
  - **Implementation (Green)**: Build interactive matrix and preview card.

---

### 🟩 Phase 4: Multi-Format Exports & Memory Hygiene (Seam 2)
- [x] **Task 4.1: Download ASE, JSON, PDF & Object URL Revocation (Red → Green)**
  - **Test (Red)**: In `color-palette-extractor.component.spec.ts`, assert:
    - Downloading JSON, ASE, or PDF creates and immediately revokes object URLs.
    - Component cleanup (`ngOnDestroy`) disposes of all active preview object URLs.
  - **Implementation (Green)**: Implement export methods, post-export modal, and lifecycle cleanup.

---

### 🟩 Phase 5: Privacy Guard Verification (Seam 2)
- [x] **Task 5.1: Zero Network Leakage (Red → Green)**
  - **Test (Red)**: In `color-palette-extractor.component.spec.ts`, spy on `fetch` and `XMLHttpRequest.prototype.open`, run extraction and export, and assert 0 network calls occurred.
  - **Implementation (Green)**: Verify 100% offline isolation.

---

### 🟩 Phase 6: Tool Registry, Routing & Platform Integration (Seam 3)
- [x] **Task 6.1: Register Tool in Tool Registry (Red → Green)**
  - Create `src/app/tools/dev/color-palette-extractor/index.ts` and add `colorPaletteExtractorTool` to `TOOL_REGISTRY`.
- [x] **Task 6.2: Configure Route in `app.routes.ts`**
  - Add `/tools/color-palette-extractor` (and alias `/tools/palette-contrast`) with complete SEO metadata.
- [x] **Task 6.3: Update Home Catalog & Specs Roadmap**
  - Update `home.ts` status to `'ready'` with link to `/tools/color-palette-extractor`.
  - Mark Spec 13 as `[x]` in `specs/README.md`.

---

### 🟩 Phase 7: Final Verification & Build
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Run production build check: `npm run build` (0 errors, 0 warnings).
