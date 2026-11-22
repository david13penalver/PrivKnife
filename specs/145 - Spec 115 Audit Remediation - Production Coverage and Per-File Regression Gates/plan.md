# Spec 145 · Implementation plan

[Acceptance criteria and prerequisites](spec.md) · [Task checklist](tasks.md)

## Work sequence

1. Use the provisional expanded report from Spec 135 to compare the starting and current measurements. Inventory executable files by path and domain, including uncovered files, and document each non-executable exclusion.
2. Update `test:ci` and `qa/coverage-manifest.mjs` to produce reports on failed runs and enforce versioned per-file floors. Use coverage fixtures with an untested branch in a listed file, missing helper, and zero coverage. Verify the gate itself exits nonzero.
3. Close coverage gaps by priority alongside Specs 136–144. Add worker-message and reconstruction tests for the uncovered files, then use production browser evidence for dispatch and teardown.
4. Compare all four metrics per file against Spec 101. Link the reports and leave the final gate pending for any unresolved metric.

## Verification

Run the applicable commands from `PrivKnife/`. `npm run test:ci`, `npm run qa:coverage`, gate regression tests and expanded per-file reports.
