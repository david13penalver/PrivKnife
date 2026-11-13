# PrivKnife application audit — 2026-11-13

## Verdict

**Not ready for full functional, bilingual, mobile, or 100% coverage sign-off.** This audit covers every canonical tool in the inventory, running the existing unit suite and browser page-load checks. It is not an exhaustive end-to-end certification: file upload/export round trips, every control, physical phones, Safari, loaded states and all edge cases were not exercised. Those remain explicit acceptance work, not implied passes.

## Method and evidence

- Target: http://localhost:4200; installed headless Chromium via Puppeteer, 390×900 touch emulation and 1440×900 desktop, English and Spanish persisted language. This is Chromium, not a physical phone or branded Google Chrome session.
- Browser evidence: [browser.json](audit-evidence/browser.json), including DOM text, document language, ad elements, overflow and page exceptions. Page-load/no-overflow does not prove usability or correct processing.
- Unit baseline: **137 files passed, 1 failed; 1,733 tests passed, 1 failed**. See [baseline log](audit-evidence/tests-no-coverage.log).
- Original coverage command failed because no coverage provider was installed. A temporary `npm install --no-save --package-lock=false @vitest/coverage-v8@4.0.8` enabled collection and resolved Vitest from 4.1.11 to 4.0.8 locally; package manifests/lockfile were not intentionally changed. Results across these environments must not be directly treated as regressions.
- Final coverage uses reportOnFailure and default Angular mapping: [measured log](audit-evidence/coverage-measured.log), [file coverage](audit-evidence/coverage-summary.json). The earlier custom source-glob experiment returned spurious zero coverage and is invalid; do not use coverage-final.log for percentages.
- Build succeeds: [build log](audit-evidence/build.log). Initial bundle total 386.52 kB, estimated transfer 105.53 kB; this includes initial assets, so separately measure initial JS against the repository 200KB requirement.
- Test descriptions per tool: [inventory](audit-evidence/test-inventory.json). Descriptions indicate intended coverage, not proof every assertion is adequate.

## Prioritized findings

### High: 100% coverage requirement is unmet

Measured overall coverage: statements 78.04%, branches 61.70%, functions 49.93%, lines 81.28%. Per-tool measured-file aggregates follow below. Uninstrumented workers/unloaded files may be absent: these numbers are not proof of complete source inclusion. Add a supported coverage provider, include all engines/components/workers, exclude only justified non-executable fixtures/types, and enforce per-file 100% statements/branches/functions/lines in CI. Never count test quantity as coverage.

### High: advertising divs remain

**Resolved in Spec 93:** removed the placeholders from all 14 affected tools, including conditional download dialogs and reserved spacing. See [Spec 93](specs/93%20-%20Audit%20Remediation%20-%20Remove%20Advertising%20Placeholders/spec.md) and its [verification evidence](specs/93%20-%20Audit%20Remediation%20-%20Remove%20Advertising%20Placeholders/evidence.md). No evidence here establishes an active advertising network; the confirmed failure was the placeholders themselves.

### High: tests do not all pass

- Baseline favicon-generator.component.spec.ts:66 assigns to read-only navigator.clipboard. Fix mocking with a configurable property stub and restore it afterward; verify clipboard success and denial in a real browser. This is a harness failure, not confirmed user-facing breakage.
- Coverage runs also exposed bank-statement-converter.component.spec.ts:136 and :151 clipboard mocking failures and 5-second timeouts in braille-ada-sign-generator/engine.spec.ts:158 and parametric-lamp-designer.component.spec.ts:140. Failures vary by run; see logs. Separate instrumentation/load overhead from actual algorithm performance before changing timeout budgets.
- jsdom reports missing Canvas/WebGL and unimplemented navigation. Passing mocked tests cannot establish visual correctness, actual mesh rendering, or browser downloads.

### High: privacy architecture needs remediation

`tools/dev/web-vitals/engine.ts:79` constructs Google PageSpeed requests; its runPageSpeedAudit calls fetch. This is remote processing, incompatible with a blanket local-only tool promise. Mark this tool explicitly external/disabled or remove it from the private suite. DoH may be allowed by the repository exception but must be disclosed and tested separately. No private user data was submitted to these services during this audit.

### High: Spanish UI is incomplete

Confirmed visually: the invoice page has a Spanish title but English “Document Configuration”, “Your Business (From)”, and “Payment Terms / Wire Details”. See [mobile screenshot](audit-evidence/invoice-es-mobile.png).

The static dictionaries have 479 English and 479 Spanish keys, with no missing Spanish keys ([comparison](audit-evidence/locales.json)). Rendered text comparisons below identify unchanged English phrases for review; identifiers, units, brands and user content may legitimately remain unchanged. Check validation errors, options, help, tooltips, dialogs, exported documents and screen-reader labels in both languages. Web Vitals validation at component.ts:466 is explicitly hardcoded English. Route title strings are also English in app.routes.ts.

### Medium: responsive results are only initial-state checks

No overflow means document scrollWidth did not exceed viewport width at capture. It does not exclude clipped content, tiny targets, overlapping controls, overflowing dialogs or inaccessible canvases. Require 320/360/390/768/1024/1440px, landscape, 200% zoom, keyboard and touch tests with valid/error/processing/result states. For 3D tools test orbit gestures versus page scrolling; for PDF/image tools test selection coordinates at device-pixel ratios 1–3.

## Per-tool matrix

S/B/F/L = aggregate percentages over measured files for the tool. “load” means DOM capture completed, not functional certification. Each tool still needs the workflow and edge-case gates below.

