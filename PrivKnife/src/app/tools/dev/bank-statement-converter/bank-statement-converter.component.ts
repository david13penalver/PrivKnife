import { Component, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  BankExportFormat,
  BankStatementConverterOptions,
  BankStatementConverterResult,
  DateFormatOutput,
} from './types';
import { processBankStatement } from './engine';
import { SAMPLE_BANK_CSV } from './test-fixtures';

@Component({
  selector: 'app-bank-statement-converter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="l-page">
      <!-- Header -->
      <header class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">Bank Statement CSV & OFX to Excel & QIF Converter</h1>
          <p class="c-header__subtitle">
            Normalize chaotic bank exports, credit card statements, and OFX/QFX files into clean spreadsheets
            and Quicken/QuickBooks-ready QIF exports. 100% private in-browser accounting.
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          🛡️ 100% In-Browser • Never Leaves Your Device
        </div>
      </header>

      <!-- Main Layout Columns -->
      <div class="l-columns l-columns--2">
        <!-- Configuration & Upload Area -->
        <section class="l-columns__area c-card">
          <div class="c-card__header l-extremo">
            <div class="l-extremo__area-izquierda">
              <h2 class="c-card__title">Statement Input & Options</h2>
            </div>
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--outline c-button--small"
                (click)="loadSampleData()"
              >
                Load Sample Statement
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
                accept=".csv,.txt,.ofx,.qfx"
                (change)="onFileInputChange($event)"
              />
              <div class="c-dropzone__content">
                <span class="c-dropzone__icon">💳</span>
                <p class="c-dropzone__text">
                  @if (selectedFile()) {
                    Selected: <strong>{{ selectedFile()?.name }}</strong> ({{ formatBytes(selectedFile()?.size || 0) }})
                  } @else {
                    Drop bank CSV or OFX/QFX file here, or <strong>paste below</strong>
                  }
                </p>
                <span class="c-dropzone__hint">Supports CSV, TSV, OFX, QFX</span>
              </div>
            </div>

            <!-- Content Textarea -->
            <div class="c-input g--margin-bottom-4">
              <label class="c-input__label">Raw Statement Data</label>
              <textarea
                class="c-statement-textarea"
                placeholder="Paste CSV lines or OFX XML here..."
                [ngModel]="inputContent()"
                (ngModelChange)="inputContent.set($event)"
              ></textarea>
            </div>

            <!-- Date Format Output -->
            <div class="c-input g--margin-bottom-4">
              <label class="c-input__label">Output Date Format</label>
              <div class="c-button-group">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="dateFormatOutput() === 'YYYY-MM-DD'"
                  [class.c-button--outline]="dateFormatOutput() !== 'YYYY-MM-DD'"
                  (click)="setDateFormat('YYYY-MM-DD')"
                >
                  YYYY-MM-DD (ISO)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="dateFormatOutput() === 'MM/DD/YYYY'"
                  [class.c-button--outline]="dateFormatOutput() !== 'MM/DD/YYYY'"
                  (click)="setDateFormat('MM/DD/YYYY')"
                >
                  MM/DD/YYYY (US)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="dateFormatOutput() === 'DD/MM/YYYY'"
                  [class.c-button--outline]="dateFormatOutput() !== 'DD/MM/YYYY'"
                  (click)="setDateFormat('DD/MM/YYYY')"
                >
                  DD/MM/YYYY (EU/UK)
                </button>
              </div>
            </div>

            <!-- Output Format Selector -->
            <div class="c-input g--margin-bottom-4">
              <label class="c-input__label">Export Deliverable Format</label>
              <div class="c-button-group">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="exportFormat() === 'csv'"
                  [class.c-button--outline]="exportFormat() !== 'csv'"
                  (click)="setExportFormat('csv')"
                >
                  Standard CSV (.csv)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="exportFormat() === 'xlsx'"
                  [class.c-button--outline]="exportFormat() !== 'xlsx'"
                  (click)="setExportFormat('xlsx')"
                >
                  Excel Workbook (.xlsx)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="exportFormat() === 'qif'"
                  [class.c-button--outline]="exportFormat() !== 'qif'"
                  (click)="setExportFormat('qif')"
                >
                  Quicken / YNAB (.qif)
                </button>
              </div>
            </div>

            <!-- Normalization Toggles -->
            <div class="c-input g--margin-bottom-4">
              <label class="c-input__label">Cleansing & Transformation</label>
              <div class="c-checkbox-group">
                <label class="c-checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="cleanMerchantDescriptions()"
                    (change)="toggleCleanDescriptions()"
                  />
                  <span>Clean merchant names (strip location codes & extra noise)</span>
                </label>
                <label class="c-checkbox-label g--margin-top-2">
                  <input
                    type="checkbox"
                    [checked]="stripPosCodes()"
                    (change)="toggleStripPos()"
                  />
                  <span>Strip POS card auth codes</span>
                </label>
                <label class="c-checkbox-label g--margin-top-2">
                  <input
                    type="checkbox"
                    [checked]="invertAmountSigns()"
                    (change)="toggleInvertSigns()"
                  />
                  <span>Invert signs (switch debits & credits)</span>
                </label>
              </div>
            </div>

            <!-- Privacy Guarantee Badge -->
            <div class="c-privacy-notice g--margin-bottom-4">
              <span>🔒 <strong>Zero Server Ingestion:</strong> Financial statement normalization runs entirely in your local browser sandbox. Financial records are never sent over the network.</span>
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
                [disabled]="isProcessing() || !inputContent().trim()"
                (click)="convertStatement()"
              >
                {{ isProcessing() ? 'Converting...' : 'Normalize & Convert' }}
              </button>
            </div>
          </div>
        </section>

        <!-- Preview & Output Area -->
        <section class="l-columns__area c-card">
          <div class="c-card__header l-extremo">
            <div class="l-extremo__area-izquierda">
              <h2 class="c-card__title">Normalized Preview & Summary</h2>
            </div>
            <div class="l-extremo__area-derecha">
              @if (lastResult()) {
                <button
                  type="button"
                  class="c-button c-button--outline c-button--small"
                  (click)="copyToClipboard()"
                >
                  {{ copySuccess() ? '✓ Copied!' : 'Copy Formatted' }}
                </button>
              }
            </div>
          </div>

          <div class="c-card__body">
            @if (isProcessing()) {
              <div class="c-progress g--margin-bottom-4">
                <div class="c-progress__bar" style="width: 100%"></div>
                <small class="g--text-small g--margin-top-2">Parsing statements and normalising columns...</small>
              </div>
            }

            @if (lastResult()) {
              <!-- Summary Metrics Cards -->
              <div class="c-summary-row g--margin-bottom-4">
                <div class="c-summary-card">
                  <small>Transactions</small>
                  <strong>{{ lastResult()?.summary?.transactionCount }}</strong>
                </div>
                <div class="c-summary-card c-summary-card--income">
                  <small>Total Income</small>
                  <strong>+{{ formatCurrency(lastResult()?.summary?.totalIncome || 0) }}</strong>
                </div>
                <div class="c-summary-card c-summary-card--expense">
                  <small>Total Expense</small>
                  <strong>-{{ formatCurrency(lastResult()?.summary?.totalExpense || 0) }}</strong>
                </div>
                <div class="c-summary-card" [class.c-summary-card--income]="(lastResult()?.summary?.netFlow || 0) >= 0" [class.c-summary-card--expense]="(lastResult()?.summary?.netFlow || 0) < 0">
                  <small>Net Cashflow</small>
                  <strong>{{ formatCurrency(lastResult()?.summary?.netFlow || 0) }}</strong>
                </div>
              </div>

              <!-- Transactions Table Preview -->
              <div class="c-table-scroll">
                <table class="c-tx-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th class="g--text-right">Amount</th>
                      <th class="g--text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (tx of lastResult()?.transactions; track $index) {
                      <tr>
                        <td>{{ tx.date }}</td>
                        <td class="c-tx-desc">{{ tx.description }}</td>
                        <td class="g--text-right" [class.c-amount--pos]="tx.amount > 0" [class.c-amount--neg]="tx.amount < 0">
                          {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount.toFixed(2) }}
                        </td>
                        <td class="g--text-right">{{ tx.balance !== undefined ? tx.balance.toFixed(2) : '-' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="c-preview__empty">
                <span>No statement loaded</span>
                <small>Upload a CSV/OFX file or load sample data to inspect normalized transactions</small>
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
                Download {{ exportFormat().toUpperCase() }} Deliverable
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
    .c-statement-textarea {
      width: 100%;
      min-height: 140px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.8rem;
      line-height: 1.4;
      padding: 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #f8fafc;
      color: #0f172a;
      resize: vertical;
    }
    .c-checkbox-group {
      display: flex;
      flex-direction: column;
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
    .c-summary-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.5rem;
    }
    .c-summary-card {
      display: flex;
      flex-direction: column;
      padding: 0.5rem 0.75rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 0.75rem;
    }
    .c-summary-card strong {
      font-size: 1rem;
      color: #0f172a;
    }
    .c-summary-card--income strong {
      color: #16a34a;
    }
    .c-summary-card--expense strong {
      color: #dc2626;
    }
    .c-table-scroll {
      max-height: 340px;
      overflow-y: auto;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }
    .c-tx-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
    }
    .c-tx-table th, .c-tx-table td {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .c-tx-table th {
      background: #f1f5f9;
      font-weight: 600;
      position: sticky;
      top: 0;
    }
    .c-tx-desc {
      max-width: 200px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .c-amount--pos {
      color: #16a34a;
      font-weight: 600;
    }
    .c-amount--neg {
      color: #dc2626;
      font-weight: 600;
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
    .g--text-right {
      text-align: right;
    }
    .g--text-small {
      font-size: 0.85rem;
      color: #64748b;
    }
  `],
})
export class BankStatementConverterComponent implements OnDestroy {
  // Signals
  readonly dateFormatOutput = signal<DateFormatOutput>('YYYY-MM-DD');
  readonly exportFormat = signal<BankExportFormat>('csv');
  readonly autoDetectColumns = signal<boolean>(true);
  readonly cleanMerchantDescriptions = signal<boolean>(true);
  readonly stripPosCodes = signal<boolean>(true);
  readonly invertAmountSigns = signal<boolean>(false);
  readonly inputContent = signal<string>('');

  readonly selectedFile = signal<{ name: string; size: number } | null>(null);
  readonly isProcessing = signal<boolean>(false);
  readonly lastResult = signal<BankStatementConverterResult | null>(null);
  readonly copySuccess = signal<boolean>(false);

  private createdBlobUrls: string[] = [];

  ngOnDestroy(): void {
    this.cleanUpUrls();
  }

  setDateFormat(fmt: DateFormatOutput): void {
    this.dateFormatOutput.set(fmt);
  }

  setExportFormat(fmt: BankExportFormat): void {
    this.exportFormat.set(fmt);
  }

  toggleCleanDescriptions(): void {
    this.cleanMerchantDescriptions.update((v) => !v);
  }

  toggleStripPos(): void {
    this.stripPosCodes.update((v) => !v);
  }

  toggleInvertSigns(): void {
    this.invertAmountSigns.update((v) => !v);
  }

  loadSampleData(): void {
    this.inputContent.set(SAMPLE_BANK_CSV);
    this.exportFormat.set('csv');
  }

  async handleFileSelected(file: File): Promise<void> {
    const text = await file.text();
    const previewUrl = URL.createObjectURL(file);
    this.createdBlobUrls.push(previewUrl);

    this.selectedFile.set({
      name: file.name,
      size: file.size,
    });
    this.inputContent.set(text);

    if (
      file.name.toLowerCase().endsWith('.ofx') ||
      file.name.toLowerCase().endsWith('.qfx')
    ) {
      this.exportFormat.set('qif');
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

  async convertStatement(): Promise<void> {
    const text = this.inputContent();
    if (!text.trim()) return;

    this.isProcessing.set(true);

    try {
      const options: BankStatementConverterOptions = {
        dateFormatOutput: this.dateFormatOutput(),
        exportFormat: this.exportFormat(),
        autoDetectColumns: this.autoDetectColumns(),
        cleanMerchantDescriptions: this.cleanMerchantDescriptions(),
        stripPosCodes: this.stripPosCodes(),
        invertAmountSigns: this.invertAmountSigns(),
      };

      const originalName = this.selectedFile()?.name || 'statement.csv';
      const result = await processBankStatement(text, options, originalName);
      this.lastResult.set(result);
    } finally {
      this.isProcessing.set(false);
    }
  }

  async copyToClipboard(): Promise<void> {
    const result = this.lastResult();
    if (!result || !result.formattedText) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.formattedText);
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
    this.dateFormatOutput.set('YYYY-MM-DD');
    this.exportFormat.set('csv');
    this.autoDetectColumns.set(true);
    this.cleanMerchantDescriptions.set(true);
    this.stripPosCodes.set(true);
    this.invertAmountSigns.set(false);
    this.inputContent.set('');
    this.selectedFile.set(null);
    this.lastResult.set(null);
    this.copySuccess.set(false);
  }

  formatCurrency(amount: number): string {
    return '$' + Math.abs(amount).toFixed(2);
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
