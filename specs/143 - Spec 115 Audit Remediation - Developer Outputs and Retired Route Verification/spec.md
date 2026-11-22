# Spec 143 · Developer Outputs and Retired Route Verification

**Prerequisites** · [135](../135%20-%20Spec%20115%20Audit%20Remediation%20-%20Reproducible%20Audit%20Baseline%20and%20Browser%20Workflows/spec.md), [136](../136%20-%20Spec%20115%20Audit%20Remediation%20-%20Priority%20Export%20Regressions%20and%20Startup%20Budget/spec.md), [138](../138%20-%20Spec%20115%20Audit%20Remediation%20-%20Regex%20Runner%20Supersession%20and%20Touch%20Export/spec.md), [139](../139%20-%20Spec%20115%20Audit%20Remediation%20-%20Responsive%20and%20Accessible%20Tool%20Workflows/spec.md), [140](../140%20-%20Spec%20115%20Audit%20Remediation%20-%20Angular%20View%20Models%20and%20Canonical%20Tool%20Metadata/spec.md)

## Scope

Verify the 14 active developer tools and the retired Web Vitals route. Inspect outputs for semantic correctness and preserve explicit consent for the DNS checker.

## Acceptance criteria

### AC1. Parse output with independent consumers

Cover empty input, quoted delimiters, mixed line endings, combining Unicode characters and rapid edits. Use local parsers and renderers to inspect semantic values, ordering, escaping and latest-state behavior.

### AC2. Exercise guarded network behavior

Use deterministic resolver fixtures for explicit DNS lookup after consent, including timeout and empty answers. Assert no pre-consent query and no unrelated payload transmission. Check that Web Vitals and its legacy aliases (`/tools/pagespeed-checker` and `/tools/core-web-vitals`) show the retirement notice without external traffic or catalog membership.

### AC3. Keep specialized regressions in suite execution

Reuse the WOFF2 and regex checks from Specs 136 and 138, link their evidence and verify browser workflow coverage. Check localized errors, reset and retry for the applicable cases.

## Tool acceptance checklist

| Original spec | Canonical URL | Required workflow and independent check |
|---|---|---|
| 03 | [`/tools/csv-to-sql-json`](../../PrivKnife/src/app/tools/dev/csv-converter) | Round-trip quoted CRLFs, duplicate headers and Unicode through each export. |
| 13 | [`/tools/color-palette-extractor`](../../PrivKnife/src/app/tools/dev/color-palette-extractor) | Use a fully transparent image and compare contrast calculations at the threshold. |
| 14 | [`/tools/css-mesh-gradient-maker`](../../PrivKnife/src/app/tools/dev/mesh-gradient-maker) | Paste the generated CSS into an isolated preview and compare alpha stops. |
| 16 | [`/tools/calendar-linker`](../../PrivKnife/src/app/tools/dev/calendar-linker) | Reimport an all-day calendar event spanning a DST transition. |
| 17 | [`/tools/email-signature-generator`](../../PrivKnife/src/app/tools/dev/email-signature-generator) | Paste the signature into a local HTML consumer and verify escaped contact text. |
| 18 | [`/tools/robots-sitemap-builder`](../../PrivKnife/src/app/tools/dev/robots-sitemap-builder) | Parse exported sitemap XML with URLs containing ampersands and Unicode. |
| 28 | [`/tools/dns-checker`](../../PrivKnife/src/app/tools/dev/dns-checker) | Test one resolver timing out while another returns an empty answer. |
| 29 | [`/tools/web-vitals`](../../PrivKnife/src/app/tools/dev/web-vitals) | Open each legacy alias and verify the notice and absence of external traffic. |
| 50 | [`/tools/bank-statement-converter`](../../PrivKnife/src/app/tools/dev/bank-statement-converter) | Parse negative values, quoted payees and decimal commas in the exported ledger. |
| 54 | [`/tools/svg-optimizer-cleaner`](../../PrivKnife/src/app/tools/dev/svg-optimizer-cleaner) | Reopen the optimized SVG and compare geometry with a nested viewBox. |
| 55 | [`/tools/diff-checker`](../../PrivKnife/src/app/tools/dev/diff-checker) | Compare final-newline and Unicode-only edits while changing inputs rapidly. |
| 56 | [`/tools/font-subsetter-converter`](../../PrivKnife/src/app/tools/dev/font-subsetter-converter) | Decode exported WOFF2 independently and compare retained glyphs. |
| 60 | [`/tools/csv-vector-chart-builder`](../../PrivKnife/src/app/tools/dev/csv-vector-chart-builder) | Reopen SVG and PDF charts with negative values, duplicate labels and long legends. |
| 114 | [`/tools/json-sql-formatter`](../../PrivKnife/src/app/tools/dev/json-sql-formatter) | Check quoted SQL literals and Unicode JSON after multiple rapid format changes. |
| 115 | [`/tools/regex-tester-debugger`](../../PrivKnife/src/app/tools/dev/regex-tester-debugger) | Supersede a busy worker with a short match and verify both promises settle. |

## References

- [Spec 115 tool audit](../../SPEC_115_TOOL_AUDIT.md)
- [Remediation roadmap](../SPEC_115_REMEDIATION_ROADMAP.md)
- Earlier remediation specs [94](../94%20-%20Audit%20Remediation%20-%20Privacy%20Containment%20and%20Resource%20Safety/spec.md), [99](../99%20-%20Audit%20Remediation%20-%20Developer%20Data%20and%20Generators%20Functional%20Validation/spec.md)
- [Implementation plan](plan.md) and [task checklist](tasks.md)
