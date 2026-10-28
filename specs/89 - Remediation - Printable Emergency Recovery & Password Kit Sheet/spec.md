# Remediation Specification: Printable Emergency Recovery & Password Kit Sheet (Tool 59)

- **Target Tool**: `59` — `emergency-recovery-kit` (Printable Emergency Recovery & Password Kit Sheet)
- **Category**: `privacy`
- **Original Spec**: [`specs/59 - Printable Emergency Recovery & Password Kit Sheet/spec.md`](file:///home/deivision/Projects/Programming/PrivKnife/specs/59%20-%20Printable%20Emergency%20Recovery%20&%20Password%20Kit%20Sheet/spec.md)
- **Audit Report**: [`tools_31_60_audit.md` §59](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md)
- **Source Directory**: [`PrivKnife/src/app/tools/privacy/emergency-recovery-kit/`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/)
- **Remediation Priority**: `Critical`

---

## 1. Executive Summary & Audit Baseline

- **Audit Verdict**: Functional `✅ Works` | Mobile `⚠️ Minor issues` | Overall `⚠️`
- **Desktop / Mobile / Small Screenshots**:
  - `desktop.png`, `mobile.png`, `mobile-small.png` (`$SCRATCH/shots/emergency-recovery-kit/`)
  - `functional-24words-letter.png`, `functional-minimal.png` (`$SCRATCH/shots/emergency-recovery-kit/`)
- **Defect Summary Table**:

| Defect ID | Severity | Category | Summary |
| :--- | :--- | :--- | :--- |
| `DEFECT-59-01` | `Critical` | `DOM Security & Sanitization` | DOM XSS via unescaped `options.kitTitle` and `options.vaultCustodian` interpolated into `generateEmergencyKitSvg()` and injected via `DomSanitizer.bypassSecurityTrustHtml()` without `DOMPurify`; typing `&` breaks SVG XML |
| `DEFECT-59-02` | `Medium` | `Spec Conformance` / `Engine Logic` | Fixed `<svg width="735" height="1039.5">` inside flex-centered `.c-preview` (`max-height: 600px`) leaves ~160px empty top space and clips Section 5 (Tamper Seal) and the SHA-256 footer; `options.additionalInstructions` and `options.includeOfflineChecksumQr` are rendered in PDF but omitted from the SVG preview |
| `DEFECT-59-03` | `Medium` | `Engine Logic` | `ephemeralChecksum` in the component computes a 32-bit FNV-1a hash repeated 8 times while labeling it `SHA-256:`, whereas `generateEmergencyKitPdf()` computes a real Web Crypto `SHA-256` digest with `Date.now()`, causing the preview and PDF hashes to disagree |
| `DEFECT-59-04` | `Low` | `Mobile & Responsive Layout` / `Print Styles` / `BEM` | Horizontal overflow at `390px` and `320px` (`455px`) from `.c-header__title`; header text collision (`Print-Ready Sheet PreviewA4 • SHA-256 Offline`); `window.print()` lacks `@media print` stylesheet; 11 undersized touch targets and 1 textarea with `font-size: 12px` (`< 16px` iOS zoom trigger) |

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-59-01` — DOM XSS via Unescaped `kitTitle` and `vaultCustodian` in `generateEmergencyKitSvg()` + Missing `DOMPurify`
- **Severity**: `Critical`
- **Category**: `DOM Security & Sanitization`
- **Location**:
  - [`engine.ts#L98-L103`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/engine.ts#L98-L103) (`generateEmergencyKitSvg`)
  - [`emergency-recovery-kit.component.ts#L315-L317`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.ts#L315-L317) (`sanitizedSvg`)
- **Audit Evidence & Reproduction Steps**:
  1. Navigate to `http://127.0.0.1:4300/tools/emergency-recovery-kit`.
  2. Type `Jane</text><img src=x onerror="window.__xss59=true"><text>` into **Designated Vault Custodian** (or **Document Header Title**).
  3. `generateEmergencyKitSvg()` interpolates `options.vaultCustodian` and `options.kitTitle` directly into `<text>` tags without XML entity escaping, and `sanitizedSvg` injects the raw SVG via `this.sanitizer.bypassSecurityTrustHtml(this.svgOutput())` without `DOMPurify.sanitize()`.
  4. Headless Chrome audit verified `window.__xss59 === true` immediately upon input. Even benign input containing `&` (e.g., `John & Jane Doe`) breaks SVG XML parsing.
- **Root Cause Analysis**:
  - Direct violation of `AGENTS.md` §9. Neither XML entity escaping (`escapeXml()`) in `engine.ts` nor `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })` in the component is performed.

### `DEFECT-59-02` — Cropped SVG Preview Viewport & Missing `additionalInstructions` / `includeOfflineChecksumQr` in SVG Preview
- **Severity**: `Medium`
- **Category**: `Spec Conformance` / `Engine Logic`
- **Location**:
  - [`engine.ts#L66-L224`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/engine.ts#L66-L224) (`generateEmergencyKitSvg`)
  - [`emergency-recovery-kit.component.ts#L258-L266`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.ts#L258-L266)
- **Audit Evidence & Reproduction Steps**:
  1. Open `http://127.0.0.1:4300/tools/emergency-recovery-kit` at `1440×900` (`desktop.png`) or `390×844` (`mobile.png`).
  2. Observe ~160px of empty dark space above the white sheet in `.c-preview` while Section 5 (`TAMPER SEAL & FOLD GUIDE`) and the bottom `SHA-256` footer are clipped off the bottom.
  3. Type custom text into **Directives for Custodian / Heirs** (`options.additionalInstructions`) or toggle **Offline Checksum QR** (`options.includeOfflineChecksumQr`): the live SVG preview does not render either section, even though `generateEmergencyKitPdf()` (`engine.ts#L421-L453`) renders both in the exported PDF.
- **Root Cause Analysis**:
  - `generateEmergencyKitSvg()` sets fixed `width="735" height="1039.5"` attributes on `<svg>`, and the component places it inside `<div style="max-height: 600px">` inside flex-centered `.c-preview` (`align-items: center`).
  - `generateEmergencyKitSvg()` (`lines 204-219`) only renders Sections 1 through 5 and omits both `options.additionalInstructions` and the `options.includeOfflineChecksumQr` visual matrix that `generateEmergencyKitPdf()` draws.

### `DEFECT-59-03` — Fake Repeated 32-Bit FNV-1a Preview Hash Labeled as `SHA-256` Mismatches Exported PDF Digest
- **Severity**: `Medium`
- **Category**: `Engine Logic`
- **Location**:
  - [`emergency-recovery-kit.component.ts#L299-L309`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.ts#L299-L309) (`ephemeralChecksum`)
  - [`engine.ts#L250-L251`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/engine.ts#L250-L251) (`generateEmergencyKitPdf`)
- **Audit Evidence & Reproduction Steps**:
  1. Inspect the footer of the live SVG preview (`SHA-256: 7c42a6967c42a6967c42a6967c42a696...`): it is the same 8-character hex chunk repeated 8 times!
  2. Export the PDF and compare the SHA-256 fingerprint printed on the PDF with the preview: they are completely different.
- **Root Cause Analysis**:
  - `ephemeralChecksum` (`lines 299-309`) computes a synchronous 32-bit FNV-1a hash (`0x811c9dc5`) and calls `.repeat(8)`, whereas `generateEmergencyKitPdf()` (`line 250`) calls `computeTemplateHash(JSON.stringify(options) + Date.now())` using Web Crypto `crypto.subtle.digest('SHA-256', ...)`.
  - Using `effect()` (or updating a `templateHash` signal via `computeTemplateHash(JSON.stringify(options))` whenever `options()` changes, and passing that same deterministic hash into both `generateEmergencyKitSvg()` and `generateEmergencyKitPdf()`) ensures a genuine 64-hex-character SHA-256 digest that matches between the live preview and the exported PDF/print sheet.

### `DEFECT-59-04` — Mobile Horizontal Overflow, Header Collision, Missing `@media print` Stylesheet, and Small Touch Targets
- **Severity**: `Low`
- **Category**: `Mobile & Responsive Layout` / `Print Styles` / `BEM`
- **Location**:
  - [`emergency-recovery-kit.component.ts#L28-L35`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.ts#L28-L35)
  - [`emergency-recovery-kit.component.ts#L202-L208`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.ts#L202-L208)
  - [`emergency-recovery-kit.component.ts#L249-L254`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.ts#L249-L254)
  - [`emergency-recovery-kit.component.ts#L360-L362`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.ts#L360-L362)
- **Audit Evidence & Reproduction Steps**:
  1. At `390×844` and `320×568`, `scrollWidth` is `455px` due to `.c-header__title`.
  2. In `.c-card__header.l-extremo` (`line 249`), missing `.l-extremo__area-izquierda` / `.l-extremo__area-derecha` causes `Print-Ready Sheet PreviewA4 • SHA-256 Offline` to collide.
  3. Clicking **Print Sheet Directly** calls `window.print()`, but there are no `@media print` styles, so the browser prints the navigation header, configuration sidebar, and scroll container instead of isolating the recovery sheet.
  4. 11 controls (`2` text inputs at `28px`, `2` selects at `21px`, `7` checkboxes at `13×13px`) are under `32px`, and the `<textarea>` has `font-size: 12px` (`< 16px`, triggering iOS auto-zoom).
- **Root Cause Analysis**:
  - Missing `.l-extremo__area-*` classes, missing `@media print` rules, inline styles with `font-size: 12px`, and unstyled form controls.

---

## 3. Target Acceptance Criteria

1. **Full XSS Protection in SVG Generation & Rendering (`DEFECT-59-01`)**:
   - `generateEmergencyKitSvg()` MUST escape all user-supplied fields (`options.kitTitle`, `options.vaultCustodian`, `options.additionalInstructions`, `checksumHex`) via `escapeXml()`.
   - `sanitizedSvg` MUST pass the SVG markup through `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })` before `DomSanitizer.bypassSecurityTrustHtml()`.
   - Entering `<img src=x onerror=...>` or `&` into any input field MUST render safely as literal text without executing JS or breaking SVG XML.
2. **Uncropped SVG Preview with Directives & Offline Checksum QR (`DEFECT-59-02`)**:
   - The `<svg>` inside `.c-preview` MUST scale responsively (`width: 100%; height: auto; max-height: 760px; display: block`) without top dead space or bottom clipping.
   - `generateEmergencyKitSvg()` MUST render `options.additionalInstructions` (when non-empty) and the deterministic offline checksum QR matrix (when `options.includeOfflineChecksumQr` is true), matching `generateEmergencyKitPdf()`.
3. **Genuine, Consistent Web Crypto SHA-256 Digest (`DEFECT-59-03`)**:
   - Both the live SVG preview and the exported PDF MUST display a real 64-character SHA-256 digest derived deterministically from `computeTemplateHash(JSON.stringify(options))` (with synchronous fallback only while the async Web Crypto promise resolves).
4. **Print Stylesheet, Responsive BEM Layout & Accessible Controls (`DEFECT-59-04`)**:
   - Include `@media print` rules so `window.print()` hides chrome/configuration controls and prints the full-page recovery sheet cleanly.
   - Zero horizontal overflow (`scrollWidth <= clientWidth`) at `1440px`, `390px`, and `320px`.
   - Add `.l-extremo__area-izquierda` and `.l-extremo__area-derecha` to `.c-card__header.l-extremo`.
   - Enforce `>= 44px` touch targets on all inputs/selects/checkbox labels and `font-size >= 16px` on the directives `<textarea>`.
