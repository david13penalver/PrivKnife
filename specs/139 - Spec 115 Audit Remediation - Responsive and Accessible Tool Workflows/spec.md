# Spec 139 · Responsive and Accessible Tool Workflows

**Prerequisites** · [135](../135%20-%20Spec%20115%20Audit%20Remediation%20-%20Reproducible%20Audit%20Baseline%20and%20Browser%20Workflows/spec.md), [138](../138%20-%20Spec%20115%20Audit%20Remediation%20-%20Regex%20Runner%20Supersession%20and%20Touch%20Export/spec.md)

## Scope

Verify the shared shell and all 72 audited routes at 320 and 390 CSS pixels with separate English and Spanish sessions. Prioritize the 16 historical overflow routes and make the primary workflows reachable with touch, keyboard, zoom and assistive technology.

## Acceptance criteria

### AC1. Fix historical overflow first

Correct overflowing editors, PDF action rows and long labels using the existing layout and BEM system. Put content that requires horizontal scrolling inside labeled, keyboard-reachable regions. Recheck affected states after a sample or file load and when results render.

### AC2. Fix target sizing and shared behaviors

Start with shared navigation controls, then check primary tool actions and compact toolbar controls. Verify actual hit areas are at least 44 × 44 CSS pixels as required by Spec 96. Reuse the shared picker, button, progress and preview patterns where their behavior fits. Preserve existing behavior through adapters where necessary.

### AC3. Run the complete locale and viewport matrix

Use isolated locale storage and touch-enabled 320 × 844 and 390 × 844 CSS viewports. For all 72 routes record the heading, page width, controls and uncaught errors in all 288 initial combinations. Repeat relevant workflows in sample, loaded, processing, result and error states, including Grid Paper preview, five previously overflowing PDF samples, regex Matches, OCR and the retired notice.

### AC4. Verify physical and assistive workflows

On a physical phone open and dismiss the software keyboard, rotate during a job, dismiss a dialog, and retry with a second fixture. Check reachability, focus return, live progress/error announcements, and removal of stale output. Test keyboard-only navigation and a real screen reader for the shared shell and representative upload, editor and 3D workflows. Record device, browser and assistive technology.

### AC5. Verify localized status and errors

Check accessible names, live regions and actionable messages in English and Spanish. Exercise upload, progress, error, export and retry; record unexecuted physical or assistive checks as pending.

## Historical overflow reproductions

Values are excess document width in CSS pixels reported by the audit. Reproduce each affected workflow and verify zero document overflow at both widths and in both locales.

| Original spec | Canonical URL | EN 320 | ES 320 | EN 390 | ES 390 |
|---|---|---:|---:|---:|---:|
| 10 | `/tools/batch-image-compressor` | 14 | 14 | 0 | 0 |
| 11 | `/tools/favicon-app-icon-suite` | 34 | 34 | 0 | 0 |
| 114 | `/tools/json-sql-formatter` | 173 | 148 | 103 | 79 |
| 32 | `/tools/lithophane-maker` | 0 | 39 | 0 | 0 |
| 112 | `/tools/office-html-to-pdf` | 0 | 7 | 0 | 0 |
| 103 | `/tools/pdf-compressor` | 124 | 108 | 54 | 39 |
| 107 | `/tools/pdf-cropper-booklet` | 75 | 180 | 5 | 111 |
| 108 | `/tools/pdf-form-studio` | 80 | 133 | 10 | 63 |
| 105 | `/tools/pdf-image-converter` | 17 | 51 | 0 | 0 |
| 113 | `/tools/pdf-repair-metadata` | 107 | 82 | 37 | 12 |
| 110 | `/tools/pdf-table-extractor` | 45 | 70 | 0 | 0 |
| 111 | `/tools/pdf-to-word-markdown` | 62 | 57 | 0 | 0 |
| 109 | `/tools/pdf-visual-compare` | 11 | 31 | 0 | 0 |
| 104 | `/tools/pdf-watermark-numbering` | 99 | 196 | 30 | 126 |
| 115 | `/tools/regex-tester-debugger` | 83 | 83 | 14 | 14 |
| 18 | `/tools/robots-sitemap-builder` | 24 | 24 | 0 | 0 |

## References

- [Spec 115 tool audit](../../SPEC_115_TOOL_AUDIT.md)
- [Remediation roadmap](../SPEC_115_REMEDIATION_ROADMAP.md)
- Earlier remediation specs [95](../95%20-%20Audit%20Remediation%20-%20Complete%20English%20and%20Spanish%20Localization/spec.md), [96](../96%20-%20Audit%20Remediation%20-%20Responsive%20and%20Accessible%20Tool%20Workflows/spec.md)
- [Implementation plan](plan.md) and [task checklist](tasks.md)
