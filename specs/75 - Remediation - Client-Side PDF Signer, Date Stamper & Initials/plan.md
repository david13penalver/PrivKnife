# TDD Remediation Plan: Client-Side PDF Signer, Date Stamper & Initials

> **Spec ID**: `75`  
> **Tool**: `45 - Client-Side PDF Signer, Date Stamper & Initials`  
> **Route**: `/tools/pdf-signer-stamper`  
> **Category**: `documents`  
> **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/documents/pdf-signer-stamper/
├── types.ts                                 # Add SignatureInputMode ('draw' | 'type'), page dimension state, and worker message types
├── engine.ts                                # Eliminate duplicate PDFDocument.load in processSignedPdf, add coordinate clamping & typed signature canvas helper
├── engine.spec.ts                           # Seam 1 tests for single-pass PDF signing, custom stamp coordinates, and typed signature helper
├── worker.ts                                # Web Worker for off-main-thread PDF signing & form flattening (Directive 3)
├── pdf-signer-stamper.component.ts          # Add interactive PDF page preview viewport, stamp X/Y editing, PointerEvent drawing + Type Signature mode, BEM classes
├── pdf-signer-stamper.component.scss        # Scoped BEM styles (.c-pdf-signer__*) with responsive max-width: 100% canvas & CSS variables (--color-*)
└── pdf-signer-stamper.component.spec.ts     # Seam 3 & 4 tests for PointerEvent drawing, Type Signature mode, interactive page placement, and BEM/cleanup
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Export Correctness Boundary (`engine.ts` / `engine.spec.ts`)
- **Public Functions Under Test**:
  - `inspectPdfDocument(pdfBuffer: ArrayBuffer, fileName?: string): Promise<PdfDocumentSummary>`
  - `applyStampsToPdf(pdfBuffer: ArrayBuffer, stamps: PlacedStamp[], options: PdfSignerStamperOptions): Promise<Uint8Array>`
  - `processSignedPdf(pdfBuffer: ArrayBuffer, options: PdfSignerStamperOptions, originalFileName?: string): Promise<PdfSignerStamperResult>`
  - `clampStampCoordinates(x: number, y: number, stampW: number, stampH: number, pageW: number, pageH: number): { x: number; y: number }`
- **Concrete Assertions**:
  - `processSignedPdf()` loads the `PDFDocument` only once per call and returns accurate `metadata.pageCount` and `metadata.stampsPlaced`.
  - `clampStampCoordinates()` keeps stamps within page bounds `[0, pageW - stampW]` and `[0, pageH - stampH]`.

### Seam 2: Web Worker & Main-Thread Protection Boundary (`worker.ts` / `pdf-signer-stamper.component.ts`)
- **Protocol**:
  - Request: `{ type: 'SIGN_PDF', pdfBuffer: ArrayBuffer, options: PdfSignerStamperOptions, fileName: string }`
  - Response: `{ type: 'COMPLETE', result: PdfSignerStamperResult } | { type: 'ERROR', message: string }`
- **Concrete Assertions**:
  - Active Web Worker is terminated in `ngOnDestroy()`.

### Seam 3: Component State, Controls, Sanitization & Resource Disposal Boundary (`pdf-signer-stamper.component.ts` / `pdf-signer-stamper.component.spec.ts`)
- **Concrete Assertions**:
  - `#signatureCanvas` responds to `pointerdown`, `pointermove`, and `pointerup` events and scales coordinates by `canvas.width / rect.width`.
  - Switching `signatureMode` to `'type'` and setting `typedSignatureText('Jane Doe')` renders the typed signature onto `#signatureCanvas` and allows stamping it onto the active page.
  - Clicking on the interactive PDF page preview viewport or editing a placed stamp's `x` / `y` coordinates updates `placedStamps()` at the user-chosen coordinates rather than only `(100, 150)`.
  - `ngOnDestroy()` revokes all created object URLs and terminates any active worker.

### Seam 4: Mobile Responsive & Theme Styling Boundary (`pdf-signer-stamper.component.scss`)
- **Concrete Assertions**:
  - `.c-pdf-signer__signature-canvas` has `width: 100%; max-width: 400px; height: auto; touch-action: none;` so `scrollWidth <= clientWidth` at both `390px` and `320px`.
  - Template uses `.l-columns__area`, `.l-extremo__area-izquierda`, `.l-extremo__area-derecha`, `.c-input__slider`, `.c-input__control`, and `.c-input__switch`, and `.c-pdf-signer__color-dot` is `36×36px`.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: Single-Pass PDF Signing & Coordinate Clamping Math (Seam 1)
- **Red**: In `engine.spec.ts`, write tests asserting `clampStampCoordinates()` clamps out-of-range coordinates to page bounds and `processSignedPdf()` returns accurate `pageCount` without calling `inspectPdfDocument()` a second time.
- **Green**: Implement `clampStampCoordinates()` and refactor `applyStampsToPdf` / `processSignedPdf` in `engine.ts` to reuse the loaded `PDFDocument`'s `getPageCount()`.
- **Refactor**: Keep `engine.ts` pure and decoupled from DOM APIs.

### Slice 2: PointerEvent Signature Drawing (with Scaling & Bezier Smoothing) + Typed Signature Mode (Seam 3)
- **Red**: In `pdf-signer-stamper.component.spec.ts`, write tests asserting:
  1. Dispatching `pointerdown`, `pointermove`, and `pointerup` on `#signatureCanvas` draws strokes and sets `hasSignatureContent()` to `true`.
  2. Switching to `'type'` mode and entering `'Jane Doe'` renders text onto `#signatureCanvas` and places a signature stamp with `'Jane Doe'`.
- **Green**: Replace `(mousedown)`/`(mousemove)`/`(mouseup)` with `(pointerdown)`/`(pointermove)`/`(pointerup)`/`(pointercancel)`, add coordinate scaling + quadratic Bezier curve smoothing, and add the Draw / Type signature toggle and text input in `pdf-signer-stamper.component.ts`.
- **Refactor**: Ensure `clearSignaturePad()` resets both drawn strokes and typed signature text.

### Slice 3: Interactive PDF Page Preview Viewport & Editable Stamp X/Y Coordinates (Seam 3)
- **Red**: In `pdf-signer-stamper.component.spec.ts`, write tests asserting:
  1. An interactive page preview container is rendered for the active page showing visual stamp markers for `currentPageStamps()`.
  2. Calling `updateStampPosition(stampId, newX, newY)` or clicking the page preview updates the stamp's `x` and `y` coordinates in `placedStamps()`.
- **Green**: Render the interactive PDF page preview viewport in the right column with draggable/clickable stamp positioning and editable X/Y coordinate inputs in the stamp list.
- **Refactor**: Synchronize active page dimensions from `inspectPdfDocument().pages`.

### Slice 4: Mobile Overflow Fix (`390px`/`320px`), Touch Target Sizing & Dark-Mode CSS Variables (Seam 4)
- **Red**: In `pdf-signer-stamper.component.spec.ts`, assert that `.l-columns__area`, `.l-extremo__area-izquierda`, `.l-extremo__area-derecha`, `.c-input__slider`, `.c-input__control`, and `.c-input__switch` are used and `.l-columns__column` is absent.
- **Green**: Extract styles to `pdf-signer-stamper.component.scss` with `width: 100%; max-width: 400px` on `#signatureCanvas`, `36×36px` `.c-pdf-signer__color-dot` buttons, and CSS custom properties (`var(--color-*)`).
- **Refactor**: Verify `hasHorizontalScroll: false` at `390px` and `320px` in headless Chrome.
