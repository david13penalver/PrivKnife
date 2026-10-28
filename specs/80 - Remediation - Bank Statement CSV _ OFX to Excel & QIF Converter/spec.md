# Remediation Specification — Bank Statement CSV / OFX to Excel & QIF Converter

> **Spec ID**: `80`  
> **Remediates Tool**: `50 - Bank Statement CSV _ OFX to Excel & QIF Converter`  
> **Slug**: `bank-statement-converter`  
> **Category**: `dev`  
> **Route**: `/tools/bank-statement-converter`  
> **Audit Reference**: [`tools_31_60_audit.md#tool-50`](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-50)  
> **Current Audit Verdict**: Functional `✅ Works` | Mobile `❌ Poor` | Overall `⚠️`  
> **Status**: `Ready for Implementation`  
> **Priority**: `High`

---

## 1. Executive Summary & Audit Baseline

During the headless-Chrome functional and responsive audit across Desktop (`1366×900`), Mobile (`390×844`), and Small Mobile (`320×640`), the **Bank Statement CSV & OFX to Excel & QIF Converter** (`/tools/bank-statement-converter`) accurately parsed CSV bank statements, converted dates across ISO/US/EU formats, cleaned POS merchant descriptions on CSV inputs, and generated valid `.csv`, `.xlsx` (2-sheet workbook verified via SheetJS), and `.qif` deliverables.

However, the audit identified five concrete defects across mobile layout adaptation, OFX option handling, date-range summary sorting, clipboard UX in Excel mode, and object URL hygiene:
1. **Severe Horizontal Overflow on 390px and 320px Mobile Viewports (`DEFECT-50-01`)**: Both `390px` (`scrollWidth: 453px`) and `320px` (`scrollWidth: 453px`) suffer from horizontal overflow (`hasHorizontalScroll: true`), `.c-summary-row` uses a fixed 4-column grid (`grid-template-columns: repeat(4, 1fr)`) with zero `@media` queries, checkboxes are `13×13px`, `.c-statement-textarea` uses `font-size: 0.8rem` (`12.8px < 16px`, triggering iOS auto-zoom), and hardcoded light-mode colors (`#f8fafc`, `#0f172a`, `#f1f5f9`) break dark mode.
2. **OFX/QFX Parser Ignores Merchant Cleaning, POS Stripping & Sign Inversion (`DEFECT-50-02`)**: `parseOfxContent()` only accepts `(ofxText, targetDateFormat)` instead of `options: BankStatementConverterOptions`, completely ignoring `cleanMerchantDescriptions`, `stripPosCodes`, and `invertAmountSigns` on OFX/QFX files.
3. **Copy Formatted Button No-Op in Excel (`.xlsx`) Mode (`DEFECT-50-03`)**: When `exportFormat` is `'xlsx'`, `processBankStatement()` leaves `formattedText` as `undefined`, yet the **Copy Formatted** button still renders in the preview card header and silently does nothing when clicked.
4. **Lexicographical Date Sorting Bug in `calculateSummary()` (`DEFECT-50-04`)**: `calculateSummary()` sorts already-formatted `t.date` strings (`transactions.map(t => t.date).sort()`), producing wrong `startDate` and `endDate` when `MM/DD/YYYY` or `DD/MM/YYYY` spans multiple months or years.
5. **Unused `URL.createObjectURL(file)` Allocation (`DEFECT-50-05`)**: `handleFileSelected()` allocates `URL.createObjectURL(file)` on every file selection without ever reading `previewUrl`.

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-50-01` — Horizontal Overflow at 390px and 320px (`scrollWidth: 453px`), Fixed 4-Column Summary Grid & Hardcoded Light Theme Colors
- **Severity**: `High`
- **Category**: `Mobile & Responsive Layout` / `Theme Contrast`
- **Location**: [`bank-statement-converter.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/bank-statement-converter/bank-statement-converter.component.ts#L316-L432)
- **Symptom & Evidence**:
  - At `390×844` and `320×640`, `document.documentElement.scrollWidth` is `453px` (`hasHorizontalScroll: true`).
  - `.c-summary-row` is hardcoded to `grid-template-columns: repeat(4, 1fr)` with zero `@media` queries, cramping the 4 summary cards on mobile screens.
  - Checkboxes measure `13×13px` (`smallTouchTargetCount: 3`), and `.c-statement-textarea` has `font-size: 0.8rem` (`12.8px < 16px`, triggering iOS Safari auto-zoom).
  - Hardcoded hex colors (`background: #f8fafc`, `color: #0f172a`, `background: #f1f5f9`) do not adapt to dark mode.
- **Root Cause**: Missing `min-width: 0` on `.l-columns__area`, unbreakable header layout, lack of responsive `@media` breakpoints on `.c-summary-row`, and hardcoded hex colors.
- **Remediation Specification**:
  - Add `min-width: 0` on `.l-columns__area`, set `overflow-wrap: anywhere` on `.c-header__title`, and allow `.c-card__header.l-extremo` to `flex-wrap: wrap; gap: 0.5rem`.
  - Add `@media (max-width: 640px)` to switch `.c-summary-row` to `grid-template-columns: repeat(2, 1fr)` and `@media (max-width: 360px)` to `1fr`.
  - Set `font-size: 1rem` (`16px`) on `.c-statement-textarea` on mobile viewports, enlarge `.c-checkbox-label` touch targets (`min-height: 36px` with `18×18px` checkboxes), and replace hardcoded hex colors with CSS custom properties (`var(--color-surface)`, `var(--color-text)`, `var(--color-border)`).