| Tool / route | EN mobile / desktop | ES mobile / desktop | Ad markup in source | S / B / F / L | Existing test cases |
|---|---|---|---|---|---|
| audio-trimmer-booster (`/tools/audio-trimmer-booster`) | load / load | load / load | not found | 87.9 / 71.9 / 63.1 / 89.8 | 29 |
| background-remover (`/tools/background-remover`) | load / load | load / load | not found | 75.4 / 60.8 / 54.7 / 77.4 | 22 |
| bank-statement-converter (`/tools/bank-statement-converter`) | load / load | load / load | not found | 78.0 / 66.4 / 63.8 / 87.0 | 32 |
| barcode-labels (`/tools/barcode-labels`) | load / load | load / load | **YES** | 72.3 / 67.4 / 62.0 / 78.6 | 25 |
| batch-compressor (`/tools/batch-image-compressor`) | load / load | load / load | **YES** | 70.4 / 58.7 / 62.7 / 72.0 | 20 |
| bpm-tap-detector (`/tools/audio-bpm-detector`) | load / load | load / load | not found | 79.3 / 57.1 / 61.6 / 79.6 | 28 |
| braille-ada-sign-generator (`/tools/braille-ada-sign-generator`) | load / load | load / load | not found | 81.7 / 58.4 / 52.6 / 84.7 | 43 |
| calendar-linker (`/tools/calendar-linker`) | load / load | load / load | **YES** | 85.0 / 66.7 / 50.0 / 90.8 | 22 |
| cappuccino-stencil-maker (`/tools/cappuccino-stencil-maker`) | load / load | load / load | not found | 75.2 / 59.1 / 39.7 / 81.2 | 35 |
| color-palette-extractor (`/tools/color-palette-extractor`) | load / load | load / load | **YES** | 80.3 / 66.7 / 60.0 / 82.7 | 19 |
| cookie-cutter (`/tools/cookie-cutter`) | load / load | load / load | not found | 69.0 / 36.2 / 57.8 / 71.2 | 20 |
| crypto-hash-uuid (`/tools/crypto-hash-uuid`) | load / load | load / load | not found | 84.9 / 75.0 / 49.3 / 85.9 | 23 |
| csv-converter (`/tools/csv-to-sql-json`) | load / load | load / load | not found | 84.7 / 65.9 / 57.6 / 87.0 | 28 |
| csv-vector-chart-builder (`/tools/csv-vector-chart-builder`) | load / load | load / load | not found | 90.9 / 62.1 / 51.4 / 93.5 | 27 |
| desk-wedge-nameplate (`/tools/desk-wedge-nameplate`) | load / load | load / load | not found | 84.2 / 62.7 / 41.8 / 88.7 | 19 |
| diff-checker (`/tools/diff-checker`) | load / load | load / load | not found | 72.7 / 68.8 / 54.2 / 82.7 | 29 |
| dns-checker (`/tools/dns-checker`) | load / load | load / load | not found | 88.8 / 71.1 / 70.9 / 92.4 | 20 |
| electronics-box-enclosure (`/tools/electronics-box-enclosure`) | load / load | load / load | not found | 85.2 / 66.5 / 42.5 / 87.1 | 31 |
| email-signature-generator (`/tools/email-signature-generator`) | load / load | load / load | **YES** | 56.7 / 56.2 / 34.9 / 63.7 | 23 |
| emergency-recovery-kit (`/tools/emergency-recovery-kit`) | load / load | load / load | not found | 92.1 / 64.2 / 61.5 / 95.0 | 22 |
| exif-stripper (`/tools/exif-stripper`) | load / load | load / load | not found | 90.0 / 74.8 / 89.5 / 92.0 | 15 |
| face-plate-blur (`/tools/face-plate-blur`) | load / load | load / load | not found | 59.4 / 47.2 / 46.1 / 62.3 | 39 |
| favicon-generator (`/tools/favicon-app-icon-suite`) | load / load | load / load | **YES** | 75.1 / 59.8 / 47.2 / 80.7 | 12 |
| file-encryptor-vault (`/tools/file-encryptor-vault`) | load / load | load / load | not found | 75.4 / 59.1 / 49.1 / 80.5 | 27 |
| floor-plan-furniture-scaler (`/tools/floor-plan-furniture-scaler`) | load / load | load / load | not found | 90.5 / 67.6 / 61.8 / 94.3 | 33 |
| font-subsetter-converter (`/tools/font-subsetter-converter`) | load / load | load / load | not found | 88.2 / 70.4 / 52.5 / 91.1 | 30 |
| geometric-plant-pot (`/tools/geometric-plant-pot`) | load / load | load / load | not found | 84.3 / 64.8 / 40.9 / 86.1 | 34 |
| grid-paper (`/tools/grid-paper`) | load / load | load / load | **YES** | 80.8 / 72.4 / 42.6 / 85.2 | 21 |
| gridfinity-bin-generator (`/tools/gridfinity-bin-generator`) | load / load | load / load | not found | 84.5 / 62.5 / 43.0 / 86.0 | 35 |
| heic-avif-converter (`/tools/heic-avif-converter`) | load / load | load / load | not found | 72.6 / 59.5 / 58.3 / 74.6 | 37 |
| hsw-insert-adapter (`/tools/hsw-insert-adapter`) | load / load | load / load | not found | 71.3 / 59.6 / 37.1 / 78.1 | 39 |
| invoice-maker (`/tools/invoice-maker`) | load / load | load / load | **YES** | 83.8 / 67.0 / 38.5 / 88.0 | 26 |
| keycap-switch-tester-maker (`/tools/keycap-switch-tester-maker`) | load / load | load / load | not found | 79.0 / 59.9 / 44.4 / 82.3 | 37 |
| lithophane-maker (`/tools/lithophane-maker`) | load / load | load / load | not found | 82.7 / 64.7 / 38.7 / 85.4 | 37 |
| local-ocr-text-extractor (`/tools/local-ocr-text-extractor`) | load / load | load / load | not found | 61.2 / 46.8 / 50.0 / 62.5 | 34 |
| markdown-cheatsheet (`/tools/markdown-cheatsheet`) | load / load | load / load | **YES** | 82.6 / 64.9 / 49.3 / 85.1 | 17 |
| mesh-gradient-maker (`/tools/css-mesh-gradient-maker`) | load / load | load / load | **YES** | 77.2 / 51.8 / 55.7 / 81.1 | 16 |
| nutrition-label-maker (`/tools/nutrition-label-maker`) | load / load | load / load | not found | 92.5 / 64.4 / 46.9 / 95.1 | 28 |
| og-card-maker (`/tools/og-card-maker`) | load / load | load / load | **YES** | 42.0 / 27.5 / 24.4 / 42.0 | 17 |
| parametric-lamp-designer (`/tools/parametric-lamp-designer`) | load / load | load / load | not found | 88.0 / 67.1 / 49.4 / 90.1 | 31 |
| passport-biometric-photo (`/tools/passport-biometric-photo`) | load / load | load / load | not found | 69.2 / 52.4 / 46.7 / 70.4 | 43 |
| pdf-merger (`/tools/pdf-merger-splitter`) | load / load | load / load | not found | 75.2 / 51.1 / 55.7 / 78.2 | 18 |
| pdf-redaction (`/tools/pdf-redaction`) | load / load | load / load | not found | 67.5 / 50.9 / 59.6 / 68.7 | 19 |
| pdf-signer-stamper (`/tools/pdf-signer-stamper`) | load / load | load / load | not found | 56.8 / 39.8 / 38.7 / 61.4 | 31 |
| pet-id-tag-generator (`/tools/pet-id-tag-generator`) | load / load | load / load | not found | 77.0 / 59.1 / 38.1 / 82.9 | 37 |
| pii-scrubber-anonymizer (`/tools/pii-scrubber-anonymizer`) | load / load | load / load | not found | 83.0 / 67.2 / 50.7 / 86.7 | 31 |
| qr-stand-keychain (`/tools/3d-qr-stand`) | load / load | load / load | not found | 83.3 / 54.7 / 65.3 / 85.8 | 23 |
| robots-sitemap-builder (`/tools/robots-sitemap-builder`) | load / load | load / load | **YES** | 76.8 / 82.7 / 33.3 / 81.6 | 22 |
| screenshot-mockup (`/tools/screenshot-mockup`) | load / load | load / load | not found | 53.8 / 65.6 / 39.5 / 54.5 | 22 |
| seamless-texture-generator (`/tools/seamless-texture-generator`) | load / load | load / load | not found | 81.6 / 64.9 / 47.8 / 84.6 | 29 |
| skadis-pegboard-maker (`/tools/skadis-pegboard-maker`) | load / load | load / load | not found | 83.6 / 64.9 / 42.2 / 86.1 | 35 |
| soundwave-art-maker (`/tools/soundwave-art-maker`) | load / load | load / load | not found | 85.1 / 67.1 / 47.1 / 88.5 | 19 |
| subtitles-shifter (`/tools/subtitles-shifter`) | load / load | load / load | **YES** | 81.8 / 65.1 / 46.4 / 86.6 | 25 |
| svg-optimizer-cleaner (`/tools/svg-optimizer-cleaner`) | load / load | load / load | not found | 82.9 / 68.6 / 52.9 / 88.7 | 29 |
| table-tent-maker (`/tools/table-tent-maker`) | load / load | load / load | **YES** | 83.0 / 72.1 / 57.7 / 89.3 | 18 |
| under-desk-clamp-generator (`/tools/under-desk-clamp-generator`) | load / load | load / load | not found | 81.9 / 62.2 / 39.5 / 84.1 | 36 |
| video-compressor-resizer (`/tools/video-compressor-resizer`) | load / load | load / load | not found | 85.8 / 67.2 / 59.3 / 86.9 | 33 |
| video-gif-trimmer (`/tools/video-to-gif`) | load / load | load / load | not found | 50.7 / 50.3 / 46.2 / 53.7 | 14 |
| web-vitals (`/tools/web-vitals`) | load / load | load / load | not found | 89.9 / 76.9 / 64.1 / 92.4 | 19 |

