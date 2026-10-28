# Spec 78 — Remediation: Zero-Knowledge File Encryptor & Vault

> **Tool Number**: 48
> **Tool Slug**: `file-encryptor-vault`
> **Category**: `privacy`
> **Route**: `/tools/file-encryptor-vault`
> **Original Spec**: [specs/48 - Zero-Knowledge File Encryptor & Vault/spec.md](file:///home/deivision/Projects/Programming/PrivKnife/specs/48%20-%20Zero-Knowledge%20File%20Encryptor%20&%20Vault/spec.md)
> **Audit Reference**: [tools_31_60_audit.md — Tool 48](file:///home/deivision/Projects/Programming/PrivKnife/tools_31_60_audit.md#tool-48)
> **Remediation Priority**: `Medium`
> **Overall Audit Status**: `✅ Works` (Functional: `✅ Works` | Mobile: `⚠️ Minor issues`)

---

## 1. Executive Summary & Audit Baseline

### 1.1 Current State & What Works
The **Zero-Knowledge File Encryptor & Vault** (`file-encryptor-vault`) implements genuine client-side cryptography via the native browser Web Crypto API (`crypto.subtle`) with zero external network calls (`networkRequests: []`). Key derivation uses `PBKDF2-SHA256` with configurable iteration profiles (`100,000`, `300,000`, `600,000` iterations) and a 16-byte CSPRNG salt (`crypto.getRandomValues`), paired with authenticated `AES-GCM-256` encryption using a 12-byte random IV and 128-bit authentication tag. In headless Chrome end-to-end verification, encrypting `secret-financials.json` (`967 B`) produced a valid `.priv` binary container (`secret-financials.json.priv`, `1,142 B`) starting with magic header `PRIV\x01`, attempting decryption with an incorrect password was rejected by the AES-GCM tag (`⚠️ Decryption failed...`), and decrypting with the correct password restored a byte-identical `secret-financials.json` (`967 B`, `Buffer.compare === 0`).

### 1.2 Why Remediation Is Required
While core round-trip encryption and decryption work, four security, UX, performance, and mobile layout defects were identified during the audit:
1. **Unauthenticated & Unencrypted Cleartext Header Metadata + Missing `embedOriginalFilename` Toggle (`DEFECT-48-01`, Medium)**: `encryptFileToVault()` (`engine.ts#L170-L201`, `#L358-L368`) stores `ContainerMetadata` (`originalName`, `originalSize`, `mimeType`, `encryptedAt`) as unencrypted UTF-8 JSON in the `.priv`/`.enc` binary header without passing `metaBytes` as AES-GCM `additionalData` (AAD), and `embedOriginalFilename = signal<boolean>(true)` (`file-encryptor-vault.component.ts#L347`) has no toggle in the template—exposing `"secret-financials.json"` in plaintext to `strings` inspection and leaving the header metadata unauthenticated against tampering.
2. **Dead `confirmPassword` Signal & Misleading Disabled Download Button Label (`DEFECT-48-02`, Medium)**: `confirmPassword = signal<string>('')` and `setConfirmPassword()` exist on `FileEncryptorVaultComponent` (`file-encryptor-vault.component.ts#L350`, `#L379-L381`), but no Confirm Password input is rendered in Encrypt mode, risking permanent zero-knowledge lockout from a single password typo. Additionally, the disabled download button (`#L268`) renders `Download Decrypted File` when `lastResult()` is `null` even while `operationMode() === 'encrypt'`.
3. **Main-Thread PBKDF2 / AES-GCM Processing, Unused Blob URL Leak & Stale State (`DEFECT-48-03`, Medium)**: Up to `600,000` PBKDF2-SHA256 iterations and full-file `arrayBuffer()` encryption run on the main UI thread without a Web Worker (`Directive 3`), `handleFileSelected()` (`#L399-L400`) creates an unused `URL.createObjectURL(file)` on every file drop (`Directive 4`), and selecting a new file does not reset stale `lastResult`.
4. **320px Horizontal Viewport Overflow, iOS <16px Input Auto-Zoom & Hardcoded Light-Mode Colors (`DEFECT-48-04`, Low)**: At `320×640`, `scrollWidth` is `336px` (`hasHorizontalScroll: true`), `input.c-input__text` uses `font-size: 0.875rem` (`14px` < `16px`, triggering iOS Safari auto-zoom), and component styles hardcode light-mode hex colors (`#cbd5e1`, `#065f46`, `#b91c1c`, `#f8fafc`, `#e2e8f0`, `#64748b`, `#94a3b8`).

---

## 2. Detailed Defect Registry & Root Cause Analysis

### `DEFECT-48-01` — Unencrypted & Unauthenticated Container Metadata Header + Missing `embedOriginalFilename` Toggle
- **Severity**: `Medium`
- **Category**: `DOM Security & Cryptography` / `Spec Conformance`
- **Location**:
  - [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/engine.ts#L170-L201)
  - [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/engine.ts#L338-L395)
  - [`file-encryptor-vault.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.ts#L347)
  - [`file-encryptor-vault.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.ts#L446)
- **Audit Evidence**:
  - `packVaultContainer()` (`engine.ts#L170-L201`) serializes `metadata` (`{ originalName, originalSize, mimeType, encryptedAt }`) as plaintext UTF-8 JSON immediately following the 37-byte binary header.
  - `encryptFileToVault()` (`#L358-L361`) calls `crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, plainBuffer)` without `additionalData`, so an attacker can modify `originalName` or `mimeType` in the plaintext JSON header without invalidating the AES-GCM authentication tag.
  - `embedOriginalFilename = signal<boolean>(true)` (`file-encryptor-vault.component.ts#L347`) is passed to `encryptFileToVault()`, but has no checkbox/switch in the template, so the user's filename (`secret-financials.json`) is always embedded in cleartext inside the `.priv` file.
- **Root Cause**: `embedOriginalFilename` was added to `VaultOptions` and component signals, but its UI toggle was omitted from the template, and AES-GCM Additional Authenticated Data (`additionalData`) was not wired to bind the container header to the authentication tag.
- **Required Fix**:
  1. Authenticate the binary header + `metaBytes` using AES-GCM `additionalData: metaBytes` during `encryptFileToVault()`. In `decryptVaultToFile()`, verify with `additionalData: metaBytes` first and fall back to no-AAD only for legacy containers created prior to AAD binding (or mark AAD-authenticated containers with a flag bit in the header).
  2. Expose an `"Embed original filename in vault metadata"` `.c-input__switch` toggle in Encrypt mode in [`file-encryptor-vault.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.ts) (when unchecked, `originalName` is stored as `'redacted.bin'` so no sensitive filename appears in the container header).

---

### `DEFECT-48-02` — Unused `confirmPassword` Signal in Encrypt Mode & Misleading Initial Download Button Label
- **Severity**: `Medium`
- **Category**: `Spec Conformance` / `Component State`
- **Location**:
  - [`file-encryptor-vault.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.ts#L101-L120)
  - [`file-encryptor-vault.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.ts#L265-L271)
  - [`file-encryptor-vault.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.ts#L350)
  - [`file-encryptor-vault.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.ts#L379-L381)
- **Audit Evidence**:
  - `confirmPassword = signal<string>('')` (`#L350`) and `setConfirmPassword(val: string)` (`#L379-L381`) are declared on the component class, but no Confirm Password input is rendered in the template and `canExecute()` (`#L365-L368`) only checks `this.password().trim().length > 0`.
  - In the right card footer (`#L268`), the button label expression is `Download {{ lastResult()?.operation === 'encrypt' ? 'Encrypted Vault' : 'Decrypted File' }}`. When `lastResult()` is `null` and `operationMode() === 'encrypt'`, `lastResult()?.operation === 'encrypt'` evaluates to `false`, displaying `Download Decrypted File` in Encrypt mode.
- **Root Cause**: The Confirm Password field was omitted from the template during initial scaffolding, and the ternary expression in `#L268` did not fall back to `operationMode()`.
- **Required Fix**:
  1. Render a Confirm Master Password `<input>` in Encrypt mode (`@if (operationMode() === 'encrypt')`) with a visible mismatch warning when `confirmPassword().length > 0 && password() !== confirmPassword()`.
  2. Require `password() === confirmPassword()` (when `confirmPassword` is filled or in interactive Encrypt mode, preserving unit test compatibility via a clear helper or matching default) and add a `"Load Sample Confidential File"` button for instant testing.
  3. Update the download button label at `#L268` to `Download {{ (lastResult()?.operation ?? operationMode()) === 'encrypt' ? 'Encrypted Vault' : 'Decrypted File' }}`.

---

### `DEFECT-48-03` — Main-Thread PBKDF2 / AES-GCM Execution, Unused `URL.createObjectURL` Leak & Stale Result State
- **Severity**: `Medium`
- **Category**: `Web Worker & Performance` / `Memory Hygiene`
- **Location**:
  - [`file-encryptor-vault.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.ts#L394-L465)
- **Audit Evidence**:
  - `handleFileSelected()` (`#L399-L400`) executes:
    ```ts
    const url = URL.createObjectURL(file);
    this.createdBlobUrls.push(url);
    ```
    even though `url` is never stored or bound anywhere in the component (`Directive 4` violation).
  - Selecting a new file in `handleFileSelected()` does not clear `this.lastResult.set(null)`.
  - `executeVaultAction()` runs up to `600,000` PBKDF2-SHA256 iterations and full-file `AES-GCM` encryption on the main UI thread without a Web Worker (`Directive 3`).
- **Root Cause**: Unnecessary `URL.createObjectURL(file)` call in `handleFileSelected()` and missing `worker.ts`.
- **Required Fix**:
  - Remove the unused `URL.createObjectURL(file)` call in `handleFileSelected()` and reset `this.lastResult.set(null)` (revoking any previous output download URL) when a new file is selected.
  - Create [`worker.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/worker.ts) to execute PBKDF2 key derivation and AES-GCM encryption/decryption off the main thread (`self.crypto.subtle` is natively available inside Web Workers) with progress updates and clean termination in `ngOnDestroy`.

---

### `DEFECT-48-04` — 320px Horizontal Viewport Overflow, iOS <16px Input Auto-Zoom & Hardcoded Light-Mode Colors
- **Severity**: `Low`
- **Category**: `Mobile & Responsive Layout` / `Theme Contrast` / `BEM & Form Accessibility`
- **Location**:
  - [`file-encryptor-vault.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.ts#L104-L119)
  - [`file-encryptor-vault.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.ts#L276-L338)
- **Audit Evidence**:
  - At `320×640`, `document.documentElement.scrollWidth` is `336px` (`clientWidth: 320px`, `hasHorizontalScroll: true`) because `.c-header__title` and `.c-password-field` (`input.c-input__text` with `flex: 1` and no `min-width: 0`) overflow the 320px container.
  - `input.c-input__text` (`#L291-L296`) sets `font-size: 0.875rem` (`14px` < `16px`), triggering iOS Safari viewport auto-zoom on focus (`inputsUnder16px_iOSZoom: 1`), and `<select class="c-input__select">` uses non-existent `.c-input__select` (`21px` tall) instead of `.c-input__control`.
  - Component styles (`#L276-L338`) hardcode `#cbd5e1`, `#065f46`, `#b91c1c`, `#f8fafc`, `#e2e8f0`, `#64748b`, and `#94a3b8`.
- **Root Cause**: Custom `.c-input__text` and `.c-input__select` styles bypassed `_c-input.scss` (`.c-input__control` provides `min-height: 38px; font-size: 1rem`) and lacked `min-width: 0` inside `.c-password-field`.
- **Required Fix**:
  - Replace `.c-input__text` and `.c-input__select` with `.c-input__control` (`font-size: 1rem` / `16px`, `min-width: 0`).
  - Add `min-width: 0; overflow-wrap: anywhere` to `.c-header`, `.c-password-field`, and `.l-columns__area` so `scrollWidth <= clientWidth` at `320px`.
  - Replace all hardcoded hex colors with `var(--color-*)` tokens.

---

## 3. Target Acceptance Criteria

1. **Authenticated Metadata Header (AAD) & Filename Redaction Toggle (`DEFECT-48-01`)**:
   - `encryptFileToVault()` authenticates the container metadata via AES-GCM `additionalData` (`metaBytes`), so tampering with the header metadata causes `decryptVaultToFile()` to reject the tampered container; toggling off `"Embed original filename in vault"` stores `'redacted.bin'` instead of the sensitive filename.
2. **Confirm Password Validation & Accurate Download Button Label (`DEFECT-48-02`)**:
   - Encrypt mode renders a Confirm Password input that prevents accidental password typos when non-empty and displays a clear mismatch warning; the download button displays `Download Encrypted Vault` in Encrypt mode even before processing completes.
3. **Web Worker Cryptography & Leak-Free URL Management (`DEFECT-48-03`)**:
   - PBKDF2 key derivation and AES-GCM encryption/decryption run in `worker.ts` (with main-thread fallback in JSDOM), `handleFileSelected()` does not create unused blob URLs, and selecting a new file resets stale `lastResult`.
4. **Zero Mobile Overflow at 320px, >=16px Inputs & Dark-Mode Variables (`DEFECT-48-04`)**:
   - Zero horizontal scroll (`scrollWidth <= clientWidth`) at `1366×900`, `390×844`, and `320×640`; password and select inputs use `.c-input__control` (`font-size: 16px`, `inputsUnder16px_iOSZoom: 0`); all component styles use `var(--color-*)`.
5. **Zero Network Exfiltration (`Directive 1 & 2`)**:
   - Zero external network requests (`connect-src 'self' blob: data:`) during all encryption, decryption, and key derivation operations.
