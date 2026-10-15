# Plan: Mobile-First UX & Responsive Layout Remediation (Spec 32)

## 1. Objectives & Quality Standards
The goal of Spec 32 is to eliminate all horizontal layout overflow, ensure full responsive grid behavior across mobile viewports (down to 375px/390px), make all touch targets accessible, and provide seamless mobile studio controls.

- **Zero Horizontal Page Overflow**: `scrollWidth === clientWidth` on all 34 routes at 390x844 (standard mobile) and 375x667 (compact mobile).
- **Zero Truncation of Action Buttons**: All CTAs, load demo buttons, and reset options must remain within reach on mobile screens without sideways scrolling.
- **Touch-Friendly Controls**: Interactive buttons, chips, and form fields meeting WCAG 2.5.5 / 2.5.8 sizing (minimum 36px-44px tap targets).
- **Responsive 3D & Studio Layouts**: Single-column stacking and segmented mobile toggles for heavy preview viewports.

---

## 2. Execution Phases

### Phase 1: Core Layout & Global Header Fixes
1. **Header Component & Styles (`_c-header.scss`, `header.ts`)**:
   - Reduce mobile horizontal padding on `.c-header__inner` from 24px to 12px.
   - Hide the redundant in-header privacy badge on mobile screens (`max-width: 640px`).
   - Add `overflow-x: hidden;` to `.c-header`.
2. **Grid Layout System (`_l-columns.scss`)**:
   - Convert `.l-columns--2`, `--3`, `--4`, `--12` into mobile-first single column (`repeat(1, 1fr)`) below `md` breakpoint (`768px`).
   - Reset `.l-columns__area--span-*` to `grid-column: span 1;` on mobile.
   - Enforce `min-width: 0;` on all `.l-columns__area` children.
3. **Button & Touch Target Utilities (`_c-button.scss`, `_c-input.scss`)**:
   - Increase `.c-button--small` height from 28px to 36px with comfortable touch padding.
   - Increase chip selector buttons (`.c-button--chip`, `.preset-badge-btn`) minimum touch height to 36px.

### Phase 2: High-Severity Studio Tool Fixes
1. **`calendar-linker`**:
   - Add `min-width: 0;` to `.cal-form-col` and `.cal-preview-col`.
   - Add `overflow-x: auto; white-space: pre-wrap; word-break: break-all;` to `.code-snippet-box` and `.code-snippet-pre`.
2. **`markdown-cheatsheet`**:
   - Add `min-width: 0;` to `.cs-editor-col` and `.cs-preview-col`.
   - Make `.page-viewport-outer` scrollable with `max-width: 100%; overflow-x: auto;`.
3. **`css-mesh-gradient-maker`**:
   - Add `min-width: 0;` to `.mesh-controls-col`.
   - Wrap `<pre class="code-snippet-pre">` with `overflow-x: auto; word-break: break-all;`.
4. **`favicon-app-icon-suite`**:
   - Ensure multi-column layout collapses to 1 column on mobile.
   - Add word wrapping to HTML `<head>` code box.

### Phase 3: Tables & Preview Frames
1. **Table Wrappers (`_c-card.scss`, `dns-checker`, `csv-to-sql-json`, `subtitles-shifter`)**:
   - Create `.c-table-wrapper` with `overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%;`.
   - Wrap 8-resolver table in `dns-checker`.
   - Wrap CSV data table in `csv-to-sql-json`.
   - Wrap subtitle cues table in `subtitles-shifter`.
2. **Preset & Signature Wrappers (`screenshot-mockup`, `email-signature-generator`)**:
   - Add `flex-wrap: wrap;` to preset rows in `screenshot-mockup`.
   - Wrap signature preview container in `email-signature-generator` with `overflow-x: auto;`.

### Phase 4: 3D CAD Tools Studio Optimization
1. **`3d-qr-stand`, `cookie-cutter`, `desk-wedge-nameplate`**:
   - Stack controls and 3D canvas vertically on mobile (`< 1024px`).
   - Add a mobile segmented toggle (`[ ⚙️ Settings ]` / `[ 👁️ 3D Viewport ]`) or ensure 3D canvas viewport has responsive height (e.g. 320px) on mobile so it doesn't push controls completely out of sight.

### Phase 5: Verification & Automated Regression
1. Re-run `mobile_audit.js` at 390x844 and 375x667 viewports.
2. Verify:
   - 0 routes with `hasHorizontalOverflow: true`.
   - 0 layout regressions on desktop viewports.
   - 77/77 test suites pass (`npm test`).
   - Production build compiles cleanly (`npm run build`).
