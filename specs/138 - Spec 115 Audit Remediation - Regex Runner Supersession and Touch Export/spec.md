# Spec 138 · Regex Runner Supersession and Touch Export

**Prerequisites** · [135](../135%20-%20Spec%20115%20Audit%20Remediation%20-%20Reproducible%20Audit%20Baseline%20and%20Browser%20Workflows/spec.md), [137](../137%20-%20Spec%20115%20Audit%20Remediation%20-%20PDF%20Cropper%20and%20Watermark%20Worker%20Lifecycle/spec.md)

## Scope

Make the initial sample run on entry and give replacement regex jobs their own worker and watchdog budget. Verify the actual Matches export workflow with keyboard and touch.

## Acceptance criteria

### AC1. Run the initial sample automatically

Navigate directly to the route. The initial two-date example renders both expected matches before editing or calling the runner from a test.

### AC2. Start replacements immediately

With a controllable worker double, hold a job busy and queue a short date match. Assert the old worker terminates, its pending call settles, the replacement starts immediately with the full watchdog budget, and its expected matches win even if a late old callback fires.

### AC3. Settle cancellation and disposal

Test timeout, worker error and component teardown. Every outstanding operation settles exactly once and clears its timer and worker. A later job or a new visit remains usable.

### AC4. Export from a phone and by keyboard

In the production build, activate Matches and download JSON via keyboard and via touch with the initial or edited date sample. Check visible focus, actionable localized status, decoded JSON with both expected dates in order, and zero stale or duplicate downloads. Record physical touch evidence in Spec 139.

## References

- [Spec 115 tool audit](../../SPEC_115_TOOL_AUDIT.md)
- [Remediation roadmap](../SPEC_115_REMEDIATION_ROADMAP.md)
- Earlier remediation specs [96](../96%20-%20Audit%20Remediation%20-%20Responsive%20and%20Accessible%20Tool%20Workflows/spec.md), [99](../99%20-%20Audit%20Remediation%20-%20Developer%20Data%20and%20Generators%20Functional%20Validation/spec.md)
- [Implementation plan](plan.md) and [task checklist](tasks.md)
