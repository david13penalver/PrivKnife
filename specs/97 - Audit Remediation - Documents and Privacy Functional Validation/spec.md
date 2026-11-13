# Spec 97: Audit Remediation - Documents and Privacy Functional Validation

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
4. Independently parse exported PDFs: pages/order/rotation/dimensions, embedded Unicode text, invoice totals, labels/barcodes, calendar-independent document layout and print pagination.
5. For redaction, verify sensitive text and pixels are irrecoverable through extraction and rendering, not merely hidden by overlays. Test signatures/stamps on rotated/cropped pages and encrypted/truncated inputs.
6. For hashing/encryption use published known-answer fixtures, authenticated round trips, wrong-key/tamper/truncation rejection and no plaintext leakage in logs/storage. Check PII scrubber false positives/negatives against explicit policies.
7. For OCR, blur, recovery kits and floor plans verify real recognized text, permanently altered pixels, accurate sensitive-content output and measurement/scale semantics as applicable.
8. Repair confirmed defects with meaningful regression assertions. Coordinate translations with 95 and layout fixes with 96; do not claim completion from test descriptions or mocked downloads.

## Acceptance criteria

- **AC-97-01:** Every listed tool has a completed supported-format workflow and boundary-case report; no placeholder implementation passes.
- **AC-97-02:** Downloaded output is validated independently rather than by existence/nonzero bytes alone; clipboard content is checked with success/denial recovery.
- **AC-97-03:** No unhandled errors, private-data network requests, leaked resources or silent batch failures occur. Inapplicable cases have explicit reasons.
- **AC-97-04:** Every confirmed defect has a passing regression case and rerun evidence; unresolved blockers prevent spec completion.

## Constraints and scope boundaries

All processing remains client-side with zero telemetry or ingestion. Preserve Angular standalone/lazy loading, Signals, typed forms, BEM/SASS conventions and cleanup requirements from AGENTS.md. No production implementation is performed by this documentation change. Existing specs remain design references; historical “ready”/“complete” labels are not evidence that the current audit gates pass.

Full linguistic certification beyond English/Spanish is deferred. Real-device or unavailable-codec checks must be recorded as blocked, never inferred from Chromium emulation. Workflows and fixtures must stay local.

## Explicit tool scope

- `barcode-labels` — `PrivKnife/src/app/tools/documents/barcode-labels`
- `crypto-hash-uuid` — `PrivKnife/src/app/tools/privacy/crypto-hash-uuid`
- `emergency-recovery-kit` — `PrivKnife/src/app/tools/privacy/emergency-recovery-kit`
- `exif-stripper` — `PrivKnife/src/app/tools/privacy/exif-stripper`
- `face-plate-blur` — `PrivKnife/src/app/tools/privacy/face-plate-blur`
- `file-encryptor-vault` — `PrivKnife/src/app/tools/privacy/file-encryptor-vault`
- `floor-plan-furniture-scaler` — `PrivKnife/src/app/tools/documents/floor-plan-furniture-scaler`
- `grid-paper` — `PrivKnife/src/app/tools/documents/grid-paper`
- `invoice-maker` — `PrivKnife/src/app/tools/documents/invoice-maker`
- `local-ocr-text-extractor` — `PrivKnife/src/app/tools/documents/local-ocr-text-extractor`
- `markdown-cheatsheet` — `PrivKnife/src/app/tools/documents/markdown-cheatsheet`
- `nutrition-label-maker` — `PrivKnife/src/app/tools/documents/nutrition-label-maker`
- `pdf-merger` — `PrivKnife/src/app/tools/documents/pdf-merger`
- `pdf-redaction` — `PrivKnife/src/app/tools/privacy/pdf-redaction`
- `pdf-signer-stamper` — `PrivKnife/src/app/tools/documents/pdf-signer-stamper`
- `pii-scrubber-anonymizer` — `PrivKnife/src/app/tools/privacy/pii-scrubber-anonymizer`
- `table-tent-maker` — `PrivKnife/src/app/tools/documents/table-tent-maker`
