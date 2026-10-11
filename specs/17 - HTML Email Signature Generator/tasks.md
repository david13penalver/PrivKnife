# Task List (TDD Vertical Slices): HTML Email Signature Generator

> **Tool**: `17 - HTML Email Signature Generator`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Domain Contracts & Test Fixtures Setup
- [x] **Task 1.1: Define Domain Types**
  - Path: `src/app/tools/dev/email-signature-generator/types.ts`
  - Define `SignatureTemplate`, `SignatureFont`, `SignatureFontSize`, `SignatureAvatarShape`, `SignatureConfig`, `SignatureExportState`.
- [x] **Task 1.2: Create Programmatic Test Fixtures**
  - Path: `src/app/tools/dev/email-signature-generator/test-fixtures.ts`
  - Define `DEFAULT_SIGNATURE_CONFIG`, `CORPORATE_SIGNATURE_CONFIG`, `MINIMAL_SIGNATURE_CONFIG`, and sample malicious config for security testing.

---

### 🟩 Phase 2: Core Email Signature Engine & HTML Builders (Seam 1)
- [x] **Task 2.1: Implement HTML Table Builder for All 5 Templates (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateSignatureHtml()` outputs bulletproof nested `<table>` tags with strict inline styles for:
    - 'modern' template (avatar, vertical line separator, highlighted title, social badges).
    - 'compact' template (condensed inline/two-row layout).
    - 'corporate' template (logo, formal structure, address, legal disclaimer).
    - 'minimal' template (subtle lines, clean typographic layout).
    - 'two-column' template (avatar/logo in left column, contact details and links in right column).
  - **Implementation (Green)**: Implement `generateSignatureHtml()` in `engine.ts`.
- [x] **Task 2.2: Implement Plain Text Fallback Generator (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generatePlainTextSignature()` formats clean ASCII string with name, title, contact details, and links.
  - **Implementation (Green)**: Implement plain-text formatter in `engine.ts`.
- [x] **Task 2.3: Implement Input Sanitization & Security (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `sanitizeSignatureConfig()` strips malicious script injection, unsafe protocols (`javascript:`), and malformed markup.
  - **Implementation (Green)**: Implement `sanitizeSignatureConfig()` using DOMPurify and protocol check in `engine.ts`.
- [x] **Task 2.4: Implement HTML Blob Exporter (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `exportSignatureHtmlBlob()` outputs a valid `text/html` Blob.
  - **Implementation (Green)**: Implement Blob exporter in `engine.ts`.

---

### 🟩 Phase 3: Angular Standalone Component UI & Signals (Seam 2)
- [x] **Task 3.1: Component Layout & State Signals (Red → Green)**
  - **Test (Red)**: In `email-signature-generator.component.spec.ts`, assert:
    - Component initializes with default configuration and reactive HTML output.
    - Updating fields (name, company, email, colors, font) reactively updates the signature output.
    - Switching templates reactively changes output markup structure.
    - Local image file upload loads data URI and updates avatar.
    - Reset button restores default configuration.
  - **Implementation (Green)**: Build `EmailSignatureGeneratorComponent` with configuration forms, template cards, and live preview.
- [x] **Task 3.2: Export, Download & Clipboard Actions (Red → Green)**
  - **Test (Red)**: In `email-signature-generator.component.spec.ts`, assert:
    - "Copy Rich Text" writes both `text/html` and `text/plain` to ClipboardItem.
    - "Copy HTML Code" writes raw HTML to clipboard.
    - "Download HTML" creates download anchor and revokes object URL.
    - LocalStorage saves drafts and reloads existing draft on init.
  - **Implementation (Green)**: Wire export handlers and localStorage persistence.

---

### 🟩 Phase 4: Privacy Guard Verification (Seam 2)
- [x] **Task 4.1: Zero Network Leakage (Red → Green)**
  - **Test (Red)**: In `email-signature-generator.component.spec.ts`, spy on `fetch` and `XMLHttpRequest.prototype.open`, run signature generation, avatar upload, and exports, and assert 0 network calls occurred.
  - **Implementation (Green)**: Verify 100% offline isolation.

---

### 🟩 Phase 5: Tool Registry, Routing & Platform Integration (Seam 3)
- [x] **Task 5.1: Register Tool in Tool Registry (Red → Green)**
  - Create `src/app/tools/dev/email-signature-generator/index.ts` and add `emailSignatureGeneratorTool` to `TOOL_REGISTRY`.
- [x] **Task 5.2: Configure Route in `app.routes.ts`**
  - Add `/tools/email-signature-generator` (and aliases) with complete SEO metadata.
- [x] **Task 5.3: Update Home Catalog & Specs Roadmap**
  - Add `email-signature-generator` to `home.ts` catalog with status `'ready'`.
  - Mark Spec 17 as `[x]` in `specs/README.md`.

---

### 🟩 Phase 6: Final Verification & Build
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Run production build check: `npm run build` (0 errors, 0 budget warnings).
