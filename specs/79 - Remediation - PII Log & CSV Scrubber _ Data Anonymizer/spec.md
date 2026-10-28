# Remediation Specification — PII Log & CSV Scrubber / Data Anonymizer

> **Spec ID**: `79`  
> **Remediates Tool**: `49 - PII Log & CSV Scrubber _ Data Anonymizer`  
> **Slug**: `pii-scrubber-anonymizer`  
> **Category**: `privacy`  
> **Route**: `/tools/pii-scrubber-anonymizer`  
> **Audit Reference**: [`tools_31_60_audit.md#tool-49`](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-49)  
> **Current Audit Verdict**: Functional `✅ Works` | Mobile `⚠️ Minor issues` | Overall `⚠️`  
> **Status**: `Ready for Implementation`  
> **Priority**: `High`

---

## 1. Executive Summary & Audit Baseline

During the automated headless-Chrome functional and responsive audit across Desktop (`1366×900`), Mobile (`390×844`), and Small Mobile (`320×640`), the **PII Log & CSV Scrubber & Data Anonymizer** (`/tools/pii-scrubber-anonymizer`) demonstrated solid core scrubbing for emails, IPv4 addresses, phone numbers, Luhn-verified credit cards, US SSNs, and API tokens across replacement tag (`[EMAIL_REDACTED]`), character masking (`a***e@acme.corp`), and salted pseudonymization (`USER_370342d3`) modes, along with valid `.txt`, `.csv`, and `.json` audit exports.

However, the audit uncovered seven concrete defects across engine conformance, Web Worker thread protection, UI completeness, error handling, memory hygiene, and small-screen mobile responsiveness:
1. **IPv6 Addresses Not Scrubbed (`DEFECT-49-01`)**: Despite the UI checkbox explicitly advertising `IP Addresses (IPv4 / IPv6)`, `engine.ts` only runs an IPv4 regex (`ipv4Regex`) and leaves standard and compressed IPv6 addresses (e.g., `2001:0db8:85a3:0000:0000:8a2e:0370:7334`, `fe80::1ff:fe23:4567:890a`) completely unredacted in logs and CSVs.
2. **Missing Custom Regex UI Input & Audit Counter (`DEFECT-49-02`)**: `engine.ts` implements custom regex redaction (`options.customRegexPatterns`) and `PiiScrubberAnonymizerComponent` declares `readonly customRegexPatterns = signal<string>('')`, but the component template has no input field for custom regex patterns and `.c-audit-grid` omits `customMatchesRedacted`.
3. **Web Crypto SHA-256 Pseudonymization Gap (`DEFECT-49-03`)**: `spec.md` Section 1 requires Web Crypto salted pseudonymization, whereas `computePseudonym()` in `engine.ts` uses a non-cryptographic 32-bit FNV-1a hash (`0x811c9dc5`), which is vulnerable to trivial rainbow-table reversal on small domains (like IPv4 or SSNs).
4. **Main-Thread Execution Without Web Worker (`DEFECT-49-04`)**: `spec.md` Section 1 & 6 (`Directive 3`) mandate a dedicated Web Worker (`worker.ts`) for CPU-intensive multi-pass regex scrubbing and CSV streaming over large server logs, but no `worker.ts` exists.
5. **Unhandled Exception on Empty Salt in Salted Pseudonym Mode (`DEFECT-49-05`)**: Clearing the salt input and clicking **Sanitize & Anonymize** causes `validateScrubberOptions()` to throw an error in `processPiiScrub()` that `scrubData()` never catches, leaving the user with no UI error feedback.
6. **Horizontal Overflow at 320px & Fixed 2-Column Entity Grid (`DEFECT-49-06`)**: At `320×640`, `document.documentElement.scrollWidth` reaches `375px` (`hasHorizontalScroll: true`), `.c-entity-grid` stays hardcoded at `grid-template-columns: repeat(2, 1fr)`, checkboxes are `13×13px`, `.c-scrubber-textarea` uses `font-size: 0.85rem` (`13.6px < 16px`, triggering iOS Safari auto-zoom), and hardcoded light-mode colors (`#f8fafc`, `#0f172a`, `#334155`) break dark-mode contrast.
7. **Unused Object URL Allocation (`DEFECT-49-07`)**: `handleFileSelected()` allocates `URL.createObjectURL(file)` on every file upload without ever referencing the URL.

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-49-01` — IPv6 Addresses Are Never Redacted
- **Severity**: `High`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/pii-scrubber-anonymizer/engine.ts#L182-L196)
- **Symptom & Evidence**: Uploading `test.csv` containing `1,user@example.com,192.168.1.1,2001:0db8:85a3:0000:0000:8a2e:0370:7334` produced `1,[EMAIL_REDACTED],[IP_REDACTED],2001:0db8:85a3:0000:0000:8a2e:0370:7334`, leaking the full IPv6 address.
- **Root Cause**: Under `// 6. IP Addresses (IPv4 and IPv6)`, `scrubPiiText()` only defines and executes `ipv4Regex`. No IPv6 pattern exists.
- **Remediation Specification**:
  - Add an RFC 4291-compliant IPv6 regex matching full 8-hextet, compressed `::`, and IPv4-mapped IPv6 addresses before `ipv4Regex` inside `if (options.scrubIpAddresses)`.
  - Increment `stats.ipsRedacted` and `stats.totalRedactions` for each IPv6 match.
  - In `replacement_tag` mode return `'[IP_REDACTED]'`; in `mask_characters` mode keep the first two hextets and mask the remainder (e.g., `2001:0db8:****:****`); in `salted_hash_pseudonym` mode return the salted pseudonym `IP_<hash>`.

