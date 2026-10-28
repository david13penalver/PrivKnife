# Remediation Tasks — Spec 78: Zero-Knowledge File Encryptor & Vault

> **Tool**: 48 (`file-encryptor-vault`)
> **Spec**: [spec.md](file:///home/deivision/Projects/Programming/PrivKnife/specs/78%20-%20Remediation%20-%20Zero-Knowledge%20File%20Encryptor%20&%20Vault/spec.md)
> **Plan**: [plan.md](file:///home/deivision/Projects/Programming/PrivKnife/specs/78%20-%20Remediation%20-%20Zero-Knowledge%20File%20Encryptor%20&%20Vault/plan.md)

---

## Phase 1: AES-GCM Metadata Authentication (AAD) (`DEFECT-48-01`)
- [x] **Task 1.1 (Red)**: Add unit tests in [`engine.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/engine.spec.ts) asserting that modifying any byte of the serialized JSON metadata header inside a `.priv` container causes `decryptVaultToFile()` to reject with an authentication failure, and verifying `embedOriginalFilename: false` redacts the original filename to `'redacted.bin'`.
- [x] **Task 1.2 (Green)**: Update `encryptFileToVault()` and `decryptVaultToFile()` in [`engine.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/engine.ts) to pass the exact `metaBytes` slice as `additionalData` in `AesGcmParams`.

## Phase 2: Web Worker & Memory Hygiene (`DEFECT-48-03`)
- [x] **Task 2.1 (Red)**: Add unit tests in [`file-encryptor-vault.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.spec.ts) verifying `handleFileSelected()` does not call `URL.createObjectURL` and clears stale `lastResult`.
- [x] **Task 2.2 (Green)**: Create [`worker.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/worker.ts) to offload PBKDF2-SHA256 key derivation (`100k–600k` iterations) and AES-GCM-256 encryption/decryption off the Angular main thread (`Directive 3`).
- [x] **Task 2.3 (Green)**: Remove the unused `URL.createObjectURL(file)` call in `handleFileSelected()`, clear and revoke previous `lastResult` on new file selection, and terminate any active worker in `ngOnDestroy` (`Directive 4`).

## Phase 3: Confirm Password, Filename Redaction Toggle & Button Label (`DEFECT-48-01`, `DEFECT-48-02`)
- [x] **Task 3.1 (Red)**: Add component tests in [`file-encryptor-vault.component.spec.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.spec.ts) for:
  - Confirm Password input rendering in Encrypt mode and mismatch warning / button disabling.
  - `"Embed original filename in vault"` `.c-input__switch` toggle updating `embedOriginalFilename()`.
  - Download button label displaying `Download Encrypted Vault` when `lastResult()` is `null` and `operationMode() === 'encrypt'`.
  - `"Load Sample Confidential File"` button loading a sample file for immediate encryption.
- [x] **Task 3.2 (Green)**: Update [`file-encryptor-vault.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.ts) to render the Confirm Password input, the `"Embed original filename in vault"` switch, the sample file loader button, and the fixed download button label `(lastResult()?.operation ?? operationMode()) === 'encrypt' ? 'Encrypted Vault' : 'Decrypted File'`.

## Phase 4: 320px Overflow Fix, >=16px Form Controls & Dark-Mode Tokens (`DEFECT-48-04`)
- [x] **Task 4.1 (Green)**: Replace `class="c-input__text"` and `class="c-input__select"` with `class="c-input__control"` (`font-size: 1rem` / `16px`, `min-height: 38px`) to prevent iOS Safari auto-zoom (`inputsUnder16px_iOSZoom: 0`).
- [x] **Task 4.2 (Green)**: Add `min-width: 0; overflow-wrap: anywhere` to `.c-header`, `.c-password-field`, and `.l-columns__area` so `scrollWidth <= clientWidth` at `320×640`.
- [x] **Task 4.3 (Green)**: Replace all hardcoded hex colors (`#cbd5e1`, `#065f46`, `#b91c1c`, `#f8fafc`, `#e2e8f0`, `#64748b`, `#94a3b8`) in [`file-encryptor-vault.component.ts`](file:///home/deivision/Projects/Programming/PrivKnife/PrivKnife/src/app/tools/privacy/file-encryptor-vault/file-encryptor-vault.component.ts) with CSS custom properties (`var(--color-*)`).

## Phase 5: End-to-End & Privacy Verification
- [x] **Task 5.1**: Run `npx vitest run src/app/tools/privacy/file-encryptor-vault/` and confirm 100% test pass rate.
- [x] **Task 5.2**: Verify in headless Chrome at `1366×900`, `390×844`, and `320×640` that round-trip `.priv` encryption, wrong-password rejection, header tampering rejection, and byte-identical decryption succeed with `hasHorizontalScroll: false`, `inputsUnder16px_iOSZoom: 0`, and `networkRequests: []`.
