# Spec 101: Audit Remediation - Full Per-File Coverage and Edge Cases

- **Status:** Ready for implementation; tasks unchecked.
- **Source:** [Application audit](../../APPLICATION_AUDIT_2026-11-13.md), including the completed lamp follow-up.
- **Dependencies:** [92: Audit Remediation - Reliable Test and Browser Infrastructure](../92%20-%20Audit%20Remediation%20-%20Reliable%20Test%20and%20Browser%20Infrastructure/spec.md), [93: Audit Remediation - Remove Advertising Placeholders](../93%20-%20Audit%20Remediation%20-%20Remove%20Advertising%20Placeholders/spec.md), [94: Audit Remediation - Privacy Containment and Resource Safety](../94%20-%20Audit%20Remediation%20-%20Privacy%20Containment%20and%20Resource%20Safety/spec.md), [95: Audit Remediation - Complete English and Spanish Localization](../95%20-%20Audit%20Remediation%20-%20Complete%20English%20and%20Spanish%20Localization/spec.md), [96: Audit Remediation - Responsive and Accessible Tool Workflows](../96%20-%20Audit%20Remediation%20-%20Responsive%20and%20Accessible%20Tool%20Workflows/spec.md), [97: Audit Remediation - Documents and Privacy Functional Validation](../97%20-%20Audit%20Remediation%20-%20Documents%20and%20Privacy%20Functional%20Validation/spec.md), [98: Audit Remediation - Images Audio and Video Functional Validation](../98%20-%20Audit%20Remediation%20-%20Images%20Audio%20and%20Video%20Functional%20Validation/spec.md), [99: Audit Remediation - Developer Data and Generators Functional Validation](../99%20-%20Audit%20Remediation%20-%20Developer%20Data%20and%20Generators%20Functional%20Validation/spec.md), [100: Audit Remediation - 3D Geometry and Fabrication Functional Validation](../100%20-%20Audit%20Remediation%20-%203D%20Geometry%20and%20Fabrication%20Functional%20Validation/spec.md)
- **Companion documents:** [Plan](plan.md), [Tasks](tasks.md).

## Problem

The audit measured 78.04% statements, 61.70% branches, 49.93% functions and 81.28% lines overall. These figures omit some potential executable paths and do not satisfy 100% per-tool coverage.

## Requirements

1. Enforce 100% statements, branches, functions and lines per executable file in all 59 tools, including engines, components, workers and executable exports/helpers. Test shared code used by these tools and report it separately.
2. Fail for missing executable files and validate source-map attribution; generated/type-only/non-executable files may be excluded only with a documented reason. No ignore directives or denominator shrinking to achieve the target.
3. Use engine tests for reference results, worker tests for real message/error/progress behavior, component tests for state transitions and browser tests for rendering/download/copy interactions. If coverage must merge environments, verify source identity and merge correctness.
4. Build explicit boundary partitions for each tool; 100% measured coverage is a required gate but never a claim of exhaustive input correctness.
5. Produce per-file/per-tool/global reports in CI and fail when any required metric falls below 100; retain reports on failure.

## Acceptance criteria

- **AC-101-01:** Every executable tool file appears in the report with all four metrics at 100%; no missing worker files or unexplained zero/duplicate mappings.
- **AC-101-02:** CI fails on an intentionally uncovered branch and missing file, then passes after the check is restored.
- **AC-101-03:** Each tool has documented equivalence classes/boundaries and independently checked outputs; exclusions are reviewed and minimal.

## Constraints and scope boundaries

All processing remains client-side with zero telemetry or ingestion. Preserve Angular standalone/lazy loading, Signals, typed forms, BEM/SASS conventions and cleanup requirements from AGENTS.md. No production implementation is performed by this documentation change. Existing specs remain design references; historical “ready”/“complete” labels are not evidence that the current audit gates pass.

Full linguistic certification beyond English/Spanish is deferred. Real-device or unavailable-codec checks must be recorded as blocked, never inferred from Chromium emulation. Workflows and fixtures must stay local.

## Explicit tool scope

