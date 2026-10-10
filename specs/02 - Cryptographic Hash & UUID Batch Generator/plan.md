# Test-Driven Development (TDD) Implementation Plan: Cryptographic Hash & UUID Batch Generator

> **Tool**: `02 - Cryptographic Hash & UUID Batch Generator`  
> **Route**: `/tools/crypto-hash-uuid`  
> **Category**: `privacy`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (Red → Green → Refactor in review)

---

## 1. Architecture & Domain Overview

The **Cryptographic Hash & UUID Batch Generator** is a high-throughput, client-side utility engineered for generating unique identifiers (UUIDv4) and computing cryptographic hash digests (SHA-256, SHA-512, SHA-1, MD5) in bulk.

In adherence with **Directive 1, 2, and 3 of `AGENTS.md`**:
- **Zero Server Ingestion**: Hashing and UUID generation rely exclusively on native browser primitives (`crypto.randomUUID()` and `window.crypto.subtle.digest()`), with an embedded pure TypeScript MD5 fallback.
- **Zero Telemetry**: Sensitive text, passwords, and IDs are never sent over the network.
- **Main Thread Protection**: Batch operations process asynchronously with chunking to maintain a fluid 60 FPS UI experience.

### Directory Layout (`src/app/tools/privacy/crypto-hash-uuid/`)
```
src/app/tools/privacy/crypto-hash-uuid/
├── index.ts                         # Tool registry definition and metadata
├── types.ts                         # Domain contracts and options
├── md5.ts                           # Pure client-side RFC 1321 MD5 implementation
├── engine.ts                        # Pure cryptographic calculation & export engine
├── engine.spec.ts                   # Unit tests for binary engine & NIST test vectors (Seam 1)
├── crypto-hash-uuid.component.ts    # Angular Standalone Component with Signals & BEM
├── crypto-hash-uuid.component.html  # Accessible UI template (Two-column layout)
├── crypto-hash-uuid.component.scss  # Scoped component styles
└── crypto-hash-uuid.component.spec.ts # Component & Privacy Verification Tests (Seam 2)
```

---

## 2. Pre-Agreed Testing Seams

Tests live strictly at public seams to verify user-facing behavior rather than private implementation details:

### Seam 1: `CryptoEngine` (Pure Processing Boundary — `engine.ts`)
- **Public Interface**:
  - `generateUuidBatch(options: UuidBatchOptions): string[]`
  - `formatUuid(uuid: string, options: UuidFormatOptions): string`
  - `hashText(text: string, algorithm: HashAlgorithm): Promise<string>`
  - `hashBatch(items: string[], algorithm: HashAlgorithm): Promise<HashResultItem[]>`
  - `exportBatch(data: string[] | HashResultItem[], format: ExportFormat, options?: ExportOptions): string`
- **What it catches**:
  - Correct RFC 4122 UUIDv4 compliance (36 chars with hyphens or 32 without; 13th char `'4'`, 17th char `[89ab]`).
  - Strict formatting rules (uppercase vs. lowercase, hyphens toggle, prefix/suffix, quote wrapping, custom delimiters).
  - Exact cryptographic hash accuracy against independent NIST / RFC known test vectors (empty string, standard pangrams, UTF-8 strings).
  - Serialization correctness for `.txt`, `.csv` (header mapping & escaping), and `.json`.
- **What it misses**:
  - DOM event handling, Tab switching, Angular Signal bindings, clipboard API, and browser download triggers.

### Seam 2: `CryptoHashUuidComponent` (Angular UI & Interaction Boundary — `crypto-hash-uuid.component.ts`)
- **Public Interface**:
  - Mode Switcher: User switches between `UUID Generator` tab and `String Hasher` tab.
  - UUID Generation: User adjusts quantity, casing, and delimiter &rarr; live paginated preview updates instantly.
  - String Hashing: User pastes bulk lines of text, selects algorithm &rarr; table displays input alongside computed digest.
  - Actions: "Copy to Clipboard", "Download (.txt, .csv, .json)".
