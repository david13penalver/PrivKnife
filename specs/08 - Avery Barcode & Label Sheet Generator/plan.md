# Test-Driven Development (TDD) Implementation Plan: Avery Barcode & Label Sheet Generator

> **Tool**: `08 - Avery Barcode & Label Sheet Generator`  
> **Route**: `/tools/barcode-labels` (alias `/tools/avery-barcode-sheet`)  
> **Category**: `documents`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (Red → Green → Refactor)

---

## 1. Architecture & Domain Overview

The **Avery Barcode & Label Sheet Generator** enables small business owners, warehouse managers, and e-commerce merchants to design and print precision grid-aligned barcode sticker sheets (Avery 5160, 5163, 5167, L7160, and custom templates). Built with `JsBarcode`, `qrcode`, and `jsPDF`, it provides 100% client-side barcode generation, CSV batch importing, sequential numbering, and sub-millimeter print layout alignment with zero telemetry.

### Adherence to Core Directives:
- **Directive 1 (Zero Server Ingestion)**: 100% client-side barcode rendering and PDF generation. Zero inventory data transmitted externally.
- **Directive 2 (Zero Telemetry)**: Private product SKUs, pricing, and serial numbers remain confidential in local memory.
- **Directive 3 (Main UI Thread Protection)**: Fast synchronous canvas barcode rendering and debounced SVG/canvas preview updates.
- **Directive 4 (Strict Memory Hygiene)**: Explicit revocation of blob object URLs (`URL.revokeObjectURL()`).
- **Directive 5 (Lazy Loading)**: Dynamic Angular routing via `loadComponent`.

### Directory Layout (`src/app/tools/documents/barcode-labels/`)
```
src/app/tools/documents/barcode-labels/
├── index.ts                         # Tool registry definition and metadata
├── types.ts                         # Domain models (BarcodeSymbology, LabelTemplate, SheetConfig)
├── test-fixtures.ts                 # Preset label sheet specifications and test items
├── engine.ts                        # Barcode rendering, grid geometry & jsPDF compiler
├── engine.spec.ts                   # Unit tests for barcode generation & PDF alignment (Seam 1)
├── barcode-labels.component.ts      # Angular Standalone Component with Signals & BEM
├── barcode-labels.component.spec.ts # Component UI, CSV import & Privacy Tests (Seam 2)
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: `BarcodeLabelEngine` (Barcode Rendering & PDF Layout — `engine.ts`)
- **Public Functions**:
  - `generateBarcodeDataUri(value: string, symbology: BarcodeSymbology, options?: BarcodeRenderOptions): Promise<string>`
  - `calculateLabelPositions(template: LabelTemplate): LabelPosition[]`
  - `generateLabelSheetPdf(config: LabelSheetConfig): Promise<{ blob: Blob; buffer: Uint8Array; dataUri: string }>`
  - `generateSequenceItems(prefix: string, start: number, count: number, suffix?: string): LabelItem[]`
  - `parseCsvItems(csvText: string): LabelItem[]`
  - `getPresetTemplate(id: string): LabelTemplate`
- **What it catches**:
  - Barcode generation across Code128, EAN13, UPCA, Code39, and QR code.
  - Sub-millimeter label coordinates calculation (margins, horizontal/vertical pitches, columns × rows).
  - Proper handling of partial sheets / starting index offset.
  - PDF compilation matching exact physical paper dimensions (US Letter, A4).
- **What it misses**:
  - Angular reactive signals and live UI interactions.

### Seam 2: `BarcodeLabelsComponent` (Angular UI, Signals & Privacy Boundary — `barcode-labels.component.ts`)
- **Public Interface**:
  - Configurator Sidebar: Template preset selector (Avery 5160, 5163, 5167, L7160, custom), Symbology picker, Data mode (Single, Sequence, CSV/Batch).
  - Top & bottom label text inputs.
  - Start offset index selector (skip already peeled labels).
  - Margin & cut guide lines toggle.
  - Interactive 1:1 scale preview sheet.
  - Export: Download Print-Ready PDF with object URL cleanup, Print trigger.
  - Post-download modal with privacy verification.
- **What it catches**:
  - Signal reactivity (`config()`, `previewLabels()`, `isGenerating()`).
  - Strict Memory Hygiene: `URL.revokeObjectURL()` called when downloading.
  - Zero Network Requests: Spies verify 0 HTTP calls (`fetch` / `XMLHttpRequest`).
- **What it misses**:
  - Internal vector PDF byte layout (covered in Seam 1).

### Seam 3: `ToolRegistry & AppRoutes` (Integration Boundary)
- **Public Interface**:
  - Registered in `TOOL_REGISTRY`.
  - Lazy routes at `/tools/barcode-labels` and `/tools/avery-barcode-sheet`.
  - Catalog entry updated to `ready` in `home.ts`.
- **What it catches**:
  - Router lazy loading and SEO catalog discovery.
