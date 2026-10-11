# Test-Driven Development (TDD) Implementation Plan: Custom Printable Graph & Dot Grid Paper

> **Tool**: `07 - Custom Printable Graph & Dot Grid Paper`  
> **Route**: `/tools/grid-paper` (alias `/tools/graph-dot-grid-paper`)  
> **Category**: `documents`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (Red → Green → Refactor)

---

## 1. Architecture & Domain Overview

The **Custom Printable Graph & Dot Grid Paper** tool provides an instant in-browser generator for vector-sharp printable paper templates (Dot Grid, Square Graph, Isometric, Hexagonal, and Ruled/Lined). It operates 100% in client memory using `jsPDF` for native vector drawing paths (`doc.line()`, `doc.circle()`) targeting 300+ DPI print output without server roundtrips, tracking, or file limits.

### Adherence to Core Directives:
- **Directive 1 (Zero Server Ingestion)**: Native vector geometry compiled entirely in browser via `jsPDF` and SVG preview.
- **Directive 2 (Zero Telemetry)**: Absolute privacy. Zero analytics or server calls.
- **Directive 3 (Main UI Thread Protection)**: Fast math calculation and debounced live SVG rendering.
- **Directive 4 (Strict Memory Hygiene)**: Explicit revocation of blob object URLs (`URL.revokeObjectURL()`).
- **Directive 5 (Lazy Loading)**: Standalone Angular Component lazy-loaded via `loadComponent`.

### Directory Layout (`src/app/tools/documents/grid-paper/`)
```
src/app/tools/documents/grid-paper/
├── index.ts                      # Tool registry definition and metadata
├── types.ts                      # Domain models (PaperOptions, GridStyle, Presets)
├── test-fixtures.ts              # Preset paper configurations for tests
├── engine.ts                     # Vector math calculations, SVG preview & jsPDF generator
├── engine.spec.ts                # Unit tests for geometry, bounding & PDF vectors (Seam 1)
├── grid-paper.component.ts       # Angular Standalone Component with Signals & BEM
├── grid-paper.component.spec.ts  # Component UI, LocalStorage & Privacy Tests (Seam 2)
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: `GridPaperEngine` (Vector Calculation & Document Generation — `engine.ts`)
- **Public Functions**:
  - `calculateGridGeometry(options: GridPaperOptions): GridGeometry`
  - `generatePaperSvg(options: GridPaperOptions): string`
  - `generatePaperPdf(options: GridPaperOptions): Promise<{ blob: Blob; buffer: Uint8Array; dataUri: string }>`
  - `getPaperDimensionsMm(size: PaperSize, orientation: PaperOrientation, custom?: { width: number; height: number }): { width: number; height: number }`
  - `createDefaultOptions(): GridPaperOptions`
- **What it catches**:
  - Coordinate conversions (mm / inches to PDF points).
  - Strict margin truncation (preventing dots or lines bleeding outside specified margins).
  - Accuracy for different grid styles: dot grid, square graph with major accent lines, isometric 60° lines, hexagonal tiles, ruled lines.
  - Native vector PDF generation using `jsPDF` (`line()`, `circle()`).
- **What it misses**:
  - Angular reactive signals and live UI interactions.

### Seam 2: `GridPaperComponent` (Angular UI, LocalStorage & Privacy Boundary — `grid-paper.component.ts`)
- **Public Interface**:
  - Control Sidebar: grid style selection, paper size, orientation, spacing slider, stroke opacity, line weight, color presets, margins, and major line accents.
  - Live SVG preview container simulating page aspect ratio with 60 FPS performance.
  - Preset picker ("Bullet Journal A5", "Engineering Graph A4", "Isometric 3D", "Lined Notebook").
  - Download PDF button with object URL revocation.
  - Download SVG button for cutting plotters / CAD.
  - LocalStorage auto-save & recovery.
  - Zero network exfiltration verification.
- **What it catches**:
  - Signal reactivity (`options()`, `previewSvg()`, `isGenerating()`).
  - Strict Memory Hygiene: `URL.revokeObjectURL()` called when downloading.
  - Zero Network Requests: Spies verify 0 HTTP calls (`fetch` / `XMLHttpRequest`).
- **What it misses**:
  - Low-level vector PDF byte layout (covered in Seam 1).

### Seam 3: `ToolRegistry & AppRoutes` (Integration Boundary)
- **Public Interface**:
  - Registered in `TOOL_REGISTRY`.
  - Lazy routes at `/tools/grid-paper` and `/tools/graph-dot-grid-paper`.
  - Catalog entry updated to `ready` in `home.ts`.
- **What it catches**:
  - Router lazy loading and SEO catalog discovery.
