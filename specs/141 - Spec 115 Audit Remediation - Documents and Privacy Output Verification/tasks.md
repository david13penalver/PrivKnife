# Spec 141 · Tasks

[Acceptance criteria](spec.md) · [Implementation plan](plan.md)

- [ ] Record the starting revision, prerequisites and current reproduction.
- [ ] AC1 · Validate successful output independently and attach the corresponding verification evidence.
- [ ] AC2 · Exercise errors and recovery and attach the corresponding verification evidence.
- [ ] AC3 · Check preview and export agreement and attach the corresponding verification evidence.

## Route evidence

- [ ] 01 `/tools/exif-stripper` · Strip GPS from a rotated JPEG and independently inspect tags and orientation.
- [ ] 02 `/tools/crypto-hash-uuid` · Compare empty and multi-chunk digests against published vectors.
- [ ] 04 `/tools/pdf-merger-splitter` · Reopen a reordered PDF with duplicate and rotated pages and compare page contents.
- [ ] 05 `/tools/pdf-redaction` · Force rendering failure and require export to stop before any download.
- [ ] 06 `/tools/invoice-maker` · Reopen an invoice with long line items and verify page breaks and totals.
- [ ] 07 `/tools/grid-paper` · Measure grid spacing and margins in the exported A4 at actual print size.
- [ ] 08 `/tools/barcode-labels` · Decode the last barcode on a partially filled label sheet at print resolution.
- [ ] 09 `/tools/table-tent-maker` · Print a duplex tent with long names and check fold alignment and reading direction.
- [ ] 19 `/tools/markdown-cheatsheet` · Reopen a multi-page export and check a code block spanning a page break.
- [ ] 45 `/tools/pdf-signer-stamper` · Render a signed rotated page and compare the stamp position with the touch preview.
- [ ] 46 `/tools/face-plate-blur` · Compare blurred pixels at image edges after scaling the phone preview.
- [ ] 47 `/tools/local-ocr-text-extractor` · Upload a blank PNG and a unique-word image and compare recovered text.
- [ ] 48 `/tools/file-encryptor-vault` · Round-trip a multi-chunk file and require wrong-password failure without output.
- [ ] 49 `/tools/pii-scrubber-anonymizer` · Verify redaction across quoted CSV fields and check for unintended replacements.
- [ ] 53 `/tools/nutrition-label-maker` · Check rounding at a serving-size boundary in both unit systems.
- [ ] 58 `/tools/floor-plan-furniture-scaler` · Measure a known length after calibration, zoom and screen rotation.
- [ ] 59 `/tools/emergency-recovery-kit` · Reopen a multi-page recovery sheet and verify long secrets remain legible.
- [ ] 103 `/tools/pdf-compressor` · Render a compressed mixed text/image PDF and compare page count and legibility.
- [ ] 104 `/tools/pdf-watermark-numbering` · Verify Bates numbers on rotated pages after changing the start number.
- [ ] 105 `/tools/pdf-image-converter` · Round-trip transparent and rotated images through PDF and compare dimensions.
- [ ] 106 `/tools/pdf-password-security` · Open output with a second PDF reader and test both correct and wrong passwords.
- [ ] 107 `/tools/pdf-cropper-booklet` · Reset mid-job, start another document and verify only the new job can finish.
- [ ] 108 `/tools/pdf-form-studio` · Flatten multiline and checkbox fields and verify values in an independent renderer.
- [ ] 109 `/tools/pdf-visual-compare` · Compare identical pages plus one shifted mark and verify the reported difference.
- [ ] 110 `/tools/pdf-table-extractor` · Parse exported cells from a merged, multi-page table with empty columns.
- [ ] 111 `/tools/pdf-to-word-markdown` · Reopen DOCX from a two-column fixture and verify heading order and paragraphs.
- [ ] 112 `/tools/office-html-to-pdf` · Render an Office fixture with an embedded image and verify pagination.
- [ ] 113 `/tools/pdf-repair-metadata` · Run an independent PDF/A validator on every advertised archive profile.

## Close the spec

- [ ] Link exact commands, results and outstanding cases in the verification record.
- [ ] Run the applicable regression gates, update the roadmap status and commit with the repository’s Conventional Commits convention.
