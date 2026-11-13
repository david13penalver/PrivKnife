# Tasks 98: Audit Remediation - Images Audio and Video Functional Validation

[Spec](spec.md) · [Plan](plan.md). Every box starts unchecked.

## Preparation

- [ ] T98-001: Verify dependencies, audit baseline and applicable blueprints; record source revision and environment.
- [ ] T98-002: Reproduce confirmed issues or document investigation-only cases; define fixtures and expected results.

## Implementation

- [ ] T98-010: Create per-tool acceptance cases from blueprints and the audit, including expected results and independent validators.
- [ ] T98-011: Add deterministic local fixtures and engine/worker tests for uncovered branches and boundary partitions.
- [ ] T98-012: Exercise real browser workflows, compare output to independent expectations, reproduce defects and implement repairs.
- [ ] T98-013: Repeat each tool workflow in both languages and mobile/desktop layouts, then reset/repeat and navigate away to verify cleanup.
- [ ] T98-014: Attach per-tool reports, output metadata, network logs and test results; pass changed coverage cases to spec 101.

## Per-tool completion ledger

Each row requires evidence linked to the requirements above. For functional specs 97–100, attach blueprint-derived cases, valid export/independent validation, malformed/boundary cases, EN/ES × mobile/desktop, reset/cancel and cleanup results. For other specs, attach the applicable localized-state, ad, responsive, coverage or final-verification evidence; do not substitute page-load checks for functionality.

- [ ] T98-TOOL-01: `audio-trimmer-booster` — complete all applicable acceptance checks and link results.
- [ ] T98-TOOL-02: `background-remover` — complete all applicable acceptance checks and link results.
- [ ] T98-TOOL-03: `batch-compressor` — complete all applicable acceptance checks and link results.
- [ ] T98-TOOL-04: `bpm-tap-detector` — complete all applicable acceptance checks and link results.
- [ ] T98-TOOL-05: `favicon-generator` — complete all applicable acceptance checks and link results.
- [ ] T98-TOOL-06: `heic-avif-converter` — complete all applicable acceptance checks and link results.
- [ ] T98-TOOL-07: `og-card-maker` — complete all applicable acceptance checks and link results.
- [ ] T98-TOOL-08: `passport-biometric-photo` — complete all applicable acceptance checks and link results.
- [ ] T98-TOOL-09: `screenshot-mockup` — complete all applicable acceptance checks and link results.
- [ ] T98-TOOL-10: `seamless-texture-generator` — complete all applicable acceptance checks and link results.
- [ ] T98-TOOL-11: `soundwave-art-maker` — complete all applicable acceptance checks and link results.
- [ ] T98-TOOL-12: `subtitles-shifter` — complete all applicable acceptance checks and link results.
- [ ] T98-TOOL-13: `video-compressor-resizer` — complete all applicable acceptance checks and link results.
- [ ] T98-TOOL-14: `video-gif-trimmer` — complete all applicable acceptance checks and link results.

## Acceptance and handoff

- [ ] T98-AC-01: Every listed tool has a completed supported-format workflow and boundary-case report; no placeholder implementation passes.
- [ ] T98-AC-02: Downloaded output is validated independently rather than by existence/nonzero bytes alone; clipboard content is checked with success/denial recovery.
- [ ] T98-AC-03: No unhandled errors, private-data network requests, leaked resources or silent batch failures occur. Inapplicable cases have explicit reasons.
- [ ] T98-AC-04: Every confirmed defect has a passing regression case and rerun evidence; unresolved blockers prevent spec completion.
- [ ] T98-CLOSE: Attach evidence, record unresolved blockers, update the audit resolution links and review every acceptance criterion before marking complete.
