# Spec 140 · Implementation plan

[Acceptance criteria and prerequisites](spec.md) · [Task checklist](tasks.md)

## Work sequence

1. Run the Angular compiler with strict templates and group diagnostics by shared components and tools. Fix errors and exercise a negative compilation fixture before enabling the strict CI gate.
2. Follow the Cropper and Watermark boundaries from Spec 137. Apply typed related fields to OCR and inspect the lithophane and invoice components for separable view, job and resource ownership. Preserve tool output and validation behavior in tests.
3. Inventory current canonical routes, aliases, SEO fields and default ordering. Refactor registry, router data and generation of `qa/tool-manifest.json` to use the same canonical definitions. Preserve route-level lazy imports and the separately handled retirement notice.
4. Compare the emitted inventory against the pre-change live routes and aliases. Run route and metadata tests, the production build, browser smoke and the raw budget check.

## Verification

Run the applicable commands from `PrivKnife/`. Strict production build, route and manifest tests, browser smoke and `npm run qa:bundle-budget`.
