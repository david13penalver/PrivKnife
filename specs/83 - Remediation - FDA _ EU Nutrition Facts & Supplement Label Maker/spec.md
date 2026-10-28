# Remediation Specification — FDA / EU Nutrition Facts & Supplement Label Maker

> **Spec ID**: `83`  
> **Remediates Tool**: `53 - FDA _ EU Nutrition Facts & Supplement Label Maker`  
> **Slug**: `nutrition-label-maker`  
> **Category**: `documents`  
> **Route**: `/tools/nutrition-label-maker`  
> **Audit Reference**: [`tools_31_60_audit.md#tool-53`](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-53)  
> **Current Audit Verdict**: Functional `⚠️ Partial` | Mobile `❌ Poor` | Overall `⚠️`  
> **Status**: `Ready for Implementation`  
> **Priority**: `High`

---

## 1. Executive Summary & Audit Baseline

During the headless-Chrome functional and responsive audit across Desktop (`1366×900`), Mobile (`390×844`), and Small Mobile (`320×640`), the **FDA & EU Nutrition Facts & Supplement Label Maker** (`/tools/nutrition-label-maker`) rendered accurate live SVG previews across all four regulatory standards (`fda_standard_2016`, `eu_standard_1169`, `fda_supplement_facts`, and `fda_dual_column`), enforced non-negative nutrient validation, and exported valid `.svg` files.

However, the audit identified three high/medium-severity defects across export format completeness, PDF regulatory layout accuracy, and mobile responsiveness:
1. **Horizontal Overflow at 390px and 320px (`scrollWidth: 450px`) & 20 Small Touch Targets (`DEFECT-53-01`)**: Both `390px` (`scrollWidth: 450px`) and `320px` (`scrollWidth: 450px`) exhibit horizontal scrolling (`hasHorizontalScroll: true`), `.l-columns--3` and `.l-columns--4` nutrient input grids do not stack gracefully on small screens, `<select id="exportFormatSelect">` text collides with the select caret at 320px, and 20 form inputs/selects measure under 32px in height (`28px` inputs and `21px` `<select>`).
2. **PDF Export Hardcodes US FDA 2016 Layout & Omits `Added Sugars` (`DEFECT-53-02`)**: `generateNutritionLabelPdf()` in `engine.ts` completely ignores `options.regulatoryStandard` — exporting a PDF while `EU Regulation 1169/2011`, `FDA Supplement Facts`, or `FDA Dual Column` is selected still produces a US `Nutrition Facts` PDF (`containsNutritionFacts: true`, `containsNutritionDeclaration: false`) — and even in FDA 2016 mode it omits the `Includes Xg Added Sugars` row.
3. **Missing 300 DPI `.png` Raster Export (`DEFECT-53-03`)**: `spec.md` Section 1, 2, & 5 (`Export Deliverables: Pixel-perfect vector .svg, 300 DPI print-ready .png, and vector .pdf`) and `LabelExportFormat = 'svg' | 'png' | 'pdf'` in `types.ts` specify a 300 DPI `.png` export, but `<select id="exportFormatSelect">` only offers `svg` and `pdf`, and `processNutritionLabel()` in `engine.ts` falls through to `svg` when `format === 'png'`.

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-53-01` — Horizontal Overflow at 390px and 320px (`scrollWidth: 450px`), 20 Small Touch Targets & Inline Style Hardcoding
- **Severity**: `High`
- **Category**: `Mobile & Responsive Layout` / `Theme Contrast` / `BEM & Form Accessibility`
- **Location**: [`nutrition-label-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/nutrition-label-maker/nutrition-label-maker.component.ts#L28-L392)
- **Symptom & Evidence**:
  - At `390px` and `320px`, `document.documentElement.scrollWidth` is `450px` (`hasHorizontalScroll: true`).
  - 20 form controls measure below 32px height (`18` text/number inputs at `28px`, `2` `<select>` controls at `21px`).
  - Line 344 uses hardcoded inline styles (`style="background-color: #f1f5f9; padding: 24px; ..."`) instead of theme-aware BEM classes, and the fixed `width="320"` `<svg>` inside `.c-preview__svg-container` can overflow narrow cards at 320px when combined with card + preview padding (`24px * 2`).
- **Root Cause**: Missing `min-width: 0` on `.l-columns__area`, unbreakable header layout, fixed `24px` preview padding around a `320px`-wide SVG inside a `320px` viewport, and unstyled input/select heights.
- **Remediation Specification**:
  - Add `min-width: 0` on `.l-columns__area`, `overflow-wrap: anywhere` on `.c-header__title`, and `flex-wrap: wrap; gap: 0.5rem` on `.c-card__footer.l-extremo`.
  - Replace the inline style on `.c-preview` (line 344) with a BEM class using `var(--color-surface-subtle, #f1f5f9)` and responsive padding (`padding: 12px` at `<= 480px`), and add `::ng-deep .c-preview__svg-container svg { max-width: 100%; height: auto; display: block; }` so the 320px SVG scales down smoothly inside a 320px viewport.
  - Set `min-height: 38px; font-size: 1rem` on `.c-input`, `.c-input--number`, and `.c-input--select`.

