# Task List (TDD Vertical Slices): Avery Barcode & Label Sheet Generator

> **Tool**: `08 - Avery Barcode & Label Sheet Generator`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Domain Contracts & Test Fixtures Setup
- [x] **Task 1.1: Define Domain Types**
  - Path: `src/app/tools/documents/barcode-labels/types.ts`
  - Define `BarcodeSymbology`, `LabelTemplate`, `LabelItem`, `LabelPosition`, `LabelSheetConfig`, `DataInputMode`.
- [x] **Task 1.2: Create Programmatic Test Fixtures**
  - Path: `src/app/tools/documents/barcode-labels/test-fixtures.ts`
  - Define standard label presets (Avery 5160, 5163, 5167, L7160) and sample inventory items.

---

### 🟩 Phase 2: Barcode & Label Engine (Seam 1)
- [x] **Task 2.1: Implement Barcode & QR Code Image Generator (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateBarcodeDataUri()` produces valid data URIs for Code128, EAN13, UPCA, Code39, and QR code.
  - **Implementation (Green)**: Implement `generateBarcodeDataUri()` using `jsbarcode` and `qrcode`.
- [x] **Task 2.2: Implement Label Grid Coordinates & Offsets (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `calculateLabelPositions()` calculates exact millimeter coordinates for Avery 5160 (3×10), Avery 5163 (2×5), and respects `startOffsetIndex`.
  - **Implementation (Green)**: Implement `calculateLabelPositions()` in `engine.ts`.
- [x] **Task 2.3: Implement Sequential & CSV Batch Generators (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateSequenceItems()` generates sequential strings and `parseCsvItems()` parses multi-line CSVs.
  - **Implementation (Green)**: Implement batch helpers in `engine.ts`.
- [x] **Task 2.4: Implement Precision PDF Generator with jsPDF (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateLabelSheetPdf()` produces a valid PDF Blob and buffer matching sheet dimensions.
  - **Implementation (Green)**: Implement `generateLabelSheetPdf()` in `engine.ts`.

---

### 🟩 Phase 3: Angular Standalone Component UI & Signals (Seam 2)
- [x] **Task 3.1: Component Layout & State Signals (Red → Green)**
  - **Test (Red)**: In `barcode-labels.component.spec.ts`, assert:
    - Component initializes with default Avery 5160 preset and Code128 symbology.
    - User can change template preset, symbology, and data mode (Single, Sequence, CSV).
    - User can enter top title and bottom subtext lines.
    - Starting index offset updates preview.
  - **Implementation (Green)**: Build `BarcodeLabelsComponent` with split-screen configurator and live preview sheet.
- [x] **Task 3.2: CSV File Import & Sequence Generation (Red → Green)**
  - **Test (Red)**: In `barcode-labels.component.spec.ts`, assert:
    - Sequence generator populates items.
    - Dropping/uploading a CSV file populates items.
  - **Implementation (Green)**: Implement CSV handler and sequence trigger.

---

### 🟩 Phase 4: Export, Download & Memory Hygiene (Seam 2)
- [x] **Task 4.1: Download PDF & Trigger Confirmation Modal (Red → Green)**
  - **Test (Red)**: In `barcode-labels.component.spec.ts`, assert:
    - Clicking "Download Print-Ready PDF" generates PDF, triggers anchor download with filename, and immediately revokes object URL.
    - Post-download modal is displayed.
  - **Implementation (Green)**: Implement `downloadPdf()`, modal dialog, and URL cleanup.

---

### 🟩 Phase 5: Privacy Guard Verification (Seam 2)
- [x] **Task 5.1: Zero Network Leakage (Red → Green)**
  - **Test (Red)**: In `barcode-labels.component.spec.ts`, spy on `fetch` and `XMLHttpRequest.prototype.open`, run PDF generation, and assert 0 network calls occurred.
  - **Implementation (Green)**: Verify 100% offline isolation.

---

### 🟩 Phase 6: Tool Registry, Routing & Platform Integration (Seam 3)
- [x] **Task 6.1: Register Tool in Tool Registry (Red → Green)**
  - Create `src/app/tools/documents/barcode-labels/index.ts` and add `averyBarcodeSheetTool` to `TOOL_REGISTRY`.
- [x] **Task 6.2: Configure Route in `app.routes.ts`**
  - Add `/tools/barcode-labels` (and alias `/tools/avery-barcode-sheet`) with complete SEO metadata.
- [x] **Task 6.3: Update Home Catalog & Specs Roadmap**
  - Update `home.ts` status to `'ready'` with link to `/tools/barcode-labels`.
  - Mark Spec 08 as `[x]` in `specs/README.md`.

---

### 🟩 Phase 7: Final Verification & Build
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Run production build check: `npm run build` (0 errors, 0 warnings).
