# Remediation Specification: Client-Side PDF Signer, Date Stamper & Initials

> **Spec ID**: `75`  
> **Remediates Tool**: `45 - Client-Side PDF Signer, Date Stamper & Initials`  
> **Slug**: `pdf-signer-stamper`  
> **Category**: `documents`  
> **Route**: `/tools/pdf-signer-stamper`  
> **Audit Reference**: [`tools_31_60_audit.md#tool-45`](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-45)  
> **Current Audit Verdict**: Functional: `⚠️ Partial` | Mobile: `❌ Poor` | Overall: `⚠️`  
> **Status**: `Ready for Implementation`  
> **Priority**: `Critical`

---

## 1. Executive Summary & Audit Baseline

The headless-Chrome audit of **Tool 45 — Client-Side PDF Signer, Date Stamper & Initials** (`/tools/pdf-signer-stamper`) across Desktop (`1366×900`), Mobile (`390×844`), and Small Mobile (`320×640`) established the following baseline:

- **What Currently Works**:
  - Loading built-in 2-page sample PDFs (`Sample NDA Agreement`, `Sample Service Contract`) and custom uploaded PDFs via `pdf-lib` works locally, and corrupt PDF files are caught with a descriptive error banner (`Failed to parse PDF document...`).
  - Drawing with a desktop mouse on `#signatureCanvas`, selecting ink color (`black`, `dark_blue`), choosing date formats (`YYYY-MM-DD`, `MM/DD/YYYY`, `DD/MM/YYYY`, `MMM D, YYYY`), setting initials (`PK`), switching pages (`◀ Previous` / `Next ▶`), flattening form fields (`form.flatten()`), and exporting a signed `.pdf` (`non-disclosure-agreement-(nda)-signed.pdf`, 3,157 B, `%PDF-1.7` with embedded `/Subtype /Image` XObject) execute with 0 network requests.
