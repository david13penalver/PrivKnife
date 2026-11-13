# Spec 100: Audit Remediation - 3D Geometry and Fabrication Functional Validation

- **Status:** Ready for implementation; tasks unchecked.
- **Source:** [Application audit](../../APPLICATION_AUDIT_2026-11-13.md), including the completed lamp follow-up.
- **Dependencies:** [92: Audit Remediation - Reliable Test and Browser Infrastructure](../92%20-%20Audit%20Remediation%20-%20Reliable%20Test%20and%20Browser%20Infrastructure/spec.md), [94: Audit Remediation - Privacy Containment and Resource Safety](../94%20-%20Audit%20Remediation%20-%20Privacy%20Containment%20and%20Resource%20Safety/spec.md)
- **Companion documents:** [Plan](plan.md), [Tasks](tasks.md).

## Problem

Page-load checks and mocked unit tests do not establish actual processing or export correctness. This work owns end-to-end functional verification and defect repair for every tool listed below; findings must be reproduced before being labelled confirmed bugs.

## Requirements

1. For each tool, read its matching Documents blueprint and existing original/remediation specs before changing behavior. Record supported inputs, outputs, presets and numerical/format limits.
2. Drive valid input → configure → preview → export/copy → independent validation → reset/repeat in English and Spanish at 390px and 1440px. For unavailable external tools verify the safe disabled state instead.
3. Cover empty/malformed inputs, boundaries and just-outside values, Unicode, supported size limits, cancellation and repeated operations. Use synthetic local fixtures only; preserve zero telemetry and zero ingestion.
4. Independently parse STL/3MF outputs; verify finite vertices, triangle indices, dimensions, millimeter units, normals and topology. Require watertightness for solid outputs and explicitly document intended open/vase surfaces.
5. Cover each preset, minimum/maximum/negative/zero dimensions, empty/long/accented Spanish text, custom image/SVG inputs and incompatible option combinations.
6. Validate fit-critical clearances, mounting holes, magnet sockets, text legibility, connected components and part counts against each tool blueprint; attach slicer inspection evidence.
7. Exercise real workers and progress/error/cancel paths with large meshes; verify UI responsiveness, repeated rebuild/export cleanup and material/geometry disposal.
8. Repair confirmed defects with meaningful regression assertions. Coordinate translations with 95 and layout fixes with 96; do not claim completion from test descriptions or mocked downloads.

## Acceptance criteria

- **AC-100-01:** Every listed tool has a completed supported-format workflow and boundary-case report; no placeholder implementation passes.
- **AC-100-02:** Downloaded output is validated independently rather than by existence/nonzero bytes alone; clipboard content is checked with success/denial recovery.
- **AC-100-03:** No unhandled errors, private-data network requests, leaked resources or silent batch failures occur. Inapplicable cases have explicit reasons.
- **AC-100-04:** Every confirmed defect has a passing regression case and rerun evidence; unresolved blockers prevent spec completion.

## Constraints and scope boundaries

All processing remains client-side with zero telemetry or ingestion. Preserve Angular standalone/lazy loading, Signals, typed forms, BEM/SASS conventions and cleanup requirements from AGENTS.md. No production implementation is performed by this documentation change. Existing specs remain design references; historical “ready”/“complete” labels are not evidence that the current audit gates pass.

Full linguistic certification beyond English/Spanish is deferred. Real-device or unavailable-codec checks must be recorded as blocked, never inferred from Chromium emulation. Workflows and fixtures must stay local.

## Explicit tool scope

- `braille-ada-sign-generator` — `PrivKnife/src/app/tools/3d/braille-ada-sign-generator`
- `cappuccino-stencil-maker` — `PrivKnife/src/app/tools/3d/cappuccino-stencil-maker`
- `cookie-cutter` — `PrivKnife/src/app/tools/3d/cookie-cutter`
- `desk-wedge-nameplate` — `PrivKnife/src/app/tools/3d/desk-wedge-nameplate`
- `electronics-box-enclosure` — `PrivKnife/src/app/tools/3d/electronics-box-enclosure`
- `geometric-plant-pot` — `PrivKnife/src/app/tools/3d/geometric-plant-pot`
- `gridfinity-bin-generator` — `PrivKnife/src/app/tools/3d/gridfinity-bin-generator`
- `hsw-insert-adapter` — `PrivKnife/src/app/tools/3d/hsw-insert-adapter`
- `keycap-switch-tester-maker` — `PrivKnife/src/app/tools/3d/keycap-switch-tester-maker`
- `lithophane-maker` — `PrivKnife/src/app/tools/3d/lithophane-maker`
- `parametric-lamp-designer` — `PrivKnife/src/app/tools/3d/parametric-lamp-designer`
- `pet-id-tag-generator` — `PrivKnife/src/app/tools/3d/pet-id-tag-generator`
- `qr-stand-keychain` — `PrivKnife/src/app/tools/3d/qr-stand-keychain`
- `skadis-pegboard-maker` — `PrivKnife/src/app/tools/3d/skadis-pegboard-maker`
- `under-desk-clamp-generator` — `PrivKnife/src/app/tools/3d/under-desk-clamp-generator`
