# Spec 142 · Media and Audio Video Output Verification

**Prerequisites** · [135](../135%20-%20Spec%20115%20Audit%20Remediation%20-%20Reproducible%20Audit%20Baseline%20and%20Browser%20Workflows/spec.md), [139](../139%20-%20Spec%20115%20Audit%20Remediation%20-%20Responsive%20and%20Accessible%20Tool%20Workflows/spec.md), [140](../140%20-%20Spec%20115%20Audit%20Remediation%20-%20Angular%20View%20Models%20and%20Canonical%20Tool%20Metadata/spec.md)

## Scope

Validate 14 media and audio/video routes from import to output, including independent decode and recovery for formats used in the audit.

## Acceptance criteria

### AC1. Decode exported media independently

Use rotated and transparent source images, a synthetic audio pulse, and a clip with visible selection landmarks. Compare output dimensions, orientation, alpha, channel count and timing. Reopen archive entries and icon sizes individually.

### AC2. Recover from invalid or replaced input

Test corrupt and unsupported formats, missing codec support, zero-duration selections and consecutive jobs. Check that only the current job produces an output and actionable errors preserve a path to retry.

### AC3. Preserve local processing and resource lifetime

Exercise real workers for heavy paths and verify progress, cleanup and secure-preview network containment for generated artifacts. Record codec and environment capabilities with test results.

## Tool acceptance checklist

| Original spec | Canonical URL | Required workflow and independent check |
|---|---|---|
| 10 | [`/tools/batch-image-compressor`](../../PrivKnife/src/app/tools/media/batch-compressor) | Mix transparent and rotated inputs and inspect every image in the downloaded ZIP. |
| 11 | [`/tools/favicon-app-icon-suite`](../../PrivKnife/src/app/tools/media/favicon-generator) | Parse the ICO directory and decode each advertised icon size. |
| 12 | [`/tools/og-card-maker`](../../PrivKnife/src/app/tools/media/og-card-maker) | Export a long multilingual title and check for clipped glyphs. |
| 15 | [`/tools/subtitles-shifter`](../../PrivKnife/src/app/tools/media/subtitles-shifter) | Shift a cue across time zero and parse the SRT/VTT timing after export. |
| 20 | [`/tools/audio-bpm-detector`](../../PrivKnife/src/app/tools/audio-video/bpm-tap-detector) | Reset after an irregular tap sequence and verify the next tempo estimate. |
| 21 | [`/tools/soundwave-art-maker`](../../PrivKnife/src/app/tools/audio-video/soundwave-art-maker) | Compare rendered waveforms for silence and a known pulse at the final sample. |
| 22 | [`/tools/video-to-gif`](../../PrivKnife/src/app/tools/audio-video/video-gif-trimmer) | Decode and time the first and last GIF frames of a subsecond selection. |
| 23 | [`/tools/screenshot-mockup`](../../PrivKnife/src/app/tools/media/screenshot-mockup) | Export a portrait screenshot in a landscape frame and check crop bounds. |
| 27 | [`/tools/background-remover`](../../PrivKnife/src/app/tools/media/background-remover) | Verify alpha on the edges of a transparent source after background removal. |
| 43 | [`/tools/passport-biometric-photo`](../../PrivKnife/src/app/tools/media/passport-biometric-photo) | Inspect head placement, DPI and print dimensions for a rotated portrait. |
| 44 | [`/tools/heic-avif-converter`](../../PrivKnife/src/app/tools/media/heic-avif-converter) | Decode every exported image after mixing valid, corrupt and unsupported inputs. |
| 51 | [`/tools/audio-trimmer-booster`](../../PrivKnife/src/app/tools/audio-video/audio-trimmer-booster) | Decode each audio format and compare duration and channel count after trimming. |
| 52 | [`/tools/video-compressor-resizer`](../../PrivKnife/src/app/tools/audio-video/video-compressor-resizer) | Decode a portrait clip and verify orientation, duration and audio sync. |
| 57 | [`/tools/seamless-texture-generator`](../../PrivKnife/src/app/tools/media/seamless-texture-generator) | Tile the export in a two-by-two grid and compare opposing edge pixels. |

## References

- [Spec 115 tool audit](../../SPEC_115_TOOL_AUDIT.md)
- [Remediation roadmap](../SPEC_115_REMEDIATION_ROADMAP.md)
- Earlier remediation specs [94](../94%20-%20Audit%20Remediation%20-%20Privacy%20Containment%20and%20Resource%20Safety/spec.md), [98](../98%20-%20Audit%20Remediation%20-%20Images%20Audio%20and%20Video%20Functional%20Validation/spec.md)
- [Implementation plan](plan.md) and [task checklist](tasks.md)
