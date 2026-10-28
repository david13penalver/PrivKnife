# Remediation Specification — SVG Optimizer, Path Cleaner & React/Vue Exporter

> **Spec ID**: `84`  
> **Remediates Tool**: `54 - SVG Optimizer, Path Cleaner & React_Vue Exporter`  
> **Slug**: `svg-optimizer-cleaner`  
> **Category**: `dev`  
> **Route**: `/tools/svg-optimizer-cleaner`  
> **Audit Reference**: [`tools_31_60_audit.md#tool-54`](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-54)  
> **Current Audit Verdict**: Functional `✅ Works` | Mobile `❌ Poor` | Overall `⚠️`  
> **Status**: `Ready for Implementation`  
> **Priority**: `High`

---

## 1. Executive Summary & Audit Baseline

During the headless-Chrome functional and responsive audit across Desktop (`1366×900`), Mobile (`390×844`), and Small Mobile (`320×640`), the **SVG Optimizer, Path Cleaner & React/Vue Exporter** (`/tools/svg-optimizer-cleaner`) successfully minified bloated SVGs (`1.2 KB` → `373.0 B`, `-68.5%`), rounded path/shape coordinates, converted colors to short hex, rendered before/after visual previews, and exported all five target formats (`.svg`, `.tsx`, `.vue`, `.svelte`, and `.txt` Data URI).

However, the audit identified four concrete defects across DOM security (`AGENTS.md` Section 9), mobile responsive layout, unreferenced ID cleanup + group collapsing, and BEM CSS class naming:
1. **Unsanitized User SVG Injection Into `[innerHTML]` (`DEFECT-54-01` — High Security / `AGENTS.md` Section 9 Violation)**: `safeOriginalSvg` and `safeOptimizedSvg` in `svg-optimizer-cleaner.component.ts` pass raw user-supplied SVG (`this.inputSvg()` and `res?.optimizedSvg`) directly into `this.sanitizer.bypassSecurityTrustHtml(...)` without sanitizing via `DOMPurify` (or stripping `<script>`, `<foreignObject>`, and `on*` event handler attributes). Pasting an SVG with `<svg onload="alert(1)">` or `<script>` executes arbitrary JavaScript in the page context.
2. **Horizontal Overflow at 390px and 320px (`scrollWidth: 432px`) & Cramped Card Header (`DEFECT-54-02` — High)**: Both `390px` (`scrollWidth: 432px`) and `320px` (`scrollWidth: 432px`) overflow horizontally (`hasHorizontalScroll: true`), the `.c-card__header.l-extremo` in the right panel (`Optimization Output` + `Visual Preview` / `Code Inspector` buttons) does not wrap on narrow screens, 7 controls measure below 32px height (`16px` range slider, `13×13px` checkboxes, `28px` text input), and hardcoded light colors (`#fafafa`, `#e2e8f0`) ignore dark mode.
3. **Incomplete Unused ID Cleanup Prevents Collapsing Redundant `<g>` Groups (`DEFECT-54-03` — Medium)**: In `SAMPLE_BLOATED_SVG`, `<g id="OuterGroup"><g id="InnerUselessGroup">` remain in the optimized output (`<g id="OuterGroup"><g id="InnerUselessGroup">...`) even when both `Clean Unused Editor IDs` and `Collapse Redundant Groups (<g>)` are checked, because `cleanEditorAttributes()` only removes `id` values matching `/^(Layer_\d+|Page-\d+|Artboard-\d+|path-\d+|g\d+|svg\d+)$/i`.
4. **Non-BEM CSS Class Names (`DEFECT-54-04` — Low)**: Custom classes in `svg-optimizer-cleaner.component.ts` (`.options-grid`, `.format-buttons`, `.tab-buttons`, `.stats-banner`, `.stat-item`, `.preview-split`, `.preview-box`, `.code-container`, `.empty-state`) violate `AGENTS.md` Section 5.1, which requires every class to use `.c-`, `.l-`, or `.g--` namespace prefixes.

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-54-01` — Unsanitized User SVG Passed to `bypassSecurityTrustHtml()` (XSS Vulnerability)
- **Severity**: `High`
- **Category**: `DOM Security & Sanitization`
- **Location**: [`svg-optimizer-cleaner.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/svg-optimizer-cleaner/svg-optimizer-cleaner.component.ts#L527-L534) and [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/svg-optimizer-cleaner/engine.ts#L119-L131)
- **Symptom & Evidence**:
  ```ts
  readonly safeOriginalSvg = computed<SafeHtml>(() => {
    return this.sanitizer.bypassSecurityTrustHtml(this.inputSvg());
  });
  readonly safeOptimizedSvg = computed<SafeHtml>(() => {
    const res = this.result();
    return this.sanitizer.bypassSecurityTrustHtml(res?.optimizedSvg || '');
  });
  ```
  Neither `safeOriginalSvg` nor `safeOptimizedSvg` sanitizes executable elements (`<script>`, `<foreignObject>`, `<iframe>`) or inline event handlers (`onload`, `onerror`, `onclick`, `onmouseover`, `href="javascript:..."`), directly violating `AGENTS.md` Section 9.
