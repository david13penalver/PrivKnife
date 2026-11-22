# Spec 141 · Implementation plan

[Acceptance criteria and prerequisites](spec.md) · [Task checklist](tasks.md)

## Work sequence

1. Use synthetic fixtures for binary and text workflows, including passwords and example personal data. Build on the existing document and privacy spec scenarios and find an independent reader for each output type in the route checklist.
2. Start with rotating and reopening PDFs, metadata and password recovery paths, then cover generated and imported documents. Assert the actual exported page, text, pixels or semantic data. Capture evidence for each route and exercise relevant error, reset and retry paths.
3. Use equivalent evidence from the priority and PDF lifecycle specs where the assertions match. Run privacy and lifecycle checks on imported files, previews, output and navigation. Study secure preview requests for zero private-payload transmission.

## Verification

Run the applicable commands from `PrivKnife/`. Focused document/privacy tests, the 28 browser cases, independent artifact and privacy evidence.
