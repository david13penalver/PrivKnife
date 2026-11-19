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
import { PDFDocument } from 'pdf-lib';
import { Card, Dropzone, ProgressBar } from '../../../components';
import { TranslatePipe } from '../../../core/i18n';
import {
  computeBookletImposition,
  computeNupImposition,
  detectWhitespaceMarginsFromRgba,
  normalizeRotationDeg,
  processPdfCropperBooklet,
  ptToUnit,
  unitToPt,
} from './engine';
import {
  createSyntheticPdf,
  DEFAULT_CROP_CONFIG,
  DEFAULT_NUP_CONFIG,
  DEFAULT_RESIZE_CONFIG,
} from './test-fixtures';
import {
  CropBookletMode,
  CropScope,
  ImpositionSheetEntry,
  MarginInsetsPt,
  MeasurementUnit,
  PaperOrientation,
  PdfCropperBookletOptions,
  PdfCropperBookletResult,
  PdfCropperWorkerRequest,
  PdfCropperWorkerResponse,
  ResizeScaleMode,
  TargetPaperPreset,
} from './types';

const LARGE_FILE_THRESHOLD_BYTES = 100 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

type PdfJsDocProxyLike = { destroy?: () => Promise<void> | void; getPage?: (n: number) => Promise<any> };

@Component({
  selector: 'app-pdf-cropper-booklet',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, Dropzone, ProgressBar, TranslatePipe],
  templateUrl: './pdf-cropper-booklet.component.html',
  styleUrl: './pdf-cropper-booklet.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfCropperBookletComponent implements OnDestroy {
  @ViewChild('previewCanvas') previewCanvasRef?: ElementRef<HTMLCanvasElement>;

  readonly mode = signal<CropBookletMode>('crop');

  // Document state
  readonly pdfBytes = signal<Uint8Array | null>(null);
  readonly pdfFileName = signal<string>('document.pdf');
  readonly pdfSizeBytes = signal<number>(0);
  readonly pageCount = signal<number>(0);
  readonly currentPage = signal<number>(1);
  readonly currentPageWidthPt = signal<number>(595);
  readonly currentPageHeightPt = signal<number>(842);
  readonly currentPageRotation = signal<number>(0);
  readonly previewAvailable = signal<boolean>(false);

  // Crop signals
  readonly unit = signal<MeasurementUnit>('pt');
  readonly insetTopPt = signal<number>(DEFAULT_CROP_CONFIG.insetsPt.top);
  readonly insetRightPt = signal<number>(DEFAULT_CROP_CONFIG.insetsPt.right);
  readonly insetBottomPt = signal<number>(DEFAULT_CROP_CONFIG.insetsPt.bottom);
  readonly insetLeftPt = signal<number>(DEFAULT_CROP_CONFIG.insetsPt.left);
  readonly cropScope = signal<CropScope>(DEFAULT_CROP_CONFIG.scope);
  readonly pageRange = signal<string>(DEFAULT_CROP_CONFIG.pageRange);
  readonly autoTrimPaddingPt = signal<number>(DEFAULT_CROP_CONFIG.autoTrimPaddingPt);
  readonly whiteThreshold = signal<number>(DEFAULT_CROP_CONFIG.whiteThreshold);
  readonly isScanningWhitespace = signal<boolean>(false);

  // Resize signals
  readonly targetPaper = signal<TargetPaperPreset>(DEFAULT_RESIZE_CONFIG.targetPaper);
  readonly resizeOrientation = signal<PaperOrientation>(DEFAULT_RESIZE_CONFIG.orientation);
  readonly customWidthPt = signal<number>(DEFAULT_RESIZE_CONFIG.customWidthPt ?? 595.28);
  readonly customHeightPt = signal<number>(DEFAULT_RESIZE_CONFIG.customHeightPt ?? 841.89);
  readonly scaleMode = signal<ResizeScaleMode>(DEFAULT_RESIZE_CONFIG.scaleMode);
  readonly gutterMarginPt = signal<number>(DEFAULT_RESIZE_CONFIG.gutterMarginPt);

  // N-Up & Booklet signals
  readonly pagesPerSheet = signal<2 | 4 | 6>(DEFAULT_NUP_CONFIG.pagesPerSheet);
  readonly nupPaper = signal<'a4' | 'letter'>(DEFAULT_NUP_CONFIG.targetPaper);
  readonly sheetOrientation = signal<PaperOrientation>(DEFAULT_NUP_CONFIG.sheetOrientation);
  readonly outerMarginPt = signal<number>(DEFAULT_NUP_CONFIG.outerMarginPt);
  readonly cellGapPt = signal<number>(DEFAULT_NUP_CONFIG.cellGapPt);
  readonly drawCutGuides = signal<boolean>(DEFAULT_NUP_CONFIG.drawCutGuides);
  readonly readingDirection = signal<'ltr' | 'rtl'>(DEFAULT_NUP_CONFIG.readingDirection);

  // Processing & status signals
  readonly isProcessing = signal<boolean>(false);
  readonly progressPercent = signal<number>(0);
  readonly progressStage = signal<string>('');
  readonly errorMessage = signal<string | null>(null);
  readonly largeFileWarning = signal<boolean>(false);
  readonly lastResult = signal<PdfCropperBookletResult | null>(null);

  private activeWorker: Worker | null = null;
  private pdfProxy: PdfJsDocProxyLike | null = null;
  private pageVisualSizes: Array<{ width: number; height: number; rotation: number }> = [];
  private createdObjectUrls = new Set<string>();
  private dragState: {
    active: boolean;
    handle: keyof MarginInsetsPt;
    startClientX: number;
    startClientY: number;
    startInsetPt: number;
    scaleX: number;
    scaleY: number;
  } | null = null;

  readonly formattedInputSize = computed(() => formatFileSize(this.pdfSizeBytes()));

  readonly formattedOutputSize = computed(() => {
    const res = this.lastResult();
    return res?.success ? formatFileSize(res.fileSize) : '';
  });

  readonly displayInsets = computed<MarginInsetsPt>(() => {
    const u = this.unit();
    return {
      top: ptToUnit(this.insetTopPt(), u),
      right: ptToUnit(this.insetRightPt(), u),
      bottom: ptToUnit(this.insetBottomPt(), u),
      left: ptToUnit(this.insetLeftPt(), u),
    };
  });

  readonly cropOverlayPercent = computed(() => {
    const w = Math.max(1, this.currentPageWidthPt());
    const h = Math.max(1, this.currentPageHeightPt());
    const leftPct = Math.min(95, Math.max(0, (this.insetLeftPt() / w) * 100));
    const rightPct = Math.min(95, Math.max(0, (this.insetRightPt() / w) * 100));
    const topPct = Math.min(95, Math.max(0, (this.insetTopPt() / h) * 100));
    const bottomPct = Math.min(95, Math.max(0, (this.insetBottomPt() / h) * 100));
    return { topPct, rightPct, bottomPct, leftPct };
  });

  readonly hasInvalidCropInsets = computed<boolean>(() => {
    if (this.mode() !== 'crop') return false;
    const remW =
      this.currentPageWidthPt() - this.insetLeftPt() - this.insetRightPt();
    const remH =
      this.currentPageHeightPt() - this.insetTopPt() - this.insetBottomPt();
    return (
      this.insetTopPt() < 0 ||
      this.insetRightPt() < 0 ||
      this.insetBottomPt() < 0 ||
      this.insetLeftPt() < 0 ||
      remW < 10 ||
      remH < 10
    );
  });

  readonly bookletPreviewMap = computed<ImpositionSheetEntry[]>(() =>
    computeBookletImposition(this.pageCount(), this.readingDirection())
  );

  readonly nupPreviewMap = computed<ImpositionSheetEntry[]>(() =>
    computeNupImposition(
      this.pageCount(),
      this.pagesPerSheet(),
      this.readingDirection()
    )
  );

  readonly currentOptions = computed<PdfCropperBookletOptions>(() => ({
    mode: this.mode(),
    crop: {
      insetsPt: {
        top: this.insetTopPt(),
        right: this.insetRightPt(),
        bottom: this.insetBottomPt(),
        left: this.insetLeftPt(),
      },
      scope: this.cropScope(),
      currentPage: this.currentPage(),
      pageRange: this.pageRange(),
      autoTrimPaddingPt: this.autoTrimPaddingPt(),
      whiteThreshold: this.whiteThreshold(),
    },
    resize: {
      targetPaper: this.targetPaper(),
      orientation: this.resizeOrientation(),
      customWidthPt: this.customWidthPt(),
      customHeightPt: this.customHeightPt(),
      scaleMode: this.scaleMode(),
      gutterMarginPt: this.gutterMarginPt(),
    },
    nup: {
      pagesPerSheet: this.pagesPerSheet(),
      targetPaper: this.nupPaper(),
      sheetOrientation: this.sheetOrientation(),
      outerMarginPt: this.outerMarginPt(),
      cellGapPt: this.cellGapPt(),
      drawCutGuides: this.drawCutGuides(),
      readingDirection: this.readingDirection(),
    },
  }));

  readonly canProcess = computed<boolean>(() => {
    if (!this.pdfBytes() || this.isProcessing()) return false;
    if (this.mode() === 'crop' && this.hasInvalidCropInsets()) return false;
    if (
      this.mode() === 'resize' &&
      this.targetPaper() === 'custom' &&
      (this.customWidthPt() < 20 || this.customHeightPt() < 20)
    ) {
      return false;
    }
    return true;
  });

  ngOnDestroy(): void {
    this.terminateWorker();
    this.destroyPdfProxy();
    this.revokeAllObjectUrls();
    this.pdfBytes.set(null);
    this.lastResult.set(null);
  }

  setMode(nextMode: CropBookletMode): void {
    this.mode.set(nextMode);
    this.errorMessage.set(null);
    this.lastResult.set(null);
  }

  setUnit(nextUnit: MeasurementUnit): void {
    this.unit.set(nextUnit);
  }

  setPagesPerSheet(count: number | string): void {
    const n = Number(count);
    if (n === 2 || n === 4 || n === 6) {
      this.pagesPerSheet.set(n);
    }
  }

  setInsetFromDisplay(side: keyof MarginInsetsPt, value: number | string): void {
    const num = Math.max(0, Number(value) || 0);
    const pt = Number(unitToPt(num, this.unit()).toFixed(3));
    this.assignInsetPt(side, pt);
  }

  nudgeCropInset(side: keyof MarginInsetsPt, deltaPt: number): void {
    const current = this.readInsetPt(side);
    this.assignInsetPt(side, Math.max(0, Number((current + deltaPt).toFixed(2))));
  }

  clearCropInsets(): void {
    this.insetTopPt.set(0);
    this.insetRightPt.set(0);
    this.insetBottomPt.set(0);
    this.insetLeftPt.set(0);
  }

  onHandlePointerDown(side: keyof MarginInsetsPt, event: PointerEvent): void {
    const canvas = this.previewCanvasRef?.nativeElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const target = event.currentTarget as HTMLElement | null;
    if (target && typeof target.setPointerCapture === 'function') {
      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        // Ignore in synthetic environments
      }
    }

    this.dragState = {
      active: true,
      handle: side,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startInsetPt: this.readInsetPt(side),
      scaleX: this.currentPageWidthPt() / rect.width,
      scaleY: this.currentPageHeightPt() / rect.height,
    };
  }

  onHandlePointerMove(event: PointerEvent): void {
    if (!this.dragState?.active) return;
    const dx = event.clientX - this.dragState.startClientX;
    const dy = event.clientY - this.dragState.startClientY;

    let deltaPt = 0;
    if (this.dragState.handle === 'left') deltaPt = dx * this.dragState.scaleX;
    else if (this.dragState.handle === 'right') deltaPt = -dx * this.dragState.scaleX;
    else if (this.dragState.handle === 'top') deltaPt = dy * this.dragState.scaleY;
    else if (this.dragState.handle === 'bottom') deltaPt = -dy * this.dragState.scaleY;

    const maxInset =
      this.dragState.handle === 'left' || this.dragState.handle === 'right'
        ? this.currentPageWidthPt() - 12
        : this.currentPageHeightPt() - 12;

    const next = Math.min(
      Math.max(0, maxInset),
      Math.max(0, Number((this.dragState.startInsetPt + deltaPt).toFixed(1)))
    );
    this.assignInsetPt(this.dragState.handle, next);
  }

  onHandlePointerUp(): void {
    this.dragState = null;
  }

  onOverlayKeydown(side: keyof MarginInsetsPt, event: KeyboardEvent): void {
    const step = event.shiftKey ? 10 : 1;
    let delta = 0;
    if (
      (side === 'top' && event.key === 'ArrowDown') ||
      (side === 'bottom' && event.key === 'ArrowUp') ||
      (side === 'left' && event.key === 'ArrowRight') ||
      (side === 'right' && event.key === 'ArrowLeft')
    ) {
      delta = step;
    } else if (
      (side === 'top' && event.key === 'ArrowUp') ||
      (side === 'bottom' && event.key === 'ArrowDown') ||
      (side === 'left' && event.key === 'ArrowLeft') ||
      (side === 'right' && event.key === 'ArrowRight')
    ) {
      delta = -step;
    }
    if (delta !== 0) {
      event.preventDefault();
      this.nudgeCropInset(side, delta);
    }
  }

  async selectPreviewPage(pageNum: number): Promise<void> {
    const clamped = Math.min(Math.max(1, pageNum), Math.max(1, this.pageCount()));
    this.currentPage.set(clamped);
    this.syncCurrentPageDimensions(clamped);
    await this.renderCurrentPagePreview();
  }

  async onFileDropped(files: File[]): Promise<void> {
    if (!files || files.length === 0) return;
    const file = files[0];
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      this.errorMessage.set('Please select a valid .pdf document.');
      return;
    }

    this.errorMessage.set(null);
    this.lastResult.set(null);
    this.largeFileWarning.set(file.size > LARGE_FILE_THRESHOLD_BYTES);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const doc = await PDFDocument.load(new Uint8Array(bytes), {
        updateMetadata: false,
      });
      const count = doc.getPageCount();
      if (count <= 0) {
        this.errorMessage.set('PDF contains zero pages.');
        return;
      }

      this.pageVisualSizes = doc.getPages().map((p) => {
        const box = p.getCropBox();
        const rot = normalizeRotationDeg(p.getRotation().angle);
        const swap = rot === 90 || rot === 270;
        return {
          width: swap ? box.height : box.width,
          height: swap ? box.width : box.height,
          rotation: rot,
        };
      });

      this.pdfBytes.set(bytes);
      this.pdfFileName.set(file.name);
      this.pdfSizeBytes.set(file.size || bytes.byteLength);
      this.pageCount.set(count);
      this.currentPage.set(1);
      this.syncCurrentPageDimensions(1);

      this.destroyPdfProxy();
      await this.renderCurrentPagePreview();
    } catch (err: unknown) {
      this.pdfBytes.set(null);
      this.pageCount.set(0);
      this.pageVisualSizes = [];
      this.errorMessage.set(
        err instanceof Error
          ? err.message
          : 'Unable to open PDF. It may be corrupted or encrypted.'
      );
    }
  }

  async loadSamplePdf(): Promise<void> {
    const bytes = await createSyntheticPdf(6, { width: 595, height: 842 });
    const sample = new File([bytes.buffer as ArrayBuffer], 'sample-manuscript.pdf', {
      type: 'application/pdf',
    });
    await this.onFileDropped([sample]);
  }

  async autoTrimWhitespace(): Promise<void> {
    const bytes = this.pdfBytes();
    if (!bytes) return;
    this.isScanningWhitespace.set(true);
    this.errorMessage.set(null);

    try {
      const offscreen = document.createElement('canvas');
      const ctx = offscreen.getContext('2d');
      if (!ctx) {
        this.errorMessage.set('Canvas 2D context is unavailable for whitespace scan.');
        return;
      }

      if (!this.pdfProxy?.getPage) {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        this.pdfProxy = await pdfjsLib
          .getDocument({ data: new Uint8Array(bytes) })
          .promise;
      }

      const page = await this.pdfProxy!.getPage!(this.currentPage());
      const viewport = page.getViewport({ scale: 1.0 });
      offscreen.width = Math.max(1, Math.round(viewport.width));
      offscreen.height = Math.max(1, Math.round(viewport.height));

      await page.render({ canvasContext: ctx, viewport, canvas: offscreen }).promise;
      const imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
      const scan = detectWhitespaceMarginsFromRgba(
        imgData.data,
        offscreen.width,
        offscreen.height,
        {
          paddingPt: this.autoTrimPaddingPt(),
          whiteThreshold: this.whiteThreshold(),
          scale: 1.0,
        }
      );

      offscreen.width = 0;
      offscreen.height = 0;

      if (scan.isBlank) {
        this.errorMessage.set('Selected page appears blank; keeping current margins.');
        return;
      }

      this.insetTopPt.set(scan.insetsPt.top);
      this.insetRightPt.set(scan.insetsPt.right);
      this.insetBottomPt.set(scan.insetsPt.bottom);
      this.insetLeftPt.set(scan.insetsPt.left);
    } catch (err: unknown) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Auto-trim scan failed.'
      );
    } finally {
      this.isScanningWhitespace.set(false);
    }
  }

  async processDocument(): Promise<void> {
    const bytes = this.pdfBytes();
    if (!bytes || !this.canProcess()) return;

    this.isProcessing.set(true);
    this.progressPercent.set(5);
    this.progressStage.set('Starting local PDF transformation');
    this.errorMessage.set(null);
    this.lastResult.set(null);

    try {
      const result = await this.runWorkerProcess({
        type: 'process',
        pdfBytes: bytes,
        fileName: this.pdfFileName(),
        options: this.currentOptions(),
      });
      this.lastResult.set(result);
      if (!result.success) {
        this.errorMessage.set(result.error || 'PDF transformation failed.');
      }
    } catch (err: unknown) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'PDF processing failed.'
      );
    } finally {
      this.isProcessing.set(false);
    }
  }

  downloadResult(): void {
    const res = this.lastResult();
    if (!res?.success || !res.blob) return;

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
    this.terminateWorker();
    this.destroyPdfProxy();
    this.revokeAllObjectUrls();

    this.pdfBytes.set(null);
    this.pdfFileName.set('document.pdf');
    this.pdfSizeBytes.set(0);
    this.pageCount.set(0);
    this.currentPage.set(1);
    this.currentPageWidthPt.set(595);
    this.currentPageHeightPt.set(842);
    this.currentPageRotation.set(0);
    this.pageVisualSizes = [];
    this.previewAvailable.set(false);

    this.unit.set('pt');
    this.clearCropInsets();
    this.cropScope.set(DEFAULT_CROP_CONFIG.scope);
    this.pageRange.set(DEFAULT_CROP_CONFIG.pageRange);
    this.autoTrimPaddingPt.set(DEFAULT_CROP_CONFIG.autoTrimPaddingPt);

    this.targetPaper.set(DEFAULT_RESIZE_CONFIG.targetPaper);
    this.resizeOrientation.set(DEFAULT_RESIZE_CONFIG.orientation);
    this.scaleMode.set(DEFAULT_RESIZE_CONFIG.scaleMode);
    this.gutterMarginPt.set(DEFAULT_RESIZE_CONFIG.gutterMarginPt);

    this.pagesPerSheet.set(DEFAULT_NUP_CONFIG.pagesPerSheet);
    this.nupPaper.set(DEFAULT_NUP_CONFIG.targetPaper);
    this.sheetOrientation.set(DEFAULT_NUP_CONFIG.sheetOrientation);
    this.drawCutGuides.set(DEFAULT_NUP_CONFIG.drawCutGuides);
    this.readingDirection.set(DEFAULT_NUP_CONFIG.readingDirection);

    this.isProcessing.set(false);
    this.progressPercent.set(0);
    this.progressStage.set('');
    this.errorMessage.set(null);
    this.largeFileWarning.set(false);
    this.lastResult.set(null);
  }

  private readInsetPt(side: keyof MarginInsetsPt): number {
    if (side === 'top') return this.insetTopPt();
    if (side === 'right') return this.insetRightPt();
    if (side === 'bottom') return this.insetBottomPt();
    return this.insetLeftPt();
  }

  private assignInsetPt(side: keyof MarginInsetsPt, valuePt: number): void {
    if (side === 'top') this.insetTopPt.set(valuePt);
    else if (side === 'right') this.insetRightPt.set(valuePt);
    else if (side === 'bottom') this.insetBottomPt.set(valuePt);
    else this.insetLeftPt.set(valuePt);
  }

  private syncCurrentPageDimensions(pageNum: number): void {
    const info = this.pageVisualSizes[pageNum - 1];
    if (!info) return;
    this.currentPageWidthPt.set(info.width);
    this.currentPageHeightPt.set(info.height);
    this.currentPageRotation.set(info.rotation);
  }

  private async renderCurrentPagePreview(): Promise<void> {
    const bytes = this.pdfBytes();
    const canvas = this.previewCanvasRef?.nativeElement;
    if (!bytes || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      if (!this.pdfProxy?.getPage) {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        this.pdfProxy = await pdfjsLib
          .getDocument({ data: new Uint8Array(bytes) })
          .promise;
      }

      const page = await this.pdfProxy!.getPage!(this.currentPage());
      const unscaled = page.getViewport({ scale: 1 });
      const scale = Math.min(1.5, 420 / Math.max(1, unscaled.width));
      const viewport = page.getViewport({ scale });
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));

      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      this.previewAvailable.set(true);
    } catch {
      this.previewAvailable.set(false);
    }
  }

  private async runWorkerProcess(
    request: PdfCropperWorkerRequest
  ): Promise<PdfCropperBookletResult> {
    if (typeof Worker !== 'undefined') {
      try {
        return await new Promise<PdfCropperBookletResult>((resolve, reject) => {
          try {
            const worker = new Worker(new URL('./worker', import.meta.url), {
              type: 'module',
            });
            this.activeWorker = worker;

            worker.onmessage = (
              event: MessageEvent<PdfCropperWorkerResponse>
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
      } catch {
        // Fallback when Worker runtime is unavailable (e.g. jsdom unit tests)
      }
    }

    return processPdfCropperBooklet(
      request.pdfBytes,
      request.fileName,
      request.options,
      {
        onProgress: (percent, stage) => {
          this.progressPercent.set(percent);
          this.progressStage.set(stage);
        },
      }
    );
  }

  private terminateWorker(): void {
    if (this.activeWorker) {
      this.activeWorker.terminate();
      this.activeWorker = null;
    }
  }

  private destroyPdfProxy(): void {
    if (this.pdfProxy?.destroy) {
      void this.pdfProxy.destroy();
    }
    this.pdfProxy = null;
  }

  private revokeAllObjectUrls(): void {
    for (const url of this.createdObjectUrls) {
      URL.revokeObjectURL(url);
    }
    this.createdObjectUrls.clear();
  }
}
