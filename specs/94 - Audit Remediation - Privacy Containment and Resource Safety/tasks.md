# Tasks 94: Audit Remediation - Privacy Containment and Resource Safety

[Spec](spec.md) · [Plan](plan.md). Every box starts unchecked.

## Preparation

- [ ] T94-001: Verify dependencies, audit baseline and applicable blueprints; record source revision and environment.
- [ ] T94-002: Reproduce confirmed issues or document investigation-only cases; define fixtures and expected results.

## Implementation

- [ ] T94-010: Inventory external calls, CSP deployment files, unsafe rendering, heavy computation and resource ownership across the manifest.
- [ ] T94-011: Disable PageSpeed and reconcile catalog metadata/privacy messaging; verify DoH behavior and CSP restrictions explicitly.
- [ ] T94-012: Apply sanitization, worker/progress and cleanup fixes where reproducible evidence demonstrates gaps.
- [ ] T94-013: Run malicious-input, network-containment, memory-cycle and main-thread performance checks on representative fixtures for every applicable tool.
- [ ] T94-014: Build production and record initial JS bytes plus lazy chunk boundaries; fix budget violations and configure regression checks.

## Acceptance and handoff

- [ ] T94-AC-01: Private processing produces zero unexpected outgoing requests; disabled PageSpeed cannot initiate a request.
- [ ] T94-AC-02: Malicious SVG/HTML cannot execute; allowed content still previews/exports correctly.
- [ ] T94-AC-03: Production CSP headers and worker/WASM smoke checks are recorded; DNS exception behavior is explicit.
- [ ] T94-AC-04: Repeated reset/navigation returns resource counts to baseline; no unhandled worker promise hangs; no processing task over 50ms remains on the UI thread.
- [ ] T94-AC-05: Raw initial JS is below 200KB and heavy tool libraries are lazy chunks.
- [ ] T94-CLOSE: Attach evidence, record unresolved blockers, update the audit resolution links and review every acceptance criterion before marking complete.