### `DEFECT-53-02` — `generateNutritionLabelPdf()` Ignores `regulatoryStandard` and Omits `Added Sugars`
- **Severity**: `Medium`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/nutrition-label-maker/engine.ts#L541-L643)
- **Symptom & Evidence**: Selecting `eu_standard_1169` and exporting PDF downloaded `organic_granola_crunch_eu_standard_1169.pdf` whose content rendered `Nutrition Facts` instead of `Nutrition Declaration` (`containsNutritionDeclaration: false`). Furthermore, in `fda_standard_2016` mode, lines 617–618 jump directly from `Total Sugars` to `Protein`, omitting `Includes Xg Added Sugars (Y%)`.
- **Root Cause**: `generateNutritionLabelPdf()` was written only for `fda_standard_2016` and omitted the `addedSugarsG` row.
- **Remediation Specification**:
  - Update `generateNutritionLabelPdf(options: NutritionLabelMakerOptions)` in `engine.ts` to branch on `options.regulatoryStandard`:
    - `'fda_standard_2016'`: Include `Includes ${options.addedSugarsG}g Added Sugars` with `${dvs.addedSugarsDV}%` DV between `Total Sugars` and `Protein`.
    - `'eu_standard_1169'`: Render `Nutrition Declaration`, product name, `Typical Values` / `Per 100g / Portion`, `Energy ${energyKj} kJ / ${energyKcal} kcal`, `Fat`, `of which saturates`, `Carbohydrate`, `of which sugars`, `Fibre`, `Protein`, `Salt ${saltG.toFixed(2)} g`, and EU reference intake footnote.
    - `'fda_supplement_facts'`: Render `Supplement Facts`, `Serving Size`, `Servings Per Container`, `Amount Per Serving` / `% Daily Value`, and supplement rows.
    - `'fda_dual_column'`: Render `Nutrition Facts` with dual `Per serving` and `Per container` columns.

### `DEFECT-53-03` — Missing 300 DPI `.png` Export Option in Engine and UI
- **Severity**: `Medium`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/nutrition-label-maker/engine.ts#L675-L690) and [`nutrition-label-maker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/documents/nutrition-label-maker/nutrition-label-maker.component.ts#L300-L311)
- **Symptom & Evidence**: `spec.md` Section 1, 2, & 5 and `LabelExportFormat = 'svg' | 'png' | 'pdf'` require `.png` export, but `<select id="exportFormatSelect">` only lists `svg` and `pdf`, and `processNutritionLabel()` has no `case 'png':` branch.
- **Root Cause**: The PNG rasterization branch was never added to `processNutritionLabel()` or the format `<select>`.
- **Remediation Specification**:
  - Add `<option value="png">PNG (300 DPI Print-Ready Raster Image)</option>` to `#exportFormatSelect` in `nutrition-label-maker.component.ts`.
  - Implement `generateNutritionLabelPng(svgString: string, widthPx: number, heightPx: number): Promise<Blob>` in `engine.ts` that rasterizes the SVG at 300 DPI scale (`scale = 300 / 96 = 3.125`) onto an HTML5 `<canvas>` when available in the browser (with a deterministic valid PNG IHDR/IDAT/IEND binary builder fallback in headless/Node test environments where `Image.onload` for SVG data URLs does not fire synchronously), returning a valid `image/png` `Blob` starting with PNG magic bytes `89 50 4e 47 0d 0a 1a 0a`.

---

## 3. Target Acceptance Criteria

### 3.1. Functional & Spec Conformance
- [ ] **AC-53-01 (Standard-Aware PDF Export)**: Exporting `.pdf` in `fda_standard_2016` (including `Added Sugars`), `eu_standard_1169` (`Nutrition Declaration`, kJ/kcal, Salt), `fda_supplement_facts` (`Supplement Facts`), and `fda_dual_column` (`Per serving` / `Per container`) produces a valid `%PDF-` document containing the matching regulatory header and rows.
- [ ] **AC-53-02 (300 DPI PNG Export)**: Selecting `PNG (300 DPI Print-Ready Raster Image)` in `#exportFormatSelect` and clicking **Export Deliverable** produces a downloadable `.png` file (`mimeType: 'image/png'`, magic bytes `89 50 4e 47 0d 0a 1a 0a`).

### 3.2. Mobile & Responsive Layout & Touch Targets
- [ ] **AC-53-03 (Zero Horizontal Overflow)**: `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at `1366px`, `390px`, and `320px`.
- [ ] **AC-53-04 (Touch Targets & Responsive SVG Preview)**: All `<input>` and `<select>` controls have `min-height: 38px; font-size: 16px`, and the SVG preview scales cleanly inside a `320px` viewport without overflowing.

### 3.3. `AGENTS.md` Prime Directives
- [ ] **AC-53-05 (Directives 1 & 2 — Zero Network)**: Zero external network requests during all label generation and export workflows.
- [ ] **AC-53-06 (Directive 4 — Memory Hygiene)**: All `downloadUrl` object URLs are revoked via `URL.revokeObjectURL()` on re-export, reset, and `ngOnDestroy()`.