- **What Fails or Is Broken**:
  1. **No Visual PDF Page Preview (`PDF.js`) & Hardcoded Stamp Coordinates**: Despite `spec.md` requiring `PDF.js` and interactive multi-page coordinate mapping, the right column only shows a plain text list of placed stamps (`SIGNATURE Page 1 @ (100, 150)`). Users cannot see the PDF page or choose where stamps are placed; `addSignatureStamp`, `addDateStamp`, and `addInitialsStamp` hardcode coordinates `(100, 150)`, `(280, 150)`, and `(420, 150)` with no interactive placement or X/Y coordinate controls.
  2. **Signature Pad Broken on Mobile Touchscreens & Causes 400px Horizontal Overflow on 390px and 320px**: `#signatureCanvas` only binds `(mousedown)`, `(mousemove)`, `(mouseup)`, and `(mouseleave)` (`MouseEvent`), so touchscreen users cannot draw signatures at all. Moreover, its fixed HTML `width="400"` without `max-width: 100%` (combined with `.l-columns__column` lacking `min-width: 0`) forces `scrollWidth: 400px` on both `390px` and `320px` viewports (`hasHorizontalScroll: true`).
  3. **Missing "Type Signature" Mode & Blank Signature Guard**: Card 2 is titled `"2. Draw or Type Signature"` but has no typed-signature input mode, and clicking `+ Stamp Signature` on an empty pad embeds a blank transparent PNG.
  4. **Redundant PDF Parsing & Main-Thread Processing**: `processSignedPdf()` parses the `ArrayBuffer` twice via `PDFDocument.load()` on the main thread.
  5. **Undersized Touch Targets & Concatenated `.l-extremo` Controls**: Ink `.color-dot` buttons (`24×24px`, shrinking to `19×24px` at `320px`), `.c-range` (`129×16px`), `input.initials-input` (`100×28px`), and checkbox (`13×13px`) fail touch target minimums, while missing `.l-extremo__area-izquierda` / `__area-derecha` wrappers cause `Pen Stroke Width2px` and `Stamp Text: 2026-10-24+ Stamp Date` to butt together.

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-45-01` — No Visual PDF Page Preview & Hardcoded Stamp Coordinates `(100, 150)`, `(280, 150)`, `(420, 150)`
- **Severity**: `High`
- **Category**: `Spec Conformance` / `Engine Logic`
- **Location**: [`pdf-signer-stamper.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/pdf-signer-stamper/pdf-signer-stamper.component.ts#L254-L318), [`pdf-signer-stamper.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/pdf-signer-stamper/pdf-signer-stamper.component.ts#L645-L693)
- **Symptom & Evidence**: The right panel (`Placed Stamps & Document Overview`) has no PDF page canvas or visual representation of the current page. Clicking `+ Stamp Signature`, `+ Stamp Date`, or `+ Stamp Initials` always places stamps at fixed PDF points `(100, 150)`, `(280, 150)`, and `(420, 150)`, and there are no drag handles or X/Y inputs to reposition them.
- **Root Cause**: Interactive page preview and coordinate controls were omitted from `PdfSignerStamperComponent`.
- **Remediation Specification**:
  - Render an interactive **Live Document Page Canvas / Viewport** in the right column (using `pdfjs-dist` page rendering when available or a scaled vector/canvas representation of the current page's dimensions `pageWidthPt × pageHeightPt` with placed stamp overlays).
  - Allow users to **click/drag placed stamps directly on the page preview viewport** (converting viewport coordinates to PDF bottom-left origin points `x`, `y`) AND provide editable **X / Y coordinate inputs** (`number` inputs or sliders) per stamp in the Placed Stamps list.

### `DEFECT-45-02` — `#signatureCanvas` Lacks Pointer/Touch Events, Bezier Smoothing, Coordinate Scaling & Overflows Mobile Viewports (`scrollWidth: 400`)
- **Severity**: `High`
- **Category**: `Mobile & Responsive Layout` / `Engine Logic`
- **Location**: [`pdf-signer-stamper.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/pdf-signer-stamper/pdf-signer-stamper.component.ts#L101-L110), [`pdf-signer-stamper.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/pdf-signer-stamper/pdf-signer-stamper.component.ts#L391-L395), [`pdf-signer-stamper.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/pdf-signer-stamper/pdf-signer-stamper.component.ts#L730-L766)
- **Symptom & Evidence**:
  - On Mobile (`390px`) and Small Mobile (`320px`), `document.documentElement.scrollWidth` is `400px` (`hasHorizontalScroll: true`, `mobile.png`, `small.png`).
  - Touchscreen users cannot draw on `#signatureCanvas` because only `mousedown`/`mousemove`/`mouseup`/`mouseleave` are bound.
  - When CSS scales the canvas width below 400px, `e.clientX - rect.left` does not multiply by `canvas.width / rect.width`, causing the stroke to draw at an offset from the user's pointer.
- **Root Cause**:
  - `.signature-canvas` lacks `width: 100%; max-width: 400px; height: auto; touch-action: none;`.
  - Event bindings use desktop-only `MouseEvent`s instead of unified `PointerEvent`s (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`).
  - `draw()` uses unscaled client coordinates and raw `lineTo` segments without quadratic Bezier midpoint smoothing.
- **Remediation Specification**:
  - Bind `(pointerdown)`, `(pointermove)`, `(pointerup)`, `(pointerleave)`, and `(pointercancel)` on `#signatureCanvas` with `touch-action: none`.
  - Scale pointer coordinates accurately:
    ```typescript
    const scaleX = canvas.width / (rect.width || canvas.width);
    const scaleY = canvas.height / (rect.height || canvas.height);
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    ```
  - Smooth freehand strokes using quadratic Bezier curves (`ctx.quadraticCurveTo(lastX, lastY, midX, midY)`), and track `hasSignatureStroke = signal<boolean>(false)`.
  - Style `.c-pdf-signer__signature-canvas` with `width: 100%; max-width: 400px; height: auto; touch-action: none;`.

### `DEFECT-45-03` — Missing "Type Signature" Mode & Unchecked Blank Signature Stamping
- **Severity**: `Medium`
- **Category**: `Spec Conformance`
- **Location**: [`pdf-signer-stamper.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/pdf-signer-stamper/pdf-signer-stamper.component.ts#L98-L152), [`pdf-signer-stamper.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/pdf-signer-stamper/pdf-signer-stamper.component.ts#L695-L699)
- **Symptom & Evidence**: Card 2 is titled `"2. Draw or Type Signature"`, but there is no input field to type a signature name; furthermore, clicking `+ Stamp Signature` before drawing anything stamps a blank transparent rectangle onto the document.
- **Root Cause**: Typed signature rendering onto the signature canvas was omitted, and `placeCurrentSignature()` does not check if the signature pad is empty or if typed text is present.
- **Remediation Specification**:
  - Add a `signatureMode = signal<'draw' | 'type'>('draw')` toggle and a `typedSignatureText = signal<string>('')` input in Card 2. When in `'type'` mode (or when typing a name), render the typed signature onto `#signatureCanvas` in an italic/cursive script style using the selected ink color (`black` or `dark_blue`).
  - Track whether the signature canvas has drawn strokes or typed text (`hasSignatureContent`), or render a default cursive signature if the user clicks `+ Stamp Signature` with typed text.

### `DEFECT-45-04` — Redundant `inspectPdfDocument` Call in `processSignedPdf` & Main-Thread Execution
- **Severity**: `Medium`
- **Category**: `Engine Logic` / `Web Worker & Performance`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/pdf-signer-stamper/engine.ts#L128-L135), [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/pdf-signer-stamper/engine.ts#L246-L259)
- **Symptom & Evidence**: `processSignedPdf()` calls `applyStampsToPdf(pdfBuffer)` (which loads the full `PDFDocument` via `PDFDocument.load(pdfBuffer)`) and then immediately calls `inspectPdfDocument(pdfBuffer)` (which calls `PDFDocument.load(pdfBuffer)` a second time just to read `pageCount`).
- **Root Cause**: `applyStampsToPdf` returns only `Uint8Array` instead of `{ signedBytes: Uint8Array; pageCount: number }`.
- **Remediation Specification**:
  - Return `pageCount` directly from the loaded `PDFDocument` during `applyStampsToPdf` so `processSignedPdf` parses the PDF only once.
  - Add a Web Worker bridge (`worker.ts`) with main-thread fallback for large multi-page PDF signing/flattening and terminate the worker in `ngOnDestroy()`.

### `DEFECT-45-05` — Non-Existent Layout/Form Classes, Concatenated Labels & Undersized Touch Targets
- **Severity**: `Medium`
- **Category**: `Mobile & Responsive Layout` / `BEM & Form Accessibility`
- **Location**: [`pdf-signer-stamper.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/pdf-signer-stamper/pdf-signer-stamper.component.ts#L74-L251)
- **Symptom & Evidence**:
  - `smallTouchTargets` reports 5 violations: `.color-dot` buttons (`24×24px` desktop, `19×24px` at 320px), `.c-range` (`129×16px`), `input.initials-input` (`100×28px`), and checkbox (`13×13px`).
  - `.l-columns__column` is used instead of `.l-columns__area`.
  - `.l-extremo` is used without `.l-extremo__area-izquierda` / `.l-extremo__area-derecha`, causing `Pen Stroke Width2px`, `Stamp Text: 2026-10-24+ Stamp Date`, and `PK+ Stamp Initials` to touch with zero gap.
- **Root Cause**: Misapplied BEM layout/input classes and small 24px dimensions on `.color-dot`.
- **Remediation Specification**:
  - Replace `.l-columns__column` with `.l-columns__area`.
  - Wrap `.l-extremo` children in `.l-extremo__area-izquierda` and `.l-extremo__area-derecha` with `flex-wrap: wrap; gap: 0.5rem`.
  - Enlarge `.c-pdf-signer__color-dot` to `36×36 px` (`min-width: 36px; min-height: 36px`), use `.c-input__slider` on the pen width range input, `.c-input__control` (`min-height: 38px; font-size: 1rem`) on the initials and typed-signature inputs, and `.c-input__switch` on the flatten checkbox.

### `DEFECT-45-06` — Hardcoded Light-Mode Hex Colors & Unprefixed CSS Classes
- **Severity**: `Low`
- **Category**: `Theme Contrast`
- **Location**: [`pdf-signer-stamper.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/pdf-signer-stamper/pdf-signer-stamper.component.ts#L360-L503)
- **Symptom & Evidence**: Inline styles use unprefixed classes (`.preset-strip`, `.page-selector-bar`, `.stamps-list-wrap`, `.stamp-row`) with hardcoded light-mode colors (`#f8fafc`, `#f1f5f9`, `#e2e8f0`, `#334155`, `#1e293b`), breaking dark-mode readability.
- **Root Cause**: Raw hex color values used instead of CSS custom properties (`var(--color-*)`).
- **Remediation Specification**:
  - Move styles to `pdf-signer-stamper.component.scss` using `.c-pdf-signer__*` BEM classes and CSS custom properties (`var(--color-bg-subtle)`, `var(--color-bg-surface)`, `var(--color-border-default)`, `var(--color-text-primary)`, `var(--color-text-secondary)`). Keep the signature drawing pad surface `#ffffff` with explicit dark ink contrast so drawn black/dark-blue ink is always visible in both themes.

---

## 3. Target Acceptance Criteria

### 3.1 Functional & Spec Conformance
- [ ] Right column renders an interactive **PDF Page Preview Viewport** showing the active page and placed stamps (`signature`, `date`, `initials`), allowing click/drag repositioning plus editable X/Y coordinates per stamp.
- [ ] `#signatureCanvas` supports both **Draw Signature** (via unified `PointerEvent`s with quadratic Bezier smoothing and CSS-to-canvas coordinate scaling) and **Type Signature** (rendering typed text onto the signature pad).
- [ ] `processSignedPdf()` parses the input PDF buffer only once and embeds all stamps and flattened form fields accurately.

### 3.2 Mobile & Responsive Layout & Theme Contrast
- [ ] `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at `1366px`, `390px`, and `320px` (`hasHorizontalScroll: false` — no 400px canvas overflow).
- [ ] All interactive controls (`.c-pdf-signer__color-dot` `>= 36×36px`, `.c-input__slider`, `.c-input__control`, `.c-input__switch`, buttons) meet touch target minimums (`smallTouchTargetCount: 0`) and text inputs use `font-size >= 16px` (`inputsUnder16px_iOSZoom: 0`).
- [ ] All `.l-extremo` rows use `.l-extremo__area-izquierda` and `.l-extremo__area-derecha`.
- [ ] Dark and Light themes maintain full text/surface contrast via CSS custom properties (`var(--color-*)`).

### 3.3 `AGENTS.md` Prime Directives
- [ ] **Directive 1 & 2**: 0 external network requests during PDF inspection, preview rendering, and signing.
- [ ] **Directive 3**: Heavy PDF signing/flattening runs via `worker.ts` (with main-thread fallback) without blocking the UI.
- [ ] **Directive 4**: All created object URLs are revoked via `URL.revokeObjectURL()` and any active worker is terminated in `ngOnDestroy()`.
