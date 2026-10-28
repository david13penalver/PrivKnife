# Remediation Specification: Side-by-Side Code & Contract Diff Checker

> **Spec ID**: 85  
> **Remediates Tool**: 55 — Side-by-Side Code & Contract Diff Checker (`specs/55 - Side-by-Side Code & Contract Diff Checker/`)  
> **Slug**: `diff-checker`  
> **Category**: `dev`  
> **Route**: `/tools/diff-checker`  
> **Audit Reference**: [`tools_31_60_audit.md#tool-55`](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-55)  
> **Current Audit Verdict**: Functional: `✅ Works` | Mobile: `⚠️ Minor issues` | Overall: `⚠️`  
> **Status**: Ready for Implementation  
> **Priority**: High

---

## 1. Executive Summary & Audit Baseline

During the automated and manual headless Chrome audit across Desktop (`1366×900`), Mobile (`390×844`), and Small Mobile (`320×640`), the **Side-by-Side Code & Contract Diff Checker** (`diff-checker`) demonstrated working sample presets (**Code Refactor**, **Legal Contract**), granularity switches (`Word`, `Char`, `Line`), normalization toggles (`Ignore Whitespace`, `Ignore Case`), local file uploads, clipboard copy, and `.patch` / `.html` exports with zero external network requests.

However, the audit uncovered five notable defects and directive gaps that must be remediated:
1. **Hunk Line-Ordering Corruption (`High`)**: Within contiguous removed/added blocks, `computeDiff()` emits all paired `modified` lines *before* any unpaired `removed` lines. In the **Code Refactor** sample, original line 6 (`return total;`) pairs with modified line 4 and is emitted above original lines 4–5 (`total = total + items[i].price;` and `}`), reordering the original file's lines and corrupting both line numbers and the exported unified `.patch` file.
2. **Main-Thread $O(M \times N)$ Synchronous LCS & Missing Web Worker (`Medium` — Directive 3)**: `lcsDiff()` builds a full 2D dynamic programming table (`(m + 1) × (n + 1)` arrays) synchronously inside an Angular `computed()` signal on every keystroke, without a Web Worker (`worker.ts`) or input debouncing, and allocates an unused `new Blob([patch])` on every evaluation.
3. **Dark Mode Contrast Failure (`Medium`)**: Diff table rows and gutters hardcode light-mode hex backgrounds (`#f0fdf4`, `#fef2f2`, `#fffbeb`, `#f8fafc`, `#f1f5f9`) without dark-theme overrides or theme-aware CSS custom properties.
4. **Mobile & 320px Responsive Issues (`Low`)**: At `320px`, `.c-header__title` causes horizontal page overflow (`scrollWidth: 369px` vs `320px` viewport). On `390px`/`320px`, **Side-by-Side** view crams two code columns and two 40px line-number gutters into ~350px with `word-break: break-all`, breaking identifiers every 12–15 characters. Native checkboxes are `13×13px`, and `.diff-input-textarea` uses `font-size: 0.8125rem` (`13px` < `16px`), triggering iOS Safari auto-zoom.
5. **Dead Options & Non-BEM Styling (`Low`)**: `syntaxLanguage` and `syncScroll` signals/options are never wired to UI controls or used during rendering, and local styles use unprefixed classes (`.toolbar-grid`, `.stat-pill`, `.diff-table`, `.diff-row`) instead of PrivKnife's `c-` / `l-` / `g--` BEM namespaces.

---

## 2. Detailed Defect Registry & Root Cause Analysis

### DEFECT-55-01: Contiguous Change Hunk Reorders Unpaired Removed Lines After Paired Modified Lines
- **Severity**: High
- **Category**: Engine Logic
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/diff-checker/engine.ts#L218-L292)
- **Symptom & Evidence**: In the **Code Refactor** sample preset (7 original lines vs 5 modified lines), original lines 2–6 are removed and modified lines 2–4 are added. Because original line 6 (`return total;`) has similarity $\ge 0.3$ with modified line 4 (`return subtotal * (1 + taxRate);`), `computeDiff()` emits `return total;` as row 4 (`leftLineNumber: 4`) *before* original lines 4 (`total = total + items[i].price;`, assigned `leftLineNumber: 5`) and 5 (`}`, assigned `leftLineNumber: 6`). Both the UI table (`mobile-populated.png`) and exported `diff_report.patch` output lines in the wrong order.
- **Root Cause**: `computeDiff()` collects `removedBlock` and `addedBlock`, then runs a nested loop (`lines 234–267`) that immediately pushes all matched `modified` pairs into `lines[]` first, followed by a second loop (`lines 270–279`) that pushes all unmatched `removedBlock` items, and a third loop (`lines 282–291`) that pushes all unmatched `addedBlock` items. Furthermore, `r` and `a` are allowed to match non-monotonically without flushing preceding unmatched removals (`r' < r`) or additions (`a' < a`).
- **Remediation Specification**:
  - Maintain monotonic cursors `rCursor = 0` and `aCursor = 0` while scanning `removedBlock` and `addedBlock`.
  - When `removedBlock[r]` (for `r >= rCursor`) matches `addedBlock[a]` (for `a >= aCursor`) with similarity $\ge 0.3$:
    1. First flush any preceding unmatched removed lines `rCursor .. r - 1` as `type: 'removed'` (incrementing `leftLineNum++` in true source order).
    2. Next flush any preceding unmatched added lines `aCursor .. a - 1` as `type: 'added'` (incrementing `rightLineNum++` in true modified order).
    3. Emit the paired `type: 'modified'` line for `(removedBlock[r], addedBlock[a])` (incrementing both `leftLineNum++` and `rightLineNum++`).
    4. Advance `rCursor = r + 1` and `aCursor = a + 1`.
  - After scanning, flush any trailing unmatched removed lines `rCursor .. removedBlock.length - 1` and added lines `aCursor .. addedBlock.length - 1`.