- `audio-trimmer-booster` — `PrivKnife/src/app/tools/audio-video/audio-trimmer-booster`
- `background-remover` — `PrivKnife/src/app/tools/media/background-remover`
- `bank-statement-converter` — `PrivKnife/src/app/tools/dev/bank-statement-converter`
- `barcode-labels` — `PrivKnife/src/app/tools/documents/barcode-labels`
- `batch-compressor` — `PrivKnife/src/app/tools/media/batch-compressor`
- `bpm-tap-detector` — `PrivKnife/src/app/tools/audio-video/bpm-tap-detector`
- `braille-ada-sign-generator` — `PrivKnife/src/app/tools/3d/braille-ada-sign-generator`
- `calendar-linker` — `PrivKnife/src/app/tools/dev/calendar-linker`
- `cappuccino-stencil-maker` — `PrivKnife/src/app/tools/3d/cappuccino-stencil-maker`
- `color-palette-extractor` — `PrivKnife/src/app/tools/dev/color-palette-extractor`
- `cookie-cutter` — `PrivKnife/src/app/tools/3d/cookie-cutter`
- `crypto-hash-uuid` — `PrivKnife/src/app/tools/privacy/crypto-hash-uuid`
- `csv-converter` — `PrivKnife/src/app/tools/dev/csv-converter`
- `csv-vector-chart-builder` — `PrivKnife/src/app/tools/dev/csv-vector-chart-builder`
- `desk-wedge-nameplate` — `PrivKnife/src/app/tools/3d/desk-wedge-nameplate`
- `diff-checker` — `PrivKnife/src/app/tools/dev/diff-checker`
- `dns-checker` — `PrivKnife/src/app/tools/dev/dns-checker`
- `electronics-box-enclosure` — `PrivKnife/src/app/tools/3d/electronics-box-enclosure`
- `email-signature-generator` — `PrivKnife/src/app/tools/dev/email-signature-generator`
- `emergency-recovery-kit` — `PrivKnife/src/app/tools/privacy/emergency-recovery-kit`
- `exif-stripper` — `PrivKnife/src/app/tools/privacy/exif-stripper`
- `face-plate-blur` — `PrivKnife/src/app/tools/privacy/face-plate-blur`
- `favicon-generator` — `PrivKnife/src/app/tools/media/favicon-generator`
- `file-encryptor-vault` — `PrivKnife/src/app/tools/privacy/file-encryptor-vault`
- `floor-plan-furniture-scaler` — `PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler`
- `font-subsetter-converter` — `PrivKnife/src/app/tools/dev/font-subsetter-converter`
- `geometric-plant-pot` — `PrivKnife/src/app/tools/3d/geometric-plant-pot`
- `grid-paper` — `PrivKnife/src/app/tools/documents/grid-paper`
- `gridfinity-bin-generator` — `PrivKnife/src/app/tools/3d/gridfinity-bin-generator`
- `heic-avif-converter` — `PrivKnife/src/app/tools/media/heic-avif-converter`
- `hsw-insert-adapter` — `PrivKnife/src/app/tools/3d/hsw-insert-adapter`
- `invoice-maker` — `PrivKnife/src/app/tools/documents/invoice-maker`
- `keycap-switch-tester-maker` — `PrivKnife/src/app/tools/3d/keycap-switch-tester-maker`
- `lithophane-maker` — `PrivKnife/src/app/tools/3d/lithophane-maker`
- `local-ocr-text-extractor` — `PrivKnife/src/app/tools/documents/local-ocr-text-extractor`
- `markdown-cheatsheet` — `PrivKnife/src/app/tools/documents/markdown-cheatsheet`
- `mesh-gradient-maker` — `PrivKnife/src/app/tools/dev/mesh-gradient-maker`
- `nutrition-label-maker` — `PrivKnife/src/app/tools/documents/nutrition-label-maker`
- `og-card-maker` — `PrivKnife/src/app/tools/media/og-card-maker`
- `parametric-lamp-designer` — `PrivKnife/src/app/tools/3d/parametric-lamp-designer`
- `passport-biometric-photo` — `PrivKnife/src/app/tools/media/passport-biometric-photo`
- `pdf-merger` — `PrivKnife/src/app/tools/documents/pdf-merger`
- `pdf-redaction` — `PrivKnife/src/app/tools/privacy/pdf-redaction`
- `pdf-signer-stamper` — `PrivKnife/src/app/tools/documents/pdf-signer-stamper`
- `pet-id-tag-generator` — `PrivKnife/src/app/tools/3d/pet-id-tag-generator`
- `pii-scrubber-anonymizer` — `PrivKnife/src/app/tools/privacy/pii-scrubber-anonymizer`
- `qr-stand-keychain` — `PrivKnife/src/app/tools/3d/qr-stand-keychain`
- `robots-sitemap-builder` — `PrivKnife/src/app/tools/dev/robots-sitemap-builder`
- `screenshot-mockup` — `PrivKnife/src/app/tools/media/screenshot-mockup`
- `seamless-texture-generator` — `PrivKnife/src/app/tools/media/seamless-texture-generator`
- `skadis-pegboard-maker` — `PrivKnife/src/app/tools/3d/skadis-pegboard-maker`
- `soundwave-art-maker` — `PrivKnife/src/app/tools/audio-video/soundwave-art-maker`
- `subtitles-shifter` — `PrivKnife/src/app/tools/media/subtitles-shifter`
- `svg-optimizer-cleaner` — `PrivKnife/src/app/tools/dev/svg-optimizer-cleaner`
- `table-tent-maker` — `PrivKnife/src/app/tools/documents/table-tent-maker`
- `under-desk-clamp-generator` — `PrivKnife/src/app/tools/3d/under-desk-clamp-generator`
- `video-compressor-resizer` — `PrivKnife/src/app/tools/audio-video/video-compressor-resizer`
- `video-gif-trimmer` — `PrivKnife/src/app/tools/audio-video/video-gif-trimmer`
- `web-vitals` — `PrivKnife/src/app/tools/dev/web-vitals`
