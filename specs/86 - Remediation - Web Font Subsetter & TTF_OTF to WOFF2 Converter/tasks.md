# Remediation Tasks: Web Font Subsetter & TTF/OTF to WOFF2 Converter (Tool 56)

- **Target Tool**: `56` — `font-subsetter-converter`
- **Spec Reference**: [`specs/86 - Remediation - Web Font Subsetter & TTF_OTF to WOFF2 Converter/spec.md`](file:///home/deivision/Projects/Programming/PrivKnife/specs/86%20-%20Remediation%20-%20Web%20Font%20Subsetter%20&%20TTF_OTF%20to%20WOFF2%20Converter/spec.md)
- **Plan Reference**: [`specs/86 - Remediation - Web Font Subsetter & TTF_OTF to WOFF2 Converter/plan.md`](file:///home/deivision/Projects/Programming/PrivKnife/specs/86%20-%20Remediation%20-%20Web%20Font%20Subsetter%20&%20TTF_OTF%20to%20WOFF2%20Converter/plan.md)

---

## Phase 1: Engine & Worker Remediation (`engine.ts`, `worker.ts`, `test-fixtures.ts`)

- [ ] **Task 1.1 (RED — `DEFECT-56-01`, `DEFECT-56-04`)**: Add failing unit tests in [`font-subsetter-converter.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/font-subsetter-converter.component.spec.ts) verifying that `parseFontMetadata()` reads `numGlyphs` from `maxp` and that `processFontSubset()` produces strictly smaller output sizes as `characterSet` shrinks (`custom: "ABC"` < `numbers-punctuation` < `basic-latin` < `latin-supplement`).
- [ ] **Task 1.2 (GREEN — `DEFECT-56-01`, `DEFECT-56-04`)**: Update [`test-fixtures.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/test-fixtures.ts) to build a valid minimal SFNT TrueType font (`head`, `maxp`, `cmap` Format 4, `loca`, `glyf`, `hmtx`, `hhea`, `name`, `OS/2`, `post`, `GSUB`, `kern`) and implement real `cmap`/`glyf`/`loca`/`maxp` glyph subsetting in [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts).
- [ ] **Task 1.3 (RED — `DEFECT-56-02`, `DEFECT-56-03`)**: Add failing unit tests in [`font-subsetter-converter.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/font-subsetter-converter.component.spec.ts) verifying that `packageWoff()` and `packageWoff2()` achieve positive byte savings even when `stripOpenTypeLayout: false` and `stripKerning: false`, and that `extractSfntTables()` unpacks `.woff` (`0x774F4646`) and `.woff2` (`0x774F4632`) inputs without corrupting `numTables`.
- [ ] **Task 1.4 (GREEN — `DEFECT-56-02`, `DEFECT-56-03`)**: Implement WOFF2 `UIntBase128` directory encoding and stream compression in `packageWoff2()`, table compression in `packageWoff()`, and WOFF/WOFF2 header unpacking in `extractSfntTables()` inside [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/engine.ts).
- [ ] **Task 1.5 (GREEN — `DEFECT-56-05`)**: Create [`worker.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/worker.ts) to run `processFontSubset()` off the main UI thread with progress reporting and add unit tests for the worker message contract.

---

## Phase 2: Component State, Error Handling & Resource Disposal (`font-subsetter-converter.component.ts`)

- [ ] **Task 2.1 (RED — `DEFECT-56-04`)**: Write failing component tests in [`font-subsetter-converter.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/font-subsetter-converter.component.spec.ts) asserting that loading a font registers a dynamic `@font-face` / `FontFace` family name bound to `.c-font-subsetter__specimen-textarea` and renders waterfall preview lines (`12px`, `18px`, `28px`).
- [ ] **Task 2.2 (GREEN — `DEFECT-56-04`)**: Implement `FontFace` registration and waterfall preview rendering in [`font-subsetter-converter.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/font-subsetter-converter.component.ts) with automatic Blob URL revocation and worker termination in `ngOnDestroy()`.

---

## Phase 3: DOM Security & Sanitization

- [ ] **Task 3.1**: Verify that `sanitizeFontFamilyName()` strips quotes, semicolons, braces, angle brackets, and newlines from the CSS `@font-face` snippet and that no `innerHTML` or `bypassSecurityTrustHtml` is used with user input.

---

## Phase 4: Styling, BEM Compliance & Responsive Layout

- [ ] **Task 4.1 (RED — `DEFECT-56-05`)**: Add DOM/style tests in [`font-subsetter-converter.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/font-subsetter-converter.component.spec.ts) asserting `.c-font-subsetter__*` BEM classes are used instead of `.tool-page`, `.stats-bar`, `.specimen-box`, `.code-box`, and `.privacy-banner`.
- [ ] **Task 4.2 (GREEN — `DEFECT-56-05`)**: Refactor template and SCSS in [`font-subsetter-converter.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/dev/font-subsetter-converter/font-subsetter-converter.component.ts) to use `.c-font-subsetter__*` BEM classes, replace hardcoded light-mode colors (`#ffffff`, `#e2e8f0`) with theme CSS variables (`var(--color-surface)`, `var(--color-bg-elevated)`), fix `.c-header__title` mobile wrapping (`overflow-wrap: anywhere`), and enforce `>= 44px` touch targets on all inputs and checkbox labels.

---

## Phase 5: Final Verification & Regression Gate

- [ ] **Task 5.1**: Run `npx vitest run src/app/tools/dev/font-subsetter-converter/font-subsetter-converter.component.spec.ts` and verify 100% of unit and privacy tests pass.
- [ ] **Task 5.2**: Verify in headless Chrome at `1440×900`, `390×844`, and `320×568` that `scrollWidth <= clientWidth`, `smallTouchTargets === 0`, and switching presets updates `Output Size` dynamically.
