# Remediation Task List: Client-Side PDF Signer, Date Stamper & Initials

> **Spec ID**: `75`  
> **Remediates Tool**: `45 - Client-Side PDF Signer, Date Stamper & Initials` (`/tools/pdf-signer-stamper`)  
> **Rule**: Follow strict TDD (`Red → Green → Refactor`). Do not skip verification gates.

---

## Phase 1: Engine & Algorithmic Remediation (Seam 1 — Red → Green)

- [ ] **Task 1.1: Eliminate Redundant `PDFDocument.load` & Add Coordinate Clamping (`DEFECT-45-01`, `DEFECT-45-04`)**
  - **Red**: In `src/app/tools/documents/pdf-signer-stamper/engine.spec.ts`, add tests for `clampStampCoordinates(x, y, w, h, pageW, pageH)` and assert `processSignedPdf()` returns accurate `metadata.pageCount` in a single `PDFDocument.load()` pass.
  - **Green**: Implement `clampStampCoordinates()` and update `applyStampsToPdf()` / `processSignedPdf()` in `src/app/tools/documents/pdf-signer-stamper/engine.ts`.

---

## Phase 2: Web Worker Offloading & Memory Hygiene (Seam 2 & 3 — Red → Green)

- [ ] **Task 2.1: Add Web Worker for PDF Signing & Lifecycle Disposal (`DEFECT-45-04`)**
  - **Red**: In `pdf-signer-stamper.component.spec.ts`, assert `ngOnDestroy()` revokes all created object URLs via `URL.revokeObjectURL()` and terminates any active Web Worker.
  - **Green**: Create `src/app/tools/documents/pdf-signer-stamper/worker.ts` (with main-thread fallback) and wire cleanup in `PdfSignerStamperComponent.ngOnDestroy()`.

---

## Phase 3: Component UI State, Controls & Interactive Preview (Seam 3 — Red → Green)

- [ ] **Task 3.1: Migrate `#signatureCanvas` to PointerEvents with Scaling, Bezier Smoothing & Typed Signature Mode (`DEFECT-45-02`, `DEFECT-45-03`)**
  - **Red**: In `pdf-signer-stamper.component.spec.ts`, write tests asserting `#signatureCanvas` handles `pointerdown`/`pointermove`/`pointerup` with CSS scaling, and that switching `signatureMode` to `'type'` and entering text renders a typed signature onto the pad.
  - **Green**: Update `#signatureCanvas` event bindings and drawing logic in `pdf-signer-stamper.component.ts`, and add the Draw / Type toggle + typed signature text input.
- [ ] **Task 3.2: Add Interactive PDF Page Preview Viewport & Editable Stamp X/Y Coordinates (`DEFECT-45-01`)**
  - **Red**: In `pdf-signer-stamper.component.spec.ts`, write tests asserting that the active PDF page viewport renders placed stamps for `currentPageIndex()` and that `updateStampPosition(id, x, y)` and viewport click/drag update the stamp's `(x, y)` coordinates.
  - **Green**: Render the interactive page preview viewport in the right column of `pdf-signer-stamper.component.ts` with draggable/clickable stamp overlays and X/Y numeric inputs in the stamp list.

---

## Phase 4: Mobile Adaptation, Light/Dark Theme Contrast & BEM Styling (Seam 4)

- [ ] **Task 4.1: Fix 400px Canvas Overflow on 390px/320px & Standardize BEM Classes (`DEFECT-45-02`, `DEFECT-45-05`)**
  - **Red**: In `pdf-signer-stamper.component.spec.ts`, assert `.l-columns__area`, `.l-extremo__area-izquierda`, `.l-extremo__area-derecha`, `.c-input__slider`, `.c-input__control`, and `.c-input__switch` are present and `.l-columns__column` is absent.
  - **Green**: Replace `.l-columns__column` with `.l-columns__area`, wrap `.l-extremo` children in `__area-izquierda` / `__area-derecha`, style `#signatureCanvas` with `width: 100%; max-width: 400px; height: auto; touch-action: none;`, and enlarge `.c-pdf-signer__color-dot` to `36×36px`.
- [ ] **Task 4.2: Extract BEM Styles with CSS Custom Properties (`DEFECT-45-06`)**
  - Create `src/app/tools/documents/pdf-signer-stamper/pdf-signer-stamper.component.scss` using `.c-pdf-signer__*` BEM classes and CSS variables (`var(--color-bg-subtle)`, `var(--color-bg-surface)`, `var(--color-border-default)`, `var(--color-text-primary)`, `var(--color-text-secondary)`).

---

## Phase 5: Verification & Regression Gate

- [ ] Run unit tests: `npx vitest run src/app/tools/documents/pdf-signer-stamper/` (100% passing).
- [ ] Run production build: `npm run build` (0 errors).
- [ ] Run headless Chrome audit: `node $SCRATCH/audit.mjs pdf-signer-stamper` and verify:
  - `consoleErrors: []`, `pageErrors: []`, `externalRequests: []`
  - `hasHorizontalScroll: false` at `1366px`, `390px`, and `320px` (no 400px overflow)
  - `smallTouchTargetCount: 0` and `inputsUnder16px_iOSZoom: 0`
  - Valid signed `.pdf` download with user-positioned stamps.
