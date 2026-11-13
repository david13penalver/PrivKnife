# Application audit remediation roadmap

Source: [APPLICATION_AUDIT_2026-11-13.md](../APPLICATION_AUDIT_2026-11-13.md). This roadmap supplements specs 00–91; it does not overwrite them. All new implementation tasks are pending.

**Start with spec 92: Reliable Test and Browser Infrastructure.** The audit used a temporary coverage provider and exposed brittle mocks and instrumentation timeouts. Establish a clean, reproducible baseline before using tests and coverage to approve subsequent fixes.

## Recommended execution order

| Spec | Scope | Depends on |
|---|---|---|
| [92](<92 - Audit Remediation - Reliable Test and Browser Infrastructure/spec.md>) | Reliable Test and Browser Infrastructure | — |
| [93](<93 - Audit Remediation - Remove Advertising Placeholders/spec.md>) | Remove Advertising Placeholders | 92 |
| [94](<94 - Audit Remediation - Privacy Containment and Resource Safety/spec.md>) | Privacy Containment and Resource Safety | 92 |
| [95](<95 - Audit Remediation - Complete English and Spanish Localization/spec.md>) | Complete English and Spanish Localization | 92 |
| [96](<96 - Audit Remediation - Responsive and Accessible Tool Workflows/spec.md>) | Responsive and Accessible Tool Workflows | 92, 93, 95 |
| [97](<97 - Audit Remediation - Documents and Privacy Functional Validation/spec.md>) | Documents and Privacy Functional Validation | 92, 94 |
| [98](<98 - Audit Remediation - Images Audio and Video Functional Validation/spec.md>) | Images Audio and Video Functional Validation | 92, 94 |
| [99](<99 - Audit Remediation - Developer Data and Generators Functional Validation/spec.md>) | Developer Data and Generators Functional Validation | 92, 94 |
| [100](<100 - Audit Remediation - 3D Geometry and Fabrication Functional Validation/spec.md>) | 3D Geometry and Fabrication Functional Validation | 92, 94 |
| [101](<101 - Audit Remediation - Full Per-File Coverage and Edge Cases/spec.md>) | Full Per-File Coverage and Edge Cases | 92, 93, 94, 95, 96, 97, 98, 99, 100 |
| [102](<102 - Audit Remediation - Final Verification and Release Evidence/spec.md>) | Final Verification and Release Evidence | 93, 94, 95, 96, 97, 98, 99, 100, 101 |

Execute 92 first; then 93–95, followed by 96–100 as their dependencies permit. Spec 101 closes the complete coverage gate after behavior/layout/localization repairs; 102 performs final production verification. Privacy and unsafe-output defects are blockers and should be prioritized immediately after 92. Functional investigations may begin earlier, but dependent acceptance remains pending.

## Audit-to-spec traceability

| Finding / verification gap | Owner |
|---|---|
| Missing provider, changing runner version, clipboard stubs, timeouts, browser harness limitations | 92 |
| Advertising containers including conditional dialogs | 93 |
| PageSpeed remote processing, DoH disclosure, CSP, sanitization, workers, memory, initial JS budget | 94 |
| Hardcoded English, route titles, missing lamp preset keys, language switching and persistence | 95 |
| Loaded states, dialogs, 320–1440px, zoom, touch, accessibility, physical phones | 96 |
| Document/privacy output correctness and edge cases | 97 |
| Image/audio/video decoding, output quality, codecs and edge cases | 98 |
| Developer/data format correctness and edge cases | 99 |
| 3D geometry/fabrication, real workers and independent STL/3MF validation | 100 |
| All executable files included; per-file 100% S/B/F/L; meaningful boundary assertions | 101 |
| Final clean-install production/device matrix and honest audit sign-off | 102 |

## Inventory and evidence rules

All 59 audited tools belong to exactly one functional spec (97–100). Cross-cutting specs cover the same canonical inventory where applicable. Redirects do not inflate counts. Web Vitals must have a safe disabled-state case after spec 94; external behavior cannot satisfy local-processing acceptance.

The lamp follow-up completed the four earlier blocked initial page captures: 236/236 now load. Do not reopen those historical timeouts as confirmed app defects. The raw lamp preset keys remain a confirmed localization defect. Initial page capture is not functional certification, and coverage is not proof of all possible edge cases.

No scope is assigned for comprehensive linguistic review beyond English/Spanish. Keep other locale modules compatible without claiming they have been certified. Physical-device testing requires actual evidence; unavailable checks stay blocked.
