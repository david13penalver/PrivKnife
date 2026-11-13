# Spec 94: Audit Remediation - Privacy Containment and Resource Safety

- **Status:** Ready for implementation; tasks unchecked.
- **Source:** [Application audit](../../APPLICATION_AUDIT_2026-11-13.md), including the completed lamp follow-up.
- **Dependencies:** [92: Audit Remediation - Reliable Test and Browser Infrastructure](../92%20-%20Audit%20Remediation%20-%20Reliable%20Test%20and%20Browser%20Infrastructure/spec.md)
- **Companion documents:** [Plan](plan.md), [Tasks](tasks.md).

## Problem

Web Vitals constructs Google PageSpeed requests, contradicting the private-suite promise. Production CSP, sanitization, worker responsiveness and resource disposal still require verification.

## Requirements

1. Disable remote PageSpeed execution and present a localized explanation; remove it from the fully client-side catalog until a genuinely local alternative exists. Preserve safe bookmarked-route behavior. Do not silently replace it with fake results.
2. Treat direct browser DoH only as the explicit repository exception: disclose the endpoint/query, require intentional execution, and keep files/text out of requests. Do not introduce WHOIS proxies.
3. Verify the production hosting configuration emits the required CSP (connect-src self/blob/data, script-src self/wasm-unsafe-eval, object-src none). If DoH is retained, document a narrowly scoped endpoint exception and its policy tradeoff; never silently widen connectivity.
4. Sanitize user-supplied HTML/SVG with DOMPurify before trusted rendering; reject executable payloads and prohibit eval/Function constructors.
5. Run computations exceeding 50ms or using WASM in workers, report deterministic progress for operations exceeding 100ms, terminate completed one-off workers and handle cancellation/error paths.
6. Match object URLs and Three.js geometry/material/texture allocations with disposal on reset/navigation; use chunking or streaming above 100MB and document supported limits.
7. Verify initial production JavaScript against the repository <200KB budget with a stated raw-byte accounting method; separate CSS and transfer estimates. Preserve router lazy loading and isolate heavy dependencies.

## Acceptance criteria

- **AC-94-01:** Private processing produces zero unexpected outgoing requests; disabled PageSpeed cannot initiate a request.
- **AC-94-02:** Malicious SVG/HTML cannot execute; allowed content still previews/exports correctly.
- **AC-94-03:** Production CSP headers and worker/WASM smoke checks are recorded; DNS exception behavior is explicit.
- **AC-94-04:** Repeated reset/navigation returns resource counts to baseline; no unhandled worker promise hangs; no processing task over 50ms remains on the UI thread.
- **AC-94-05:** Raw initial JS is below 200KB and heavy tool libraries are lazy chunks.

## Constraints and scope boundaries

All processing remains client-side with zero telemetry or ingestion. Preserve Angular standalone/lazy loading, Signals, typed forms, BEM/SASS conventions and cleanup requirements from AGENTS.md. No production implementation is performed by this documentation change. Existing specs remain design references; historical “ready”/“complete” labels are not evidence that the current audit gates pass.

Full linguistic certification beyond English/Spanish is deferred. Real-device or unavailable-codec checks must be recorded as blocked, never inferred from Chromium emulation. Workflows and fixtures must stay local.
