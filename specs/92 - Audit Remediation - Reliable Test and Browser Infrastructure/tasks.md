# Tasks 92: Audit Remediation - Reliable Test and Browser Infrastructure

[Spec](spec.md) · [Plan](plan.md). Every box starts unchecked.

## Preparation

- [x] T92-001: Verify dependencies, audit baseline and applicable blueprints; record source revision and environment.
- [x] T92-002: Reproduce confirmed issues or document investigation-only cases; define fixtures and expected results.

## Implementation

- [x] T92-010: Inventory package versions, audit harnesses, existing CI and canonical routes; preserve the historical audit evidence.
- [x] T92-011: Implement shared test-environment setup with restored clipboard/browser mocks and diagnose the two timeout cases.
- [x] T92-012: Commit compatible coverage dependencies and runner configuration, scripts and clean-install instructions.
- [x] T92-013: Promote audit helpers into a maintained browser harness and manifest; add local fixtures and independent output-validator hooks.
- [x] T92-014: Run unit, coverage and representative real-browser smoke tests from a clean dependency installation; save versions, commands and reports.

## Acceptance and handoff

- [x] T92-AC-01: A clean install followed by the documented unit command has no failed tests or unexplained flaky reruns.
- [x] T92-AC-02: Two consecutive runs in the same environment produce stable pass/fail results; coverage reports include executable engines, components and workers or explicitly fail for omissions.
- [x] T92-AC-03: A seeded browser error, failed export and omitted tool are detected by the harness; at least one Canvas/WebGL workflow and one worker export run in the real browser.
- [x] T92-CLOSE: Attach evidence, record unresolved blockers, update the audit resolution links and review every acceptance criterion before marking complete.
