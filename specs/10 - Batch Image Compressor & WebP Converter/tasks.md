# Task List (TDD Vertical Slices): Batch Image Compressor & WebP Converter

> **Tool**: `10 - Batch Image Compressor & WebP Converter`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Domain Contracts & Test Fixtures Setup
- [x] **Task 1.1: Define Domain Types**
  - Path: `src/app/tools/media/batch-compressor/types.ts`
  - Define `OutputFormat`, `ResizePreset`, `CompressionOptions`, `QueueItemStatus`, `ImageQueueItem`, `BatchCompressionStats`.
- [x] **Task 1.2: Create Programmatic Test Fixtures**
  - Path: `src/app/tools/media/batch-compressor/test-fixtures.ts`
  - Define sample image blobs, test options presets, and mock queue items.

---

### 🟩 Phase 2: Core Compression & ZIP Engine (Seam 1)
- [x] **Task 2.1: Implement Dimension & MIME Calculation (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `calculateTargetDimensions()`, `resolveTargetMimeType()`, and `getNewFileName()`.
  - **Implementation (Green)**: Implement helpers in `engine.ts`.
- [x] **Task 2.2: Implement Image Compressor & Memory Metrics (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `compressImageBlob()` converts to target format and calculates byte savings.
  - **Implementation (Green)**: Implement `compressImageBlob()` in `engine.ts`.
- [x] **Task 2.3: Implement Concurrency-Throttled Batch Processor (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `processBatchImages()` processes multiple items with progress callbacks.
  - **Implementation (Green)**: Implement batch processor with concurrency pool in `engine.ts`.
- [x] **Task 2.4: Implement JSZip Batch Packaging (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `createBatchZip()` creates valid ZIP Blob with all processed images.
  - **Implementation (Green)**: Implement `createBatchZip()` using `JSZip`.

---

### 🟩 Phase 3: Angular Standalone Component UI & Signals (Seam 2)
- [x] **Task 3.1: Component Layout & State Signals (Red → Green)**
  - **Test (Red)**: In `batch-compressor.component.spec.ts`, assert:
    - Initial empty queue state with default WebP format and 80% quality.
    - Dropping files adds items to queue and generates preview URLs.
    - Controls update quality, format, and max dimensions.
  - **Implementation (Green)**: Build `BatchCompressorComponent` with dropzone, options bar, and queue list.
- [x] **Task 3.2: Batch Execution & Split Comparison (Red → Green)**
  - **Test (Red)**: In `batch-compressor.component.spec.ts`, assert:
    - Clicking "Compress All" runs compression across queue items and computes total savings.
    - Selecting an item displays Before/After split preview.
  - **Implementation (Green)**: Wire batch runner and `<app-split-preview>`.

---

### 🟩 Phase 4: Export, Download & Memory Hygiene (Seam 2)
- [x] **Task 4.1: Single & ZIP Downloads with URL Revocation (Red → Green)**
  - **Test (Red)**: In `batch-compressor.component.spec.ts`, assert:
    - Single download clicks anchor and immediately revokes object URL.
    - "Download All as ZIP" compiles ZIP, triggers download, and immediately revokes object URL.
    - Removing items or unmounting (`ngOnDestroy`) revokes all active preview object URLs.
  - **Implementation (Green)**: Implement download triggers and lifecycle cleanup.

---

### 🟩 Phase 5: Privacy Guard Verification (Seam 2)
- [x] **Task 5.1: Zero Network Leakage (Red → Green)**
  - **Test (Red)**: In `batch-compressor.component.spec.ts`, spy on `fetch` and `XMLHttpRequest.prototype.open`, run batch compression, and assert 0 network calls occurred.
  - **Implementation (Green)**: Verify 100% offline isolation.

---

### 🟩 Phase 6: Tool Registry, Routing & Platform Integration (Seam 3)
- [x] **Task 6.1: Register Tool in Tool Registry (Red → Green)**
  - Create `src/app/tools/media/batch-compressor/index.ts` and add `batchImageCompressorTool` to `TOOL_REGISTRY`.
- [x] **Task 6.2: Configure Route in `app.routes.ts`**
  - Add `/tools/batch-image-compressor` (and alias `/tools/image-compressor`) with complete SEO metadata.
- [x] **Task 6.3: Update Home Catalog & Specs Roadmap**
  - Update `home.ts` status to `'ready'` with link to `/tools/batch-image-compressor`.
  - Mark Spec 10 as `[x]` in `specs/README.md`.

---

### 🟩 Phase 7: Final Verification & Build
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Run production build check: `npm run build` (0 errors, 0 warnings).