## Tool-specific verification backlog

Each entry lists existing edge-oriented test descriptions (when found) and rendered untranslated-text candidates. These are triage evidence, not a declaration that all other cases pass.

### audio-trimmer-booster

Source: `PrivKnife/src/app/tools/audio-video/audio-trimmer-booster`. Route: `/tools/audio-trimmer-booster`.
- Existing edge-oriented tests: should reject negative start time; should reject start time >= end time; should reject non-positive volume gain multiplier; should reject negative fade times; should reject missing audio data; should return error result when options are invalid.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### background-remover

Source: `PrivKnife/src/app/tools/media/background-remover`. Route: `/tools/background-remover`.
- Existing edge-oriented tests: calculates Euclidean RGB color distance and perceived luminance; runs 100% client-side with zero network calls; guarantees 100% client-side privacy with zero telemetry or network calls.
- Unchanged rendered EN/ES text to review: `2. Segmentation Mode & Tolerance`; `3. Backdrop Replacement Style`; `Drag & drop your files here`; `Export Deliverables (Client-Side Only)`; `Interactive Split-View Comparison`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### bank-statement-converter

Source: `PrivKnife/src/app/tools/dev/bank-statement-converter`. Route: `/tools/bank-statement-converter`.
- Existing edge-oriented tests: should reject null or undefined options; should reject unsupported date formats; should reject unsupported export formats; should build Quicken QIF deliverable with proper record delimiters.
- Unchanged rendered EN/ES text to review: `Clean merchant names (strip noise & store #s)`; `Drop bank CSV or OFX/QFX file here, or paste below`; `Invert signs (switch debits & credits)`; `Supports CSV, TSV, OFX, QFX`; `Upload a CSV/OFX file or load sample data to inspect normalized transactions`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### barcode-labels

Source: `PrivKnife/src/app/tools/documents/barcode-labels`. Route: `/tools/barcode-labels`.
- Existing edge-oriented tests: should generate formatted sequential items with zero padding; should execute processing with ZERO network requests (Privacy Verification).
- Unchanged rendered EN/ES text to review: `*Avery® and Avery product numbers are registered trademarks of CCL Label, Inc. PrivKnife is an independent software tool and is not affiliated with, endorsed by, or sponsored by Avery or CCL Label, Inc. Dimensions and layout templates are provided solely for compatibility and alignment.`; `4. Sheet Layout & Reuse Options`; `Avery 5160 / 8160 (Address, 30 per sheet)`; `Avery 5163 / 8163 (Shipping, 10 per sheet)`; `Avery 5167 / 8167 (Mini Barcode, 80 per sheet)`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### batch-compressor

Source: `PrivKnife/src/app/tools/media/batch-compressor`. Route: `/tools/batch-image-compressor`.
- Existing edge-oriented tests: should initialize with empty queue, WebP format, and 80% quality; should execute batch compression with ZERO network requests (Privacy Verification).
- Unchanged rendered EN/ES text to review: `2. Compression & Format Settings`; `Batch process dozens of photos instantly in your browser`; `Drop images here to compress (PNG, JPG, WebP, GIF, SVG)`; `Full HD (Max 1920px - Web standard)`; `Original Resolution (No downscaling)`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### bpm-tap-detector

Source: `PrivKnife/src/app/tools/audio-video/bpm-tap-detector`. Route: `/tools/audio-bpm-detector`.
- Existing edge-oriented tests: returns 0 BPM for empty or single tap; guarantees zero network calls during tap, metronome, and audio analysis (Privacy Guard).
- Unchanged rendered EN/ES text to review: `Audio File Analyzer (MP3, WAV, FLAC, M4A, OGG)`; `Click or Press Space / T • 0 taps`; `Drag & drop your files here`; `How Client-Side BPM & Key Detection Works`; `Krumhansl-Schmuckler Key Finding: 12-class chromagram profile correlation maps notes to both traditional keys and the Camelot Wheel for seamless DJ harmonic mixing.`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### braille-ada-sign-generator

Source: `PrivKnife/src/app/tools/3d/braille-ada-sign-generator`. Route: `/tools/braille-ada-sign-generator`.
- Existing edge-oriented tests: should reject null or undefined options; should reject empty or whitespace-only room title; should reject overly long room title (> 40 chars); should convert Braille cells to valid Unicode Braille Patterns; should produce zero NaN vertices across all characters and presets (DEFECT-38-01 Red test); should calculate live unicode braille representation.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### calendar-linker

Source: `PrivKnife/src/app/tools/dev/calendar-linker`. Route: `/tools/calendar-linker`.
- Existing edge-oriented tests: should generate links and export files with ZERO network calls (Privacy Verification).
- Unchanged rendered EN/ES text to review: `Description / Agenda Notes`; `Office 365 (Work / School)`; `One-time event (No repeat)`; `Privacy-First Architecture Webinar`; `SPONSOR ADVERTISEMENT (728×90 LEADERBOARD)`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### cappuccino-stencil-maker

Source: `PrivKnife/src/app/tools/3d/cappuccino-stencil-maker`. Route: `/tools/cappuccino-stencil-maker`.
- Existing edge-oriented tests: should reject null or undefined options; should reject empty custom text when motif is custom_text.
- Unchanged rendered EN/ES text to review: `100% processed client-side. Zero telemetry or server exfiltration.`; `3. Motif & Island Bridging`; `Food-Safe Filament: Use natural unpigmented PETG, certified food-grade PLA, or PP (Polypropylene).`; `Inserts tie bars to keep isolated center islands connected.`; `Layer Sealing: Dusting cocoa powder or cinnamon requires smooth top surfaces; enable ironed top layers in your slicer.`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### color-palette-extractor

Source: `PrivKnife/src/app/tools/dev/color-palette-extractor`. Route: `/tools/color-palette-extractor`.
- Existing edge-oriented tests: should calculate relative luminance matching W3C spec; should extract dominant colors from image pixel buffer via quantization; should extract and export with ZERO network requests (Privacy Verification).
- Unchanged rendered EN/ES text to review: `#0F172A • RGB(15, 23, 42) • Lum: 0.01`; `#10B981 • RGB(16, 185, 129) • Lum: 0.38`; `#2563EB • RGB(37, 99, 235) • Lum: 0.16`; `#EF4444 • RGB(239, 68, 68) • Lum: 0.22`; `#F59E0B • RGB(245, 158, 11) • Lum: 0.46`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### cookie-cutter

Source: `PrivKnife/src/app/tools/3d/cookie-cutter`. Route: `/tools/cookie-cutter`.
- Existing edge-oriented tests: exports 3MF, STL, and Zip bundle without throwing errors; guarantees zero network calls during preset loading, tweaking, and exporting (Privacy Guard).
- Unchanged rendered EN/ES text to review: `1. Silhouette Image / Vector Upload`; `2. Cutter & Stamp Dimensions`; `3. Material Preview Colors`; `4. Slicing & Filament Estimation`; `Drag & drop your files here`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### crypto-hash-uuid