- **What it catches**:
  - Signal state reactivity (`activeMode`, `uuidOptions`, `hasherOptions`, `generatedUuids`, `hashResults`, `isProcessing`).
  - Two-column responsive BEM layout (`.c-card`, `.c-badge`, `.c-input`, `.c-button`).
  - Zero Network Exfiltration: Asserts 0 HTTP calls (`fetch` / `XMLHttpRequest`) during generation and hashing.
  - Memory Hygiene: Asserts `URL.revokeObjectURL()` is called when downloading or resetting.
- **What it misses**:
  - Bitwise cryptographic algorithms (which Seam 1 covers).

### Seam 3: `ToolRegistry & AppRoutes` (Integration Boundary)
- **Public Interface**:
  - Tool definition registered in `src/app/tools/tool-registry.ts`.
  - Lazy route registered in `src/app/app.routes.ts` (`/tools/crypto-hash-uuid`).
- **What it catches**:
  - Dynamic discovery, keyword search in catalog, SEO titles and Open Graph metadata.
- **What it misses**:
  - Internal UI mechanics and crypto calculations.

---

## 3. Data Models (`types.ts`)

```typescript
export type HashAlgorithm = 'SHA-256' | 'SHA-512' | 'SHA-1' | 'MD5';
export type ExportFormat = 'txt' | 'csv' | 'json';
export type CasingOption = 'lowercase' | 'uppercase';
export type QuoteOption = 'none' | 'single' | 'double';

export interface UuidFormatOptions {
  casing: CasingOption;
  includeHyphens: boolean;
  quotes: QuoteOption;
  prefix?: string;
  suffix?: string;
}

export interface UuidBatchOptions extends UuidFormatOptions {
  quantity: number;
  delimiter: string;
}

export interface HashResultItem {
  input: string;
  hash: string;
  algorithm: HashAlgorithm;
}

export interface HashBatchOptions {
  algorithm: HashAlgorithm;
  casing: CasingOption;
}

export interface ExportOptions {
  delimiter?: string;
  csvHeader?: string;
}
```

---

## 4. Independent Test Vectors (Truth Source)

To prevent tautological assertions, tests assert against known NIST & RFC published digests:

1. **Empty String `""`**:
   - SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
   - SHA-512: `cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e`
   - SHA-1: `da39a3ee5e6b4b0d3255bfef95601890afd80709`
   - MD5: `d41d8cd98f00b204e9800998ecf8427e`

2. **"hello world"**:
   - SHA-256: `b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9`
   - MD5: `5eb63bbbe01eeed093cb22bb8f5acdc3`

3. **RFC 4122 UUIDv4 Pattern**:
   - Standard: `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`
   - No hyphens: `^[0-9a-f]{12}4[0-9a-f]{3}[89ab][0-9a-f]{15}$`

---

## 5. UI/UX Workflow & Component Design

- **Two-Column Desktop Layout**:
  - **Left Column (Control Panel)**:
    - Mode Switcher pills: `UUID Generator` vs `String Hasher`.
    - Options Form: Quantity slider/number input (1–10,000), Algorithm dropdown, Casing toggle (lower/upper), Hyphens toggle, Quotes dropdown, Custom Prefix/Suffix.
    - Generate Button: `<app-button variant="primary">`.
  - **Right Column (Live Preview & Export Panel)**:
    - Status & Count Badge: e.g., `Generated 100 UUIDs in 4ms`.
    - Live paginated / scrollable output box with line numbers and mono font (`--font-code`).
    - Quick Action Bar:
      - `Copy to Clipboard` `<app-button variant="secondary">` with visual "Copied!" feedback.
      - `Download .TXT` `<app-button variant="outline">`.
      - `Download .CSV` `<app-button variant="outline">`.
      - `Download .JSON` `<app-button variant="outline">`.
- **Security Notice Banner**:
  - Informative badge when MD5 is selected: `"⚠️ MD5 is considered cryptographically broken for security passwords. Use SHA-256 for secure hashing."`
