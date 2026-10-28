import { Component, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ContainerFormat,
  FileEncryptorVaultOptions,
  FileEncryptorVaultResult,
  FileEncryptorVaultWorkerRequest,
  FileEncryptorVaultWorkerResponse,
  VaultEncryptionAlgorithm,
  VaultOperationMode,
} from './types';
import {
  createSampleConfidentialFile,
  decryptVaultToFile,
  encryptFileToVault,
  isPrivKnifeVaultContainer,
} from './engine';

@Component({
  selector: 'app-file-encryptor-vault',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './file-encryptor-vault.component.html',
  styleUrls: ['./file-encryptor-vault.component.scss'],
})
export class FileEncryptorVaultComponent implements OnDestroy {
  // Signals
  readonly operationMode = signal<VaultOperationMode>('encrypt');
  readonly encryptionAlgorithm = signal<VaultEncryptionAlgorithm>('AES-GCM-256');
  readonly pbkdf2Iterations = signal<number>(100000);
  readonly saltLengthBytes = signal<number>(16);
  readonly ivLengthBytes = signal<number>(12);
  readonly embedOriginalFilename = signal<boolean>(true);
  readonly containerFormat = signal<ContainerFormat>('priv');
  readonly password = signal<string>('');
  readonly confirmPassword = signal<string>('');
  readonly showPassword = signal<boolean>(false);

  readonly selectedFile = signal<{
    name: string;
    size: number;
    file: File;
    isVault: boolean;
  } | null>(null);

  readonly isProcessing = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly lastResult = signal<FileEncryptorVaultResult | null>(null);

  private createdBlobUrls: string[] = [];
  private worker: Worker | null = null;

  ngOnDestroy(): void {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // ignore
      }
      this.worker = null;
    }
    this.cleanUpUrls();
  }

  setOperationMode(mode: VaultOperationMode): void {
    this.operationMode.set(mode);
    this.errorMessage.set(null);
    if (mode === 'decrypt') {
      this.confirmPassword.set('');
    }
  }

  setPassword(pwd: string): void {
    this.password.set(pwd);
  }

  setConfirmPassword(pwd: string): void {
    this.confirmPassword.set(pwd);
  }

  setIterations(iterations: number): void {
    this.pbkdf2Iterations.set(iterations);
  }

  setContainerFormat(format: ContainerFormat): void {
    this.containerFormat.set(format);
  }

  setEmbedOriginalFilename(val: boolean): void {
    this.embedOriginalFilename.set(val);
  }

  isPasswordMismatch(): boolean {
    return (
      this.operationMode() === 'encrypt' &&
      this.confirmPassword().length > 0 &&
      this.password() !== this.confirmPassword()
    );
  }

  async handleFileSelected(file: File): Promise<void> {
    const isVaultName =
      file.name.toLowerCase().endsWith('.priv') ||
      file.name.toLowerCase().endsWith('.enc');

    const isVaultMagic = await isPrivKnifeVaultContainer(file);
    const isVault = isVaultName || isVaultMagic;

    // Reset stale result state on re-upload (DEFECT-48-03)
    const prevResult = this.lastResult();
    if (prevResult) {
      this.lastResult.set(null);
    }
    this.errorMessage.set(null);

    this.selectedFile.set({
      name: file.name,
      size: file.size,
      file,
      isVault,
    });

    if (isVault) {
      this.setOperationMode('decrypt');
    }
  }

  async loadSampleConfidentialFile(): Promise<void> {
    const sample = createSampleConfidentialFile();
    await this.handleFileSelected(sample);
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelected(input.files[0]);
    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFileSelected(event.dataTransfer.files[0]);
    }
  }

  async executeVaultAction(): Promise<void> {
    const item = this.selectedFile();
    if (!item || this.isPasswordMismatch()) return;

    this.errorMessage.set(null);
    this.isProcessing.set(true);

    try {
      const options: FileEncryptorVaultOptions = {
        operationMode: this.operationMode(),
        encryptionAlgorithm: this.encryptionAlgorithm(),
        pbkdf2Iterations: this.pbkdf2Iterations(),
        saltLengthBytes: this.saltLengthBytes(),
        ivLengthBytes: this.ivLengthBytes(),
        embedOriginalFilename: this.embedOriginalFilename(),
        containerFormat: this.containerFormat(),
      };

      let result: FileEncryptorVaultResult;

      // Offload to web worker if available
      if (typeof Worker !== 'undefined') {
        try {
          const buffer = await item.file.arrayBuffer();
          result = await this.executeWithWorker(
            this.operationMode(),
            buffer,
            this.password(),
            options,
            item.name
          );
        } catch {
          // Fallback to in-process execution
          if (this.operationMode() === 'encrypt') {
            result = await encryptFileToVault(
              item.file,
              this.password(),
              options,
              item.name
            );
          } else {
            result = await decryptVaultToFile(item.file, this.password());
          }
        }
      } else {
        if (this.operationMode() === 'encrypt') {
          result = await encryptFileToVault(
            item.file,
            this.password(),
            options,
            item.name
          );
        } else {
          result = await decryptVaultToFile(item.file, this.password());
        }
      }

      this.lastResult.set(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.errorMessage.set(msg);
    } finally {
      this.isProcessing.set(false);
    }
  }

  private executeWithWorker(
    type: 'encrypt' | 'decrypt',
    sourceBuffer: ArrayBuffer,
    password: string,
    options: FileEncryptorVaultOptions,
    originalFileName: string
  ): Promise<FileEncryptorVaultResult> {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(new URL('./worker', import.meta.url), {
          type: 'module',
        });
        this.worker = worker;

        worker.onmessage = (
          event: MessageEvent<FileEncryptorVaultWorkerResponse>
        ) => {
          if (event.data.type === type) {
            worker.terminate();
            if (this.worker === worker) this.worker = null;
            if (event.data.success && event.data.result) {
              resolve(event.data.result);
            } else {
              reject(new Error(event.data.error || 'Worker vault operation failed'));
            }
          }
        };

        worker.onerror = (err) => {
          worker.terminate();
          if (this.worker === worker) this.worker = null;
          reject(err);
        };

        worker.postMessage({
          type,
          sourceBuffer,
          password,
          options,
          originalFileName,
        } as FileEncryptorVaultWorkerRequest);
      } catch (err) {
        reject(err);
      }
    });
  }

  downloadDeliverable(): void {
    const result = this.lastResult();
    if (!result) return;

    const downloadUrl = URL.createObjectURL(result.blob);
    this.createdBlobUrls.push(downloadUrl);

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(downloadUrl);
    }, 100);
  }

  resetToDefaults(): void {
    this.cleanUpUrls();
    this.operationMode.set('encrypt');
    this.encryptionAlgorithm.set('AES-GCM-256');
    this.pbkdf2Iterations.set(100000);
    this.saltLengthBytes.set(16);
    this.ivLengthBytes.set(12);
    this.embedOriginalFilename.set(true);
    this.containerFormat.set('priv');
    this.password.set('');
    this.confirmPassword.set('');
    this.selectedFile.set(null);
    this.lastResult.set(null);
    this.errorMessage.set(null);
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private cleanUpUrls(): void {
    for (const url of this.createdBlobUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignore errors
      }
    }
    this.createdBlobUrls = [];
  }
}
