import { Component, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  OutputFormat,
  PiiScrubberAnonymizerOptions,
  PiiScrubberAnonymizerResult,
  RedactionMode,
} from './types';
import { processPiiScrub } from './engine';
import { SAMPLE_SERVER_LOG } from './test-fixtures';

@Component({
  selector: 'app-pii-scrubber-anonymizer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="l-page">
      <!-- Header -->
      <header class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">PII Log & CSV Scrubber & Data Anonymizer</h1>
          <p class="c-header__subtitle">
            Sanitize Personally Identifiable Information (emails, IPs, phones, SSNs, credit cards, API keys)
            from raw server logs and CSV files before feeding data to LLMs or third parties. 100% in-browser privacy.
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          🛡️ 100% In-Browser • Never Leaves Your Device
        </div>
      </header>

      <!-- Main Columns -->
      <div class="l-columns l-columns--2">
        <!-- Configuration & Input Controls -->
        <section class="l-columns__area c-card">
          <div class="c-card__header l-extremo">
            <div class="l-extremo__area-izquierda">
              <h2 class="c-card__title">Scrubber Configuration & Input</h2>
            </div>
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--outline c-button--small"
                (click)="loadSampleData()"
              >
                Load Sample Log
              </button>
            </div>
          </div>

          <div class="c-card__body">
            <!-- Dropzone -->
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
                accept=".txt,.log,.csv,.json"
                (change)="onFileInputChange($event)"
              />
              <div class="c-dropzone__content">
                <span class="c-dropzone__icon">📋</span>
                <p class="c-dropzone__text">
                  @if (selectedFile()) {
                    Selected: <strong>{{ selectedFile()?.name }}</strong> ({{ formatBytes(selectedFile()?.size || 0) }})
                  } @else {
                    Drop log or CSV file here, or <strong>paste text below</strong>
                  }
                </p>
                <span class="c-dropzone__hint">Supports .log, .txt, .csv, .json</span>
              </div>
            </div>

            <!-- Text Area Input -->
            <div class="c-input g--margin-bottom-4">
              <label class="c-input__label">Raw Content to Anonymize</label>
              <textarea
                class="c-scrubber-textarea"
                placeholder="Paste server logs, error dumps, or CSV lines here..."
                [ngModel]="inputText()"
                (ngModelChange)="inputText.set($event)"
              ></textarea>
            </div>

            <!-- Redaction Mode Selector -->
            <div class="c-input g--margin-bottom-4">
              <label class="c-input__label">Redaction Technique</label>
              <div class="c-button-group">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="redactionMode() === 'replacement_tag'"
                  [class.c-button--outline]="redactionMode() !== 'replacement_tag'"
                  (click)="setRedactionMode('replacement_tag')"
                >
                  [TAG_REDACTED]
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="redactionMode() === 'mask_characters'"
                  [class.c-button--outline]="redactionMode() !== 'mask_characters'"
                  (click)="setRedactionMode('mask_characters')"
                >
                  Mask (a***&#64;acme.corp)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="redactionMode() === 'salted_hash_pseudonym'"
                  [class.c-button--outline]="redactionMode() !== 'salted_hash_pseudonym'"
                  (click)="setRedactionMode('salted_hash_pseudonym')"
                >
                  Salted Pseudonym
                </button>
              </div>
            </div>

            <!-- Salt Field (conditional) -->
            @if (redactionMode() === 'salted_hash_pseudonym') {
              <div class="c-input g--margin-bottom-4">
                <label class="c-input__label">Consistent Pseudonym Salt</label>
                <input
                  type="text"
                  class="c-input__text"
                  placeholder="Enter salt to deterministically pseudonymize values"
                  [ngModel]="customSalt()"
                  (ngModelChange)="customSalt.set($event)"
                />
              </div>
            }

            <!-- Entity Toggles -->
            <div class="c-input g--margin-bottom-4">
              <label class="c-input__label">PII Entities to Redact</label>
              <div class="c-entity-grid">
                <label class="c-checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="scrubEmails()"
                    (change)="toggleEntity('scrubEmails')"
                  />
                  <span>Emails (RFC 5322)</span>
                </label>
                <label class="c-checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="scrubIpAddresses()"
                    (change)="toggleEntity('scrubIpAddresses')"
                  />
                  <span>IP Addresses (IPv4 / IPv6)</span>
                </label>
                <label class="c-checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="scrubPhoneNumbers()"
                    (change)="toggleEntity('scrubPhoneNumbers')"
                  />
                  <span>Phone Numbers</span>
                </label>
                <label class="c-checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="scrubCreditCards()"
                    (change)="toggleEntity('scrubCreditCards')"
                  />
                  <span>Credit Cards (Luhn Checked)</span>
                </label>
                <label class="c-checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="scrubSsnNationalIds()"
                    (change)="toggleEntity('scrubSsnNationalIds')"
                  />
                  <span>SSN / National IDs</span>
                </label>
                <label class="c-checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="scrubApiTokens()"
                    (change)="toggleEntity('scrubApiTokens')"
                  />
                  <span>API Tokens & Bearer Keys</span>
                </label>
              </div>
            </div>

            <!-- Output Format -->
            <div class="c-input g--margin-bottom-4">
              <label class="c-input__label">Output Export Format</label>
              <div class="c-button-group">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="outputFormat() === 'txt'"
                  [class.c-button--outline]="outputFormat() !== 'txt'"
                  (click)="setOutputFormat('txt')"
                >
                  Plain Text (.txt)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="outputFormat() === 'csv'"
                  [class.c-button--outline]="outputFormat() !== 'csv'"
                  (click)="setOutputFormat('csv')"
                >
                  CSV (.csv)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="outputFormat() === 'json'"
                  [class.c-button--outline]="outputFormat() !== 'json'"
                  (click)="setOutputFormat('json')"
                >
                  JSON + Audit (.json)
                </button>
              </div>
            </div>

            <!-- Privacy Guarantee Badge -->
            <div class="c-privacy-notice g--margin-bottom-4">
              <span>🔒 <strong>Zero Server Ingestion:</strong> All regex matching and cryptographic pseudonymization run exclusively in your browser memory. Zero external calls.</span>
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
                [disabled]="isProcessing() || !inputText().trim()"
                (click)="scrubData()"
              >
                {{ isProcessing() ? 'Scrubbing...' : 'Sanitize & Anonymize' }}
              </button>
            </div>
          </div>
        </section>

        <!-- Preview & Output Area -->
        <section class="l-columns__area c-card">
          <div class="c-card__header l-extremo">
            <div class="l-extremo__area-izquierda">
              <h2 class="c-card__title">Anonymized Output & Audit</h2>
            </div>
            <div class="l-extremo__area-derecha">
              @if (lastResult()) {
                <button
                  type="button"
                  class="c-button c-button--outline c-button--small"
                  (click)="copyToClipboard()"
                >
                  {{ copySuccess() ? '✓ Copied!' : 'Copy Sanitized' }}
                </button>
              }
            </div>
          </div>

          <div class="c-card__body">
            @if (isProcessing()) {
              <div class="c-progress g--margin-bottom-4">
                <div class="c-progress__bar" style="width: 100%"></div>
                <small class="g--text-small g--margin-top-2">Scrubbing PII entities and sanitizing text...</small>
              </div>
            }

            @if (lastResult()) {
              <div class="c-preview">
                <textarea
                  readonly
                  class="c-scrubber-textarea c-scrubber-textarea--output"
                  [value]="lastResult()?.sanitizedText"
                ></textarea>
              </div>

              <!-- Audit Stats Grid -->
              <div class="c-audit-panel g--margin-top-4">
                <div class="c-badge c-badge--success">
                  ✓ {{ lastResult()?.auditStats?.totalRedactions }} Total Entities Redacted
                </div>
                <div class="c-audit-grid g--margin-top-2">
                  <div class="c-audit-chip">📧 Emails: <strong>{{ lastResult()?.auditStats?.emailsRedacted }}</strong></div>
                  <div class="c-audit-chip">🌐 IPs: <strong>{{ lastResult()?.auditStats?.ipsRedacted }}</strong></div>
                  <div class="c-audit-chip">📱 Phones: <strong>{{ lastResult()?.auditStats?.phonesRedacted }}</strong></div>
                  <div class="c-audit-chip">💳 Cards: <strong>{{ lastResult()?.auditStats?.creditCardsRedacted }}</strong></div>
                  <div class="c-audit-chip">🆔 SSNs: <strong>{{ lastResult()?.auditStats?.ssnsRedacted }}</strong></div>
                  <div class="c-audit-chip">🔑 Tokens: <strong>{{ lastResult()?.auditStats?.apiTokensRedacted }}</strong></div>
                </div>
              </div>
            } @else {
              <div class="c-preview__empty">
                <span>No text sanitized yet</span>
                <small>Enter logs or drop a file to inspect anonymized output</small>
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
                Download {{ outputFormat().toUpperCase() }} Deliverable
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
    .c-scrubber-textarea {
      width: 100%;
      min-height: 180px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.85rem;
      line-height: 1.5;
      padding: 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #f8fafc;
      color: #0f172a;
      resize: vertical;
    }
    .c-scrubber-textarea--output {
      min-height: 280px;
    }
    .c-input__text {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-size: 0.875rem;
    }
    .c-entity-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
    }
    .c-checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #334155;
      cursor: pointer;
    }
    .c-privacy-notice {
      padding: 0.75rem;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 4px;
      font-size: 0.85rem;
      color: #065f46;
    }
    .c-audit-panel {
      padding: 0.75rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }
    .c-audit-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .c-audit-chip {
      padding: 0.25rem 0.5rem;
      background: #fff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-size: 0.75rem;
      color: #475569;
    }
    .c-preview__empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 280px;
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

  private createdBlobUrls: string[] = [];

  ngOnDestroy(): void {
    this.cleanUpUrls();
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
    const previewUrl = URL.createObjectURL(file);
    this.createdBlobUrls.push(previewUrl);

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

    try {
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
      const result = await processPiiScrub(text, options, originalName);
      this.lastResult.set(result);
    } finally {
      this.isProcessing.set(false);
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
