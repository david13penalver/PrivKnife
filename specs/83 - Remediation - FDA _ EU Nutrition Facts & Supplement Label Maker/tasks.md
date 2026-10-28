# Remediation Tasks — FDA / EU Nutrition Facts & Supplement Label Maker

> **Spec ID**: `83`  
> **Remediates Tool**: `53 - FDA _ EU Nutrition Facts & Supplement Label Maker` (`/tools/nutrition-label-maker`)

---

## Phase 1: Engine PDF Layout Accuracy & 300 DPI PNG Export (Seam 1 — Red → Green)
- [x] **Task 1.1 (Red — Multi-Standard PDF Tests)**: Add unit tests in `src/app/tools/documents/nutrition-label-maker/engine.spec.ts` verifying `generateNutritionLabelPdf()` renders `'Added Sugars'` in `fda_standard_2016`, `'Nutrition Declaration'` in `eu_standard_1169`, `'Supplement Facts'` in `fda_supplement_facts`, and `'Per container'` in `fda_dual_column` (`DEFECT-53-02`).
- [x] **Task 1.2 (Green — Multi-Standard PDF Implementation)**: Update `generateNutritionLabelPdf()` in `src/app/tools/documents/nutrition-label-maker/engine.ts` to support all 4 regulatory standards and include `Added Sugars` in FDA 2016 mode (`DEFECT-53-02`).
- [x] **Task 1.3 (Red — 300 DPI PNG Export Test)**: Add a unit test in `engine.spec.ts` verifying `processNutritionLabel({ ...DEFAULT_FDA_OPTIONS, exportFormat: 'png' })` returns a valid `image/png` blob starting with PNG magic bytes `89 50 4e 47 0d 0a 1a 0a` (`DEFECT-53-03`).
- [x] **Task 1.4 (Green — 300 DPI PNG Export Implementation)**: Implement `generateNutritionLabelPng()` and add `case 'png':` in `processNutritionLabel()` in `engine.ts` (`DEFECT-53-03`).

## Phase 2: Component PNG Selector & Export Integration (Seam 2 — Red → Green)
- [x] **Task 2.1 (Red & Green — Add PNG Option in Component)**: Add `<option value="png">PNG (300 DPI Print-Ready Raster Image)</option>` to `#exportFormatSelect` in `src/app/tools/documents/nutrition-label-maker/nutrition-label-maker.component.ts` and verify PNG selection in `nutrition-label-maker.component.spec.ts` (`DEFECT-53-03`).

## Phase 3: Mobile Adaptation, Touch Targets & Theme Styling (Seam 3)
- [x] **Task 3.1 (Fix 390px & 320px Horizontal Overflow & Responsive SVG Container)**: Replace inline styles on `.c-preview` in `nutrition-label-maker.component.ts`, add `min-width: 0` on `.l-columns__area`, wrap `.c-header__title`, and add `max-width: 100%; height: auto` on `.c-preview__svg-container svg` (`DEFECT-53-01`).
- [x] **Task 3.2 (Touch Target Sizing)**: Style `.c-input`, `.c-input--number`, and `.c-input--select` with `min-height: 38px; font-size: 1rem` (`DEFECT-53-01`).

## Phase 4: Verification & Regression Gate
- [x] **Task 4.1**: Run `npx vitest run src/app/tools/documents/nutrition-label-maker/` and verify 100% test pass.
- [x] **Task 4.2**: Run `npm run build` and verify zero compilation errors.
- [x] **Task 4.3**: Run `node $SCRATCH/audit.mjs nutrition-label-maker` and verify 0 console/page errors, 0 external network requests, `hasHorizontalScroll: false` at `1366px`, `390px`, and `320px`, and valid `.svg`, `.png`, and `.pdf` downloads.
