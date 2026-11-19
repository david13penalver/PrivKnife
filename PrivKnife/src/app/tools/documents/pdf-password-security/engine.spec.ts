import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  buildProtectArgv,
  buildSecuredFileName,
  buildUnlockArgv,
  evaluatePasswordStrength,
  inspectPdfEncryption,
  parseQpdfEncryptionOutput,
  protectPdf,
  unlockPdf,
  validateProtectOptions,
} from './engine';
import {
  createCorruptPdfBytes,
  createNonPdfBytes,
  createSyntheticPdf,
  DEFAULT_PROTECT_OPTIONS,
} from './test-fixtures';

describe('PDF Password Protector & Unlocker Engine (Seam 1)', () => {
  describe('Slice 1: Entropy Meter, QPDF Argv Safety, Output Parser & Validation', () => {
    it('evaluates password entropy and penalizes repeated/low-diversity strings', () => {
      expect(evaluatePasswordStrength('').grade).toBe('empty');
      expect(evaluatePasswordStrength('').entropyBits).toBe(0);

      const weak = evaluatePasswordStrength('123456');
      expect(weak.grade).toBe('weak');
      expect(weak.entropyBits).toBeLessThan(35);

      const repeated = evaluatePasswordStrength('aaaaaaaaaaaa');
      expect(repeated.grade).toBe('weak');

      const strong = evaluatePasswordStrength('CorrectHorse99!#');
      expect(['strong', 'excellent']).toContain(strong.grade);
      expect(strong.entropyBits).toBeGreaterThanOrEqual(75);
    });

    it('constructs safe QPDF --encrypt argv without --use-aes=y for 256-bit and with --use-aes=y for 128-bit', () => {
      const args256 = buildProtectArgv(
        '/in.pdf',
        '/out.pdf',
        { ...DEFAULT_PROTECT_OPTIONS, userPassword: '-secret', ownerPassword: 'owner', keyLength: 256 },
        'fallback-owner'
      );
      expect(args256[0]).toBe('--encrypt');
      expect(args256[1]).toBe('--user-password=-secret');
      expect(args256[2]).toBe('--owner-password=owner');
      expect(args256[3]).toBe('--bits=256');
      expect(args256.some((a) => a.startsWith('--use-aes'))).toBe(false);
      expect(args256).toContain('--print=full');
      expect(args256).toContain('--modify=none');
      expect(args256).toContain('--extract=n');
      expect(args256).toContain('--accessibility=y');
      expect(args256.slice(-3)).toEqual(['--', '/in.pdf', '/out.pdf']);

      const args128 = buildProtectArgv(
        '/in.pdf',
        '/out.pdf',
        { ...DEFAULT_PROTECT_OPTIONS, userPassword: 'user1', ownerPassword: '', keyLength: 128 },
        'csprng-owner-xyz'
      );
      expect(args128[2]).toBe('--owner-password=csprng-owner-xyz');
      expect(args128[3]).toBe('--bits=128');
      expect(args128).toContain('--use-aes=y');
    });

    it('constructs --password=... argv before --decrypt for leading-hyphen unlock passwords', () => {
      const args = buildUnlockArgv('/in.pdf', '/out.pdf', '-dashPassword!');
      expect(args).toEqual(['--password=-dashPassword!', '--decrypt', '--', '/in.pdf', '/out.pdf']);

      const emptyArgs = buildUnlockArgv('/in.pdf', '/out.pdf', '');
      expect(emptyArgs).toEqual(['--decrypt', '--', '/in.pdf', '/out.pdf']);
    });

    it('parses QPDF --show-encryption outputs across unencrypted, RC4, AES-128, AES-256, and invalid password', () => {
      expect(
        parseQpdfEncryptionOutput('File is not encrypted\n', '', 0)
      ).toEqual({
        isEncrypted: false,
        requiresUserPassword: false,
        algorithm: 'none',
      });

      expect(
        parseQpdfEncryptionOutput('R = 6\nP = -4\nUser password = \n', '', 0)
      ).toEqual({
        isEncrypted: true,
        requiresUserPassword: false,
        algorithm: 'AES-256',
      });

      expect(
        parseQpdfEncryptionOutput('R = 4\nstream encryption method: AESv2\n', '', 0)
      ).toEqual({
        isEncrypted: true,
        requiresUserPassword: false,
        algorithm: 'AES-128',
      });

      expect(
        parseQpdfEncryptionOutput('R = 3\n', '', 0)
      ).toEqual({
        isEncrypted: true,
        requiresUserPassword: false,
        algorithm: 'RC4-128',
      });

      expect(
        parseQpdfEncryptionOutput('', 'qpdf: /in.pdf: invalid password', 2)
      ).toEqual({
        isEncrypted: true,
        requiresUserPassword: true,
        algorithm: 'unknown',
      });
    });

    it('validates protect options and sanitizes output filenames', () => {
      expect(
        validateProtectOptions({ ...DEFAULT_PROTECT_OPTIONS, userPassword: 'abc' })
      ).toBe(true);
      expect(
        validateProtectOptions({ ...DEFAULT_PROTECT_OPTIONS, userPassword: '', ownerPassword: '' })
      ).toBe(false);
      expect(
        validateProtectOptions({ ...DEFAULT_PROTECT_OPTIONS, userPassword: 'abc', keyLength: 40 as any })
      ).toBe(false);

      expect(buildSecuredFileName('../../taxes/2026.PDF', 'protect')).toBe('2026-protected.pdf');
      expect(buildSecuredFileName('contract.pdf', 'unlock')).toBe('contract-unlocked.pdf');
      expect(buildSecuredFileName('  ', 'protect')).toBe('document-protected.pdf');
    });
  });

  describe('Slice 2: Real QPDF WASM AES-256 / AES-128 Encryption & Decryption', () => {
    it('completes full AES-256 inspect -> protect -> wrong password -> unlock round-trip', async () => {
      const srcBytes = await createSyntheticPdf(2);

      const initialInfo = await inspectPdfEncryption(srcBytes);
      expect(initialInfo.isEncrypted).toBe(false);
      expect(initialInfo.requiresUserPassword).toBe(false);
      expect(initialInfo.algorithm).toBe('none');
      expect(initialInfo.pageCount).toBe(2);

      const protectRes = await protectPdf(srcBytes, 'nda.pdf', {
        ...DEFAULT_PROTECT_OPTIONS,
        userPassword: 'PrivKnife-2026!',
        ownerPassword: 'Owner#Lock99',
        keyLength: 256,
        allowPrint: 'none',
        allowExtractText: false,
      });

      expect(protectRes.success).toBe(true);
      expect(protectRes.fileName).toBe('nda-protected.pdf');
      expect(protectRes.blob).toBeInstanceOf(Blob);
      expect(protectRes.resultingInfo?.isEncrypted).toBe(true);
      expect(protectRes.resultingInfo?.algorithm).toBe('AES-256');

      const lockedInfo = await inspectPdfEncryption(protectRes.bytes!);
      expect(lockedInfo.isEncrypted).toBe(true);
      expect(lockedInfo.requiresUserPassword).toBe(true);

      const wrongUnlock = await unlockPdf(protectRes.bytes!, 'nda-protected.pdf', {
        password: 'WrongPassword!',
      });
      expect(wrongUnlock.success).toBe(false);
      expect(wrongUnlock.errorCode).toBe('WRONG_PASSWORD');

      const goodUnlock = await unlockPdf(protectRes.bytes!, 'nda-protected.pdf', {
        password: 'PrivKnife-2026!',
      });
      expect(goodUnlock.success).toBe(true);
      expect(goodUnlock.resultingInfo?.isEncrypted).toBe(false);

      const reloaded = await PDFDocument.load(goodUnlock.bytes!);
      expect(reloaded.getPageCount()).toBe(2);
    });

    it('handles AES-128 and leading-hyphen special-character passwords cleanly', async () => {
      const srcBytes = await createSyntheticPdf(2);
      const weirdPassword = `-p@ss;word&'" 2026`;

      const protectRes = await protectPdf(srcBytes, 'special.pdf', {
        ...DEFAULT_PROTECT_OPTIONS,
        userPassword: weirdPassword,
        ownerPassword: '',
        keyLength: 128,
      });

      expect(protectRes.success).toBe(true);
      expect(protectRes.resultingInfo?.algorithm).toBe('AES-128');

      const unlockRes = await unlockPdf(protectRes.bytes!, 'special.pdf', {
        password: weirdPassword,
      });
      expect(unlockRes.success).toBe(true);
      const reloaded = await PDFDocument.load(unlockRes.bytes!);
      expect(reloaded.getPageCount()).toBe(2);
    });

    it('supports owner-only restriction locking (empty user password) and passwordless unlock', async () => {
      const srcBytes = await createSyntheticPdf(1);
      const protectRes = await protectPdf(srcBytes, 'restricted.pdf', {
        ...DEFAULT_PROTECT_OPTIONS,
        userPassword: '',
        ownerPassword: 'AdminOnly!99',
        allowPrint: 'none',
      });

      expect(protectRes.success).toBe(true);
      const info = await inspectPdfEncryption(protectRes.bytes!);
      expect(info.isEncrypted).toBe(true);
      expect(info.requiresUserPassword).toBe(false);

      const unlockRes = await unlockPdf(protectRes.bytes!, 'restricted.pdf', {
        password: '',
      });
      expect(unlockRes.success).toBe(true);
      expect(unlockRes.resultingInfo?.isEncrypted).toBe(false);
    });

    it('rejects already-unencrypted PDFs on unlock and handles empty/corrupt/non-PDF inputs safely', async () => {
      const srcBytes = await createSyntheticPdf(1);
      const alreadyPlain = await unlockPdf(srcBytes, 'plain.pdf', { password: 'abc' });
      expect(alreadyPlain.success).toBe(false);
      expect(alreadyPlain.errorCode).toBe('ALREADY_UNENCRYPTED');

      const emptyProtect = await protectPdf(new Uint8Array(0), 'empty.pdf', {
        ...DEFAULT_PROTECT_OPTIONS,
        userPassword: 'abc',
      });
      expect(emptyProtect.success).toBe(false);
      expect(emptyProtect.errorCode).toBe('INVALID_INPUT');

      const corruptProtect = await protectPdf(createCorruptPdfBytes(), 'bad.pdf', {
        ...DEFAULT_PROTECT_OPTIONS,
        userPassword: 'abc',
      });
      expect(corruptProtect.success).toBe(false);
      expect(corruptProtect.errorCode).toBe('INVALID_PDF');

      const pngUnlock = await unlockPdf(createNonPdfBytes(), 'fake.pdf', {
        password: 'abc',
      });
      expect(pngUnlock.success).toBe(false);
      expect(pngUnlock.errorCode).toBe('INVALID_PDF');
    });
  });
});
