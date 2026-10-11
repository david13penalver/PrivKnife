# Test-Driven Development (TDD) Implementation Plan: PDF Redaction & Anonymizer

> **Tool**: `05 - PDF Redaction & Anonymizer`  
> **Route**: `/tools/pdf-redaction`  
> **Category**: `privacy`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (Red → Green → Refactor)

---

## 1. Architecture & Domain Overview

The **PDF Redaction & Anonymizer** allows users to load sensitive documents (bank statements, W2 tax forms, legal contracts), draw blackout/whiteout redaction boxes over confidential areas, and export a **flattened sanitized PDF** where the redactions are permanently burned into the document and all underlying selectable vector text layers, bookmarks, and hidden metadata are completely destroyed.

### Adherence to Core Directives:
- **Directive 1 (Zero Server Ingestion)**: Uses `pdf-lib` for document inspection, canvas/vector rendering, and burning permanent opaque rectangles directly into the PDF page vector streams and rasterizing flattened layers.
- **Directive 2 (Zero Telemetry)**: Private tax documents, SSNs, and banking details are processed 100% in browser memory with zero network calls.
- **Directive 3 (Main UI Thread Protection)**: Async page processing and redaction burning.
- **Directive 4 (Strict Memory Hygiene)**: Explicit revocation of blob object URLs (`URL.revokeObjectURL()`) and disposal of canvas buffers.
- **Directive 5 (Lazy Loading)**: Dynamic Angular routing via `loadComponent`.

### Directory Layout (`src/app/tools/privacy/pdf-redaction/`)
```
src/app/tools/privacy/pdf-redaction/
├── index.ts                         # Tool registry definition and metadata
├── types.ts                         # Domain models, RedactionBox & SanitizationOptions
├── test-fixtures.ts                 # Synthetic PDF test generators with sensitive text
├── engine.ts                        # Pure client-side PDF redaction & flattening engine
├── engine.spec.ts                   # Unit tests for redaction burning & flattening (Seam 1)
├── pdf-redaction.component.ts       # Angular Standalone Component with Signals & BEM
├── pdf-redaction.component.html     # Redaction Editor UI template
├── pdf-redaction.component.scss     # Scoped component styles
└── pdf-redaction.component.spec.ts  # Component UI & Privacy Verification Tests (Seam 2)
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: `RedactionEngine` (Pure PDF Redaction & Flattening Boundary — `engine.ts`)
- **Public Functions**:
  - `loadPdfForRedaction(buffer: ArrayBuffer, fileName: string): Promise<RedactionDocument>`
  - `burnRedactions(buffer: ArrayBuffer, redactions: PageRedaction[]): Promise<Uint8Array>`
  - `flattenPdfPages(buffer: ArrayBuffer, redactions: PageRedaction[]): Promise<Uint8Array>`
- **What it catches**:
  - Drawing opaque blackout (`#000000`) or whiteout (`#FFFFFF`) boxes onto the PDF pages at exact coordinates.
  - Verification that redacted areas overlay the targeted coordinates.
  - Stripping of metadata (Author, Producer, Title, Subject, Keywords).
  - Empty or invalid input handling.
- **What it misses**:
  - Interactive mouse drag-and-drop bounding box creation on the canvas UI.

### Seam 2: `PdfRedactionComponent` (Angular UI & Interaction Boundary — `pdf-redaction.component.ts`)
- **Public Interface**:
  - Drag-and-drop PDF upload zone.
  - Page Navigation (Previous/Next page, page selector).
  - Redaction Tool Palette: Blackout mode vs Whiteout mode.
  - Interactive box addition: Adding redaction boxes, undoing last box, clearing page redactions.
  - Export: "Burn Redactions & Download" button generating clean sanitized PDF.
- **What it catches**:
  - Signal state reactivity (`activePage`, `redactions`, `isProcessing`, `zoom`).
  - Zero Network Exfiltration: Asserts 0 HTTP calls (`fetch` / `XMLHttpRequest`).
  - Memory Hygiene: Asserts `URL.revokeObjectURL()` called when downloading.
- **What it misses**:
  - Internal byte-level PDF rendering (covered by Seam 1).

### Seam 3: `ToolRegistry & AppRoutes` (Integration Boundary)
- **Public Interface**:
  - Tool definition registered in `TOOL_REGISTRY`.
  - Lazy route at `/tools/pdf-redaction` with SEO metadata.
  - Home catalog status set to `ready`.
- **What it catches**:
  - Router lazy loading and SEO catalog discovery.