### `DEFECT-50-02` — `parseOfxContent()` Ignores `cleanMerchantDescriptions`, `stripPosCodes`, and `invertAmountSigns`
- **Severity**: `Medium`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/bank-statement-converter/engine.ts#L114-L148) and [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/bank-statement-converter/engine.ts#L378-L382)
- **Symptom & Evidence**: Uploading `sample.ofx` containing `<NAME>WHOLEFDS SFO POS CARD 8812` with `cleanMerchantDescriptions: true` and `stripPosCodes: true` left `WHOLEFDS SFO POS CARD 8812` uncleaned in the output table and `.qif` file, whereas the same merchant string in CSV mode was cleaned to `WHOLEFDS SFO`. Similarly, toggling `Invert signs` had no effect on OFX transactions.
- **Root Cause**: `parseOfxContent(ofxText: string, targetDateFormat: DateFormatOutput)` only accepts `targetDateFormat` (or `BankStatementConverterOptions` is not read) and never calls `cleanMerchantName()` or negates `amount` when `options.invertAmountSigns` is `true`.
- **Remediation Specification**:
  - Update `parseOfxContent(ofxText: string, optionsOrDateFormat: BankStatementConverterOptions | DateFormatOutput = 'YYYY-MM-DD')` so it supports both the legacy `DateFormatOutput` argument and a full `BankStatementConverterOptions` object.
  - When `options.cleanMerchantDescriptions` is `true`, pass `description` through `cleanMerchantName(description, options.stripPosCodes)`.
  - When `options.invertAmountSigns` is `true`, negate `amount` (`amount = -amount || 0`).
  - Pass `options` from `processBankStatement()` into `parseOfxContent(textContent, options)`.

### `DEFECT-50-03` — **Copy Formatted** Button Silently Fails in `xlsx` Export Mode
- **Severity**: `Low`
- **Category**: `Component State & UX`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/bank-statement-converter/engine.ts#L400-L405) and [`bank-statement-converter.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/bank-statement-converter/bank-statement-converter.component.ts#L537-L550)
- **Symptom & Evidence**: In `xlsx` mode, `result.formattedText` is `undefined`. Clicking **Copy Formatted** returns early at `if (!result || !result.formattedText) return;` without copying anything or showing feedback.
- **Root Cause**: `processBankStatement()` only sets `formattedText` in the `'qif'` and `'csv'` branches.
- **Remediation Specification**:
  - In `processBankStatement()`, set `formattedText = buildCsvExport(transactions)` in the `'xlsx'` branch as well so **Copy Formatted** copies the normalized tabular CSV text when Excel mode is active.

### `DEFECT-50-04` — `calculateSummary()` Sorts Formatted Date Strings Lexicographically
- **Severity**: `Low`
- **Category**: `Engine Logic`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/bank-statement-converter/engine.ts#L338-L340)
- **Symptom & Evidence**: When `dateFormatOutput` is `'DD/MM/YYYY'` or `'MM/DD/YYYY'`, `transactions.map(t => t.date).sort()` sorts by day or month string prefix instead of chronological order (e.g., `'02/11/2026'` sorts before `'15/10/2026'`).
- **Root Cause**: Lexicographical `.sort()` is only chronological for ISO `YYYY-MM-DD` strings.
- **Remediation Specification**:
  - Convert each `t.date` to a comparable ISO key (`YYYY-MM-DD`) inside `calculateSummary()` when sorting, while returning the original formatted `t.date` values as `startDate` and `endDate`.

### `DEFECT-50-05` — Unused `URL.createObjectURL(file)` Allocation in `handleFileSelected()`
- **Severity**: `Low`
- **Category**: `Memory Hygiene`
- **Location**: [`bank-statement-converter.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/bank-statement-converter/bank-statement-converter.component.ts#L480-L484)
- **Symptom & Evidence**: `handleFileSelected()` calls `URL.createObjectURL(file)` and pushes it to `createdBlobUrls` without ever using `previewUrl`.
- **Root Cause**: Unused object URL allocation copied from an image tool.
- **Remediation Specification**: Remove `URL.createObjectURL(file)` from `handleFileSelected()`.

---

## 3. Target Acceptance Criteria

### 3.1. Functional & Spec Conformance
- [ ] **AC-50-01 (OFX Cleansing & Sign Inversion)**: Uploading or pasting OFX/QFX data applies `cleanMerchantDescriptions`, `stripPosCodes`, and `invertAmountSigns` identically to CSV inputs.
- [ ] **AC-50-02 (Chronological Summary Dates)**: `calculateSummary()` computes chronologically accurate `startDate` and `endDate` across `YYYY-MM-DD`, `MM/DD/YYYY`, and `DD/MM/YYYY` formats.
- [ ] **AC-50-03 (Copy Formatted in All Modes)**: Clicking **Copy Formatted** copies valid text in `csv`, `qif`, and `xlsx` modes and sets `copySuccess() === true`.

### 3.2. Mobile & Responsive Layout & Theme Contrast
- [ ] **AC-50-04 (Zero Horizontal Overflow)**: `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at `1366px`, `390px`, and `320px`.
- [ ] **AC-50-05 (Responsive Summary Grid & Touch Targets)**: `.c-summary-row` collapses to `repeat(2, 1fr)` at `<= 640px`, `.c-checkbox-label` has `>= 36px` height, and `.c-statement-textarea` has `font-size >= 16px` on mobile.
- [ ] **AC-50-06 (Light & Dark Mode Contrast)**: All cards, tables, and textareas use CSS custom properties with full legibility in both light and dark themes.

### 3.3. `AGENTS.md` Prime Directives
- [ ] **AC-50-07 (Directives 1 & 2 — Zero Network)**: Zero external network requests during all conversion workflows.
- [ ] **AC-50-08 (Directive 4 — Memory Hygiene)**: No unused `URL.createObjectURL` calls on file selection; download URLs are revoked after download and in `ngOnDestroy()`.
