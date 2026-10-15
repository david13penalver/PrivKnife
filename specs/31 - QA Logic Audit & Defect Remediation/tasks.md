# Task List (TDD Vertical Slices): QA Logic Audit & Defect Remediation

> **Spec**: `31 - Comprehensive QA Logic Audit & Defect Remediation`  
> **Rule**: Red before Green. Tests verify observable behavior at agreed seams. One vertical slice at a time.  
> **Status**: Completed  

---

## 📋 Task Breakdown

### 🟩 Phase 1: Core Architecture Remediation — `<app-card>` Content Projection (DEFECT-01)
- [x] **Task 1.1: Write Red Unit Tests for Header Projection in `card.spec.ts` (Seam 1)**
  - Path: [`card.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/components/card/card.spec.ts)
  - **Test (Red)**:
    - Create a test wrapper component projecting `<div card-header>Action Buttons</div>` into `<app-card>` without passing `title` or `[hasHeader]="true"`.
    - Assert that `.c-card__header` exists and contains `'Action Buttons'`.
    - Assert that an `<app-card>` without `title`, `hasHeader`, or `[card-header]` collapses cleanly without residual content.
- [x] **Task 1.2: Implement Content Projection Detection in `card.ts` & `_c-card.scss` (Green)**
  - Path: [`card.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/components/card/card.ts) and [`_c-card.scss`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/styles/04_components/_c-card.scss)
  - **Implementation (Green)**:
    - In `card.ts`, ensure `<ng-content select="[card-header]" />` and `<ng-content select="[card-footer]" />` are projected unconditionally inside their respective container elements.
    - In `_c-card.scss`, add `.c-card__header:empty { display: none; }` and `.c-card__footer:empty { display: none; }` so unused containers collapse with zero height and zero margin/padding.
- [x] **Task 1.3: Verify Unblocked Controls Across Impacted Tools (Seam 5)**
  - Run headless browser checks to verify action controls now render properly in:
    - [`subtitles-shifter.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/media/subtitles-shifter/subtitles-shifter.component.ts) (Download .srt, Copy, Tabs)
    - [`calendar-linker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/calendar-linker/calendar-linker.component.ts) (Load Demo, Download .ics, Copy HTML)
    - [`email-signature-generator.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/email-signature-generator/email-signature-generator.component.ts) (Personal, Contact, Company, Social, Design tabs)
    - [`mesh-gradient-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/mesh-gradient-maker/mesh-gradient-maker.component.ts) (Randomize, Add Point, Download PNG, CSS/Tailwind tabs)
    - [`robots-sitemap-builder.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/robots-sitemap-builder/robots-sitemap-builder.component.ts) (+ Add User-Agent Block)
    - [`markdown-cheatsheet.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/markdown-cheatsheet/markdown-cheatsheet.component.ts) (Reset, +Table, +Code, +Note)

---

### 🟩 Phase 2: Privacy Directive Remediation — Zero-Exfiltration Guard (DEFECT-02)
- [x] **Task 2.1: Write Red Tests for Local SVG Data URIs (Seam 2)**
  - Path: [`email-signature-generator.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/email-signature-generator/email-signature-generator.component.spec.ts) and [`engine.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/email-signature-generator/engine.spec.ts)
  - **Test (Red)**:
    - In `email-signature-generator.component.spec.ts`, spy on `window.fetch` and `XMLHttpRequest.prototype.open`, inspect rendered `<img>` elements, and assert 0 URLs start with `https://images.unsplash.com`.
    - In `engine.spec.ts`, update fixture assertions to expect `data:image/svg+xml`.
