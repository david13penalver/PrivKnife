# Task List (TDD Vertical Slices): PDF Redaction & Anonymizer

> **Tool**: `05 - PDF Redaction & Anonymizer`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Domain Contracts & Test Fixtures Setup
- [ ] **Task 1.1: Define Domain Types**
  - Path: `src/app/tools/privacy/pdf-redaction/types.ts`
  - Define `RedactionBox`, `RedactionColor`, `PageRedaction`, `RedactionDocument`, `SanitizationOptions`.
- [ ] **Task 1.2: Create Programmatic Test PDF Generator**
  - Path: `src/app/tools/privacy/pdf-redaction/test-fixtures.ts`
  - Synthetic PDF with known text strings ("SSN: 123-45-6789", "Confidential Salary: $120,000") at known coordinates.

---

### 🟩 Phase 2: Redaction Engine — Core Burning & Stripping (Seam 1)
- [ ] **Task 2.1: Load PDF for Redaction (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `loadPdfForRedaction()` returns page count and dimensions for each page.
  - **Implementation (Green)**: Implement `loadPdfForRedaction()` in `engine.ts` using `pdf-lib`.
- [ ] **Task 2.2: Burn Blackout & Whiteout Rectangles (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert burning redaction boxes draws opaque rectangles on the target page coordinates.
  - **Implementation (Green)**: Implement `burnRedactions()` in `engine.ts`.
- [ ] **Task 2.3: Strip Document Metadata (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert output PDF has author, creator, producer, title, and keywords purged.
  - **Implementation (Green)**: Implement metadata stripping in `engine.ts`.

---

### 🟩 Phase 3: Angular Standalone Component UI & Signals (Seam 2)
- [ ] **Task 3.1: Dropzone & Interactive Redaction Canvas (Red → Green)**
  - **Test (Red)**: In `pdf-redaction.component.spec.ts`, assert:
    - Initial state displays dropzone.
    - Dropping a PDF initializes redaction editor with page controls.
    - Adding redaction box updates active page redactions list.
  - **Implementation (Green)**: Build `PdfRedactionComponent` with Signals and BEM template.
- [ ] **Task 3.2: Tool Modes & Undo/Clear Actions (Red → Green)**
  - **Test (Red)**: In `pdf-redaction.component.spec.ts`, assert:
    - Toggling between Blackout and Whiteout mode.
    - "Undo" removes last drawn redaction box.
    - "Clear Page" clears all boxes on current page.
  - **Implementation (Green)**: Implement action handlers.

---

### 🟩 Phase 4: Export, Download & Memory Hygiene (Seam 2)
- [ ] **Task 4.1: Download Sanitized PDF & Revoke Object URLs (Red → Green)**
  - **Test (Red)**: In `pdf-redaction.component.spec.ts`, assert clicking download generates sanitized PDF, triggers anchor download, and revokes object URL.
  - **Implementation (Green)**: Implement `downloadSanitizedPdf()` in component.

---

### 🟩 Phase 5: Privacy Guard (Seam 2)
- [ ] **Task 5.1: Zero Network Verification (Red → Green)**
  - **Test (Red)**: In `pdf-redaction.component.spec.ts`, spy on `fetch` and `XMLHttpRequest.prototype.open`, run redaction and download, and assert 0 network requests occurred.
  - **Implementation (Green)**: Verify zero network leakage.

---

### 🟩 Phase 6: Tool Registry & Routing (Seam 3)
- [ ] **Task 6.1: Register Tool in Tool Registry (Red → Green)**
  - Create `src/app/tools/privacy/pdf-redaction/index.ts` and add `pdfRedactionTool` to `TOOL_REGISTRY`.
- [ ] **Task 6.2: Register Lazy Route in `app.routes.ts`**
  - Add `/tools/pdf-redaction` with SEO metadata.
- [ ] **Task 6.3: Update Home Catalog & Specs Roadmap**
  - Set status to `'ready'` in `home.ts` and mark Spec 05 as `[x]` in `specs/README.md`.

---

### 🟩 Phase 7: Final Quality & Build Verification
- [ ] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [ ] Run production build check: `npm run build` (0 errors, 0 warnings).
