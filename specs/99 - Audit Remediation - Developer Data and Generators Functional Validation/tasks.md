# Tasks 99: Audit Remediation - Developer Data and Generators Functional Validation

[Spec](spec.md) · [Plan](plan.md). Every box starts unchecked.

## Preparation

- [ ] T99-001: Verify dependencies, audit baseline and applicable blueprints; record source revision and environment.
- [ ] T99-002: Reproduce confirmed issues or document investigation-only cases; define fixtures and expected results.

## Implementation

- [ ] T99-010: Create per-tool acceptance cases from blueprints and the audit, including expected results and independent validators.
- [ ] T99-011: Add deterministic local fixtures and engine/worker tests for uncovered branches and boundary partitions.
- [ ] T99-012: Exercise real browser workflows, compare output to independent expectations, reproduce defects and implement repairs.
- [ ] T99-013: Repeat each tool workflow in both languages and mobile/desktop layouts, then reset/repeat and navigate away to verify cleanup.
- [ ] T99-014: Attach per-tool reports, output metadata, network logs and test results; pass changed coverage cases to spec 101.

## Per-tool completion ledger

Each row requires evidence linked to the requirements above. For functional specs 97–100, attach blueprint-derived cases, valid export/independent validation, malformed/boundary cases, EN/ES × mobile/desktop, reset/cancel and cleanup results. For other specs, attach the applicable localized-state, ad, responsive, coverage or final-verification evidence; do not substitute page-load checks for functionality.

- [ ] T99-TOOL-01: `bank-statement-converter` — complete all applicable acceptance checks and link results.
- [ ] T99-TOOL-02: `calendar-linker` — complete all applicable acceptance checks and link results.
- [ ] T99-TOOL-03: `color-palette-extractor` — complete all applicable acceptance checks and link results.
- [ ] T99-TOOL-04: `csv-converter` — complete all applicable acceptance checks and link results.
- [ ] T99-TOOL-05: `csv-vector-chart-builder` — complete all applicable acceptance checks and link results.
- [ ] T99-TOOL-06: `diff-checker` — complete all applicable acceptance checks and link results.
- [ ] T99-TOOL-07: `dns-checker` — complete all applicable acceptance checks and link results.
- [ ] T99-TOOL-08: `email-signature-generator` — complete all applicable acceptance checks and link results.
- [ ] T99-TOOL-09: `font-subsetter-converter` — complete all applicable acceptance checks and link results.
- [ ] T99-TOOL-10: `mesh-gradient-maker` — complete all applicable acceptance checks and link results.
- [ ] T99-TOOL-11: `robots-sitemap-builder` — complete all applicable acceptance checks and link results.
- [ ] T99-TOOL-12: `svg-optimizer-cleaner` — complete all applicable acceptance checks and link results.
- [ ] T99-TOOL-13: `web-vitals` — complete all applicable acceptance checks and link results.

## Acceptance and handoff

- [ ] T99-AC-01: Every listed tool has a completed supported-format workflow and boundary-case report; no placeholder implementation passes.
- [ ] T99-AC-02: Downloaded output is validated independently rather than by existence/nonzero bytes alone; clipboard content is checked with success/denial recovery.
- [ ] T99-AC-03: No unhandled errors, private-data network requests, leaked resources or silent batch failures occur. Inapplicable cases have explicit reasons.
- [ ] T99-AC-04: Every confirmed defect has a passing regression case and rerun evidence; unresolved blockers prevent spec completion.
- [ ] T99-CLOSE: Attach evidence, record unresolved blockers, update the audit resolution links and review every acceptance criterion before marking complete.
