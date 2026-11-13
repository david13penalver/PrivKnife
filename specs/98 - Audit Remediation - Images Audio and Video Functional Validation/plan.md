# Plan 98: Audit Remediation - Images Audio and Video Functional Validation

See [spec](spec.md) and [tasks](tasks.md).

## Entry gate and dependencies

[92: Audit Remediation - Reliable Test and Browser Infrastructure](../92%20-%20Audit%20Remediation%20-%20Reliable%20Test%20and%20Browser%20Infrastructure/spec.md), [94: Audit Remediation - Privacy Containment and Resource Safety](../94%20-%20Audit%20Remediation%20-%20Privacy%20Containment%20and%20Resource%20Safety/spec.md)

Read the audit and applicable Documents blueprints before implementation. Preserve existing user changes and baseline reports. Planning can proceed before dependencies, but dependent acceptance gates cannot be signed off early.

## Impacted areas

- `PrivKnife/src/app/tools/media`
- `PrivKnife/src/app/tools/audio-video`
- `Documents`
- `specs`
- `local browser fixtures and output validators`

## Implementation sequence

1. Create per-tool acceptance cases from blueprints and the audit, including expected results and independent validators.
2. Add deterministic local fixtures and engine/worker tests for uncovered branches and boundary partitions.
3. Exercise real browser workflows, compare output to independent expectations, reproduce defects and implement repairs.
4. Repeat each tool workflow in both languages and mobile/desktop layouts, then reset/repeat and navigate away to verify cleanup.
5. Attach per-tool reports, output metadata, network logs and test results; pass changed coverage cases to spec 101.

## Verification and evidence

Run focused checks for each repair, then the owning spec acceptance suite. Use the stable commands/configuration delivered by spec 92; do not invent green results from the historical audit. Save revision, environment, fixtures, expected and actual results, failures, reruns and output-validator results under a clearly dated evidence folder. Map each artifact to the acceptance criterion and tool.

- AC-98-01: Every listed tool has a completed supported-format workflow and boundary-case report; no placeholder implementation passes.
- AC-98-02: Downloaded output is validated independently rather than by existence/nonzero bytes alone; clipboard content is checked with success/denial recovery.
- AC-98-03: No unhandled errors, private-data network requests, leaked resources or silent batch failures occur. Inapplicable cases have explicit reasons.
- AC-98-04: Every confirmed defect has a passing regression case and rerun evidence; unresolved blockers prevent spec completion.

## Completion rule

All tasks and acceptance criteria require evidence. Fixes discovered outside this scope belong to the owning spec and remain linked blockers until resolved. Do not mark a spec complete solely because unit tests pass, a file downloads, or a page loads.
