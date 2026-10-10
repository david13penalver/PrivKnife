# Task List (TDD Vertical Slices): Cryptographic Hash & UUID Batch Generator

> **Tool**: `02 - Cryptographic Hash & UUID Batch Generator`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.

---

## 📋 Task Breakdown

### 🟩 Phase 1: Domain Contracts & Test Vectors Setup
- [x] **Task 1.1: Create Domain Interfaces**
  - Path: `src/app/tools/privacy/crypto-hash-uuid/types.ts`
  - Define `HashAlgorithm`, `ExportFormat`, `CasingOption`, `QuoteOption`, `UuidFormatOptions`, `UuidBatchOptions`, `HashResultItem`, `HashBatchOptions`, `ExportOptions`.
- [x] **Task 1.2: Define Independent NIST / RFC Test Vectors**
  - Path: `src/app/tools/privacy/crypto-hash-uuid/test-vectors.ts`
  - Independent known test values for empty string, pangrams, and UTF-8 strings for SHA-256, SHA-512, SHA-1, and MD5.

---

### 🟩 Phase 2: CryptoEngine — UUID Generation & Formatting (Seam 1)
- [x] **Task 2.1: UUID Generation RFC 4122 Compliance (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `generateUuidBatch({ quantity: 10 })` produces 10 valid UUIDv4 strings matching standard RFC 4122 regex, with version nibble 4 and variant nibble `[89ab]`.
  - **Implementation (Green)**: Implement `generateUuidBatch()` in `engine.ts` using `crypto.randomUUID()`.
- [x] **Task 2.2: UUID Formatting Options (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert formatting options apply correctly:
    - Uppercase vs. Lowercase (`formatUuid(id, { casing: 'uppercase' })`)
    - Hyphens vs. No Hyphens (`formatUuid(id, { includeHyphens: false })` produces 32 hex chars)
    - Quotes (`quotes: 'double'` &rarr; `"..."`, `quotes: 'single'` &rarr; `'...'`)
    - Prefix and Suffix (`prefix: 'usr_'` &rarr; `usr_...`)
  - **Implementation (Green)**: Implement `formatUuid()` in `engine.ts`.

---

### 🟩 Phase 3: CryptoEngine — Cryptographic Hashing (Seam 1)
- [x] **Task 3.1: SHA-256 & SHA-512 & SHA-1 Hashing (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `hashText(input, 'SHA-256')` matches NIST published digests for empty string and "hello world". Same for SHA-512 and SHA-1.
  - **Implementation (Green)**: Implement `hashText()` in `engine.ts` using native `window.crypto.subtle.digest()`.
- [x] **Task 3.2: Pure Client-Side MD5 Fallback (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `hashText(input, 'MD5')` matches RFC 1321 published digests.
  - **Implementation (Green)**: Implement lightweight pure TypeScript RFC 1321 MD5 in `md5.ts` and integrate into `hashText()`.
- [x] **Task 3.3: Batch String Hashing (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert `hashBatch(['apple', 'banana', 'cherry'], 'SHA-256')` returns array of 3 `HashResultItem` objects.
  - **Implementation (Green)**: Implement `hashBatch()` in `engine.ts`.

---

### 🟩 Phase 4: CryptoEngine — Export Serialization (Seam 1)
- [x] **Task 4.1: Export to Plain Text, CSV, and JSON (Red → Green)**
  - **Test (Red)**: In `engine.spec.ts`, assert:
    - `exportBatch(data, 'txt')` joins with newlines
    - `exportBatch(data, 'csv', { csvHeader: 'uuid' })` produces valid CSV with header
    - `exportBatch(data, 'json')` produces valid parseable JSON string
  - **Implementation (Green)**: Implement `exportBatch()` in `engine.ts`.

---

### 🟩 Phase 5: Angular Standalone Component UI — UUID Mode (Seam 2)
- [x] **Task 5.1: UUID Mode Controls & Live Preview (Red → Green)**
  - **Test (Red)**: In `crypto-hash-uuid.component.spec.ts`, assert that:
    - Component initializes in UUID mode by default
    - Adjusting quantity or formatting triggers re-generation
    - Live preview box displays formatted UUIDs with count badge
  - **Implementation (Green)**: Build `CryptoHashUuidComponent` with Signals and BEM template.

---

### 🟩 Phase 6: Angular Standalone Component UI — String Hasher Mode (Seam 2)
- [x] **Task 6.1: String Hasher Mode & Algorithm Selection (Red → Green)**
  - **Test (Red)**: In `crypto-hash-uuid.component.spec.ts`, assert that:
    - Switching tab to `hasher` renders text input area
    - Pasting multiline text computes hashes using selected algorithm
    - MD5 selection displays the security warning badge
  - **Implementation (Green)**: Implement hasher mode tab and reactive hasher state.

---

### 🟩 Phase 7: Export, Download & Memory Hygiene (Seam 2)
- [x] **Task 7.1: Copy to Clipboard & File Downloads (Red → Green)**
  - **Test (Red)**: In `crypto-hash-uuid.component.spec.ts`, assert that:
    - Clicking Copy button invokes clipboard write
    - Clicking Download (.txt, .csv, .json) triggers client-side download anchor
    - Revokes object URLs on component destroy
  - **Implementation (Green)**: Implement download and copy handlers in component.

---

### 🟩 Phase 8: Privacy & Zero-Exfiltration Guard (Seam 2)
- [x] **Task 8.1: Zero Network Requests Verification (Red → Green)**
  - **Test (Red)**: In `crypto-hash-uuid.component.spec.ts`, spy on `window.fetch` and `XMLHttpRequest.prototype.open`, run generation and hashing, and assert 0 network requests occurred.
  - **Implementation (Green)**: Verify zero network leakage.

---

### 🟩 Phase 9: Tool Registry, Routing & Catalog Integration (Seam 3)
- [x] **Task 9.1: Register Tool in Tool Registry (Red → Green)**
  - **Test (Red)**: In `tool-registry.spec.ts`, assert `crypto-hash-uuid` is registered with `isFullyClientSide: true`.
  - **Implementation (Green)**: Create `src/app/tools/privacy/crypto-hash-uuid/index.ts` and update `tool-registry.ts`.
- [x] **Task 9.2: Lazy Route in `app.routes.ts`**
  - Add route `{ path: 'tools/crypto-hash-uuid', ... }` with SEO title and meta description.
- [x] **Task 9.3: Update Home Catalog & spec status**
  - Update `Home` catalog status from `'roadmap'` to `'ready'`.

---

### 🟩 Phase 10: Final Verification
- [x] Run full test suite: `npx ng test --watch=false` (all tests passing).
- [x] Production build check: `npm run build` (0 errors, 0 warnings).
- [x] Update `specs/README.md` catalog status to completed `[x]`.
