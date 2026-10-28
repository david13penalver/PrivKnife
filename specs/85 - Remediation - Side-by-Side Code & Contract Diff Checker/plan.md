# Implementation Plan (TDD): Side-by-Side Code & Contract Diff Checker Remediation

> **Spec ID**: 85  
> **Remediates Tool**: 55 — Side-by-Side Code & Contract Diff Checker (`diff-checker`)  
> **Route**: `/tools/diff-checker`  
> **Methodology**: Strict Test-Driven Development (TDD) via Vertical Slices (`Red → Green → Refactor`)

---

## 1. Architecture & Impacted Files

```text
PrivKnife/src/app/tools/dev/diff-checker/
├── types.ts                        # Add DiffWorkerRequest / DiffWorkerResponse message contracts
├── engine.ts                       # Fix monotonic hunk pairing order; remove eager Blob allocation in worker path
├── engine.spec.ts                  # Add regression tests for monotonic line ordering in Code Refactor hunk
├── worker.ts                       # NEW: Dedicated Web Worker executing computeDiff() off the main thread
├── diff-checker.component.ts       # Wire worker bridge + fallback, syncScroll handler, syntaxLanguage selector, BEM template
├── diff-checker.component.scss     # NEW: BEM .c-diff-checker__* styles, dark-mode contrast, 320px/390px responsive rules
└── diff-checker.component.spec.ts  # Add unit tests for worker lifecycle, syncScroll, syntaxLanguage, and line order
```

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Engine & Export Correctness Boundary (`engine.ts` / `engine.spec.ts`)
- **Public Function**: `computeDiff(originalText: string, modifiedText: string, options: DiffCheckerOptions): DiffCheckerResult`
- **Key Assertions**:
  - When diffing `SAMPLE_CODE_ORIGINAL` vs `SAMPLE_CODE_MODIFIED`, `result.lines` preserves original line order (`leftText` sequence matches `rawLinesA` 1..7 without `return total;` jumping ahead of `total = total + items[i].price;` and `}`), and `leftLineNumber` / `rightLineNumber` increase monotonically.
  - `generateUnifiedPatch(result.lines)` outputs lines in exact source order.

### Seam 2: Web Worker & Main-Thread Protection Boundary (`worker.ts` / `diff-checker.component.ts`)
- **Protocol**:
  - Request: `{ requestId: number; originalText: string; modifiedText: string; options: DiffCheckerOptions }`
  - Response: `{ requestId: number; result: Omit<DiffCheckerResult, 'blob'> }`
- **Lifecycle**: Component terminates the worker instance in `ngOnDestroy()` and falls back to synchronous `computeDiff()` when `Worker` is unavailable.

### Seam 3: Component State, Controls, Sanitization & Resource Disposal Boundary (`diff-checker.component.ts` / `diff-checker.component.spec.ts`)
- **Bindings**:
  - `syntaxLanguage` `<select>` updates `syntaxLanguage()` signal and HTML report metadata.
  - `syncScroll` toggle synchronizes scroll top ratio between Original and Modified textareas.
  - `ngOnDestroy()` revokes any active Object URLs and terminates the Web Worker.

### Seam 4: Mobile Responsive & Theme Styling Boundary (`diff-checker.component.scss`)
- **Responsive & Theme Rules**:
  - `.c-header__title` uses `overflow-wrap: anywhere` so `320px` viewport has `scrollWidth <= 320`.
  - `.c-diff-checker__checkbox-label` has `min-height: 38px`; `.c-diff-checker__textarea` and `.c-diff-checker__select` have `font-size: 1rem` (`16px`) on mobile.
  - Diff rows (`.c-diff-checker__row--added`, `--removed`, `--modified`, `--unchanged`) use theme-safe backgrounds and explicit high-contrast text colors in both light and dark modes.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: Monotonic Line Pairing in Change Hunks (`DEFECT-55-01`)
1. **Red**: In `engine.spec.ts`, add a test `preserves original and modified line order within multi-line modified hunks (SAMPLE_CODE_ORIGINAL vs SAMPLE_CODE_MODIFIED)` asserting that the sequence of `line.leftText` (filtering out undefined) equals `SAMPLE_CODE_ORIGINAL.split('\n')` in exact order, and `line.leftLineNumber` is `[1, 2, 3, 4, 5, 6, 7]`. Run Vitest and observe failure (`return total;` is emitted at index 3 before `total = total + items[i].price;`).
2. **Green**: Refactor the hunk pairing loop in `engine.ts` (`lines 230–292`) to track `rCursor` and `aCursor`, flushing unmatched removed lines `rCursor .. r - 1` and unmatched added lines `aCursor .. a - 1` *before* emitting each matched `modified` pair `(r, a)`, then advancing `rCursor = r + 1` and `aCursor = a + 1`, and finally flushing trailing unmatched lines.
3. **Refactor**: Extract a pure helper `pairChangeHunk(removedBlock, addedBlock, options, startLeftLine, startRightLine)` in `engine.ts` for readability.

### Slice 2: Web Worker Offloading & Lifecycle Cleanup (`DEFECT-55-02`)
1. **Red**: In `diff-checker.component.spec.ts`, add a test verifying that the component dispatches diff requests through its worker bridge (or synchronous fallback) and calls `worker.terminate()` on `ngOnDestroy()`.
2. **Green**: Create `worker.ts` listening for `DiffWorkerRequest` and posting `DiffWorkerResponse`. Wire worker creation, `requestId` tracking, and `ngOnDestroy()` termination in `diff-checker.component.ts`.
3. **Refactor**: Ensure `Blob` creation only happens on export (`downloadExport()`) or lazily in the main thread so worker messages only transfer serializable strings/arrays.

### Slice 3: Wire `syntaxLanguage` Selector & `syncScroll` Textarea Synchronization (`DEFECT-55-05`)
1. **Red**: In `diff-checker.component.spec.ts`, add tests asserting that changing the `syntaxLanguage` select updates `component.syntaxLanguage()` and that scrolling the Original textarea when `syncScroll()` is `true` updates the Modified textarea's `scrollTop`.
2. **Green**: Add the `syntaxLanguage` select and `Sync Scroll` checkbox to the toolbar template in `diff-checker.component.ts`, and bind `(scroll)="onTextareaScroll('left', $event)"` / `(scroll)="onTextareaScroll('right', $event)"`.
3. **Refactor**: Guard against recursive scroll event loops with a boolean flag.

### Slice 4: BEM Styling, Dark Mode Contrast & 320px/390px Mobile Adaptation (`DEFECT-55-03`, `DEFECT-55-04`)
1. **Red**: Run `node $SCRATCH/audit.mjs diff-checker` and observe `small.layout.hasHorizontalScroll === true` (`scrollWidth: 369`), `smallTouchTargetCount: 2`, and `inputsUnder16px_iOSZoom: 2`.
2. **Green**: Move inline styles to `diff-checker.component.scss`, migrate all classes to `.c-diff-checker__*` BEM namespace, apply dark-mode-compatible row/token colors, set `min-height: 38px` on checkbox labels and buttons, set `font-size: 1rem` (`16px`) on textareas/selects, and add `overflow-wrap: anywhere` + `min-width: 560px` horizontal scroll table container for split view.
3. **Refactor**: Re-run headless Chrome audit to verify `hasHorizontalScroll: false` at `1366px`, `390px`, and `320px` and `0` small touch targets.
