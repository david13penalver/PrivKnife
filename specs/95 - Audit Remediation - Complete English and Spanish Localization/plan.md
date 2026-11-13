# Plan 95: Audit Remediation - Complete English and Spanish Localization

See [spec](spec.md) and [tasks](tasks.md).

## Entry gate and dependencies

[92: Audit Remediation - Reliable Test and Browser Infrastructure](../92%20-%20Audit%20Remediation%20-%20Reliable%20Test%20and%20Browser%20Infrastructure/spec.md)

Read the audit and applicable Documents blueprints before implementation. Preserve existing user changes and baseline reports. Planning can proceed before dependencies, but dependent acceptance gates cannot be signed off early.

## Impacted areas

- `PrivKnife/src/app/core/i18n`
- `PrivKnife/src/app/tools`
- `PrivKnife/src/app/app.routes.ts`
- `PrivKnife/src/app/core/seo`
- `PrivKnife/src/app/components/lang-selector`

## Implementation sequence

1. Inventory literal strings and rendered states per canonical tool; begin with invoice controls, Web Vitals errors/title and missing lamp presets.
2. Move application-owned strings into typed local dictionaries and localized route metadata; use interpolation for dynamic messages.
3. Implement selector-switch, persistence and missing-key assertions with permitted identity-string exceptions.
4. Review every tool in both languages including errors, output and screen-reader labels; capture evidence and fix long-label layout issues with spec 96.

## Verification and evidence

Run focused checks for each repair, then the owning spec acceptance suite. Use the stable commands/configuration delivered by spec 92; do not invent green results from the historical audit. Save revision, environment, fixtures, expected and actual results, failures, reruns and output-validator results under a clearly dated evidence folder. Map each artifact to the acceptance criterion and tool.

- AC-95-01: No raw translation keys or unintended English fallback appears in either language across exercised states.
- AC-95-02: All 59 tools have completed English/Spanish state reviews; exported explanatory labels and errors are covered.
- AC-95-03: Language changes preserve work and update shell/tool/document metadata without reload; all supported dictionary modules still compile.

## Completion rule

All tasks and acceptance criteria require evidence. Fixes discovered outside this scope belong to the owning spec and remain linked blockers until resolved. Do not mark a spec complete solely because unit tests pass, a file downloads, or a page loads.
