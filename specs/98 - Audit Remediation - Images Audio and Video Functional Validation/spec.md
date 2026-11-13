# Spec 98: Audit Remediation - Images Audio and Video Functional Validation

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
4. Decode exports independently and compare dimensions, orientation, alpha, metadata, duration, codecs and requested settings; verify ZIP entry contents where supported.
5. Exercise corrupt/MIME-disguised inputs, unsupported codecs, empty media, EXIF orientation, transparent images, very large dimensions and mixed-success batches.
6. Check audio/video trim boundaries, volume clipping, BPM reference signals, variable-frame-rate synchronization and subtitle negative/overlapping timestamps.
7. Check OCR-independent image output quality, background-removal boundaries, passport crop dimensions, favicon resolutions, texture seams, mockup positioning and sampled color/contrast accuracy as applicable.
8. Repair confirmed defects with meaningful regression assertions. Coordinate translations with 95 and layout fixes with 96; do not claim completion from test descriptions or mocked downloads.

## Acceptance criteria

- **AC-98-01:** Every listed tool has a completed supported-format workflow and boundary-case report; no placeholder implementation passes.
- **AC-98-02:** Downloaded output is validated independently rather than by existence/nonzero bytes alone; clipboard content is checked with success/denial recovery.
- **AC-98-03:** No unhandled errors, private-data network requests, leaked resources or silent batch failures occur. Inapplicable cases have explicit reasons.
- **AC-98-04:** Every confirmed defect has a passing regression case and rerun evidence; unresolved blockers prevent spec completion.

## Constraints and scope boundaries

All processing remains client-side with zero telemetry or ingestion. Preserve Angular standalone/lazy loading, Signals, typed forms, BEM/SASS conventions and cleanup requirements from AGENTS.md. No production implementation is performed by this documentation change. Existing specs remain design references; historical “ready”/“complete” labels are not evidence that the current audit gates pass.

Full linguistic certification beyond English/Spanish is deferred. Real-device or unavailable-codec checks must be recorded as blocked, never inferred from Chromium emulation. Workflows and fixtures must stay local.

## Explicit tool scope

- `audio-trimmer-booster` — `PrivKnife/src/app/tools/audio-video/audio-trimmer-booster`
- `background-remover` — `PrivKnife/src/app/tools/media/background-remover`
- `batch-compressor` — `PrivKnife/src/app/tools/media/batch-compressor`
- `bpm-tap-detector` — `PrivKnife/src/app/tools/audio-video/bpm-tap-detector`
- `favicon-generator` — `PrivKnife/src/app/tools/media/favicon-generator`
- `heic-avif-converter` — `PrivKnife/src/app/tools/media/heic-avif-converter`
- `og-card-maker` — `PrivKnife/src/app/tools/media/og-card-maker`
- `passport-biometric-photo` — `PrivKnife/src/app/tools/media/passport-biometric-photo`
- `screenshot-mockup` — `PrivKnife/src/app/tools/media/screenshot-mockup`
- `seamless-texture-generator` — `PrivKnife/src/app/tools/media/seamless-texture-generator`
- `soundwave-art-maker` — `PrivKnife/src/app/tools/audio-video/soundwave-art-maker`
- `subtitles-shifter` — `PrivKnife/src/app/tools/media/subtitles-shifter`
- `video-compressor-resizer` — `PrivKnife/src/app/tools/audio-video/video-compressor-resizer`
- `video-gif-trimmer` — `PrivKnife/src/app/tools/audio-video/video-gif-trimmer`
