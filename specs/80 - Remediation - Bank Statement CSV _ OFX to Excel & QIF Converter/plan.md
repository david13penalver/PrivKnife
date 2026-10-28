# TDD Remediation Plan — Bank Statement CSV / OFX to Excel & QIF Converter

> **Spec ID**: `80`  
> **Remediates Tool**: `50 - Bank Statement CSV _ OFX to Excel & QIF Converter` (`/tools/bank-statement-converter`)  
> **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/dev/bank-statement-converter/
├── engine.ts                                     # Apply merchant cleaning & sign inversion in parseOfxContent, chronological date sorting in calculateSummary, populate formattedText in xlsx mode
├── engine.spec.ts                                # Add unit tests for OFX merchant cleaning/sign inversion, DD/MM/YYYY chronological summary sorting, and xlsx formattedText
├── bank-statement-converter.component.ts         # Remove unused createObjectURL, add error handling, responsive mobile grid/overflow fixes & dark-mode CSS variables
└── bank-statement-converter.component.spec.ts    # Add tests for Copy Formatted in xlsx mode and zero createObjectURL on file selection
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Export Correctness Boundary (`engine.ts` / `engine.spec.ts`)
- **Functions under test**:
  - `parseOfxContent(ofxText: string, optionsOrDateFormat?: BankStatementConverterOptions | DateFormatOutput)`
  - `calculateSummary(transactions: BankTransaction[])`
  - `processBankStatement(source: File | Blob | string, options: BankStatementConverterOptions, originalFileName?: string)`
- **Assertions that catch current bugs**:
  - Calling `processBankStatement(SAMPLE_OFX_CONTENT, { ...DEFAULT_CONVERTER_OPTIONS, cleanMerchantDescriptions: true, stripPosCodes: true, invertAmountSigns: true }, 'stmt.ofx')` strips POS codes from `<NAME>` and inverts transaction amounts (`-48.50` → `+48.50`).
  - Calling `calculateSummary([{ date: '15/10/2026', description: 'A', amount: 10 }, { date: '02/11/2026', description: 'B', amount: 20 }])` returns `startDate: '15/10/2026'` and `endDate: '02/11/2026'`.
  - Calling `processBankStatement(SAMPLE_BANK_CSV, XLSX_CONVERTER_OPTIONS)` returns a defined non-empty `result.formattedText`.

### Seam 2: Component State, Clipboard & Memory Hygiene Boundary (`bank-statement-converter.component.ts` / `.spec.ts`)
- `handleFileSelected()` does not invoke `URL.createObjectURL()`.
- Calling `copyToClipboard()` after converting in `xlsx` mode copies `result.formattedText` and sets `copySuccess()` to `true`.

### Seam 3: Mobile Responsive & Theme Styling Boundary (`bank-statement-converter.component.ts`)
- `.l-columns__area` has `min-width: 0`; `.c-header__title` wraps cleanly (`overflow-wrap: anywhere`); `.c-summary-row` switches from `repeat(4, 1fr)` to `repeat(2, 1fr)` at `@media (max-width: 640px)`; `.c-statement-textarea` uses `16px` font on mobile and CSS theme variables.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: OFX Merchant Cleaning & Sign Inversion (`DEFECT-50-02`)
1. **Red**: In `engine.spec.ts`, add a test passing OFX content with `<NAME>WHOLEFDS SFO POS CARD 8812` and `invertAmountSigns: true` to `processBankStatement()` and asserting the resulting transaction has `description === 'WHOLEFDS SFO'` and `amount === 48.5`.
2. **Green**: Update `parseOfxContent()` in `engine.ts` to accept `BankStatementConverterOptions | DateFormatOutput`, apply `cleanMerchantName()` when `cleanMerchantDescriptions` is enabled, and negate `amount` when `invertAmountSigns` is enabled.
3. **Refactor**: Keep backward compatibility when `parseOfxContent(ofx, 'MM/DD/YYYY')` is called with a string second argument.

### Slice 2: Chronological Date Sorting in `calculateSummary()` & `xlsx` `formattedText` (`DEFECT-50-03`, `DEFECT-50-04`)
1. **Red**:
   - In `engine.spec.ts`, add a test verifying `calculateSummary()` with `'15/10/2026'` and `'02/11/2026'` returns `startDate === '15/10/2026'` and `endDate === '02/11/2026'`.
   - Assert `processBankStatement(SAMPLE_BANK_CSV, XLSX_CONVERTER_OPTIONS)` sets `result.formattedText` to a non-empty CSV string.
2. **Green**:
   - Add a date-key comparator in `calculateSummary()` that parses `DD/MM/YYYY` / `MM/DD/YYYY` / `YYYY-MM-DD` chronologically.
   - Set `formattedText = buildCsvExport(transactions)` in the `'xlsx'` branch of `processBankStatement()`.
3. **Refactor**: Clean up helper functions in `engine.ts`.

### Slice 3: Memory Hygiene & Component Clipboard Tests (`DEFECT-50-05`)
1. **Red**: In `bank-statement-converter.component.spec.ts`, spy on `URL.createObjectURL` during `handleFileSelected()` and assert it is not called.
2. **Green**: Remove the unused `URL.createObjectURL(file)` call in `handleFileSelected()`.
3. **Refactor**: Ensure `cleanUpUrls()` still revokes download URLs on destroy and reset.

### Slice 4: Mobile Overflow & Dark Mode Styling Remediation (`DEFECT-50-01`)
1. **Red**: Confirm `audit.mjs bank-statement-converter` currently reports `scrollWidth: 453` at `390px` and `320px`.
2. **Green**: Update `styles` in `bank-statement-converter.component.ts` with `min-width: 0` on `.l-columns__area`, `overflow-wrap: anywhere` on `.c-header__title`, responsive `.c-summary-row` (`repeat(2, 1fr)` at `<= 640px`), `16px` mobile textarea font size, `36px` checkbox label height, and CSS custom properties.
3. **Refactor**: Verify via headless Chrome that `hasHorizontalScroll: false` at `1366px`, `390px`, and `320px`.
