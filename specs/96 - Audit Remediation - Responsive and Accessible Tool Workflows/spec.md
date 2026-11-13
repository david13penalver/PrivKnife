# Spec 96: Audit Remediation - Responsive and Accessible Tool Workflows

- **Status:** Ready for implementation; tasks unchecked.
- **Source:** [Application audit](../../APPLICATION_AUDIT_2026-11-13.md), including the completed lamp follow-up.
- **Dependencies:** [92: Audit Remediation - Reliable Test and Browser Infrastructure](../92%20-%20Audit%20Remediation%20-%20Reliable%20Test%20and%20Browser%20Infrastructure/spec.md), [93: Audit Remediation - Remove Advertising Placeholders](../93%20-%20Audit%20Remediation%20-%20Remove%20Advertising%20Placeholders/spec.md), [95: Audit Remediation - Complete English and Spanish Localization](../95%20-%20Audit%20Remediation%20-%20Complete%20English%20and%20Spanish%20Localization/spec.md)
- **Companion documents:** [Plan](plan.md), [Tasks](tasks.md).

## Problem

The 236 successful initial page captures establish neither full mobile usability nor dialog, touch and loaded-state behavior. No document overflow was detected in those initial captures.

## Requirements

1. Exercise all tools at 320, 360, 390, 768, 1024 and 1440 CSS pixels, portrait/landscape where applicable, and 200% zoom, in English and Spanish.
2. Check initial, valid-input, validation-error, processing, result, dialog and reset states; explicitly mark inapplicable states with a reason.
3. Prevent clipping, overlap and accidental page scrolling; allow intentional bounded scrolling for code/tables with accessible labels.
4. Use accessible labels, visible keyboard focus, logical focus order/dialog focus restoration, status announcements and at least 44x44 CSS-pixel interactive targets.
5. Verify PDF/image coordinates at DPR 1–3, touch selection, 3D orbit versus page scroll and on-screen-keyboard form access.
6. Preserve c-/l-/g-- BEM namespaces and shared SASS components; layouts arrange space only.

## Acceptance criteria

- **AC-96-01:** Every manifest row has responsive state evidence, with no clipped actions, obstructed content or unintended horizontal document overflow.
- **AC-96-02:** Keyboard/touch workflows and accessible feedback pass; automated accessibility scans have no serious/critical findings and manual focus checks pass.
- **AC-96-03:** Device/browser evidence is attached; unavailable physical-device checks remain release blockers rather than implied passes.

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
