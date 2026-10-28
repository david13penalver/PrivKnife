# Remediation Tasks: Printable Emergency Recovery & Password Kit Sheet (Tool 59)

- **Target Tool**: `59` — `emergency-recovery-kit`
- **Spec Reference**: [`specs/89 - Remediation - Printable Emergency Recovery & Password Kit Sheet/spec.md`](file:///home/deivision/Projects/Programming/PrivKnife/specs/89%20-%20Printable%20Emergency%20Recovery%20&%20Password%20Kit%20Sheet/spec.md)
- **Plan Reference**: [`specs/89 - Remediation - Printable Emergency Recovery & Password Kit Sheet/plan.md`](file:///home/deivision/Projects/Programming/PrivKnife/specs/89%20-%20Printable%20Emergency%20Recovery%20&%20Password%20Kit%20Sheet/plan.md)

---

## Phase 1: Engine Remediation (`engine.ts`)

- [x] **Task 1.1 (RED — `DEFECT-59-01`)**: Add failing unit tests in [`emergency-recovery-kit.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.spec.ts) verifying that `generateEmergencyKitSvg()` escapes `<`, `>`, `&`, `"`, and `'` in `kitTitle`, `vaultCustodian`, and `additionalInstructions`.
- [x] **Task 1.2 (GREEN — `DEFECT-59-01`)**: Implement `escapeXml()` in [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/engine.ts) and apply it to all user strings interpolated into SVG `<text>` nodes.
- [x] **Task 1.3 (RED — `DEFECT-59-02`, `DEFECT-59-03`)**: Add failing unit tests verifying that `generateEmergencyKitSvg()` renders `additionalInstructions` and `includeOfflineChecksumQr` when enabled, and that `generateEmergencyKitPdf()` uses a deterministic SHA-256 digest matching `computeTemplateHash(JSON.stringify(options))`.
- [x] **Task 1.4 (GREEN — `DEFECT-59-02`, `DEFECT-59-03`)**: Update `generateEmergencyKitSvg()` and `generateEmergencyKitPdf()` in [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/engine.ts) to render directives + offline QR in SVG and use deterministic `computeTemplateHash(JSON.stringify(options))`.

---

## Phase 2: Component State & Real SHA-256 Digest (`emergency-recovery-kit.component.ts`)

- [x] **Task 2.1 (RED — `DEFECT-59-03`)**: Add a failing component test asserting that `ephemeralChecksum()` updates via `computeTemplateHash()` to a genuine 64-character SHA-256 hex digest rather than an 8-character FNV-1a chunk repeated 8 times.
- [x] **Task 2.2 (GREEN — `DEFECT-59-03`)**: Wire `computeTemplateHash(JSON.stringify(this.options()))` in [`emergency-recovery-kit.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.ts) to keep the preview SHA-256 signal synchronized with the PDF generator.

---

## Phase 3: DOM Security & Sanitization (`emergency-recovery-kit.component.ts`)

- [x] **Task 3.1 (RED — `DEFECT-59-01`)**: Add a security test in [`emergency-recovery-kit.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.spec.ts) setting `vaultCustodian` to `Jane</text><img src=x onerror="window.__xss59=true"><text>` and verifying zero `<img>` or `[onerror]` nodes exist in `.c-preview`.
- [x] **Task 3.2 (GREEN — `DEFECT-59-01`)**: Sanitize `svgOutput()` with `DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } })` before calling `DomSanitizer.bypassSecurityTrustHtml()` in [`emergency-recovery-kit.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.ts).

---

## Phase 4: Styling, Print Media Query, BEM Compliance & Responsive Layout

- [x] **Task 4.1 (RED — `DEFECT-59-02`, `DEFECT-59-04`)**: Add DOM assertions in [`emergency-recovery-kit.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.spec.ts) verifying `.l-extremo__area-izquierda`, `.l-extremo__area-derecha`, and `.c-emergency-kit__*` BEM classes.
- [x] **Task 4.2 (GREEN — `DEFECT-59-02`, `DEFECT-59-04`)**: Refactor [`emergency-recovery-kit.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.ts) to scale `<svg>` responsively inside `.c-preview` without clipping Section 5 or the footer, add `@media print` rules, add `.l-extremo__area-*` classes to the preview header, fix `.c-header__title` wrapping (`overflow-wrap: anywhere`), set `font-size: 1rem` (`16px`) on the `<textarea>`, and enforce `>= 44px` touch targets on all controls.

---

## Phase 5: Final Verification & Regression Gate

- [x] **Task 5.1**: Run `npx vitest run src/app/tools/privacy/emergency-recovery-kit/emergency-recovery-kit.component.spec.ts` and verify 100% of unit, security, and privacy tests pass.
- [x] **Task 5.2**: Verify in headless Chrome at `1440×900`, `390×844`, and `320×568` that the full recovery sheet renders uncropped, `scrollWidth <= clientWidth`, `smallTouchTargets === 0`, and `inputsUnder16px_iOSZoom === 0`.
