# Spec 93: Audit Remediation - Remove Advertising Placeholders

- **Status:** Complete; see [evidence](evidence.md) and the Spec 93 commit in git history.
- **Source:** [Application audit](../../APPLICATION_AUDIT_2026-11-13.md), including the completed lamp follow-up.
- **Dependencies:** [92: Audit Remediation - Reliable Test and Browser Infrastructure](../92%20-%20Audit%20Remediation%20-%20Reliable%20Test%20and%20Browser%20Infrastructure/spec.md)
- **Companion documents:** [Plan](plan.md), [Tasks](tasks.md).

## Problem

The audit confirms ad-slot elements on 14 routes. Conditional modal placeholders may not appear in initial DOM captures.

## Requirements

1. Remove every advertising placeholder, reserved ad container, sponsor label and ad-only spacing from tool pages and conditional dialogs.
2. Delete orphaned ad styles and selectors while retaining unrelated content. Do not hide placeholders with CSS.
3. Cover all 59 canonical tools, home/shell and result/download dialogs in both languages; no advertising script or tracking dependency may be added.

## Acceptance criteria

- **AC-93-01:** No advertising markup or ad-only reserved space remains in source or reachable rendered states.
- **AC-93-02:** All 59 routes and affected download/result dialogs pass the browser ad assertion; responsive layouts remain usable.

## Constraints and scope boundaries

All processing remains client-side with zero telemetry or ingestion. Preserve Angular standalone/lazy loading, Signals, typed forms, BEM/SASS conventions and cleanup requirements from AGENTS.md. No production implementation is performed by this documentation change. Existing specs remain design references; historical “ready”/“complete” labels are not evidence that the current audit gates pass.

Full linguistic certification beyond English/Spanish is deferred. Real-device or unavailable-codec checks must be recorded as blocked, never inferred from Chromium emulation. Workflows and fixtures must stay local.

## Explicit tool scope

- `barcode-labels` — `PrivKnife/src/app/tools/documents/barcode-labels`
- `batch-compressor` — `PrivKnife/src/app/tools/media/batch-compressor`
- `calendar-linker` — `PrivKnife/src/app/tools/dev/calendar-linker`
- `color-palette-extractor` — `PrivKnife/src/app/tools/dev/color-palette-extractor`
- `email-signature-generator` — `PrivKnife/src/app/tools/dev/email-signature-generator`
- `favicon-generator` — `PrivKnife/src/app/tools/media/favicon-generator`
- `grid-paper` — `PrivKnife/src/app/tools/documents/grid-paper`
- `invoice-maker` — `PrivKnife/src/app/tools/documents/invoice-maker`
- `markdown-cheatsheet` — `PrivKnife/src/app/tools/documents/markdown-cheatsheet`
- `mesh-gradient-maker` — `PrivKnife/src/app/tools/dev/mesh-gradient-maker`
- `og-card-maker` — `PrivKnife/src/app/tools/media/og-card-maker`
- `robots-sitemap-builder` — `PrivKnife/src/app/tools/dev/robots-sitemap-builder`
- `subtitles-shifter` — `PrivKnife/src/app/tools/media/subtitles-shifter`
- `table-tent-maker` — `PrivKnife/src/app/tools/documents/table-tent-maker`
