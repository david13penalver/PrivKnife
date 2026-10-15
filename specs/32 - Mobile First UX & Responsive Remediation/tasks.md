# Tasks: Mobile-First UX & Responsive Layout Remediation (Spec 32)

## Status Summary
- Total Tasks: 12
- Completed: 12
- In Progress: 0
- Pending: 0

---

## Phase 1: Core Layout & Global Header
- [x] **TASK-M01**: Update `.c-header` responsive styling in `src/styles/04_components/_c-header.scss` (reduce mobile padding to 12px, hide redundant privacy badge on screens < 640px, prevent horizontal page scroll).
- [x] **TASK-M02**: Refactor `src/styles/03_layout/_l-columns.scss` to make `.l-columns--2`, `--3`, `--4`, `--12` and child areas `--span-*` responsive (single column by default on mobile, multi-column on tablet/desktop >= 768px/1024px, enforce `min-width: 0`).
- [x] **TASK-M03**: Increase `.c-button--small` and chip selector minimum height to 36px in `_c-button.scss` for touch target compliance (WCAG 2.5.5 / 2.5.8).

---

## Phase 2: High-Severity Studio Tool Layouts
- [x] **TASK-M04**: Fix `calendar-linker` horizontal explosion (+2910px): Add `min-width: 0;` to grid columns, add `overflow-x: auto` and `word-break: break-all` to embed code box.
- [x] **TASK-M05**: Fix `markdown-cheatsheet` horizontal break (+366px): Add `min-width: 0;` to `.cs-studio-grid` children, add responsive scroll container to `.page-viewport-outer`.
- [x] **TASK-M06**: Fix `css-mesh-gradient-maker` horizontal break (+360px): Add `min-width: 0;` to `.mesh-controls-col`, add `overflow-x: auto; word-break: break-all;` to CSS snippet box.
- [x] **TASK-M07**: Fix `favicon-app-icon-suite` horizontal break (+260px): Ensure single-column stacking on mobile and code snippet wrap.

---

## Phase 3: Tables & Preview Containers
- [x] **TASK-M08**: Create reusable `.c-table-wrapper` in styles and wrap resolver table in `dns-checker` (+60px overflow fix).
- [x] **TASK-M09**: Wrap CSV data table in `csv-to-sql-json` and subtitle cues table in `subtitles-shifter` in responsive scroll wrappers.
- [x] **TASK-M10**: Fix wrapping on preset buttons in `screenshot-mockup` and wrap signature preview table in `email-signature-generator`.

---

## Phase 4: 3D CAD Tools Responsive Stacking
- [x] **TASK-M11**: Update `3d-qr-stand`, `cookie-cutter`, and `desk-wedge-nameplate` to stack cleanly on mobile with responsive 3D canvas viewport dimensions.

---

## Phase 5: Verification & Automated Regression
- [x] **TASK-M12**: Re-run automated mobile audit script across all 34 routes at 390x844 and 375x667, verify 0 horizontal overflow routes, run full test suite (`npm test`), and verify clean production build (`npm run build`).