- **Root Cause**: `bypassSecurityTrustHtml()` disables Angular's built-in HTML sanitizer without running `DOMPurify.sanitize()` or an SVG security sanitizer first.
- **Remediation Specification**:
  - Implement a dedicated `sanitizeSvgForDom(svgMarkup: string): string` function in `engine.ts` (using `DOMPurify.sanitize(svgMarkup, { USE_PROFILES: { svg: true, svgFilters: true } })` if `dompurify` is installed, plus an explicit DOM-tree security pass in `engine.ts` that strips `<script>`, `<foreignObject>`, `<iframe>`, `<object>`, `<embed>`, all `on*` attributes, and `javascript:`/`data:text/html` URLs in `href`/`xlink:href`).
  - Always strip `<script>` and `on*` event attributes during `optimizeSvg()` in `engine.ts` as well so exported SVG/React/Vue components never contain embedded XSS vectors.
  - Wrap both `safeOriginalSvg` and `safeOptimizedSvg` in `sanitizeSvgForDom(...)` before passing to `this.sanitizer.bypassSecurityTrustHtml(...)`.

### `DEFECT-54-02` — Horizontal Overflow at 390px and 320px (`scrollWidth: 432px`), Small Touch Targets & Hardcoded Colors
- **Severity**: `High`
- **Category**: `Mobile & Responsive Layout` / `Theme Contrast`
- **Location**: [`svg-optimizer-cleaner.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/svg-optimizer-cleaner/svg-optimizer-cleaner.component.ts#L20-L31) and [`svg-optimizer-cleaner.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/svg-optimizer-cleaner/svg-optimizer-cleaner.component.ts#L352-L488)
- **Symptom & Evidence**: At `390px` and `320px`, `document.documentElement.scrollWidth` is `432px` (`hasHorizontalScroll: true`), 7 form controls measure under 32px height (`range` slider `16px`, 5 checkboxes `13×13px`, `#compName` input `28px`), and `.preview-box` / `.preview-tag` / `.code-header` use hardcoded light-theme hex colors.
- **Root Cause**: Missing `min-width: 0` on `.l-columns__area`, unbreakable header title, non-wrapping `.c-card__header.l-extremo`, and unstyled input/checkbox/range heights.
- **Remediation Specification**:
  - Add `min-width: 0` on `.l-columns__area`, `overflow-wrap: anywhere` on `.c-header__title`, and `flex-wrap: wrap; gap: 0.5rem` on `.c-card__header.l-extremo` and `.c-stats-banner`.
  - Enlarge touch targets: `.c-input__field` (`min-height: 38px; font-size: 1rem`), `.c-input__textarea` (`font-size: 1rem` on mobile), `.c-input__range` (`height: 24px`), and `.c-checkbox-label` (`min-height: 36px` with `18×18px` checkboxes).
  - Replace hardcoded `#fafafa` and `#e2e8f0` backgrounds with CSS custom properties (`var(--color-surface-subtle)`, `var(--color-border)`).

### `DEFECT-54-03` — `cleanEditorAttributes()` Leaves Unreferenced Non-Numeric Group IDs Intact
- **Severity**: `Medium`
- **Category**: `Engine Logic` / `Spec Conformance`
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/svg-optimizer-cleaner/engine.ts#L171-L184)
- **Symptom & Evidence**: In `SAMPLE_BLOATED_SVG`, `<g id="OuterGroup"><g id="InnerUselessGroup">` are never referenced anywhere in the SVG, yet `optimizeSvg(SAMPLE_BLOATED_SVG, DEFAULT_SVG_OPTIONS)` outputs `<g id="OuterGroup"><g id="InnerUselessGroup">...` instead of stripping the unused IDs and collapsing both redundant `<g>` wrappers.
- **Root Cause**: Line 175 restricts ID cleanup to `/^(Layer_\d+|Page-\d+|Artboard-\d+|path-\d+|g\d+|svg\d+)$/i`. Because `OuterGroup` and `InnerUselessGroup` do not end in digits, their `id` attributes are kept, which in turn causes `collapseGroups()` (`const hasAttributes = g.attributes.length > 0`) to skip them.
- **Remediation Specification**:
  - When `cleanupIds` is `true`, remove any `id` attribute on an element whose value is not referenced anywhere in the SVG document via `url(#${idVal})`, `href="#${idVal}"`, or `xlink:href="#${idVal}"`.

### `DEFECT-54-04` — Non-BEM CSS Class Names in Component Template and Styles
- **Severity**: `Low`
- **Category**: `BEM & Form Accessibility`
- **Location**: [`svg-optimizer-cleaner.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/svg-optimizer-cleaner/svg-optimizer-cleaner.component.ts#L112-L488)
- **Symptom & Evidence**: Classes such as `.options-grid`, `.format-buttons`, `.tab-buttons`, `.stats-banner`, `.stat-item`, `.preview-split`, `.preview-box`, `.code-container`, `.code-block`, and `.empty-state` lack `.c-` / `.l-` / `.g--` prefixes.
- **Root Cause**: Component styles were written without the `c-svg-optimizer__*` BEM namespace.
- **Remediation Specification**: Add BEM-compliant `.c-svg-optimizer__*` classes (keeping any existing selectors aliased if asserted by unit tests) in accordance with `AGENTS.md` Section 5.1.

---

## 3. Target Acceptance Criteria

### 3.1. Security, Functional & Spec Conformance
- [ ] **AC-54-01 (DOM Sanitization of User SVG)**: Pasting or uploading an SVG containing `<script>alert(1)</script>`, `<foreignObject>`, or `<svg onload="alert(1)">` strips all executable tags and `on*` event attributes from `safeOriginalSvg()`, `safeOptimizedSvg()`, and `result.optimizedSvg`.
- [ ] **AC-54-02 (Complete Unused ID Stripping & Group Collapsing)**: When `cleanupIds: true` and `collapseUselessGroups: true`, unreferenced IDs (including `OuterGroup` and `InnerUselessGroup` in `SAMPLE_BLOATED_SVG`) are stripped and their now-attributeless `<g>` wrappers are collapsed, further reducing byte count and node count.
- [ ] **AC-54-03 (All 5 Code Exports)**: `.svg`, `.tsx`, `.vue`, `.svelte`, and `.txt` (Data URI) exports generate valid code and trigger clean downloads.

### 3.2. Mobile & Responsive Layout & Touch Targets
- [ ] **AC-54-04 (Zero Horizontal Overflow)**: `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at `1366px`, `390px`, and `320px`.
- [ ] **AC-54-05 (Touch Targets & Dark Mode)**: All inputs, range sliders, and checkbox labels meet minimum touch-target dimensions (`>= 36px` height for inputs/checkboxes, `>= 24px` for range sliders) and use CSS custom properties for light/dark theme contrast.

### 3.3. `AGENTS.md` Prime Directives
- [ ] **AC-54-06 (Directives 1 & 2 — Zero Network)**: Zero external network requests during all optimization and export workflows.
- [ ] **AC-54-07 (Directive 4 — Memory Hygiene)**: All `activeObjectUrls` are revoked via `URL.revokeObjectURL()` on download, reset, and `ngOnDestroy()`.
