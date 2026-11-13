# Tasks 93: Audit Remediation - Remove Advertising Placeholders

[Spec](spec.md) · [Plan](plan.md). Every box starts unchecked.

## Preparation

- [x] T93-001: Verify dependencies, audit baseline and applicable blueprints; record source revision and environment in [evidence](evidence.md).
- [x] T93-002: Reproduce confirmed issues or document investigation-only cases; define fixtures and expected results in [evidence](evidence.md).

## Implementation

- [x] T93-010: Inventory source markup and styles for ad-slot, adsbygoogle, sponsor and advertisement strings; confirm each match is advertising. See [evidence](evidence.md).
- [x] T93-011: Remove placeholders and conditional variants, then adjust shared BEM layouts to close empty space. See [evidence](evidence.md).
- [x] T93-012: Inspect all affected routes and dialogs at mobile/desktop sizes in English/Spanish; retain before/after evidence. See browser results and the source-level conditional-dialog check in [evidence](evidence.md).

## Per-tool completion ledger

Each row requires evidence linked to the requirements above. For functional specs 97–100, attach blueprint-derived cases, valid export/independent validation, malformed/boundary cases, EN/ES × mobile/desktop, reset/cancel and cleanup results. For other specs, attach the applicable localized-state, ad, responsive, coverage or final-verification evidence; do not substitute page-load checks for functionality.

- [x] T93-TOOL-01: `barcode-labels` — complete all applicable acceptance checks and link results in [evidence](evidence.md).
- [x] T93-TOOL-02: `batch-compressor` — complete all applicable acceptance checks and link results in [evidence](evidence.md).
- [x] T93-TOOL-03: `calendar-linker` — complete all applicable acceptance checks and link results in [evidence](evidence.md).
- [x] T93-TOOL-04: `color-palette-extractor` — complete all applicable acceptance checks and link results in [evidence](evidence.md).
- [x] T93-TOOL-05: `email-signature-generator` — complete all applicable acceptance checks and link results in [evidence](evidence.md).
- [x] T93-TOOL-06: `favicon-generator` — complete all applicable acceptance checks and link results in [evidence](evidence.md).
- [x] T93-TOOL-07: `grid-paper` — complete all applicable acceptance checks and link results in [evidence](evidence.md).
- [x] T93-TOOL-08: `invoice-maker` — complete all applicable acceptance checks and link results in [evidence](evidence.md).
- [x] T93-TOOL-09: `markdown-cheatsheet` — complete all applicable acceptance checks and link results in [evidence](evidence.md).
- [x] T93-TOOL-10: `mesh-gradient-maker` — complete all applicable acceptance checks and link results in [evidence](evidence.md).
- [x] T93-TOOL-11: `og-card-maker` — complete all applicable acceptance checks and link results in [evidence](evidence.md).
- [x] T93-TOOL-12: `robots-sitemap-builder` — complete all applicable acceptance checks and link results in [evidence](evidence.md).
- [x] T93-TOOL-13: `subtitles-shifter` — complete all applicable acceptance checks and link results in [evidence](evidence.md).
- [x] T93-TOOL-14: `table-tent-maker` — complete all applicable acceptance checks and link results in [evidence](evidence.md).

## Acceptance and handoff

- [x] T93-AC-01: No advertising markup or ad-only reserved space remains in source or reachable rendered states. See source scan and browser assertion in [evidence](evidence.md).
- [x] T93-AC-02: All 59 routes and affected download/result dialogs pass the browser ad assertion; responsive layouts remain usable. See [evidence](evidence.md) for route, viewport and conditional-dialog validation scope.
- [x] T93-CLOSE: Attach evidence, record unresolved blockers, update the audit resolution links and review every acceptance criterion before marking complete. The audit finding links to this spec and [evidence](evidence.md).
