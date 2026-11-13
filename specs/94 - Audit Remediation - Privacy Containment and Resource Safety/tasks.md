# Tasks 94: Audit Remediation - Privacy Containment and Resource Safety

[Spec](spec.md) · [Plan](plan.md) · [Evidence](evidence.md).

Status: **In progress; acceptance blocked.** Checked boxes indicate completed preparation/inventory or implementation tasks. Partial work and failed acceptance criteria remain unchecked and are detailed in the evidence report.

## Preparation

- [x] T94-001: Verify dependencies, audit baseline and applicable blueprints; record source revision and environment.
- [x] T94-002: Reproduce confirmed issues or document investigation-only cases; define fixtures and expected results.

## Implementation

- [x] T94-010: Inventory external calls, CSP deployment files, unsafe rendering, heavy computation and resource ownership across the manifest.
- [x] T94-011: Disable PageSpeed and reconcile catalog metadata/privacy messaging; verify DoH behavior and CSP restrictions explicitly.
- [ ] T94-012: Apply sanitization, worker/progress and cleanup fixes where reproducible evidence demonstrates gaps. Sanitization and worker error paths were repaired; progress reporting and all-tool performance/resource instrumentation remain open.
- [ ] T94-013: Run malicious-input, network-containment, memory-cycle and main-thread performance checks on representative fixtures for every applicable tool.
- [ ] T94-014: Build production and record initial JS bytes plus lazy chunk boundaries; the regression check is configured, but the measured raw initial bundle still exceeds the required limit.

## Acceptance and handoff

- [ ] T94-AC-01: PageSpeed and DNS network behavior were tested, but zero unexpected requests were not verified during every tool workflow.
- [ ] T94-AC-02: Sanitizer attack fixtures pass; safe content preview/export was not exercised across every sanitized surface.
- [ ] T94-AC-03: Local production CSP, worker/WASM smoke and DNS disclosure pass; deployed production headers could not be fetched because `privknife.com` did not resolve in this environment.
- [ ] T94-AC-04: Repeated reset/navigation returns resource counts to baseline; no unhandled worker promise hangs; no processing task over 50ms remains on the UI thread.
- [ ] T94-AC-05: Raw initial JS is below 200KB and heavy tool libraries are lazy chunks. Measured raw initial JavaScript: 352,369 bytes; the criterion fails.
- [ ] T94-CLOSE: Evidence and blockers are recorded, but acceptance criteria remain open; do not close or start Spec 95 until the blockers are resolved or explicitly re-scoped.
