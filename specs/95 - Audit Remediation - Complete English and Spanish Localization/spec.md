# Spec 95: Audit Remediation - Complete English and Spanish Localization

- **Status:** Ready for implementation; tasks unchecked.
- **Source:** [Application audit](../../APPLICATION_AUDIT_2026-11-13.md), including the completed lamp follow-up.
- **Dependencies:** [92: Audit Remediation - Reliable Test and Browser Infrastructure](../92%20-%20Audit%20Remediation%20-%20Reliable%20Test%20and%20Browser%20Infrastructure/spec.md)
- **Companion documents:** [Plan](plan.md), [Tasks](tasks.md).

## Problem

English/Spanish dictionary key parity masks untranslated controls, validation errors and route titles. The lamp presets empire, ripple and vase display raw keys in both languages.

## Requirements

1. Translate every application-owned visible/accessibility string for all 59 tools and shared pages: controls, options, status/error/progress messages, tooltips, dialogs, route titles and generated explanatory output.
2. Correct tools.parametricLampDesigner.presets.empire/ripple/vase in English and Spanish and ensure preset labels never expose lookup keys.
3. Keep user data unchanged; retain standard units, formats and brands where appropriate. Review unchanged English/Spanish candidates manually instead of failing all equal strings.
4. Switch language through the visible selector without reload, persist selection and preserve inputs/results. Verify document lang and locale-appropriate dates/numbers without changing underlying values.
5. Retain all currently supported locales and schema compatibility; comprehensive linguistic certification of locales beyond English/Spanish is deferred as requested.

## Acceptance criteria

- **AC-95-01:** No raw translation keys or unintended English fallback appears in either language across exercised states.
- **AC-95-02:** All 59 tools have completed English/Spanish state reviews; exported explanatory labels and errors are covered.
- **AC-95-03:** Language changes preserve work and update shell/tool/document metadata without reload; all supported dictionary modules still compile.

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
