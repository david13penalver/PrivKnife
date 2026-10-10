# Test-Driven Development (TDD) Implementation Plan: PDF Merger, Splitter & Page Organizer

> **Tool**: `04 - PDF Merger, Splitter & Page Organizer`  
> **Route**: `/tools/pdf-merger-splitter`  
> **Category**: `documents`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (Red → Green → Refactor)

---

## 1. Architecture & Domain Overview

The **PDF Merger, Splitter & Page Organizer** enables users to combine multiple PDF documents, rearrange pages, delete unwanted pages, rotate pages (90°, 180°, 270°), extract page ranges, and export a clean consolidated PDF document—100% locally in browser memory without sending a single byte across the network.

### Adherence to Core Directives:
- **Directive 1 (Zero Server Ingestion)**: Uses `pdf-lib` for reading, combining, deleting, rotating, and compiling PDF buffers purely in browser memory.
- **Directive 2 (Zero Telemetry)**: Confidential documents, invoices, and bank statements remain strictly on the user's machine.
- **Directive 3 (Main UI Thread Protection)**: Multi-page document loading and compilation run asynchronously with progress indicators.
- **Directive 4 (Strict Memory Hygiene)**: Object URLs created for download anchors are immediately revoked (`URL.revokeObjectURL()`). Clean up array buffers and component states on reset or unmount.
- **Directive 5 (Lazy Loading)**: Standalone Angular component loaded dynamically via `loadComponent` in `app.routes.ts`.

### Directory Layout (`src/app/tools/documents/pdf-merger/`)
```
src/app/tools/documents/pdf-merger/
├── index.ts                         # Tool registry definition and metadata
├── types.ts                         # Domain contracts, page descriptor & action options
├── test-fixtures.ts                 # Programmatically created valid test PDFs
├── engine.ts                        # Pure client-side PDF assembly, rotation & merge engine
├── engine.spec.ts                   # Unit tests for pdf-lib manipulation (Seam 1)
├── pdf-merger.component.ts          # Angular Standalone Component with Signals & BEM
├── pdf-merger.component.html        # Interactive Page Grid & Toolbar template
├── pdf-merger.component.scss        # Scoped component styles
└── pdf-merger.component.spec.ts     # Component UI & Privacy Verification Tests (Seam 2)
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: `PdfEngine` (Pure Assembly & PDF Manipulation Boundary — `engine.ts`)
- **Public Functions**:
  - `loadPdfDocument(buffer: ArrayBuffer, fileName: string): Promise<LoadedPdfDocument>`
  - `assemblePdf(pages: DocumentPage[]): Promise<Uint8Array>`
  - `rotatePage(page: DocumentPage, degrees: 90 | 180 | 270): DocumentPage`
- **What it catches**:
  - Accurate extraction of page count and dimensions.
  - Correct copying and merging of pages from different source PDFs into a single target document.
  - Page rotation applied without corrupting document structure.
  - Empty or invalid input handling.
- **What it misses**:
  - Drag-and-drop grid interaction, DOM events, UI badges, and file downloads.

### Seam 2: `PdfMergerComponent` (Angular UI & Interaction Boundary — `pdf-merger.component.ts`)
- **Public Interface**:
  - Multi-file dropzone (`.pdf`).
  - Page Grid: Shows page thumbnails/cards with page index, source file, rotation, delete button, and move left/right buttons.
  - Bulk Actions Toolbar: "Rotate All", "Clear All", "Select / Invert Selection", "Delete Selected".
  - Export: "Merge & Download PDF" button generating the finalized `.pdf`.
- **What it catches**:
  - Signals state reactivity (`loadedDocuments`, `pages`, `isProcessing`, `exportProgress`).
  - User operations (reorder page, rotate page, delete page).
  - Zero Network Exfiltration: Asserts 0 HTTP calls (`fetch` / `XMLHttpRequest`).
  - Memory Hygiene: Asserts `URL.revokeObjectURL()` called when downloading.
- **What it misses**:
  - Internal byte-level PDF structure (covered by Seam 1).

### Seam 3: `ToolRegistry & AppRoutes` (Integration Boundary)
- **Public Interface**:
  - Tool definition registered in `TOOL_REGISTRY`.
  - Lazy route at `/tools/pdf-merger-splitter` with SEO metadata.
  - Home page catalog status set to `ready`.
- **What it catches**:
  - Dynamic discovery, keyword search, route navigation.

---

## 3. Libraries

- **`pdf-lib`**: Zero-dependency, lightweight, high-performance client-side library for reading, copying, rotating, and saving PDF documents.
