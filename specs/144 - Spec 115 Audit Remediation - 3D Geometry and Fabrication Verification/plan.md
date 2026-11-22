# Spec 144 · Implementation plan

[Acceptance criteria and prerequisites](spec.md) · [Task checklist](tasks.md)

## Work sequence

1. Derive measurable expectations from the original fabrication specs and fixture options. Establish an independent mesh inspection path for STL and 3MF with known units, tolerance, topology and feature positions.
2. Verify the 15 route cases at supported fixture bounds. Reopen exported artifacts and check geometry and fabrication details such as wall thickness, mesh holes, positive clearances, encoded QR readability and intended material groups.
3. Use the production browser to test touch orbit, reset, replacement and invalid entries for applicable tools. Inspect real worker and GPU resource disposal and record matching preview and output geometry.

## Verification

Run the applicable commands from `PrivKnife/`. Focused geometry tests, 15 browser cases and independently measured artifacts and lifecycle results.
