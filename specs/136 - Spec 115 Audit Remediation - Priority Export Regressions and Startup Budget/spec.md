# Spec 136 · Priority Export Regressions and Startup Budget

**Prerequisites** · [135](../135%20-%20Spec%20115%20Audit%20Remediation%20-%20Reproducible%20Audit%20Baseline%20and%20Browser%20Workflows/spec.md)

## Scope

Preserve the applied fixes for unsafe PDF redaction output, fabricated OCR, invalid WOFF2, and excessive startup JavaScript. Existing verification of the priority fixes is evidence for the cases it exercised. Add the independent checks below wherever they are missing.

## Acceptance criteria

### AC1. Verify redaction through the UI

Cover the synthetic marker AUDITMARK near the edge of a rotated PDF page and preserve uncensored content and page geometry. Independently render and inspect the sanitized file for absence of covered text, annotations and source objects that contain the marker. Force the renderer to fail and require an actionable error and zero download events, including after a prior successful run.

### AC2. Verify local OCR and accessible status

Upload blank, independently generated unique-text, and damaged images. Run OCR through the real worker. Independently compare exported text and preview with the unique fixture. Blank and damaged inputs produce an empty result or a localized error without sample output. Verify keyboard picker activation, genuine intermediate worker progress and Spanish validation and error messages. Demo text can appear only through the explicit sample action.

### AC3. Verify WOFF2 output

Export a locally available licensed font such as Liberation Sans with basic Latin, kerning and layout retention enabled. Reopen WOFF2 in an independent decoder, compare intended glyphs and preserved layout tables or shaping, and check metadata and readable font format. Exercise option changes and failure recovery. Keep the encoder lazy and local.

### AC4. Enforce the measured startup budget

Run the production build and npm run qa:bundle-budget. Record raw initial JavaScript under 300,000 bytes and the separate Angular initial-assets measurement, which includes CSS and warns at 340 kB. Inspect the emitted dependency graph for eager tool dependencies and eager tool-specific English resources. Verify lazy dictionary loading and fallback on direct navigation and after locale changes.

### AC5. Promote repeatable regressions

Reuse qa/audit-115-browser.mjs and the current WOFF2 decoder verification where applicable. Exercise eligible cases in the secure local preview, record route asset loading and verify user inputs and outputs remain local. Link the earlier evidence and new test results.

## References

- [Spec 115 tool audit](../../SPEC_115_TOOL_AUDIT.md)
- [Remediation roadmap](../SPEC_115_REMEDIATION_ROADMAP.md)
- Earlier remediation specs [94](../94%20-%20Audit%20Remediation%20-%20Privacy%20Containment%20and%20Resource%20Safety/spec.md), [97](../97%20-%20Audit%20Remediation%20-%20Documents%20and%20Privacy%20Functional%20Validation/spec.md), [99](../99%20-%20Audit%20Remediation%20-%20Developer%20Data%20and%20Generators%20Functional%20Validation/spec.md)
- [Verification of the implemented priority fixes](../../SPEC_115_RECOMMENDED_SKILLS.md#verification-of-the-priority-fixes)
- [Existing browser regression](../../PrivKnife/qa/audit-115-browser.mjs)
- [Implementation plan](plan.md) and [task checklist](tasks.md)
