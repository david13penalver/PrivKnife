# Plan 94: Audit Remediation - Privacy Containment and Resource Safety

See [spec](spec.md) and [tasks](tasks.md).

## Entry gate and dependencies

[92: Audit Remediation - Reliable Test and Browser Infrastructure](../92%20-%20Audit%20Remediation%20-%20Reliable%20Test%20and%20Browser%20Infrastructure/spec.md)

Read the audit and applicable Documents blueprints before implementation. Preserve existing user changes and baseline reports. Planning can proceed before dependencies, but dependent acceptance gates cannot be signed off early.

## Impacted areas

- `PrivKnife/src/app/tools/dev/web-vitals`
- `PrivKnife/src/app/tools/dev/dns-checker`
- `PrivKnife/src/app/tools/tool-registry.ts`
- `PrivKnife/src/index.html`
- `PrivKnife/angular.json`
- `PrivKnife/src/app/core`
- `PrivKnife/src/app/tools`
- `production hosting configuration`

## Implementation sequence

1. Inventory external calls, CSP deployment files, unsafe rendering, heavy computation and resource ownership across the manifest.
2. Disable PageSpeed and reconcile catalog metadata/privacy messaging; verify DoH behavior and CSP restrictions explicitly.
3. Apply sanitization, worker/progress and cleanup fixes where reproducible evidence demonstrates gaps.
4. Run malicious-input, network-containment, memory-cycle and main-thread performance checks on representative fixtures for every applicable tool.
5. Build production and record initial JS bytes plus lazy chunk boundaries; fix budget violations and configure regression checks.

## Verification and evidence

Run focused checks for each repair, then the owning spec acceptance suite. Use the stable commands/configuration delivered by spec 92; do not invent green results from the historical audit. Save revision, environment, fixtures, expected and actual results, failures, reruns and output-validator results under a clearly dated evidence folder. Map each artifact to the acceptance criterion and tool.

- AC-94-01: Private processing produces zero unexpected outgoing requests; disabled PageSpeed cannot initiate a request.
- AC-94-02: Malicious SVG/HTML cannot execute; allowed content still previews/exports correctly.
- AC-94-03: Production CSP headers and worker/WASM smoke checks are recorded; DNS exception behavior is explicit.
- AC-94-04: Repeated reset/navigation returns resource counts to baseline; no unhandled worker promise hangs; no processing task over 50ms remains on the UI thread.
- AC-94-05: Raw initial JS is below 200KB and heavy tool libraries are lazy chunks.

## Completion rule

All tasks and acceptance criteria require evidence. Fixes discovered outside this scope belong to the owning spec and remain linked blockers until resolved. Do not mark a spec complete solely because unit tests pass, a file downloads, or a page loads.

## Current progress

Implementation and browser verification are recorded in [evidence.md](evidence.md). Privacy containment, sanitizer regression tests, worker error handling, route smoke, and production build evidence are present. Do not advance this spec to complete while AC-94-04 is unverified and AC-94-05 exceeds its raw-byte budget.
