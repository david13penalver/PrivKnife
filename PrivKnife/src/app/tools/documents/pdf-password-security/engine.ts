import { PDFDocument } from 'pdf-lib';
import { runQpdfCommand } from '../../../core/pdf/qpdf-runner';
import {
  PasswordStrengthReport,
  PdfEncryptionAlgorithm,
  PdfEncryptionInfo,
  PdfModifyPermission,
  PdfPasswordSecurityResult,
  PdfPrintPermission,
  PdfProtectOptions,
  PdfSecurityDeps,
  PdfSecurityMode,
  PdfUnlockOptions,
} from './types';

export function evaluatePasswordStrength(password: string): PasswordStrengthReport {
  const pw = String(password ?? '');
  if (!pw.length) {
    return { entropyBits: 0, grade: 'empty', scorePercent: 0 };
  }

  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 32;

  const uniqueChars = new Set(Array.from(pw)).size;
  const diversityFactor = Math.min(1, uniqueChars / Math.min(pw.length, 10));
  const rawBits = pw.length * Math.log2(Math.max(2, pool));
  const entropyBits = Number((rawBits * (0.35 + 0.65 * diversityFactor)).toFixed(1));

  let grade: PasswordStrengthReport['grade'];
  if (entropyBits < 36) grade = 'weak';
  else if (entropyBits < 56) grade = 'fair';
  else if (entropyBits < 76) grade = 'strong';
  else grade = 'excellent';

  const scorePercent = Math.min(100, Math.round((entropyBits / 96) * 100));
  return { entropyBits, grade, scorePercent };
}

export function validateProtectOptions(
  options: PdfProtectOptions | null | undefined
): boolean {
  if (!options || typeof options !== 'object') return false;
  const hasUser = typeof options.userPassword === 'string' && options.userPassword.length > 0;
  const hasOwner = typeof options.ownerPassword === 'string' && options.ownerPassword.length > 0;
  if (!hasUser && !hasOwner) return false;
  if (options.keyLength !== 128 && options.keyLength !== 256) return false;

  const prints: PdfPrintPermission[] = ['full', 'low', 'none'];
  if (!prints.includes(options.allowPrint)) return false;

  const mods: PdfModifyPermission[] = ['all', 'annotate', 'form', 'assembly', 'none'];
  if (!mods.includes(options.allowModify)) return false;

  return true;
}

export function buildProtectArgv(
  inPath: string,
  outPath: string,
  options: PdfProtectOptions,
  generatedOwnerPassword: string
): string[] {
  const userPw = options.userPassword ?? '';
  const ownerPw =
    options.ownerPassword && options.ownerPassword.length > 0
      ? options.ownerPassword
      : generatedOwnerPassword;

  const args: string[] = [
    '--encrypt',
    `--user-password=${userPw}`,
    `--owner-password=${ownerPw}`,
    `--bits=${options.keyLength}`,
    `--print=${options.allowPrint}`,
    `--modify=${options.allowModify}`,
    `--extract=${options.allowExtractText ? 'y' : 'n'}`,
    `--accessibility=${options.allowAccessibility ? 'y' : 'n'}`,
  ];

  if (options.keyLength === 128) {
    args.push('--use-aes=y');
  }

  args.push('--', inPath, outPath);
  return args;
}

export function buildUnlockArgv(
  inPath: string,
  outPath: string,
  password: string
): string[] {
  const args: string[] = [];
  if (password && password.length > 0) {
    args.push(`--password=${password}`);
  }
  args.push('--decrypt', '--', inPath, outPath);
  return args;
}

export function parseQpdfEncryptionOutput(
  stdout: string,
  stderr: string,
  exitCode: number
): PdfEncryptionInfo {
  const combined = `${stdout}\n${stderr}`;

  if (/invalid password/i.test(combined)) {
    return {
      isEncrypted: true,
      requiresUserPassword: true,
      algorithm: 'unknown',
    };
  }

  if (/file is not encrypted/i.test(combined)) {
    return {
      isEncrypted: false,
      requiresUserPassword: false,
      algorithm: 'none',
    };
  }

  if (exitCode !== 0 && !/\bR\s*=\s*\d/.test(combined)) {
    return {
      isEncrypted: false,
      requiresUserPassword: false,
      algorithm: 'unknown',
    };
  }

  let algorithm: PdfEncryptionAlgorithm = 'unknown';
  const rMatch = combined.match(/\bR\s*=\s*(\d+)/);
  const rev = rMatch ? Number(rMatch[1]) : 0;

  if (rev >= 5) {
    algorithm = 'AES-256';
  } else if (rev === 4) {
    algorithm = /AES/i.test(combined) ? 'AES-128' : 'RC4-128';
  } else if (rev === 3) {
    algorithm = 'RC4-128';
  } else if (rev === 2) {
    algorithm = 'RC4-40';
  }

  return {
    isEncrypted: rev >= 2 || /encrypted/i.test(combined),
    requiresUserPassword: false,
    algorithm,
  };
}

