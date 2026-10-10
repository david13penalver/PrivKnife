# Test-Driven Development (TDD) Implementation Plan: CSV / Excel to JSON, SQL & Markdown Converter

> **Tool**: `03 - CSV - Excel to JSON, SQL & Markdown Converter`  
> **Route**: `/tools/csv-to-sql-json`  
> **Category**: `dev`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (Red → Green → Refactor)

---

## 1. Architecture & Domain Overview

The **CSV / Excel to JSON, SQL & Markdown Converter** transforms tabular files (`.csv`, `.tsv`, `.xlsx`, `.xls`) and pasted tabular text into structured code outputs (**JSON**, **SQL INSERT**, and **GitHub-Flavored Markdown Tables**) 100% inside the browser with zero backend ingestion.

In strict adherence to **`AGENTS.md` Directives**:
- **Directive 1 (Zero Server Ingestion)**: Files and pasted text are parsed and converted purely client-side. No remote API calls.
- **Directive 2 (Zero Telemetry)**: No analytics, logging, or exfiltration of tabular data.
- **Directive 3 (Main UI Thread Protection)**: Parsing is asynchronous and non-blocking.
- **Directive 4 (Strict Memory Hygiene)**: Object URLs created for downloads are revoked immediately upon use or component destruction.
- **Directive 5 (Lazy Loading)**: Dynamic import in `app.routes.ts` ensures zero initial bundle bloat.

### Directory Layout (`src/app/tools/dev/csv-converter/`)
```
src/app/tools/dev/csv-converter/
├── index.ts                         # Tool registry definition and metadata
├── types.ts                         # Domain contracts and conversion options
├── test-fixtures.ts                 # Independent tabular data test vectors
├── engine.ts                        # Pure tabular parser and code generators (CSV, JSON, SQL, Markdown)
├── engine.spec.ts                   # Unit tests for pure conversion logic (Seam 1)
├── csv-converter.component.ts       # Angular Standalone Component with Signals & BEM
├── csv-converter.component.html     # Accessible UI template
├── csv-converter.component.scss     # Scoped component styles
└── csv-converter.component.spec.ts  # Component & Privacy Verification Tests (Seam 2)
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: `ConverterEngine` (Pure Parsing & Transformation Boundary — `engine.ts`)
- **Public Functions**:
  - `parseCsv(content: string, options?: CsvParseOptions): ParsedTable`
  - `parseExcel(buffer: ArrayBuffer): Promise<ParsedTable>`
  - `tableToJson(table: ParsedTable, options: JsonFormatOptions): string`
  - `tableToSql(table: ParsedTable, options: SqlFormatOptions): string`
  - `tableToMarkdown(table: ParsedTable, options: MarkdownFormatOptions): string`
- **What it catches**:
  - Delimiter auto-detection (comma, semicolon, tab).
  - Quotes, escapes, and multiline cell values.
  - SQL type inference (`INT`, `DECIMAL`, `BOOLEAN`, `VARCHAR`), SQL escaping (`'O''Reilly'`), table naming.
  - JSON formatting (Array of Objects vs 2D Array vs Key-Value, indentation options).
  - Markdown table alignment (left `:---`, center `:---:`, right `---:`) and cell pipe escaping.
- **What it misses**:
  - DOM events, Drag-and-drop file upload, Angular Signal reactivity, Clipboard API, and browser downloads.

### Seam 2: `CsvConverterComponent` (Angular UI & Interaction Boundary — `csv-converter.component.ts`)
- **Public Interface**:
  - Input mode: File upload (`<app-dropzone>`) vs Direct text/paste area.
  - Output mode: Tabs switching between JSON, SQL, and Markdown.
  - Live Paginated Table Preview: Table grid displaying parsed rows.
  - Options: Custom table name, SQL dialect, JSON indentation, Markdown alignment.
  - Actions: Copy to clipboard, Single-click file download (`.json`, `.sql`, `.md`).
- **What it catches**:
  - Signal state reactivity (`parsedTable`, `activeTab`, `options`, `isProcessing`).
  - Two-column responsive BEM layout.
  - Zero Network Exfiltration: Asserts 0 HTTP requests (`fetch` / `XMLHttpRequest`).
  - Memory Hygiene: Asserts `URL.revokeObjectURL()` called when downloading.
- **What it misses**:
  - Pure string conversion edge cases (covered by Seam 1).

### Seam 3: `ToolRegistry & AppRoutes` (Integration Boundary)
- **Public Interface**:
  - Tool definition registered in `TOOL_REGISTRY`.
  - Lazy route at `/tools/csv-to-sql-json` with SEO metadata.
  - Home page catalog status set to `ready`.
- **What it catches**:
  - Dynamic discovery, keyword search in catalog, router lazy loading.

---

## 3. Libraries & Dependencies

- **`papaparse` + `@types/papaparse`**: Industry standard, zero-dependency client-side CSV/TSV parser with robust quote and newline handling.
- **`xlsx` (SheetJS)**: Lightweight client-side Excel reader for `.xlsx` and `.xls` files from `ArrayBuffer`.
