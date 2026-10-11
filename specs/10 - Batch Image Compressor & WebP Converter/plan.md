# Architecture & TDD Plan: Batch Image Compressor & WebP Converter

> **Tool**: `10 - Batch Image Compressor & WebP Converter`  
> **Category**: `media`  
> **Route**: `/tools/batch-image-compressor` (and alias `/tools/image-compressor`)  
> **Architecture Rules**: 100% Client-Side, Zero Server Ingestion, Zero Telemetry, Standalone Angular Components, Signals Reactivity, BEM CSS, Strict Memory Hygiene, TDD.

---

## 1. Executive Summary & Deliverables

The **Batch Image Compressor & WebP Converter** delivers fast, client-side bulk image optimization and format conversion with zero uploads and zero size limits.
- **Input Formats**: PNG, JPEG/JPG, WebP, AVIF, GIF, BMP, SVG.
- **Target Formats**: Modern WebP (`image/webp`), Progressive JPEG (`image/jpeg`), Optimized PNG (`image/png`), or preserve original format.
- **Controls**:
  - Quality slider (1% to 100%, default 80%).
  - Maximum dimension resizing (Original / None, 3840px 4K, 1920px Full HD, 1280px HD, 800px Web, Custom max dimension).
  - Aspect ratio preservation and automatic metadata stripping.
- **Batch Processing & UI**:
  - Concurrency throttle (max 3 concurrent jobs) preventing tab memory crashes.
  - Interactive file queue list with thumbnails, status tags (`Queued`, `Processing`, `Done`, `Error`), original vs compressed sizes, and percentage reduction.
  - Interactive Before/After visual comparison using `<app-split-preview>`.
  - Batch summary stats ("Saved 14.2 MB (62%) across 18 files").
  - In-memory ZIP archive generation using `JSZip` for one-click "Download All (.zip)".
  - Immediate `URL.revokeObjectURL()` cleanup upon file removal, component unmount, and post-download.

---

## 2. Architecture & Seams Breakdown

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Tool Registry & Routing                       │
│    (src/app/tools/tool-registry.ts + src/app/app.routes.ts)            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Seam 3: Catalog & Route Integration)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    BatchCompressorComponent                            │
│     (src/app/tools/media/batch-compressor/batch-compressor.component.ts)│
│   - Split-screen / grid workspace with Drag & Drop ingestion           │
│   - Signals-driven batch queue & processing orchestration              │
│   - Integrated <app-split-preview> for before/after comparison         │
│   - Strict resource cleanup via ngOnDestroy & URL.revokeObjectURL()    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (Seam 2: Component UI & Signals)
┌───────────────────────────────────▼────────────────────────────────────┐
│                       Image Compressor Engine                          │
│     (src/app/tools/media/batch-compressor/engine.ts)                   │
│   - Pure Canvas API / OffscreenCanvas resizing & WebP/JPEG encoding    │
│   - Concurrency queue management (3-job throttle)                      │
│   - JSZip batch archive compilation                                    │
│   - Savings metrics & byte formatting calculations                     │
└────────────────────────────────────────────────────────────────────────┘
                                      (Seam 1: Pure Core Engine)
```

---

## 3. Test-Driven Development (TDD) Strategy

### Seam 1: Core Compressor Engine (`engine.spec.ts`)
- **Dimensions**:
  - `calculateTargetDimensions`: scale down when exceeding maxWidth/maxHeight, preserve aspect ratio, keep original if smaller.
- **Extension & MIME**:
  - `resolveTargetMimeType` and `getNewFileName`.
- **Single Compression**:
  - `compressImageBlob`: encodes to WebP/JPEG/PNG, calculates size reduction and percentage.
- **Batch Processing**:
  - `processBatchImages`: respects concurrency limit, invokes progress callbacks, processes all items.
- **ZIP Packaging**:
  - `createBatchZip`: generates valid ZIP archive Blob via `JSZip`.
- **Stats**:
  - `calculateBatchStats`: aggregates total original, compressed, saved bytes, and reduction percentage.

### Seam 2: Component UI & Signals (`batch-compressor.component.spec.ts`)
- Initial empty queue state with default compression settings (WebP, 80% quality).
- Ingesting files via `<app-dropzone>` populates the queue with thumbnails and file metadata.
- Changing target format, quality slider, and max dimension updates options reactively.
- "Compress All" triggers processing, updating file item statuses and generating savings stats.
- Before/After comparison modal or panel selects and displays active preview item.
- "Download All as ZIP" compiles ZIP, triggers download, and revokes object URL.
- Removing an item or clearing the queue disposes of object URLs.
- Privacy boundary: 0 network requests via `fetch` / `XMLHttpRequest`.

### Seam 3: Catalog & Routing
- Registration in `TOOL_REGISTRY`.
- Route `/tools/batch-image-compressor` (with alias `/tools/image-compressor`).
- Update `home.ts` status to `'ready'`.