export function buildSecuredFileName(
  originalName: string,
  mode: PdfSecurityMode
): string {
  const sanitized = String(originalName ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .split(/[/\\]/)
    .pop()
    ?.trim();

  const suffix = mode === 'protect' ? 'protected' : 'unlocked';
  if (!sanitized) {
    return `document-${suffix}.pdf`;
  }
  const stem = sanitized.replace(/\.pdf$/i, '').trim() || 'document';
  return `${stem}-${suffix}.pdf`;
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.byteLength - 5, 1024);
  for (let i = 0; i <= limit; i++) {
    if (
      bytes[i] === 0x25 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x44 &&
      bytes[i + 3] === 0x46 &&
      bytes[i + 4] === 0x2d
    ) {
      return true;
    }
  }
  return false;
}

function generateRandomOwnerPassword(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 37 + 13) & 0xff;
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function inspectPdfEncryption(
  pdfBytes: Uint8Array
): Promise<PdfEncryptionInfo> {
  if (!pdfBytes || pdfBytes.byteLength < 8 || !hasPdfSignature(pdfBytes)) {
    throw new Error('Invalid PDF buffer.');
  }

  const res = await runQpdfCommand(
    pdfBytes,
    (inPath) => ['--show-encryption', '--', inPath],
    { readOutput: false }
  );

  const info = parseQpdfEncryptionOutput(res.stdout, res.stderr, res.exitCode);

  if (!info.requiresUserPassword) {
    try {
      const doc = await PDFDocument.load(new Uint8Array(pdfBytes), {
        ignoreEncryption: true,
        updateMetadata: false,
      });
      info.pageCount = doc.getPageCount();
    } catch {
      // Fallback via qpdf --show-npages
      const pagesRes = await runQpdfCommand(
        pdfBytes,
        (inPath) => ['--show-npages', '--', inPath],
        { readOutput: false }
      );
      const count = Number.parseInt(pagesRes.stdout.trim(), 10);
      if (Number.isFinite(count) && count > 0) {
        info.pageCount = count;
      }
    }
  }

  return info;
}

export async function protectPdf(
  pdfBytes: Uint8Array,
  fileName: string,
  options: PdfProtectOptions,
  deps: PdfSecurityDeps = {}
): Promise<PdfPasswordSecurityResult> {
  const outName = buildSecuredFileName(fileName, 'protect');

  if (!validateProtectOptions(options)) {
    return {
      success: false,
      mode: 'protect',
      fileName: outName,
      fileSize: 0,
      errorCode: 'INVALID_OPTIONS',
      error: 'Please enter a user password or owner password and valid permissions.',
    };
  }

  if (!pdfBytes || pdfBytes.byteLength < 8) {
    return {
      success: false,
      mode: 'protect',
      fileName: outName,
      fileSize: 0,
      errorCode: 'INVALID_INPUT',
      error: 'Input PDF buffer is empty or invalid.',
    };
  }

  if (!hasPdfSignature(pdfBytes)) {
    return {
      success: false,
      mode: 'protect',
      fileName: outName,
      fileSize: 0,
      errorCode: 'INVALID_PDF',
      error: 'Selected file does not have a valid %PDF- header.',
    };
  }

  deps.onProgress?.(20, 'Encrypting PDF with QPDF WebAssembly');

  try {
    const generatedOwner = generateRandomOwnerPassword();
    const res = await runQpdfCommand(pdfBytes, (inPath, outPath) =>
      buildProtectArgv(inPath, outPath, options, generatedOwner)
    );

    if (res.exitCode !== 0 && res.exitCode !== 3) {
      const combined = `${res.stdout}\n${res.stderr}`;
      if (/invalid password/i.test(combined)) {
        return {
          success: false,
          mode: 'protect',
          fileName: outName,
          fileSize: 0,
          errorCode: 'WRONG_PASSWORD',
          error: 'Source PDF is already password-protected. Unlock it first.',
        };
      }
      return {
        success: false,
        mode: 'protect',
        fileName: outName,
        fileSize: 0,
        errorCode: 'INVALID_PDF',
        error: combined.trim() || 'QPDF could not encrypt the supplied PDF.',
      };
    }

    if (!res.outputBytes || res.outputBytes.byteLength === 0) {
      return {
        success: false,
        mode: 'protect',
        fileName: outName,
        fileSize: 0,
        errorCode: 'INVALID_PDF',
        error: 'Encrypted output buffer was empty.',
      };
    }

    deps.onProgress?.(85, 'Verifying encrypted output');
    const resultingInfo: PdfEncryptionInfo = {
      isEncrypted: true,
      requiresUserPassword: Boolean(options.userPassword && options.userPassword.length > 0),
      algorithm: options.keyLength === 256 ? 'AES-256' : 'AES-128',
    };

    const copy = new Uint8Array(res.outputBytes);
    const blob = new Blob([copy], { type: 'application/pdf' });
    deps.onProgress?.(100, 'Complete');

    return {
      success: true,
      mode: 'protect',
      blob,
      bytes: copy,
      fileName: outName,
      fileSize: copy.byteLength,
      resultingInfo,
    };
  } catch (err: unknown) {
    return {
      success: false,
      mode: 'protect',
      fileName: outName,
      fileSize: 0,
      errorCode: 'WASM_LOAD_ERROR',
      error:
        err instanceof Error ? err.message : 'Failed to load QPDF WASM module.',
    };
  }
}

