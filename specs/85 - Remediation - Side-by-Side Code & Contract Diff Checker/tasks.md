# Remediation Tasks: Side-by-Side Code & Contract Diff Checker (`diff-checker`)

> **Spec ID**: 85  
> **Remediates Tool**: 55 — Side-by-Side Code & Contract Diff Checker  
> **Route**: `/tools/diff-checker`

---

## Phase 1: Engine & Algorithmic Remediation (Seam 1 — Red → Green)

- [ ] **Task 1.1 (Red)**: In `PrivKnife/src/app/tools/dev/diff-checker/engine.spec.ts`, add unit test verifying that `computeDiff(SAMPLE_CODE_ORIGINAL, SAMPLE_CODE_MODIFIED, defaultOptions)` preserves exact source order of `leftText` lines (`1..7`) and `rightText` lines (`1..5`), and that `return total;` is not emitted before `total = total + items[i].price;`.
- [ ] **Task 1.2 (Green)**: In `PrivKnife/src/app/tools/dev/diff-checker/engine.ts`, replace the two-pass `usedRemoved`/`usedAdded` emit order with a monotonic cursor algorithm (`rCursor`, `aCursor`) that flushes preceding unmatched removals and additions in order before emitting each paired `modified` line.
- [ ] **Task 1.3 (Refactor)**: Verify `generateUnifiedPatch()` and `generateHtmlDiffReport()` output lines in true source order and include the selected `syntaxLanguage` class (`language-${options.syntaxLanguage}`) on `<code>` blocks.

## Phase 2: Web Worker Offloading & Memory Hygiene (Seam 2 & 3 — Red → Green)

- [ ] **Task 2.1 (Red)**: In `PrivKnife/src/app/tools/dev/diff-checker/types.ts` and `diff-checker.component.spec.ts`, define `DiffWorkerRequest` / `DiffWorkerResponse` interfaces and write a test asserting worker termination in `ngOnDestroy()`.
- [ ] **Task 2.2 (Green)**: Create `PrivKnife/src/app/tools/dev/diff-checker/worker.ts` to execute `computeDiff()` off the main thread and post serializable diff results back with `requestId`.
- [ ] **Task 2.3 (Green)**: Update `PrivKnife/src/app/tools/dev/diff-checker/diff-checker.component.ts` to use the Web Worker when `typeof Worker !== 'undefined'` (with synchronous fallback for unit tests) and terminate the worker in `ngOnDestroy()`.

## Phase 3: Component UI State, Controls & Security Fixes (Seam 3 — Red → Green)

- [ ] **Task 3.1 (Red)**: In `PrivKnife/src/app/tools/dev/diff-checker/diff-checker.component.spec.ts`, add unit tests for the `syntaxLanguage` selector and `syncScroll` checkbox + synchronized textarea scroll handler.
- [ ] **Task 3.2 (Green)**: Add the `syntaxLanguage` `<select>` and `Sync Scroll` checkbox to the toolbar in `diff-checker.component.ts`, and bind synchronized scroll handlers on both input textareas.

## Phase 4: Mobile Adaptation, Light/Dark Theme Contrast & BEM Styling (Seam 4)

- [ ] **Task 4.1**: Create `PrivKnife/src/app/tools/dev/diff-checker/diff-checker.component.scss` and migrate all inline styles from `diff-checker.component.ts` to `.c-diff-checker__*` BEM classes.
- [ ] **Task 4.2**: Replace hardcoded light-mode hex row/gutter colors (`#f0fdf4`, `#fef2f2`, `#fffbeb`, `#f8fafc`) with theme-aware CSS variables and high-contrast foreground colors that remain legible in both Light and Dark modes.
- [ ] **Task 4.3**: Fix `320px` horizontal overflow (`scrollWidth: 369px → 320px`) by adding `min-width: 0; overflow-wrap: anywhere` to `.c-header__title`, wrapping `.c-card__footer.l-extremo` actions on narrow screens, setting `min-width: 560px` on `.c-diff-checker__table--split` inside `.c-diff-checker__table-container` (`overflow-x: auto`), setting `font-size: 1rem` (`16px`) on textareas/selects, and sizing checkbox label touch targets to `>= 38px`.

## Phase 5: Verification & Regression Gate

- [ ] **Task 5.1**: Run unit tests: `npx vitest run src/app/tools/dev/diff-checker/` and confirm 100% pass rate.
- [ ] **Task 5.2**: Run production build: `npm run build` and verify zero TypeScript or SASS compilation errors.
- [ ] **Task 5.3**: Run headless Chrome audit: `node $SCRATCH/audit.mjs diff-checker` and confirm `consoleErrors: []`, `pageErrors: []`, `externalRequests: []`, `hasHorizontalScroll: false` across `desktop` (`1366px`), `mobile` (`390px`), and `small` (`320px`), `smallTouchTargetCount: 0`, and `inputsUnder16px_iOSZoom: 0`.
