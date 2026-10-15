# Specification 32: Mobile-First UX & Responsive Layout Remediation

> **Spec ID**: 32  
> **Status**: Ready for Planning & Implementation  
> **Priority**: High  
> **Author**: Antigravity QA Architecture Specialist  
> **Target Viewports**: 
> - Standard Mobile: 390 x 844 px (iPhone 12/13/14/15/16, Pixel 7/8, Galaxy S23/S24)
> - Compact Mobile: 375 x 667 px (iPhone SE / 8)
> - Tablet Breakpoint: 768 px
> - Desktop Breakpoint: 1024 px  
> **Application Under Test**: PrivKnife (Client-Side Angular Single-Page Application at `http://localhost:4200/`)

---

## 1. Executive Summary

An end-to-end mobile user experience audit was conducted across all **34 routes** (the home catalog, UI kit, static pages, and all 29 tools) in **PrivKnife** using automated Chromium headless instances set to standard mobile phone resolution (`390 x 844`, 2.0 DPR, touch emulation enabled).

While PrivKnife's client-side engines and core logic operate flawlessly (as established in Spec 31), the mobile audit revealed significant responsive design limitations:
- **Global Header Overflow**: A 6px to 30px horizontal page scroll occurs across **all 34 routes** due to header component actions overflowing the viewport width.
- **Severe Content Layout Breaks**: 10 tools suffer from severe horizontal overflow (ranging from +60px to +2910px), causing horizontal scrolling, hidden action buttons, and degraded usability.
- **3D Tools Multi-Column Squeeze**: On 3D CAD tools (`3d-qr-stand`, `desk-wedge-nameplate`, `cookie-cutter`), the 12-column desktop grid renders side-by-side on mobile without responsive media queries, squishing input forms into 5/12th of 390px.
- **Touch Target Deficiencies**: Over 23 pages feature interactive buttons and chips with touch targets below the 36px-44px threshold (WCAG 2.5.5 / 2.5.8).

This specification outlines the architecture, component updates, layout refactors, and styling changes required to achieve a **native-feeling, zero-horizontal-overflow, touch-first mobile experience** across PrivKnife.

---

## 2. Mobile Audit Matrix & Defect Registry

| Defect ID | Severity | Category | Route(s) | Description | Root Cause |
|---|---|---|---|---|---|
| **DEFECT-M00** | High | Layout / Global | Global (All 34 routes) | Site-wide horizontal page scroll (+6px to +30px) | Header `.c-header__inner` has 48px padding + brand + badge + lang + theme (total ~453px > 390px). |
| **DEFECT-M01** | Critical | Media / Dev | `/tools/calendar-linker` | +2910px horizontal overflow; "Load Demo" button pushed offscreen | `<pre class="code-snippet-pre">` contains 3000ch URL without word break; grid items lack `min-width: 0`. |
| **DEFECT-M02** | Critical | Documents | `/tools/markdown-cheatsheet` | +366px horizontal overflow; layout broke sideways | `.paper-sheet` has `max-width: 650px`; `.cs-studio-grid` children lack `min-width: 0`. |
| **DEFECT-M03** | Critical | Dev / Design | `/tools/css-mesh-gradient-maker` | +360px horizontal overflow | Long CSS radial gradient in `<pre>` without break; grid items lack `min-width: 0`. |
| **DEFECT-M04** | Critical | Media | `/tools/favicon-app-icon-suite` | +260px horizontal overflow | Uses `.l-columns--2` which is not responsive in `_l-columns.scss` (forces 2 cols on mobile). |
| **DEFECT-M05** | High | Media | `/tools/subtitles-shifter` | +223px horizontal overflow | Subtitle table and controls lack horizontal scroll wrapper and `min-width: 0`. |
| **DEFECT-M06** | High | 3D Fabrication | `/tools/3d-qr-stand`<br>`/tools/cookie-cutter`<br>`/tools/desk-wedge-nameplate` | +40px to +134px overflow; forms squeezed into 150px columns | `.l-columns--12` with `span-5` / `span-7` has no responsive breakpoint; stays 12-col on mobile. |
| **DEFECT-M07** | Medium | Dev / Network | `/tools/dns-checker` | +60px horizontal overflow | 8-resolver table `<table>` is 622px wide and lacks `overflow-x: auto` wrapper. |
| **DEFECT-M08** | Medium | Dev / Data | `/tools/csv-to-sql-json` | +6px horizontal overflow | CSV table preview lacks table scroll wrapper. |
| **DEFECT-M09** | Medium | Media | `/tools/screenshot-mockup` | +6px horizontal overflow | Preset button row has multiple nowrap buttons exceeding 390px. |
| **DEFECT-M10** | Medium | Dev / Design | `/tools/email-signature-generator` | +75px horizontal overflow | Signature preview table has fixed 500px width without horizontal scroll container. |
| **DEFECT-M11** | Medium | Accessibility | Site-wide (23+ pages) | Touch targets < 36px (Theme button: 28px, chips: 26-28px, footer: 20px) | Buttons lack minimum touch dimensions (min-height: 38px/44px) and padding on mobile. |

