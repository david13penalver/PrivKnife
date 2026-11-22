# Spec 141 · Documents and Privacy Output Verification

**Prerequisites** · [135](../135%20-%20Spec%20115%20Audit%20Remediation%20-%20Reproducible%20Audit%20Baseline%20and%20Browser%20Workflows/spec.md), [136](../136%20-%20Spec%20115%20Audit%20Remediation%20-%20Priority%20Export%20Regressions%20and%20Startup%20Budget/spec.md), [137](../137%20-%20Spec%20115%20Audit%20Remediation%20-%20PDF%20Cropper%20and%20Watermark%20Worker%20Lifecycle/spec.md), [139](../139%20-%20Spec%20115%20Audit%20Remediation%20-%20Responsive%20and%20Accessible%20Tool%20Workflows/spec.md), [140](../140%20-%20Spec%20115%20Audit%20Remediation%20-%20Angular%20View%20Models%20and%20Canonical%20Tool%20Metadata/spec.md)

## Scope

Turn the 28 document and privacy acceptance checks into executable browser workflows and independent artifact checks. Keep private inputs, hashes and outputs on the device.

## Acceptance criteria

### AC1. Validate successful output independently

Drive the route using its normal upload or sample, preview and output controls. Reopen PDFs with an independent parser or renderer, inspect metadata using a separate inspector, and read DOCX, archive, barcode and tabular output with independent consumers where applicable. Assert semantic values, page geometry and ordering.

### AC2. Exercise errors and recovery

Use rotated PDFs, synthetic encrypted and truncated files and a valid replacement. Cover empty and multi-chunk hash and encryption fixtures, compare published hash vectors, change the password, cancel and retry. Verify wrong passwords produce no plaintext download.

### AC3. Check preview and export agreement

Exercise rotated-page placement, pages with long or multilingual content and relevant option changes. Capture resource cleanup after failure, reset and navigation. Reuse the focused regression evidence from Specs 136 and 137 for identical cases.

## Tool acceptance checklist

