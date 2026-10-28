# Remediation Tasks — Spec 77: Local OCR Image & Scanned PDF to Text/Word

> **Tool**: 47 (`local-ocr-text-extractor`)
> **Spec**: [spec.md](file:///home/deivision/Projects/Programming/PrivKnife/specs/77%20-%20Remediation%20-%20Local%20OCR%20Image%20&%20Scanned%20PDF%20to%20Text_Word/spec.md)
> **Plan**: [plan.md](file:///home/deivision/Projects/Programming/PrivKnife/specs/77%20-%20Remediation%20-%20Local%20OCR%20Image%20&%20Scanned%20PDF%20to%20Text_Word/plan.md)

---

## Phase 1: Image Preprocessing & Real Client-Side OCR Engine (`DEFECT-47-01`, `DEFECT-47-02`)
- [ ] **Task 1.1 (Red)**: Add unit tests in [`engine.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/engine.spec.ts) for:
  - `preprocessImageBuffer()` contrast stretching (`enhanceContrast`) and grayscale thresholding (`binarizeThreshold`).
  - Real bitmap OCR recognition (`recognizeTextFromImageBuffer`) extracting `"INVOICE #2026-047"`, `"ACME PRIVACY CORP"`, and `"TOTAL DUE: $1,700.00"` from a rendered canvas/PNG image without returning placeholder text.
  - Multi-page PDF text stream (including `FlateDecode` and `TJ` arrays) and scanned page extraction.
- [ ] **Task 1.2 (Green)**: Implement `preprocessImageBuffer()` in [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/engine.ts).
- [ ] **Task 1.3 (Green)**: Replace the hardcoded `"PRIVACY-FIRST CLIENT-SIDE OCR EXTRACTED TEXT"` stub in [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/engine.ts) with real client-side image OCR recognition (`recognizeTextFromImageBuffer` + PDF page text/bitmap extraction) and add `createSampleReceiptImageBlob()`.

## Phase 2: Web Worker & Memory Hygiene (`DEFECT-47-03`)
- [ ] **Task 2.1 (Red)**: Add unit tests in [`local-ocr-text-extractor.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/local-ocr-text-extractor.component.spec.ts) verifying `handleFileSelected()` does not leak unused `URL.createObjectURL` references and resets stale `extractedResult` and `previewText`.
- [ ] **Task 2.2 (Green)**: Create [`worker.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/worker.ts) to run image preprocessing and OCR recognition off the main thread with progress callbacks (`Directive 3`).
- [ ] **Task 2.3 (Green)**: Remove the unused `URL.createObjectURL(file)` call in `handleFileSelected()`, clear stale `extractedResult` / `previewText` on new file upload, and terminate any active worker in `ngOnDestroy` (`Directive 4`).

## Phase 3: Preprocessing UI Controls & Sample Receipt Loader (`DEFECT-47-02`)
- [ ] **Task 3.1 (Red)**: Add component tests for the `Enhance Contrast` toggle, `Binarize Threshold` slider, and `"Load Sample Receipt"` button.
- [ ] **Task 3.2 (Green)**: Add the `Enhance Contrast` `.c-input__switch`, `Binarize Threshold` `.c-input__slider`, and `"Load Sample Receipt"` `<app-button>` to [`local-ocr-text-extractor.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/local-ocr-text-extractor.component.ts).

## Phase 4: Mobile Overflow (390px & 320px), BEM Classes & Dark-Mode Styling (`DEFECT-47-04`, `DEFECT-47-05`)
- [ ] **Task 4.1 (Green)**: Fix horizontal overflow at `390×844` and `320×640` by adding `min-width: 0; overflow-wrap: anywhere` to header, column areas, and cards in [`local-ocr-text-extractor.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/local-ocr-text-extractor/local-ocr-text-extractor.component.ts).
- [ ] **Task 4.2 (Green)**: Replace `class="c-input__select"` with `class="c-input__control"` on `#ocrLanguageSelect` and `#exportFormatSelect`, and replace `.c-checkbox-label` checkboxes with `.c-input__switch` + `.c-input__switch-input`.
- [ ] **Task 4.3 (Green)**: Replace all hardcoded hex colors (`#334155`, `#065f46`, `#cbd5e1`, `#f8fafc`, `#0f172a`, `#94a3b8`, `#64748b`) with `var(--color-*)` tokens.

## Phase 5: End-to-End & Privacy Verification
- [ ] **Task 5.1**: Run `npx vitest run src/app/tools/documents/local-ocr-text-extractor/` and confirm 100% test pass rate.
- [ ] **Task 5.2**: Verify in headless Chrome at `1366×900`, `390×844`, and `320×640` that uploading `invoice-scan.png` extracts `"INVOICE #2026-047"`, `"ACME PRIVACY CORP"`, and `"TOTAL DUE: $1,700.00"` into `.txt`, `.md`, and `.docx` downloads with `hasHorizontalScroll: false` across all three viewports and `networkRequests: []`.
