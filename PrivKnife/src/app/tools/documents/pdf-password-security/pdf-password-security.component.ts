import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Card, Dropzone, ProgressBar } from '../../../components';
import { TranslatePipe } from '../../../core/i18n';
import {
  evaluatePasswordStrength,
  inspectPdfEncryption,
  protectPdf,
  unlockPdf,
  validateProtectOptions,
} from './engine';
import { createSyntheticPdf } from './test-fixtures';
import {
  PasswordStrengthReport,
  PdfEncryptionInfo,
  PdfModifyPermission,
  PdfPasswordSecurityResult,
  PdfPasswordWorkerRequest,
  PdfPasswordWorkerResponse,
  PdfPrintPermission,
  PdfProtectOptions,
  PdfSecurityMode,
} from './types';

const LARGE_FILE_THRESHOLD_BYTES = 100 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

@Component({
  selector: 'app-pdf-password-security',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
    Dropzone,
    ProgressBar,
    TranslatePipe,
  ],
  templateUrl: './pdf-password-security.component.html',
  styleUrl: './pdf-password-security.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfPasswordSecurityComponent implements OnDestroy {
  readonly mode = signal<PdfSecurityMode>('protect');

  readonly pdfBytes = signal<Uint8Array | null>(null);
  readonly pdfFileName = signal<string>('document.pdf');
  readonly pdfSizeBytes = signal<number>(0);
  readonly encryptionInfo = signal<PdfEncryptionInfo | null>(null);

  readonly userPassword = signal<string>('');
  readonly confirmPassword = signal<string>('');
  readonly ownerPassword = signal<string>('');
  readonly unlockPassword = signal<string>('');

  readonly showUserPassword = signal<boolean>(false);
  readonly showOwnerPassword = signal<boolean>(false);
  readonly showUnlockPassword = signal<boolean>(false);

  readonly keyLength = signal<128 | 256>(256);
  readonly allowPrint = signal<PdfPrintPermission>('full');
  readonly allowModify = signal<PdfModifyPermission>('none');
  readonly allowExtractText = signal<boolean>(false);
  readonly allowAccessibility = signal<boolean>(true);

  readonly isProcessing = signal<boolean>(false);
  readonly progressPercent = signal<number>(0);
  readonly progressStage = signal<string>('');
  readonly errorMessage = signal<string | null>(null);
  readonly largeFileWarning = signal<boolean>(false);
  readonly lastResult = signal<PdfPasswordSecurityResult | null>(null);

  private activeWorker: Worker | null = null;
  private createdObjectUrls = new Set<string>();

  readonly formattedInputSize = computed(() =>
    formatFileSize(this.pdfSizeBytes())
  );

  readonly formattedOutputSize = computed(() => {
    const res = this.lastResult();
    return res?.success ? formatFileSize(res.fileSize) : '';
  });

  readonly passwordStrength = computed<PasswordStrengthReport>(() =>
    evaluatePasswordStrength(this.userPassword())
  );

  readonly passwordsMismatch = computed<boolean>(() => {
    const userPw = this.userPassword();
    return userPw.length > 0 && this.confirmPassword() !== userPw;
  });

  readonly currentProtectOptions = computed<PdfProtectOptions>(() => ({
    userPassword: this.userPassword(),
    ownerPassword: this.ownerPassword(),
    keyLength: this.keyLength(),
    allowPrint: this.allowPrint(),
    allowModify: this.allowModify(),
    allowExtractText: this.allowExtractText(),
    allowAccessibility: this.allowAccessibility(),
  }));

  readonly canProtect = computed<boolean>(() => {
    if (!this.pdfBytes() || this.isProcessing()) return false;
    if (this.passwordsMismatch()) return false;
    return validateProtectOptions(this.currentProtectOptions());
  });

  readonly canUnlock = computed<boolean>(() => {
    if (!this.pdfBytes() || this.isProcessing()) return false;
    const info = this.encryptionInfo();
    if (info && !info.isEncrypted) return false;
    if (info?.requiresUserPassword && this.unlockPassword().length === 0) {
      return false;
    }
    return true;
  });

  ngOnDestroy(): void {
    this.terminateWorker();
    this.revokeAllObjectUrls();
    this.clearSecretSignals();
    this.pdfBytes.set(null);
    this.lastResult.set(null);
  }

  setMode(nextMode: PdfSecurityMode): void {
    this.mode.set(nextMode);
    this.errorMessage.set(null);
    this.lastResult.set(null);
  }

  setKeyLength(bits: number | string): void {
    this.keyLength.set(Number(bits) === 128 ? 128 : 256);
  }

  toggleShowUserPassword(): void {
    this.showUserPassword.update((v) => !v);
  }

  toggleShowOwnerPassword(): void {
    this.showOwnerPassword.update((v) => !v);
  }

  toggleShowUnlockPassword(): void {
    this.showUnlockPassword.update((v) => !v);
  }

  async onFileDropped(files: File[]): Promise<void> {
    if (!files || files.length === 0) return;
    const file = files[0];
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      this.errorMessage.set('Please select a valid .pdf document.');
      return;
    }

    this.errorMessage.set(null);
    this.lastResult.set(null);
    this.largeFileWarning.set(file.size > LARGE_FILE_THRESHOLD_BYTES);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const info = await this.runInspect(bytes);
      this.pdfBytes.set(bytes);
      this.pdfFileName.set(file.name);
      this.pdfSizeBytes.set(file.size || bytes.byteLength);
      this.encryptionInfo.set(info);
    } catch (err: unknown) {
      this.pdfBytes.set(null);
      this.pdfSizeBytes.set(0);
      this.encryptionInfo.set(null);
      this.errorMessage.set(
        err instanceof Error
          ? err.message
          : 'Unable to read PDF encryption metadata.'
      );
    }
  }

  async loadSamplePdf(): Promise<void> {
    const bytes = await createSyntheticPdf(2);
    const sample = new File([bytes.buffer as ArrayBuffer], 'sample-confidential.pdf', {
      type: 'application/pdf',
    });
    await this.onFileDropped([sample]);
  }

  async processProtect(): Promise<void> {
    const bytes = this.pdfBytes();
    if (!bytes || !this.canProtect()) return;

    this.isProcessing.set(true);
    this.progressPercent.set(5);
    this.progressStage.set('Initializing QPDF WASM encryption');
    this.errorMessage.set(null);
    this.lastResult.set(null);

    try {
      const result = await this.runSecurityWorker({
        type: 'protect',
        pdfBytes: bytes,
        fileName: this.pdfFileName(),
        options: this.currentProtectOptions(),
      });
      this.lastResult.set(result);
      if (!result.success) {
        this.errorMessage.set(result.error || 'Failed to encrypt PDF.');
      }
    } catch (err: unknown) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'PDF encryption failed.'
      );
    } finally {
      this.isProcessing.set(false);
    }
  }

  async processUnlock(): Promise<void> {
    const bytes = this.pdfBytes();
    if (!bytes || !this.canUnlock()) return;

    this.isProcessing.set(true);
    this.progressPercent.set(5);
    this.progressStage.set('Initializing QPDF WASM decryption');
    this.errorMessage.set(null);
    this.lastResult.set(null);

    try {
      const result = await this.runSecurityWorker({
        type: 'unlock',
        pdfBytes: bytes,
        fileName: this.pdfFileName(),
        options: { password: this.unlockPassword() },
      });
      this.lastResult.set(result);
      if (!result.success) {
        this.errorMessage.set(result.error || 'Failed to unlock PDF.');
      }
    } catch (err: unknown) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'PDF decryption failed.'
      );
    } finally {
      this.isProcessing.set(false);
    }
  }

  downloadResult(): void {
    const res = this.lastResult();
    if (!res?.success || !res.blob) return;

    const url = URL.createObjectURL(res.blob);
    this.createdObjectUrls.add(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = res.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(url);
      this.createdObjectUrls.delete(url);
    }, 150);
  }

  reset(): void {
    this.terminateWorker();
    this.revokeAllObjectUrls();
    this.clearSecretSignals();

    this.pdfBytes.set(null);
    this.pdfFileName.set('document.pdf');
    this.pdfSizeBytes.set(0);
    this.encryptionInfo.set(null);
    this.showUserPassword.set(false);
    this.showOwnerPassword.set(false);
    this.showUnlockPassword.set(false);

    this.keyLength.set(256);
    this.allowPrint.set('full');
    this.allowModify.set('none');
    this.allowExtractText.set(false);
    this.allowAccessibility.set(true);

    this.isProcessing.set(false);
    this.progressPercent.set(0);
    this.progressStage.set('');
    this.errorMessage.set(null);
    this.largeFileWarning.set(false);
    this.lastResult.set(null);
  }

  private clearSecretSignals(): void {
    this.userPassword.set('');
    this.confirmPassword.set('');
    this.ownerPassword.set('');
    this.unlockPassword.set('');
  }

  private async runInspect(bytes: Uint8Array): Promise<PdfEncryptionInfo> {
    if (typeof Worker !== 'undefined') {
      try {
        return await this.runWorkerInspect(bytes);
      } catch {
        // Fallback when Worker runtime is unavailable (e.g., restricted tests)
      }
    }
    return inspectPdfEncryption(bytes);
  }

  private runWorkerInspect(pdfBytes: Uint8Array): Promise<PdfEncryptionInfo> {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(new URL('./worker', import.meta.url), {
          type: 'module',
        });
        this.activeWorker = worker;

        worker.onmessage = (event: MessageEvent<PdfPasswordWorkerResponse>) => {
          const msg = event.data;
          if (msg.type === 'inspect_done') {
            this.terminateWorker();
            if (msg.info) {
              resolve(msg.info);
            } else {
              reject(new Error(msg.error || 'Failed to inspect PDF.'));
            }
          }
        };

        worker.onerror = (err) => {
          this.terminateWorker();
          reject(err);
        };

        const req: PdfPasswordWorkerRequest = { type: 'inspect', pdfBytes };
        worker.postMessage(req);
      } catch (err) {
        this.terminateWorker();
        reject(err);
      }
    });
  }

  private async runSecurityWorker(
    request: Extract<PdfPasswordWorkerRequest, { type: 'protect' | 'unlock' }>
  ): Promise<PdfPasswordSecurityResult> {
    if (typeof Worker !== 'undefined') {
      try {
        return await new Promise<PdfPasswordSecurityResult>((resolve, reject) => {
          try {
            const worker = new Worker(new URL('./worker', import.meta.url), {
              type: 'module',
            });
            this.activeWorker = worker;

            worker.onmessage = (
              event: MessageEvent<PdfPasswordWorkerResponse>
            ) => {
              const msg = event.data;
              if (msg.type === 'progress') {
                this.progressPercent.set(msg.percent);
                this.progressStage.set(msg.stage);
                return;
              }
              if (msg.type === 'done') {
                this.terminateWorker();
                resolve(msg.result);
              }
            };

            worker.onerror = (err) => {
              this.terminateWorker();
              reject(err);
            };

            worker.postMessage(request);
          } catch (err) {
            this.terminateWorker();
            reject(err);
          }
        });
      } catch {
        // Fallback when Worker runtime is unavailable
      }
    }

    const onProgress = (percent: number, stage: string) => {
      this.progressPercent.set(percent);
      this.progressStage.set(stage);
    };

    if (request.type === 'protect') {
      return protectPdf(request.pdfBytes, request.fileName, request.options, {
        onProgress,
      });
    }
    return unlockPdf(request.pdfBytes, request.fileName, request.options, {
      onProgress,
    });
  }

  private terminateWorker(): void {
    if (this.activeWorker) {
      this.activeWorker.terminate();
      this.activeWorker = null;
    }
  }

  private revokeAllObjectUrls(): void {
    for (const url of this.createdObjectUrls) {
      URL.revokeObjectURL(url);
    }
    this.createdObjectUrls.clear();
  }
}
