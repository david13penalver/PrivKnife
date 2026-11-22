import { TranslatePipe } from '../../../core/i18n';
import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Badge, Button, Dropzone, ProgressBar } from '../../../components';
import { FormsModule } from '@angular/forms';
import {
  ExportOcrFormat,
  LocalOcrTextExtractorOptions,
  OcrLanguage,
  PageSegmentationMode,
} from './types';
import { createSampleReceiptImageBlob } from './sample';
import { OcrJob } from './ocr-job';

@Component({
  selector: 'app-local-ocr-text-extractor',
  standalone: true,
  imports: [Badge, Button, Dropzone, FormsModule, ProgressBar, TranslatePipe],
  providers: [OcrJob],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './local-ocr-text-extractor.component.html',
  styleUrls: ['./local-ocr-text-extractor.component.scss'],
})
export class LocalOcrTextExtractorComponent implements OnDestroy {
  // Reactive Signals
  readonly ocrLanguage = signal<OcrLanguage>('eng');
  readonly pageSegmentationMode = signal<PageSegmentationMode>('auto');
  readonly cleanIrregularLinebreaks = signal<boolean>(true);
  readonly preserveTableSpacing = signal<boolean>(true);
  readonly exportFormat = signal<ExportOcrFormat>('txt');
  readonly binarizeThreshold = signal<number>(128);
  readonly enhanceContrast = signal<boolean>(true);

  readonly selectedFile = signal<{
    name: string;
    size: number;
    file: File | Blob;
    isPdf: boolean;
  } | null>(null);

  private readonly job = inject(OcrJob);
  readonly isProcessing = this.job.busy.asReadonly();
  readonly progress = this.job.progress.asReadonly();
  readonly jobError = this.job.error.asReadonly();
  readonly extractedResult = this.job.result.asReadonly();
  readonly previewText = computed(() => this.extractedResult()?.extractedText ?? '');
  readonly copySuccess = signal(false);
  readonly selectionError = signal(false);
  private selection = 0;
  private copyTimer?: ReturnType<typeof setTimeout>;

  ngOnDestroy(): void {
    this.selection++;
    clearTimeout(this.copyTimer);
  }

  setLanguage(lang: OcrLanguage): void {
    this.ocrLanguage.set(lang);
  }

  setSegmentation(mode: PageSegmentationMode): void {
    this.pageSegmentationMode.set(mode);
  }

  setExportFormat(fmt: ExportOcrFormat): void {
    this.exportFormat.set(fmt);
  }

  setCleanLinebreaks(val: boolean): void {
    this.cleanIrregularLinebreaks.set(val);
  }

  setPreserveTables(val: boolean): void {
    this.preserveTableSpacing.set(val);
  }

  setBinarizeThreshold(val: number | string): void {
    const parsed = Number(val);
    const num = Number.isFinite(parsed) ? Math.max(0, Math.min(255, parsed)) : 128;
    this.binarizeThreshold.set(num);
  }

  setEnhanceContrast(val: boolean): void {
    this.enhanceContrast.set(val);
  }

  async handleFileSelected(file: File | Blob, name?: string): Promise<void> {
    const fileName =
      name || (file instanceof File ? file.name : 'document.png');
    const isPdf =
      fileName.toLowerCase().endsWith('.pdf') ||
      ('type' in file && file.type === 'application/pdf');

    this.selection++;
    this.job.clear();
    this.selectionError.set(false);
    this.copySuccess.set(false);

    this.selectedFile.set({
      name: fileName,
      size: file.size,
      file,
      isPdf,
    });
  }

  async loadSampleReceipt(): Promise<void> {
    const selection = ++this.selection;
    this.job.clear();
    this.selectedFile.set(null);
    this.selectionError.set(false);
    try {
      const sample = await createSampleReceiptImageBlob();
      if (selection === this.selection) await this.handleFileSelected(sample, 'sample-invoice.png');
    } catch {
      if (selection === this.selection) this.selectionError.set(true);
    }
  }

  onFilesSelected(files: File[]): void {
    if (files[0]) void this.handleFileSelected(files[0]);
  }

  rejectFile(): void {
    this.selection++;
    this.job.clear();
    this.selectedFile.set(null);
    this.selectionError.set(true);
  }

  async extractText(): Promise<void> {
    const item = this.selectedFile();
    if (!item || this.isProcessing()) return;

    const options: LocalOcrTextExtractorOptions = {
      ocrLanguage: this.ocrLanguage(),
      pageSegmentationMode: this.pageSegmentationMode(),
      cleanIrregularLinebreaks: this.cleanIrregularLinebreaks(),
      preserveTableSpacing: this.preserveTableSpacing(),
      exportFormat: this.exportFormat(),
      binarizeThreshold: this.binarizeThreshold(),
      enhanceContrast: this.enhanceContrast(),
    };
    await this.job.run(item.file, item.name, options);
  }

  async copyToClipboard(): Promise<void> {
    const text = this.previewText();
    if (!text) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      this.copySuccess.set(true);
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => this.copySuccess.set(false), 2000);
    } catch {
      // Fallback
    }
  }

  downloadDeliverable(): void {
    const result = this.extractedResult();
    if (!result) return;

    const downloadUrl = URL.createObjectURL(result.blob);
    try {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = result.fileName;
      link.click();
    } finally {
      URL.revokeObjectURL(downloadUrl);
    }
  }

  resetToDefaults(): void {
    this.selection++;
    this.job.clear();
    this.selectionError.set(false);
    this.ocrLanguage.set('eng');
    this.pageSegmentationMode.set('auto');
    this.cleanIrregularLinebreaks.set(true);
    this.preserveTableSpacing.set(true);
    this.exportFormat.set('txt');
    this.binarizeThreshold.set(128);
    this.enhanceContrast.set(true);
    this.selectedFile.set(null);
    this.copySuccess.set(false);
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
