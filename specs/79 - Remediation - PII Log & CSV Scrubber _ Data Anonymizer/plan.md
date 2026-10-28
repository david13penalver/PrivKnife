# TDD Remediation Plan — PII Log & CSV Scrubber / Data Anonymizer

> **Spec ID**: `79`  
> **Remediates Tool**: `49 - PII Log & CSV Scrubber _ Data Anonymizer` (`/tools/pii-scrubber-anonymizer`)  
> **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/privacy/pii-scrubber-anonymizer/
├── types.ts                                    # Add worker message interfaces & progress callback types
├── engine.ts                                   # Add IPv6 regex scrubbing, Web Crypto SHA-256 pseudonymization, custom regex validation
├── engine.spec.ts                              # Add unit tests for IPv6 redaction, SHA-256 pseudonyms, and invalid custom regex validation
├── worker.ts                                   # NEW: Dedicated Web Worker for off-thread PII scrubbing with progress events
├── pii-scrubber-anonymizer.component.ts        # Add customRegex input, errorMessage signal/banner, worker integration, remove unused createObjectURL, responsive/dark-mode styles
└── pii-scrubber-anonymizer.component.spec.ts   # Add component tests for custom regex UI, error banner on empty salt/invalid regex, and memory cleanup
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Export Correctness Boundary (`engine.ts` / `engine.spec.ts`)
- **Functions under test**:
  - `validateScrubberOptions(options: PiiScrubberAnonymizerOptions)`
  - `scrubPiiText(text: string, options: PiiScrubberAnonymizerOptions)`
  - `processPiiScrub(source: File | Blob | string, options: PiiScrubberAnonymizerOptions, originalFileName?: string)`
- **Assertions that catch current bugs**:
  - Passing `"Client IPv6 2001:0db8:85a3:0000:0000:8a2e:0370:7334 and fe80::1ff:fe23:4567:890a"` with `scrubIpAddresses: true` redacts both IPv6 addresses and sets `stats.ipsRedacted === 2`.
  - Passing `customRegexPatterns: "[unclosed"` to `validateScrubberOptions()` returns `{ valid: false, error: /Invalid custom regex/i }`.
  - Running `scrubPiiText()` in `salted_hash_pseudonym` mode produces deterministic Web Crypto SHA-256 pseudonyms that change when `customSalt` changes.

### Seam 2: Web Worker & Main-Thread Protection Boundary (`worker.ts` / component)
- **Protocol**:
  - Request: `{ id: number; text: string; options: PiiScrubberAnonymizerOptions; originalFileName: string }`
  - Response: `{ id: number; type: 'progress' | 'result' | 'error'; percent?: number; result?: PiiScrubberAnonymizerResult; error?: string }`
- **Lifecycle**: Worker instance is terminated in `ngOnDestroy()` and `resetToDefaults()`.

### Seam 3: Component State, Controls, Sanitization & Resource Disposal Boundary (`pii-scrubber-anonymizer.component.ts` / `.spec.ts`)
- **Signals & Template Bindings**:
  - `#customRegexInput` updates `customRegexPatterns()` and renders `customMatchesRedacted` in `.c-audit-grid`.
  - Clearing `customSalt` in `salted_hash_pseudonym` mode and calling `scrubData()` populates `errorMessage()` and renders `.c-alert--danger` without throwing an unhandled rejection.
  - `handleFileSelected()` does **not** call `URL.createObjectURL()`.

### Seam 4: Mobile Responsive & Theme Styling Boundary (`pii-scrubber-anonymizer.component.ts`)
- `.l-columns__area` has `min-width: 0`; `.c-header__title` has `overflow-wrap: anywhere`; `.c-entity-grid` collapses to `1fr` at `@media (max-width: 480px)`; inputs use `font-size: 16px` on mobile and CSS variables (`var(--color-surface)`, `var(--color-text)`) for dark-mode compatibility.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: IPv6 Address Detection & Masking (`DEFECT-49-01`)
1. **Red**: In `engine.spec.ts`, add a test feeding standard (`2001:0db8:85a3:0000:0000:8a2e:0370:7334`) and compressed (`fe80::1ff:fe23:4567:890a`) IPv6 addresses to `scrubPiiText()` across all 3 redaction modes and asserting `stats.ipsRedacted === 2`.
2. **Green**: In `engine.ts`, add `ipv6Regex` inside `if (options.scrubIpAddresses)` prior to `ipv4Regex`, handling `replacement_tag` (`[IP_REDACTED]`), `mask_characters` (`2001:0db8:****:****`), and `salted_hash_pseudonym` (`IP_<hash>`).
3. **Refactor**: Consolidate IP replacement helper to avoid duplicate stat-increment logic between IPv6 and IPv4.

