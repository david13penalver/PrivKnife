# Remediation Specification: CSV/Paste to Vector Chart & Infographic Builder (Tool 60)

- **Target Tool**: `60` — `csv-vector-chart-builder` (CSV/Paste to Vector Chart & Infographic Builder)
- **Category**: `dev`
- **Original Spec**: [`specs/60 - CSV_Paste to Vector Chart & Infographic Builder/spec.md`](file:///home/deivision/Projects/Programming/PrivKnife/specs/60%20-%20CSV_Paste%20to%20Vector%20Chart%20&%20Infographic%20Builder/spec.md)
- **Audit Report**: [`tools_31_60_audit.md` §60](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md)
- **Source Directory**: [`PrivKnife/src/app/tools/dev/csv-vector-chart-builder/`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/)
- **Remediation Priority**: `Critical`

---

## 1. Executive Summary & Audit Baseline

- **Audit Verdict**: Functional `⚠️ Partial` | Mobile `⚠️ Minor issues` | Overall `⚠️`
- **Desktop / Mobile / Small Screenshots**:
  - `desktop.png`, `mobile.png`, `mobile-small.png` (`$SCRATCH/shots/csv-vector-chart-builder/`)
  - `functional-donut-1x1.png`, `functional-line-light.png` (`$SCRATCH/shots/csv-vector-chart-builder/`)
- **Defect Summary Table**:

| Defect ID | Severity | Category | Summary |
| :--- | :--- | :--- | :--- |
| `DEFECT-60-01` | `Critical` | `DOM Security & Sanitization` | DOM XSS via unescaped `chartTitle`, `chartSubtitle`, `categories[c]`, and `series[s].name` interpolated into `generateChartSvg()` and injected via `DomSanitizer.bypassSecurityTrustHtml()` without `DOMPurify`; any CSV cell containing `&` (e.g., `R&D,100`) breaks SVG XML and causes PNG export to download a broken 1×1 fallback image |
| `DEFECT-60-02` | `High` | `Engine Logic` | `generateChartPdf()` ignores `options.chartType` and always draws a vertical bar chart (even when `donut_pie`, `smooth_line`, `stacked_area`, or `horizontal_bar` is selected), without legend, gridlines, or data labels |
| `DEFECT-60-03` | `Medium` | `Engine Logic` | `stacked_area` plots overlapping unstacked series instead of cumulative stacked totals; `generateChartPngBlob()` hardcodes `1920×1080` regardless of `aspectRatio` or `_dpi` (stretching `1:1` and `4:3` charts); `donut_pie` produces a degenerate 0-length SVG arc on a single 100% slice and ignores `options.valueFormat` |
| `DEFECT-60-04` | `Low` | `Mobile & Responsive Layout` / `BEM & Form Accessibility` | Horizontal overflow at `390px` (`421px`) and `320px` (`420px`) from `.c-header__title`; header text collision (`Real-Time Vector Preview4 Categories • 2 Series`); `1:1` (`700×700`) SVG clipped inside `520px` wrapper; 9 undersized touch targets and 1 CSV `<textarea>` with `font-size: 11px` (`< 16px` iOS zoom trigger) |

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-60-01` — DOM XSS & Broken SVG/PNG Export on `&` via Unescaped CSV/Title Interpolation + Missing `DOMPurify`
- **Severity**: `Critical`
- **Category**: `DOM Security & Sanitization`
- **Location**:
  - [`engine.ts#L153-L154`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/engine.ts#L153-L154) (`chartTitle`, `chartSubtitle` in `generateChartSvg`)
  - [`engine.ts#L215-L216`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/engine.ts#L215-L216) (`data.categories[i]`, `s.name` in `generateChartSvg`)
  - [`engine.ts#L288-L404`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/engine.ts#L288-L404) (`cat` labels in `generateChartSvg`)
  - [`csv-vector-chart-builder.component.ts#L329-L331`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/csv-vector-chart-builder.component.ts#L329-L331) (`sanitizedSvg`)
- **Audit Evidence & Reproduction Steps**:
  1. Navigate to `http://127.0.0.1:4300/tools/csv-vector-chart-builder`.
  2. Paste `"Category,Val\n\"Test</text><img src=x onerror=\"\"window.__xss60=true\"\"><text>\",100"` into the CSV textarea (or type `<img src=x onerror="window.__xss60=true">` into **Chart Title**).
  3. `generateChartSvg()` interpolates `options.chartTitle`, `options.chartSubtitle`, `data.categories[c]`, and `data.series[s].name` directly into `<text>` tags without XML escaping, and `sanitizedSvg` passes the raw SVG to `this.sanitizer.bypassSecurityTrustHtml(this.svgOutput())` without `DOMPurify.sanitize()`.
  4. Headless Chrome audit verified `window.__xss60 === true` immediately.
  5. Furthermore, when a user enters a normal business category containing `&` (e.g., `R&D,100` or `Sales & Marketing,250`), the unescaped `&` creates invalid XML inside `<svg>`, which breaks the SVG preview and causes `generateChartPngBlob()` (`img.src = url`) to fire `img.onerror` and resolve a broken `61-byte` 1×1 transparent PNG!
- **Root Cause Analysis**:
  - Direct violation of `AGENTS.md` §9. Neither XML entity escaping (`escapeXml()`) in `engine.ts` nor `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })` in the component is performed.

### `DEFECT-60-02` — `generateChartPdf()` Ignores `options.chartType` and Always Exports a Vertical Bar Chart
- **Severity**: `High`
- **Category**: `Engine Logic`
- **Location**:
  - [`engine.ts#L416-L494`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/engine.ts#L416-L494) (`generateChartPdf`)
- **Audit Evidence & Reproduction Steps**:
  1. Select `Donut / Pie Chart`, `Smooth Line Chart`, `Stacked Area Chart`, or `Horizontal Bar Chart` in **Chart Type**.
  2. Click **Download Executive PDF**.
  3. Open the downloaded PDF: regardless of the selected `chartType`, `generateChartPdf()` (`lines 468-484`) always executes a vertical bar chart loop (`doc.rect(bx, by, Math.max(2, barW - 2), bH, 'F')`), and omits the legend, data labels, and gridlines.
- **Root Cause Analysis**:
  - `generateChartPdf()` was only written with a single hardcoded vertical bar chart loop (`lines 460-484`) and never branches on `options.chartType` (`vertical_bar`, `horizontal_bar`, `smooth_line`, `stacked_area`, `donut_pie`).

### `DEFECT-60-03` — Unstacked `stacked_area` Math, Hardcoded `1920×1080` PNG Aspect Ratio Distortion, and Single-Slice Donut Bug
- **Severity**: `Medium`
- **Category**: `Engine Logic`
- **Location**:
  - [`engine.ts#L171-L204`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/engine.ts#L171-L204) (`donut_pie` in `generateChartSvg`)
  - [`engine.ts#L350-L391`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/engine.ts#L350-L391) (`stacked_area` in `generateChartSvg`)
  - [`engine.ts#L499-L532`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/engine.ts#L499-L532) (`generateChartPngBlob`)
- **Audit Evidence & Reproduction Steps**:
  1. Select `Stacked Area Chart`: both `smooth_line` and `stacked_area` run the exact same loop (`lines 350-391`), plotting each series independently from `zeroY` (`const val = seriesData.values[c] ?? 0; const y = zeroY - (val / yRange) * plotH;`) rather than stacking cumulative values `prevCum[c] + val` and closing the polygon along `prevCum[c]`.
  2. Select `1:1 Square (700×700)` or `4:3 Standard (800×600)` and click **Export 300 DPI PNG**: `generateChartPngBlob()` (`lines 504-505`) hardcodes `canvas.width = 1920; canvas.height = 1080;` and ignores `_dpi`, stretching the `700×700` square SVG into a horizontally distorted `1920×1080` image (`functional-donut-1x1.png`).
  3. In `Donut / Pie Chart` mode with 1 category (`Category,Val\nOnlyOne,100`), `sliceAngle = 2 * Math.PI`, so `(x1, y1)` and `(x2, y2)` are identical and the SVG `<path d="M x1 y1 A r r 0 1 1 x2 y2 ...">` renders nothing (`0`-length arc). Furthermore, donut slice labels (`line 194`) hardcode `${pct}%` instead of honoring `options.valueFormat` (`currency_usd`, `currency_eur`, `compact`, `number`).
- **Root Cause Analysis**:
  - `stacked_area` shares the unstacked line coordinate loop instead of computing cumulative series totals per category `c`.
  - `generateChartPngBlob()` ignores the SVG's `getAspectRatioDimensions(options.aspectRatio)` and `_dpi` parameter (`scale = _dpi / 96`).
  - SVG elliptical arc `A` commands cannot draw a full `360°` circle when start and end points coincide unless clamped to `2 * Math.PI - 0.0001` (or split into two `180°` arcs).

### `DEFECT-60-04` — Mobile Horizontal Overflow, Header Collision, Clipped `1:1` SVG Preview, and Small Touch Targets / `<16px` Textarea
- **Severity**: `Low`
- **Category**: `Mobile & Responsive Layout` / `BEM & Form Accessibility`
- **Location**:
  - [`csv-vector-chart-builder.component.ts#L39-L46`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/csv-vector-chart-builder.component.ts#L39-L46)
  - [`csv-vector-chart-builder.component.ts#L109-L116`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/csv-vector-chart-builder.component.ts#L109-L116)
  - [`csv-vector-chart-builder.component.ts#L258-L275`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/csv-vector-chart-builder.component.ts#L258-L275)
- **Audit Evidence & Reproduction Steps**:
  1. At `390×844` and `320×568`, `scrollWidth` is `421px` / `420px` due to `.c-header__title`.
  2. In `.c-card__header.l-extremo` (`line 258`), missing `.l-extremo__area-izquierda` / `.l-extremo__area-derecha` causes `Real-Time Vector Preview4 Categories • 2 Series` to collide.
  3. Switching to `1:1 Square` (`700×700` SVG) inside `<div style="max-height: 520px">` inside flex-centered `.c-preview` clips the top and bottom of the chart (`functional-donut-1x1.png`).
  4. 9 controls (`2` text inputs `28px`, `4` selects `21px`, `3` checkboxes `13×13px`) and the `Upload .csv` button (`11px`) are under `32px`, and the CSV `<textarea>` has `font-size: 11px` (`< 16px` iOS zoom trigger).
- **Root Cause Analysis**:
  - Missing `.l-extremo__area-*` classes, fixed `<svg width="..." height="...">` without `max-height: 480px; width: 100%; height: auto` CSS scaling, inline `font-size: 11px` on `<textarea>`, and unstyled form inputs.

---

## 3. Target Acceptance Criteria

1. **Full XSS Protection & Valid XML Escaping (`DEFECT-60-01`)**:
   - `generateChartSvg()` MUST escape all user/CSV text (`options.chartTitle`, `options.chartSubtitle`, `data.categories[c]`, `data.series[s].name`, formatted values) via `escapeXml()`.
   - `sanitizedSvg` MUST sanitize the generated SVG markup with `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })` before `DomSanitizer.bypassSecurityTrustHtml()`.
   - CSV cells containing `&` (e.g., `R&D,100`) MUST render valid SVG XML and export a full-resolution PNG via `generateChartPngBlob()`, and `<img src=x onerror=...>` payloads MUST NOT execute JS.
2. **Multi-Chart Type Executive PDF Export (`DEFECT-60-02`)**:
   - `generateChartPdf()` MUST support all 5 chart types (`vertical_bar`, `horizontal_bar`, `smooth_line`, `stacked_area`, `donut_pie`), draw the legend (when `options.showLegend` is true), draw gridlines (when `options.showGridlines` is true), and render data labels (when `options.showDataLabels` is true).
3. **True Stacked Area Math, Aspect-Accurate 300 DPI PNG & Single-Slice Donut Fix (`DEFECT-60-03`)**:
   - In `stacked_area` mode, `generateChartSvg()` and `generateChartPdf()` MUST compute cumulative stacked totals across series per category (`cumVal[c]`), scale the Y-axis maximum to the highest stacked category sum, and draw closed polygons between the current series' cumulative line and the previous series' baseline.
   - `generateChartPngBlob(svgContent, dpi)` MUST parse the SVG's `viewBox` / `width` & `height` dimensions and scale the canvas by `dpi / 96` (e.g., `16:9` `960×540` at `300 DPI` → `3000×1688`, `1:1` `700×700` at `300 DPI` → `2188×2188`) preserving the exact aspect ratio.
   - In `donut_pie` mode, a single 100% slice MUST clamp `sliceAngle` to `2 * Math.PI - 0.0001` so the SVG arc renders a full ring, and slice labels MUST format values according to `options.valueFormat`.
4. **Responsive BEM Layout, Uncropped Preview & Accessible Controls (`DEFECT-60-04`)**:
   - Zero horizontal overflow (`scrollWidth <= clientWidth`) at `1440px`, `390px`, and `320px`.
   - Add `.l-extremo__area-izquierda` and `.l-extremo__area-derecha` to `.c-card__header.l-extremo`.
   - Scale `.c-preview svg` (`width: 100%; height: auto; max-height: 480px; display: block`) so `16:9`, `4:3`, and `1:1` charts fit completely inside `.c-preview` without clipping.
   - Enforce `>= 44px` touch targets on all inputs/selects/checkbox labels/buttons and `font-size >= 16px` on the CSV `<textarea>`.