### DEFECT-55-02: Synchronous Main-Thread $O(M \times N)$ LCS Without Web Worker & Redundant Blob Allocation
- **Severity**: Medium
- **Category**: Web Worker & Performance / Memory Hygiene
- **Location**: [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/diff-checker/engine.ts#L12-L53), [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/diff-checker/engine.ts#L326), [`diff-checker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/diff-checker/diff-checker.component.ts#L607-L621)
- **Symptom & Evidence**: Every keystroke in either textarea triggers `computeDiff()` synchronously on the main UI thread inside `computed()`, allocating a full `(m + 1) × (n + 1)` 2D number array for lines plus 2D arrays for word/character sub-tokens, and constructing a `new Blob([patch])` even when no download is requested.
- **Root Cause**: No `worker.ts` was implemented for `diff-checker`, and `computeDiff()` is bound directly inside `readonly result = computed(...)`.
- **Remediation Specification**:
  - Create `src/app/tools/dev/diff-checker/worker.ts` wrapping `computeDiff()` with typed request/response messages (`DiffWorkerRequest` / `DiffWorkerResponse`) and a monotonically increasing `requestId` so stale worker responses are discarded.
  - Keep a synchronous fallback to `computeDiff()` when `typeof Worker === 'undefined'` (such as in unit test environments).
  - Terminate the worker cleanly in `ngOnDestroy()`.

### DEFECT-55-03: Hardcoded Light-Mode Colors Break Dark Mode Contrast
- **Severity**: Medium
- **Category**: Theme Contrast
- **Location**: [`diff-checker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/diff-checker/diff-checker.component.ts#L530-L585)
- **Symptom & Evidence**: `.diff-num` (`background: #f8fafc; color: #94a3b8; border-right: 1px solid #e2e8f0`), `.diff-row` (`border-bottom: 1px solid #f1f5f9`), `.diff-row--added` (`background: #f0fdf4`), `.diff-row--removed` (`background: #fef2f2`), and `.diff-row--modified` (`background: #fffbeb`) hardcode light-mode backgrounds without setting contrasting dark text or dark-theme surface colors, making unchanged and modified text unreadable in dark mode (where inherited text color is light).
- **Root Cause**: Component styles use static light hex codes instead of CSS custom properties or explicit row text colors.
- **Remediation Specification**:
  - Extract styles into `diff-checker.component.scss` using theme-aware CSS variables (`var(--color-surface)`, `var(--color-surface-alt)`, `var(--color-border)`, `var(--color-text-primary)`) and `color-mix()` / dark-compatible semantic row backgrounds with explicit readable foreground colors in both light and dark modes.

### DEFECT-55-04: Horizontal Overflow at 320px, Cramped Mobile Side-by-Side Table, Small Touch Targets & iOS Auto-Zoom
- **Severity**: Low
- **Category**: Mobile & Responsive Layout / BEM & Form Accessibility
- **Location**: [`diff-checker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/diff-checker/diff-checker.component.ts#L33-L44), [`diff-checker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/diff-checker/diff-checker.component.ts#L457-L475), [`diff-checker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/diff-checker/diff-checker.component.ts#L519-L558)
- **Symptom & Evidence**:
  - At `320px`, `document.documentElement.scrollWidth` is `369px` (`hasHorizontalScroll: true`) due to `.c-header__title` and non-wrapping footer buttons.
  - At `390px` (`mobile-populated.png`), the 4-column side-by-side table (`40px` + `calc(50% - 40px)` + `40px` + `calc(50% - 40px)`) with `word-break: break-all` breaks identifiers mid-word (`func-tion calc-ulateTotal(it-ems)`).
  - The 2 native checkboxes (`Ignore Whitespace`, `Ignore Case`) measure `13×13px` (`smallTouchTargetCount: 2`), and `.diff-input-textarea` has `font-size: 0.8125rem` (`13px` < `16px`, `inputsUnder16px_iOSZoom: 2`).
- **Root Cause**: Missing `overflow-wrap: anywhere` / `min-width: 0` on header/grid containers, missing `min-width` on `.diff-table` inside `.diff-table-container` (`overflow-x: auto`), unstyled checkbox labels without `min-height: 38px`, and `13px` textarea font size.
- **Remediation Specification**:
  - Add `min-width: 0` and `overflow-wrap: anywhere` to `.c-header__title-group` and `.c-header__title`, and `flex-wrap: wrap` to `.c-card__footer.l-extremo` and `.c-diff-checker__export-actions`.
  - Give `.c-diff-checker__table--split` a `min-width: 560px` inside `.c-diff-checker__table-container` (`overflow-x: auto; -webkit-overflow-scrolling: touch`) with `word-break: break-word` so narrow mobile viewports scroll the split table smoothly rather than mangling every identifier, while keeping `unified_inline` at `100%` width.
  - Set `.c-diff-checker__textarea` `font-size: 1rem` (`16px`) on `< 768px` viewports to prevent iOS Safari auto-zoom, and give `.c-diff-checker__checkbox-label` `min-height: 38px` with `18×18px` checkbox inputs.

### DEFECT-55-05: Unused `syntaxLanguage` / `syncScroll` Options & Non-BEM Class Names
- **Severity**: Low
- **Category**: Spec Conformance / BEM & Form Accessibility
- **Location**: [`diff-checker.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/diff-checker/diff-checker.component.ts#L431-L604)
- **Symptom & Evidence**: `syntaxLanguage` and `syncScroll` exist in `DiffCheckerOptions` and component signals (`lines 602–603`) but are never exposed in the toolbar or used in the template/engine. Local classes (`.toolbar-grid`, `.stat-pill`, `.diff-table`, `.diff-row`, `.empty-diff`) violate `AGENTS.md` §5.1 BEM prefix rules (`c-`, `l-`, `g--`).
- **Root Cause**: Incomplete feature wiring and inline non-BEM CSS.
- **Remediation Specification**:
  - Expose a `syntaxLanguage` selector (`plaintext`, `javascript`, `python`, `html`, `css`, `json`, `markdown`) and `syncScroll` checkbox in the toolbar, wire synchronized scroll between the Original and Modified input textareas when `syncScroll()` is enabled, and apply lightweight token/keyword highlighting class hooks or language badge metadata in the viewer and HTML report.
  - Rename all custom component classes to `.c-diff-checker__*` BEM elements in `diff-checker.component.scss`.

---

## 3. Target Acceptance Criteria

### 3.1 Functional & Spec Conformance
- [ ] Contiguous removed/added blocks in `computeDiff()` preserve strict monotonic line order and accurate `leftLineNumber` / `rightLineNumber` sequencing in both the visual table and `.patch` output (in the **Code Refactor** preset, original lines 4–5 `total = total + items[i].price;` and `}` appear as lines 4–5 *before* line 6 `return total;`).
- [ ] All presets (**Code Refactor**, **Legal Contract**), view modes (**Side-by-Side**, **Unified Inline**), granularities (**Word**, **Char**, **Line**), normalization toggles (**Ignore Whitespace**, **Ignore Case**), `syntaxLanguage` selector, and `syncScroll` textarea scroll synchronization function reactively.
- [ ] Exporting `.patch` and `.html` produces valid, non-empty deliverables with properly escaped HTML and accurate line ordering.

### 3.2 Mobile & Responsive Layout
- [ ] `document.documentElement.scrollWidth <= document.documentElement.clientWidth` (`hasHorizontalScroll: false`) at `1366px`, `390px`, and `320px`.
- [ ] All interactive buttons, selects, and checkbox labels meet `>= 32px` (target `>= 38px`) touch target height (`smallTouchTargetCount === 0`).
- [ ] Textareas and selects have `font-size >= 16px` on mobile (`inputsUnder16px_iOSZoom === 0`).
- [ ] Both Light and Dark themes render diff rows, line-number gutters, and token highlights (`<mark>`) with WCAG AA readable contrast.

### 3.3 `AGENTS.md` Prime Directives
- [ ] **Directive 1 & 2**: Zero network requests (`externalRequests: []`) and zero telemetry.
- [ ] **Directive 3**: Diff computation is offloaded to `worker.ts` when `Worker` is available, with synchronous fallback in unit tests.
- [ ] **Directive 4**: All Object URLs are revoked immediately after download and in `ngOnDestroy()`, and the Web Worker is terminated in `ngOnDestroy()`.
- [ ] **BEM Architecture**: All custom classes follow `.c-diff-checker__*` BEM conventions.