Source: `PrivKnife/src/app/tools/privacy/crypto-hash-uuid`. Route: `/tools/crypto-hash-uuid`.
- Existing edge-oriented tests: should execute processing with ZERO network requests (Privacy Verification).
- Unchanged rendered EN/ES text to review: `All UUIDv4 identifiers are generated using the browser's cryptographically secure pseudo-random number generator (crypto.randomUUID()), providing 122 bits of unpredictable entropy. All cryptographic digests are calculated directly on your device via the Web Crypto API (window.crypto.subtle.digest) and native bitwise math. PrivKnife contains zero tracking code and zero remote ingestion endpoints: your inputs and outputs never leave your computer.`; `Include standard hyphens (-)`; `Privacy & Security Guarantee`; `UPPERCASE (e.g. F47AC10B...)`; `lowercase (e.g. f47ac10b...)`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### csv-converter

Source: `PrivKnife/src/app/tools/dev/csv-converter`. Route: `/tools/csv-to-sql-json`.
- Existing edge-oriented tests: should parse standard comma-delimited CSV text; should parse tab-delimited (TSV) text; should parse semicolon-delimited CSV text; should format decimal numbers like 0.5 unquoted in SQL and keep leading-zero codes quoted; should handle empty sheet or empty workbook without throwing; should execute conversion with ZERO network calls (Privacy Verification).
- Unchanged rendered EN/ES text to review: `    "role": "Product, Manager",`; `#	id	name	role	salary	active`; `1	1	Alice	Engineer	95000	true`; `2	2	Bob	Designer	82000	false`; `3	3	Charlie	Product, Manager	105000	true`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### csv-vector-chart-builder

Source: `PrivKnife/src/app/tools/dev/csv-vector-chart-builder`. Route: `/tools/csv-vector-chart-builder`.
- Existing edge-oriented tests: none identifiable from test descriptions; inspect assertions and add boundary tests.
- Unchanged rendered EN/ES text to review: `CSV Data / Paste Spreadsheet`; `Chart Subtitle / Legend Note`; `Comparative analysis of 2024 Actual vs 2025 Projected`; `Quarterly Revenue Performance ($)`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### desk-wedge-nameplate

Source: `PrivKnife/src/app/tools/3d/desk-wedge-nameplate`. Route: `/tools/desk-wedge-nameplate`.
- Existing edge-oriented tests: verifies 100% client-side privacy with zero telemetry or network calls.
- Unchanged rendered EN/ES text to review: `1. Inscription & Typography`; `3. Filament Material & Colors`; `Export Deliverables (Client-Side Only)`; `Include Subtitle / Position Title`; `Live 3D Slice & Fabrication Preview`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### diff-checker

Source: `PrivKnife/src/app/tools/dev/diff-checker`. Route: `/tools/diff-checker`.
- Existing edge-oriented tests: should report zero additions and deletions for identical text; should handle completely empty text gracefully; should handle additions when original is empty; should handle deletions when modified is empty.
- Unchanged rendered EN/ES text to review: `Enter text in both boxes above or click a sample to generate comparison.`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### dns-checker

Source: `PrivKnife/src/app/tools/dev/dns-checker`. Route: `/tools/dns-checker`.
- Existing edge-oriented tests: handles DoH responses when no records are returned or Status is non-zero; handles DoH network errors or timeouts gracefully without throwing; operates with zero telemetry tracking; validates invalid domain names and displays error banner.
- Unchanged rendered EN/ES text to review: `9.9.9.9	✕ ERROR	Request timed out	—	6000 ms`; `Expected Value (Optional):`; `REGION & LOCATION	PROVIDER	STATUS	RESOLVED RECORD(S)	TTL	LATENCY`; `🌐 Global DNS (8 Resolvers)`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### electronics-box-enclosure

Source: `PrivKnife/src/app/tools/3d/electronics-box-enclosure`. Route: `/tools/electronics-box-enclosure`.
- Existing edge-oriented tests: should reject when innerLength is 0 or negative; should reject when wall thickness is less than 1.0mm; should cut through-slots across lid thickness without raised overflow when ventilationGrille is true (DEFECT-34-01); should return error result gracefully when options are invalid.
- Unchanged rendered EN/ES text to review: `3. Standoffs, Ports & Cooling`; `408 tris (180 base + 228 lid)`; `56×26×16mm low-profile friction-slide case with microUSB access and internal board rails.`; `60×34×20mm snap-fit enclosure tailored for 30-pin & 38-pin ESP32 NodeMCU development boards.`; `75×58×24mm heavy-duty box with 4 corner M3 screw mounts and USB/DC jack access cutouts.`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### email-signature-generator

Source: `PrivKnife/src/app/tools/dev/email-signature-generator`. Route: `/tools/email-signature-generator`.
- Existing edge-oriented tests: should verify 100% offline isolation with zero network leakage.
- Unchanged rendered EN/ES text to review: `Apple Mail (Mac): Mail → Settings → Signatures → Add signature → Uncheck "Always match my default message font" → Paste.`; `Gmail: Go to Settings (gear) → See all settings → General → Signature → Click "+ Create new" → Paste (Ctrl+V / Cmd+V) → Save Changes.`; `How to Install in Your Email Client`; `Outlook Web (Office 365): Settings → View all Outlook settings → Mail → Compose and reply → Email signature → Paste → Save.`; `SPONSOR ADVERTISEMENT (300×250)`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### emergency-recovery-kit

Source: `PrivKnife/src/app/tools/privacy/emergency-recovery-kit`. Route: `/tools/emergency-recovery-kit`.
- Existing edge-oriented tests: none identifiable from test descriptions; inspect assertions and add boundary tests.
- Unchanged rendered EN/ES text to review: `1. Master Password Vault & Credentials`; `12 Words (Standard BIP-39)`; `2. 2FA Backup & Recovery Codes`; `24 Words (High Security BIP-39)`; `3. Cryptographic Seed Phrase (24 Words • BIP-39)`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### exif-stripper

Source: `PrivKnife/src/app/tools/privacy/exif-stripper`. Route: `/tools/exif-stripper`.
- Existing edge-oriented tests: should throw an error for corrupted or unrecognized file buffers; should throw an error for empty buffers; should display initial empty dropzone state; should execute processing with ZERO network requests (Privacy Verification); should preserve and display error message when a corrupt file is selected.
- Unchanged rendered EN/ES text to review: `Drop your photo here, or browse`; `Supports JPEG, JPG, and PNG files up to 100MB`; `When you snap photos on smartphones or cameras, hidden metadata (EXIF) records your exact GPS coordinates, date and time, camera model, and device serial numbers. Sharing these photos online can expose your home address or location history. PrivKnife strips this data in your browser without sending a single byte across the internet.`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### face-plate-blur

Source: `PrivKnife/src/app/tools/privacy/face-plate-blur`. Route: `/tools/face-plate-blur`.
- Existing edge-oriented tests: should reject null or undefined options; should handle zero regions by stripping metadata and re-exporting image.
- Unchanged rendered EN/ES text to review: `Drop an image or click "Load Sample Photo" to begin censoring.`; `Interactive Canvas Preview & Export`; `Supports JPG, PNG, WebP • Never uploaded to any server`; `🔒 Zero Server Upload: All pixelation, blurring, and metadata stripping executes strictly on your local device.`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### favicon-generator

Source: `PrivKnife/src/app/tools/media/favicon-generator`. Route: `/tools/favicon-app-icon-suite`.
- Existing edge-oriented tests: should initialize with default site name, theme color, and empty source file; should execute generation and download with ZERO network requests (Privacy Verification).
- Unchanged rendered EN/ES text to review: `1. Select or Drop Source Image`; `15% (Recommended for circles)`; `2. Branding & Platform Configuration`; `3. Live Multi-Platform Previews`; `4. Generated HTML <head> Code`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### file-encryptor-vault

