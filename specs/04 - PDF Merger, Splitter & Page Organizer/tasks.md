# Task List (TDD Vertical Slices): PDF Merger, Splitter & Page Organizer

> **Tool**: `04 - PDF Merger, Splitter & Page Organizer`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Dependencies, Domain Contracts & Test Fixtures
- [x] **Task 1.1: Install `pdf-lib`**
  - Install `pdf-lib` package.
- [x] **Task 1.2: Define Domain Types**
  - Path: `src/app/tools/documents/pdf-merger/types.ts`
  - Define `DocumentPage`, `LoadedPdfDocument`, `PdfMergeOptions`, `RotationAngle`.
- [x] **Task 1.3: Create Programmatic Test PDFs**
  - Path: `src/app/tools/documents/pdf-merger/test-fixtures.ts`
  - Utility functions to generate synthetic 1-page, 2-page, and 3-page valid PDF ArrayBuffers using `PDFDocument.create()`.

---

### 🟩 Phase 2: PDF Engine — Loading & Parsing (Seam 1)
- [x] **Task 2.1: Load and Inspect PDF Documents (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `loadPdfDocument()` extracts page count, dimensions, and initializes `DocumentPage` items with 0° rotation.
  - **Implementation (Green)**: Implement `loadPdfDocument()` in `engine.ts` using `pdf-lib`.

---

### 🟩 Phase 3: PDF Engine — Page Rotation, Reordering & Merging (Seam 1)
- [x] **Task 3.1: Page Rotation (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert rotating a page updates its rotation angle modulo 360 (0°, 90°, 180°, 270°).
  - **Implementation (Green)**: Implement `rotatePage()` and `rotateAllPages()` in `engine.ts`.
- [x] **Task 3.2: Multi-Document Assembly & Merging (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert merging pages from 2 separate PDF documents produces a single valid PDF buffer containing the exact total pages in the specified order and with rotations applied.
  - **Implementation (Green)**: Implement `assemblePdf()` in `engine.ts`.

---

### 🟩 Phase 4: Angular Standalone Component UI (Seam 2)
- [x] **Task 4.1: Dropzone & Document Page Grid (Red → Green)**
  - **Test (Red)**: In `pdf-merger.component.spec.ts`, assert:
    - Initial state displays multi-file dropzone.
    - Dropping PDF files loads pages into interactive page cards.
    - Page cards display document name, page number, and action buttons.
  - **Implementation (Green)**: Build `PdfMergerComponent` with Signals and BEM template.
- [x] **Task 4.2: Page Actions (Rotate, Reorder, Delete) (Red → Green)**
  - **Test (Red)**: In `pdf-merger.component.spec.ts`, assert:
    - Clicking rotate on a page card updates rotation.
    - Clicking delete removes the page from the list.
    - Clicking move left/right swaps page positions.
    - Bulk "Rotate All" rotates all loaded pages.
  - **Implementation (Green)**: Implement page manipulation handlers.

---

### 🟩 Phase 5: Export, Download & Memory Hygiene (Seam 2)
- [x] **Task 5.1: PDF Export & URL Revocation (Red → Green)**
  - **Test (Red)**: In `pdf-merger.component.spec.ts`, assert clicking "Merge & Download" compiles the PDF, creates a download link, and immediately revokes the object URL.
  - **Implementation (Green)**: Implement `downloadMergedPdf()` in component.

---

### 🟩 Phase 6: Privacy Guard (Seam 2)
- [x] **Task 6.1: Zero Network Verification (Red → Green)**
  - **Test (Red)**: In `pdf-merger.component.spec.ts`, spy on `fetch` and `XMLHttpRequest.prototype.open`, run PDF loading and merge, and assert 0 network requests occurred.
  - **Implementation (Green)**: Verify zero network leakage.

---

### 🟩 Phase 7: Tool Registry & Routing (Seam 3)
- [x] **Task 7.1: Register Tool in Tool Registry (Red → Green)**
  - Create `src/app/tools/documents/pdf-merger/index.ts` and add `pdfMergerTool` to `TOOL_REGISTRY`.
- [x] **Task 7.2: Register Lazy Route in `app.routes.ts`**
  - Add `/tools/pdf-merger-splitter` with SEO metadata.
- [x] **Task 7.3: Update Home Catalog & Specs Roadmap**
  - Set status to `'ready'` in `home.ts` and mark Spec 04 as `[x]` in `specs/README.md`.

---

### 🟩 Phase 8: Final Quality & Build Verification
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Run production build check: `npm run build` (0 errors, 0 warnings).
