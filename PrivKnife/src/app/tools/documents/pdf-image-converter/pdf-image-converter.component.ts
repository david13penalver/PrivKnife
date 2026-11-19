import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PDFDocument } from 'pdf-lib';
import { Card, Dropzone, ProgressBar } from '../../../components';
import { TranslatePipe } from '../../../core/i18n';
import { convertImagesToPdf, convertPdfToImages } from './engine';
import {
  createSyntheticPdf,
  DEFAULT_IMAGES_TO_PDF_OPTIONS,
  DEFAULT_PDF_TO_IMAGES_OPTIONS,
  LANDSCAPE_PNG_BYTES,
  PORTRAIT_PNG_BYTES,
} from './test-fixtures';
import {
  ConverterDirection,
  ImagePageInput,
  ImagesToPdfOptions,
  OutputImageFormat,
  PageOrientation,
  PageSizePreset,
  PdfImageConverterResult,
  PdfImageWorkerRequest,
  PdfImageWorkerResponse,
  PdfToImagesOptions,
  ScanFilterPreset,
} from './types';

export interface QueuedImageItem extends ImagePageInput {
  thumbnailUrl: string;
}

@Component({
  selector: 'app-pdf-image-converter',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, Dropzone, ProgressBar, TranslatePipe],
  templateUrl: './pdf-image-converter.component.html',
  styleUrl: './pdf-image-converter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfImageConverterComponent implements OnDestroy {
  readonly direction = signal<ConverterDirection>('pdf_to_images');

  // Mode A: PDF -> Images signals
  readonly pdfBytes = signal<Uint8Array | null>(null);
  readonly pdfFileName = signal<string>('document.pdf');
  readonly pdfTotalPages = signal<number>(0);
  readonly selectedPages = signal<number[]>([]);
  readonly rangeInput = signal<string>('all');
  readonly outputFormat = signal<OutputImageFormat>(DEFAULT_PDF_TO_IMAGES_OPTIONS.format);
  readonly dpi = signal<number>(DEFAULT_PDF_TO_IMAGES_OPTIONS.dpi);
  readonly imageQuality = signal<number>(DEFAULT_PDF_TO_IMAGES_OPTIONS.quality);
  readonly transparentBackground = signal<boolean>(
    DEFAULT_PDF_TO_IMAGES_OPTIONS.transparentBackground
  );

  // Mode B: Images -> PDF signals
  readonly imageQueue = signal<QueuedImageItem[]>([]);
  readonly pageSize = signal<PageSizePreset>(DEFAULT_IMAGES_TO_PDF_OPTIONS.pageSize);
  readonly orientation = signal<PageOrientation>(
    DEFAULT_IMAGES_TO_PDF_OPTIONS.orientation
  );
  readonly marginPt = signal<number>(DEFAULT_IMAGES_TO_PDF_OPTIONS.marginPt);
  readonly pdfJpegQuality = signal<number>(
    DEFAULT_IMAGES_TO_PDF_OPTIONS.jpegQuality
  );
  readonly outputPdfFileName = signal<string>(
    DEFAULT_IMAGES_TO_PDF_OPTIONS.outputFileName
  );

  // Shared status signals
  readonly isProcessing = signal<boolean>(false);
  readonly progressPercent = signal<number>(0);
  readonly progressStage = signal<string>('');
  readonly errorMessage = signal<string | null>(null);
  readonly lastResult = signal<PdfImageConverterResult | null>(null);

  private activeWorker: Worker | null = null;
  private abortController: AbortController | null = null;
  private createdObjectUrls: Set<string> = new Set<string>();
  private nextImageId = 0;

  readonly pdfPagesList = computed<number[]>(() =>
    Array.from({ length: this.pdfTotalPages() }, (_, i) => i + 1)
  );

  readonly pdfToImagesOptions = computed<PdfToImagesOptions>(() => ({
    format: this.outputFormat(),
    dpi: this.dpi(),
    quality: this.imageQuality(),
    selectedPages: this.selectedPages(),
    transparentBackground: this.transparentBackground(),
  }));

  readonly imagesToPdfOptions = computed<ImagesToPdfOptions>(() => ({
    pageSize: this.pageSize(),
    orientation: this.orientation(),
    marginPt: this.marginPt(),
    jpegQuality: this.pdfJpegQuality(),
    outputFileName: this.outputPdfFileName(),
  }));

  readonly canConvertPdfToImages = computed<boolean>(
    () =>
      this.pdfBytes() !== null &&
      this.selectedPages().length > 0 &&
      !this.isProcessing()
  );

  readonly canCompileImagesToPdf = computed<boolean>(
    () => this.imageQueue().length > 0 && !this.isProcessing()
  );

  ngOnDestroy(): void {
    this.abortController?.abort();
    this.terminateWorker();
    this.revokeAllObjectUrls();
  }

  setDirection(dir: ConverterDirection): void {
    this.direction.set(dir);
    this.errorMessage.set(null);
  }

  setOutputFormat(fmt: OutputImageFormat): void {
    this.outputFormat.set(fmt);
  }

  setDpi(val: number): void {
    const allowed = [72, 150, 200, 300];
    const num = Number(val);
    if (allowed.includes(num)) {
      this.dpi.set(num);
    } else {
      this.dpi.set(Math.min(300, Math.max(72, Math.round(num || 150))));
    }
  }

  setImageQuality(q: number): void {
    const num = Number(q);
    const safe = Number.isFinite(num) ? num : 0.9;
    this.imageQuality.set(Math.min(1, Math.max(0.5, Math.round(safe * 100) / 100)));
  }

  setTransparentBackground(enabled: boolean): void {
    this.transparentBackground.set(enabled);
  }

  async onPdfDropped(files: File[]): Promise<void> {
    if (!files || files.length === 0) return;
    const file = files[0];
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      this.errorMessage.set('Please select a valid .pdf document.');
      return;
    }

    this.errorMessage.set(null);
    this.lastResult.set(null);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const doc = await PDFDocument.load(new Uint8Array(bytes), {
        updateMetadata: false,
        ignoreEncryption: false,
      });
      const count = doc.getPageCount();
      if (count <= 0) {
        this.errorMessage.set('PDF contains zero pages.');
        return;
      }
      this.pdfBytes.set(bytes);
      this.pdfFileName.set(file.name);
      this.pdfTotalPages.set(count);
      this.selectedPages.set(Array.from({ length: count }, (_, i) => i + 1));
      this.rangeInput.set('all');
    } catch (err: unknown) {
      this.pdfBytes.set(null);
      this.pdfTotalPages.set(0);
      this.selectedPages.set([]);
      this.errorMessage.set(
        err instanceof Error
          ? err.message
          : 'Unable to open PDF. It may be corrupted or encrypted.'
      );
    }
  }

  async loadSamplePdf(): Promise<void> {
    const bytes = await createSyntheticPdf(3);
    const sample = new File([bytes.buffer as ArrayBuffer], 'sample-slides.pdf', {
      type: 'application/pdf',
    });
    await this.onPdfDropped([sample]);
  }

  togglePageSelection(pageNum: number): void {
    const current = new Set(this.selectedPages());
    if (current.has(pageNum)) {
      current.delete(pageNum);
    } else {
      current.add(pageNum);
    }
    this.selectedPages.set(Array.from(current).sort((a, b) => a - b));
  }

  selectAllPages(): void {
    this.selectedPages.set(this.pdfPagesList());
  }

  deselectAllPages(): void {
    this.selectedPages.set([]);
  }

  applyRangeSelection(expr: string): void {
    this.rangeInput.set(expr);
    const total = this.pdfTotalPages();
    if (total <= 0) return;
    const raw = expr.trim().toLowerCase();
    if (!raw || raw === 'all') {
      this.selectAllPages();
      return;
    }

    const picked = new Set<number>();
    for (const part of raw.split(',')) {
      const seg = part.trim();
      if (/^\d+$/.test(seg)) {
        const p = Number(seg);
        if (p >= 1 && p <= total) picked.add(p);
      } else {
        const m = seg.match(/^(\d+)\s*-\s*(\d+)$/);
        if (m) {
          const a = Math.max(1, Number(m[1]));
          const b = Math.min(total, Number(m[2]));
          for (let p = a; p <= b; p++) picked.add(p);
        }
      }
    }
    this.selectedPages.set(Array.from(picked).sort((a, b) => a - b));
  }

  async convertPdfPagesToImages(): Promise<void> {
    const bytes = this.pdfBytes();
    if (!bytes || !this.canConvertPdfToImages()) return;

    this.isProcessing.set(true);
    this.errorMessage.set(null);
    this.progressPercent.set(5);
    this.progressStage.set('Preparing page renderer');
    this.abortController = new AbortController();

    const options = this.pdfToImagesOptions();
    const name = this.pdfFileName();

    try {
      let result: PdfImageConverterResult;
      if (typeof Worker !== 'undefined') {
        try {
          result = await this.runInWorker({
            type: 'pdf_to_images',
            pdfBytes: bytes,
            fileName: name,
            options,
          });
        } catch {
          result = await convertPdfToImages(bytes, name, options, {
            signal: this.abortController.signal,
            onProgress: (pct, stage) => {
              this.progressPercent.set(pct);
              this.progressStage.set(stage);
            },
          });
        }
      } else {
        result = await convertPdfToImages(bytes, name, options, {
          signal: this.abortController.signal,
          onProgress: (pct, stage) => {
            this.progressPercent.set(pct);
            this.progressStage.set(stage);
          },
        });
      }

      if (!result.success) {
        this.errorMessage.set(result.error || 'Failed to render PDF pages.');
        this.lastResult.set(null);
        return;
      }
      this.lastResult.set(result);
    } catch (err: unknown) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'PDF to image conversion failed.'
      );
    } finally {
      this.abortController = null;
      this.isProcessing.set(false);
    }
  }

  // Mode B: Images -> PDF methods
  setPageSize(size: PageSizePreset): void {
    this.pageSize.set(size);
  }

  setOrientation(ori: PageOrientation): void {
    this.orientation.set(ori);
  }

  setMarginPt(val: number): void {
    const clamped = Math.min(144, Math.max(0, Math.round(Number(val) || 0)));
    this.marginPt.set(clamped);
  }

  setOutputPdfFileName(name: string): void {
    this.outputPdfFileName.set(name);
  }

  async onImagesDropped(files: File[]): Promise<void> {
    if (!files || files.length === 0) return;

    this.errorMessage.set(null);
    const added: QueuedImageItem[] = [];
    const rejected: string[] = [];

    for (const file of files) {
      const isImg =
        /^image\/(png|jpeg|webp|gif)$/i.test(file.type) ||
        /\.(png|jpe?g|webp|gif)$/i.test(file.name);
      if (!isImg) {
        rejected.push(file.name);
        continue;
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      let thumbUrl = '';
      if (typeof URL.createObjectURL === 'function') {
        thumbUrl = URL.createObjectURL(
          new Blob([new Uint8Array(bytes)], { type: file.type || 'image/png' })
        );
        this.createdObjectUrls.add(thumbUrl);
      }

      added.push({
        id: `img-${++this.nextImageId}`,
        fileName: file.name,
        bytes,
        mimeType: file.type || 'image/png',
        rotationDeg: 0,
        scanFilter: 'none',
        thumbnailUrl: thumbUrl,
      });
    }

    if (rejected.length > 0) {
      this.errorMessage.set(
        `Skipped unsupported files: ${rejected.join(', ')}`
      );
    }

    if (added.length > 0) {
      this.imageQueue.update((prev) => [...prev, ...added]);
      this.lastResult.set(null);
    }
  }

  async loadSampleImages(): Promise<void> {
    const wide = new File([LANDSCAPE_PNG_BYTES.buffer as ArrayBuffer], 'landscape-diagram.png', {
      type: 'image/png',
    });
    const tall = new File([PORTRAIT_PNG_BYTES.buffer as ArrayBuffer], 'portrait-receipt.png', {
      type: 'image/png',
    });
    await this.onImagesDropped([wide, tall]);
  }

  moveImageUp(index: number): void {
    if (index <= 0) return;
    this.imageQueue.update((list) => {
      if (index >= list.length) return list;
      const copy = [...list];
      [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
      return copy;
    });
  }

  moveImageDown(index: number): void {
    this.imageQueue.update((list) => {
      if (index < 0 || index >= list.length - 1) return list;
      const copy = [...list];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      return copy;
    });
  }

  rotateImage(index: number): void {
    this.imageQueue.update((list) =>
      list.map((item, idx) =>
        idx === index
          ? {
              ...item,
              rotationDeg: ((item.rotationDeg + 90) % 360) as 0 | 90 | 180 | 270,
            }
          : item
      )
    );
  }

  setImageScanFilter(index: number, filter: ScanFilterPreset): void {
    this.imageQueue.update((list) =>
      list.map((item, idx) =>
        idx === index ? { ...item, scanFilter: filter } : item
      )
    );
  }

  removeImage(index: number): void {
    const item = this.imageQueue()[index];
    if (item?.thumbnailUrl) {
      URL.revokeObjectURL(item.thumbnailUrl);
      this.createdObjectUrls.delete(item.thumbnailUrl);
    }
    this.imageQueue.update((list) => list.filter((_, idx) => idx !== index));
  }

  async compileImagesToPdf(): Promise<void> {
    const queue = this.imageQueue();
    if (queue.length === 0 || this.isProcessing()) return;

    this.isProcessing.set(true);
    this.errorMessage.set(null);
    this.progressPercent.set(5);
    this.progressStage.set('Compiling PDF from images');
    this.abortController = new AbortController();

    const inputs: ImagePageInput[] = queue.map(({ thumbnailUrl: _t, ...rest }) => rest);
    const options = this.imagesToPdfOptions();

    try {
      let result: PdfImageConverterResult;
      if (typeof Worker !== 'undefined') {
        try {
          result = await this.runInWorker({
            type: 'images_to_pdf',
            images: inputs,
            options,
          });
        } catch {
          result = await convertImagesToPdf(inputs, options, {
            signal: this.abortController.signal,
            onProgress: (pct, stage) => {
              this.progressPercent.set(pct);
              this.progressStage.set(stage);
            },
          });
        }
      } else {
        result = await convertImagesToPdf(inputs, options, {
          signal: this.abortController.signal,
          onProgress: (pct, stage) => {
            this.progressPercent.set(pct);
            this.progressStage.set(stage);
          },
        });
      }

      if (!result.success) {
        this.errorMessage.set(result.error || 'Failed to build PDF.');
        this.lastResult.set(null);
        return;
      }
      this.lastResult.set(result);
    } catch (err: unknown) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'PDF compilation failed.'
      );
    } finally {
      this.abortController = null;
      this.isProcessing.set(false);
    }
  }

  cancelProcessing(): void {
    this.abortController?.abort();
    this.terminateWorker();
    this.isProcessing.set(false);
  }

  downloadResult(): void {
    const res = this.lastResult();
    if (!res?.blob || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const url = URL.createObjectURL(res.blob);
    this.createdObjectUrls.add(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = res.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(url);
      this.createdObjectUrls.delete(url);
    }, 150);
  }

  reset(): void {
    this.abortController?.abort();
    this.terminateWorker();
    this.revokeAllObjectUrls();

    this.pdfBytes.set(null);
    this.pdfFileName.set('document.pdf');
    this.pdfTotalPages.set(0);
    this.selectedPages.set([]);
    this.rangeInput.set('all');
    this.outputFormat.set(DEFAULT_PDF_TO_IMAGES_OPTIONS.format);
    this.dpi.set(DEFAULT_PDF_TO_IMAGES_OPTIONS.dpi);
    this.imageQuality.set(DEFAULT_PDF_TO_IMAGES_OPTIONS.quality);
    this.transparentBackground.set(
      DEFAULT_PDF_TO_IMAGES_OPTIONS.transparentBackground
    );

    this.imageQueue.set([]);
    this.pageSize.set(DEFAULT_IMAGES_TO_PDF_OPTIONS.pageSize);
    this.orientation.set(DEFAULT_IMAGES_TO_PDF_OPTIONS.orientation);
    this.marginPt.set(DEFAULT_IMAGES_TO_PDF_OPTIONS.marginPt);
    this.outputPdfFileName.set(DEFAULT_IMAGES_TO_PDF_OPTIONS.outputFileName);

    this.isProcessing.set(false);
    this.progressPercent.set(0);
    this.progressStage.set('');
    this.errorMessage.set(null);
    this.lastResult.set(null);
  }

  private runInWorker(
    request: PdfImageWorkerRequest
  ): Promise<PdfImageConverterResult> {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(new URL('./worker', import.meta.url), {
          type: 'module',
        });
        this.activeWorker = worker;

        worker.onmessage = (
          event: MessageEvent<PdfImageWorkerResponse>
        ) => {
          const msg = event.data;
          if (msg.type === 'progress') {
            this.progressPercent.set(msg.percent);
            this.progressStage.set(msg.stage);
            return;
          }
          this.terminateWorker();
          resolve(msg.result);
        };

        worker.onerror = (err) => {
          this.terminateWorker();
          reject(err);
        };

        worker.postMessage(request);
      } catch (err) {
        this.terminateWorker();
        reject(err);
      }
    });
  }

  private terminateWorker(): void {
    if (this.activeWorker) {
      this.activeWorker.terminate();
      this.activeWorker = null;
    }
  }

  private revokeAllObjectUrls(): void {
    for (const url of this.createdObjectUrls) {
      URL.revokeObjectURL(url);
    }
    this.createdObjectUrls.clear();
  }
}