Source: `PrivKnife/src/app/tools/privacy/file-encryptor-vault`. Route: `/tools/file-encryptor-vault`.
- Existing edge-oriented tests: should reject missing or empty password; should reject short passwords (< 6 characters); should reject invalid PBKDF2 iterations; should reject decryption when given the wrong password; should reject corrupted or truncated vault container; should reject decryption if container metadata header is tampered with (AAD binding).
- Unchanged rendered EN/ES text to review: `.enc (Encrypted Container)`; `Any file type (PDF, docx, img, zip)`; `Embed original filename in vault metadata`; `Key Derivation (PBKDF2 SHA-256 Iterations)`; `Load Sample Confidential File`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### floor-plan-furniture-scaler

Source: `PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler`. Route: `/tools/floor-plan-furniture-scaler`.
- Existing edge-oriented tests: should throw on invalid project JSON; should display error alert when invalid JSON is imported (DEFECT-58-01); should execute floor plan operations with zero network calls.
- Unchanged rendered EN/ES text to review: `+ Dining Table 4P (120x80)`; `+ Dining Table 6P (180x90)`; `+ Kitchen Counter (180x60)`; `+ Shower Enclosure (90x90)`; `+ Wardrobe Closet (150x60)`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### font-subsetter-converter

Source: `PrivKnife/src/app/tools/dev/font-subsetter-converter`. Route: `/tools/font-subsetter-converter`.
- Existing edge-oriented tests: should reject empty or undersized buffers; should reject unrecognized magic signatures; should generate valid @font-face rule with format and unicode-range; should handle corrupt or invalid buffer gracefully; should unpack WOFF 1.0 input buffer without corrupting numTables (DEFECT-56-03).
- Unchanged rendered EN/ES text to review: `Drop OpenType Layout Features (GSUB, GPOS, GDEF)`; `Latin Supplement (á, ñ, ü)`; `Preserve Kerning Tables (kern)`; `Upload a font or load the sample preset to inspect glyph subsetting and @font-face rules.`; `🔤Click to upload font or drag & drop TTF, OTF, WOFF here Processed strictly on your local device`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### geometric-plant-pot

Source: `PrivKnife/src/app/tools/3d/geometric-plant-pot`. Route: `/tools/geometric-plant-pot`.
- Existing edge-oriented tests: should reject null or undefined options; should reject top diameter less than 30mm or exceeding 350mm; should reject height less than 30mm or exceeding 350mm; should reject polygon sides less than 3 or exceeding 32; should reject invalid wall thickness; should produce 3D manifold solid with non-zero thickness for createReservoirInsertGeometry.
- Unchanged rendered EN/ES text to review: `Binary .STL (Print-Bed Assembly)`; `Bottom Solid Layers: Set 5 to 6 solid bottom layers for a fully water-sealed base.`; `Drainage & Reservoir System`; `Hexagonal Spiral Self-Watering Planter`; `Infill: 20-25% gyroid or concentric infill avoids internal voids.`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### grid-paper

Source: `PrivKnife/src/app/tools/documents/grid-paper`. Route: `/tools/grid-paper`.
- Existing edge-oriented tests: should execute processing with ZERO network requests (Privacy Verification).
- Unchanged rendered EN/ES text to review: `(300x250 Sticky Sidebar Unit)`; `Grid Spacing / Pitch: 5 mm`; `Responsive Ad Placement (728x90 Top Leaderboard)`; `⬡ Hexagonal Honeycomb Grid`; `📐 Engineering Graph (5mm Quad)`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### gridfinity-bin-generator

Source: `PrivKnife/src/app/tools/3d/gridfinity-bin-generator`. Route: `/tools/gridfinity-bin-generator`.
- Existing edge-oriented tests: should reject when gridX or gridY is 0 or negative; should reject when heightUnits is 0 or negative; should emit zero degenerate (zero-area) triangles when labelTab is enabled (DEFECT-33-01); should return error result gracefully when options are invalid.
- Unchanged rendered EN/ES text to review: `126×42×14mm slim tray for tweezers, calipers, hex keys, and long tools.`; `2×3 6-Pocket Organizer (6U)`; `3×1 Low-Profile Tool Tray (2U)`; `84×126mm bin with 6 internal compartments for sorting electronics and precision fasteners.`; `84×42mm bin with center divider wall and dual finger scoops for paired hardware.`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### heic-avif-converter

Source: `PrivKnife/src/app/tools/media/heic-avif-converter`. Route: `/tools/heic-avif-converter`.
- Existing edge-oriented tests: should reject null or undefined options; should correctly calculate batch stats for empty queue.
- Unchanged rendered EN/ES text to review: `Always package download as single .ZIP`; `Drop HEIC, HEIF, or AVIF files here`; `Filename Suffix (Optional)`; `Load Sample Batch (AVIF + HEIC)`; `No images queued. Drop HEIC or AVIF photos on the left to begin.`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### hsw-insert-adapter

Source: `PrivKnife/src/app/tools/3d/hsw-insert-adapter`. Route: `/tools/hsw-insert-adapter`.
- Existing edge-oriented tests: should reject null or undefined options; should match totalTriangles between metrics and binary STL for empty_plug (DEFECT-42-01).
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### invoice-maker

Source: `PrivKnife/src/app/tools/documents/invoice-maker`. Route: `/tools/invoice-maker`.
- Existing edge-oriented tests: should accurately compute line item subtotals without floating point error; should handle zero line items gracefully; should return null when deserializing malformed JSON or invalid schema; should return errors for missing document number or sender name; should create an initial invoice with valid defaults and non-empty items; should execute processing with ZERO network requests (Privacy Verification).
- Unchanged rendered EN/ES text to review: `Company / Freelancer Name *`; `Company Logo (Stored 100% in local browser storage)`; `DESCRIPTION	QTY	UNIT PRICE	TOTAL	`; `Financial Adjustments & Terms`; `Payment Terms / Wire Details`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### keycap-switch-tester-maker

Source: `PrivKnife/src/app/tools/3d/keycap-switch-tester-maker`. Route: `/tools/keycap-switch-tester-maker`.
- Existing edge-oriented tests: should reject null or undefined options; should enforce tray row and column limits [1, 8]; should enforce legend text length limit for keycaps.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### lithophane-maker

Source: `PrivKnife/src/app/tools/3d/lithophane-maker`. Route: `/tools/lithophane-maker`.
- Existing edge-oriented tests: should reject when min thickness >= max thickness; should reject when width is zero or negative; should return error result gracefully when options are invalid; should update contrast factor and invert luminance reactively; should zoom camera on wheel event within limits; should revoke object URL immediately on image load or error in onFileDropped.
- Unchanged rendered EN/ES text to review: `120° self-standing arc lithophane with built-in foot. Perfect for desktops and mantels.`; `Brim / Adhesion: Use a 5mm outer brim to prevent tall lithophanes from wobbling or detaching during rapid printing.`; `Continuous 360° cylindrical wrap that slips over standard lamp fittings or LED tea lights.`; `Drag & drop your files here`; `Drop your photo here (PNG, JPG, WebP) or click to browse`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### local-ocr-text-extractor

Source: `PrivKnife/src/app/tools/documents/local-ocr-text-extractor`. Route: `/tools/local-ocr-text-extractor`.
- Existing edge-oriented tests: should reject null or undefined options; should reject unsupported OCR languages; should reject invalid binarization thresholds; should reject unsupported export formats.
- Unchanged rendered EN/ES text to review: `Drop scanned document or image here, or browse`; `Enhance Dynamic Contrast (Histogram Stretching)`; `Image Preprocessing Filters`; `Page Segmentation (Layout Analysis)`; `Portuguese / Português (por)`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### markdown-cheatsheet

