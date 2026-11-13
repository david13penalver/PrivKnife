# Spec 94 Evidence — Privacy Containment and Resource Safety

## Run record

- Date: 2026-11-13 (Europe/Madrid).
- Source revision before Spec 94 edits: `c3ebdda` (Spec 93 remediation commit). Verification was run against the Spec 94 working tree before commit.
- Environment: Node.js `v26.12.0`, npm `12.2.1`, Angular production build, Puppeteer with local Chromium, production preview at `http://127.0.0.1:4201`.
- Tool manifest: 58 canonical lazy-loaded tool routes.

## Implemented and verified

| Area | Change and evidence | Result |
|---|---|---|
| PageSpeed privacy | Removed PageSpeed request construction/execution; retained `/tools/web-vitals` as a localized informational legacy route and removed it from the canonical catalog. `qa/privacy-containment.test.mjs` guards the route/catalog split. | Pass. The browser check found no PageSpeed request in either locale. |
| DNS exception | Removed the WHOIS/RDAP proxy. DNS now uses four direct DoH resolvers, shows a localized disclosure and requires consent before requests. Request parameters contain only domain and record type. | Pass for the tested DNS flow. Browser evidence intercepts and validates the four resolver requests in English and Spanish. |
| Markup sanitization | Added DOMPurify HTML/SVG wrappers and applied them to trusted preview surfaces. Tests cover executable HTML/SVG and preserve a safe SVG rectangle. Application source scan rejects `eval()` and `new Function()`. | Sanitizer fixtures and static guard pass. Safe preview/export was not separately exercised on every affected tool. |
| CSP | Added production header configurations in `PrivKnife/public/_headers` and `PrivKnife/vercel.json`, plus an HTML meta policy. The local production preview returns CSP headers; the browser smoke checks CSP, a blob Worker, WebAssembly, PageSpeed inactivity, consent gating and resolver request shape. | Local production preview passes in English and Spanish. The deployed host could not be checked: [`curl` log](../../audit-evidence/spec94-live-csp-check.log) records `Could not resolve host: privknife.com`. The real deployment provider and its applied headers remain unverified. |
| Worker errors | Added worker runtime error paths for the six previously identified 3D exporters and the diff, font-subsetter and seamless-texture workers. Export tools surface failures rather than retrying a failed heavy operation synchronously. Static QA requires each tool worker creator to include an error handler and termination path. | Static QA passes; three new component tests exercise persistent-worker failures. Exhaustive stalled-worker timeout and progress behavior remain unverified. |
| Resource ownership | Inventory covers 24 source files creating Workers, 65 creating object URLs, and 15 creating Three.js WebGL renderers. Static teardown checks pass. Added a Chromium route-cycle probe that counts active Workers and object URLs while navigating into and away from every canonical tool. | Pass for route-initialized Workers/object URLs: all 58 routes return to the home baseline of zero active Workers and zero active object URLs. This does not cover resources allocated during file processing or verify Three.js GPU allocations. |
| Responsive route health | Ran the production browser route smoke for every canonical tool at 390px and 1440px, English and Spanish. It checks page errors, failed requests, horizontal overflow, ad containers, missing headings, expected canvases, and raw translation keys. | Pass: 58/58 in all four combinations. See the four `spec94-production-*.log` route logs linked below. This is Chromium emulation, not a physical-phone certification or a 320px check. |

## Verification results

- `npm run qa:test`: **12/12 checks pass**, including privacy, CSP, catalog, sanitization source guard, worker/object URL/Three.js disposal pairing, harness failure detection and coverage manifest protection.
- `npm run test:ci`: **139 test files, 1,730 tests pass**. All 143 executable tool files are present in the coverage manifest. Aggregate coverage is statements **76.26%**, branches **59.61%**, functions **54.83%**, lines **78.98%**. Only 1 of 143 files reaches 100% in all four metrics. Full report: [`spec94-coverage.log`](../../audit-evidence/spec94-coverage.log).
- `npm run build`: succeeds. Angular reports **387.32 kB** total initial bundle including **34.95 kB CSS** and estimates **105.77 kB** transfer size. Full output: [`spec94-build.log`](../../audit-evidence/spec94-build.log).
- Raw JavaScript budget uses the sum of uncompressed bytes for every `<script src>` and `modulepreload href` in the production `index.html`, excluding CSS and compressed transfer estimates. Result: **352,369 bytes**, limit **200,000 bytes**, **fail**. [`spec94-bundle-budget.log`](../../audit-evidence/spec94-bundle-budget.log). Tool engines and other heavy assets remain lazy chunks, but AC-94-05 is not met. The two largest initial chunks total 298,529 bytes; the total must be reduced or deferred by at least 152,369 bytes to satisfy the gate.
- A temporary source-map diagnostic build isolated the main initial payload sources: about **160 kB** in the Angular core/RxJS chunk (87 source modules) and **138 kB** in the main/router chunk (including the route table, whose source is about 62 kB). The English dictionary is a separate **27 kB** preload chunk. This confirms the budget excess is in shared framework/router startup, while tool implementations are emitted as lazy chunks. The diagnostic build was replaced with a normal production build afterward, so source maps are not left in the production output.
- Browser security result: [`spec94-production-security.log`](../../audit-evidence/spec94-production-security.log).
- Resource navigation cycle: [`spec94-resource-lifecycle.log`](../../audit-evidence/spec94-resource-lifecycle.log), 58/58 routes returned active Worker and object URL counts to baseline.
- Route smokes: [English 390px](../../audit-evidence/spec94-production-en390.log), [Spanish 390px](../../audit-evidence/spec94-production-es390.log), [English 1440px](../../audit-evidence/spec94-production-en1440.log), [Spanish 1440px](../../audit-evidence/spec94-production-es1440.log). Each reports **58/58** routes passed.
- Earlier mobile smoke failure identified three untranslated lamp preset labels; the missing EN/ES entries and equivalents in the other locale dictionaries were added. The initial failure is preserved in [`spec94-initial-smoke-en-390-found-untranslated-keys.log`](../../audit-evidence/spec94-initial-smoke-en-390-found-untranslated-keys.log).

## Open acceptance work

- **AC-94-01 — Partial:** PageSpeed and DNS request behavior are verified. No full feature-processing request audit has been run for all tools.
- **AC-94-02 — Partial:** Malicious markup sanitizer unit fixtures pass. Safe preview/export round trips are not verified for every sanitized surface.
- **AC-94-03 — Partial:** Local production CSP and Worker/WASM behavior pass; deployed response headers are unknown because production DNS resolution failed from this environment.
- **AC-94-04 — Partial:** All 58 route initialization/navigation cycles return active Worker and object URL counts to baseline, and worker error paths found in source were repaired. Processing-workflow resource counts, Three.js GPU disposal baselines, progress callbacks for every long task, and exhaustive UI-thread timing remain unverified. The code still retains synchronous fallbacks for environments without the Worker API.
- **AC-94-05 — Failed:** Raw initial JavaScript is 352,369 bytes, exceeding the 200,000-byte limit by 152,369 bytes. Do not substitute the 105.77 kB transfer estimate for the raw-byte criterion.

Until AC-94-04 is evidenced and AC-94-05 is resolved or explicitly re-scoped, this spec is not complete and Spec 95 should not start.
