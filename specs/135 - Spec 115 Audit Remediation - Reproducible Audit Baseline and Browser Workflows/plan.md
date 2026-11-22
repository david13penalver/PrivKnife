# Spec 135 · Implementation plan

[Acceptance criteria and prerequisites](spec.md) · [Task checklist](tasks.md)

## Work sequence

1. Snapshot the current 72-route cohort using the audit source paths and canonical manifest. Keep the retired route and preserve the audit’s concurrency findings as historical evidence. Run the current baseline with the production build and unit suite in separate phases. Use a temporary expanded coverage configuration to capture the starting measurements consumed by Spec 145.
2. Add an ordered journey mode to `qa/smoke.mjs` with visible controls, per-step expectations and artifact capture. Preserve existing single-step callers. Add focused runner checks in `qa/smoke.test.mjs`.
3. Use a local secure production preview to run the 320 px Grid Paper journey. Reopen the PDF with an independent tool such as `pdfinfo`. Collect the evidence record that later specs will reuse.
4. Reproduce the known intermittent failures under recorded concurrency. Examine PDF.js worker configuration, buffer ownership and async teardown before choosing fixes. Rerun the affected cases and then the isolated suite. Keep failure logs and coverage reports available even if the suite exits nonzero.

## Verification

Run the applicable commands from `PrivKnife/`. `npm run qa:test`, `npm run build`, `npm run test:ci`, and the ordered Grid Paper browser run.
