# Remediation Tasks — Bank Statement CSV / OFX to Excel & QIF Converter

> **Spec ID**: `80`  
> **Remediates Tool**: `50 - Bank Statement CSV _ OFX to Excel & QIF Converter` (`/tools/bank-statement-converter`)

---

## Phase 1: Engine & Algorithmic Remediation (Seam 1 — Red → Green)
- [ ] **Task 1.1 (Red — OFX Options Test)**: Add unit tests in `src/app/tools/dev/bank-statement-converter/engine.spec.ts` asserting `processBankStatement()` applies `cleanMerchantDescriptions`, `stripPosCodes`, and `invertAmountSigns` to OFX/QFX inputs (`DEFECT-50-02`).
- [ ] **Task 1.2 (Green — OFX Options Implementation)**: Update `parseOfxContent()` and `processBankStatement()` in `src/app/tools/dev/bank-statement-converter/engine.ts` to apply `cleanMerchantName()` and `invertAmountSigns` on OFX transactions (`DEFECT-50-02`).
- [ ] **Task 1.3 (Red — Chronological Summary & XLSX Formatted Text Tests)**: Add unit tests in `engine.spec.ts` verifying `calculateSummary()` orders `DD/MM/YYYY` and `MM/DD/YYYY` dates chronologically across months/years and that `processBankStatement()` populates `formattedText` when `exportFormat === 'xlsx'` (`DEFECT-50-03`, `DEFECT-50-04`).
- [ ] **Task 1.4 (Green — Chronological Date Comparator & XLSX Formatted Text)**: Implement chronological date comparison in `calculateSummary()` and assign `formattedText = buildCsvExport(transactions)` in the `'xlsx'` case of `processBankStatement()` (`DEFECT-50-03`, `DEFECT-50-04`).

## Phase 2: Memory Hygiene & Component UX Fixes (Seam 2 — Red → Green)
- [ ] **Task 2.1 (Red — File Selection Object URL Test)**: Add a unit test in `bank-statement-converter.component.spec.ts` asserting `handleFileSelected()` does not allocate an unused `URL.createObjectURL` (`DEFECT-50-05`).
- [ ] **Task 2.2 (Green — Remove Unused Object URL Allocation)**: Remove `URL.createObjectURL(file)` from `handleFileSelected()` in `bank-statement-converter.component.ts` (`DEFECT-50-05`).

## Phase 3: Mobile Adaptation, Light/Dark Theme Contrast & BEM Styling (Seam 3)
- [ ] **Task 3.1 (Fix 390px & 320px Horizontal Overflow & Summary Grid)**: Update component styles in `bank-statement-converter.component.ts` with `min-width: 0` on `.l-columns__area`, `overflow-wrap: anywhere` on `.c-header__title`, `flex-wrap: wrap` on `.c-card__header.l-extremo`, and `@media (max-width: 640px)` switching `.c-summary-row` to `repeat(2, 1fr)` (`DEFECT-50-01`).
- [ ] **Task 3.2 (Touch Targets, iOS Zoom & Dark Mode Variables)**: Set `min-height: 36px` on `.c-checkbox-label`, set `font-size: 1rem` on `.c-statement-textarea` on mobile, and replace hardcoded `#f8fafc`, `#0f172a`, and `#f1f5f9` colors with CSS custom properties (`DEFECT-50-01`).

## Phase 4: Verification & Regression Gate
- [ ] **Task 4.1**: Run `npx vitest run src/app/tools/dev/bank-statement-converter/` and verify 100% test pass.
- [ ] **Task 4.2**: Run `npm run build` and verify zero compilation errors.
- [ ] **Task 4.3**: Run `node $SCRATCH/audit.mjs bank-statement-converter` and verify 0 console/page errors, 0 external network requests, `hasHorizontalScroll: false` at `1366px`, `390px`, and `320px`, and valid `.csv`, `.xlsx`, and `.qif` downloads.
