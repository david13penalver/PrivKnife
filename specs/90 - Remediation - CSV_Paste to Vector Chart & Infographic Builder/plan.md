# Remediation Implementation Plan: CSV/Paste to Vector Chart & Infographic Builder (Tool 60)

- **Target Tool**: `60` — `csv-vector-chart-builder`
- **Spec Reference**: [`specs/90 - Remediation - CSV_Paste to Vector Chart & Infographic Builder/spec.md`](file:///home/deivision/Projects/Programming/PrivKnife/specs/90%20-%20Remediation%20-%20CSV_Paste%20to%20Vector%20Chart%20&%20Infographic%20Builder/spec.md)

---

## 1. Impacted Files

| File Path | Action | Purpose |
| :--- | :--- | :--- |
| [`PrivKnife/src/app/tools/dev/csv-vector-chart-builder/engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/engine.ts) | `MODIFY` | Add `escapeXml()` to all SVG text interpolations (`DEFECT-60-01`), implement all 5 chart types + legend/gridlines/labels in `generateChartPdf()` (`DEFECT-60-02`), and fix cumulative `stacked_area` math, single-slice `donut_pie` arc + `valueFormat`, and aspect-accurate `generateChartPngBlob()` (`DEFECT-60-03`) |
| [`PrivKnife/src/app/tools/dev/csv-vector-chart-builder/csv-vector-chart-builder.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/csv-vector-chart-builder.component.ts) | `MODIFY` | Sanitize SVG with `DOMPurify.sanitize()` (`DEFECT-60-01`), fix `.l-extremo__area-*` header and uncropped `1:1`/`4:3`/`16:9` SVG scaling in `.c-preview`, and refactor inline styles to `.c-chart-builder__*` BEM SCSS with mobile touch target and `>= 16px` textarea fixes (`DEFECT-60-04`) |
| [`PrivKnife/src/app/tools/dev/csv-vector-chart-builder/csv-vector-chart-builder.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/csv-vector-chart-builder.component.spec.ts) | `MODIFY` | Add security, engine, component, and DOM unit tests covering `DEFECT-60-01` through `DEFECT-60-04` |

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Pure Engine Unit Tests (`engine.ts`)
- Test `generateChartSvg()` escapes `<`, `>`, `&`, `"`, and `'` in `chartTitle`, `chartSubtitle`, `categories`, and `series.name` so CSV data containing `R&D` or `<img src=x onerror=alert(1)>` produces valid, safe SVG XML (`DEFECT-60-01`).
- Test `generateChartPdf()` branches across all 5 `chartType` values (`vertical_bar`, `horizontal_bar`, `smooth_line`, `stacked_area`, `donut_pie`) and produces valid PDF binaries for each (`DEFECT-60-02`).
- Test `generateChartSvg()` in `stacked_area` mode accumulates series values per category (`y` coordinates of series 2 sit above series 1 rather than overlapping from `zeroY`) (`DEFECT-60-03`).
- Test `generateChartSvg()` in `donut_pie` mode with a single category (`OnlyOne,100`) renders a non-degenerate arc (`x1 !== x2 || y1 !== y2`) and formats slice labels using `options.valueFormat` (`DEFECT-60-03`).
- Test `generateChartPngBlob()` respects the SVG's `width`/`height` aspect ratio and `dpi` parameter (`DEFECT-60-03`).

### Seam 2: Web Worker Message Contract Tests
- Not applicable (2D SVG/PDF chart synthesis executes synchronously in `<5ms`).

### Seam 3: Component State, Error Recovery & Resource Disposal (`csv-vector-chart-builder.component.ts`)
- Test pasting CSV with `"Test</text><img src=x onerror=""window.__xss60=true""><text>",100` renders zero `<img>` or `[onerror]` nodes in `.c-preview` (`DEFECT-60-01`).
- Test `ngOnDestroy` / download helpers revoke temporary Blob URLs.

### Seam 4: DOM, BEM, A11y & Security Verification
- Verify `.c-card__header.l-extremo` uses `.l-extremo__area-izquierda` and `.l-extremo__area-derecha` (`DEFECT-60-04`).
- Verify `.c-chart-builder__preview-stage svg` scales responsively (`width: 100%; height: auto; max-height: 480px`) (`DEFECT-60-04`).
- Verify zero network calls (`fetch` / `XMLHttpRequest`) during CSV parsing, SVG generation, and PNG/PDF export.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: SVG XML Escaping & `DOMPurify` Sanitization (`DEFECT-60-01`)
- **RED**: Write unit tests in `csv-vector-chart-builder.component.spec.ts` asserting that:
  1. `generateChartSvg()` with category `"R&D <Team>"`, series `"Sales & Marketing"`, and `chartTitle: 'Bad</text><img src=x onerror=alert(1)><text>'` escapes `&`, `<`, and `>` into `&amp;`, `&lt;`, and `&gt;` with zero raw `<img` tags.
  2. Component `sanitizedSvg()` sanitizes SVG output via `DOMPurify.sanitize()` so zero `<img>` or `[onerror]` nodes exist in `.c-preview`.
- **GREEN**:
  1. Add `export function escapeXml(str: string): string` in `engine.ts` and wrap `options.chartTitle`, `options.chartSubtitle`, `data.categories`, `s.name`, and label strings in `generateChartSvg()`.
  2. Import `DOMPurify` in `csv-vector-chart-builder.component.ts` and sanitize `this.svgOutput()` with `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })` before `this.sanitizer.bypassSecurityTrustHtml()`.
- **REFACTOR**: Ensure all `<text>` elements in `generateChartSvg()` pass through `escapeXml()`.

### Slice 2: Cumulative `stacked_area`, Single-Slice `donut_pie`, Aspect-Accurate PNG & Multi-Type `generateChartPdf()` (`DEFECT-60-02`, `DEFECT-60-03`)
- **RED**: Write unit tests asserting that:
  1. In `stacked_area` mode with 2 series (`[100, 100]` and `[50, 50]`), the Y-axis maximum scales to `>= 150` (not `100`) and series 2's top points sit at cumulative value `150` while its bottom polygon baseline traces series 1 (`100`).
  2. In `donut_pie` mode with 1 category (`Category,Val\nOnly,100`) and `valueFormat: 'currency_usd'`, the SVG `<path>` has distinct start/end coordinates (`x1 !== x2`) and displays `$100` (`formatChartValue(100, 'currency_usd')`) in the label.
  3. `generateChartPdf()` renders distinct vector primitives for `vertical_bar`, `horizontal_bar`, `smooth_line`, `stacked_area`, and `donut_pie`.
  4. `generateChartPngBlob()` reads `width` and `height` from the SVG header and scales canvas dimensions proportionally to `dpi`.
- **GREEN**:
  1. Update `generateChartSvg()` in `engine.ts` so `stacked_area` computes stacked totals per category for `maxVal` / `niceMax`, tracks `prevY[c]` across series `s`, and closes each area polygon along the previous series' baseline in reverse order.
  2. In `donut_pie`, clamp `sliceAngle = Math.min(rawSliceAngle, Math.PI * 2 - 0.0001)` and format slice labels with `${formatChartValue(val, options.valueFormat)} (${pct}%)`.
  3. Update `generateChartPngBlob(svgContent, dpi)` to extract `width` and `height` from `svgContent` (`getAspectRatioDimensions` fallback) and size the canvas to `Math.round(svgW * (dpi / 96)) × Math.round(svgH * (dpi / 96))` (capped at `3000px` max dimension).
  4. Update `generateChartPdf()` to branch on `options.chartType` (`vertical_bar`, `horizontal_bar`, `smooth_line`, `stacked_area`, `donut_pie`) and draw the legend, gridlines, and data labels.
- **REFACTOR**: Extract shared coordinate math helpers between `generateChartSvg()` and `generateChartPdf()`.

### Slice 3: Responsive BEM Layout, Uncropped `1:1` SVG Preview & Touch Targets (`DEFECT-60-04`)
- **RED**: Write DOM tests asserting that `.c-card__header.l-extremo` contains `.l-extremo__area-izquierda` and `.l-extremo__area-derecha`, and that `.c-chart-builder__*` BEM classes are applied.
- **GREEN**:
  1. Style `.c-chart-builder__preview-stage svg { width: 100%; height: auto; max-height: 480px; display: block; }` so `1:1` (`700×700`), `4:3` (`800×600`), and `16:9` (`960×540`) charts fit cleanly inside `.c-preview` without clipping.
  2. Add `.l-extremo__area-izquierda` and `.l-extremo__area-derecha` to the preview card header and CSV header bar.
  3. Replace inline `style="..."` attributes with `.c-chart-builder__*` BEM SCSS rules, set `font-size: 1rem` (`16px`) on the CSV `<textarea>`, add `overflow-wrap: anywhere` on `.c-header__title`, and enforce `>= 44px` touch targets on all inputs, selects, checkbox labels, and buttons.
- **REFACTOR**: Run the full test suite and verify desktop/mobile layout in headless Chrome.
