import { Component, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ContainerFormat,
  FileEncryptorVaultOptions,
  FileEncryptorVaultResult,
  VaultEncryptionAlgorithm,
  VaultOperationMode,
} from './types';
import {
  decryptVaultToFile,
  encryptFileToVault,
  isPrivKnifeVaultContainer,
} from './engine';

@Component({
  selector: 'app-file-encryptor-vault',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="l-page">
      <!-- Header -->
      <header class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">Zero-Knowledge File Encryptor & Vault</h1>
          <p class="c-header__subtitle">
            Military-grade client-side encryption and decryption using AES-256-GCM and PBKDF2 key derivation.
            100% private in-browser vault packaging with zero server knowledge and zero telemetry.
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          🛡️ 100% In-Browser • Never Leaves Your Device
        </div>
      </header>

      <!-- Main Layout -->
      <div class="l-columns l-columns--2">
        <!-- Configuration & Form Area -->
        <section class="l-columns__area c-card">
          <div class="c-card__header">
            <h2 class="c-card__title">Vault Security Controls</h2>
          </div>

          <div class="c-card__body">
            <!-- Mode Switcher Tabs -->
            <div class="c-input g--margin-bottom-4">
              <label class="c-input__label">Vault Action</label>
              <div class="c-button-group">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="operationMode() === 'encrypt'"
                  [class.c-button--outline]="operationMode() !== 'encrypt'"
                  (click)="setOperationMode('encrypt')"
                >
                  🔒 Encrypt File
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="operationMode() === 'decrypt'"
                  [class.c-button--outline]="operationMode() !== 'decrypt'"
                  (click)="setOperationMode('decrypt')"
                >
                  🔓 Decrypt Vault
                </button>
              </div>
            </div>

            <!-- Upload Dropzone -->
            <div
              class="c-dropzone g--margin-bottom-4"
              (dragover)="$event.preventDefault()"
              (drop)="onFileDrop($event)"
              (click)="fileInput.click()"
            >
              <input
                #fileInput
                type="file"
                class="c-dropzone__input"
                (change)="onFileInputChange($event)"
              />
              <div class="c-dropzone__content">
                <span class="c-dropzone__icon">
                  {{ operationMode() === 'encrypt' ? '📁' : '🔐' }}
                </span>
                <p class="c-dropzone__text">
                  @if (selectedFile()) {
                    Selected: <strong>{{ selectedFile()?.name }}</strong> ({{ formatBytes(selectedFile()?.size || 0) }})
                  } @else {
                    Drop file here or <strong>browse</strong>
                  }
                </p>
                <span class="c-dropzone__hint">
                  {{ operationMode() === 'encrypt' ? 'Any file type (PDF, docx, img, zip)' : 'Drop .priv or .enc vault container' }}
                </span>
              </div>
            </div>

            <!-- Master Password Input -->
            <div class="c-input g--margin-bottom-4">
              <label class="c-input__label">Vault Master Password</label>
              <div class="c-password-field">
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  class="c-input__text"
                  placeholder="Enter secret passphrase (min 6 characters)"
                  [ngModel]="password()"
                  (ngModelChange)="setPassword($event)"
                />
                <button
                  type="button"
                  class="c-button c-button--outline c-button--small"
                  (click)="showPassword.set(!showPassword())"
                >
                  {{ showPassword() ? 'Hide' : 'Show' }}
                </button>
              </div>
            </div>

            <!-- Iterations and Parameters (in Encrypt Mode) -->
            @if (operationMode() === 'encrypt') {
              <div class="c-input g--margin-bottom-4">
                <label class="c-input__label">Key Derivation (PBKDF2 SHA-256 Iterations)</label>
                <div class="c-button-group">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="pbkdf2Iterations() === 100000"
                    [class.c-button--outline]="pbkdf2Iterations() !== 100000"
                    (click)="setIterations(100000)"
                  >
                    100,000 (Standard)
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="pbkdf2Iterations() === 300000"
                    [class.c-button--outline]="pbkdf2Iterations() !== 300000"
                    (click)="setIterations(300000)"
                  >
                    300,000 (High)
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="pbkdf2Iterations() === 600000"
                    [class.c-button--outline]="pbkdf2Iterations() !== 600000"
                    (click)="setIterations(600000)"
                  >
                    600,000 (OWASP)
                  </button>
                </div>
              </div>

              <div class="c-input g--margin-bottom-4">
                <label class="c-input__label">Container File Format</label>
                <div class="c-button-group">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="containerFormat() === 'priv'"
                    [class.c-button--outline]="containerFormat() !== 'priv'"
                    (click)="setContainerFormat('priv')"
                  >
                    .priv (PrivKnife Vault)
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="containerFormat() === 'enc'"
                    [class.c-button--outline]="containerFormat() !== 'enc'"
                    (click)="setContainerFormat('enc')"
                  >
                    .enc (Encrypted Container)
                  </button>
                </div>
              </div>
            }

            <!-- Error banner -->
            @if (errorMessage()) {
              <div class="c-error-banner g--margin-bottom-4">
                ⚠️ {{ errorMessage() }}
              </div>
            }

            <!-- Privacy Guarantee Badge -->
            <div class="c-privacy-notice g--margin-bottom-4">
              <span>🔒 <strong>Zero Server Ingestion:</strong> Encryption keys are derived in volatile memory via Web Crypto API (SubtleCrypto). Passwords and files are never stored or transmitted.</span>
            </div>
          </div>

          <div class="c-card__footer l-extremo">
            <div class="l-extremo__area-izquierda">
              <button
                type="button"
                class="c-button c-button--outline"
                (click)="resetToDefaults()"
              >
                Reset
              </button>
            </div>
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--primary"
                [disabled]="isProcessing() || !selectedFile() || password().length < 6"
                (click)="executeVaultAction()"
              >
                {{ isProcessing() ? 'Processing...' : (operationMode() === 'encrypt' ? 'Encrypt & Seal File' : 'Decrypt & Open Vault') }}
              </button>
            </div>
          </div>
        </section>

        <!-- Preview & Result Area -->
        <section class="l-columns__area c-card">
          <div class="c-card__header">
            <h2 class="c-card__title">Vault Status & Deliverable</h2>
          </div>

          <div class="c-card__body">
            @if (isProcessing()) {
              <div class="c-progress g--margin-bottom-4">
                <div class="c-progress__bar" style="width: 100%"></div>
                <small class="g--text-small g--margin-top-2">
                  Deriving cryptographic key and computing authenticated AES-GCM cipher...
                </small>
              </div>
            }

            @if (lastResult()) {
              <div class="c-vault-success">
                <div class="c-badge c-badge--success">
                  {{ lastResult()?.operation === 'encrypt' ? '✓ File Successfully Encrypted' : '✓ Vault Authenticated & Decrypted' }}
                </div>

                <div class="c-vault-details g--margin-top-4">
                  <p><strong>Deliverable:</strong> {{ lastResult()?.fileName }}</p>
                  <p><strong>Size:</strong> {{ formatBytes(lastResult()?.fileSize || 0) }}</p>
                  <p><strong>Cipher:</strong> {{ lastResult()?.metadata?.algorithm }}</p>
                  <p><strong>PBKDF2 Iterations:</strong> {{ lastResult()?.metadata?.iterations }}</p>
                  @if (lastResult()?.metadata?.saltHex) {
                    <p class="c-code-snippet">
                      <small>Salt: {{ lastResult()?.metadata?.saltHex }}</small>
                    </p>
                  }
                </div>
              </div>
            } @else {
              <div class="c-preview__empty">
                <span>Vault Standby</span>
                <small>Select a file and enter a passphrase to begin</small>
              </div>
            }
          </div>

          <div class="c-card__footer l-extremo">
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--primary"
                [disabled]="!lastResult()"
                (click)="downloadDeliverable()"
              >
                Download {{ lastResult()?.operation === 'encrypt' ? 'Encrypted Vault' : 'Decrypted File' }}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .c-button-group {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .c-password-field {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .c-input__text {
      flex: 1;
      padding: 0.5rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-size: 0.875rem;
    }
    .c-privacy-notice {
      padding: 0.75rem;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 4px;
      font-size: 0.85rem;
      color: #065f46;
    }
    .c-error-banner {
      padding: 0.75rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 4px;
      font-size: 0.85rem;
      color: #b91c1c;
    }
    .c-vault-details {
      padding: 1rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 0.875rem;
      line-height: 1.6;
    }
    .c-code-snippet {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
      word-break: break-all;
      color: #64748b;
    }
    .c-preview__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 320px;
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      color: #94a3b8;
    }
    .g--text-small {
      font-size: 0.85rem;
      color: #64748b;
    }
  `],
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

  ngOnDestroy(): void {
    this.cleanUpUrls();
  }

  setOperationMode(mode: VaultOperationMode): void {
    this.operationMode.set(mode);
    this.errorMessage.set(null);
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

  async handleFileSelected(file: File): Promise<void> {
    const isVaultName =
      file.name.toLowerCase().endsWith('.priv') ||
      file.name.toLowerCase().endsWith('.enc');

    const isVaultMagic = await isPrivKnifeVaultContainer(file);
    const isVault = isVaultName || isVaultMagic;

    const previewUrl = URL.createObjectURL(file);
    this.createdBlobUrls.push(previewUrl);

    this.selectedFile.set({
      name: file.name,
      size: file.size,
      file,
      isVault,
    });

    if (isVault) {
      this.operationMode.set('decrypt');
    }
    this.errorMessage.set(null);
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
    if (!item) return;

    this.errorMessage.set(null);
    this.isProcessing.set(true);

    try {
      if (this.operationMode() === 'encrypt') {
        const options: FileEncryptorVaultOptions = {
          operationMode: 'encrypt',
          encryptionAlgorithm: this.encryptionAlgorithm(),
          pbkdf2Iterations: this.pbkdf2Iterations(),
          saltLengthBytes: this.saltLengthBytes(),
          ivLengthBytes: this.ivLengthBytes(),
          embedOriginalFilename: this.embedOriginalFilename(),
          containerFormat: this.containerFormat(),
        };

        const result = await encryptFileToVault(
          item.file,
          this.password(),
          options,
          item.name
        );
        this.lastResult.set(result);
      } else {
        const result = await decryptVaultToFile(item.file, this.password());
        this.lastResult.set(result);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.errorMessage.set(msg);
    } finally {
      this.isProcessing.set(false);
    }
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
