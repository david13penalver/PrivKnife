# Plan 92: Audit Remediation - Reliable Test and Browser Infrastructure

See [spec](spec.md) and [tasks](tasks.md).

## Entry gate and dependencies

None; start here.

Read the audit and applicable Documents blueprints before implementation. Preserve existing user changes and baseline reports. Planning can proceed before dependencies, but dependent acceptance gates cannot be signed off early.

## Impacted areas

- `PrivKnife/package.json`
- `PrivKnife/package-lock.json`
- `PrivKnife/angular.json`
- `PrivKnife/src/app/**/*.spec.ts`
- `PrivKnife/audit-*.mjs`
- `PrivKnife/src/app/tools/tool-registry.ts`

## Implementation sequence

1. Inventory package versions, audit harnesses, existing CI and canonical routes; preserve the historical audit evidence.
2. Implement shared test-environment setup with restored clipboard/browser mocks and diagnose the two timeout cases.
3. Commit compatible coverage dependencies and runner configuration, scripts and clean-install instructions.
4. Promote audit helpers into a maintained browser harness and manifest; add local fixtures and independent output-validator hooks.
5. Run unit, coverage and representative real-browser smoke tests from a clean dependency installation; save versions, commands and reports.

## Verification and evidence

Run focused checks for each repair, then the owning spec acceptance suite. Use the stable commands/configuration delivered by spec 92; do not invent green results from the historical audit. Save revision, environment, fixtures, expected and actual results, failures, reruns and output-validator results under a clearly dated evidence folder. Map each artifact to the acceptance criterion and tool.

- AC-92-01: A clean install followed by the documented unit command has no failed tests or unexplained flaky reruns.
- AC-92-02: Two consecutive runs in the same environment produce stable pass/fail results; coverage reports include executable engines, components and workers or explicitly fail for omissions.
- AC-92-03: A seeded browser error, failed export and omitted tool are detected by the harness; at least one Canvas/WebGL workflow and one worker export run in the real browser.

## Completion rule

All tasks and acceptance criteria require evidence. Fixes discovered outside this scope belong to the owning spec and remain linked blockers until resolved. Do not mark a spec complete solely because unit tests pass, a file downloads, or a page loads.
