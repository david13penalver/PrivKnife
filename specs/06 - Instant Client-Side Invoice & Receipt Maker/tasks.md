# Task List (TDD Vertical Slices): Instant Client-Side Invoice & Receipt Maker

> **Tool**: `06 - Instant Client-Side Invoice & Receipt Maker`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Domain Contracts & Test Fixtures Setup
- [x] **Task 1.1: Define Domain Types**
  - Path: `src/app/tools/documents/invoice-maker/types.ts`
  - Define `InvoiceDocument`, `InvoiceLineItem`, `InvoiceSender`, `InvoiceRecipient`, `InvoiceTotals`, `TemplateStyle`, `CurrencyOption`.
- [x] **Task 1.2: Create Programmatic Test Fixtures**
  - Path: `src/app/tools/documents/invoice-maker/test-fixtures.ts`
  - Synthetic invoice and receipt models, line items with edge-case prices, sample base64 PNG logo.

---

### 🟩 Phase 2: Invoice Engine — Calculation & Vector PDF Generation (Seam 1)
- [x] **Task 2.1: Implement Financial Calculations (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `calculateTotals()` correctly computes:
    - Subtotal of multiple line items (quantity * unitPrice).
    - Percentage discount deduction.
    - Tax percentage applied to post-discount taxable amount.
    - Shipping additions.
    - Grand total and remaining balance due with proper two-decimal rounding.
  - **Implementation (Green)**: Implement `calculateTotals()` and `formatCurrency()` in `engine.ts`.
- [x] **Task 2.2: Draft Serialization & Deserialization (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `serializeDraft()` and `deserializeDraft()` properly handle round-trips and validate malformed JSON.
  - **Implementation (Green)**: Implement `serializeDraft()`, `deserializeDraft()`, and `validateInvoice()` in `engine.ts`.
- [x] **Task 2.3: Vector PDF Document Generation with jsPDF (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateInvoicePdf()` produces a valid PDF blob and buffer:
    - Includes document number, sender, recipient, and line item text.
    - Supports 'modern', 'classic', and 'receipt' layout styles.
    - Embeds company logo image when present.
    - Contains no network requests or external assets.
  - **Implementation (Green)**: Implement `generateInvoicePdf()` in `engine.ts` using `jspdf`.

---

### 🟩 Phase 3: Angular Standalone Component UI & Signals (Seam 2)
- [x] **Task 3.1: Component Layout & Dynamic Line Items (Red → Green)**
  - **Test (Red)**: In `invoice-maker.component.spec.ts`, assert:
    - Component initializes with default editable invoice draft.
    - User can add a new line item.
    - User can update item description, quantity, and unit price.
    - User can delete an existing line item.
    - Calculated totals automatically update reactively via Angular Signals.
  - **Implementation (Green)**: Build `InvoiceMakerComponent` with split-screen layout, responsive mobile tabs, and line-item manager.
- [x] **Task 3.2: Logo Upload & Base64 Persistence (Red → Green)**
  - **Test (Red)**: In `invoice-maker.component.spec.ts`, assert:
    - Dropping / selecting an image file converts it to Base64 and updates sender logo.
    - User can remove the uploaded logo.
  - **Implementation (Green)**: Implement logo file reader and removal handlers.
- [x] **Task 3.3: LocalStorage Auto-Save & Draft Recovery (Red → Green)**
  - **Test (Red)**: In `invoice-maker.component.spec.ts`, assert:
    - Editing fields writes updated draft to `localStorage`.
    - Loading component restores previous draft from `localStorage`.
    - "Clear Draft" resets state to fresh default.
  - **Implementation (Green)**: Implement LocalStorage auto-save effect and draft restoration.

---

### 🟩 Phase 4: Export, Download & Memory Hygiene (Seam 2)
- [x] **Task 4.1: Download PDF & Trigger Modal (Red → Green)**
  - **Test (Red)**: In `invoice-maker.component.spec.ts`, assert:
    - Clicking "Download PDF" generates the PDF, triggers anchor download with filename `invoice-[number].pdf`, and immediately revokes the object URL.
    - Post-download modal is displayed with ad unit and confirmation.
  - **Implementation (Green)**: Implement `downloadPdf()`, modal state, and URL cleanup.
- [x] **Task 4.2: Draft JSON Export & Import (Red → Green)**
  - **Test (Red)**: In `invoice-maker.component.spec.ts`, assert:
    - Exporting draft generates downloadable JSON.
    - Importing valid JSON file updates the invoice model.
  - **Implementation (Green)**: Implement JSON export and file import.

---

### 🟩 Phase 5: Privacy Guard Verification (Seam 2)
- [x] **Task 5.1: Zero Network Leakage (Red → Green)**
  - **Test (Red)**: In `invoice-maker.component.spec.ts`, spy on `fetch` and `XMLHttpRequest.prototype.open`, trigger PDF compilation and downloads, and assert 0 network calls occurred.
  - **Implementation (Green)**: Verify 100% offline client-side isolation.

---

### 🟩 Phase 6: Tool Registry, Routing & Platform Integration (Seam 3)
- [x] **Task 6.1: Register Tool in Tool Registry (Red → Green)**
  - Create `src/app/tools/documents/invoice-maker/index.ts` and add `invoiceMakerTool` to `TOOL_REGISTRY`.
- [x] **Task 6.2: Configure Route in `app.routes.ts`**
  - Add `/tools/invoice-maker` (and alias `/tools/invoice-receipt-maker`) with complete SEO metadata.
- [x] **Task 6.3: Update Home Catalog & Specs Roadmap**
  - Update `home.ts` status to `'ready'` with link to `/tools/invoice-maker`.
  - Mark Spec 06 as `[x]` in `specs/README.md`.

---

### 🟩 Phase 7: Final Verification & Build
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Run production build check: `npm run build` (0 errors, 0 warnings).