Source: `PrivKnife/src/app/tools/documents/markdown-cheatsheet`. Route: `/tools/markdown-cheatsheet`.
- Existing edge-oriented tests: should export a non-empty application/pdf Blob; should verify 100% offline isolation with zero network leakage.
- Unchanged rendered EN/ES text to review: `# Dictionary lookup with default`; `# List comprehension with filtering`; `2-Sided Printing: Print landscape sheets with 3 columns, flip on short edge, for convenient folding.`; `Binary Search Tree	O(log n)	O(log n)	O(log n)	O(log n)`; `Break Avoidance: Section headers and code snippets automatically preserve their internal blocks across columns.`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### mesh-gradient-maker

Source: `PrivKnife/src/app/tools/dev/mesh-gradient-maker`. Route: `/tools/css-mesh-gradient-maker`.
- Existing edge-oriented tests: should execute generation and export with ZERO network requests (Privacy Verification).
- Unchanged rendered EN/ES text to review: `    radial-gradient(at 20% 25%, #3b82f6 0px, transparent 55%),`; `    radial-gradient(at 30% 80%, #ec4899 0px, transparent 50%),`; `    radial-gradient(at 75% 75%, #06b6d4 0px, transparent 55%);`; `    radial-gradient(at 80% 20%, #8b5cf6 0px, transparent 60%),`; `  -webkit-backdrop-filter: blur(16px);`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### nutrition-label-maker

Source: `PrivKnife/src/app/tools/documents/nutrition-label-maker`. Route: `/tools/nutrition-label-maker`.
- Existing edge-oriented tests: should reject negative calories; should reject empty serving size text; should reject negative nutrient amounts; should return error when options are invalid; should maintain ZERO network exfiltration during full workflow.
- Unchanged rendered EN/ES text to review: `* The % Daily Value (DV) tells you how much a nutrient ina serving of food contributes to a daily diet. 2,000 caloriesa day is used for general nutrition advice.`; `EU Regulation 1169/2011 (Per 100g / Portion)`; `FDA Dual Column (Per Serving & Per Container)`; `FDA Standard (2016 Revision)`; `Mandatory Micronutrients (2016 FDA)`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### og-card-maker

Source: `PrivKnife/src/app/tools/media/og-card-maker`. Route: `/tools/og-card-maker`.
- Existing edge-oriented tests: should render modern-tech template without errors; should render and export with ZERO network requests (Privacy Verification).
- Unchanged rendered EN/ES text to review: `2. Card Content & Messaging`; `4. Images & Avatars (Optional)`; `Canvas Size: 1200 × 630 px`; `Covers 1200x630 canvas with subtle contrast tint`; `Drop background image here`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### parametric-lamp-designer

Source: `PrivKnife/src/app/tools/3d/parametric-lamp-designer`. Route: `/tools/parametric-lamp-designer`.
- Existing edge-oriented tests: should reject invalid dimensions or negative values; should perform full 3D generation and export with ZERO network requests.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### passport-biometric-photo

Source: `PrivKnife/src/app/tools/media/passport-biometric-photo`. Route: `/tools/passport-biometric-photo`.
- Existing edge-oriented tests: should reject null or undefined options; should enforce zero telemetry and never trigger network calls.
- Unchanged rendered EN/ES text to review: `4×6″ Photo Paper (10×15 cm)`; `Active Image: Sample Portrait (Neutral)`; `Background: Plain white or off-white background with zero shadows or patterns.`; `Compliance Rules (US Passport & Visa (2x2 Inches)):`; `Dimensions: Exactly 2 x 2 inches (51 x 51 mm / 600x600 px at 300 DPI).`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### pdf-merger

Source: `PrivKnife/src/app/tools/documents/pdf-merger`. Route: `/tools/pdf-merger-splitter`.
- Existing edge-oriented tests: should display initial empty dropzone state; should display error message on invalid or corrupted files; should execute processing with ZERO network calls (Privacy Verification).
- Unchanged rendered EN/ES text to review: `Add one or multiple documents to merge, reorganize, split, or rotate`; `Drop your PDF files here, or browse`; `Most web-based PDF editors upload your sensitive files to remote cloud servers to merge or extract pages. PrivKnife uses pdf-lib and PDF.js to render, assemble, rotate, and reorganize your pages directly in your computer's RAM. Your legal documents, tax returns, and bank statements never leave your device.`; `Private Client-Side PDF Architecture`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### pdf-redaction

Source: `PrivKnife/src/app/tools/privacy/pdf-redaction`. Route: `/tools/pdf-redaction`.
- Existing edge-oriented tests: should display initial empty dropzone state with privacy badge; should execute processing with ZERO network calls (Privacy Verification); should catch corrupt non-PDF upload, prevent unhandled rejection, and display error banner.
- Unchanged rendered EN/ES text to review: `Drop your PDF here, or browse`; `Securely redact legal agreements, tax forms, medical records, or invoices`; `Typical online PDF editors upload your sensitive files to cloud servers where redactions are sometimes only cosmetic highlights that can easily be removed. PrivKnife burns true opaque vector rectangles into the document content stream and purges author, title, and generator metadata entirely in your browser using pdf-lib.`; `Zero-Server Permanent Redaction Guarantee`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### pdf-signer-stamper

Source: `PrivKnife/src/app/tools/documents/pdf-signer-stamper`. Route: `/tools/pdf-signer-stamper`.
- Existing edge-oriented tests: should reject null or undefined options; should handle zero stamps gracefully without corrupting document; should enforce zero network requests throughout full signing workflow.
- Unchanged rendered EN/ES text to review: `Active Document: sample-contract-agreement.pdf (2 pages)`; `Drop your PDF document here`; `Interactive Page Preview (595 × 842 pt)`; `No stamps placed yet. Draw a signature or click "+ Stamp" on the left.`; `Permanently flatten all annotations & signatures into PDF layers`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### pet-id-tag-generator

Source: `PrivKnife/src/app/tools/3d/pet-id-tag-generator`. Route: `/tools/pet-id-tag-generator`.
- Existing edge-oriented tests: should reject null or undefined options; should reject empty pet name; should reject excessively long pet name (> 20 chars).
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### pii-scrubber-anonymizer

Source: `PrivKnife/src/app/tools/privacy/pii-scrubber-anonymizer`. Route: `/tools/pii-scrubber-anonymizer`.
- Existing edge-oriented tests: should reject null or undefined options; should reject invalid redaction modes; should reject invalid custom regex pattern syntax; should reject invalid credit card numbers; should catch validation error and display alert banner when salt is empty in pseudonym mode; should catch invalid custom regex syntax and display alert banner.
- Unchanged rendered EN/ES text to review: `Credit Cards (Luhn Checked)`; `Custom Regex Pattern (Optional)`; `Drop log or CSV file here, or paste text below`; `Enter logs or drop a file to inspect anonymized output`; `IP Addresses (IPv4 / IPv6)`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### qr-stand-keychain

Source: `PrivKnife/src/app/tools/3d/qr-stand-keychain`. Route: `/tools/3d-qr-stand`.
- Existing edge-oriented tests: calculates luminance and flags warning when color contrast is insufficient; updates text payload and error correction level; exports 3MF, STL, and Zip without throwing errors; guarantees zero network calls during preset loading, customizing, and exports (Privacy Guard).
- Unchanged rendered EN/ES text to review: ` 💡 Recommended: ≥ 1.6mm for standard 0.4mm nozzle printers.`; `2. 3D Model Shape & Dimensions`; `3. Dual-Color Filament Preview`; `4. Slicing & Scannability Analysis`; `AMS / MMU: Import .3mf for instant multi-material color assignment.`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### robots-sitemap-builder

