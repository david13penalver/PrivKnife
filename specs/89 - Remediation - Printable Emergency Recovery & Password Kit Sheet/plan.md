# Remediation Implementation Plan: Printable Emergency Recovery & Password Kit Sheet (Tool 59)

- **Target Tool**: `59` — `emergency-recovery-kit`
- **Spec Reference**: [`specs/89 - Remediation - Printable Emergency Recovery & Password Kit Sheet/spec.md`](file:///home/deivision/Projects/Programming/PrivKnife/specs/89%20-%20Printable%20Emergency%20Recovery%20&%20Password%20Kit%20Sheet/spec.md)

---

## 1. Impacted Files

| File Path | Action | Purpose |
| :--- | :--- | :--- |
| [`PrivKnife/src/app/tools/privacy/emergency-recovery-kit/engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/engine.ts) | `MODIFY` | Escape all user strings in `generateEmergencyKitSvg()` (`DEFECT-59-01`), render `additionalInstructions` and `includeOfflineChecksumQr` in `generateEmergencyKitSvg()` (`DEFECT-59-02`), and use deterministic `computeTemplateHash(JSON.stringify(options))` across SVG and PDF (`DEFECT-59-03`) |
| [`PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.ts) | `MODIFY` | Sanitize SVG with `DOMPurify.sanitize()` (`DEFECT-59-01`), update `ephemeralChecksum` via async `computeTemplateHash()` (`DEFECT-59-03`), fix uncropped responsive SVG scaling (`DEFECT-59-02`), and add `@media print`, `.l-extremo__area-*`, and `.c-emergency-kit__*` BEM styles (`DEFECT-59-04`) |
| [`PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.spec.ts) | `MODIFY` | Add unit, security, and DOM tests covering `DEFECT-59-01` through `DEFECT-59-04` |

---

## 2. Pre-Agreed Testing Seams

### Seam 1: Pure Engine Unit Tests (`engine.ts`)
- Test `generateEmergencyKitSvg()` escapes `<`, `>`, `&`, `"`, and `'` in `kitTitle`, `vaultCustodian`, and `additionalInstructions` so no raw HTML/SVG tags can be injected (`DEFECT-59-01`).
- Test `generateEmergencyKitSvg()` includes `additionalInstructions` text and the offline checksum QR matrix when enabled (`DEFECT-59-02`).
- Test `computeTemplateHash(JSON.stringify(options))` produces a 64-char hex SHA-256 digest without `Date.now()` non-determinism, and `generateEmergencyKitPdf()` embeds the exact same digest (`DEFECT-59-03`).

### Seam 2: Web Worker Message Contract Tests
- Not applicable (blank template SVG & jsPDF synthesis executes in `<15ms`).

### Seam 3: Component State, Error Recovery & Resource Disposal (`emergency-recovery-kit.component.ts`)
- Test setting `vaultCustodian` or `kitTitle` to `Jane</text><img src=x onerror="window.__xss59=true"><text>` produces zero `<img>` or `[onerror]` elements in the rendered `.c-preview` DOM (`DEFECT-59-01`).
- Test updating `options` updates the SHA-256 checksum signal via `computeTemplateHash()` so the 64-char hex string does not consist of a repeated 8-char chunk (`DEFECT-59-03`).

### Seam 4: DOM, BEM, A11y & Security Verification
- Verify `.c-card__header.l-extremo` uses `.l-extremo__area-izquierda` and `.l-extremo__area-derecha` (`DEFECT-59-04`).
- Verify `.c-emergency-kit__preview-stage svg` scales responsively (`width: 100%; height: auto`) and `@media print` rules exist (`DEFECT-59-02`, `DEFECT-59-04`).
- Verify zero network calls (`fetch` / `XMLHttpRequest`) during SVG preview and PDF generation.

---

## 3. TDD Vertical Slices (Red → Green → Refactor)

### Slice 1: SVG XML Escaping & `DOMPurify` Sanitization (`DEFECT-59-01`)
- **RED**: Write unit tests in `emergency-recovery-kit.component.spec.ts` asserting that:
  1. `generateEmergencyKitSvg()` with `kitTitle: 'Vault & Co. <script>alert(1)</script>'` and `vaultCustodian: 'Jane</text><img src=x onerror=alert(1)><text>'` escapes all `<`, `>`, and `&` characters.
  2. Rendering the component with those options produces zero `<img>` or `<script>` elements inside `.c-preview`.
- **GREEN**:
  1. Add `export function escapeXml(str: string): string` in `engine.ts` and escape `options.kitTitle`, `options.vaultCustodian`, `options.additionalInstructions`, and `checksumHex` in `generateEmergencyKitSvg()`.
  2. Import `DOMPurify` in `emergency-recovery-kit.component.ts` and sanitize `this.svgOutput()` with `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })` before `this.sanitizer.bypassSecurityTrustHtml()`.
- **REFACTOR**: Centralize SVG `<text>` rendering helpers in `engine.ts`.

### Slice 2: Complete SVG Preview Sections (`additionalInstructions` + QR Matrix) & Real SHA-256 Digest (`DEFECT-59-02`, `DEFECT-59-03`)
- **RED**: Write unit tests asserting that:
  1. `generateEmergencyKitSvg({ ...DEFAULT_EMERGENCY_KIT_OPTIONS, additionalInstructions: 'Contact attorney', includeOfflineChecksumQr: true }, hash)` renders `'Contact attorney'` and the QR finder squares in the SVG output.
  2. `component.ephemeralChecksum()` resolves via `computeTemplateHash()` to a 64-char SHA-256 hex digest where the first 8 chars are not simply repeated 8 times, matching the hash embedded by `generateEmergencyKitPdf()`.
- **GREEN**:
  1. Update `generateEmergencyKitSvg()` in `engine.ts` to render the `DIRECTIVES / CUSTODIAN NOTES` box when `options.additionalInstructions.trim().length > 0` and the deterministic QR matrix in the bottom-right corner when `options.includeOfflineChecksumQr` is true.
  2. Remove `+ Date.now()` from `generateEmergencyKitPdf()` (`line 250`) so `computeTemplateHash(JSON.stringify(options))` is deterministic for a given `EmergencyKitOptions` state, and wire an Angular `effect()` in `emergency-recovery-kit.component.ts` that calls `computeTemplateHash(JSON.stringify(this.options()))` to update `ephemeralChecksum`.
- **REFACTOR**: Share the deterministic QR bit-matrix logic between `generateEmergencyKitSvg()` and `generateEmergencyKitPdf()`.

### Slice 3: Uncropped SVG Viewport, `@media print` Stylesheet & Responsive BEM Controls (`DEFECT-59-02`, `DEFECT-59-04`)
- **RED**: Write DOM tests asserting that `.c-card__header.l-extremo` contains `.l-extremo__area-izquierda` and `.l-extremo__area-derecha`, and that all custom classes use `.c-emergency-kit__*` BEM conventions.
- **GREEN**:
  1. Replace the `max-height: 600px` inline wrapper with `.c-emergency-kit__preview-stage` where `svg { width: 100%; height: auto; max-height: 780px; display: block; }` and `.c-preview` uses `align-items: flex-start`.
  2. Add `.l-extremo__area-izquierda` and `.l-extremo__area-derecha` to `.c-card__header.l-extremo`.
  3. Add `@media print` rules that hide `.c-header`, `.c-emergency-kit__controls`, and action buttons while displaying `.c-emergency-kit__preview-stage` at full page width.
  4. Replace inline styles with `.c-emergency-kit__*` BEM classes, set `font-size: 1rem` (`16px`) on the directives `<textarea>`, add `overflow-wrap: anywhere` on `.c-header__title`, and enforce `>= 44px` touch targets on all inputs, selects, and checkbox labels.
- **REFACTOR**: Run full unit test suite and verify desktop/mobile rendering in headless Chrome.
