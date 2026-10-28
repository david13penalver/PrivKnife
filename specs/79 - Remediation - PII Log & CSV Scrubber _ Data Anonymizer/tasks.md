# Remediation Tasks — PII Log & CSV Scrubber / Data Anonymizer

> **Spec ID**: `79`  
> **Remediates Tool**: `49 - PII Log & CSV Scrubber _ Data Anonymizer` (`/tools/pii-scrubber-anonymizer`)

---

## Phase 1: Engine & Algorithmic Remediation (Seam 1 — Red → Green)
- [ ] **Task 1.1 (Red — IPv6 Scrubbing Test)**: Add unit tests in `src/app/tools/privacy/pii-scrubber-anonymizer/engine.spec.ts` verifying full and compressed IPv6 addresses (`2001:0db8:85a3:0000:0000:8a2e:0370:7334`, `fe80::1ff:fe23:4567:890a`) are scrubbed in `replacement_tag`, `mask_characters`, and `salted_hash_pseudonym` modes (`DEFECT-49-01`).
- [ ] **Task 1.2 (Green — IPv6 Scrubbing Implementation)**: Implement `ipv6Regex` detection and redaction inside `scrubPiiText()` in `src/app/tools/privacy/pii-scrubber-anonymizer/engine.ts` (`DEFECT-49-01`).
- [ ] **Task 1.3 (Red — Custom Regex Validation & Web Crypto Pseudonym Tests)**: Add unit tests in `engine.spec.ts` for invalid `customRegexPatterns` rejection in `validateScrubberOptions()` and Web Crypto SHA-256 deterministic output in `scrubPiiText()` (`DEFECT-49-02`, `DEFECT-49-03`).
- [ ] **Task 1.4 (Green — Custom Regex Validation & Web Crypto SHA-256 Implementation)**: Update `validateScrubberOptions()` to validate `new RegExp(options.customRegexPatterns)` and upgrade `computePseudonym()` in `engine.ts` to use `crypto.subtle.digest('SHA-256', ...)` (`DEFECT-49-02`, `DEFECT-49-03`).

## Phase 2: Web Worker Offloading & Memory Hygiene (Seam 2 & 3 — Red → Green)
- [ ] **Task 2.1 (Red — Object URL Hygiene Test)**: Add a test in `pii-scrubber-anonymizer.component.spec.ts` asserting `URL.createObjectURL` is not called during `handleFileSelected()` and is revoked after `downloadDeliverable()` and `ngOnDestroy()` (`DEFECT-49-07`).
- [ ] **Task 2.2 (Green — Remove Unused Object URL & Add `worker.ts`)**: Remove unused `URL.createObjectURL(file)` from `handleFileSelected()`, create `src/app/tools/privacy/pii-scrubber-anonymizer/worker.ts`, and terminate any active worker in `ngOnDestroy()` (`DEFECT-49-04`, `DEFECT-49-07`).

## Phase 3: Component UI State, Controls & Error Handling (Seam 3 — Red → Green)
- [ ] **Task 3.1 (Red — Custom Regex Input & Error Banner Tests)**: Add tests in `pii-scrubber-anonymizer.component.spec.ts` verifying `#customRegexInput` binds to `customRegexPatterns()`, renders `customMatchesRedacted` in `.c-audit-grid`, and displays `.c-alert--danger` when `scrubData()` fails validation (e.g., empty salt in `salted_hash_pseudonym` mode or invalid custom regex) (`DEFECT-49-02`, `DEFECT-49-05`).
- [ ] **Task 3.2 (Green — Template Controls & Error Boundary)**: Add `#customRegexInput`, the `🧩 Custom` audit chip, `errorMessage = signal<string | null>(null)`, `catch` block in `scrubData()`, and `.c-alert--danger` alert banner in `pii-scrubber-anonymizer.component.ts` (`DEFECT-49-02`, `DEFECT-49-05`).

## Phase 4: Mobile Adaptation, Light/Dark Theme Contrast & BEM Styling (Seam 4)
- [ ] **Task 4.1 (Responsive 320px Layout & Touch Targets)**: Update styles in `pii-scrubber-anonymizer.component.ts` to add `min-width: 0` on `.l-columns__area`, wrap `.c-header__title` and `.c-card__header.l-extremo`, collapse `.c-entity-grid` to `1fr` at `@media (max-width: 480px)`, set `min-height: 36px` on `.c-checkbox-label`, and set `font-size: 1rem` on mobile textareas/inputs (`DEFECT-49-06`).
- [ ] **Task 4.2 (Light/Dark Mode Theme Variables)**: Replace hardcoded `#f8fafc`, `#0f172a`, `#334155`, and `#fff` colors in `pii-scrubber-anonymizer.component.ts` with CSS custom properties (`var(--color-surface)`, `var(--color-text)`, `var(--color-border)`) (`DEFECT-49-06`).

## Phase 5: Verification & Regression Gate
- [ ] **Task 5.1**: Run `npx vitest run src/app/tools/privacy/pii-scrubber-anonymizer/` and verify 100% test pass.
- [ ] **Task 5.2**: Run `npm run build` and verify zero TypeScript or bundler errors.
- [ ] **Task 5.3**: Run `node $SCRATCH/audit.mjs pii-scrubber-anonymizer` and verify 0 console/page errors, 0 external network requests, `hasHorizontalScroll: false` at `1366px`, `390px`, and `320px`, and valid `.txt`, `.csv`, and `.json` exports.
