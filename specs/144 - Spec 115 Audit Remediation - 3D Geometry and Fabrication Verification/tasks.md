# Spec 144 · Tasks

[Acceptance criteria](spec.md) · [Implementation plan](plan.md)

- [ ] Record the starting revision, prerequisites and current reproduction.
- [ ] AC1 · Verify physical geometry independently and attach the corresponding verification evidence.
- [ ] AC2 · Exercise generation and replacement and attach the corresponding verification evidence.
- [ ] AC3 · Verify tool-specific fabrication checks and attach the corresponding verification evidence.

## Route evidence

- [ ] 24 `/tools/3d-qr-stand` · Decode the finished QR at the smallest supported physical size.
- [ ] 25 `/tools/cookie-cutter` · Check mesh walls and holes on a narrow, concave input outline.
- [ ] 26 `/tools/desk-wedge-nameplate` · Reopen a nameplate containing ascenders, descenders and accented letters.
- [ ] 31 `/tools/parametric-lamp-designer` · Check manifold edges and minimum wall thickness at extreme lamp dimensions.
- [ ] 32 `/tools/lithophane-maker` · Compare mesh thickness at black and white pixels and test touch orbit after reset.
- [ ] 33 `/tools/gridfinity-bin-generator` · Measure a two-cell export and verify mounting holes and stack clearance.
- [ ] 34 `/tools/electronics-box-enclosure` · Check lid/base clearance after changing wall thickness at minimum size.
- [ ] 35 `/tools/under-desk-clamp-generator` · Reopen the smallest clamp and measure jaw opening after export.
- [ ] 36 `/tools/skadis-pegboard-maker` · Measure hook pitch and engagement depth on a multi-hook model.
- [ ] 37 `/tools/geometric-plant-pot` · Check drainage continuity and minimum wall thickness on the exported pot.
- [ ] 38 `/tools/braille-ada-sign-generator` · Verify dot positions and heights against an independent Braille fixture.
- [ ] 39 `/tools/keycap-switch-tester-maker` · Measure socket spacing and wall clearance for each switch preset.
- [ ] 40 `/tools/cappuccino-stencil-maker` · Check that stencil islands remain connected after applying bridges.
- [ ] 41 `/tools/pet-id-tag-generator` · Verify the attachment hole remains open for long embossed names.
- [ ] 42 `/tools/hsw-insert-adapter` · Measure insert fit and wall thickness at the minimum supported dimensions.

## Close the spec

- [ ] Link exact commands, results and outstanding cases in the verification record.
- [ ] Run the applicable regression gates, update the roadmap status and commit with the repository’s Conventional Commits convention.
