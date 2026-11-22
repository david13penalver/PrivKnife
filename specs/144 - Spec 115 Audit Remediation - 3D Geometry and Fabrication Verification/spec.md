# Spec 144 · 3D Geometry and Fabrication Verification

**Prerequisites** · [135](../135%20-%20Spec%20115%20Audit%20Remediation%20-%20Reproducible%20Audit%20Baseline%20and%20Browser%20Workflows/spec.md), [139](../139%20-%20Spec%20115%20Audit%20Remediation%20-%20Responsive%20and%20Accessible%20Tool%20Workflows/spec.md), [140](../140%20-%20Spec%20115%20Audit%20Remediation%20-%20Angular%20View%20Models%20and%20Canonical%20Tool%20Metadata/spec.md)

## Scope

Validate physical dimensions and fabrication features for all 15 audited 3D tools. Exercise rendering and job ownership on touch devices and inspect downloaded mesh files with an independent reader.

## Acceptance criteria

### AC1. Verify physical geometry independently

Reopen each relevant STL or 3MF export. Use dimensions and tolerances from the existing tool specs, and check finite vertices, intended closed manifold components, material IDs where applicable, thickness and feature clearances. Inspect hole continuity and placement with small and large supported inputs.

### AC2. Exercise generation and replacement

Test empty and invalid geometry, near-edge holes, extreme dimensions and a reset or replacement during generation. Require only the newest job to update the preview or export. Check touch orbit after reset and verify worker, geometry, material, texture and object URL disposal.

### AC3. Verify tool-specific fabrication checks

Drive the audited inputs from the production UI and validate the exports in the route checklist. Record numeric measurements, tolerances and tool versions so a later run can independently compare the result.

## Tool acceptance checklist

| Original spec | Canonical URL | Required workflow and independent check |
|---|---|---|
| 24 | [`/tools/3d-qr-stand`](../../PrivKnife/src/app/tools/3d/qr-stand-keychain) | Decode the finished QR at the smallest supported physical size. |
| 25 | [`/tools/cookie-cutter`](../../PrivKnife/src/app/tools/3d/cookie-cutter) | Check mesh walls and holes on a narrow, concave input outline. |
| 26 | [`/tools/desk-wedge-nameplate`](../../PrivKnife/src/app/tools/3d/desk-wedge-nameplate) | Reopen a nameplate containing ascenders, descenders and accented letters. |
| 31 | [`/tools/parametric-lamp-designer`](../../PrivKnife/src/app/tools/3d/parametric-lamp-designer) | Check manifold edges and minimum wall thickness at extreme lamp dimensions. |
| 32 | [`/tools/lithophane-maker`](../../PrivKnife/src/app/tools/3d/lithophane-maker) | Compare mesh thickness at black and white pixels and test touch orbit after reset. |
| 33 | [`/tools/gridfinity-bin-generator`](../../PrivKnife/src/app/tools/3d/gridfinity-bin-generator) | Measure a two-cell export and verify mounting holes and stack clearance. |
| 34 | [`/tools/electronics-box-enclosure`](../../PrivKnife/src/app/tools/3d/electronics-box-enclosure) | Check lid/base clearance after changing wall thickness at minimum size. |
| 35 | [`/tools/under-desk-clamp-generator`](../../PrivKnife/src/app/tools/3d/under-desk-clamp-generator) | Reopen the smallest clamp and measure jaw opening after export. |
| 36 | [`/tools/skadis-pegboard-maker`](../../PrivKnife/src/app/tools/3d/skadis-pegboard-maker) | Measure hook pitch and engagement depth on a multi-hook model. |
| 37 | [`/tools/geometric-plant-pot`](../../PrivKnife/src/app/tools/3d/geometric-plant-pot) | Check drainage continuity and minimum wall thickness on the exported pot. |
| 38 | [`/tools/braille-ada-sign-generator`](../../PrivKnife/src/app/tools/3d/braille-ada-sign-generator) | Verify dot positions and heights against an independent Braille fixture. |
| 39 | [`/tools/keycap-switch-tester-maker`](../../PrivKnife/src/app/tools/3d/keycap-switch-tester-maker) | Measure socket spacing and wall clearance for each switch preset. |
| 40 | [`/tools/cappuccino-stencil-maker`](../../PrivKnife/src/app/tools/3d/cappuccino-stencil-maker) | Check that stencil islands remain connected after applying bridges. |
| 41 | [`/tools/pet-id-tag-generator`](../../PrivKnife/src/app/tools/3d/pet-id-tag-generator) | Verify the attachment hole remains open for long embossed names. |
| 42 | [`/tools/hsw-insert-adapter`](../../PrivKnife/src/app/tools/3d/hsw-insert-adapter) | Measure insert fit and wall thickness at the minimum supported dimensions. |

## References

- [Spec 115 tool audit](../../SPEC_115_TOOL_AUDIT.md)
- [Remediation roadmap](../SPEC_115_REMEDIATION_ROADMAP.md)
- Earlier remediation specs [94](../94%20-%20Audit%20Remediation%20-%20Privacy%20Containment%20and%20Resource%20Safety/spec.md), [100](../100%20-%20Audit%20Remediation%20-%203D%20Geometry%20and%20Fabrication%20Functional%20Validation/spec.md)
- [Implementation plan](plan.md) and [task checklist](tasks.md)
