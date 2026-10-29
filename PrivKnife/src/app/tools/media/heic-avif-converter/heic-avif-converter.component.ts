import { TranslatePipe } from '../../../core/i18n';
import {
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Card, Dropzone, ProgressBar } from '../../../components';

import {
  ConvertedImageItem,
  HeicAvifBatchStats,
  HeicAvifConverterOptions,
  HeicAvifConverterResult,
  HeicAvifWorkerRequest,
  HeicAvifWorkerResponse,
  OutputFormat,
} from './types';
import {
  DEFAULT_CONVERTER_OPTIONS,
  SAMPLE_BATCH_FILES,
} from './test-fixtures';
import {
  calculateBatchStats,
  convertSingleImage,
  packageBatchAsZip,
  processBatch,
} from './engine';

@Component({
  selector: 'app-heic-avif-converter',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, Dropzone, ProgressBar, TranslatePipe],
  templateUrl: './heic-avif-converter.component.html',
  styleUrl: './heic-avif-converter.component.scss',
})
export class HeicAvifConverterComponent implements OnDestroy {
  readonly Math = Math;

  // Configuration Signals
  readonly outputFormat = signal<OutputFormat>('jpeg');
  readonly jpegQuality = signal<number>(0.92);
  readonly stripMetadata = signal<boolean>(true);
  readonly maxDimensionPx = signal<number>(0);
  readonly filenameSuffix = signal<string>('');
  readonly packageAsZip = signal<boolean>(false);

  // Queue & State Signals
  readonly imageQueue = signal<ConvertedImageItem[]>([]);
  readonly isConverting = signal<boolean>(false);
  readonly conversionProgress = signal<number>(0);
  readonly conversionError = signal<string | null>(null);

  private createdObjectUrls: string[] = [];
  private worker: Worker | null = null;

  readonly currentOptions = computed<HeicAvifConverterOptions>(() => ({
    outputFormat: this.outputFormat(),
    jpegQuality: this.jpegQuality(),
    stripMetadata: this.stripMetadata(),
    maxDimensionPx: this.maxDimensionPx(),
    filenameSuffix: this.filenameSuffix(),
    packageAsZip: this.packageAsZip(),
  }));

  readonly batchStats = computed<HeicAvifBatchStats>(() =>
    calculateBatchStats(this.imageQueue())
  );

  readonly hasConvertedFiles = computed<boolean>(() =>
    this.imageQueue().some((i) => i.status === 'done' && i.convertedBlob)
  );

  ngOnDestroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    for (const url of this.createdObjectUrls) {
      URL.revokeObjectURL(url);
    }
    this.createdObjectUrls = [];
  }

  setOutputFormat(format: OutputFormat): void {
    this.outputFormat.set(format);
  }

  setJpegQuality(quality: number): void {
    this.jpegQuality.set(Math.min(1.0, Math.max(0.1, quality)));
  }

  setMaxDimensionPx(px: number): void {
    this.maxDimensionPx.set(Math.max(0, px));
  }

  setFilenameSuffix(suffix: string): void {
    this.filenameSuffix.set(suffix);
  }

  setPackageAsZip(zip: boolean): void {
    this.packageAsZip.set(zip);
  }

  resetToDefaults(): void {
    this.outputFormat.set(DEFAULT_CONVERTER_OPTIONS.outputFormat);
    this.jpegQuality.set(DEFAULT_CONVERTER_OPTIONS.jpegQuality);
    this.stripMetadata.set(DEFAULT_CONVERTER_OPTIONS.stripMetadata);
    this.maxDimensionPx.set(DEFAULT_CONVERTER_OPTIONS.maxDimensionPx);
    this.filenameSuffix.set(DEFAULT_CONVERTER_OPTIONS.filenameSuffix);
    this.packageAsZip.set(DEFAULT_CONVERTER_OPTIONS.packageAsZip);
  }

  handleFilesSelected(files: File[]): void {
    if (!files || files.length === 0) return;

    const newItems: ConvertedImageItem[] = files.map((file, idx) => ({
      id: `file-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      originalFile: file,
      originalName: file.name,
      originalSize: file.size,
      originalMimeType: file.type || 'image/heic',
      status: 'pending',
    }));

    this.imageQueue.update((q) => [...q, ...newItems]);
  }

  loadSampleBatch(): void {
    this.handleFilesSelected(SAMPLE_BATCH_FILES);
  }

  removeQueueItem(id: string): void {
    this.imageQueue.update((q) => q.filter((i) => i.id !== id));
  }

  clearQueue(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    for (const url of this.createdObjectUrls) {
      URL.revokeObjectURL(url);
    }
    this.createdObjectUrls = [];
    this.imageQueue.set([]);
    this.conversionProgress.set(0);
    this.conversionError.set(null);
  }

  async startBatchConversion(): Promise<void> {
    const queue = this.imageQueue();
    if (queue.length === 0) return;

    this.isConverting.set(true);
    this.conversionError.set(null);
    this.conversionProgress.set(0);

    const options = this.currentOptions();

    // If web worker available, offload batch processing
    if (typeof Worker !== 'undefined') {
      try {
        await this.runWorkerBatch(queue, options);
        this.isConverting.set(false);
        return;
      } catch {
        // Fallback to main thread
      }
    }

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === 'done') continue;

      this.updateItemInQueue(item.id, { status: 'processing' });

      try {
        const converted = await convertSingleImage(item.originalFile, options, item.id);
        this.updateItemInQueue(item.id, converted);
      } catch (err: any) {
        this.updateItemInQueue(item.id, {
          status: 'error',
          errorMessage: err?.message || 'Conversion failed',
        });
      }

      this.conversionProgress.set(Math.round(((i + 1) / queue.length) * 100));
    }

    this.isConverting.set(false);
  }

  private runWorkerBatch(
    queue: ConvertedImageItem[],
    options: HeicAvifConverterOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(new URL('./worker', import.meta.url), {
          type: 'module',
        });
        this.worker = worker;

        worker.onmessage = (event: MessageEvent<HeicAvifWorkerResponse>) => {
          const msg = event.data;
          if (msg.type === 'progress') {
            this.conversionProgress.set(msg.progressPercent);
            this.updateItemInQueue(msg.item.id, msg.item);
          } else if (msg.type === 'done') {
            worker.terminate();
            if (this.worker === worker) {
              this.worker = null;
            }
            if (msg.success) {
              resolve();
            } else {
              reject(new Error(msg.error || 'Worker batch conversion failed'));
            }
          }
        };

        worker.onerror = (err) => {
          worker.terminate();
          if (this.worker === worker) {
            this.worker = null;
          }
          reject(err);
        };

        const files = queue.map((item) => item.originalFile);
        const itemIds = queue.map((item) => item.id);
        worker.postMessage({
          type: 'convert',
          files,
          itemIds,
          options,
        } as HeicAvifWorkerRequest);
      } catch (err) {
        reject(err);
      }
    });
  }

  private updateItemInQueue(id: string, partial: Partial<ConvertedImageItem>): void {
    this.imageQueue.update((q) =>
      q.map((i) => (i.id === id ? { ...i, ...partial } : i))
    );
  }

  downloadSingleItem(item: ConvertedImageItem): void {
    if (!item.convertedBlob || !item.convertedName) return;
    this.triggerDownload(item.convertedBlob, item.convertedName);
  }

  async downloadAll(): Promise<void> {
    const doneItems = this.imageQueue().filter(
      (i) => i.status === 'done' && i.convertedBlob
    );

    if (doneItems.length === 0) return;

    if (doneItems.length === 1 && !this.packageAsZip()) {
      this.downloadSingleItem(doneItems[0]);
      return;
    }

    try {
      const zipBlob = await packageBatchAsZip(doneItems);
      const timeStamp = new Date().toISOString().slice(0, 10);
      const fileName = `converted-photos-${this.outputFormat()}-${timeStamp}.zip`;
      this.triggerDownload(zipBlob, fileName);
    } catch (err: any) {
      this.conversionError.set(err?.message || 'Failed to create zip archive');
    }
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const url = URL.createObjectURL(blob);
    this.createdObjectUrls.push(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(url);
      const idx = this.createdObjectUrls.indexOf(url);
      if (idx !== -1) {
        this.createdObjectUrls.splice(idx, 1);
      }
    }, 100);
  }

  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i] || 'B'}`;
  }
}
