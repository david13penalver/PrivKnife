# Plan 93: Audit Remediation - Remove Advertising Placeholders

See [spec](spec.md) and [tasks](tasks.md).

## Entry gate and dependencies

[92: Audit Remediation - Reliable Test and Browser Infrastructure](../92%20-%20Audit%20Remediation%20-%20Reliable%20Test%20and%20Browser%20Infrastructure/spec.md)

Read the audit and applicable Documents blueprints before implementation. Preserve existing user changes and baseline reports. Planning can proceed before dependencies, but dependent acceptance gates cannot be signed off early.

## Impacted areas

- `PrivKnife/src/app/tools`
- `PrivKnife/src/styles`
- `PrivKnife/src/app/pages`

## Implementation sequence

1. Inventory source markup and styles for ad-slot, adsbygoogle, sponsor and advertisement strings; confirm each match is advertising.
2. Remove placeholders and conditional variants, then adjust shared BEM layouts to close empty space.
3. Inspect all affected routes and dialogs at mobile/desktop sizes in English/Spanish; retain before/after evidence.

## Verification and evidence

Run focused checks for each repair, then the owning spec acceptance suite. Use the stable commands/configuration delivered by spec 92; do not invent green results from the historical audit. Save revision, environment, fixtures, expected and actual results, failures, reruns and output-validator results under a clearly dated evidence folder. Map each artifact to the acceptance criterion and tool.

- AC-93-01: No advertising markup or ad-only reserved space remains in source or reachable rendered states.
- AC-93-02: All 59 routes and affected download/result dialogs pass the browser ad assertion; responsive layouts remain usable.

## Completion rule

All tasks and acceptance criteria require evidence. Fixes discovered outside this scope belong to the owning spec and remain linked blockers until resolved. Do not mark a spec complete solely because unit tests pass, a file downloads, or a page loads.
