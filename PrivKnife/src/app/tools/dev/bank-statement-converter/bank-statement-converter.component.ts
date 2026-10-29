import { TranslatePipe } from '../../../core/i18n';
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
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './bank-statement-converter.component.html',
  styleUrl: './bank-statement-converter.component.scss',
})
export class BankStatementConverterComponent implements OnDestroy {
  // Signals
  readonly inputContent = signal<string>('');
  readonly dateFormatOutput = signal<DateFormatOutput>('YYYY-MM-DD');
  readonly exportFormat = signal<BankExportFormat>('csv');
  readonly autoDetectColumns = signal<boolean>(true);
  readonly cleanMerchantDescriptions = signal<boolean>(true);
  readonly stripPosCodes = signal<boolean>(true);
  readonly invertAmountSigns = signal<boolean>(false);

  readonly isProcessing = signal<boolean>(false);
  readonly selectedFile = signal<{ name: string; size: number } | null>(null);
  readonly lastResult = signal<BankStatementConverterResult | null>(null);
  readonly copySuccess = signal<boolean>(false);

  private createdBlobUrls: string[] = [];

  ngOnDestroy(): void {
    this.cleanUpUrls();
  }

  setDateFormat(format: DateFormatOutput): void {
    this.dateFormatOutput.set(format);
  }

  setExportFormat(format: BankExportFormat): void {
    this.exportFormat.set(format);
  }

  toggleCleanDescriptions(): void {
    this.cleanMerchantDescriptions.update((v) => !v);
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

      const originalName =
        this.selectedFile()?.name ||
        (this.exportFormat() === 'qif' ? 'statement.ofx' : 'statement.csv');

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
    this.inputContent.set('');
    this.dateFormatOutput.set('YYYY-MM-DD');
    this.exportFormat.set('csv');
    this.autoDetectColumns.set(true);
    this.cleanMerchantDescriptions.set(true);
    this.stripPosCodes.set(true);
    this.invertAmountSigns.set(false);
    this.selectedFile.set(null);
    this.lastResult.set(null);
    this.copySuccess.set(false);
  }

  formatCurrency(amount: number): string {
    return '$' + Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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
