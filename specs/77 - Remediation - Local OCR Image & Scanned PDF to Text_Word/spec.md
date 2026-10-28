# Spec 77 — Remediation: Local OCR Image & Scanned PDF to Text/Word

> **Tool Number**: 47
> **Tool Slug**: `local-ocr-text-extractor`
> **Category**: `documents`
> **Route**: `/tools/local-ocr-text-extractor`
> **Original Spec**: [specs/47 - Local OCR Image & Scanned PDF to Text_Word/spec.md](file:///home/deivision/Projects/Programming/PrivKnife/specs/47%20-%20Local%20OCR%20Image%20&%20Scanned%20PDF%20to%20Text_Word/spec.md)
> **Audit Reference**: [tools_31_60_audit.md — Tool 47](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-47)
> **Remediation Priority**: `Critical`
> **Overall Audit Status**: `❌ Broken` (Functional: `❌ Broken` | Mobile: `⚠️ Minor issues`)

---

## 1. Executive Summary & Audit Baseline

### 1.1 Current State & What Works
The **Local OCR Image & Scanned PDF to Text/Word** tool (`local-ocr-text-extractor`) renders cleanly on desktop with zero external network requests (`networkRequests: []`). Post-processing text cleaning (`cleanExtractedText`: hyphenated line-break unwrapping and tabular multi-space-to-tab conversion) and the three export deliverable builders (`buildTxtDeliverable`, `buildMarkdownDeliverable`, and `buildDocxDeliverable` generating valid OpenXML `.docx` archives via `JSZip` with `[Content_Types].xml`, `_rels/.rels`, and `word/document.xml`) work properly on whatever text string is passed to them.

### 1.2 Why Remediation Is Required
The core Optical Character Recognition engine is completely unimplemented (stubbed), earning a **`❌ Broken` (`Critical`)** audit rating:
1. **Fake Hardcoded OCR Placeholder Output (`DEFECT-47-01`, Critical)**: Neither `tesseract.js` nor `pdfjs-dist` is integrated. `processLocalOcr()` (`engine.ts#L248-L285`) decodes the binary file buffer as UTF-8, runs a naive regex `/\(([^()]+)\)\s*Tj/g`, and for every image (`invoice-scan.png`) and real/scanned PDF returns a hardcoded placeholder string (`"PRIVACY-FIRST CLIENT-SIDE OCR EXTRACTED TEXT\nDocument: ...\nThe requested document was analyzed 100% locally in your browser..."`) with a fake hardcoded `confidence: 96`. Uploading an image containing `"INVOICE #2026-047 / ACME PRIVACY CORP"` extracted `0` words from the image (`containsInvoiceNum: false`, `containsAcme: false`, `isPlaceholderStub: true`).
2. **Unwired Image Preprocessing Signals (`binarizeThreshold`, `enhanceContrast`) & Missing Sample Document Button (`DEFECT-47-02`, Medium)**: Signals `binarizeThreshold = signal<number>(128)` and `enhanceContrast = signal<boolean>(true)` (`local-ocr-text-extractor.component.ts#L341-L342`) are validated in `validateOcrOptions()` (`engine.ts#L44-L54`), but have no UI controls in the template and perform zero image preprocessing in `engine.ts`. Furthermore, `SAMPLE_SCANNED_RECEIPT_TEXT` in `test-fixtures.ts` is never exposed via a `"Load Sample Receipt"` button in the UI.
3. **Missing Web Worker, Unused Blob URL Memory Leak & Stale State on Re-Upload (`DEFECT-47-03`, Medium)**: No Web Worker (`worker.ts`) exists for OCR / PDF page rasterization (`Directive 3`). Additionally, `handleFileSelected()` (`local-ocr-text-extractor.component.ts#L387-L388`) calls `URL.createObjectURL(file)` and pushes it to `createdBlobUrls` even though no preview URL is ever used (`Directive 4`), and does not reset `extractedResult` / `previewText` when a new file is selected.
4. **Horizontal Overflow on Both 390px and 320px Viewports & Non-Standard Form Classes (`DEFECT-47-04`, Medium)**: At `390×844` (`scrollWidth: 421px`) and `320×640` (`scrollWidth: 420px`), `<h1 class="c-header__title">Local OCR Image & Scanned PDF to Text & Word</h1>` overflows horizontally (`hasHorizontalScroll: true`). Also, `<select class="c-input__select">` uses non-existent `.c-input__select` (`21px` tall) instead of `.c-input__control`, and checkboxes use `.c-checkbox-label` (`13×13px`) instead of `.c-input__switch`.
5. **Hardcoded Light-Mode Hex Colors (`DEFECT-47-05`, Low)**: Component styles (`#L278-L332`) hardcode `#334155`, `#065f46`, `#cbd5e1`, `#f8fafc`, `#0f172a`, `#94a3b8`, and `#64748b` instead of `var(--color-*)` tokens.

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-47-01` — Stubbed OCR Engine Returning Hardcoded Boilerplate Instead of Extracting Text from Images & PDFs
- **Severity**: `Critical`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**:
  - [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/engine.ts#L229-L363)
- **Audit Evidence**:
  - `extractEmbeddedReadableStrings()` (`#L248-L285`) decodes the raw `Uint8Array` as UTF-8, extracts literal PDF `(text) Tj` tokens if present in uncompressed ASCII PDF fixtures, and otherwise returns:
    ```
    PRIVACY-FIRST CLIENT-SIDE OCR EXTRACTED TEXT
    Document: invoice-scan.png
    Language Model: ENG
    The requested document was analyzed 100% locally in your browser.
    Total Payload Size: 20714 bytes.
    ```
  - Confidence is hardcoded to `96` (`const confidence = 96;` at `#L323`).
  - When tested in headless Chrome with `invoice-scan.png` containing `"INVOICE #2026-047"`, `"ACME PRIVACY CORP"`, and `"TOTAL DUE: $1,700.00"`, none of the text in the image was extracted.
- **Root Cause**: The initial implementation bypassed real optical character recognition and PDF page rendering so unit tests passing ASCII strings inside `new Blob(['BT (Text) Tj ET'])` would pass without loading an OCR engine.
- **Required Fix**:
  1. Implement genuine client-side OCR and PDF extraction in [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/engine.ts):
     - For **PDF inputs** (`application/pdf` or `%PDF-` header): parse pages via `pdfjs-dist` (or decompressed stream parser + canvas page renderer), extract embedded text content items with layout positioning (`transform[4]`, `transform[5]`), and if a page has no embedded text layer (scanned image PDF), rasterize the page to a canvas and run the client-side OCR recognizer on the rasterized bitmap.
     - For **Image inputs** (`PNG`, `JPG`, `WEBP`, `BMP`): decode the image to a canvas, preprocess it (`preprocessOcrImageData`), and run the client-side OCR recognizer (`tesseract.js` local WASM worker when available + built-in offline bitmap glyph/character matrix recognizer capable of recognizing rendered Latin/numeric/punctuation typography in canvas bitmaps with zero external network fetches under `connect-src 'self' blob: data:`).
  2. Compute genuine per-page confidence scores (`0–100`) and word counts based on recognized character/word confidences, never returning hardcoded boilerplate text.

---

### `DEFECT-47-02` — Unwired Image Preprocessing (`binarizeThreshold`, `enhanceContrast`) & Missing Sample Receipt Loader
- **Severity**: `Medium`
- **Category**: `Spec Conformance` / `Engine Logic`
- **Location**:
  - [`local-ocr-text-extractor.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/local-ocr-text-extractor.component.ts#L341-L342)
  - [`local-ocr-text-extractor.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/local-ocr-text-extractor.component.ts#L425-L426)
  - [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/engine.ts#L44-L54)
- **Audit Evidence**:
  - `binarizeThreshold = signal<number>(128)` and `enhanceContrast = signal<boolean>(true)` exist on the component class and are passed into `processLocalOcr()`, which validates `binarizeThreshold` in `validateOcrOptions()`, and then completely ignores both options.
  - Neither `binarizeThreshold` nor `enhanceContrast` has a UI control in the template.
  - No `"Load Sample Receipt"` button is available in the UI.
- **Root Cause**: Preprocessing pipeline was planned in `types.ts` and `validateOcrOptions()` but omitted from `engine.ts` and the template.
- **Required Fix**:
  - Implement `preprocessImageBuffer(data: Uint8ClampedArray, width: number, height: number, options: { enhanceContrast: boolean; binarizeThreshold: number })` in [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/engine.ts) performing histogram contrast stretching (`enhanceContrast`) and grayscale luminance binarization (`luminance >= binarizeThreshold ? 255 : 0`) prior to OCR recognition.
  - Expose an `Enhance Contrast` `.c-input__switch` toggle and a `Binarize Threshold (0–255)` `.c-input__slider` range input in [`local-ocr-text-extractor.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/local-ocr-text-extractor.component.ts), plus a `"Load Sample Receipt"` button that generates a canvas-rendered sample receipt image and extracts its text.

---

### `DEFECT-47-03` — Missing Web Worker, Leaked Unused Object URL in `handleFileSelected()`, and Stale Result State
- **Severity**: `Medium`
- **Category**: `Web Worker & Performance` / `Memory Hygiene`
- **Location**:
  - [`local-ocr-text-extractor.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/local-ocr-text-extractor.component.ts#L382-L435)
- **Audit Evidence**:
  - Lines 387–388 execute:
    ```ts
    const previewUrl = URL.createObjectURL(file);
    this.createdBlobUrls.push(previewUrl);
    ```
    `previewUrl` is a local variable that is immediately discarded and never bound in the template, leaking an object URL on every file drop until component destruction (`Directive 4`).
  - Selecting a new file in `handleFileSelected()` does not clear `extractedResult.set(null)` or `previewText.set('')`.
  - OCR processing runs on the main UI thread with no `worker.ts` (`Directive 3`).
- **Root Cause**: Copy-pasted `URL.createObjectURL` boilerplate and missing worker abstraction.
- **Required Fix**:
  - Either display an actual document/image preview using a managed signal (revoking the previous URL on replacement) or remove the unused `URL.createObjectURL(file)` call in `handleFileSelected()`.
  - Reset `extractedResult.set(null)` and `previewText.set('')` when a new file is selected.
  - Create [`worker.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/worker.ts) to run image preprocessing and OCR recognition off the main thread with progress updates (`onProgress`), terminating the worker in `ngOnDestroy`.

---

### `DEFECT-47-04` — Mobile Horizontal Overflow at 390px and 320px & Non-Standard `.c-input__select` / `.c-checkbox-label`
- **Severity**: `Medium`
- **Category**: `Mobile & Responsive Layout` / `BEM & Form Accessibility`
- **Location**:
  - [`local-ocr-text-extractor.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/local-ocr-text-extractor.component.ts#L20-L31)
  - [`local-ocr-text-extractor.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/local-ocr-text-extractor.component.ts#L72-L140)
- **Audit Evidence**:
  - At `390×844`, `scrollWidth` is `421px` (`clientWidth: 390px`, `hasHorizontalScroll: true`).
  - At `320×640`, `scrollWidth` is `420px` (`clientWidth: 320px`, `hasHorizontalScroll: true`).
  - `<select id="ocrLanguageSelect" class="c-input__select">` and `<select id="exportFormatSelect" class="c-input__select">` use `.c-input__select` (`21px` height: `574×21` desktop, `316×21` at 390px, `246×21` at 320px) instead of `.c-input__control`.
  - Checkboxes use `.c-checkbox-label` (`13×13px`) instead of `.c-input__switch`.
- **Root Cause**: Long header title and container flex items lack `min-width: 0` and `overflow-wrap: anywhere`, and form controls use non-existent BEM classes.
- **Required Fix**:
  - Add responsive wrapping (`min-width: 0; overflow-wrap: anywhere; word-break: break-word`) to `.c-header`, `.l-columns__area`, and `.c-card` so `scrollWidth <= clientWidth` at both `390px` and `320px`.
  - Replace `.c-input__select` with `.c-input__control` and `.c-checkbox-label` with `.c-input__switch` + `.c-input__switch-input`.

---

### `DEFECT-47-05` — Hardcoded Light-Mode Hex Colors in Component Styles
- **Severity**: `Low`
- **Category**: `Theme Contrast`
- **Location**:
  - [`local-ocr-text-extractor.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/local-ocr-text-extractor.component.ts#L278-L332)
- **Audit Evidence**:
  - `.c-file-summary`, `.c-ocr-textarea`, `.c-page-pill`, and `.c-empty-state` hardcode `#334155`, `#065f46`, `#cbd5e1`, `#f8fafc`, `#0f172a`, `#94a3b8`, and `#64748b`.
- **Root Cause**: Inline SCSS bypassed theme CSS variables.
- **Required Fix**:
  - Replace all hardcoded hex colors with `var(--color-surface)`, `var(--color-surface-alt)`, `var(--color-border)`, `var(--color-text)`, `var(--color-text-muted)`, `var(--color-primary)`, and `var(--color-success)`.

---

## 3. Target Acceptance Criteria

1. **Real Image & PDF OCR Extraction (`DEFECT-47-01`)**:
   - Uploading a rendered PNG/JPG image (such as `invoice-scan.png` containing `"INVOICE #2026-047"`, `"ACME PRIVACY CORP"`, `"TOTAL DUE: $1,700.00"`) or a scanned/text PDF extracts the actual text present in the image/PDF with zero hardcoded placeholder strings and genuine per-page confidence scores.
2. **Active Image Preprocessing & Sample Receipt Loader (`DEFECT-47-02`)**:
   - `preprocessImageBuffer()` applies contrast stretching (`enhanceContrast`) and luminance thresholding (`binarizeThreshold`) to image buffers before recognition; both controls are interactive in the UI; clicking `"Load Sample Receipt"` loads a rendered sample receipt image and extracts its text.
3. **Web Worker Execution & Leak-Free URL Management (`DEFECT-47-03`)**:
   - OCR processing runs via `worker.ts` with deterministic progress updates; `handleFileSelected()` does not leak unused blob URLs and resets stale `extractedResult` / `previewText` state.
4. **Zero Mobile Overflow & Standard BEM Controls (`DEFECT-47-04`, `DEFECT-47-05`)**:
   - Zero horizontal scroll (`scrollWidth <= clientWidth`) at `1366×900`, `390×844`, and `320×640`; selects use `.c-input__control`, toggles use `.c-input__switch`, sliders use `.c-input__slider`, and all styles use `var(--color-*)` tokens.
5. **Zero Network Exfiltration (`Directive 1 & 2`)**:
   - All OCR recognition, PDF parsing, and `.txt`/`.md`/`.docx` generation execute 100% locally with zero external network calls (`connect-src 'self' blob: data:`).
