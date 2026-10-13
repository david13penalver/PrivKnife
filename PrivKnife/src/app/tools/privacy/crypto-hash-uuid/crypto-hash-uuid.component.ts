import {
  ChangeDetectionStrategy,
  Component,
  computed,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Badge } from '../../../components/badge/badge';
import { Button } from '../../../components/button/button';
import { Card } from '../../../components/card/card';
import { exportBatch, generateUuidBatch, hashBatch } from './engine';
import {
  CasingOption,
  ExportFormat,
  HashAlgorithm,
  HashResultItem,
  QuoteOption,
} from './types';

@Component({
  selector: 'app-crypto-hash-uuid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Badge, Button, Card, FormsModule],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1040px;">
      <!-- Tool Header -->
      <div class="l-columns__area g--margin-bottom-6 g--text-center">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="privacy">
            🛡️ 100% In-Browser &bull; Never Leaves Your Device
          </app-badge>
        </div>
        <h1>Cryptographic Hash &amp; UUID Batch Generator</h1>
        <p class="g--margin-top-2" style="color: var(--color-text-muted); font-size: 1.125rem;">
          Generate cryptographically secure RFC 4122 UUIDv4 identifiers and calculate SHA-256, SHA-512, SHA-1, or MD5 digests in bulk.
        </p>
      </div>

      <!-- Mode Selector Tabs -->
      <div class="l-columns__area g--margin-bottom-6 g--flex-center">
        <div
          style="display: inline-flex; padding: 4px; background: var(--color-bg-surface); border: 1px solid var(--color-border-default); border-radius: var(--radius-full); gap: 4px;">
          <button
            type="button"
            class="c-button"
            [class.c-button--primary]="activeMode() === 'uuid'"
            [class.c-button--ghost]="activeMode() !== 'uuid'"
            style="border-radius: var(--radius-full); padding: 8px 20px;"
            (click)="setMode('uuid')">
            UUIDv4 Generator
          </button>
          <button
            type="button"
            class="c-button"
            [class.c-button--primary]="activeMode() === 'hasher'"
            [class.c-button--ghost]="activeMode() !== 'hasher'"
            style="border-radius: var(--radius-full); padding: 8px 20px;"
            (click)="setMode('hasher')">
            Bulk String Hasher
          </button>
        </div>
      </div>

      <!-- Main Two-Column Layout -->
      <div class="l-columns l-columns--2 crypto-workspace" style="gap: 24px; align-items: start;">
        <!-- Left Column: Controls & Configuration -->
        <div class="l-columns__area">
          <app-card [title]="activeMode() === 'uuid' ? 'UUID Configuration' : 'Hasher Configuration'">
            @if (activeMode() === 'uuid') {
              <!-- UUID Options -->
              <div style="display: flex; flex-direction: column; gap: 16px;">
                <!-- Quantity -->
                <div class="c-input">
                  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <label class="c-input__label" for="uuid-qty-input" style="margin: 0; font-weight: 600; white-space: nowrap;">
                        Quantity :
                      </label>
                      <input
                        id="uuid-qty-input"
                        type="number"
                        class="c-input__control"
                        style="width: 88px; padding: 6px 10px; font-weight: 600; text-align: center;"
                        min="1"
                        max="1000"
                        [value]="quantityInput()"
                        (input)="onQuantityTyped($event)"
                        (blur)="onQuantityBlur($event)" />
                      <span style="font-size: 0.8125rem; color: var(--color-text-muted);">UUIDs</span>
                    </div>
                    <span style="font-size: 0.75rem; color: var(--color-text-muted);">
                      Range: 1 – 1,000
                    </span>
                  </div>
                  <input
                    id="uuid-qty-slider"
                    type="range"
                    class="c-input__slider"
                    min="1"
                    max="1000"
                    [value]="uuidQuantity() <= 1000 ? uuidQuantity() : 1000"
                    (input)="onQuantitySliderChange($event)" />
                  <div class="l-extremo" style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 4px;">
                    <span class="l-extremo__area-izquierda">1</span>
                    <span class="l-extremo__area-derecha">1,000</span>
                  </div>
                </div>

                <!-- Casing -->
                <div class="c-input">
                  <label class="c-input__label">Letter Case</label>
                  <select
                    class="c-input__control"
                    [value]="uuidCasing()"
                    (change)="onCasingChange($event)">
                    <option value="lowercase">lowercase (e.g. f47ac10b...)</option>
                    <option value="uppercase">UPPERCASE (e.g. F47AC10B...)</option>
                  </select>
                </div>

                <!-- Hyphens Switch -->
                <div class="c-input">
                  <label class="c-input__switch">
                    <input
                      type="checkbox"
                      [checked]="uuidHyphens()"
                      (change)="onHyphensChange($event)" />
                    <span class="c-input__switch-track"></span>
                    <span style="font-size: 0.875rem; font-weight: 500;">Include standard hyphens (-)</span>
                  </label>
                </div>

                <!-- Quotes -->
                <div class="c-input">
                  <label class="c-input__label">Quote Wrapping</label>
                  <select
                    class="c-input__control"
                    [value]="uuidQuotes()"
                    (change)="onQuotesChange($event)">
                    <option value="none">None (raw)</option>
                    <option value="single">Single Quotes ('...')</option>
                    <option value="double">Double Quotes ("...")</option>
                  </select>
                </div>

                <!-- Prefix & Suffix -->
                <div class="l-columns l-columns--2" style="gap: 12px;">
                  <div class="c-input">
                    <label class="c-input__label" for="uuid-prefix">Prefix</label>
                    <input
                      id="uuid-prefix"
                      type="text"
                      class="c-input__control"
                      placeholder="e.g. usr_"
                      [value]="uuidPrefix()"
                      (input)="onPrefixChange($event)" />
                  </div>
                  <div class="c-input">
                    <label class="c-input__label" for="uuid-suffix">Suffix</label>
                    <input
                      id="uuid-suffix"
                      type="text"
                      class="c-input__control"
                      placeholder="e.g. _pk"
                      [value]="uuidSuffix()"
                      (input)="onSuffixChange($event)" />
                  </div>
                </div>

                <!-- Delimiter -->
                <div class="c-input">
                  <label class="c-input__label">Output Delimiter</label>
                  <select
                    class="c-input__control"
                    [value]="uuidDelimiter()"
                    (change)="onDelimiterChange($event)">
                    <option value="&#10;">New Line</option>
                    <option value=", ">Comma separated (, )</option>
                    <option value="; ">Semicolon separated (; )</option>
                    <option value=" ">Space separated</option>
                  </select>
                </div>

                <div class="g--margin-top-2">
                  <app-button
                    variant="primary"
                    (clicked)="generateUuids()">
                    ⚡ Generate New Batch
                  </app-button>
                </div>
              </div>
            } @else {
              <!-- Hasher Options -->
              <div style="display: flex; flex-direction: column; gap: 16px;">
                <!-- Algorithm Selection -->
                <div class="c-input">
                  <label class="c-input__label">Digest Algorithm</label>
                  <select
                    class="c-input__control"
                    [value]="hasherAlgorithm()"
                    (change)="onAlgorithmChange($event)">
                    <option value="SHA-256">SHA-256 (Secure &bull; 256 bits)</option>
                    <option value="SHA-512">SHA-512 (High Security &bull; 512 bits)</option>
                    <option value="SHA-1">SHA-1 (Legacy &bull; 160 bits)</option>
                    <option value="MD5">MD5 (Legacy &bull; 128 bits)</option>
                  </select>
                </div>

                <!-- MD5 Warning Banner -->
                @if (hasherAlgorithm() === 'MD5') {
                  <div
                    class="g--padding-3"
                    style="background-color: var(--color-warning-subtle, #fef3c7); border: 1px solid var(--color-warning, #f59e0b); border-radius: var(--radius-sm); color: #92400e; font-size: 0.8125rem;">
                    ⚠️ MD5 is considered cryptographically broken for security passwords. Use SHA-256 for secure hashing.
                  </div>
                }

                <!-- Casing -->
                <div class="c-input">
                  <label class="c-input__label">Hash Letter Case</label>
                  <select
                    class="c-input__control"
                    [value]="hasherCasing()"
                    (change)="onHasherCasingChange($event)">
                    <option value="lowercase">lowercase (recommended)</option>
                    <option value="uppercase">UPPERCASE</option>
                  </select>
                </div>

                <!-- Input Textarea -->
                <div class="c-input">
                  <label class="c-input__label" for="hasher-input">
                    Input Strings (One per line)
                  </label>
                  <textarea
                    id="hasher-input"
                    class="c-input__control c-input__control--textarea"
                    rows="6"
                    placeholder="Enter strings to hash..."
                    [value]="hasherInput()"
                    (input)="onHasherInputChange($event)"></textarea>
                  <span class="c-input__hint">Each line will be independently hashed.</span>
                </div>

                <div class="g--margin-top-2">
                  <app-button
                    variant="primary"
                    [loading]="isProcessing()"
                    (clicked)="computeHashes()">
                    🔒 Hash Strings
                  </app-button>
                </div>
              </div>
            }
          </app-card>
        </div>

        <!-- Right Column: Live Output & Export -->
        <div class="l-columns__area">
          <app-card>
            <!-- Card Header Area -->
            <div
              class="l-extremo g--margin-bottom-4 g--padding-bottom-3"
              style="border-bottom: 1px solid var(--color-border-default); align-items: center;">
              <div>
                <h3 style="font-size: 1.125rem; font-weight: 600;">
                  {{ activeMode() === 'uuid' ? 'Generated Identifiers' : 'Hash Results' }}
                </h3>
              </div>
              <div>
                @if (activeMode() === 'uuid') {
                  <app-badge variant="info">
                    {{ generatedUuids().length }} UUIDs generated
                  </app-badge>
                } @else {
                  <app-badge variant="info">
                    {{ hashResults().length }} Hashes computed
                  </app-badge>
                }
              </div>
            </div>

            <!-- Preview Box -->
            @if (activeMode() === 'uuid') {
              <div
                style="background: var(--color-bg-subtle); border: 1px solid var(--color-border-default); border-radius: var(--radius-sm); padding: 12px; max-height: 380px; overflow-y: auto;">
                <pre
                  style="margin: 0; font-family: var(--font-code, monospace); font-size: 0.8125rem; line-height: 1.6; white-space: pre-wrap; word-break: break-all; color: var(--color-text-primary);">{{ previewText() }}</pre>
              </div>
            } @else {
              <div
                style="border: 1px solid var(--color-border-default); border-radius: var(--radius-sm); max-height: 380px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.8125rem;">
                  <thead>
                    <tr style="background: var(--color-bg-subtle); border-bottom: 1px solid var(--color-border-default); text-align: left;">
                      <th style="padding: 8px 12px; font-weight: 600;">Input</th>
                      <th style="padding: 8px 12px; font-weight: 600;">Algorithm</th>
                      <th style="padding: 8px 12px; font-weight: 600;">Hash Digest</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of hashResults(); track item.input + item.hash) {
                      <tr style="border-bottom: 1px solid var(--color-border-default);">
                        <td style="padding: 8px 12px; font-weight: 500; word-break: break-all;">
                          {{ item.input }}
                        </td>
                        <td style="padding: 8px 12px; color: var(--color-text-muted);">
                          {{ item.algorithm }}
                        </td>
                        <td style="padding: 8px 12px; font-family: var(--font-code, monospace); word-break: break-all; color: var(--color-primary);">
                          {{ item.hash }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }

            <!-- Action & Export Bar -->
            <div
              class="l-extremo g--margin-top-4 g--padding-top-3"
              style="border-top: 1px solid var(--color-border-default); align-items: center; gap: 8px; flex-wrap: wrap;">
              <div>
                <app-button
                  variant="secondary"
                  (clicked)="copyToClipboard()">
                  {{ copied() ? '✓ Copied!' : '📋 Copy to Clipboard' }}
                </app-button>
              </div>

              <div style="display: flex; gap: 6px; align-items: center;">
                <span style="font-size: 0.8125rem; color: var(--color-text-muted);">Download:</span>
                <app-button variant="outline" size="small" (clicked)="download('txt')">
                  .TXT
                </app-button>
                <app-button variant="outline" size="small" (clicked)="download('csv')">
                  .CSV
                </app-button>
                <app-button variant="outline" size="small" (clicked)="download('json')">
                  .JSON
                </app-button>
              </div>
            </div>
          </app-card>
        </div>
      </div>

      <!-- Educational Card -->
      <div class="l-columns__area g--margin-top-6">
        <app-card title="Privacy & Security Guarantee">
          <p style="color: var(--color-text-muted); font-size: 0.9375rem; line-height: 1.6;">
            All UUIDv4 identifiers are generated using the browser's cryptographically secure pseudo-random number generator
            (<code style="color: var(--color-primary);">crypto.randomUUID()</code>), providing 122 bits of unpredictable entropy.
            All cryptographic digests are calculated directly on your device via the Web Crypto API
            (<code style="color: var(--color-primary);">window.crypto.subtle.digest</code>) and native bitwise math.
            PrivKnife contains zero tracking code and zero remote ingestion endpoints: your inputs and outputs never leave your computer.
          </p>
        </app-card>
      </div>
    </div>
  `,
  styles: [
    `
      @media (max-width: 1024px) {
        .crypto-workspace {
          grid-template-columns: 1fr !important;
        }

        .crypto-workspace > .l-columns__area {
          grid-column: span 1 !important;
        }
      }
    `,
  ],
})
export class CryptoHashUuidComponent implements OnInit, OnDestroy {
  readonly activeMode = signal<'uuid' | 'hasher'>('uuid');

  // UUID Options
  readonly uuidQuantity = signal<number>(10);
  readonly quantityInput = signal<string>('10');
  readonly uuidCasing = signal<CasingOption>('lowercase');
  readonly uuidHyphens = signal<boolean>(true);
  readonly uuidQuotes = signal<QuoteOption>('none');
  readonly uuidPrefix = signal<string>('');
  readonly uuidSuffix = signal<string>('');
  readonly uuidDelimiter = signal<string>('\n');
  readonly generatedUuids = signal<string[]>([]);

  // Hasher Options
  readonly hasherInput = signal<string>('hello world\nPrivKnife\npassword123');
  readonly hasherAlgorithm = signal<HashAlgorithm>('SHA-256');
  readonly hasherCasing = signal<CasingOption>('lowercase');
  readonly hashResults = signal<HashResultItem[]>([]);

  // UI state
  readonly copied = signal<boolean>(false);
  readonly isProcessing = signal<boolean>(false);

  private copyTimeoutId: any = null;
  private activeBlobUrls: string[] = [];

  readonly previewText = computed(() => {
    return this.generatedUuids().join(this.uuidDelimiter());
  });

  ngOnInit(): void {
    this.generateUuids();
  }

  setMode(mode: 'uuid' | 'hasher'): void {
    this.activeMode.set(mode);
    this.copied.set(false);
    if (mode === 'hasher' && this.hashResults().length === 0) {
      this.computeHashes();
    }
  }

  generateUuids(): void {
    const list = generateUuidBatch({
      quantity: this.uuidQuantity(),
      casing: this.uuidCasing(),
      includeHyphens: this.uuidHyphens(),
      quotes: this.uuidQuotes(),
      prefix: this.uuidPrefix(),
      suffix: this.uuidSuffix(),
      delimiter: this.uuidDelimiter(),
    });

    this.generatedUuids.set(list);
    this.copied.set(false);
  }

  async computeHashes(): Promise<void> {
    this.isProcessing.set(true);
    try {
      const lines = this.hasherInput()
        .split('\n')
        .filter((line) => line.length > 0);

      const results = await hashBatch(lines, {
        algorithm: this.hasherAlgorithm(),
        casing: this.hasherCasing(),
      });

      this.hashResults.set(results);
      this.copied.set(false);
    } finally {
      this.isProcessing.set(false);
    }
  }

  async copyToClipboard(): Promise<void> {
    const textToCopy =
      this.activeMode() === 'uuid'
        ? this.generatedUuids().join(this.uuidDelimiter())
        : exportBatch(this.hashResults(), 'txt', { delimiter: '\n' });

    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(textToCopy);
      this.copied.set(true);

      if (this.copyTimeoutId) {
        clearTimeout(this.copyTimeoutId);
      }
      this.copyTimeoutId = setTimeout(() => {
        this.copied.set(false);
      }, 2000);
    }
  }

  download(format: ExportFormat): void {
    let content: string;
    let filename: string;
    let mimeType: string;

    const timestamp = Date.now();

    if (this.activeMode() === 'uuid') {
      content = exportBatch(this.generatedUuids(), format, {
        delimiter: this.uuidDelimiter(),
        csvHeader: 'uuid',
      });
      filename = `uuids-${timestamp}.${format}`;
    } else {
      content = exportBatch(this.hashResults(), format, {
        csvHeader: 'input,algorithm,hash',
        delimiter: '\n',
      });
      filename = `hashes-${timestamp}.${format}`;
    }

    mimeType =
      format === 'json'
        ? 'application/json'
        : format === 'csv'
        ? 'text/csv'
        : 'text/plain';

    const blob = new Blob([content], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    this.activeBlobUrls.push(blobUrl);

    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // Clean up immediate object URL
    URL.revokeObjectURL(blobUrl);
    const index = this.activeBlobUrls.indexOf(blobUrl);
    if (index !== -1) {
      this.activeBlobUrls.splice(index, 1);
    }
  }

  reset(): void {
    this.uuidQuantity.set(10);
    this.quantityInput.set('10');
    this.uuidCasing.set('lowercase');
    this.uuidHyphens.set(true);
    this.uuidQuotes.set('none');
    this.uuidPrefix.set('');
    this.uuidSuffix.set('');
    this.uuidDelimiter.set('\n');
    this.generateUuids();
  }

  // Event handlers for inputs
  onQuantityTyped(event: Event): void {
    const target = event.target as HTMLInputElement;
    const raw = target.value;
    this.quantityInput.set(raw);

    const val = parseInt(raw, 10);
    if (!isNaN(val) && val >= 1) {
      const clamped = Math.min(val, 5000);
      this.uuidQuantity.set(clamped);
      this.generateUuids();
    }
  }

  onQuantityBlur(event: Event): void {
    const target = event.target as HTMLInputElement;
    const raw = target.value.trim();
    let val = parseInt(raw, 10);
    if (isNaN(val) || val < 1) {
      val = 1;
    } else if (val > 5000) {
      val = 5000;
    }
    this.quantityInput.set(String(val));
    this.uuidQuantity.set(val);
    target.value = String(val);
    this.generateUuids();
  }

  onQuantitySliderChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const val = Number(target.value);
    this.quantityInput.set(String(val));
    this.uuidQuantity.set(val);
    this.generateUuids();
  }

  onCasingChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.uuidCasing.set(target.value as CasingOption);
    this.generateUuids();
  }

  onHyphensChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.uuidHyphens.set(target.checked);
    this.generateUuids();
  }

  onQuotesChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.uuidQuotes.set(target.value as QuoteOption);
    this.generateUuids();
  }

  onPrefixChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.uuidPrefix.set(target.value);
    this.generateUuids();
  }

  onSuffixChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.uuidSuffix.set(target.value);
    this.generateUuids();
  }

  onDelimiterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.uuidDelimiter.set(target.value);
  }

  onAlgorithmChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.hasherAlgorithm.set(target.value as HashAlgorithm);
    this.computeHashes();
  }

  onHasherCasingChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.hasherCasing.set(target.value as CasingOption);
    this.computeHashes();
  }

  onHasherInputChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.hasherInput.set(target.value);
  }

  ngOnDestroy(): void {
    if (this.copyTimeoutId) {
      clearTimeout(this.copyTimeoutId);
    }
    for (const url of this.activeBlobUrls) {
      URL.revokeObjectURL(url);
    }
    this.activeBlobUrls = [];
  }
}
