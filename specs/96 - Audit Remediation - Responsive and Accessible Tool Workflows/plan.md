# Plan 96: Audit Remediation - Responsive and Accessible Tool Workflows

See [spec](spec.md) and [tasks](tasks.md).

## Entry gate and dependencies

[92: Audit Remediation - Reliable Test and Browser Infrastructure](../92%20-%20Audit%20Remediation%20-%20Reliable%20Test%20and%20Browser%20Infrastructure/spec.md), [93: Audit Remediation - Remove Advertising Placeholders](../93%20-%20Audit%20Remediation%20-%20Remove%20Advertising%20Placeholders/spec.md), [95: Audit Remediation - Complete English and Spanish Localization](../95%20-%20Audit%20Remediation%20-%20Complete%20English%20and%20Spanish%20Localization/spec.md)

Read the audit and applicable Documents blueprints before implementation. Preserve existing user changes and baseline reports. Planning can proceed before dependencies, but dependent acceptance gates cannot be signed off early.

## Impacted areas

- `PrivKnife/src/app/components`
- `PrivKnife/src/styles`
- `PrivKnife/src/app/tools`

## Implementation sequence

1. Create a state/viewport/language matrix from the canonical manifest and identify shared layout/control fixes.
2. Fix shared primitives first, then tool-specific dialogs, forms, previews and touch interactions.
3. Capture screenshots and behavior assertions for the matrix; manually inspect dense controls and output viewers.
4. Record physical Android Chrome and iOS Safari checks with browser/device versions; if unavailable retain explicit blocked entries and do not claim full phone certification.

## Verification and evidence

Run focused checks for each repair, then the owning spec acceptance suite. Use the stable commands/configuration delivered by spec 92; do not invent green results from the historical audit. Save revision, environment, fixtures, expected and actual results, failures, reruns and output-validator results under a clearly dated evidence folder. Map each artifact to the acceptance criterion and tool.

- AC-96-01: Every manifest row has responsive state evidence, with no clipped actions, obstructed content or unintended horizontal document overflow.
- AC-96-02: Keyboard/touch workflows and accessible feedback pass; automated accessibility scans have no serious/critical findings and manual focus checks pass.
- AC-96-03: Device/browser evidence is attached; unavailable physical-device checks remain release blockers rather than implied passes.

## Completion rule

All tasks and acceptance criteria require evidence. Fixes discovered outside this scope belong to the owning spec and remain linked blockers until resolved. Do not mark a spec complete solely because unit tests pass, a file downloads, or a page loads.