### `DEFECT-49-02` — Missing Custom Regex Input Control and Audit Stat Chip
- **Severity**: `Medium`
- **Category**: `Spec Conformance` / `BEM & Form Accessibility`
- **Location**: [`pii-scrubber-anonymizer.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/pii-scrubber-anonymizer/pii-scrubber-anonymizer.component.ts#L193-L226) and [`pii-scrubber-anonymizer.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/pii-scrubber-anonymizer/pii-scrubber-anonymizer.component.ts#L298-L305)
- **Symptom & Evidence**: `customRegexPatterns` is defined in `PiiScrubberAnonymizerOptions` (`spec.md` Section 7), implemented in `engine.ts` lines 198–212, and declared as `readonly customRegexPatterns = signal<string>('')` on line 428 of the component, but there is no input element in the template to configure it.
- **Root Cause**: The template omitted the form control for `customRegexPatterns` and the audit chip for `customMatchesRedacted`.
- **Remediation Specification**:
  - Add a labeled `.c-input` text control (`id="customRegexInput"`) bound to `[ngModel]="customRegexPatterns()"` and `(ngModelChange)="customRegexPatterns.set($event)"` with placeholder `e.g. EMP-\d{6}|ACC_[A-Z0-9]{8}`.
  - Add `<div class="c-audit-chip">🧩 Custom: <strong>{{ lastResult()?.auditStats?.customMatchesRedacted }}</strong></div>` inside `.c-audit-grid`.
  - Validate custom regex syntax in `validateScrubberOptions()` so malformed patterns surface a clear validation message rather than failing silently.

### `DEFECT-49-03` — Cryptographic Salted Pseudonymization Uses 32-Bit Non-Cryptographic Hash
- **Severity**: `Medium`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/pii-scrubber-anonymizer/engine.ts#L69-L79)
- **Symptom & Evidence**: `spec.md` Section 1 specifies `Web Crypto (salted pseudonymization)` and the UI badge states `cryptographic pseudonymization run exclusively in your browser memory`, but `computePseudonym()` computes a 32-bit FNV-1a integer hash.
- **Root Cause**: Synchronous `String.prototype.replace` callback prevented awaiting `crypto.subtle.digest('SHA-256', ...)`, so a 32-bit FNV-1a fallback was used.
- **Remediation Specification**:
  - Implement an async Web Crypto SHA-256 helper (`computeSha256Pseudonym(prefix, value, salt)`) using `globalThis.crypto?.subtle?.digest('SHA-256', new TextEncoder().encode(`${salt}:${value}`))` (with deterministic HMAC/FNV fallback only if `crypto.subtle` is unavailable) that returns a 12-hex-character digest prefix (`${prefix}_${hex12}`).
  - Pre-compute unique match pseudonyms asynchronously per category in `scrubPiiText()` before replacing matches.

### `DEFECT-49-04` — Missing Web Worker (`worker.ts`) for Off-Thread Scrubbing
- **Severity**: `Medium`
- **Category**: `Web Worker & Performance`
- **Location**: [`pii-scrubber-anonymizer/`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/pii-scrubber-anonymizer/)
- **Symptom & Evidence**: `spec.md` Section 1 (`Directive 3: Web Worker execution is required for this CPU-intensive workload`) and Section 6 specify `worker.ts`, which is missing from the directory.
- **Root Cause**: `PiiScrubberAnonymizerComponent.scrubData()` invokes `processPiiScrub()` directly on the Angular UI thread.
- **Remediation Specification**:
  - Create `src/app/tools/privacy/pii-scrubber-anonymizer/worker.ts` handling `{ type: 'scrub', text, options, originalFileName }` messages, posting progress updates (`{ type: 'progress', percent }`) and `{ type: 'result', result }` / `{ type: 'error', error }`.
  - In `PiiScrubberAnonymizerComponent`, offload inputs larger than 32 KB (or when `Worker` is available) to the worker with automatic fallback to `processPiiScrub()` in unit test environments where `Worker` is undefined, and terminate the worker in `ngOnDestroy()`.

### `DEFECT-49-05` — Uncaught Validation Error When Custom Salt Is Empty
- **Severity**: `Low`
- **Category**: `Component State & Error Handling`
- **Location**: [`pii-scrubber-anonymizer.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/pii-scrubber-anonymizer/pii-scrubber-anonymizer.component.ts#L519-L545)
- **Symptom & Evidence**: Selecting `Salted Pseudonym`, clearing the salt field, and clicking **Sanitize & Anonymize** causes `processPiiScrub()` to reject with `Error: A custom salt is required when using salted_hash_pseudonym mode`, which is uncaught in `scrubData()` (`try { ... } finally { ... }` has no `catch`).
- **Root Cause**: `scrubData()` lacks a `catch (err)` block and an `errorMessage` signal.
- **Remediation Specification**:
  - Add `readonly errorMessage = signal<string | null>(null);` to `PiiScrubberAnonymizerComponent`.
  - Wrap `scrubData()` in `try / catch / finally`, setting `this.errorMessage.set(err instanceof Error ? err.message : String(err))` on failure and rendering `<div class="c-alert c-alert--danger">` in the template.

### `DEFECT-49-06` — Horizontal Overflow at 320px, Small Touch Targets, iOS Auto-Zoom & Hardcoded Light Colors
- **Severity**: `Medium`
- **Category**: `Mobile & Responsive Layout` / `Theme Contrast`
- **Location**: [`pii-scrubber-anonymizer.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/pii-scrubber-anonymizer/pii-scrubber-anonymizer.component.ts#L331-L415)
- **Symptom & Evidence**:
  - At `320×640`, `scrollWidth` is `375px` (`hasHorizontalScroll: true`).
  - `.c-entity-grid` is locked to `grid-template-columns: repeat(2, 1fr)` on all screen widths.
  - Checkboxes measure `13×13px` (`smallTouchTargetCount: 6`), and `.c-scrubber-textarea` uses `font-size: 0.85rem` (`13.6px < 16px`, triggering iOS auto-zoom).
  - Hardcoded colors (`background: #f8fafc; color: #0f172a;`, `color: #334155`, `background: #fff`) ignore dark mode CSS variables.
- **Root Cause**: Component styles have zero `@media` queries, lack `min-width: 0` on `.l-columns__area`, and use hardcoded hex literals instead of design-system custom properties.
- **Remediation Specification**:
  - Extract styles or update inline `styles` to use CSS custom properties (`var(--color-surface, #f8fafc)`, `var(--color-text, #0f172a)`, `var(--color-border, #cbd5e1)`).
  - Add `min-width: 0` on `.l-columns__area`, set `overflow-wrap: anywhere` on `.c-header__title`, allow `.c-card__header.l-extremo` to `flex-wrap: wrap; gap: 0.5rem`, and collapse `.c-entity-grid` to `grid-template-columns: 1fr` below `480px`.
  - Set `font-size: 1rem` (`16px`) on `.c-scrubber-textarea` and `.c-input__text` on mobile viewports (`@media (max-width: 768px)`) to prevent iOS Safari zoom, and enlarge checkbox hit areas (`min-height: 36px; padding: 0.25rem 0` on `.c-checkbox-label` with `18×18px` checkboxes).

### `DEFECT-49-07` — Unused `URL.createObjectURL(file)` Allocation in `handleFileSelected()`
- **Severity**: `Low`
- **Category**: `Memory Hygiene`
- **Location**: [`pii-scrubber-anonymizer.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/pii-scrubber-anonymizer/pii-scrubber-anonymizer.component.ts#L485-L488)
- **Symptom & Evidence**: `handleFileSelected(file)` calls `const previewUrl = URL.createObjectURL(file); this.createdBlobUrls.push(previewUrl);` even though `previewUrl` is never bound or read anywhere.
- **Root Cause**: Leftover boilerplate from an image-preview tool.
- **Remediation Specification**: Remove the unused `URL.createObjectURL(file)` call in `handleFileSelected()` so object URLs are only created in `downloadDeliverable()` and revoked immediately after download and in `ngOnDestroy()`.

---

## 3. Target Acceptance Criteria

### 3.1. Functional & Spec Conformance
- [ ] **AC-49-01 (IPv4 & IPv6 Redaction)**: Enabling `scrubIpAddresses` redacts both IPv4 addresses (e.g., `192.168.1.45`) and full/compressed IPv6 addresses (e.g., `2001:0db8:85a3:0000:0000:8a2e:0370:7334`, `fe80::1ff:fe23:4567:890a`) across `replacement_tag`, `mask_characters`, and `salted_hash_pseudonym` modes, incrementing `stats.ipsRedacted`.
- [ ] **AC-49-02 (Custom Regex UI & Audit Stat)**: Users can enter a custom regex pattern in the configuration panel, see custom matches redacted in the output, see `customMatchesRedacted` in `.c-audit-grid`, and receive a clear `.c-alert--danger` message if the regex syntax is invalid.
- [ ] **AC-49-03 (Web Crypto Salted Pseudonymization)**: `salted_hash_pseudonym` mode produces deterministic SHA-256-based pseudonyms via Web Crypto (`crypto.subtle.digest`), and empty-salt errors are caught and displayed in `.c-alert--danger`.

### 3.2. Mobile & Responsive Layout & Theme Contrast
- [ ] **AC-49-04 (Zero Horizontal Overflow)**: `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at `1366px`, `390px`, and `320px`.
- [ ] **AC-49-05 (Touch Targets & iOS Zoom Prevention)**: `.c-entity-grid` collapses to 1 column at `<= 480px`, checkbox labels have `>= 36px` touch height, and text inputs/textareas have `font-size >= 16px` on mobile.
- [ ] **AC-49-06 (Light & Dark Mode Contrast)**: All textareas, inputs, chips, and audit panels use CSS custom properties with WCAG AA contrast in both light and dark themes.

### 3.3. `AGENTS.md` Prime Directives
- [ ] **AC-49-07 (Directives 1 & 2 — Zero Network)**: Zero external network requests during all scrubbing and export workflows.
- [ ] **AC-49-08 (Directive 3 — Web Worker)**: `worker.ts` exists and is wired with `ngOnDestroy()` termination.
- [ ] **AC-49-09 (Directive 4 — Memory Hygiene)**: No unused `URL.createObjectURL` calls on file selection; all download blob URLs are revoked after download and in `ngOnDestroy()`.
