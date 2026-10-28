# Remediation Tasks — SVG Optimizer, Path Cleaner & React/Vue Exporter

> **Spec ID**: `84`  
> **Remediates Tool**: `54 - SVG Optimizer, Path Cleaner & React_Vue Exporter` (`/tools/svg-optimizer-cleaner`)

---

## Phase 1: DOM Security Sanitization & Engine ID/Group Cleanup (Seam 1 & 2 — Red → Green)
- [x] **Task 1.1 (Red — SVG XSS Sanitization Tests)**: Add unit tests in `src/app/tools/dev/svg-optimizer-cleaner/engine.spec.ts` and `svg-optimizer-cleaner.component.spec.ts` asserting that `<script>`, `<foreignObject>`, `on*` event attributes (`onload`, `onclick`), and `javascript:` URLs are stripped from `optimizeSvg()`, `safeOriginalSvg()`, and `safeOptimizedSvg()` (`DEFECT-54-01`).
- [x] **Task 1.2 (Green — Implement `sanitizeSvgMarkup` & Wire to Component)**: Implement `sanitizeSvgMarkup()` in `src/app/tools/dev/svg-optimizer-cleaner/engine.ts` and apply it in `optimizeSvg()` and in `safeOriginalSvg` / `safeOptimizedSvg` in `svg-optimizer-cleaner.component.ts` before `bypassSecurityTrustHtml()` (`DEFECT-54-01`).
- [x] **Task 1.3 (Red — Unreferenced Group ID Cleanup Test)**: Add a unit test in `engine.spec.ts` verifying `optimizeSvg(SAMPLE_BLOATED_SVG, DEFAULT_SVG_OPTIONS)` removes unreferenced `OuterGroup` and `InnerUselessGroup` IDs and collapses their `<g>` elements while preserving referenced `<defs>` IDs (`DEFECT-54-03`).
- [x] **Task 1.4 (Green — Strip Unreferenced IDs in `cleanEditorAttributes`)**: Update `cleanEditorAttributes()` in `engine.ts` to remove any `id` attribute not referenced via `url(#id)` or `href="#id"` when `cleanupIds` is `true` (`DEFECT-54-03`).

## Phase 2: Mobile Adaptation, Touch Targets, BEM Classes & Dark Mode (Seam 3)
- [x] **Task 2.1 (Fix 390px & 320px Horizontal Overflow)**: Add `min-width: 0` on `.l-columns__area`, `overflow-wrap: anywhere` on `.c-header__title`, and `flex-wrap: wrap; gap: 0.5rem` on `.c-card__header.l-extremo` and `.stats-banner` in `svg-optimizer-cleaner.component.ts` (`DEFECT-54-02`).
- [x] **Task 2.2 (Touch Targets, BEM Aliases & Dark Mode Variables)**: Style `.c-input__field` with `min-height: 38px; font-size: 1rem`, `.c-input__range` with `height: 24px`, `.c-checkbox-label` with `min-height: 36px`, add `.c-svg-optimizer__*` BEM classes, and replace hardcoded `#fafafa`/`#e2e8f0` colors with CSS custom properties (`DEFECT-54-02`, `DEFECT-54-04`).

## Phase 3: Verification & Regression Gate
- [x] **Task 3.1**: Run `npx vitest run src/app/tools/dev/svg-optimizer-cleaner/` and verify 100% test pass.
- [x] **Task 3.2**: Run `npm run build` and verify zero compilation errors.
- [x] **Task 3.3**: Run `node $SCRATCH/audit.mjs svg-optimizer-cleaner` and verify 0 console/page errors, 0 external network requests, `hasHorizontalScroll: false` at `1366px`, `390px`, and `320px`, and valid `.svg`, `.tsx`, `.vue`, `.svelte`, and `.txt` downloads.
