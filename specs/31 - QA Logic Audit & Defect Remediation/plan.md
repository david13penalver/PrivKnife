# Test-Driven Development (TDD) Implementation Plan: QA Logic Audit & Defect Remediation

> **Spec**: `31 - Comprehensive QA Logic Audit & Defect Remediation`  
> **Route(s)**: Platform-wide (`/components/card`, `/tools/subtitles-shifter`, `/tools/calendar-linker`, `/tools/email-signature-generator`, `/tools/css-mesh-gradient-maker`, `/tools/robots-sitemap-builder`, `/tools/markdown-cheatsheet`, `/tools/exif-stripper`, `/tools/pdf-redaction`, `/tools/crypto-hash-uuid`, `/tools/web-vitals`)  
> **Category**: Quality Assurance & Architecture Remediation  
> **Target Environment**: Chromium (Headless / Desktop 1280x900+)  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (Red → Green → Refactor in review)  

---

## 1. Architecture & Domain Overview

Following a comprehensive QA logic audit performed across all 29 tools and 4 platform pages in PrivKnife, six distinct logic, architectural, and privacy defects were identified and cataloged in [spec.md](file:///home/deivision/Projects/Programming/PrivKnife/specs/31%20-%20QA%20Logic%20Audit%20&%20Defect%20Remediation/spec.md).

The remediation plan strictly follows **`AGENTS.md` engineering standards**:
- **Directive 1 & 2 (Zero Server Ingestion, Zero Exfiltration & User Anonymity)**: Eliminate remote third-party network requests on page load in demo fixtures.
- **Directive 3 (Main UI Thread Protection)**: Keep state updates, form validation, and error boundaries synchronous and instantaneous (<16ms) without blocking.
- **Directive 4 (Strict Memory Hygiene)**: Preserve error handling while ensuring Object URLs and memory allocations are cleaned up appropriately.
- **Directive 5 (Modular Standalone Architecture & Signals)**: Adhere to Angular 22 Signals (`signal()`, `computed()`, `contentChild()`) and BEM (`c-`, `l-`, `g--`) styling conventions.

### Impacted Directory Layout

```
PrivKnife/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   └── card/
│   │   │       ├── card.ts                         # DEFECT-01: Fix [card-header] content projection
│   │   │       └── card.spec.ts                    # Seam 1: Unit tests for Card header projection
│   │   └── tools/
│   │       ├── dev/
│   │       │   ├── email-signature-generator/
│   │       │   │   ├── test-fixtures.ts            # DEFECT-02: Replace Unsplash URLs with inline SVG Data URIs
│   │       │   │   ├── engine.spec.ts              # Seam 2: Engine test vector updates
│   │       │   │   └── email-signature-generator.component.spec.ts # Seam 2: Privacy invariant test
│   │       │   └── web-vitals/
│   │       │       ├── engine.ts                   # DEFECT-06: Strict domain regex & concatenated URL rejection
│   │       │       └── engine.spec.ts              # Seam 4: URL validation test suite
│   │       └── privacy/
│   │           ├── crypto-hash-uuid/
│   │           │   ├── crypto-hash-uuid.component.ts # DEFECT-05: Align UUID quantity clamping to 1,000
│   │           │   └── crypto-hash-uuid.component.spec.ts # Seam 4: Clamping unit tests
│   │           ├── exif-stripper/
│   │           │   ├── exif-stripper.component.ts  # DEFECT-03: Preserve errorMessage on corrupt file drop
│   │           │   └── exif-stripper.component.spec.ts # Seam 3: Error state preservation tests
│   │           └── pdf-redaction/
│   │               ├── pdf-redaction.component.ts  # DEFECT-04: Add try/catch & error banner on invalid file drop
│   │               └── pdf-redaction.component.spec.ts # Seam 3: Invalid PDF error boundary tests
│   └── styles/
│       └── 04_components/
│           └── _c-card.scss                        # DEFECT-01: BEM card header collapse rule (:empty)
```

---

## 2. Pre-Agreed Testing Seams

Tests live exclusively at public boundaries to verify observable user behavior rather than private implementation details:

### Seam 1: Core UI Architecture & Content Projection Seam (`Card` Component Boundary)
- **Files Under Test**: [`card.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/components/card/card.ts) and [`card.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/components/card/card.spec.ts)
- **Public Interface**:
  - `<app-card [title]="title" [hasHeader]="hasHeader"> <div card-header>...</div> <p>Body</p> </app-card>`
- **What it catches**:
  - Ensures elements projected into `[card-header]` are **always rendered** in the DOM, even when neither `title` nor `[hasHeader]="true"` is supplied.
  - Ensures cards without any header content or title do not render an unnecessary header container.
  - Verifies BEM `.c-card__header` container structure.
- **What it misses**:
  - Tool-specific event handlers (covered in tool component tests).

### Seam 2: Zero-Exfiltration & Privacy Invariants Seam (`EmailSignatureGeneratorComponent` & Fixtures)
- **Files Under Test**: [`test-fixtures.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/email-signature-generator/test-fixtures.ts), [`engine.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/email-signature-generator/engine.spec.ts), and [`email-signature-generator.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/email-signature-generator/email-signature-generator.component.spec.ts)
- **Public Interface**:
  - `SAMPLE_SIGNATURE`, `CORPORATE_SIGNATURE_CONFIG`, `MODERN_MINIMAL_CONFIG`, `CREATIVE_ACCENT_CONFIG` in `test-fixtures.ts`.
  - Component initialization and template rendering in `EmailSignatureGeneratorComponent`.
- **What it catches**:
  - Zero Network Exfiltration: Asserts that 0 external HTTP requests (`window.fetch`, `XMLHttpRequest.prototype.open`, or DOM `<img>` network requests) are dispatched to `images.unsplash.com` or any remote server on initial mount.
  - Confirms avatars render cleanly as self-contained inline SVG Data URIs.
- **What it misses**:
  - End-client desktop email client rendering differences (e.g. Outlook MSO HTML table parsing).

### Seam 3: Tool Component Error Boundaries & Signal State Seam (`ExifStripperComponent` & `PdfRedactionComponent`)
- **Files Under Test**: [`exif-stripper.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/exif-stripper/exif-stripper.component.ts) / [`exif-stripper.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/exif-stripper/exif-stripper.component.spec.ts) and [`pdf-redaction.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/pdf-redaction/pdf-redaction.component.ts) / [`pdf-redaction.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/pdf-redaction/pdf-redaction.component.spec.ts)
- **Public Interface**:
  - `ExifStripperComponent.onFileSelected(file: File)` & `reset(preserveError?: boolean)`
  - `PdfRedactionComponent.onFileDropped(file: File)` & `errorMessage: Signal<string | null>`
- **What it catches**:
  - Ingesting a corrupted or non-image file in `exif-stripper` retains `errorMessage()` and displays an error alert banner in the DOM instead of silently wiping it.
  - Dropping a non-PDF or corrupted PDF in `pdf-redaction` catches the rejection cleanly, prevents uncaught console errors, sets `errorMessage()`, and presents user feedback.
  - User-initiated "Reset" clears the error message as expected.
- **What it misses**:
  - Low-level byte-offset parsing inside `engine.ts` (covered by engine unit specs).

### Seam 4: Input Validation & Boundary Clamping Seams (`CryptoHashUuidComponent` & `WebVitalsEngine`)
- **Files Under Test**: [`crypto-hash-uuid.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/crypto-hash-uuid/crypto-hash-uuid.component.ts) / [`crypto-hash-uuid.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/crypto-hash-uuid/crypto-hash-uuid.component.spec.ts) and [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/web-vitals/engine.ts) / [`engine.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/web-vitals/engine.spec.ts)
- **Public Interface**:
  - `CryptoHashUuidComponent.onQuantityTyped(event)` and `onQuantityBlur(event)`
  - `isValidUrl(input: string): boolean` in `web-vitals/engine.ts`
- **What it catches**:
  - Typing or blurring quantities > 1,000 in `crypto-hash-uuid` clamps strictly to 1,000 (matching template slider bounds).
  - Malformed concatenated URLs (e.g. `https://privknife.orghttps://example.com`) are rejected by `isValidUrl()`.
  - Nested protocol tokens (`http://`, `https://`) and invalid hostnames without proper top-level domains are rejected.
- **What it misses**:
  - Live PageSpeed Insights API network responses.

### Seam 5: Automated End-to-End Browser QA Verification Seam (Chromium Automation via Puppeteer)
- **Files Under Test**: `scratch/qa_runner.js` and dedicated domain test scripts in `scratch/`
- **Public Interface**:
  - Headless Chromium navigation to `http://localhost:4200/` running full tool interactions across all 29 tools.
- **What it catches**:
  - Verified DOM presence of previously dropped card header controls (Download buttons in Subtitles Shifter, Load Demo in Calendar Linker, Category Tabs in Email Signature Generator, Randomize in Mesh Gradient Maker).
  - Browser network request logs (asserting 0 third-party requests).
  - Browser console error/warning logs (asserting 0 uncaught errors on corrupt uploads).
- **What it misses**:
  - Private Angular component signal internals.

---

## 3. Data Models & Interface Contracts

### 3.1. Inline SVG Placeholder Constants (`DEFAULT_AVATAR_DATA_URI`)
```typescript
/**
 * Self-contained SVG Data URI for default avatar image.
 * Eliminates external network requests to third-party image hosts (Unsplash).
 */
export const DEFAULT_AVATAR_DATA_URI =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 24 24" fill="%2394a3b8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>';

/**
 * Self-contained SVG Data URI for default corporate logo image.
 */
export const DEFAULT_LOGO_DATA_URI =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60"><rect width="160" height="60" rx="8" fill="%23e2e8f0"/><text x="50%25" y="55%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23475569">LOGO</text></svg>';
```

### 3.2. Card Header Projection Detection Contract
```typescript
@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Template conditionally renders .c-card__header if title() || hasHeader() || hasProjectedHeader()
})
export class Card {
  readonly title = input<string>('');
  readonly hasHeader = input<boolean>(false);
  readonly hasFooter = input<boolean>(false);
  readonly interactive = input<boolean>(false);
  readonly customClass = input<string>('');

  protected readonly projectedHeader = contentChild<ElementRef>('[card-header]');
  protected readonly showHeader = computed(() => !!this.title() || this.hasHeader() || !!this.projectedHeader());
  protected readonly projectedFooter = contentChild<ElementRef>('[card-footer]');
  protected readonly showFooter = computed(() => this.hasFooter() || !!this.projectedFooter());
}
```

### 3.3. EXIF Stripper Reset Contract
```typescript
// exif-stripper.component.ts
reset(preserveError: boolean = false): void {
  this.cleanObjectUrls();
  this.selectedFile.set(null);
  this.metadata.set(null);
  this.strippedResult.set(null);
  this.cleanedDownloadUrl.set(null);
  this.cleanedFileName.set(null);
  if (!preserveError) {
    this.errorMessage.set(null);
  }
  this.isProcessing.set(false);
}
```

### 3.4. PDF Redaction Error Boundary Contract
```typescript
// pdf-redaction.component.ts
export class PdfRedactionComponent implements OnDestroy {
  readonly errorMessage = signal<string | null>(null);
  // ...
  async onFileDropped(file: File): Promise<void> {
    this.isProcessing.set(true);
    this.errorMessage.set(null);
    try {
      const buffer = await file.arrayBuffer();
      const doc = await loadPdfForRedaction(buffer, file.name);
      this.loadedDocument.set(doc);
      this.currentPageIndex.set(0);
      this.redactionsByPage.set(new Map());
      this.zoomLevel.set(1.0);
      await this.loadActivePagePreview();
    } catch (err: any) {
      this.errorMessage.set(err?.message || 'The selected file is not a valid PDF or is corrupted.');
      this.loadedDocument.set(null);
    } finally {
      this.isProcessing.set(false);
    }
  }
}
```

### 3.5. UUID Quantity Boundary Constants
```typescript
// crypto-hash-uuid.component.ts
export const MIN_UUID_QUANTITY = 1;
export const MAX_UUID_QUANTITY = 1000;
```

---

## 4. Defect-by-Defect Technical Remediation Strategy

### 4.1. DEFECT-01: Content Projection in `<app-card>`
1. **Red Test**:
   - In `card.spec.ts`, create a test host component that projects `<div card-header>Header Content</div>` into `<app-card>` without passing `title` or `[hasHeader]="true"`.
   - Assert that `.c-card__header` is rendered and contains `'Header Content'`.
   - Assert that an empty `<app-card><p>Body</p></app-card>` does **not** render `.c-card__header`.
2. **Green Implementation**:
   - In `card.ts`, use Angular 22 `contentChild<ElementRef>('[card-header]')` to dynamically detect projected header elements.
   - Define `protected readonly showHeader = computed(() => Boolean(this.title() || this.hasHeader() || this.projectedHeader()));`.
   - Update the template to `@if (showHeader())`.
   - In `_c-card.scss`, add `.c-card__header:empty { display: none; }` for defense-in-depth.
3. **Refactor & Verification**:
   - Verify all 7 impacted tools render their action buttons in browser automation tests.

### 4.2. DEFECT-02: Zero-Exfiltration Violation in `email-signature-generator`
1. **Red Test**:
   - In `email-signature-generator.component.spec.ts`, spy on `window.fetch`, `XMLHttpRequest.prototype.open`, and monitor DOM image `src` attributes.
   - Assert that `SAMPLE_SIGNATURE` contains 0 remote HTTP/HTTPS URLs.
2. **Green Implementation**:
   - In `test-fixtures.ts`, define `DEFAULT_AVATAR_DATA_URI` and `DEFAULT_LOGO_DATA_URI`.
   - Replace all `https://images.unsplash.com/...` references with `DEFAULT_AVATAR_DATA_URI` and `DEFAULT_LOGO_DATA_URI`.
   - Update `engine.spec.ts` line 60 to verify the logo data URI instead of the remote Unsplash URL.
3. **Refactor & Verification**:
   - Execute browser automation test on `/tools/email-signature-generator` and assert 0 outgoing network requests.

### 4.3. DEFECT-03: Silent Error Wiping in `exif-stripper`
1. **Red Test**:
   - In `exif-stripper.component.spec.ts`, add a test case where a corrupt non-image file (`createMockCorruptedFile()`) is passed to `onFileSelected()`.
   - Assert `component.errorMessage()` is not null and contains a helpful failure description.
   - Assert that the rendered DOM contains the error alert message.
2. **Green Implementation**:
   - Update `reset(preserveError: boolean = false)` in `exif-stripper.component.ts`.
   - In `onFileSelected()`, call `this.reset(true)` inside the `catch` block and set `this.errorMessage.set(err.message || 'Failed to parse image metadata. The file may be corrupt or unsupported.')`.
3. **Refactor & Verification**:
   - Verify clicking "Clear / Reset" resets `errorMessage` to null.

### 4.4. DEFECT-04: Unhandled Promise Rejection in `pdf-redaction`
1. **Red Test**:
   - In `pdf-redaction.component.spec.ts`, test passing a corrupted byte array / invalid file to `onFileDropped()`.
   - Assert that the promise resolves cleanly without throwing an unhandled rejection, `errorMessage()` is populated, and `loadedDocument()` is `null`.
   - Assert that the template renders the error banner.
2. **Green Implementation**:
   - Add `readonly errorMessage = signal<string | null>(null);` to `PdfRedactionComponent`.
   - Wrap `loadPdfForRedaction()` in `try / catch (err: any)`.
   - Add accessible error alert banner to `pdf-redaction.component.ts` template.
3. **Refactor & Verification**:
   - Test that dropping a valid PDF afterwards clears `errorMessage()`.

### 4.5. DEFECT-05: UUID Quantity Clamping Boundary Mismatch
1. **Red Test**:
   - In `crypto-hash-uuid.component.spec.ts`, update the typing/blur test to enter `5000` and assert that `uuidQuantity()` clamps to `1000` (not `5000`).
2. **Green Implementation**:
   - In `crypto-hash-uuid.component.ts`, set `const MAX_UUID_QUANTITY = 1000;`.
   - Clamp both `onQuantityTyped` and `onQuantityBlur` to `MAX_UUID_QUANTITY`.
3. **Refactor & Verification**:
   - Verify slider and text input remain synchronized between 1 and 1,000.

### 4.6. DEFECT-06: Malformed URL Validation in `web-vitals`
1. **Red Test**:
   - In `web-vitals/engine.spec.ts`, add test cases for `isValidUrl('https://privknife.orghttps://example.com')` &rarr; `false`, `isValidUrl('http://site.com/http://other.com')` &rarr; `false`, and `isValidUrl('invalid-domain-without-tld')` &rarr; `false`.
2. **Green Implementation**:
   - In `web-vitals/engine.ts`, reject inputs containing multiple protocol matches `(clean.match(/https?:\/\//g) || []).length > 1`.
   - Add strict RFC-compliant domain regex `domainRegex.test(url.hostname)`.
3. **Refactor & Verification**:
   - Ensure standard URLs (`example.com`, `https://privknife.org/tools`, `sub.domain.co.uk`) continue to pass.

---

## 5. Anti-Patterns to Prevent

- **No Implementation-Coupled Assertions**: Test observable DOM elements and public signal state (`errorMessage()`, `uuidQuantity()`, `.c-card__header`), never private methods.
- **No Remote Dependencies in Tests or Fixtures**: All fixture assets must be strictly inlined or synthetic data URIs. No network calls may ever be tolerated.
- **No Silently Dropped Failures**: Any runtime error during file parsing must communicate directly to the user through accessible, visible alerts.
- **No Discrepancies Between UI & Business Logic**: Numerical boundaries advertised in labels and attributes (`max="1000"`) must match TypeScript clamping constants bit-for-bit.

---

## 6. Verification & Acceptance Matrix

| Defect ID | Severity | File(s) | Verification Command | Acceptance Criteria |
|---|---|---|---|---|
| **DEFECT-01** | Critical (P0) | [`card.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/components/card/card.ts) | `npx vitest run src/app/components/card/card.spec.ts` | Projected `[card-header]` elements render across all 7 impacted tools without requiring `[hasHeader]="true"`. |
| **DEFECT-02** | High (Privacy) | [`test-fixtures.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/email-signature-generator/test-fixtures.ts) | `node scratch/test_dev_tools.js` | 0 outgoing network requests to Unsplash or external servers on `/tools/email-signature-generator`. |
| **DEFECT-03** | Medium | [`exif-stripper.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/exif-stripper/exif-stripper.component.ts) | `npx vitest run src/app/tools/privacy/exif-stripper/exif-stripper.component.spec.ts` | Corrupt image drop displays visible error banner; does not silently reset error state. |
| **DEFECT-04** | Medium | [`pdf-redaction.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/pdf-redaction/pdf-redaction.component.ts) | `npx vitest run src/app/tools/privacy/pdf-redaction/pdf-redaction.component.spec.ts` | Non-PDF upload catches error cleanly, updates `errorMessage` signal, and displays error banner. |
| **DEFECT-05** | Low | [`crypto-hash-uuid.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/crypto-hash-uuid/crypto-hash-uuid.component.ts) | `npx vitest run src/app/tools/privacy/crypto-hash-uuid/crypto-hash-uuid.component.spec.ts` | Quantity input strictly clamps to [1, 1000] matching template slider. |
| **DEFECT-06** | Medium | [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/web-vitals/engine.ts) | `npx vitest run src/app/tools/dev/web-vitals/engine.spec.ts` | Concatenated URLs like `https://privknife.orghttps://example.com` return `false`. |
