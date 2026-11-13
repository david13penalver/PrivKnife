# Tasks 97: Audit Remediation - Documents and Privacy Functional Validation

[Spec](spec.md) · [Plan](plan.md). Every box starts unchecked.

## Preparation

- [ ] T97-001: Verify dependencies, audit baseline and applicable blueprints; record source revision and environment.
- [ ] T97-002: Reproduce confirmed issues or document investigation-only cases; define fixtures and expected results.

## Implementation

- [ ] T97-010: Create per-tool acceptance cases from blueprints and the audit, including expected results and independent validators.
- [ ] T97-011: Add deterministic local fixtures and engine/worker tests for uncovered branches and boundary partitions.
- [ ] T97-012: Exercise real browser workflows, compare output to independent expectations, reproduce defects and implement repairs.
- [ ] T97-013: Repeat each tool workflow in both languages and mobile/desktop layouts, then reset/repeat and navigate away to verify cleanup.
- [ ] T97-014: Attach per-tool reports, output metadata, network logs and test results; pass changed coverage cases to spec 101.

## Per-tool completion ledger

Each row requires evidence linked to the requirements above. For functional specs 97–100, attach blueprint-derived cases, valid export/independent validation, malformed/boundary cases, EN/ES × mobile/desktop, reset/cancel and cleanup results. For other specs, attach the applicable localized-state, ad, responsive, coverage or final-verification evidence; do not substitute page-load checks for functionality.

- [ ] T97-TOOL-01: `barcode-labels` — complete all applicable acceptance checks and link results.
- [ ] T97-TOOL-02: `crypto-hash-uuid` — complete all applicable acceptance checks and link results.
- [ ] T97-TOOL-03: `emergency-recovery-kit` — complete all applicable acceptance checks and link results.
- [ ] T97-TOOL-04: `exif-stripper` — complete all applicable acceptance checks and link results.
- [ ] T97-TOOL-05: `face-plate-blur` — complete all applicable acceptance checks and link results.
- [ ] T97-TOOL-06: `file-encryptor-vault` — complete all applicable acceptance checks and link results.
- [ ] T97-TOOL-07: `floor-plan-furniture-scaler` — complete all applicable acceptance checks and link results.
- [ ] T97-TOOL-08: `grid-paper` — complete all applicable acceptance checks and link results.
- [ ] T97-TOOL-09: `invoice-maker` — complete all applicable acceptance checks and link results.
- [ ] T97-TOOL-10: `local-ocr-text-extractor` — complete all applicable acceptance checks and link results.
- [ ] T97-TOOL-11: `markdown-cheatsheet` — complete all applicable acceptance checks and link results.
- [ ] T97-TOOL-12: `nutrition-label-maker` — complete all applicable acceptance checks and link results.
- [ ] T97-TOOL-13: `pdf-merger` — complete all applicable acceptance checks and link results.
- [ ] T97-TOOL-14: `pdf-redaction` — complete all applicable acceptance checks and link results.
- [ ] T97-TOOL-15: `pdf-signer-stamper` — complete all applicable acceptance checks and link results.
- [ ] T97-TOOL-16: `pii-scrubber-anonymizer` — complete all applicable acceptance checks and link results.
- [ ] T97-TOOL-17: `table-tent-maker` — complete all applicable acceptance checks and link results.

## Acceptance and handoff

- [ ] T97-AC-01: Every listed tool has a completed supported-format workflow and boundary-case report; no placeholder implementation passes.
- [ ] T97-AC-02: Downloaded output is validated independently rather than by existence/nonzero bytes alone; clipboard content is checked with success/denial recovery.
- [ ] T97-AC-03: No unhandled errors, private-data network requests, leaked resources or silent batch failures occur. Inapplicable cases have explicit reasons.
- [ ] T97-AC-04: Every confirmed defect has a passing regression case and rerun evidence; unresolved blockers prevent spec completion.
- [ ] T97-CLOSE: Attach evidence, record unresolved blockers, update the audit resolution links and review every acceptance criterion before marking complete.
