# Spec 99: Audit Remediation - Developer Data and Generators Functional Validation

- **Status:** Ready for implementation; tasks unchecked.
- **Source:** [Application audit](../../APPLICATION_AUDIT_2026-11-13.md), including the completed lamp follow-up.
- **Dependencies:** [92: Audit Remediation - Reliable Test and Browser Infrastructure](../92%20-%20Audit%20Remediation%20-%20Reliable%20Test%20and%20Browser%20Infrastructure/spec.md), [94: Audit Remediation - Privacy Containment and Resource Safety](../94%20-%20Audit%20Remediation%20-%20Privacy%20Containment%20and%20Resource%20Safety/spec.md)
- **Companion documents:** [Plan](plan.md), [Tasks](tasks.md).

## Problem

Page-load checks and mocked unit tests do not establish actual processing or export correctness. This work owns end-to-end functional verification and defect repair for every tool listed below; findings must be reproduced before being labelled confirmed bugs.

## Requirements

1. For each tool, read its matching Documents blueprint and existing original/remediation specs before changing behavior. Record supported inputs, outputs, presets and numerical/format limits.
2. Drive valid input → configure → preview → export/copy → independent validation → reset/repeat in English and Spanish at 390px and 1440px. For unavailable external tools verify the safe disabled state instead.
3. Cover empty/malformed inputs, boundaries and just-outside values, Unicode, supported size limits, cancellation and repeated operations. Use synthetic local fixtures only; preserve zero telemetry and zero ingestion.
4. Validate CSV/SQL/JSON/Markdown and bank-format outputs using independent parsers; cover quotes/newlines, delimiters, nulls, Unicode, formulas and malicious field content.
5. Check calendars across DST/timezones/leap dates, escaping in ICS/robots/sitemaps/email signatures, URL validation and generated document syntax.
6. Verify chart totals/stacking/single-slice arcs and exported SVG/PNG/PDF equivalence, gradient output and contrast calculations using reference expectations.
7. Use real representative fonts for subset/conversion checks, adversarial SVG sanitization and diff cases with long lines/Unicode. Verify disabled PageSpeed and the disclosed DoH exception according to spec 94; never treat remote tools as local workflows.
8. Repair confirmed defects with meaningful regression assertions. Coordinate translations with 95 and layout fixes with 96; do not claim completion from test descriptions or mocked downloads.

## Acceptance criteria

- **AC-99-01:** Every listed tool has a completed supported-format workflow and boundary-case report; no placeholder implementation passes.
- **AC-99-02:** Downloaded output is validated independently rather than by existence/nonzero bytes alone; clipboard content is checked with success/denial recovery.
- **AC-99-03:** No unhandled errors, private-data network requests, leaked resources or silent batch failures occur. Inapplicable cases have explicit reasons.
- **AC-99-04:** Every confirmed defect has a passing regression case and rerun evidence; unresolved blockers prevent spec completion.

## Constraints and scope boundaries

All processing remains client-side with zero telemetry or ingestion. Preserve Angular standalone/lazy loading, Signals, typed forms, BEM/SASS conventions and cleanup requirements from AGENTS.md. No production implementation is performed by this documentation change. Existing specs remain design references; historical “ready”/“complete” labels are not evidence that the current audit gates pass.

Full linguistic certification beyond English/Spanish is deferred. Real-device or unavailable-codec checks must be recorded as blocked, never inferred from Chromium emulation. Workflows and fixtures must stay local.

## Explicit tool scope

- `bank-statement-converter` — `PrivKnife/src/app/tools/dev/bank-statement-converter`
- `calendar-linker` — `PrivKnife/src/app/tools/dev/calendar-linker`
- `color-palette-extractor` — `PrivKnife/src/app/tools/dev/color-palette-extractor`
- `csv-converter` — `PrivKnife/src/app/tools/dev/csv-converter`
- `csv-vector-chart-builder` — `PrivKnife/src/app/tools/dev/csv-vector-chart-builder`
- `diff-checker` — `PrivKnife/src/app/tools/dev/diff-checker`
- `dns-checker` — `PrivKnife/src/app/tools/dev/dns-checker`
- `email-signature-generator` — `PrivKnife/src/app/tools/dev/email-signature-generator`
- `font-subsetter-converter` — `PrivKnife/src/app/tools/dev/font-subsetter-converter`
- `mesh-gradient-maker` — `PrivKnife/src/app/tools/dev/mesh-gradient-maker`
- `robots-sitemap-builder` — `PrivKnife/src/app/tools/dev/robots-sitemap-builder`
- `svg-optimizer-cleaner` — `PrivKnife/src/app/tools/dev/svg-optimizer-cleaner`
- `web-vitals` — `PrivKnife/src/app/tools/dev/web-vitals`
