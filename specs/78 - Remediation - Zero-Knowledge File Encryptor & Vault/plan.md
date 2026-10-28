# Implementation Plan — Spec 78: Zero-Knowledge File Encryptor & Vault Remediation

> **Tool**: 48 (`file-encryptor-vault`)
> **Spec Reference**: [spec.md](file:///home/deivision/Projects/Programming/PrivKnife/specs/78%20-%20Remediation%20-%20Zero-Knowledge%20File%20Encryptor%20&%20Vault/spec.md)

---

## 1. Architecture & Impacted Files

| File Path | Action | Responsibility |
| :--- | :--- | :--- |
| [`src/app/tools/privacy/file-encryptor-vault/types.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/types.ts) | **Modify** | Add worker request/response message interfaces for off-main-thread PBKDF2 + AES-GCM operations. |
| [`src/app/tools/privacy/file-encryptor-vault/engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/engine.ts) | **Modify** | Bind container metadata bytes (`metaBytes`) as AES-GCM `additionalData` (AAD) during `encryptFileToVault()` and verify AAD in `decryptVaultToFile()` (`DEFECT-48-01`). |
| [`src/app/tools/privacy/file-encryptor-vault/worker.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/worker.ts) | **Create** | Web Worker executing `encryptFileToVault()` and `decryptVaultToFile()` via `self.crypto.subtle` with deterministic progress callbacks (`DEFECT-48-03`). |
| [`src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.ts) | **Modify** | Add `"Embed original filename in vault"` toggle (`DEFECT-48-01`); render Confirm Password input in Encrypt mode and fix download button label (`DEFECT-48-02`); remove unused `URL.createObjectURL(file)` leak, reset `lastResult` on new file selection, and wire `worker.ts` (`DEFECT-48-03`); fix `320px` overflow, `.c-input__control` (`font-size: 16px`), and `var(--color-*)` tokens (`DEFECT-48-04`). |
| [`src/app/tools/privacy/file-encryptor-vault/engine.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/engine.spec.ts) | **Modify** | Add unit tests verifying that tampering with header metadata bytes causes AES-GCM AAD authentication failure and that `embedOriginalFilename: false` redacts the filename in the container header. |
| [`src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.spec.ts) | **Modify** | Add unit tests for Confirm Password validation, `embedOriginalFilename` toggle, initial download button label in Encrypt mode, leak-free `handleFileSelected()`, and zero-network privacy assertions. |

---

## 2. Pre-Agreed Testing Seams

1. **AES-GCM Additional Authenticated Data (AAD) Seam**:
   - Construct `metaBytes` (UTF-8 encoded JSON metadata) *before* calling `crypto.subtle.encrypt()` so `additionalData: metaBytes` is passed into `AesGcmParams`. In `decryptVaultToFile()`, pass the unpacked `metaBytes` slice as `additionalData` into `crypto.subtle.decrypt()`, ensuring any single-bit modification to the header metadata throws an authentication error.
2. **Confirm Password Compatibility Seam**:
   - In `FileEncryptorVaultComponent`, when the user types into the Confirm Password input (`#confirmPasswordInput`), `passwordMismatch` is computed as `operationMode() === 'encrypt' && confirmPassword().length > 0 && password() !== confirmPassword()`. When `passwordMismatch()` is `true`, `canExecute()` returns `false` and displays a clear warning banner; programmatic test calls that set `setPassword()` without touching `confirmPassword` continue to work seamlessly unless `confirmPassword` is populated with a mismatching value.
3. **Web Worker Crypto Seam**:
   - Both browser Web Workers and Node/Vitest environments expose `crypto.subtle`. If `typeof Worker === 'undefined'` in JSDOM, the component falls back to calling `encryptFileToVault()` / `decryptVaultToFile()` directly while still reporting progress stages.
4. **Blob URL Tracking Seam**:
   - Only output result Blobs (`result.blob`) create an object URL via `URL.createObjectURL()`, and any previous output URL is immediately revoked before assigning a new one.

---

## 3. TDD Vertical Slices

### Slice 1 — AES-GCM Metadata Authentication (AAD) & Filename Redaction (`DEFECT-48-01`)
- **Red**: Write unit test in `engine.spec.ts` that encrypts a sample file, mutates a single byte inside the plaintext JSON metadata header of the `.priv` container (e.g., changing `originalName`), and asserts that `decryptVaultToFile()` rejects with an authentication failure. Also assert that `embedOriginalFilename: false` stores `'redacted.bin'` in the container header.
- **Green**: Update `encryptFileToVault()` and `decryptVaultToFile()` in `engine.ts` to compute `metaBytes` deterministically and pass `additionalData: metaBytes` to `crypto.subtle.encrypt` and `crypto.subtle.decrypt`.
- **Refactor**: Keep backward-compatible fallback only if needed, or enforce strict AAD authentication on all v1 `.priv` containers.

### Slice 2 — Confirm Password Input, Filename Toggle & Download Label Fix (`DEFECT-48-01`, `DEFECT-48-02`)
- **Red**: Write component tests in `file-encryptor-vault.component.spec.ts` verifying:
  - In Encrypt mode, when `lastResult()` is `null`, the download button text is `Download Encrypted Vault`.
  - Entering a mismatching `confirmPassword` disables `canExecute()` and renders a password mismatch message.
  - Toggling the `"Embed original filename in vault"` switch updates `embedOriginalFilename()` and passes `false` to `encryptFileToVault()`.
  - Clicking `"Load Sample Confidential File"` loads `SAMPLE_CONFIDENTIAL_PAYLOAD` into `selectedFile`.
- **Green**: Update `file-encryptor-vault.component.ts` template and class with the Confirm Password input, `embedOriginalFilename` `.c-input__switch`, sample file loader button, and `(lastResult()?.operation ?? operationMode()) === 'encrypt'` button label.
- **Refactor**: Ensure switching `operationMode` to `'decrypt'` clears `confirmPassword`.

### Slice 3 — Web Worker Offloading & Leak-Free File Selection (`DEFECT-48-03`)
- **Red**: Write unit test in `file-encryptor-vault.component.spec.ts` spying on `URL.createObjectURL` and asserting that calling `handleFileSelected()` does NOT call `URL.createObjectURL` and resets `lastResult()` to `null`.
- **Green**: Remove the unused `URL.createObjectURL(file)` call in `handleFileSelected()`, clear `lastResult` on new file upload, create `worker.ts` for off-main-thread PBKDF2 + AES-GCM execution, and terminate the worker in `ngOnDestroy`.
- **Refactor**: Ensure output download URLs are revoked whenever a new encryption/decryption runs or `resetTool()` is called.

### Slice 4 — 320px Viewport Overflow Fix, >=16px Inputs & Dark-Mode Tokens (`DEFECT-48-04`)
- **Red**: Write component test asserting password and select controls use `.c-input__control` (`font-size: 1rem`).
- **Green**: Replace `.c-input__text` and `.c-input__select` with `.c-input__control`, add `min-width: 0; overflow-wrap: anywhere` to `.c-header`, `.c-password-field`, and `.l-columns__area`, and replace all hardcoded hex colors with `var(--color-*)` tokens.
- **Refactor**: Run Vitest suite and headless Chrome verification across `1366×900`, `390×844`, and `320×640`.
