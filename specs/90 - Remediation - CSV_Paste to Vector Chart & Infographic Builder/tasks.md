# Remediation Tasks: CSV/Paste to Vector Chart & Infographic Builder (Tool 60)

- **Target Tool**: `60` — `csv-vector-chart-builder`
- **Spec Reference**: [`specs/90 - Remediation - CSV_Paste to Vector Chart & Infographic Builder/spec.md`](file:///home/deivision/Projects/Programming/PrivKnife/specs/90%20-%20Remediation%20-%20CSV_Paste%20to%20Vector%20Chart%20&%20Infographic%20Builder/spec.md)
- **Plan Reference**: [`specs/90 - Remediation - CSV_Paste to Vector Chart & Infographic Builder/plan.md`](file:///home/deivision/Projects/Programming/PrivKnife/specs/90%20-%20Remediation%20-%20CSV_Paste%20to%20Vector%20Chart%20&%20Infographic%20Builder/plan.md)

---

## Phase 1: Engine Remediation (`engine.ts`)

- [ ] **Task 1.1 (RED — `DEFECT-60-01`)**: Add failing unit tests in [`csv-vector-chart-builder.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/csv-vector-chart-builder.component.spec.ts) verifying that `generateChartSvg()` escapes `<`, `>`, `&`, `"`, and `'` in `chartTitle`, `chartSubtitle`, `categories`, and `series.name`.
- [ ] **Task 1.2 (GREEN — `DEFECT-60-01`)**: Implement `escapeXml()` in [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/engine.ts) and apply it to all text interpolated into SVG `<text>` nodes.
- [ ] **Task 1.3 (RED — `DEFECT-60-02`, `DEFECT-60-03`)**: Add failing unit tests verifying cumulative `stacked_area` series stacking, single-slice `donut_pie` full-circle arc rendering and `valueFormat` labels, aspect-ratio-preserving `generateChartPngBlob()`, and multi-chart-type `generateChartPdf()` rendering.
- [ ] **Task 1.4 (GREEN — `DEFECT-60-02`, `DEFECT-60-03`)**: Update `generateChartSvg()`, `generateChartPdf()`, and `generateChartPngBlob()` in [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/engine.ts).

---

## Phase 2: Component State & Resource Disposal (`csv-vector-chart-builder.component.ts`)

- [ ] **Task 2.1**: Verify CSV file upload error handling and ensure all temporary object URLs created during SVG, PNG, and PDF exports are revoked via `URL.revokeObjectURL()`.

---

## Phase 3: DOM Security & Sanitization (`csv-vector-chart-builder.component.ts`)

- [ ] **Task 3.1 (RED — `DEFECT-60-01`)**: Add a security unit test in [`csv-vector-chart-builder.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/csv-vector-chart-builder.component.spec.ts) pasting `"Category,Val\n\"Test</text><img src=x onerror=\"\"window.__xss60=true\"\"><text>\",100"` and verifying zero `<img>` or `[onerror]` nodes exist in `.c-preview`.
- [ ] **Task 3.2 (GREEN — `DEFECT-60-01`)**: Sanitize `svgOutput()` with `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })` before calling `DomSanitizer.bypassSecurityTrustHtml()` in [`csv-vector-chart-builder.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/csv-vector-chart-builder.component.ts).

---

## Phase 4: Styling, BEM Compliance & Responsive Layout

- [ ] **Task 4.1 (RED — `DEFECT-60-04`)**: Add DOM assertions in [`csv-vector-chart-builder.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/csv-vector-chart-builder.component.spec.ts) verifying `.l-extremo__area-izquierda`, `.l-extremo__area-derecha`, and `.c-chart-builder__*` BEM classes.
- [ ] **Task 4.2 (GREEN — `DEFECT-60-04`)**: Refactor [`csv-vector-chart-builder.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/csv-vector-chart-builder/csv-vector-chart-builder.component.ts) to scale `<svg>` responsively inside `.c-preview` without clipping `1:1` charts, add `.l-extremo__area-*` classes to card headers, replace inline styles with `.c-chart-builder__*` BEM SCSS, fix `.c-header__title` wrapping (`overflow-wrap: anywhere`), set `font-size: 1rem` (`16px`) on the CSV `<textarea>`, and enforce `>= 44px` touch targets on all controls.

---

## Phase 5: Final Verification & Regression Gate

- [ ] **Task 5.1**: Run `npx vitest run src/app/tools/dev/csv-vector-chart-builder/csv-vector-chart-builder.component.spec.ts` and verify 100% of unit, security, and privacy tests pass.
- [ ] **Task 5.2**: Verify in headless Chrome at `1440×900`, `390×844`, and `320×568` that all chart aspect ratios (`16:9`, `4:3`, `1:1`) render uncropped, `scrollWidth <= clientWidth`, `smallTouchTargets === 0`, and `inputsUnder16px_iOSZoom === 0`.
