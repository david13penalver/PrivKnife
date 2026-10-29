import { TranslatePipe } from '../../../core/i18n';
import { Component, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  OutputFormat,
  PiiScrubberAnonymizerOptions,
  PiiScrubberAnonymizerResult,
  PiiScrubberWorkerRequest,
  PiiScrubberWorkerResponse,
  RedactionMode,
} from './types';
import { processPiiScrub } from './engine';
import { SAMPLE_SERVER_LOG } from './test-fixtures';

@Component({
  selector: 'app-pii-scrubber-anonymizer',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './pii-scrubber-anonymizer.component.html',
  styleUrl: './pii-scrubber-anonymizer.component.scss',
})
export class PiiScrubberAnonymizerComponent implements OnDestroy {
  // Signals
  readonly inputText = signal<string>('');
  readonly scrubEmails = signal<boolean>(true);
  readonly scrubPhoneNumbers = signal<boolean>(true);
  readonly scrubIpAddresses = signal<boolean>(true);
  readonly scrubCreditCards = signal<boolean>(true);
  readonly scrubSsnNationalIds = signal<boolean>(true);
  readonly scrubApiTokens = signal<boolean>(true);
  readonly redactionMode = signal<RedactionMode>('replacement_tag');
  readonly customSalt = signal<string>('privknife_salt_2026');
  readonly customRegexPatterns = signal<string>('');
  readonly outputFormat = signal<OutputFormat>('txt');

  readonly isProcessing = signal<boolean>(false);
  readonly selectedFile = signal<{ name: string; size: number } | null>(null);
  readonly lastResult = signal<PiiScrubberAnonymizerResult | null>(null);
  readonly copySuccess = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  private createdBlobUrls: string[] = [];
  private activeWorker: Worker | null = null;
  private workerRequestId = 0;

  ngOnDestroy(): void {
    this.cleanUpUrls();
    this.terminateWorker();
  }

  setRedactionMode(mode: RedactionMode): void {
    this.redactionMode.set(mode);
  }

  setOutputFormat(format: OutputFormat): void {
    this.outputFormat.set(format);
  }

  toggleEntity(
    key:
      | 'scrubEmails'
      | 'scrubPhoneNumbers'
      | 'scrubIpAddresses'
      | 'scrubCreditCards'
      | 'scrubSsnNationalIds'
      | 'scrubApiTokens'
  ): void {
    switch (key) {
      case 'scrubEmails':
        this.scrubEmails.update((v) => !v);
        break;
      case 'scrubPhoneNumbers':
        this.scrubPhoneNumbers.update((v) => !v);
        break;
      case 'scrubIpAddresses':
        this.scrubIpAddresses.update((v) => !v);
        break;
      case 'scrubCreditCards':
        this.scrubCreditCards.update((v) => !v);
        break;
      case 'scrubSsnNationalIds':
        this.scrubSsnNationalIds.update((v) => !v);
        break;
      case 'scrubApiTokens':
        this.scrubApiTokens.update((v) => !v);
        break;
    }
  }

  loadSampleData(): void {
    this.inputText.set(SAMPLE_SERVER_LOG);
  }

  async handleFileSelected(file: File): Promise<void> {
    const text = await file.text();

    this.selectedFile.set({
      name: file.name,
      size: file.size,
    });
    this.inputText.set(text);

    if (file.name.endsWith('.csv')) {
      this.outputFormat.set('csv');
    } else if (file.name.endsWith('.json')) {
      this.outputFormat.set('json');
    } else {
      this.outputFormat.set('txt');
    }
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

  async scrubData(): Promise<void> {
    const text = this.inputText();
    if (!text.trim()) return;

    this.isProcessing.set(true);
    this.errorMessage.set(null);

    const options: PiiScrubberAnonymizerOptions = {
      scrubEmails: this.scrubEmails(),
      scrubPhoneNumbers: this.scrubPhoneNumbers(),
      scrubIpAddresses: this.scrubIpAddresses(),
      scrubCreditCards: this.scrubCreditCards(),
      scrubSsnNationalIds: this.scrubSsnNationalIds(),
      scrubApiTokens: this.scrubApiTokens(),
      redactionMode: this.redactionMode(),
      customSalt: this.customSalt(),
      customRegexPatterns: this.customRegexPatterns(),
      outputFormat: this.outputFormat(),
    };

    const originalName = this.selectedFile()?.name || 'sanitized-log.txt';

    try {
      if (typeof Worker !== 'undefined') {
        const result = await this.scrubWithWorker(text, options, originalName);
        this.lastResult.set(result);
      } else {
        const result = await processPiiScrub(text, options, originalName);
        this.lastResult.set(result);
      }
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : String(err));
    } finally {
      this.isProcessing.set(false);
    }
  }

  private scrubWithWorker(
    text: string,
    options: PiiScrubberAnonymizerOptions,
    originalFileName: string
  ): Promise<PiiScrubberAnonymizerResult> {
    return new Promise((resolve, reject) => {
      try {
        this.terminateWorker();
        this.activeWorker = new Worker(new URL('./worker.ts', import.meta.url), {
          type: 'module',
        });

        const id = ++this.workerRequestId;

        this.activeWorker.onmessage = (event: MessageEvent<PiiScrubberWorkerResponse>) => {
          const data = event.data;
          if (data.id !== id) return;

          if (data.type === 'result') {
            resolve(data.result);
            this.terminateWorker();
          } else if (data.type === 'error') {
            reject(new Error(data.error));
            this.terminateWorker();
          }
        };

        this.activeWorker.onerror = (err) => {
          reject(new Error(err.message || 'Worker processing error'));
          this.terminateWorker();
        };

        const request: PiiScrubberWorkerRequest = {
          id,
          text,
          options,
          originalFileName,
        };

        this.activeWorker.postMessage(request);
      } catch (err) {
        // Fallback to direct synchronous execution if worker instantiation fails (e.g., test environment)
        processPiiScrub(text, options, originalFileName).then(resolve, reject);
      }
    });
  }

  private terminateWorker(): void {
    if (this.activeWorker) {
      this.activeWorker.terminate();
      this.activeWorker = null;
    }
  }

  async copyToClipboard(): Promise<void> {
    const result = this.lastResult();
    if (!result) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.sanitizedText);
      }
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    } catch {
      // Fallback
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
    this.terminateWorker();
    this.inputText.set('');
    this.scrubEmails.set(true);
    this.scrubPhoneNumbers.set(true);
    this.scrubIpAddresses.set(true);
    this.scrubCreditCards.set(true);
    this.scrubSsnNationalIds.set(true);
    this.scrubApiTokens.set(true);
    this.redactionMode.set('replacement_tag');
    this.customSalt.set('privknife_salt_2026');
    this.customRegexPatterns.set('');
    this.outputFormat.set('txt');
    this.selectedFile.set(null);
    this.lastResult.set(null);
    this.copySuccess.set(false);
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
