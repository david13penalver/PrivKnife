# Spec 137 · Implementation plan

[Acceptance criteria and prerequisites](spec.md) · [Task checklist](tasks.md)

## Work sequence

1. Trace worker creation, each async dispatch and cleanup for `pdf-cropper-booklet` and `pdf-watermark-numbering`. Reproduce cropper startup failure and reset with a controlled worker. Assert that a failure cannot invoke the heavy engine in the view.
2. Define typed job inputs, lifecycle and ownership in component-scoped view models. Settle job promises on cancellation and reject stale events by job identity. Leave PDF transformations in the engine. Extract shared worker code only where cancellation and resource ownership agree.
3. Exercise cropper failure, reset and a new file in the production preview with a real worker. Reopen the second cropped document and the rotated Bates-numbered Watermark artifact. Record keyboard and touch responsiveness and current-job-only download behavior.

## Verification

Run the applicable commands from `PrivKnife/`. Focused cropper and watermark unit tests, real worker browser runs, independent PDF inspection and lifecycle QA.
