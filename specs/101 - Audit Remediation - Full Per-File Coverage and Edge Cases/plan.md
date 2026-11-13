# Plan 101: Audit Remediation - Full Per-File Coverage and Edge Cases

See [spec](spec.md) and [tasks](tasks.md).

## Entry gate and dependencies

[92: Audit Remediation - Reliable Test and Browser Infrastructure](../92%20-%20Audit%20Remediation%20-%20Reliable%20Test%20and%20Browser%20Infrastructure/spec.md), [93: Audit Remediation - Remove Advertising Placeholders](../93%20-%20Audit%20Remediation%20-%20Remove%20Advertising%20Placeholders/spec.md), [94: Audit Remediation - Privacy Containment and Resource Safety](../94%20-%20Audit%20Remediation%20-%20Privacy%20Containment%20and%20Resource%20Safety/spec.md), [95: Audit Remediation - Complete English and Spanish Localization](../95%20-%20Audit%20Remediation%20-%20Complete%20English%20and%20Spanish%20Localization/spec.md), [96: Audit Remediation - Responsive and Accessible Tool Workflows](../96%20-%20Audit%20Remediation%20-%20Responsive%20and%20Accessible%20Tool%20Workflows/spec.md), [97: Audit Remediation - Documents and Privacy Functional Validation](../97%20-%20Audit%20Remediation%20-%20Documents%20and%20Privacy%20Functional%20Validation/spec.md), [98: Audit Remediation - Images Audio and Video Functional Validation](../98%20-%20Audit%20Remediation%20-%20Images%20Audio%20and%20Video%20Functional%20Validation/spec.md), [99: Audit Remediation - Developer Data and Generators Functional Validation](../99%20-%20Audit%20Remediation%20-%20Developer%20Data%20and%20Generators%20Functional%20Validation/spec.md), [100: Audit Remediation - 3D Geometry and Fabrication Functional Validation](../100%20-%20Audit%20Remediation%20-%203D%20Geometry%20and%20Fabrication%20Functional%20Validation/spec.md)

Read the audit and applicable Documents blueprints before implementation. Preserve existing user changes and baseline reports. Planning can proceed before dependencies, but dependent acceptance gates cannot be signed off early.

## Impacted areas

- `PrivKnife/angular.json`
- `PrivKnife/package.json`
- `PrivKnife/src/app/tools`
- `PrivKnife/src/app/core`
- `coverage and CI configuration`

## Implementation sequence

1. Compare executable-source manifest with instrumented report, fix missing attribution and freeze justified exclusions.
2. Use uncovered branch/function reports to add behavioral assertions and reference-result fixtures, prioritizing error recovery and security paths.
3. Collect and merge unit/browser/worker coverage only where supported and verifiably mapped to the same source.
4. Enable per-file 100 thresholds and publish clean-install reports with all 59 tools accounted for.

## Verification and evidence

Run focused checks for each repair, then the owning spec acceptance suite. Use the stable commands/configuration delivered by spec 92; do not invent green results from the historical audit. Save revision, environment, fixtures, expected and actual results, failures, reruns and output-validator results under a clearly dated evidence folder. Map each artifact to the acceptance criterion and tool.

- AC-101-01: Every executable tool file appears in the report with all four metrics at 100%; no missing worker files or unexplained zero/duplicate mappings.
- AC-101-02: CI fails on an intentionally uncovered branch and missing file, then passes after the check is restored.
- AC-101-03: Each tool has documented equivalence classes/boundaries and independently checked outputs; exclusions are reviewed and minimal.

## Completion rule

All tasks and acceptance criteria require evidence. Fixes discovered outside this scope belong to the owning spec and remain linked blockers until resolved. Do not mark a spec complete solely because unit tests pass, a file downloads, or a page loads.
