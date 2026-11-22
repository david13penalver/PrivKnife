# Spec 146 · Final Verification and Release Evidence

**Prerequisites** · [135](../135%20-%20Spec%20115%20Audit%20Remediation%20-%20Reproducible%20Audit%20Baseline%20and%20Browser%20Workflows/spec.md), [136](../136%20-%20Spec%20115%20Audit%20Remediation%20-%20Priority%20Export%20Regressions%20and%20Startup%20Budget/spec.md), [137](../137%20-%20Spec%20115%20Audit%20Remediation%20-%20PDF%20Cropper%20and%20Watermark%20Worker%20Lifecycle/spec.md), [138](../138%20-%20Spec%20115%20Audit%20Remediation%20-%20Regex%20Runner%20Supersession%20and%20Touch%20Export/spec.md), [139](../139%20-%20Spec%20115%20Audit%20Remediation%20-%20Responsive%20and%20Accessible%20Tool%20Workflows/spec.md), [140](../140%20-%20Spec%20115%20Audit%20Remediation%20-%20Angular%20View%20Models%20and%20Canonical%20Tool%20Metadata/spec.md), [141](../141%20-%20Spec%20115%20Audit%20Remediation%20-%20Documents%20and%20Privacy%20Output%20Verification/spec.md), [142](../142%20-%20Spec%20115%20Audit%20Remediation%20-%20Media%20and%20Audio%20Video%20Output%20Verification/spec.md), [143](../143%20-%20Spec%20115%20Audit%20Remediation%20-%20Developer%20Outputs%20and%20Retired%20Route%20Verification/spec.md), [144](../144%20-%20Spec%20115%20Audit%20Remediation%20-%203D%20Geometry%20and%20Fabrication%20Verification/spec.md), [145](../145%20-%20Spec%20115%20Audit%20Remediation%20-%20Production%20Coverage%20and%20Per-File%20Regression%20Gates/spec.md)

## Scope

Reconcile every audit finding, route and shared acceptance condition with current release evidence. Preserve the scope of existing release gates and include this audit’s 13 added routes in the historical readiness checklist.

## Acceptance criteria

### AC1. Reconcile findings and the route matrix

Verify all ten audit findings, all 72 route checks, all 16 overflow reproductions, and the 288 initial locale and width combinations. Record evidence per case and explicit exceptions or pending items. Keep the Web Vitals retirement checks separately identifiable within the matrix.

### AC2. Run the clean release gates

Run the full unit and QA suites, strict production build and raw-JavaScript budget check, per-file coverage, advertising-placeholder regression checks, secure-preview privacy and CSP checks, worker and resource lifecycle checks, and production browser workflows. Preserve first-run failures and any repeat evidence. Include regression checks for shipped tools beyond the audit cutoff.

### AC3. Inspect outputs and assisted workflows

Review independent artifact checks and physical touch, software keyboard, keyboard-only and screen reader results. Record fixture and tool versions, failure/retry outcomes, no-download assertions and approved local network behavior.

### AC4. Publish the release decision

Update the active remediation checklist and reconcile Spec 102 with the extended audit cohort. Attach exact commit, commands, reports and unresolved items with reproduction and owning spec. Keep the affected acceptance items open if evidence is missing or a required gate fails.

## References

- [Spec 115 tool audit](../../SPEC_115_TOOL_AUDIT.md)
- [Remediation roadmap](../SPEC_115_REMEDIATION_ROADMAP.md)
- Earlier remediation specs [102](../102%20-%20Audit%20Remediation%20-%20Final%20Verification%20and%20Release%20Evidence/spec.md)
- [Implementation plan](plan.md) and [task checklist](tasks.md)
