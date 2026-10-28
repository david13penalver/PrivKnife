# TDD Remediation Plan — SVG Optimizer, Path Cleaner & React/Vue Exporter

> **Spec ID**: `84`  
> **Remediates Tool**: `54 - SVG Optimizer, Path Cleaner & React_Vue Exporter` (`/tools/svg-optimizer-cleaner`)  
> **Methodology**: `Strict Test-Driven Development (TDD) via Vertical Slices: Red → Green → Refactor`

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/dev/svg-optimizer-cleaner/
├── engine.ts                                   # Add sanitizeSvgMarkup() stripping <script>/<foreignObject>/on* handlers/javascript: URLs, and strip all unreferenced IDs when cleanupIds is true
├── engine.spec.ts                              # Add unit tests for XSS payload sanitization and collapsing of <g id="OuterGroup"><g id="InnerUselessGroup"> in SAMPLE_BLOATED_SVG
├── svg-optimizer-cleaner.component.ts          # Sanitize SVG before bypassSecurityTrustHtml(), add BEM .c-svg-optimizer__* classes, fix 390px/320px overflow, enlarge touch targets & dark-mode variables
└── svg-optimizer-cleaner.component.spec.ts     # Add security test asserting <script> and onload= are stripped from .svg-render-area innerHTML
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Security Sanitization Boundary (`engine.ts` / `engine.spec.ts`)
- **Functions under test**:
  - `sanitizeSvgMarkup(svgContent: string)`
  - `optimizeSvg(svgContent: string, options: SvgOptimizerCleanerOptions)`
- **Assertions that catch current bugs**:
  - Calling `optimizeSvg('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>evil()</script><circle cx="10" cy="10" r="5" onclick="evil()"/></svg>', DEFAULT_SVG_OPTIONS)` produces `optimizedSvg` containing neither `<script`, `onload`, nor `onclick`.
  - Calling `optimizeSvg(SAMPLE_BLOATED_SVG, DEFAULT_SVG_OPTIONS)` strips unreferenced `id="OuterGroup"` and `id="InnerUselessGroup"` and collapses both redundant `<g>` elements so `optimizedSvg` contains no `<g` tags.

### Seam 2: Component DOM Sanitization & State Boundary (`svg-optimizer-cleaner.component.ts` / `.spec.ts`)
- Setting `component.setInputSvg('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><rect width="10" height="10"/></svg>')` and running `fixture.detectChanges()` renders `.svg-render-area` without `<script>` or `onload` in both the "Before Optimization" and "After Optimization" preview boxes.

### Seam 3: Mobile Responsive, BEM & Theme Styling Boundary (`svg-optimizer-cleaner.component.ts`)
- `.l-columns__area` has `min-width: 0`; `.c-header__title` has `overflow-wrap: anywhere`; `.c-card__header.l-extremo` wraps cleanly at `320px`; `.c-input__field` has `min-height: 38px; font-size: 16px`; `.c-input__range` has `height: 24px`; `.c-checkbox-label` has `min-height: 36px`.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: SVG XSS Sanitization in Engine & Component Preview (`DEFECT-54-01`)
1. **Red**:
   - In `engine.spec.ts`, add a test passing an SVG containing `<script>`, `<foreignObject>`, `onload="alert(1)"`, and `href="javascript:alert(1)"` to `optimizeSvg()` and `sanitizeSvgMarkup()`, asserting all executable elements and attributes are removed.
   - In `svg-optimizer-cleaner.component.spec.ts`, set `inputSvg` to a malicious SVG and assert neither `.svg-render-area` box in the DOM contains `<script` or `onload`.
2. **Green**:
   - Implement `sanitizeSvgMarkup(svgContent: string)` in `engine.ts` and invoke it inside `optimizeSvg()` and inside `safeOriginalSvg` / `safeOptimizedSvg` in `svg-optimizer-cleaner.component.ts`.
3. **Refactor**: Ensure valid SVG elements, gradients, `viewBox`, and `xlink:href="#localId"` references remain untouched.

### Slice 2: Unreferenced ID Cleanup & Redundant `<g>` Collapsing (`DEFECT-54-03`)
1. **Red**: In `engine.spec.ts`, add a test asserting `optimizeSvg(SAMPLE_BLOATED_SVG, DEFAULT_SVG_OPTIONS).optimizedSvg` does not contain `OuterGroup`, `InnerUselessGroup`, or `<g>`.
2. **Green**: Update `cleanEditorAttributes()` in `engine.ts` so that when `cleanupIds` is `true`, any `id` attribute not referenced via `url(#id)` or `href="#id"` in the document is removed, allowing `collapseGroups()` to collapse the now-attributeless `<g>` elements.
3. **Refactor**: Verify that referenced IDs inside `<defs>` (such as `<linearGradient id="grad1">` used by `fill="url(#grad1)"`) are preserved.

### Slice 3: Mobile 390px/320px Overflow, Touch Targets & BEM Classes (`DEFECT-54-02`, `DEFECT-54-04`)
1. **Red**: Confirm `audit.mjs svg-optimizer-cleaner` currently reports `scrollWidth: 432` at `390px` and `320px` and `smallTouchTargetCount: 7`.
2. **Green**: Update `svg-optimizer-cleaner.component.ts` styles with `min-width: 0` on `.l-columns__area`, `overflow-wrap: anywhere` on `.c-header__title`, wrapping on `.c-card__header.l-extremo` and `.stats-banner`, `38px` input heights, `24px` range slider height, `36px` checkbox label height, CSS theme variables, and `.c-svg-optimizer__*` BEM class names.
3. **Refactor**: Re-run `audit.mjs svg-optimizer-cleaner` to confirm `hasHorizontalScroll: false` at `1366px`, `390px`, and `320px`.