Source: `PrivKnife/src/app/tools/dev/robots-sitemap-builder`. Route: `/tools/robots-sitemap-builder`.
- Existing edge-oriented tests: should parse line-delimited URLs into SitemapUrlEntry array; should verify 100% offline isolation with zero network leakage.
- Unchanged rendered EN/ES text to review: `AI Bots Protection: The Block AI Scrapers preset protects your private web assets from unauthorized LLM model scrapers (GPTBot, ClaudeBot, CCBot).`; `Allow Paths (one per line)`; `Crawl Delay (Seconds, optional)`; `Deployment & Search Engine Verification`; `Disallow Paths (one per line)`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### screenshot-mockup

Source: `PrivKnife/src/app/tools/media/screenshot-mockup`. Route: `/tools/screenshot-mockup`.
- Existing edge-oriented tests: applies negative skew and positive pitch for isometric-left preset; applies positive skew and negative pitch for isometric-right preset; guarantees zero network calls during preset loading, customizing, and exports (Privacy Guard).
- Unchanged rendered EN/ES text to review: `Device & Perspective Angle`; `Drag & drop your files here`; `Export Canvas Size & Aspect Ratio`; `Interactive Device Viewport`; `Lighting, Shadows & Export`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### seamless-texture-generator

Source: `PrivKnife/src/app/tools/media/seamless-texture-generator`. Route: `/tools/seamless-texture-generator`.
- Existing edge-oriented tests: should blend edges with poisson_blend without NaN or infinite values; should compute valid RGB normal map with blue-dominant neutral normals; should handle invalid or zero-dimension input gracefully; should set errorMessage and not load sample brick texture when file decoding fails.
- Unchanged rendered EN/ES text to review: `128 × 128 px (Fast preview)`; `256 × 256 px (Standard tile)`; `64 × 64 px (Icon / Low-poly)`; `Download Texture Pack (.zip)`; `Invert Normal Y (DirectX standard)`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### skadis-pegboard-maker

Source: `PrivKnife/src/app/tools/3d/skadis-pegboard-maker`. Route: `/tools/skadis-pegboard-maker`.
- Existing edge-oriented tests: should reject null or undefined options; should reject hook length less than 10mm or greater than 250mm; should reject extreme hook angles outside -10 to 45 degrees; should reject invalid bracket width or tool diameter; should return failure with descriptive error on invalid input.
- Unchanged rendered EN/ES text to review: `Binary .STL (Print-Bed Orientation)`; `Faceplate Width: 24 mm(≥60mm creates dual-column prongs)`; `IKEA Skådis (5×15mm Oval Slots)`; `Include Anti-Slip Locking Wedge Clip (Locks hook firmly into Skådis slot)`; `Infill: 30-40% gyroid or grid infill provides excellent impact and bend resistance.`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### soundwave-art-maker

Source: `PrivKnife/src/app/tools/audio-video/soundwave-art-maker`. Route: `/tools/soundwave-art-maker`.
- Existing edge-oriented tests: handles empty or silent buffers with gentle minimum ambient bars; returns null for invalid non-Spotify links; exports a valid non-empty application/pdf Blob; guarantees zero network calls during generation and downloads (Privacy Guard).
- Unchanged rendered EN/ES text to review: `1. Audio Source & Voice Recording`; `2. Waveform & Design Customization`; `3. Typography & Spotify Code`; `4. 3D Print Settings (Dual-Color Plaque / Keychain)`; `Can’t Help Falling in Love`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### subtitles-shifter

Source: `PrivKnife/src/app/tools/media/subtitles-shifter`. Route: `/tools/subtitles-shifter`.
- Existing edge-oriented tests: should clamp negative milliseconds to 00:00:00; should parse, shift, and export subtitles with ZERO network calls (Privacy Verification).
- Unchanged rendered EN/ES text to review: `#	Original Timing	Re-Synced Timing	Subtitle Text`; `1	00:00:01,000 → 00:00:04,250	00:00:01,000 → 00:00:04,250	Welcome to PrivKnife!`; `2	00:00:05,000 → 00:00:08,750	00:00:05,000 → 00:00:08,750	No servers. No data tracking.`; `23.976 fps → 25 fps (Film to PAL)`; `25 fps → 23.976 fps (PAL to Film)`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### svg-optimizer-cleaner

Source: `PrivKnife/src/app/tools/dev/svg-optimizer-cleaner`. Route: `/tools/svg-optimizer-cleaner`.
- Existing edge-oriented tests: should fail on empty or non-svg string; should handle boundary precision values (0 to 5); should gracefully handle invalid SVG input with an error result.
- Unchanged rendered EN/ES text to review: `Collapse Redundant Groups (<g>)`; `Compact Colors to Short Hex`; `Coordinate Precision (Decimal Places)`; `Make Responsive (Remove width/height for viewBox)`; `Paste or upload an SVG to view real-time optimization and export code.`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### table-tent-maker

Source: `PrivKnife/src/app/tools/documents/table-tent-maker`. Route: `/tools/table-tent-maker`.
- Existing edge-oriented tests: should execute processing with ZERO network requests (Privacy Verification).
- Unchanged rendered EN/ES text to review: `3. Sign Content & Messaging`; `5. Print Marks & Element Toggles`; `Body Text / Instructions / Wi-Fi Details`; `Include Table Number Pill Badge`; `Mirror Front Face to Back Face`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### under-desk-clamp-generator

Source: `PrivKnife/src/app/tools/3d/under-desk-clamp-generator`. Route: `/tools/under-desk-clamp-generator`.
- Existing edge-oriented tests: should reject null or undefined options; should reject desk thickness less than 8mm or exceeding 150mm; should reject clamp gap smaller than desk thickness + 5mm; should reject frame thickness below 6mm; should reject invalid screw diameter or pitch; should handle all 4 accessory types without error.
- Unchanged rendered EN/ES text to review: `Binary .STL (Combined Bed Layout)`; `Clamp Opening Jaw Gap: 45 mm(Must exceed desk thickness by ≥5mm)`; `Desk Thickness: 25 mm(Actual desktop thickness)`; `Headphone Hook: Smooth curved lip prevents headband indentation and slippage.`; `Include Swivel Foot Pad (Protects desk surface & distributes clamping force)`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### video-compressor-resizer

Source: `PrivKnife/src/app/tools/audio-video/video-compressor-resizer`. Route: `/tools/video-compressor-resizer`.
- Existing edge-oriented tests: should reject non-positive duration; should reject invalid custom size when custom_mb preset is chosen; should reject non-positive source dimensions; should return error when options are invalid; should create component with default signals and empty state; should maintain ZERO network exfiltration during entire workflow.
- Unchanged rendered EN/ES text to review: `1080p Full HD (Sharper, higher bitrate needed)`; `16:9 Landscape (YouTube Standard)`; `1:1 Square (Instagram Feed Post)`; `360p Low (Ultra compact for tiny byte budgets)`; `480p SD (Compact, great for small file targets)`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### video-gif-trimmer

Source: `PrivKnife/src/app/tools/audio-video/video-gif-trimmer`. Route: `/tools/video-to-gif`.
- Existing edge-oriented tests: initializes with default trimmer configuration in empty state; guarantees zero network calls during video loading, trimming, and exports (Privacy Guard).
- Unchanged rendered EN/ES text to review: `Drag & drop your files here`; `or click to browse from your device`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

