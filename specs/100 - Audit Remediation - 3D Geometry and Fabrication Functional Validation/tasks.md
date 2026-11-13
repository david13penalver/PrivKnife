# Tasks 100: Audit Remediation - 3D Geometry and Fabrication Functional Validation

[Spec](spec.md) · [Plan](plan.md). Every box starts unchecked.

## Preparation

- [ ] T100-001: Verify dependencies, audit baseline and applicable blueprints; record source revision and environment.
- [ ] T100-002: Reproduce confirmed issues or document investigation-only cases; define fixtures and expected results.

## Implementation

- [ ] T100-010: Create per-tool acceptance cases from blueprints and the audit, including expected results and independent validators.
- [ ] T100-011: Add deterministic local fixtures and engine/worker tests for uncovered branches and boundary partitions.
- [ ] T100-012: Exercise real browser workflows, compare output to independent expectations, reproduce defects and implement repairs.
- [ ] T100-013: Repeat each tool workflow in both languages and mobile/desktop layouts, then reset/repeat and navigate away to verify cleanup.
- [ ] T100-014: Attach per-tool reports, output metadata, network logs and test results; pass changed coverage cases to spec 101.

## Per-tool completion ledger

Each row requires evidence linked to the requirements above. For functional specs 97–100, attach blueprint-derived cases, valid export/independent validation, malformed/boundary cases, EN/ES × mobile/desktop, reset/cancel and cleanup results. For other specs, attach the applicable localized-state, ad, responsive, coverage or final-verification evidence; do not substitute page-load checks for functionality.

- [ ] T100-TOOL-01: `braille-ada-sign-generator` — complete all applicable acceptance checks and link results.
- [ ] T100-TOOL-02: `cappuccino-stencil-maker` — complete all applicable acceptance checks and link results.
- [ ] T100-TOOL-03: `cookie-cutter` — complete all applicable acceptance checks and link results.
- [ ] T100-TOOL-04: `desk-wedge-nameplate` — complete all applicable acceptance checks and link results.
- [ ] T100-TOOL-05: `electronics-box-enclosure` — complete all applicable acceptance checks and link results.
- [ ] T100-TOOL-06: `geometric-plant-pot` — complete all applicable acceptance checks and link results.
- [ ] T100-TOOL-07: `gridfinity-bin-generator` — complete all applicable acceptance checks and link results.
- [ ] T100-TOOL-08: `hsw-insert-adapter` — complete all applicable acceptance checks and link results.
- [ ] T100-TOOL-09: `keycap-switch-tester-maker` — complete all applicable acceptance checks and link results.
- [ ] T100-TOOL-10: `lithophane-maker` — complete all applicable acceptance checks and link results.
- [ ] T100-TOOL-11: `parametric-lamp-designer` — complete all applicable acceptance checks and link results.
- [ ] T100-TOOL-12: `pet-id-tag-generator` — complete all applicable acceptance checks and link results.
- [ ] T100-TOOL-13: `qr-stand-keychain` — complete all applicable acceptance checks and link results.
- [ ] T100-TOOL-14: `skadis-pegboard-maker` — complete all applicable acceptance checks and link results.
- [ ] T100-TOOL-15: `under-desk-clamp-generator` — complete all applicable acceptance checks and link results.

## Acceptance and handoff

- [ ] T100-AC-01: Every listed tool has a completed supported-format workflow and boundary-case report; no placeholder implementation passes.
- [ ] T100-AC-02: Downloaded output is validated independently rather than by existence/nonzero bytes alone; clipboard content is checked with success/denial recovery.
- [ ] T100-AC-03: No unhandled errors, private-data network requests, leaked resources or silent batch failures occur. Inapplicable cases have explicit reasons.
- [ ] T100-AC-04: Every confirmed defect has a passing regression case and rerun evidence; unresolved blockers prevent spec completion.
- [ ] T100-CLOSE: Attach evidence, record unresolved blockers, update the audit resolution links and review every acceptance criterion before marking complete.