| Original spec | Canonical URL | Required workflow and independent check |
|---|---|---|
| 01 | [`/tools/exif-stripper`](../../PrivKnife/src/app/tools/privacy/exif-stripper) | Strip GPS from a rotated JPEG and independently inspect tags and orientation. |
| 02 | [`/tools/crypto-hash-uuid`](../../PrivKnife/src/app/tools/privacy/crypto-hash-uuid) | Compare empty and multi-chunk digests against published vectors. |
| 04 | [`/tools/pdf-merger-splitter`](../../PrivKnife/src/app/tools/documents/pdf-merger) | Reopen a reordered PDF with duplicate and rotated pages and compare page contents. |
| 05 | [`/tools/pdf-redaction`](../../PrivKnife/src/app/tools/privacy/pdf-redaction) | Force rendering failure and require export to stop before any download. |
| 06 | [`/tools/invoice-maker`](../../PrivKnife/src/app/tools/documents/invoice-maker) | Reopen an invoice with long line items and verify page breaks and totals. |
| 07 | [`/tools/grid-paper`](../../PrivKnife/src/app/tools/documents/grid-paper) | Measure grid spacing and margins in the exported A4 at actual print size. |
| 08 | [`/tools/barcode-labels`](../../PrivKnife/src/app/tools/documents/barcode-labels) | Decode the last barcode on a partially filled label sheet at print resolution. |
| 09 | [`/tools/table-tent-maker`](../../PrivKnife/src/app/tools/documents/table-tent-maker) | Print a duplex tent with long names and check fold alignment and reading direction. |
| 19 | [`/tools/markdown-cheatsheet`](../../PrivKnife/src/app/tools/documents/markdown-cheatsheet) | Reopen a multi-page export and check a code block spanning a page break. |
| 45 | [`/tools/pdf-signer-stamper`](../../PrivKnife/src/app/tools/documents/pdf-signer-stamper) | Render a signed rotated page and compare the stamp position with the touch preview. |
| 46 | [`/tools/face-plate-blur`](../../PrivKnife/src/app/tools/privacy/face-plate-blur) | Compare blurred pixels at image edges after scaling the phone preview. |
| 47 | [`/tools/local-ocr-text-extractor`](../../PrivKnife/src/app/tools/documents/local-ocr-text-extractor) | Upload a blank PNG and a unique-word image and compare recovered text. |
| 48 | [`/tools/file-encryptor-vault`](../../PrivKnife/src/app/tools/privacy/file-encryptor-vault) | Round-trip a multi-chunk file and require wrong-password failure without output. |
| 49 | [`/tools/pii-scrubber-anonymizer`](../../PrivKnife/src/app/tools/privacy/pii-scrubber-anonymizer) | Verify redaction across quoted CSV fields and check for unintended replacements. |
| 53 | [`/tools/nutrition-label-maker`](../../PrivKnife/src/app/tools/documents/nutrition-label-maker) | Check rounding at a serving-size boundary in both unit systems. |
| 58 | [`/tools/floor-plan-furniture-scaler`](../../PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler) | Measure a known length after calibration, zoom and screen rotation. |
| 59 | [`/tools/emergency-recovery-kit`](../../PrivKnife/src/app/tools/privacy/emergency-recovery-kit) | Reopen a multi-page recovery sheet and verify long secrets remain legible. |
| 103 | [`/tools/pdf-compressor`](../../PrivKnife/src/app/tools/documents/pdf-compressor) | Render a compressed mixed text/image PDF and compare page count and legibility. |
| 104 | [`/tools/pdf-watermark-numbering`](../../PrivKnife/src/app/tools/documents/pdf-watermark-numbering) | Verify Bates numbers on rotated pages after changing the start number. |
| 105 | [`/tools/pdf-image-converter`](../../PrivKnife/src/app/tools/documents/pdf-image-converter) | Round-trip transparent and rotated images through PDF and compare dimensions. |
| 106 | [`/tools/pdf-password-security`](../../PrivKnife/src/app/tools/documents/pdf-password-security) | Open output with a second PDF reader and test both correct and wrong passwords. |
| 107 | [`/tools/pdf-cropper-booklet`](../../PrivKnife/src/app/tools/documents/pdf-cropper-booklet) | Reset mid-job, start another document and verify only the new job can finish. |
| 108 | [`/tools/pdf-form-studio`](../../PrivKnife/src/app/tools/documents/pdf-form-studio) | Flatten multiline and checkbox fields and verify values in an independent renderer. |
| 109 | [`/tools/pdf-visual-compare`](../../PrivKnife/src/app/tools/documents/pdf-visual-compare) | Compare identical pages plus one shifted mark and verify the reported difference. |
| 110 | [`/tools/pdf-table-extractor`](../../PrivKnife/src/app/tools/documents/pdf-table-extractor) | Parse exported cells from a merged, multi-page table with empty columns. |
| 111 | [`/tools/pdf-to-word-markdown`](../../PrivKnife/src/app/tools/documents/pdf-to-word-markdown) | Reopen DOCX from a two-column fixture and verify heading order and paragraphs. |
| 112 | [`/tools/office-html-to-pdf`](../../PrivKnife/src/app/tools/documents/office-html-to-pdf) | Render an Office fixture with an embedded image and verify pagination. |
| 113 | [`/tools/pdf-repair-metadata`](../../PrivKnife/src/app/tools/documents/pdf-repair-metadata) | Run an independent PDF/A validator on every advertised archive profile. |

## References

- [Spec 115 tool audit](../../SPEC_115_TOOL_AUDIT.md)
- [Remediation roadmap](../SPEC_115_REMEDIATION_ROADMAP.md)
- Earlier remediation specs [94](../94%20-%20Audit%20Remediation%20-%20Privacy%20Containment%20and%20Resource%20Safety/spec.md), [97](../97%20-%20Audit%20Remediation%20-%20Documents%20and%20Privacy%20Functional%20Validation/spec.md)
- [Implementation plan](plan.md) and [task checklist](tasks.md)
