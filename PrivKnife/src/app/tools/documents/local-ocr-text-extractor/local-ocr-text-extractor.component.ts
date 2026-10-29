import { TranslatePipe } from '../../../core/i18n';
import { Component, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ExportOcrFormat,
  LocalOcrTextExtractorOptions,
  LocalOcrTextExtractorResult,
  LocalOcrWorkerRequest,
  LocalOcrWorkerResponse,
  OcrLanguage,
  PageSegmentationMode,
} from './types';
import { createSampleReceiptImageBlob, processLocalOcr } from './engine';

@Component({
  selector: 'app-local-ocr-text-extractor',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
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

  readonly isProcessing = signal<boolean>(false);
  readonly extractedResult = signal<LocalOcrTextExtractorResult | null>(null);
  readonly previewText = signal<string>('');
  readonly copySuccess = signal<boolean>(false);

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
    const num = Math.max(0, Math.min(255, Number(val) || 128));
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

    // Reset stale extracted state on re-upload (DEFECT-47-03)
    this.extractedResult.set(null);
    this.previewText.set('');

    this.selectedFile.set({
      name: fileName,
      size: file.size,
      file,
      isPdf,
    });
  }

  async loadSampleReceipt(): Promise<void> {
    const sampleBlob = await createSampleReceiptImageBlob();
    await this.handleFileSelected(sampleBlob, 'sample-invoice.png');
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

  async extractText(): Promise<void> {
    const item = this.selectedFile();
    if (!item) return;

    this.isProcessing.set(true);

    try {
      const options: LocalOcrTextExtractorOptions = {
        ocrLanguage: this.ocrLanguage(),
        pageSegmentationMode: this.pageSegmentationMode(),
        cleanIrregularLinebreaks: this.cleanIrregularLinebreaks(),
        preserveTableSpacing: this.preserveTableSpacing(),
        exportFormat: this.exportFormat(),
        binarizeThreshold: this.binarizeThreshold(),
        enhanceContrast: this.enhanceContrast(),
      };

      let result: LocalOcrTextExtractorResult;

      // Offload to web worker if available
      if (typeof Worker !== 'undefined') {
        try {
          const buffer = await item.file.arrayBuffer();
          result = await this.extractWithWorker(buffer, options, item.name);
        } catch {
          result = await processLocalOcr(item.file, options, item.name);
        }
      } else {
        result = await processLocalOcr(item.file, options, item.name);
      }

      this.extractedResult.set(result);
      this.previewText.set(result.extractedText);
    } finally {
      this.isProcessing.set(false);
    }
  }

  private extractWithWorker(
    fileBuffer: ArrayBuffer,
    options: LocalOcrTextExtractorOptions,
    originalFileName: string
  ): Promise<LocalOcrTextExtractorResult> {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(new URL('./worker', import.meta.url), {
          type: 'module',
        });
        this.worker = worker;

        worker.onmessage = (event: MessageEvent<LocalOcrWorkerResponse>) => {
          if (event.data.type === 'ocr') {
            worker.terminate();
            if (this.worker === worker) this.worker = null;
            if (event.data.success && event.data.result) {
              resolve(event.data.result);
            } else {
              reject(new Error(event.data.error || 'Worker OCR failed'));
            }
          }
        };

        worker.onerror = (err) => {
          worker.terminate();
          if (this.worker === worker) this.worker = null;
          reject(err);
        };

        worker.postMessage({
          type: 'ocr',
          fileBuffer,
          options,
          originalFileName,
        } as LocalOcrWorkerRequest);
      } catch (err) {
        reject(err);
      }
    });
  }

  async copyToClipboard(): Promise<void> {
    const text = this.previewText();
    if (!text) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    } catch {
      // Fallback
    }
  }

  downloadDeliverable(): void {
    const result = this.extractedResult();
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
    this.ocrLanguage.set('eng');
    this.pageSegmentationMode.set('auto');
    this.cleanIrregularLinebreaks.set(true);
    this.preserveTableSpacing.set(true);
    this.exportFormat.set('txt');
    this.binarizeThreshold.set(128);
    this.enhanceContrast.set(true);
    this.selectedFile.set(null);
    this.extractedResult.set(null);
    this.previewText.set('');
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
