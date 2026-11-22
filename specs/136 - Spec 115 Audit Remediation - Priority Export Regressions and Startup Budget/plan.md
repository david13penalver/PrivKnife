# Spec 136 · Implementation plan

[Acceptance criteria and prerequisites](spec.md) · [Task checklist](tasks.md)

## Work sequence

1. Run `qa/audit-115-browser.mjs` with the existing local tools documented in the priority-fix notes. Map each current assertion to this spec before making code changes.
2. Extend regression fixtures for rotated redaction and renderer failure after a successful job, OCR status across real worker phases and text agreement between preview and export, and WOFF2 layout retention. Inspect the downloads with Poppler, an annotation/object inspector, an independent text comparison, and the reference WOFF2 decoder as applicable.
3. Inspect the production entrypoint and lazy chunk graph around route metadata, localization and WOFF2. Run the raw budget gate and verify direct navigation and locale switching in the production preview. Record the measured budget, browser cases, resource loading and existing manual follow-ups.

## Verification

Run the applicable commands from `PrivKnife/`. `node qa/audit-115-browser.mjs`, independent decoder and PDF checks, `npm run build`, and `npm run qa:bundle-budget`.