- [x] **Task 2.2: Replace Unsplash Remote URLs with Inline SVG Data URIs (Green)**
  - Path: [`test-fixtures.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/email-signature-generator/test-fixtures.ts) and [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/email-signature-generator/engine.ts)
  - **Implementation (Green)**:
    - Define `DEFAULT_AVATAR_DATA_URI` and `DEFAULT_LOGO_DATA_URI` constants containing self-contained inline Base64 SVG strings.
    - Replace all `https://images.unsplash.com/...` references with these constants.
    - Update `safeProtocolRegex` in `engine.ts` to allow `data:image/svg+xml;base64,`.
- [x] **Task 2.3: Verification of Zero Network Exfiltration (Seam 2 & Seam 5)**
  - Verify `npx vitest run src/app/tools/dev/email-signature-generator/` passes (23 tests passed).
  - Verify browser network requests in Puppeteer confirm 0 outbound requests on page load.

---

### 🟩 Phase 3: Error Resilience & State Preservation (DEFECT-03 & DEFECT-04)
- [x] **Task 3.1: EXIF Stripper Error State Preservation Test (Red)**
  - Path: [`exif-stripper.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/exif-stripper/exif-stripper.component.spec.ts)
  - **Test (Red)**:
    - Pass an invalid/corrupted file to `onFileSelected()`.
    - Assert that `component.errorMessage()` is populated with a descriptive error message.
    - Assert that the template renders the error alert box and that `isProcessing()` is `false`.
- [x] **Task 3.2: Implement Error Preservation in `exif-stripper.component.ts` (Green)**
  - Path: [`exif-stripper.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/exif-stripper/exif-stripper.component.ts)
  - **Implementation (Green)**:
    - Update `reset(preserveError: boolean = false)` so it only calls `this.errorMessage.set(null)` when `preserveError` is `false`.
    - In `onFileSelected()`, call `this.reset(true)` inside the `catch` block and assign `this.errorMessage.set(err.message || 'Failed to parse image metadata. File may be corrupted.')`.
- [x] **Task 3.3: PDF Redaction Invalid File Exception Test (Red)**
  - Path: [`pdf-redaction.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/pdf-redaction/pdf-redaction.component.spec.ts)
  - **Test (Red)**:
    - Pass a corrupt non-PDF file to `onFileDropped()`.
    - Assert that the call does not throw an uncaught promise rejection.
    - Assert that `component.errorMessage()` is populated and `loadedDocument()` is `null`.
    - Assert that the DOM displays an error message.
- [x] **Task 3.4: Implement Error Boundary & Alert Banner in `pdf-redaction.component.ts` (Green)**
  - Path: [`pdf-redaction.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/pdf-redaction/pdf-redaction.component.ts)
  - **Implementation (Green)**:
    - Add `readonly errorMessage = signal<string | null>(null);` to `PdfRedactionComponent`.
    - Wrap `loadPdfForRedaction()` in `try / catch` in `onFileDropped()`.
    - Add error alert UI banner in component template (`@if (errorMessage())`).
    - Clear `errorMessage` in `resetDocument()`.

---

### 🟩 Phase 4: Form Input Validation & Boundary Hardening (DEFECT-05 & DEFECT-06)
- [x] **Task 4.1: UUID Quantity Boundary Test (Red)**
  - Path: [`crypto-hash-uuid.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/crypto-hash-uuid/crypto-hash-uuid.component.spec.ts)
  - **Test (Red)**:
    - Update test line 87: type `9999` and assert that `uuidQuantity()` clamps strictly to `1000` (instead of `5000`).
    - Verify that blur event also clamps to `1000`.
- [x] **Task 4.2: Implement Boundary Clamping `MAX_UUID_QUANTITY = 1000` (Green)**
  - Path: [`crypto-hash-uuid.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/crypto-hash-uuid/crypto-hash-uuid.component.ts)
  - **Implementation (Green)**:
    - Update `onQuantityTyped` and `onQuantityBlur` to clamp against `1000`.
- [x] **Task 4.3: Web Vitals Malformed URL Validation Test (Red)**
  - Path: [`engine.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/web-vitals/engine.spec.ts)
  - **Test (Red)**:
    - Add test assertions in `describe('Website Performance & Core Web Vitals Engine')`:
      - `expect(isValidUrl('https://privknife.orghttps://example.com')).toBe(false);`
      - `expect(isValidUrl('http://site.com/http://other.com')).toBe(false);`
      - `expect(isValidUrl('invalid-no-tld')).toBe(false);`
      - `expect(isValidUrl('http://.com')).toBe(false);`
- [x] **Task 4.4: Implement Multi-Protocol Rejection & Strict Domain Regex (Green)**
  - Path: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/web-vitals/engine.ts)
  - **Implementation (Green)**:
    - In `isValidUrl(input: string)`, check for multiple occurrences of protocol indicators: `(clean.match(/https?:\/\//gi) || []).length > 1`.
    - Validate `url.hostname` against RFC-compliant domain regex `domainRegex.test(host)`.

---

### 🟩 Phase 5: Automated End-to-End Regression & Browser Automation
- [x] **Task 5.1: Run Headless Chromium Regression Suite**
  - Run all Puppeteer regression scripts in `scratch/`:
    - `scratch/test_privacy_tools.js`
    - `scratch/test_documents_tools.js`
    - `scratch/test_media_tools.js`
    - `scratch/test_audio_video_tools.js`
    - `scratch/test_dev_tools.js`
    - `scratch/test_3d_tools.js`
    - `scratch/test_platform_features.js`
  - Assert 0 missing buttons, 0 console errors, 0 exfiltration requests.
- [x] **Task 5.2: Run Full Angular Vitest Suite**
  - Run `npm test -- --watch=false` in `PrivKnife/`.
  - Assert 77 test suites pass, 701 tests pass with 0 failures.
- [x] **Task 5.3: Production Build Sanity Check**
  - Run `npm run build` in `PrivKnife/`.
  - Assert 0 compilation errors, 0 bundle budget warnings.

---

### 🟩 Phase 6: Documentation & Catalog Finalization
- [x] **Task 6.1: Update `specs/README.md`**
  - Update Spec 31 entry in [`specs/README.md`](file:///home/deivision/Projects/Programming/PrivKnife/specs/README.md) to mark remediation status as completed `[x]`.
