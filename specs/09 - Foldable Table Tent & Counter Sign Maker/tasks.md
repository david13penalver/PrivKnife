# Task List (TDD Vertical Slices): Foldable Table Tent & Counter Sign Maker

> **Tool**: `09 - Foldable Table Tent & Counter Sign Maker`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Domain Contracts & Test Fixtures Setup
- [x] **Task 1.1: Define Domain Types**
  - Path: `src/app/tools/documents/table-tent-maker/types.ts`
  - Define `PaperFormat`, `TentFoldType`, `Orientation`, `FontFamily`, `ThemePreset`, `PanelContent`, `TableTentConfig`, `TentGeometry`.
- [x] **Task 1.2: Create Programmatic Test Fixtures**
  - Path: `src/app/tools/documents/table-tent-maker/test-fixtures.ts`
  - Define presets (Restaurant Menu, Wedding Table, Hotel WiFi, Event Conference) and default configuration.

---

### 🟩 Phase 2: Core Table Tent Engine (Seam 1)
- [x] **Task 2.1: Implement Geometry & Fold Coordinates (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `calculateTentGeometry()` produces millimeter coordinates for bi-fold and tri-fold on A4 and US Letter.
  - **Implementation (Green)**: Implement `calculateTentGeometry()` in `engine.ts`.
- [x] **Task 2.2: Implement QR Code Generator (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateQrDataUri()` creates valid data URIs for given URLs.
  - **Implementation (Green)**: Implement `generateQrDataUri()` in `engine.ts`.
- [x] **Task 2.3: Implement PDF Compiler with 180° Inverted Panel (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateTableTentPdf()` produces valid vector PDF with fold lines, trim guides, and rotated top panel.
  - **Implementation (Green)**: Implement `generateTableTentPdf()` using `jsPDF`.

---

### 🟩 Phase 3: Angular Standalone Component UI & Signals (Seam 2)
- [x] **Task 3.1: Component Layout & State Signals (Red → Green)**
  - **Test (Red)**: In `table-tent-maker.component.spec.ts`, assert:
    - Component initializes with default Restaurant QR Menu preset.
    - User can change fold type (Bi-fold vs Tri-fold), paper size (A4 vs Letter), and orientation.
    - User can edit title, subtitle, body, table number, and QR code URL.
    - User can toggle "Mirror Front to Back" mode.
  - **Implementation (Green)**: Build `TableTentMakerComponent` with split-screen configurator and 2D live preview.
- [x] **Task 3.2: Image / Logo Uploader with Client-Side Downsampling (Red → Green)**
  - **Test (Red)**: In `table-tent-maker.component.spec.ts`, assert:
    - Uploading a logo file sets `logoDataUri` in state.
  - **Implementation (Green)**: Implement file input with canvas downsampling.

---

### 🟩 Phase 4: Export, Download & Memory Hygiene (Seam 2)
- [x] **Task 4.1: Download PDF & Revoke Object URL (Red → Green)**
  - **Test (Red)**: In `table-tent-maker.component.spec.ts`, assert:
    - Clicking "Download Print-Ready PDF" generates PDF, triggers anchor download with filename, and immediately revokes object URL.
    - Post-download modal is displayed with folding instructions.
  - **Implementation (Green)**: Implement `downloadPdf()`, modal dialog, and URL cleanup.

---

### 🟩 Phase 5: Privacy Guard Verification (Seam 2)
- [x] **Task 5.1: Zero Network Leakage (Red → Green)**
  - **Test (Red)**: In `table-tent-maker.component.spec.ts`, spy on `fetch` and `XMLHttpRequest.prototype.open`, run PDF generation, and assert 0 network calls occurred.
  - **Implementation (Green)**: Verify 100% offline isolation.

---

### 🟩 Phase 6: Tool Registry, Routing & Platform Integration (Seam 3)
- [x] **Task 6.1: Register Tool in Tool Registry (Red → Green)**
  - Create `src/app/tools/documents/table-tent-maker/index.ts` and add `tableTentMakerTool` to `TOOL_REGISTRY`.
- [x] **Task 6.2: Configure Route in `app.routes.ts`**
  - Add `/tools/table-tent-maker` (and alias `/tools/table-tent`) with complete SEO metadata.
- [x] **Task 6.3: Update Home Catalog & Specs Roadmap**
  - Update `home.ts` status to `'ready'` with link to `/tools/table-tent-maker`.
  - Mark Spec 09 as `[x]` in `specs/README.md`.

---

### 🟩 Phase 7: Final Verification & Build
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Run production build check: `npm run build` (0 errors, 0 warnings).