### web-vitals

Source: `PrivKnife/src/app/tools/dev/web-vitals`. Route: `/tools/web-vitals`.
- Existing edge-oriented tests: handles PageSpeed API errors with descriptive exceptions; maintains 100% privacy with zero telemetry or tracking requests; validates invalid URL inputs and shows error banner.
- Unchanged rendered EN/ES text to review: `Audited Target:https://privknife.orgMOBILE`; `Core Web Vitals Assessment (Field / Lab Diagnostics)`; `Cumulative Layout Shift • Target ≤ 0.1`; `Ensure text remains visible during webfont load`; `First Contentful Paint • Target ≤ 1.8s`.
- Required completion: exercise valid input → configure → preview → export → independently reopen/validate output → reset/repeat, in both languages and viewport sizes. Test malformed/empty input, boundary limits, cancellation, repeated operations and resource cleanup.

## Acceptance gates still required

1. **Documents:** encrypted/truncated PDFs, rotated pages, page ranges, Unicode fonts, page dimensions, redaction irreversibility via text/image extraction, signatures, print pagination. Independently parse every exported PDF and verify content.
2. **Images/media:** corrupt MIME-disguised files, orientation, alpha, huge dimensions, batch failures, supported HEIC/AVIF codecs, output decoding, metadata removal, before/after pixel and dimension checks.
3. **Audio/video:** zero-length and unsupported codecs, trim bounds, variable frame rate, duration/sync, cancellation, memory limits, >100MB streaming/chunking, independent playback of output.
4. **3D:** minimum/maximum/negative dimensions, empty text, accented Spanish, mesh NaNs, watertightness, dimensions and units, independent STL/3MF parsing, stress performance, worker progress and disposal.
5. **Text/dev/data:** empty/malformed CSV, quotes/newlines, delimiters, Unicode, formula injection, invalid dates/timezones, locale decimal separators, malicious SVG/HTML, known cryptographic vectors and export round trips.
6. **Privacy/security:** real browser request monitoring during processing, sanitize untrusted rendered HTML/SVG, inspect production CSP headers, verify workers and object URLs are released after reset/navigation.
7. **Localization:** change language through the visible selector without reload, persist choice, errors/help/output localization, no raw translation keys, verify long Spanish labels at 320px.
8. **Coverage:** deterministic clean-install CI run; all tools and workers included; all four metrics 100% per file; inspect assertions and boundary partitions because even 100% coverage cannot prove every possible edge case.

## Reproduction

From `PrivKnife/`: `npm test -- --watch=false`; `npm run build`. Audit coverage: `npm test -- --watch=false --coverage --runner-config=audit-vitest.config.mjs` after installing a compatible provider. Browser harness: `node audit-run.mjs` (requires localhost:4200 and /usr/bin/chromium). The harness only opens pages; it does not drive full workflows.

## Final browser accounting

236 unique combinations now have completed DOM captures, including the four lamp designer combinations rechecked in isolation. No document-level horizontal overflow was detected in successful captures. The audit baseline found 14 tool routes with ad-slot elements; Spec 93 subsequently verified all 59 tool routes in English and Spanish at 390px, plus the 14 affected routes in English and Spanish at 1440px, with no advertising elements or placeholder copy. Earlier connection refusals and timeouts remain in the historical evidence; their cause was not established and they did not recur in the isolated lamp recheck.

### Lamp designer follow-up — four previously blocked checks

| Language | Viewport | Capture duration | Page errors / failed requests | Horizontal overflow | Ad slots |
|---|---|---|---|---|---|
| English | 390×900 | 1.512 s | 0 / 0 | None | None |
| English | 1440×900 | 1.694 s | 0 / 0 | None | None |
| Spanish | 390×900 | 1.497 s | 0 / 0 | None | None |
| Spanish | 1440×900 | 1.681 s | 0 / 0 | None | None |

The recheck used a fresh Chromium instance per combination, DOM readiness followed by network-idle waiting, and full-page screenshots. Durations include readiness checks and screenshots, not standardized performance measurements. All four captures had a populated canvas and the expected document language. Visual inspection of the English desktop and Spanish mobile screenshots confirms a rendered lamp preview and responsive stacking.

**Confirmed localization defect in both languages:** three preset buttons show `tools.parametricLampDesigner.presets.empire`, `tools.parametricLampDesigner.presets.ripple`, and `tools.parametricLampDesigner.presets.vase`. Add or correct these dictionary entries and test every rendered preset label in English and Spanish. The rest of the visible Spanish controls largely translate, but this defect prevents localization sign-off.

Evidence: [recheck JSON](audit-evidence/lamp-recheck.json), [execution log](audit-evidence/lamp-recheck.log), [English mobile](audit-evidence/lamp-en-390.png), [English desktop](audit-evidence/lamp-en-1440.png), [Spanish mobile](audit-evidence/lamp-es-390.png), [Spanish desktop](audit-evidence/lamp-es-1440.png). Reproduce from `PrivKnife/` with `node audit-lamp.mjs`.

These four page-load checks are now complete; they do not certify STL/3MF output correctness, all parameter combinations, touch gestures, or physical-phone compatibility. The earlier functional acceptance backlog remains applicable.

Early invoice localStorage exceptions originated from the audit language-injection script running inside restricted frames, not the app. The harness was subsequently corrected.

## Spec 94 re-audit — current disposition (2026-11-13)

This section supersedes the baseline Web Vitals, DNS/WHOIS, sanitizer, CSP and browser-route status above. Detailed implementation and evidence are in [Spec 94](specs/94%20-%20Audit%20Remediation%20-%20Privacy%20Containment%20and%20Resource%20Safety/spec.md) and its [evidence report](specs/94%20-%20Audit%20Remediation%20-%20Privacy%20Containment%20and%20Resource%20Safety/evidence.md).

- **PageSpeed:** the Google PageSpeed request path is removed. The bookmarked Web Vitals route now explains the unavailable external audit and is excluded from the private tool catalog.
- **DNS/WHOIS:** the WHOIS proxy was removed. Direct DNS-over-HTTPS is limited to four documented resolvers behind explicit consent; requests carry only the entered domain and record type.
- **Markup and CSP:** DOMPurify is used before trusted HTML/SVG preview rendering. CSP is configured for the local production preview and supported deployment files. Deployed response headers remain unverified because `privknife.com` did not resolve during the live header check.
- **Route smoke:** all 58 canonical tool routes pass in Chromium at 390px and 1440px in English and Spanish, with no detected route errors, failed requests, horizontal overflow, ad slots or raw translation keys. This does not certify physical devices or every tool’s complete workflow.
- **Worker/resource audit:** static ownership checks pass and missing worker error paths were repaired. Reset/navigation resource baselines and UI-thread task timings remain unmeasured across all applicable tools.
- **Test coverage:** 1,730 tests pass across 139 test files, and the manifest includes 143 executable tool files. Aggregate coverage remains 76.26% statements, 59.61% branches, 54.83% functions and 78.98% lines; only 1 of 143 files reaches 100% in all four metrics.
- **Initial JavaScript:** production build succeeds, but raw initial JavaScript measures 352,369 bytes against the 200,000-byte Spec 94 limit. The separate transfer estimate is 105.77 kB and does not satisfy the raw-byte gate.

**Spec 94 is not complete.** AC-94-04 remains unverified and AC-94-05 fails. See the evidence report for logs, scope limits and required next decisions. Do not treat route-load smoke or aggregate test success as full tool workflow acceptance.
