# Test-Driven Development (TDD) Implementation Plan: Instant Client-Side Invoice & Receipt Maker

> **Tool**: `06 - Instant Client-Side Invoice & Receipt Maker`  
> **Route**: `/tools/invoice-maker` (alias `/tools/invoice-receipt-maker`)  
> **Category**: `documents`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (Red → Green → Refactor)

---

## 1. Architecture & Domain Overview

The **Instant Client-Side Invoice & Receipt Maker** enables freelancers, contractors, and small business owners to generate clean, professional vector PDF invoices and printable receipts directly in their browser. All billing details, client identities, financial totals, and company logos remain strictly in client memory and LocalStorage, with zero backend servers and zero telemetry.

### Adherence to Core Directives:
- **Directive 1 (Zero Server Ingestion)**: Built entirely using `jsPDF` for vector document compilation and the HTML5 File API for local logo reading. No financial data leaves the client.
- **Directive 2 (Zero Telemetry)**: Absolute privacy for sensitive billing amounts, client addresses, and tax numbers. Zero tracking scripts or analytics.
- **Directive 3 (Main UI Thread Protection)**: Fast synchronous vector calculation and debounced real-time preview generation.
- **Directive 4 (Strict Memory Hygiene)**: Explicit revocation of blob object URLs (`URL.revokeObjectURL()`), canvas release, and lifecycle cleanup on `ngOnDestroy`.
- **Directive 5 (Lazy Loading)**: Dynamic standalone component loading via Angular router `loadComponent`.

### Directory Layout (`src/app/tools/documents/invoice-maker/`)
```
src/app/tools/documents/invoice-maker/
├── index.ts                         # Tool registry definition and metadata
├── types.ts                         # Domain models (InvoiceDocument, LineItem, Totals, Templates)
├── test-fixtures.ts                 # Sample invoices, receipts, and mock logo strings
├── engine.ts                        # Pure client-side calculation & jsPDF vector rendering
├── engine.spec.ts                   # Unit tests for totals math & vector PDF output (Seam 1)
├── invoice-maker.component.ts       # Angular Standalone Component with Signals & BEM
├── invoice-maker.component.html     # Split-screen Form Editor & Live PDF Preview template
├── invoice-maker.component.scss     # Scoped component styles
└── invoice-maker.component.spec.ts  # Component UI, LocalStorage & Privacy Tests (Seam 2)
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: `InvoiceEngine` (Pure Calculation & Vector PDF Generation — `engine.ts`)
- **Public Functions**:
  - `calculateTotals(doc: Pick<InvoiceDocument, 'items' | 'taxRate' | 'discountRate' | 'shipping' | 'amountPaid'>): InvoiceTotals`
  - `formatCurrency(amount: number, symbol: string): string`
  - `generateInvoicePdf(doc: InvoiceDocument): Promise<{ blob: Blob; buffer: Uint8Array; dataUri: string }>`
  - `validateInvoice(doc: Partial<InvoiceDocument>): { valid: boolean; errors: string[] }`
  - `createDefaultInvoice(): InvoiceDocument`
  - `serializeDraft(doc: InvoiceDocument): string`
  - `deserializeDraft(jsonStr: string): InvoiceDocument | null`
- **What it catches**:
  - Floating point rounding accuracy for subtotals, percentage discounts, and multi-currency tax rates.
  - Proper calculation of grand total and balance due.
  - Vector PDF compilation with proper headers, item tables, styling presets ('modern', 'classic', 'receipt'), and Base64 logo insertion.
  - Resilience against invalid or empty items and malformed draft JSON strings.
- **What it misses**:
  - Live DOM data binding, browser LocalStorage caching events, and UI modal dialogs.

### Seam 2: `InvoiceMakerComponent` (Angular UI, Signals & Privacy Boundary — `invoice-maker.component.ts`)
- **Public Interface**:
  - Split-screen layout (Form Editor on the left, Live Vector Preview on the right).
  - Dynamic line item controls: adding line items, removing line items, real-time recalculation.
  - Logo upload via File API with Base64 preview and removal.
  - Currency selector, tax %, discount %, and document type switcher (Invoice vs Receipt).
  - LocalStorage auto-save and restoration of drafts across reloads.
  - Export actions: PDF download with object URL cleanup, Print trigger, JSON draft export & import.
  - Responsive ad containers (728x90 leaderboard, 300x250 sidebar, post-download modal).
- **What it catches**:
  - Signal reactivity (`invoice()`, `totals()`, `activeTab()`, `isGenerating()`).
  - Strict Memory Hygiene (`URL.revokeObjectURL()` called when downloading).
  - Zero Network Exfiltration: Asserts 0 HTTP calls (`fetch` / `XMLHttpRequest`).
- **What it misses**:
  - Internal binary structure of the generated PDF bytes (tested in Seam 1).

### Seam 3: `ToolRegistry & AppRoutes` (Integration Boundary)
- **Public Interface**:
  - Tool definition registered in `TOOL_REGISTRY`.
  - Lazy route at `/tools/invoice-maker` with SEO metadata.
  - Catalog entry updated to `ready` in `home.ts`.
- **What it catches**:
  - Router lazy loading and SEO catalog discovery.
