# Spec 140 · Angular View Models and Canonical Tool Metadata

**Prerequisites** · [137](../137%20-%20Spec%20115%20Audit%20Remediation%20-%20PDF%20Cropper%20and%20Watermark%20Worker%20Lifecycle/spec.md), [139](../139%20-%20Spec%20115%20Audit%20Remediation%20-%20Responsive%20and%20Accessible%20Tool%20Workflows/spec.md)

## Scope

Enforce Angular template checks, make form and worker ownership explicit in the highest-risk components, and derive route and QA inventory data from canonical tool metadata.

## Acceptance criteria

### AC1. Enable strict template checking

Record diagnostics with strictTemplates enabled and fix them in reviewable groups. Run the strict Angular production compiler in CI and verify an intentionally invalid binding fails. Preserve standalone lazy routes, modern template control flow, strict TypeScript and signal-based state.

### AC2. Use typed option groups and scoped view models

Confirm the Cropper and Watermark split from Spec 137 first. Use typed forms for multi-field OCR constraints and separate lithophane job and viewport ownership and invoice form, output and preview responsibilities where they mix. Check imports, rendering, validation, OnPush compatibility and disposal through normal workflows.

### AC3. Derive the active route and QA inventory

Use the same canonical metadata to derive tool registry entries, lazy active routes and a deterministic smoke manifest. Keep route URLs, stable IDs, localization, ordering, SEO data, redirects and the retired Web Vitals notice intact. Ensure manifest generation can run without importing heavyweight tool implementations into the startup bundle.

### AC4. Detect drift

Test duplicate IDs or routes, alias resolution, canonical SEO data, catalog membership, retired route handling and manifest regeneration. Include active tools after Spec 115 in metadata and compiler regression checks. Verify the bundle gate after regeneration.

## References

- [Spec 115 tool audit](../../SPEC_115_TOOL_AUDIT.md)
- [Remediation roadmap](../SPEC_115_REMEDIATION_ROADMAP.md)
- Earlier remediation specs [92](../92%20-%20Audit%20Remediation%20-%20Reliable%20Test%20and%20Browser%20Infrastructure/spec.md), [96](../96%20-%20Audit%20Remediation%20-%20Responsive%20and%20Accessible%20Tool%20Workflows/spec.md)
- [Implementation plan](plan.md) and [task checklist](tasks.md)