---

## 3. Detailed Remediation Plans

### 3.1. Remediation for DEFECT-M00: Global Header Responsiveness

#### Current State
In `src/styles/04_components/_c-header.scss`:
```scss
.c-header {
  &__inner {
    padding: fn.spacing(3) fn.spacing(6); // 24px left + 24px right = 48px padding
  }
}
```
In `src/app/components/header/header.ts`:
```html
<div class="c-header__actions">
  <app-badge variant="privacy" [dot]="true">
    {{ 'common.inBrowserBadge' | translate }}
  </app-badge>
  <app-lang-selector />
  <app-button variant="ghost" size="small" ... />
</div>
```

#### Fix Implementation
1. In `_c-header.scss`:
   - Reduce mobile horizontal padding:
     ```scss
     &__inner {
       padding: fn.spacing(2.5) fn.spacing(3);
       @include mx.responsive("md") {
         padding: fn.spacing(3) fn.spacing(6);
       }
     }
     ```
   - On screens `< 640px` (or `sm`), hide the privacy badge inside `c-header__actions` (each tool already features the privacy badge prominently below its title):
     ```scss
     &__actions {
       app-badge {
         @media (max-width: 640px) {
           display: none;
         }
       }
     }
     ```
   - Ensure the brand tagline hides or truncates below 480px to preserve space for the logo and title.

---

### 3.2. Remediation for DEFECT-M04 & DEFECT-M06: Responsive Grid System (`_l-columns.scss`)

#### Current State
In `src/styles/03_layout/_l-columns.scss`:
```scss
  @for $i from 1 through 12 {
    &--#{$i} {
      grid-template-columns: repeat($i, 1fr);
    }
  }
```
Columns `--2`, `--4`, `--12` and child areas `--span-*` have no media queries, locking them to rigid multi-column layouts on 320px-390px phones.

#### Fix Implementation
Update `_l-columns.scss` to make grid structures mobile-first:
```scss
.l-columns {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: var(--spacing-4, 16px);
  width: 100%;

  /* Child Area Elements: default 1 col on mobile */
  &__area {
    min-width: 0; // Essential to prevent grid expansion!
    grid-column: span 1;
  }

  /* Desktop and Tablet expansions */
  @include mx.responsive("md") {
    &--2 { grid-template-columns: repeat(2, 1fr); }
    &--3 { grid-template-columns: repeat(3, 1fr); }
    &--4 { grid-template-columns: repeat(4, 1fr); }
    
    &--12 {
      grid-template-columns: repeat(12, 1fr);
    }

    @for $i from 1 through 12 {
      &__area--span-#{$i} {
        grid-column: span $i;
      }
    }
  }
}
```

---

### 3.3. Remediation for Code Snippets & `<pre>` Blocks (DEFECT-M01, DEFECT-M03)

#### Current State
`<pre class="code-snippet-pre"><code>{{ url }}</code></pre>` uses `white-space: pre;` without `word-break: break-all;`, pushing the parent column to 3000px+.

#### Fix Implementation
In all tool components with code snippet pre blocks:
1. Set `min-width: 0;` on the column containing the pre block.
2. In `.code-snippet-box` and `.code-snippet-pre`:
   ```scss
   .code-snippet-box {
     max-width: 100%;
     overflow-x: auto;
     -webkit-overflow-scrolling: touch;
   }
   .code-snippet-pre {
     white-space: pre-wrap;
     word-break: break-all;
     overflow-wrap: anywhere;
   }
   ```

---

