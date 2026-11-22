# Spec 145 · Production Coverage and Per-File Regression Gates

**Prerequisites** · [135](../135%20-%20Spec%20115%20Audit%20Remediation%20-%20Reproducible%20Audit%20Baseline%20and%20Browser%20Workflows/spec.md), [136](../136%20-%20Spec%20115%20Audit%20Remediation%20-%20Priority%20Export%20Regressions%20and%20Startup%20Budget/spec.md), [137](../137%20-%20Spec%20115%20Audit%20Remediation%20-%20PDF%20Cropper%20and%20Watermark%20Worker%20Lifecycle/spec.md), [138](../138%20-%20Spec%20115%20Audit%20Remediation%20-%20Regex%20Runner%20Supersession%20and%20Touch%20Export/spec.md), [140](../140%20-%20Spec%20115%20Audit%20Remediation%20-%20Angular%20View%20Models%20and%20Canonical%20Tool%20Metadata/spec.md), [141](../141%20-%20Spec%20115%20Audit%20Remediation%20-%20Documents%20and%20Privacy%20Output%20Verification/spec.md), [142](../142%20-%20Spec%20115%20Audit%20Remediation%20-%20Media%20and%20Audio%20Video%20Output%20Verification/spec.md), [143](../143%20-%20Spec%20115%20Audit%20Remediation%20-%20Developer%20Outputs%20and%20Retired%20Route%20Verification/spec.md), [144](../144%20-%20Spec%20115%20Audit%20Remediation%20-%203D%20Geometry%20and%20Fabrication%20Verification/spec.md)

## Scope

Replace the file-presence coverage check with per-file production coverage enforcement. The historical 182-file result is a partial baseline and cannot serve as the expanded denominator.

## Acceptance criteria

### AC1. Instrument the production application

Include executable production TypeScript under src, including shared application code, workers, registries and helpers such as the GIF encoder, metronome and MD5 implementation. Exclude tests, fixtures and type-only or generated code through explicit, reviewable rules. Require instrumentable files to appear even when no test loads them.

### AC2. Publish and enforce a measured per-file baseline

Record statement, branch, function and line covered/total counts and percentages per file. Compare CI against versioned per-file floors for all four metrics, raise them as each file improves, and fail missing files and regressions. Test a seeded untested branch in an already-listed file, an omitted helper, and zero-covered executable metrics.

### AC3. Prioritize previously uncovered workers

Locate the historical zero-line workers in the new inventory. Exercise messages, transferred inputs, malformed requests, failure, cancellation and cleanup, then confirm actual dispatch in a production browser. Include helper error paths, shared UI and route initialization in the improvement pass.

### AC4. Close the inherited coverage criterion

Apply Spec 101's 100% per-file target for all four metrics to the audited tools and report shared code separately. Enforce measured regression floors across the production application. Interim green regression gates represent protection of the measured floor. Report remaining deficits and keep release coverage acceptance pending until the inherited target is reached. Archive reports even on failure and keep unit-test exit status visible.

## References

- [Spec 115 tool audit](../../SPEC_115_TOOL_AUDIT.md)
- [Remediation roadmap](../SPEC_115_REMEDIATION_ROADMAP.md)
- Earlier remediation specs [101](../101%20-%20Audit%20Remediation%20-%20Full%20Per-File%20Coverage%20and%20Edge%20Cases/spec.md)
- [Implementation plan](plan.md) and [task checklist](tasks.md)
