# Task List (TDD Vertical Slices): CSV / Excel to JSON, SQL & Markdown Converter

> **Tool**: `03 - CSV - Excel to JSON, SQL & Markdown Converter`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Dependencies, Domain Contracts & Test Fixtures
- [x] **Task 1.1: Install Parser Libraries**
  - Install `papaparse`, `@types/papaparse`, and `xlsx`.
- [x] **Task 1.2: Define Domain Types**
  - Path: `src/app/tools/dev/csv-converter/types.ts`
  - Define `ParsedTable`, `OutputFormat`, `JsonFormatOptions`, `SqlFormatOptions`, `MarkdownFormatOptions`, `SqlDialect`.
- [x] **Task 1.3: Create Tabular Test Fixtures**
  - Path: `src/app/tools/dev/csv-converter/test-fixtures.ts`
  - Define test fixtures: simple CSV, CSV with quoted commas/newlines, TSV data, and expected JSON, SQL, and Markdown outputs.

---

### 🟩 Phase 2: Engine — CSV Parsing & Delimiter Detection (Seam 1)
- [x] **Task 2.1: Parse CSV & TSV Strings (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `parseCsv()` correctly parses standard comma-delimited strings, tabs, and semicolon formats into `ParsedTable`.
  - **Implementation (Green)**: Implement `parseCsv()` in `engine.ts` using `PapaParse`.
- [x] **Task 2.2: Handle Quoted Commas, Newlines & Escaped Quotes (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert values containing commas, internal line breaks, and quotes (`"Hello, world"`, `"Line 1\nLine 2"`) parse accurately into table cells.
  - **Implementation (Green)**: Ensure proper PapaParse configuration.

---

### 🟩 Phase 3: Engine — Code Generation (JSON, SQL, Markdown) (Seam 1)
- [x] **Task 3.1: Table to JSON Generation (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `tableToJson()` formats table as array of objects and supports minified vs indented output.
  - **Implementation (Green)**: Implement `tableToJson()` in `engine.ts`.
- [x] **Task 3.2: Table to SQL INSERT Statements (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `tableToSql()` generates valid `INSERT INTO table_name (columns) VALUES (...)`, with automatic type detection (`NULL`, numeric, boolean, quoted string with `'` escaping).
  - **Implementation (Green)**: Implement `tableToSql()` in `engine.ts`.
- [x] **Task 3.3: Table to GitHub-Flavored Markdown (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `tableToMarkdown()` outputs valid markdown tables with headers, separator row with alignment (`:---`, `:---:`, `---:`), and pipe escaping.
  - **Implementation (Green)**: Implement `tableToMarkdown()` in `engine.ts`.

---

### 🟩 Phase 4: Engine — Excel Parsing (Seam 1)
- [x] **Task 4.1: Parse Excel Workbook ArrayBuffer (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `parseExcel()` extracts sheet data into `ParsedTable`.
  - **Implementation (Green)**: Implement `parseExcel()` in `engine.ts` using `xlsx`.

---

### 🟩 Phase 5: Angular Standalone Component UI & Signals (Seam 2)
- [x] **Task 5.1: File Upload & Text Paste Input Handling (Red → Green)**
  - **Test (Red)**: In `csv-converter.component.spec.ts`, assert:
    - Component initializes with sample tabular data or empty state.
    - Dropping a `.csv` or `.xlsx` file populates parsed table data.
    - Pasting text directly in textarea triggers automatic parsing.
  - **Implementation (Green)**: Build `CsvConverterComponent` with Signals and BEM template.
- [x] **Task 5.2: Output Format Tabs & Real-Time Options (Red → Green)**
  - **Test (Red)**: In `csv-converter.component.spec.ts`, assert switching tabs between JSON, SQL, and Markdown updates output preview, and changing SQL table name or JSON indent updates output.
  - **Implementation (Green)**: Implement tab switching and reactive options panel.

---

### 🟩 Phase 6: Actions, Downloads & Memory Hygiene (Seam 2)
- [x] **Task 6.1: Copy to Clipboard & Single-Click Downloads (Red → Green)**
  - **Test (Red)**: In `csv-converter.component.spec.ts`, assert:
    - "Copy to Clipboard" writes formatted output to clipboard.
    - "Download" generates `.json`, `.sql`, or `.md` file, triggers download, and revokes object URLs.
  - **Implementation (Green)**: Implement download and copy handlers in component.

---

### 🟩 Phase 7: Privacy Guard (Seam 2)
- [x] **Task 7.1: Zero Network Exfiltration Verification (Red → Green)**
  - **Test (Red)**: In `csv-converter.component.spec.ts`, spy on `fetch` and `XMLHttpRequest.prototype.open`, run file parse and export, and assert 0 network calls occurred.
  - **Implementation (Green)**: Verify zero network calls.

---

### 🟩 Phase 8: Tool Registry & Routing (Seam 3)
- [x] **Task 8.1: Register Tool in Tool Registry (Red → Green)**
  - Create `src/app/tools/dev/csv-converter/index.ts` and add `csvConverterTool` to `TOOL_REGISTRY`.
- [x] **Task 8.2: Register Lazy Route in `app.routes.ts`**
  - Add `/tools/csv-to-sql-json` with SEO metadata.
- [x] **Task 8.3: Update Home Catalog & Specs Roadmap**
  - Set status to `'ready'` in `home.ts` and mark Spec 03 as `[x]` in `specs/README.md`.

---

### 🟩 Phase 9: Final Quality & Build Verification
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Run production build check: `npm run build` (0 errors, 0 warnings).