### Slice 2: Custom Regex Validation, UI Input & Audit Stat Chip (`DEFECT-49-02`)
1. **Red**:
   - In `engine.spec.ts`, write a test asserting `validateScrubberOptions({ ...DEFAULT_SCRUBBER_OPTIONS, customRegexPatterns: '[invalid' })` returns `{ valid: false }`.
   - In `pii-scrubber-anonymizer.component.spec.ts`, write a test querying `#customRegexInput`, setting `'EMP-\\d{4}'`, running `scrubData()` on `'User EMP-1042 logged in'`, and asserting `[CUSTOM_REDACTED]` and `customMatchesRedacted === 1` appear in the DOM.
2. **Green**:
   - Add `new RegExp(options.customRegexPatterns)` validation in `validateScrubberOptions()`.
   - Add `#customRegexInput` and the `🧩 Custom` audit chip to `pii-scrubber-anonymizer.component.ts`.
3. **Refactor**: Ensure custom regex errors propagate cleanly to the UI error banner.

### Slice 3: Web Crypto SHA-256 Salted Pseudonymization & Error Handling (`DEFECT-49-03`, `DEFECT-49-05`)
1. **Red**:
   - In `engine.spec.ts`, assert `scrubPiiText` in `salted_hash_pseudonym` mode uses `crypto.subtle.digest` and produces 12-hex-char pseudonyms (`USER_<12hex>`).
   - In `pii-scrubber-anonymizer.component.spec.ts`, set `redactionMode` to `'salted_hash_pseudonym'`, set `customSalt` to `''`, call `await component.scrubData()`, and assert `component.errorMessage()` is truthy and `.c-alert--danger` is rendered.
2. **Green**:
   - Upgrade `computePseudonym()` in `engine.ts` to async Web Crypto SHA-256 digesting.
   - Add `errorMessage = signal<string | null>(null)` and a `catch (err)` block in `PiiScrubberAnonymizerComponent.scrubData()`, rendering `.c-alert--danger` in the template.
3. **Refactor**: Clear `errorMessage.set(null)` at the start of `scrubData()` and in `resetToDefaults()`.

### Slice 4: Web Worker Offloading & Memory Hygiene (`DEFECT-49-04`, `DEFECT-49-07`)
1. **Red**: In `pii-scrubber-anonymizer.component.spec.ts`, spy on `URL.createObjectURL` during `handleFileSelected(createSyntheticLogFile())` and assert it is **not** called; verify `ngOnDestroy()` revokes any download URLs and terminates any active worker.
2. **Green**:
   - Remove the unused `URL.createObjectURL(file)` from `handleFileSelected()`.
   - Create `worker.ts` and wire worker offloading + `terminate()` in `ngOnDestroy()`.
3. **Refactor**: Keep fallback to direct `processPiiScrub()` when `typeof Worker === 'undefined'`.

### Slice 5: Mobile 320px Overflow Fix & Dark Mode Contrast (`DEFECT-49-06`)
1. **Red**: Verify via `audit.mjs pii-scrubber-anonymizer` that `small` (320px) currently reports `scrollWidth: 375` and `smallTouchTargetCount: 6`.
2. **Green**: Update component styles with `min-width: 0` on `.l-columns__area`, responsive `.c-entity-grid` (`1fr` below `480px`), `16px` mobile font size on `.c-scrubber-textarea`, `36px` minimum height on `.c-checkbox-label`, and CSS theme variables.
3. **Refactor**: Re-run headless Chrome layout report at `1366px`, `390px`, and `320px` to confirm `hasHorizontalScroll: false` across all viewports.
