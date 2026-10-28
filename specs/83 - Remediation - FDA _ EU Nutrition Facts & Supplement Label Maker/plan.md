# TDD Remediation Plan — FDA / EU Nutrition Facts & Supplement Label Maker

> **Spec ID**: `83`  
> **Remediates Tool**: `53 - FDA _ EU Nutrition Facts & Supplement Label Maker` (`/tools/nutrition-label-maker`)  
> **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/documents/nutrition-label-maker/
├── engine.ts                                   # Add regulatory-standard-aware PDF rendering (FDA 2016 + Added Sugars, EU 1169, Supplement Facts, Dual Column) and 300 DPI PNG export
├── engine.spec.ts                              # Add unit tests for PNG export (magic bytes 89 50 4e 47) and standard-specific PDF content (EU 1169, Supplement Facts, Dual Column, Added Sugars)
├── nutrition-label-maker.component.ts          # Add PNG option to #exportFormatSelect, replace inline preview styles with responsive BEM styles, fix 390px/320px overflow & 38px input touch targets
└── nutrition-label-maker.component.spec.ts     # Add component test selecting 'png' and 'pdf' formats and verifying generated deliverable metadata and filename
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Export Correctness Boundary (`engine.ts` / `engine.spec.ts`)
- **Functions under test**:
  - `generateNutritionLabelPdf(options: NutritionLabelMakerOptions)`
  - `generateNutritionLabelPng(svgString: string, widthPx: number, heightPx: number)`
  - `processNutritionLabel(options: NutritionLabelMakerOptions)`
- **Assertions that catch current bugs**:
  - Calling `processNutritionLabel({ ...EU_1169_OPTIONS, exportFormat: 'pdf' })` produces a PDF buffer containing `'Nutrition Declaration'` and `'Salt'`, not `'Nutrition Facts'`.
  - Calling `processNutritionLabel({ ...SUPPLEMENT_FACTS_OPTIONS, exportFormat: 'pdf' })` produces a PDF buffer containing `'Supplement Facts'`.
  - Calling `processNutritionLabel({ ...DEFAULT_FDA_OPTIONS, exportFormat: 'pdf' })` produces a PDF buffer containing `'Added Sugars'`.
  - Calling `processNutritionLabel({ ...DEFAULT_FDA_OPTIONS, exportFormat: 'png' })` returns `mimeType: 'image/png'`, `fileName` ending in `.png`, and `blob` starting with PNG signature `[0x89, 0x50, 0x4e, 0x47]`.

### Seam 2: Component State, Format Selector & Resource Disposal Boundary (`nutrition-label-maker.component.ts` / `.spec.ts`)
- `#exportFormatSelect` contains options for `svg`, `png`, and `pdf`.
- Selecting `png` and calling `generateDeliverable()` sets `result()?.fileName` to `organic_granola_crunch_fda_standard_2016.png`.

### Seam 3: Mobile Responsive & Touch Target Boundary (`nutrition-label-maker.component.ts`)
- `.l-columns__area` has `min-width: 0`; `.c-header__title` has `overflow-wrap: anywhere`; `.c-preview__svg-container svg` has `max-width: 100%; height: auto`; `.c-input` and `.c-input--select` have `min-height: 38px; font-size: 16px`.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: Regulatory-Standard-Aware PDF Export & `Added Sugars` Row (`DEFECT-53-02`)
1. **Red**: In `engine.spec.ts`, add tests asserting that `generateNutritionLabelPdf()` includes `'Added Sugars'` for `fda_standard_2016`, `'Nutrition Declaration'` for `eu_standard_1169`, `'Supplement Facts'` for `fda_supplement_facts`, and `'Per container'` for `fda_dual_column`.
2. **Green**: Update `generateNutritionLabelPdf()` in `engine.ts` to add the `Added Sugars` row in FDA 2016 mode and branch layout rendering for `eu_standard_1169`, `fda_supplement_facts`, and `fda_dual_column`.
3. **Refactor**: Share common jsPDF line/row helpers across the 4 PDF layouts.

### Slice 2: 300 DPI `.png` Export in Engine & UI (`DEFECT-53-03`)
1. **Red**:
   - In `engine.spec.ts`, add a test calling `processNutritionLabel({ ...DEFAULT_FDA_OPTIONS, exportFormat: 'png' })` and asserting `res.mimeType === 'image/png'`, `res.fileName.endsWith('.png')`, and the first 4 bytes of `await res.blob.arrayBuffer()` are `[0x89, 0x50, 0x4e, 0x47]`.
   - In `nutrition-label-maker.component.spec.ts`, assert `#exportFormatSelect` includes `<option value="png">`.
2. **Green**:
   - Implement `generateNutritionLabelPng()` and add `case 'png':` in `processNutritionLabel()` in `engine.ts`.
   - Add `<option value="png">PNG (300 DPI Print-Ready Raster Image)</option>` to `#exportFormatSelect` in `nutrition-label-maker.component.ts`.
3. **Refactor**: Parse actual SVG `height` from `svgString` so `metadata.heightPx` reflects the real SVG height.

### Slice 3: Mobile 390px/320px Overflow & Touch Target Remediation (`DEFECT-53-01`)
1. **Red**: Verify via `audit.mjs nutrition-label-maker` that `390px` and `320px` report `scrollWidth: 450` and `smallTouchTargetCount: 20`.
2. **Green**: Update `nutrition-label-maker.component.ts` styles with `min-width: 0` on `.l-columns__area`, `overflow-wrap: anywhere` on `.c-header__title`, responsive `.c-preview` padding (`12px` on mobile), `max-width: 100%; height: auto` on `.c-preview__svg-container svg`, and `min-height: 38px; font-size: 1rem` on `.c-input` and `.c-input--select`.
3. **Refactor**: Re-run `audit.mjs nutrition-label-maker` to verify `hasHorizontalScroll: false` at `1366px`, `390px`, and `320px`.
