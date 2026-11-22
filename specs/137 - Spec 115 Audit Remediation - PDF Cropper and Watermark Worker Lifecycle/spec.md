# Spec 137 · PDF Cropper and Watermark Worker Lifecycle

**Prerequisites** · [135](../135%20-%20Spec%20115%20Audit%20Remediation%20-%20Reproducible%20Audit%20Baseline%20and%20Browser%20Workflows/spec.md), [136](../136%20-%20Spec%20115%20Audit%20Remediation%20-%20Priority%20Export%20Regressions%20and%20Startup%20Budget/spec.md)

## Scope

Fix the PDF Cropper worker failure and cancellation paths. Use the Cropper and Watermark tools to establish a clear boundary between Angular views, job state, preview rendering and processing.

## Acceptance criteria

### AC1. Keep heavy PDF jobs in the worker

Force worker startup and processing errors from the UI. The cropper shows a localized recoverable error, remains responsive and never calls the heavy export engine on the main thread. Keep supported PDF preview behavior and lazy loading.

### AC2. Settle every job and ignore stale events

Reset, replace input and navigate away during active work. Cancellation settles the pending operation exactly once. Terminate the worker, release job-owned buffers and URLs, and ignore late messages and downloads from that job. After each recoverable failure or reset the user can export a second document.

### AC3. Split the two PDF components by responsibility

Move options, progress and user actions into component-scoped signal-backed view models. Use typed forms for related options and remove Angular and DOM dependencies from the transformation engines. Keep preview rendering and browser cleanup in the appropriate UI or adapter layer. Extract shared job lifecycle only after matching cancellation and termination semantics.

### AC4. Check both real exports

Run a production browser cropper job, reset it, complete a second document and independently inspect page order, rotation and crop dimensions. Reopen a rotated Watermark PDF after changing the Bates start number and verify placement and numbering. Record progress, resource cleanup and UI responsiveness during processing.

## References

- [Spec 115 tool audit](../../SPEC_115_TOOL_AUDIT.md)
- [Remediation roadmap](../SPEC_115_REMEDIATION_ROADMAP.md)
- Earlier remediation specs [94](../94%20-%20Audit%20Remediation%20-%20Privacy%20Containment%20and%20Resource%20Safety/spec.md), [97](../97%20-%20Audit%20Remediation%20-%20Documents%20and%20Privacy%20Functional%20Validation/spec.md)
- [Implementation plan](plan.md) and [task checklist](tasks.md)
