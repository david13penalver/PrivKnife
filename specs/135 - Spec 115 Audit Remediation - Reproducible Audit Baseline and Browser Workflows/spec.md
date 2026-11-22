# Spec 135 · Reproducible Audit Baseline and Browser Workflows

**Prerequisites** · Current repository checkout and the historical audit

## Scope

Record the current state of the audit cohort and make its real user journeys reproducible in production Chromium. The historical smoke runner selected a hidden Grid Paper download button at 320 CSS pixels. The two historical unit-suite runs failed in different places under different concurrency settings.

## Acceptance criteria

### AC1. Capture an isolated baseline

From a clean checkout with lockfile-installed dependencies, record the commit, Node and Chromium versions, build and QA commands, test concurrency, exit status, and per-suite failures. Capture provisional per-file statement, branch, function and line coverage across executable production TypeScript with a temporary runner configuration for Spec 145. Retain existing historical measurements and identify any new dependency or test-environment failure by its symptom.

### AC2. Support ordered interactions

Extend the existing smoke runner to select visible, enabled controls by accessible name, perform ordered steps, wait for observable UI state and capture downloads. Include runner regression tests for a duplicate hidden control, missing control, missing artifact and a failed intermediate step.

### AC3. Verify the phone export

At 320 CSS pixels use Page Preview then Download PDF on Grid Paper and inspect the resulting file independently for one A4 page. Record browser errors and artifact evidence from the production preview.

### AC4. Stabilize known test failures

Run the suite in isolation with recorded worker settings. Diagnose PDF.js worker URL resolution, detached transferred buffers, missing merger downloads, PDF-to-Word heading and download assertions, and timeout-prone Grid Paper, texture, audio and 3D cases. Add targeted checks and record any failures from the first run alongside reruns.

### AC5. Publish a reusable evidence format

For each case record the audit route number, canonical URL, workflow and fixture, locale, width, input method, result, artifact inspection and network observations where applicable. Track failed, blocked and pending cases explicitly and keep the historical and current revisions separate.

## References

- [Spec 115 tool audit](../../SPEC_115_TOOL_AUDIT.md)
- [Remediation roadmap](../SPEC_115_REMEDIATION_ROADMAP.md)
- Earlier remediation specs [92](../92%20-%20Audit%20Remediation%20-%20Reliable%20Test%20and%20Browser%20Infrastructure/spec.md)
- [Implementation plan](plan.md) and [task checklist](tasks.md)
