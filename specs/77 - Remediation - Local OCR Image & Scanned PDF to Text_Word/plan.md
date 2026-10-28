# Implementation Plan — Spec 77: Local OCR Image & Scanned PDF to Text/Word Remediation

> **Tool**: 47 (`local-ocr-text-extractor`)
> **Spec Reference**: [spec.md](file:///home/deivision/Projects/Programming/PrivKnife/specs/77%20-%20Remediation%20-%20Local%20OCR%20Image%20&%20Scanned%20PDF%20to%20Text_Word/spec.md)

---

## 1. Architecture & Impacted Files

| File Path | Action | Responsibility |
| :--- | :--- | :--- |
| [`src/app/tools/documents/local-ocr-text-extractor/types.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/types.ts) | **Modify** | Add worker request/response interfaces and optional custom recognizer seam for unit testing. |
| [`src/app/tools/documents/local-ocr-text-extractor/engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/engine.ts) | **Modify** | Remove the hardcoded `"PRIVACY-FIRST CLIENT-SIDE OCR EXTRACTED TEXT"` placeholder stub (`DEFECT-47-01`); implement `preprocessImageBuffer()` (`enhanceContrast`, `binarizeThreshold`, `DEFECT-47-02`); implement real client-side image OCR (local `tesseract.js` recognizer + built-in offline canvas glyph template recognizer for strict CSP / zero-network environments) and PDF text-layer / rasterized-page extraction (`pdfjs-dist` / stream decompression); add `createSampleReceiptImageBlob()`. |
| [`src/app/tools/documents/local-ocr-text-extractor/worker.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/worker.ts) | **Create** | Web Worker executing image preprocessing and OCR extraction off the Angular main thread (`DEFECT-47-03`). |
| [`src/app/tools/documents/local-ocr-text-extractor/local-ocr-text-extractor.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/local-ocr-text-extractor.component.ts) | **Modify** | Expose `enhanceContrast` switch, `binarizeThreshold` slider, and `"Load Sample Receipt"` button (`DEFECT-47-02`); remove unused `URL.createObjectURL` leak and reset stale state in `handleFileSelected()` (`DEFECT-47-03`); fix `390px`/`320px` horizontal overflow, `.c-input__control`, `.c-input__switch`, and `var(--color-*)` tokens (`DEFECT-47-04`, `DEFECT-47-05`). |
| [`src/app/tools/documents/local-ocr-text-extractor/engine.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/engine.spec.ts) | **Modify** | Add unit tests verifying real image OCR recognition on rendered canvas text (`"INVOICE #2026-047"`, `"ACME PRIVACY CORP"`), PDF extraction, `preprocessImageBuffer()` contrast/binarization math, and `.txt`/`.md`/`.docx` exports. |
| [`src/app/tools/documents/local-ocr-text-extractor/local-ocr-text-extractor.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/local-ocr-text-extractor.component.spec.ts) | **Modify** | Add unit tests for preprocessing UI controls, sample receipt loading, leak-free file selection state reset, and zero-network privacy assertions. |

---

## 2. Pre-Agreed Testing Seams

1. **Pure Image Preprocessing Seam (`preprocessImageBuffer`)**:
   - Operates directly on `{ data: Uint8ClampedArray, width: number, height: number }` with `{ enhanceContrast: boolean, binarizeThreshold: number }` so contrast stretching and luminance thresholding can be tested deterministically in Vitest without a DOM `<canvas>`.
2. **Offline Canvas Bitmap OCR Recognizer Seam (`recognizeTextFromImageBuffer`)**:
   - Because PrivKnife enforces `connect-src 'self' blob: data:` (blocking CDN downloads of external `.traineddata` language files at runtime), `engine.ts` provides a dual-path local recognizer:
     1. If a local `tesseract.js` worker/lang data or injectable recognizer seam is present, it uses it;
     2. Built-in deterministic client-side bitmap line/character segmentation + font-template correlation recognizer (`recognizeBitmapGlyphs`) that renders printable ASCII glyphs onto an offscreen reference atlas using system fonts (`monospace`, `sans-serif`, `serif`) and matches segmented character bounding boxes via normalized cross-correlation / zoning features—accurately reading any canvas-rendered or scanned printed English/Latin text (`INVOICE #2026-047`, `ACME PRIVACY CORP`, `TOTAL DUE: $1,700.00`) 100% offline with zero external network requests.
3. **PDF Text & Raster Extraction Seam (`extractPagesFromPdfBuffer`)**:
   - Extracts text streams from both uncompressed (`BT ... Tj / TJ ... ET`) and FlateDecode-compressed (`DecompressionStream('deflate')`) PDF content streams, and falls back to page rasterization + `recognizeTextFromImageBuffer` for image-only scanned PDFs.
4. **Worker Fallback Seam**:
   - If `typeof Worker === 'undefined'` (e.g., JSDOM unit tests), the component transparently executes `processLocalOcr()` in-process while still emitting progress updates.

---

## 3. TDD Vertical Slices

### Slice 1 — Image Preprocessing Pipeline (`DEFECT-47-02`)
- **Red**: Write unit test in `engine.spec.ts` verifying `preprocessImageBuffer()` stretches low-contrast gray pixels `[100..150]` to full `[0..255]` dynamic range when `enhanceContrast: true` and binarizes pixels around `binarizeThreshold` (`0` or `255`).
- **Green**: Implement `preprocessImageBuffer()` in `engine.ts` and invoke it during image OCR preprocessing.
- **Refactor**: Keep luminance math allocation-free on `Uint8ClampedArray`.

### Slice 2 — Real Client-Side Bitmap OCR & PDF Extraction (`DEFECT-47-01`)
- **Red**: Write unit tests in `engine.spec.ts` asserting that:
  - Rendering `"INVOICE #2026-047\nACME PRIVACY CORP\nTOTAL DUE: $1700.00"` into a bitmap / PNG and running `processLocalOcr()` extracts `"INVOICE #2026-047"`, `"ACME PRIVACY CORP"`, and `"1700.00"` with `confidence > 70` and never returns `"PRIVACY-FIRST CLIENT-SIDE OCR EXTRACTED TEXT"`.
  - Multi-page PDF buffers extract per-page text and word counts accurately.
- **Green**: Implement line segmentation, character bounding-box segmentation, reference glyph atlas correlation (`recognizeTextFromImageBuffer`), and compressed/uncompressed PDF stream extraction in `engine.ts`, removing the hardcoded placeholder stub.
- **Refactor**: Optimize glyph atlas caching so repeated OCR runs reuse the pre-computed glyph feature vectors in <15ms.

### Slice 3 — Web Worker, Leak Fix, Preprocessing Controls & Sample Receipt Loader (`DEFECT-47-02`, `DEFECT-47-03`)
- **Red**: Write component tests in `local-ocr-text-extractor.component.spec.ts` verifying:
  - Toggling `enhanceContrast` and adjusting `binarizeThreshold` updates signals and passes values to `processLocalOcr()`.
  - Clicking `"Load Sample Receipt"` loads a sample receipt file and populates extracted text.
  - `handleFileSelected()` does not create unused blob URLs and clears previous `extractedResult` and `previewText`.
- **Green**: Create `worker.ts`, update `local-ocr-text-extractor.component.ts` with the preprocessing controls, sample receipt button, state reset, and leak removal.
- **Refactor**: Ensure `ngOnDestroy` terminates any active worker and revokes export download URLs.

### Slice 4 — Mobile Overflow Fix (390px & 320px), BEM Form Classes & Theme Variables (`DEFECT-47-04`, `DEFECT-47-05`)
- **Red**: Write component tests asserting `.c-input__control`, `.c-input__switch`, and `.c-input__slider` classes are present on selects, checkboxes, and range inputs.
- **Green**: Replace `.c-input__select` with `.c-input__control`, `.c-checkbox-label` with `.c-input__switch`, add `min-width: 0; overflow-wrap: anywhere` to prevent horizontal scroll on `390px` and `320px` viewports, and replace all hardcoded hex colors with `var(--color-*)` tokens.
- **Refactor**: Run Vitest suite and headless Chrome verification across all three viewports (`1366×900`, `390×844`, `320×640`).
