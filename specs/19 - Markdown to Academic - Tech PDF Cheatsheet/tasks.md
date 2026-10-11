# Task List (TDD Vertical Slices): Markdown to Academic / Tech PDF Cheatsheet

> **Tool**: `19 - Markdown to Academic - Tech PDF Cheatsheet`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Domain Contracts & Test Fixtures Setup
- [x] **Task 1.1: Define Domain Types**
  - Path: `src/app/tools/documents/markdown-cheatsheet/types.ts`
  - Define `PaperSize`, `Orientation`, `ColumnCount`, `CheatsheetConfig`, `CheatsheetPresetKey`.
- [x] **Task 1.2: Create Programmatic Test Fixtures**
  - Path: `src/app/tools/documents/markdown-cheatsheet/test-fixtures.ts`
  - Define `DEFAULT_CHEATSHEET_CONFIG`, `PYTHON_CHEATSHEET_CONFIG`, `GIT_CHEATSHEET_CONFIG`, `MATH_CHEATSHEET_CONFIG`.

---

### 🟩 Phase 2: Core Cheatsheet Engine & PDF Generation (Seam 1)
- [x] **Task 2.1: Implement Markdown Parsing & Sanitization (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `renderMarkdownToHtml()` transforms Markdown into sanitized HTML with code blocks, tables, and lists.
  - **Implementation (Green)**: Implement `renderMarkdownToHtml()` using `marked` and DOMPurify in `engine.ts`.
- [x] **Task 2.2: Implement Multi-Column Preview HTML Formatter (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateCheatsheetPreviewHtml()` outputs container with proper CSS `column-count`, `column-gap`, and styling rules.
  - **Implementation (Green)**: Implement preview HTML wrapper in `engine.ts`.
- [x] **Task 2.3: Implement Vector jsPDF Cheatsheet Builder (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateCheatsheetPdf()` produces valid multi-column jsPDF instance for A4/Letter in portrait/landscape.
  - **Implementation (Green)**: Implement vector PDF generator in `engine.ts`.
- [x] **Task 2.4: Implement PDF Blob Exporter (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `exportCheatsheetPdfBlob()` returns non-empty `application/pdf` Blob.
  - **Implementation (Green)**: Implement Blob exporter in `engine.ts`.

---

### 🟩 Phase 3: Angular Standalone Component UI & Signals (Seam 2)
- [x] **Task 3.1: Component Layout & State Signals (Red → Green)**
  - **Test (Red)**: In `markdown-cheatsheet.component.spec.ts`, assert:
    - Component initializes with default markdown content and live HTML preview.
    - Changing columns, paper size, orientation, and font size updates preview reactively.
    - Applying presets (Python, Git, Math) populates editor with corresponding content.
    - Inserting snippets (Table, Code block, Callout) appends markup to editor.
    - LocalStorage persists draft and restores it on initialization.
  - **Implementation (Green)**: Build `MarkdownCheatsheetComponent`.
- [x] **Task 3.2: Export, Download & Print Actions (Red → Green)**
  - **Test (Red)**: In `markdown-cheatsheet.component.spec.ts`, assert:
    - "Download PDF" triggers file download and immediately revokes Object URL.
    - "Copy HTML" writes rendered HTML to clipboard.
  - **Implementation (Green)**: Wire export handlers and clipboard copy.

---

### 🟩 Phase 4: Privacy Guard Verification (Seam 2)
- [x] **Task 4.1: Zero Network Leakage (Red → Green)**
  - **Test (Red)**: In `markdown-cheatsheet.component.spec.ts`, spy on `fetch` and `XMLHttpRequest.prototype.open`, run edits, preset loading, and PDF exports, and assert 0 network calls occurred.
  - **Implementation (Green)**: Verify 100% offline isolation.

---

### 🟩 Phase 5: Tool Registry, Routing & Platform Integration (Seam 3)
- [x] **Task 5.1: Register Tool in Tool Registry (Red → Green)**
  - Create `src/app/tools/documents/markdown-cheatsheet/index.ts` and add `markdownCheatsheetTool` to `TOOL_REGISTRY`.
- [x] **Task 5.2: Configure Route in `app.routes.ts`**
  - Add `/tools/markdown-cheatsheet` (and aliases) with complete SEO metadata.
- [x] **Task 5.3: Update Home Catalog & Specs Roadmap**
  - Add `markdown-cheatsheet` to `home.ts` catalog with status `'ready'`.
  - Mark Spec 19 as `[x]` in `specs/README.md`.

---

### 🟩 Phase 6: Final Verification & Build
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Run production build check: `npm run build` (0 errors, 0 budget warnings).
