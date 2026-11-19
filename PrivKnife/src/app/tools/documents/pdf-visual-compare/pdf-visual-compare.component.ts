import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Card, Dropzone, ProgressBar } from '../../../components';
import { TranslatePipe } from '../../../core/i18n';
import {
  buildHtmlDiffReport,
  buildPdfDiffReport,
  compareExtractedDocuments,
  extractPagesWithPdfJs,
} from './engine';
import {
  createContractPdfPair,
  DEFAULT_COMPARE_OPTIONS,
} from './test-fixtures';
import {
  CompareViewMode,
  ExtractedPageData,
  OverlayRenderStyle,
  PageDiffDetail,
  PdfCompareOptions,
  PdfCompareWorkerRequest,
  PdfCompareWorkerResponse,
  PdfVisualCompareResult,
} from './types';

const LARGE_FILE_THRESHOLD_BYTES = 100 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

@Component({
  selector: 'app-pdf-visual-compare',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, Dropzone, ProgressBar, TranslatePipe],
  templateUrl: './pdf-visual-compare.component.html',
  styleUrl: './pdf-visual-compare.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfVisualCompareComponent implements OnDestroy {
  @ViewChild('overlayCanvas') overlayCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('sideACanvas') sideACanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('sideBCanvas') sideBCanvasRef?: ElementRef<HTMLCanvasElement>;

  readonly pdfBytesA = signal<Uint8Array | null>(null);
  readonly fileNameA = signal<string>('original.pdf');
  readonly fileSizeA = signal<number>(0);

  readonly pdfBytesB = signal<Uint8Array | null>(null);
  readonly fileNameB = signal<string>('revised.pdf');
  readonly fileSizeB = signal<number>(0);

  readonly viewMode = signal<CompareViewMode>(DEFAULT_COMPARE_OPTIONS.viewMode);
  readonly overlayStyle = signal<OverlayRenderStyle>(
    DEFAULT_COMPARE_OPTIONS.overlayStyle
  );
  readonly pixelSensitivity = signal<number>(
    DEFAULT_COMPARE_OPTIONS.pixelSensitivity
  );
  readonly ignoreWhitespace = signal<boolean>(
    DEFAULT_COMPARE_OPTIONS.ignoreWhitespace
  );
  readonly ignoreCase = signal<boolean>(DEFAULT_COMPARE_OPTIONS.ignoreCase);
  readonly pageOffsetB = signal<number>(DEFAULT_COMPARE_OPTIONS.pageOffsetB);
  readonly showChangedOnly = signal<boolean>(
    DEFAULT_COMPARE_OPTIONS.showChangedOnly
  );
  readonly curtainSplitPct = signal<number>(50);
  readonly activePairIndex = signal<number>(1);

  readonly isProcessing = signal<boolean>(false);
  readonly progressPercent = signal<number>(0);
  readonly progressStage = signal<string>('');
  readonly errorMessage = signal<string | null>(null);
  readonly largeFileWarning = signal<boolean>(false);
  readonly compareResult = signal<PdfVisualCompareResult | null>(null);

  private activeWorker: Worker | null = null;
  private extractedA: ExtractedPageData[] = [];
  private extractedB: ExtractedPageData[] = [];
  private createdObjectUrls = new Set<string>();

  readonly formattedSizeA = computed(() => formatFileSize(this.fileSizeA()));
  readonly formattedSizeB = computed(() => formatFileSize(this.fileSizeB()));

  readonly currentOptions = computed<PdfCompareOptions>(() => ({
    viewMode: this.viewMode(),
    overlayStyle: this.overlayStyle(),
    renderScale: 1.0,
    pixelSensitivity: this.pixelSensitivity(),
    ignoreWhitespace: this.ignoreWhitespace(),
    ignoreCase: this.ignoreCase(),
    pageOffsetB: this.pageOffsetB(),
    showChangedOnly: this.showChangedOnly(),
  }));

  readonly visibleSummaries = computed<PageDiffDetail[]>(() => {
    const res = this.compareResult();
    if (!res?.summaries) return [];
    if (!this.showChangedOnly()) return res.summaries;
    return res.summaries.filter(
      (s) => s.hasVisualDiff || s.hasTextDiff || s.dimensionMismatch
    );
  });

  readonly activeSummary = computed<PageDiffDetail | null>(() => {
    const res = this.compareResult();
    if (!res?.summaries?.length) return null;
    const idx = this.activePairIndex();
    return (
      res.summaries.find((s) => s.pairIndex === idx) ?? res.summaries[0] ?? null
    );
  });

  readonly canCompare = computed<boolean>(
    () =>
      Boolean(this.pdfBytesA()) &&
      Boolean(this.pdfBytesB()) &&
      !this.isProcessing()
  );

  ngOnDestroy(): void {
    this.terminateWorker();
    this.revokeAllObjectUrls();
    this.clearMemory();
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent): void {
    if (!event.altKey) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.jumpToNextChangedPage();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.jumpToPrevChangedPage();
    }
  }

  setViewMode(nextMode: CompareViewMode): void {
    this.viewMode.set(nextMode);
    setTimeout(() => this.paintActivePairCanvases(), 0);
  }

  async onFileADropped(files: File[]): Promise<void> {
    await this.handleFileDrop(files, 'A');
  }

  async onFileBDropped(files: File[]): Promise<void> {
    await this.handleFileDrop(files, 'B');
  }

  async loadSampleContractPair(): Promise<void> {
    const { pdfA, pdfB } = await createContractPdfPair();
    await this.onFileADropped([
      new File([pdfA.buffer as ArrayBuffer], 'master-agreement-v1.pdf', {
        type: 'application/pdf',
      }),
    ]);
    await this.onFileBDropped([
      new File([pdfB.buffer as ArrayBuffer], 'master-agreement-v2.pdf', {
        type: 'application/pdf',
      }),
    ]);
  }

  selectPair(pairIndex: number): void {
    this.activePairIndex.set(pairIndex);
    setTimeout(() => this.paintActivePairCanvases(), 0);
  }

  jumpToNextChangedPage(): void {
    const res = this.compareResult();
    if (!res?.summaries?.length) return;
    const changed = res.summaries.filter(
      (s) => s.hasVisualDiff || s.hasTextDiff || s.dimensionMismatch
    );
    if (changed.length === 0) return;

    const current = this.activePairIndex();
    const next = changed.find((s) => s.pairIndex > current) ?? changed[0];
    this.selectPair(next.pairIndex);
  }

  jumpToPrevChangedPage(): void {
    const res = this.compareResult();
    if (!res?.summaries?.length) return;
    const changed = res.summaries.filter(
      (s) => s.hasVisualDiff || s.hasTextDiff || s.dimensionMismatch
    );
    if (changed.length === 0) return;

    const current = this.activePairIndex();
    const prevCandidates = changed.filter((s) => s.pairIndex < current);
    const prev =
      prevCandidates.length > 0
        ? prevCandidates[prevCandidates.length - 1]
        : changed[changed.length - 1];
    this.selectPair(prev.pairIndex);
  }

  async compareDocuments(): Promise<void> {
    const bytesA = this.pdfBytesA();
    const bytesB = this.pdfBytesB();
    if (!bytesA || !bytesB || this.isProcessing()) return;

    this.isProcessing.set(true);
    this.progressPercent.set(5);
    this.progressStage.set('Extracting PDF pages locally');
    this.errorMessage.set(null);

    try {
      this.extractedA = await extractPagesWithPdfJs(bytesA);
      this.progressPercent.set(20);
      this.progressStage.set('Extracted Original (A)');

      this.extractedB = await extractPagesWithPdfJs(bytesB);
      this.progressPercent.set(35);
      this.progressStage.set('Running YIQ Pixel & Text Diff');

      const result = await this.runWorkerCompare({
        type: 'compare_frames',
        fileNameA: this.fileNameA(),
        fileNameB: this.fileNameB(),
        pagesA: this.extractedA,
        pagesB: this.extractedB,
        options: this.currentOptions(),
      });

      this.compareResult.set(result);
      if (!result.success) {
        this.errorMessage.set(result.error || 'PDF comparison failed.');
      } else {
        this.activePairIndex.set(1);
        setTimeout(() => this.paintActivePairCanvases(), 0);
      }
    } catch (err: unknown) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Unable to compare PDFs.'
      );
    } finally {
      this.isProcessing.set(false);
    }
  }

  downloadHtmlReport(): void {
    const res = this.compareResult();
    if (!res?.success) return;
    const html = buildHtmlDiffReport(res);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    this.triggerBlobDownload(blob, 'privknife-pdf-diff-report.html');
  }

  async downloadPdfReport(): Promise<void> {
    const res = this.compareResult();
    if (!res?.success) return;
    const rep = await buildPdfDiffReport(res, this.showChangedOnly());
    if (rep.success && rep.blob) {
      this.triggerBlobDownload(rep.blob, rep.fileName);
    } else if (rep.error) {
      this.errorMessage.set(rep.error);
    }
  }

  reset(): void {
    this.terminateWorker();
    this.revokeAllObjectUrls();
    this.clearMemory();

    this.viewMode.set(DEFAULT_COMPARE_OPTIONS.viewMode);
    this.overlayStyle.set(DEFAULT_COMPARE_OPTIONS.overlayStyle);
    this.pixelSensitivity.set(DEFAULT_COMPARE_OPTIONS.pixelSensitivity);
    this.ignoreWhitespace.set(DEFAULT_COMPARE_OPTIONS.ignoreWhitespace);
    this.ignoreCase.set(DEFAULT_COMPARE_OPTIONS.ignoreCase);
    this.pageOffsetB.set(0);
    this.showChangedOnly.set(false);
    this.curtainSplitPct.set(50);
  }

  private async handleFileDrop(files: File[], slot: 'A' | 'B'): Promise<void> {
    if (!files || files.length === 0) return;
    const file = files[0];
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      this.errorMessage.set('Please select a valid .pdf file.');
      return;
    }

    this.errorMessage.set(null);
    this.compareResult.set(null);
    if (file.size > LARGE_FILE_THRESHOLD_BYTES) {
      this.largeFileWarning.set(true);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (slot === 'A') {
      this.pdfBytesA.set(bytes);
      this.fileNameA.set(file.name);
      this.fileSizeA.set(file.size || bytes.byteLength);
      this.extractedA = [];
    } else {
      this.pdfBytesB.set(bytes);
      this.fileNameB.set(file.name);
      this.fileSizeB.set(file.size || bytes.byteLength);
      this.extractedB = [];
    }
  }

  private paintActivePairCanvases(): void {
    const summary = this.activeSummary();
    if (!summary) return;

    const frameOverlay = summary.overlayFrame;
    const overlayCanvas = this.overlayCanvasRef?.nativeElement;
    if (overlayCanvas && frameOverlay) {
      const ctx = overlayCanvas.getContext('2d');
      if (ctx) {
        overlayCanvas.width = frameOverlay.width;
        overlayCanvas.height = frameOverlay.height;
        const imgData = new ImageData(
          new Uint8ClampedArray(frameOverlay.data),
          frameOverlay.width,
          frameOverlay.height
        );
        ctx.putImageData(imgData, 0, 0);
      }
    }

    const pageDataA = summary.pageA
      ? this.extractedA.find((p) => p.pageNumber === summary.pageA)
      : undefined;
    const pageDataB = summary.pageB
      ? this.extractedB.find((p) => p.pageNumber === summary.pageB)
      : undefined;

    const canvasA = this.sideACanvasRef?.nativeElement;
    if (canvasA && pageDataA?.frame) {
      const ctx = canvasA.getContext('2d');
      if (ctx) {
        canvasA.width = pageDataA.frame.width;
        canvasA.height = pageDataA.frame.height;
        ctx.putImageData(
          new ImageData(
            new Uint8ClampedArray(pageDataA.frame.data),
            pageDataA.frame.width,
            pageDataA.frame.height
          ),
          0,
          0
        );
      }
    }

    const canvasB = this.sideBCanvasRef?.nativeElement;
    if (canvasB && pageDataB?.frame) {
      const ctx = canvasB.getContext('2d');
      if (ctx) {
        canvasB.width = pageDataB.frame.width;
        canvasB.height = pageDataB.frame.height;
        ctx.putImageData(
          new ImageData(
            new Uint8ClampedArray(pageDataB.frame.data),
            pageDataB.frame.width,
            pageDataB.frame.height
          ),
          0,
          0
        );
      }
    }
  }

  private async runWorkerCompare(
    request: Extract<PdfCompareWorkerRequest, { type: 'compare_frames' }>
  ): Promise<PdfVisualCompareResult> {
    if (typeof Worker !== 'undefined') {
      try {
        return await new Promise<PdfVisualCompareResult>((resolve, reject) => {
          try {
            const worker = new Worker(new URL('./worker', import.meta.url), {
              type: 'module',
            });
            this.activeWorker = worker;

            worker.onmessage = (
              event: MessageEvent<PdfCompareWorkerResponse>
            ) => {
              const msg = event.data;
              if (msg.type === 'progress') {
                this.progressPercent.set(msg.percent);
                this.progressStage.set(msg.stage);
                return;
              }
              if (msg.type === 'done') {
                this.terminateWorker();
                resolve(msg.result);
              }
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
        // Fallback when Worker runtime is unavailable
      }
    }

    return compareExtractedDocuments(
      request.fileNameA,
      request.fileNameB,
      request.pagesA,
      request.pagesB,
      request.options,
      (percent, stage) => {
        this.progressPercent.set(percent);
        this.progressStage.set(stage);
      }
    );
  }

  private triggerBlobDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    this.createdObjectUrls.add(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(url);
      this.createdObjectUrls.delete(url);
    }, 150);
  }

  private clearMemory(): void {
    this.pdfBytesA.set(null);
    this.fileNameA.set('original.pdf');
    this.fileSizeA.set(0);
    this.pdfBytesB.set(null);
    this.fileNameB.set('revised.pdf');
    this.fileSizeB.set(0);
    this.extractedA = [];
    this.extractedB = [];
    this.compareResult.set(null);
    this.activePairIndex.set(1);
    this.isProcessing.set(false);
    this.progressPercent.set(0);
    this.progressStage.set('');
    this.errorMessage.set(null);
    this.largeFileWarning.set(false);
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