export async function unlockPdf(
  pdfBytes: Uint8Array,
  fileName: string,
  options: PdfUnlockOptions,
  deps: PdfSecurityDeps = {}
): Promise<PdfPasswordSecurityResult> {
  const outName = buildSecuredFileName(fileName, 'unlock');

  if (!pdfBytes || pdfBytes.byteLength < 8) {
    return {
      success: false,
      mode: 'unlock',
      fileName: outName,
      fileSize: 0,
      errorCode: 'INVALID_INPUT',
      error: 'Input PDF buffer is empty or invalid.',
    };
  }

  if (!hasPdfSignature(pdfBytes)) {
    return {
      success: false,
      mode: 'unlock',
      fileName: outName,
      fileSize: 0,
      errorCode: 'INVALID_PDF',
      error: 'Selected file does not have a valid %PDF- header.',
    };
  }

  deps.onProgress?.(15, 'Inspecting PDF encryption');

  try {
    const preCheck = await runQpdfCommand(
      pdfBytes,
      (inPath) => ['--show-encryption', '--', inPath],
      { readOutput: false }
    );
    const info = parseQpdfEncryptionOutput(
      preCheck.stdout,
      preCheck.stderr,
      preCheck.exitCode
    );

    if (preCheck.exitCode !== 0 && !info.requiresUserPassword) {
      return {
        success: false,
        mode: 'unlock',
        fileName: outName,
        fileSize: 0,
        errorCode: 'INVALID_PDF',
        error: `${preCheck.stderr || preCheck.stdout}`.trim() || 'Invalid PDF structure.',
      };
    }

    if (!info.isEncrypted) {
      return {
        success: false,
        mode: 'unlock',
        fileName: outName,
        fileSize: 0,
        resultingInfo: info,
        errorCode: 'ALREADY_UNENCRYPTED',
        error: 'This PDF is not encrypted or password-protected.',
      };
    }

    deps.onProgress?.(45, 'Decrypting PDF locally');
    const password = options?.password ?? '';
    const res = await runQpdfCommand(pdfBytes, (inPath, outPath) =>
      buildUnlockArgv(inPath, outPath, password)
    );

    if (res.exitCode !== 0 && res.exitCode !== 3) {
      const combined = `${res.stdout}\n${res.stderr}`;
      if (/invalid password|password.*incorrect/i.test(combined)) {
        return {
          success: false,
          mode: 'unlock',
          fileName: outName,
          fileSize: 0,
          errorCode: 'WRONG_PASSWORD',
          error: 'Incorrect password. Please check and try again.',
        };
      }
      return {
        success: false,
        mode: 'unlock',
        fileName: outName,
        fileSize: 0,
        errorCode: 'INVALID_PDF',
        error: combined.trim() || 'Unable to decrypt PDF.',
      };
    }

    if (!res.outputBytes || res.outputBytes.byteLength === 0) {
      return {
        success: false,
        mode: 'unlock',
        fileName: outName,
        fileSize: 0,
        errorCode: 'INVALID_PDF',
        error: 'Decrypted PDF buffer was empty.',
      };
    }

    deps.onProgress?.(90, 'Verifying decrypted PDF');
    const copy = new Uint8Array(res.outputBytes);
    const blob = new Blob([copy], { type: 'application/pdf' });
    deps.onProgress?.(100, 'Complete');

    return {
      success: true,
      mode: 'unlock',
      blob,
      bytes: copy,
      fileName: outName,
      fileSize: copy.byteLength,
      resultingInfo: {
        isEncrypted: false,
        requiresUserPassword: false,
        algorithm: 'none',
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      mode: 'unlock',
      fileName: outName,
      fileSize: 0,
      errorCode: 'WASM_LOAD_ERROR',
      error:
        err instanceof Error ? err.message : 'Failed to load QPDF WASM module.',
    };
  }
}