### 3.4. Remediation for Data & Resolver Tables (DEFECT-M05, DEFECT-M07, DEFECT-M08)

#### Current State
`<table>` elements rendered directly within card containers without an overflow wrapper overflow the card when row columns exceed 390px.

#### Fix Implementation
Create a reusable responsive table wrapper class `.c-table-wrapper` in `src/styles/04_components/_c-card.scss` (or `_c-table.scss`):
```scss
.c-table-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  margin-bottom: var(--spacing-3);

  table {
    min-width: 100%;
  }
}
```
Wrap tables in `dns-checker`, `csv-to-sql-json`, and `subtitles-shifter` in `<div class="c-table-wrapper">`.

---

### 3.5. Remediation for Cheatsheet & Mockup Previews (DEFECT-M02, DEFECT-M09, DEFECT-M10)

#### Current State
- `markdown-cheatsheet`: `.paper-sheet` has fixed `max-width: 650px`. On mobile, it pushes the screen.
- `screenshot-mockup`: Preset buttons have `white-space: nowrap` without wrapping.
- `email-signature-generator`: The HTML preview table pushes past 400px.

#### Fix Implementation
1. `markdown-cheatsheet`:
   - Ensure `.page-viewport-outer` has `overflow-x: auto; -webkit-overflow-scrolling: touch; max-width: 100%;`.
   - On mobile screens (`max-width: 640px`), add scale transform or horizontal scrolling guide so the user can pan across the sheet preview.
2. `screenshot-mockup`:
   - Change preset containers to `display: flex; flex-wrap: wrap; gap: 8px;`.
3. `email-signature-generator`:
   - Wrap signature output in an `overflow-x: auto` scroll frame with a clear "Copy Signature" action button.

---

### 3.6. Mobile Segmented Tab Pattern for Complex Studio Tools

Tools with heavy preview viewports (3D Tools, Table Tent, Barcode Labels, Markdown Cheatsheet) should offer a clean mobile segmented switch when screen width `< 768px`:
- `[ ⚙️ Settings / Controls ]`
- `[ 👁️ Live 3D / Print Preview ]`

This eliminates having to scroll past 8 cards of configuration to see visual changes on mobile.

---

### 3.7. Remediation for Touch Targets (DEFECT-M11)

Per WCAG 2.5.5 / 2.5.8:
- Ensure all interactive buttons, selector chips, and tabs have a minimum height of `38px` (target: `44px`) on touch devices.
- In `_c-button.scss`, update `.c-button--small`:
  ```scss
  &--small {
    padding: fn.spacing(1.5) fn.spacing(3);
    min-height: 36px; // Increase from 28px for mobile usability
  }
  ```
- Increase chip buttons (`.c-button--chip`, `.preset-badge-btn`) minimum height to `36px` with proper vertical padding.
- Add sufficient hit area padding to footer links (`padding: 8px 4px`).

---

## 4. Verification & Testing Criteria

1. **Automated Mobile Viewport Audit**:
   - Re-run `scratch/mobile_audit.js` across all 34 routes at `390 x 844` and `375 x 667`.
   - Verification standard: **0 routes with horizontal overflow (`hasHorizontalOverflow === false`)**.
2. **Main Thread & Performance**:
   - Web Workers and 3D canvases must maintain 60 FPS without layout thrashing.
3. **Touch Interaction Verification**:
   - Verify all buttons, sliders, file dropzones, and select dropdowns respond instantly to touch tap events without misclicks.
4. **Regression Testing**:
   - Ensure all existing unit tests pass: `npm test -- --watch=false`.
   - Ensure clean production build: `npm run build`.

---

## 5. Specification Acceptance Checklist

- [ ] **Global Header**: Zero overflow on any mobile viewport (320px - 414px).
- [ ] **Layout System**: `.l-columns` grid correctly collapses to single column on mobile.
- [ ] **Code Pre Blocks**: Pre blocks wrap or scroll horizontally without widening parent cards.
- [ ] **Table Wrappers**: All data and DNS tables horizontally scroll smoothly on touch.
- [ ] **3D CAD Viewports**: 3D tools display full-width controls and responsive canvas viewport.
- [ ] **Touch Targets**: Minimum 36px/44px touch target compliance across all interactive elements.
- [ ] **Visual Verification**: Zero side-scrolling wobble on mobile devices.
