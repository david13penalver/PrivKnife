# Spec 142 · Tasks

[Acceptance criteria](spec.md) · [Implementation plan](plan.md)

- [ ] Record the starting revision, prerequisites and current reproduction.
- [ ] AC1 · Decode exported media independently and attach the corresponding verification evidence.
- [ ] AC2 · Recover from invalid or replaced input and attach the corresponding verification evidence.
- [ ] AC3 · Preserve local processing and resource lifetime and attach the corresponding verification evidence.

## Route evidence

- [ ] 10 `/tools/batch-image-compressor` · Mix transparent and rotated inputs and inspect every image in the downloaded ZIP.
- [ ] 11 `/tools/favicon-app-icon-suite` · Parse the ICO directory and decode each advertised icon size.
- [ ] 12 `/tools/og-card-maker` · Export a long multilingual title and check for clipped glyphs.
- [ ] 15 `/tools/subtitles-shifter` · Shift a cue across time zero and parse the SRT/VTT timing after export.
- [ ] 20 `/tools/audio-bpm-detector` · Reset after an irregular tap sequence and verify the next tempo estimate.
- [ ] 21 `/tools/soundwave-art-maker` · Compare rendered waveforms for silence and a known pulse at the final sample.
- [ ] 22 `/tools/video-to-gif` · Decode and time the first and last GIF frames of a subsecond selection.
- [ ] 23 `/tools/screenshot-mockup` · Export a portrait screenshot in a landscape frame and check crop bounds.
- [ ] 27 `/tools/background-remover` · Verify alpha on the edges of a transparent source after background removal.
- [ ] 43 `/tools/passport-biometric-photo` · Inspect head placement, DPI and print dimensions for a rotated portrait.
- [ ] 44 `/tools/heic-avif-converter` · Decode every exported image after mixing valid, corrupt and unsupported inputs.
- [ ] 51 `/tools/audio-trimmer-booster` · Decode each audio format and compare duration and channel count after trimming.
- [ ] 52 `/tools/video-compressor-resizer` · Decode a portrait clip and verify orientation, duration and audio sync.
- [ ] 57 `/tools/seamless-texture-generator` · Tile the export in a two-by-two grid and compare opposing edge pixels.

## Close the spec

- [ ] Link exact commands, results and outstanding cases in the verification record.
- [ ] Run the applicable regression gates, update the roadmap status and commit with the repository’s Conventional Commits convention.
