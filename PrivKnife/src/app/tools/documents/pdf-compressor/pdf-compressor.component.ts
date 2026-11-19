import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Card,
  Dropzone,
  ProgressBar,
  SplitPreview,
} from '../../../components';
import { TranslatePipe } from '../../../core/i18n';
import {
  compressBatchPdfs,
  getPresetOptions,
  PRESET_CONFIGS,
} from './engine';
import { createSyntheticImagePdf } from './test-fixtures';
import {
  CompressionMode,
  CompressionPreset,
  PdfCompressorFileInput,
  PdfCompressorFileResult,
  PdfCompressorOptions,
  PdfCompressorResult,
  PdfCompressorWorkerRequest,
  PdfCompressorWorkerResponse,
} from './types';

interface QueuedPdfFile {
  fileName: string;
  sizeBytes: number;
  bytes: Uint8Array;
}

const LARGE_FILE_THRESHOLD_BYTES = 100 * 1024 * 1024;

@Component({
  selector: 'app-pdf-compressor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Card,
    Dropzone,
    ProgressBar,
    SplitPreview,
    TranslatePipe,
  ],
  templateUrl: './pdf-compressor.component.html',
  styleUrl: './pdf-compressor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfCompressorComponent implements OnDestroy {
  @ViewChild('beforeCanvas') beforeCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('afterCanvas') afterCanvasRef?: ElementRef<HTMLCanvasElement>;

  readonly preset = signal<CompressionPreset>('recommended');
  readonly mode = signal<CompressionMode>('smart_stream');
  readonly targetDpi = signal<number>(PRESET_CONFIGS.recommended.targetDpi);
  readonly maxImageDimensionPx = signal<number>(
    PRESET_CONFIGS.recommended.maxImageDimensionPx
  );
  readonly jpegQuality = signal<number>(PRESET_CONFIGS.recommended.jpegQuality);
  readonly convertToGrayscale = signal<boolean>(false);
  readonly stripMetadata = signal<boolean>(
    PRESET_CONFIGS.recommended.stripMetadata
  );
  readonly removeThumbnails = signal<boolean>(
    PRESET_CONFIGS.recommended.removeThumbnails
  );

  readonly queuedFiles = signal<QueuedPdfFile[]>([]);
  readonly results = signal<PdfCompressorFileResult[]>([]);
  readonly bundleZipBlob = signal<Blob | null>(null);
  readonly bundleZipFileName = signal<string>('privknife-compressed-pdfs.zip');

  readonly isProcessing = signal<boolean>(false);
  readonly progressPercent = signal<number>(0);
  readonly progressStage = signal<string>('');
  readonly errorMessage = signal<string | null>(null);
  readonly largeFileWarning = signal<boolean>(false);
  readonly selectedPreviewIndex = signal<number>(0);
  readonly previewPageNumber = signal<number>(1);
  readonly previewAvailable = signal<boolean>(false);

  private activeWorker: Worker | null = null;
  private createdObjectUrls: string[] = [];

  readonly currentOptions = computed<PdfCompressorOptions>(() => ({
    preset: this.preset(),
    mode: this.mode(),
    targetDpi: this.targetDpi(),
    maxImageDimensionPx: this.maxImageDimensionPx(),
    jpegQuality: this.jpegQuality(),
    convertToGrayscale: this.convertToGrayscale(),
    stripMetadata: this.stripMetadata(),
    removeThumbnails: this.removeThumbnails(),
  }));

  readonly canCompress = computed<boolean>(
    () => this.queuedFiles().length > 0 && !this.isProcessing()
  );

  readonly totalOriginalBytes = computed<number>(() =>
    this.results().reduce((acc, item) => acc + item.metrics.originalBytes, 0)
  );

  readonly totalCompressedBytes = computed<number>(() =>
    this.results().reduce((acc, item) => acc + item.metrics.compressedBytes, 0)
  );

  readonly totalSavedBytes = computed<number>(() =>
    Math.max(0, this.totalOriginalBytes() - this.totalCompressedBytes())
  );

  readonly totalSavingsPercent = computed<number>(() => {
    const orig = this.totalOriginalBytes();
    if (orig <= 0) return 0;
    return Number(((this.totalSavedBytes() / orig) * 100).toFixed(1));
  });

  readonly activeResult = computed<PdfCompressorFileResult | null>(() => {
    const list = this.results();
    const idx = this.selectedPreviewIndex();
    return list[idx] ?? list[0] ?? null;
  });

  ngOnDestroy(): void {
    this.terminateActiveWorker();
    this.revokeAllObjectUrls();
    this.clearCanvasBuffers();
  }

  selectPreset(preset: Exclude<CompressionPreset, 'custom'>): void {
    const opts = getPresetOptions(preset, {
      convertToGrayscale: this.convertToGrayscale(),
      mode: this.mode(),
    });
    this.preset.set(preset);
    this.targetDpi.set(opts.targetDpi);
    this.maxImageDimensionPx.set(opts.maxImageDimensionPx);
    this.jpegQuality.set(opts.jpegQuality);
    this.stripMetadata.set(opts.stripMetadata);
    this.removeThumbnails.set(opts.removeThumbnails);
  }

  setMode(mode: CompressionMode): void {
    this.mode.set(mode);
  }

  setTargetDpi(dpi: number): void {
    const clamped = Math.min(300, Math.max(72, Math.round(Number(dpi) || 72)));
    this.preset.set('custom');
    this.targetDpi.set(clamped);
  }

  setMaxImageDimensionPx(px: number): void {
    const clamped = Math.min(4000, Math.max(800, Math.round(Number(px) || 800)));
    this.preset.set('custom');
    this.maxImageDimensionPx.set(clamped);
  }

  setJpegQuality(quality: number): void {
    const num = Number(quality);
    const safe = Number.isFinite(num) ? num : 0.72;
    const clamped = Math.min(0.95, Math.max(0.25, Math.round(safe * 100) / 100));
    this.preset.set('custom');
    this.jpegQuality.set(clamped);
  }

  toggleGrayscale(): void {
    this.convertToGrayscale.update((v) => !v);
  }

  toggleStripMetadata(): void {
    this.preset.set('custom');
    this.stripMetadata.update((v) => !v);
  }

  toggleRemoveThumbnails(): void {
    this.preset.set('custom');
    this.removeThumbnails.update((v) => !v);
  }

  async onFilesDropped(files: File[]): Promise<void> {
    if (!files || files.length === 0) return;

    this.errorMessage.set(null);
    const validQueue: QueuedPdfFile[] = [];
    const rejectedNames: string[] = [];

    for (const file of files) {
      const isPdf =
        file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
      if (!isPdf) {
        rejectedNames.push(file.name);
        continue;
      }
      const buffer = await file.arrayBuffer();
      validQueue.push({
        fileName: file.name,
        sizeBytes: Math.max(file.size || 0, buffer.byteLength),
        bytes: new Uint8Array(buffer),
      });
    }

    if (validQueue.length === 0) {
      this.errorMessage.set(
        rejectedNames.length > 0
          ? `Unsupported file format: ${rejectedNames.join(', ')}. Please drop .pdf files.`
          : 'No valid PDF files selected.'
      );
      return;
    }

    if (rejectedNames.length > 0) {
      this.errorMessage.set(
        `Skipped non-PDF files: ${rejectedNames.join(', ')}`
      );
    }

    this.queuedFiles.set(validQueue);
    this.results.set([]);
    this.bundleZipBlob.set(null);
    this.selectedPreviewIndex.set(0);
    this.previewAvailable.set(false);
    this.recomputeLargeFileWarning(validQueue);
  }

  removeQueuedFile(index: number): void {
    const next = this.queuedFiles().filter((_, idx) => idx !== index);
    this.queuedFiles.set(next);
    this.recomputeLargeFileWarning(next);
    if (next.length === 0) {
      this.results.set([]);
      this.bundleZipBlob.set(null);
    }
  }

  async loadSamplePdf(): Promise<void> {
    this.errorMessage.set(null);
    const bytes = await createSyntheticImagePdf({
      width: 2400,
      height: 1600,
      streamByteSize: 32000,
      pageCount: 1,
    });
    const sample: QueuedPdfFile = {
      fileName: 'sample-brochure.pdf',
      sizeBytes: bytes.byteLength,
      bytes,
    };
    this.queuedFiles.set([sample]);
    this.results.set([]);
    this.bundleZipBlob.set(null);
    this.selectedPreviewIndex.set(0);
    this.previewAvailable.set(false);
    this.largeFileWarning.set(false);
  }

  async compressAll(): Promise<void> {
    const queue = this.queuedFiles();
    if (queue.length === 0 || this.isProcessing()) {
      return;
    }

    this.isProcessing.set(true);
    this.errorMessage.set(null);
    this.progressPercent.set(5);
    this.progressStage.set('Preparing documents');
    this.revokeAllObjectUrls();

    const inputs: PdfCompressorFileInput[] = queue.map((item) => ({
      fileName: item.fileName,
      bytes: item.bytes,
    }));
    const options = this.currentOptions();

    try {
      let result: PdfCompressorResult;

      if (typeof Worker !== 'undefined') {
        try {
          result = await this.compressWithWorker(inputs, options);
        } catch {
          result = await compressBatchPdfs(inputs, options, {
            onProgress: (pct, stage) => {
              this.progressPercent.set(pct);
              this.progressStage.set(stage);
            },
          });
        }
      } else {
        result = await compressBatchPdfs(inputs, options, {
          onProgress: (pct, stage) => {
            this.progressPercent.set(pct);
            this.progressStage.set(stage);
          },
        });
      }

      if (!result.success) {
        this.results.set([]);
        this.bundleZipBlob.set(null);
        this.errorMessage.set(
          result.error || 'Failed to compress the PDF document.'
        );
        return;
      }

      this.results.set(result.files);
      this.bundleZipBlob.set(result.bundleZipBlob ?? null);
      if (result.bundleZipFileName) {
        this.bundleZipFileName.set(result.bundleZipFileName);
      }
      this.selectedPreviewIndex.set(0);
      this.previewPageNumber.set(1);

      const firstQueued = queue[0];
      const firstResult = result.files[0];
      if (firstQueued && firstResult) {
        await this.renderSplitComparison(
          firstQueued.bytes,
          firstResult.bytes,
          1
        );
      }
    } catch (err: unknown) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Unexpected compression error.'
      );
    } finally {
      this.isProcessing.set(false);
    }
  }

  async selectPreviewFile(index: number): Promise<void> {
    const queue = this.queuedFiles();
    const resList = this.results();
    if (!queue[index] || !resList[index]) return;
    this.selectedPreviewIndex.set(index);
    this.previewPageNumber.set(1);
    await this.renderSplitComparison(queue[index].bytes, resList[index].bytes, 1);
  }

  async changePreviewPage(delta: number): Promise<void> {
    const active = this.activeResult();
    const queueItem = this.queuedFiles()[this.selectedPreviewIndex()];
    if (!active || !queueItem) return;
    const next = Math.min(
      active.metrics.pageCount,
      Math.max(1, this.previewPageNumber() + delta)
    );
    if (next === this.previewPageNumber()) return;
    this.previewPageNumber.set(next);
    await this.renderSplitComparison(queueItem.bytes, active.bytes, next);
  }

  downloadFile(index: number): void {
    const item = this.results()[index];
    if (!item) return;
    this.triggerBlobDownload(item.blob, item.outputFileName);
  }

  downloadZipBundle(): void {
    const zipBlob = this.bundleZipBlob();
    if (!zipBlob) return;
    this.triggerBlobDownload(zipBlob, this.bundleZipFileName());
  }

  formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  reset(): void {
    this.terminateActiveWorker();
    this.revokeAllObjectUrls();
    this.clearCanvasBuffers();

    this.selectPreset('recommended');
    this.mode.set('smart_stream');
    this.convertToGrayscale.set(false);
    this.queuedFiles.set([]);
    this.results.set([]);
    this.bundleZipBlob.set(null);
    this.isProcessing.set(false);
    this.progressPercent.set(0);
    this.progressStage.set('');
    this.errorMessage.set(null);
    this.largeFileWarning.set(false);
    this.selectedPreviewIndex.set(0);
    this.previewPageNumber.set(1);
    this.previewAvailable.set(false);
  }

  private recomputeLargeFileWarning(files: QueuedPdfFile[]): void {
    this.largeFileWarning.set(
      files.some((f) => f.sizeBytes >= LARGE_FILE_THRESHOLD_BYTES)
    );
  }

  private compressWithWorker(
    files: PdfCompressorFileInput[],
    options: PdfCompressorOptions
  ): Promise<PdfCompressorResult> {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(new URL('./worker', import.meta.url), {
          type: 'module',
        });
        this.activeWorker = worker;

        worker.onmessage = (
          event: MessageEvent<PdfCompressorWorkerResponse>
        ) => {
          const msg = event.data;
          if (msg.type === 'progress') {
            this.progressPercent.set(msg.percent);
            this.progressStage.set(msg.stage);
            return;
          }
          this.terminateActiveWorker();
          resolve(msg.result);
        };

        worker.onerror = (err) => {
          this.terminateActiveWorker();
          reject(err);
        };

        worker.postMessage({
          type: 'compress',
          files,
          options,
        } as PdfCompressorWorkerRequest);
      } catch (err) {
        this.terminateActiveWorker();
        reject(err);
      }
    });
  }

  private terminateActiveWorker(): void {
    if (this.activeWorker) {
      this.activeWorker.terminate();
      this.activeWorker = null;
    }
  }

  private async renderSplitComparison(
    beforeBytes: Uint8Array,
    afterBytes: Uint8Array,
    pageNum: number
  ): Promise<void> {
    if (typeof document === 'undefined') return;
    const beforeCanvas = this.beforeCanvasRef?.nativeElement;
    const afterCanvas = this.afterCanvasRef?.nativeElement;
    if (!beforeCanvas || !afterCanvas) return;

    try {
      const pdfjsLib = await import('pdfjs-dist');
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      }

      const [okBefore, okAfter] = await Promise.all([
        this.renderPdfPageToCanvas(pdfjsLib, beforeBytes, pageNum, beforeCanvas),
        this.renderPdfPageToCanvas(pdfjsLib, afterBytes, pageNum, afterCanvas),
      ]);
      this.previewAvailable.set(okBefore && okAfter);
    } catch {
      this.previewAvailable.set(false);
    }
  }

  private async renderPdfPageToCanvas(
    pdfjsLib: typeof import('pdfjs-dist'),
    bytes: Uint8Array,
    pageNum: number,
    canvas: HTMLCanvasElement
  ): Promise<boolean> {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(bytes),
      useWorkerFetch: false,
      useSystemFonts: true,
    });
    try {
      const doc = await loadingTask.promise;
      if (pageNum < 1 || pageNum > doc.numPages) return false;
      const page = await doc.getPage(pageNum);
      const baseVp = page.getViewport({ scale: 1 });
      const scale = Math.min(1.5, 420 / Math.max(1, baseVp.width));
      const viewport = page.getViewport({ scale });
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      return true;
    } catch {
      return false;
    } finally {
      await loadingTask.destroy();
    }
  }

  private clearCanvasBuffers(): void {
    const before = this.beforeCanvasRef?.nativeElement;
    const after = this.afterCanvasRef?.nativeElement;
    if (before) {
      before.width = 0;
      before.height = 0;
    }
    if (after) {
      after.width = 0;
      after.height = 0;
    }
  }

  private triggerBlobDownload(blob: Blob, fileName: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    const url = URL.createObjectURL(blob);
    this.createdObjectUrls.push(url);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    setTimeout(() => {
      URL.revokeObjectURL(url);
      const idx = this.createdObjectUrls.indexOf(url);
      if (idx !== -1) {
        this.createdObjectUrls.splice(idx, 1);
      }
    }, 150);
  }

  private revokeAllObjectUrls(): void {
    for (const url of this.createdObjectUrls) {
      URL.revokeObjectURL(url);
    }
    this.createdObjectUrls = [];
  }
}
