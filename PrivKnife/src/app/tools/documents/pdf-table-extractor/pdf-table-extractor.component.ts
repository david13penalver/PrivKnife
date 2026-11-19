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
import { RouterLink } from '@angular/router';
import { Card, Dropzone, ProgressBar } from '../../../components';
import { TranslatePipe } from '../../../core/i18n';
import {
  exportTablesToCsv,
  exportTablesToJson,
  exportTablesToTsv,
  exportTablesToXlsx,
  extractTablesFromTokens,
  extractTextTokensWithPdfJs,
} from './engine';
import {
  createTwoPageLedgerPdf,
  DEFAULT_TABLE_EXTRACTOR_OPTIONS,
} from './test-fixtures';
import {
  ExportFormat,
  ExtractedTable,
  PdfTableExtractorOptions,
  PdfTableExtractorResult,
  PdfTableWorkerRequest,
  PdfTableWorkerResponse,
  PdfTextToken,
  TableExportArtifact,
} from './types';

const LARGE_FILE_THRESHOLD_BYTES = 100 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

type PdfJsDocProxyLike = {
  destroy?: () => Promise<void> | void;
  getPage?: (n: number) => Promise<any>;
};

@Component({
  selector: 'app-pdf-table-extractor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    Card,
    Dropzone,
    ProgressBar,
    TranslatePipe,
  ],
  templateUrl: './pdf-table-extractor.component.html',
  styleUrl: './pdf-table-extractor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfTableExtractorComponent implements OnDestroy {
  @ViewChild('previewCanvas') previewCanvasRef?: ElementRef<HTMLCanvasElement>;

  readonly pdfBytes = signal<Uint8Array | null>(null);
  readonly pdfFileName = signal<string>('document.pdf');
  readonly pdfSizeBytes = signal<number>(0);
  readonly pageCount = signal<number>(0);
  readonly currentPage = signal<number>(1);
  readonly currentPageWidthPt = signal<number>(595);
  readonly previewAvailable = signal<boolean>(false);

  // Extraction configuration signals
  readonly pageRange = signal<string>(DEFAULT_TABLE_EXTRACTOR_OPTIONS.pageRange);
  readonly minColumnGapPt = signal<number>(
    DEFAULT_TABLE_EXTRACTOR_OPTIONS.minColumnGapPt
  );
  readonly manualSplits = signal<number[] | undefined>(undefined);
  readonly firstRowAsHeader = signal<boolean>(
    DEFAULT_TABLE_EXTRACTOR_OPTIONS.firstRowAsHeader
  );
  readonly mergeAllPages = signal<boolean>(
    DEFAULT_TABLE_EXTRACTOR_OPTIONS.mergeAllPages
  );
  readonly stripRepeatedHeaders = signal<boolean>(
    DEFAULT_TABLE_EXTRACTOR_OPTIONS.stripRepeatedHeaders
  );
  readonly detectNumericTypes = signal<boolean>(
    DEFAULT_TABLE_EXTRACTOR_OPTIONS.detectNumericTypes
  );
  readonly decimalSeparator = signal<'.' | ','>(
    DEFAULT_TABLE_EXTRACTOR_OPTIONS.decimalSeparator
  );
  readonly sanitizeCsvFormulas = signal<boolean>(
    DEFAULT_TABLE_EXTRACTOR_OPTIONS.sanitizeCsvFormulas
  );

  // Results & UI status
  readonly tables = signal<ExtractedTable[]>([]);
  readonly totalRows = signal<number>(0);
  readonly isScannedFallbackNeeded = signal<boolean>(false);
  readonly isProcessing = signal<boolean>(false);
  readonly progressPercent = signal<number>(0);
  readonly progressStage = signal<string>('');
  readonly errorMessage = signal<string | null>(null);
  readonly largeFileWarning = signal<boolean>(false);
  readonly copiedTsv = signal<boolean>(false);

  private cachedTokens: PdfTextToken[] = [];
  private pageSizes: Array<{ width: number; height: number }> = [];
  private activeWorker: Worker | null = null;
  private pdfProxy: PdfJsDocProxyLike | null = null;
  private createdObjectUrls = new Set<string>();

  readonly formattedInputSize = computed(() => formatFileSize(this.pdfSizeBytes()));

  readonly activeColumnSplits = computed<number[]>(
    () => this.manualSplits() ?? this.tables()[0]?.columnSplitsX ?? []
  );

  readonly splitGuidePercents = computed<number[]>(() => {
    const w = Math.max(1, this.currentPageWidthPt());
    return this.activeColumnSplits().map((x) =>
      Math.min(99, Math.max(1, Number(((x / w) * 100).toFixed(2))))
    );
  });

  readonly currentOptions = computed<PdfTableExtractorOptions>(() => ({
    pageRange: this.pageRange(),
    rowToleranceFactor: DEFAULT_TABLE_EXTRACTOR_OPTIONS.rowToleranceFactor,
    minColumnGapPt: this.minColumnGapPt(),
    manualColumnSplitsX: this.manualSplits(),
    firstRowAsHeader: this.firstRowAsHeader(),
    mergeAllPages: this.mergeAllPages(),
    stripRepeatedHeaders: this.stripRepeatedHeaders(),
    detectNumericTypes: this.detectNumericTypes(),
    decimalSeparator: this.decimalSeparator(),
    sanitizeCsvFormulas: this.sanitizeCsvFormulas(),
  }));

  ngOnDestroy(): void {
    this.terminateWorker();
    this.destroyPdfProxy();
    this.revokeAllObjectUrls();
    this.clearMemoryState();
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
    this.copiedTsv.set(false);
    this.largeFileWarning.set(file.size > LARGE_FILE_THRESHOLD_BYTES);
    this.isProcessing.set(true);
    this.progressPercent.set(10);
    this.progressStage.set('Extracting PDF text coordinates');

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const extracted = await extractTextTokensWithPdfJs(bytes);
      this.cachedTokens = extracted.tokens;
      this.pageSizes = extracted.pageSizes;
      this.pdfBytes.set(bytes);
      this.pdfFileName.set(file.name);
      this.pdfSizeBytes.set(file.size || bytes.byteLength);
      this.pageCount.set(extracted.pageCount);
      this.currentPage.set(1);
      this.currentPageWidthPt.set(extracted.pageSizes[0]?.width ?? 595);
      this.manualSplits.set(undefined);

      this.destroyPdfProxy();
      await this.renderPagePreview();
      await this.recluster();
    } catch (err: unknown) {
      this.clearMemoryState();
      this.errorMessage.set(
        err instanceof Error
          ? err.message
          : 'Unable to extract tables from PDF.'
      );
    } finally {
      this.isProcessing.set(false);
    }
  }

  async loadSampleLedgerPdf(): Promise<void> {
    const bytes = await createTwoPageLedgerPdf();
    const sample = new File([bytes.buffer as ArrayBuffer], 'sample-ledger.pdf', {
      type: 'application/pdf',
    });
    await this.onFileDropped([sample]);
  }

  async setMergeAllPages(enabled: boolean): Promise<void> {
    this.mergeAllPages.set(enabled);
    await this.recluster();
  }

  async setStripRepeatedHeaders(enabled: boolean): Promise<void> {
    this.stripRepeatedHeaders.set(enabled);
    await this.recluster();
  }

  async setFirstRowAsHeader(enabled: boolean): Promise<void> {
    this.firstRowAsHeader.set(enabled);
    await this.recluster();
  }

  async setDetectNumericTypes(enabled: boolean): Promise<void> {
    this.detectNumericTypes.set(enabled);
    await this.recluster();
  }

  async setDecimalSeparator(sep: '.' | ','): Promise<void> {
    this.decimalSeparator.set(sep);
    await this.recluster();
  }

  async setSanitizeCsvFormulas(enabled: boolean): Promise<void> {
    this.sanitizeCsvFormulas.set(enabled);
    await this.recluster();
  }

  async setMinColumnGapPt(gap: number): Promise<void> {
    this.minColumnGapPt.set(Math.max(2, Math.min(40, Number(gap) || 10)));
    await this.recluster();
  }

  async addColumnSplit(xPt: number): Promise<void> {
    const rounded = Number(xPt.toFixed(1));
    if (!Number.isFinite(rounded) || rounded <= 0) return;
    const next = Array.from(
      new Set([...this.activeColumnSplits(), rounded])
    ).sort((a, b) => a - b);
    this.manualSplits.set(next);
    await this.recluster();
  }

  async removeColumnSplit(index: number): Promise<void> {
    const next = [...this.activeColumnSplits()];
    if (index < 0 || index >= next.length) return;
    next.splice(index, 1);
    this.manualSplits.set(next);
    await this.recluster();
  }

  async resetAutoSplits(): Promise<void> {
    this.manualSplits.set(undefined);
    await this.recluster();
  }

  async selectPage(pageNum: number): Promise<void> {
    const clamped = Math.min(Math.max(1, pageNum), Math.max(1, this.pageCount()));
    this.currentPage.set(clamped);
    this.currentPageWidthPt.set(this.pageSizes[clamped - 1]?.width ?? 595);
    await this.renderPagePreview();
  }

  onPreviewClick(event: MouseEvent): void {
    const canvas = this.previewCanvasRef?.nativeElement;
    if (!canvas || !this.pdfBytes()) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0) return;
    const xPt = ((event.clientX - rect.left) / rect.width) * this.currentPageWidthPt();
    void this.addColumnSplit(xPt);
  }

  async recluster(): Promise<void> {
    if (!this.pdfBytes()) return;
    const res = await this.runWorkerCluster({
      type: 'cluster',
      tokens: this.cachedTokens,
      pageCount: this.pageCount(),
      options: this.currentOptions(),
    });
    this.tables.set(res.tables);
    this.totalRows.set(res.totalRows);
    this.isScannedFallbackNeeded.set(res.isScannedFallbackNeeded);
    if (!res.success && res.error) {
      this.errorMessage.set(res.error);
    }
  }

  async exportFile(format: ExportFormat): Promise<void> {
    const currentTables = this.tables();
    if (currentTables.length === 0) return;

    const art = await this.runWorkerExport({
      type: 'export',
      tables: currentTables,
      format,
      baseFileName: this.pdfFileName(),
      sanitizeCsvFormulas: this.sanitizeCsvFormulas(),
    });

    if (art.success && art.blob) {
      this.triggerBlobDownload(art.blob, art.fileName);
    } else if (art.error) {
      this.errorMessage.set(art.error);
    }
  }

  async copyTsv(): Promise<void> {
    const tsv = exportTablesToTsv(this.tables());
    if (!tsv) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(tsv);
    }
    this.copiedTsv.set(true);
    setTimeout(() => this.copiedTsv.set(false), 2000);
  }

  reset(): void {
    this.terminateWorker();
    this.destroyPdfProxy();
    this.revokeAllObjectUrls();
    this.clearMemoryState();

    this.pageRange.set(DEFAULT_TABLE_EXTRACTOR_OPTIONS.pageRange);
    this.minColumnGapPt.set(DEFAULT_TABLE_EXTRACTOR_OPTIONS.minColumnGapPt);
    this.manualSplits.set(undefined);
    this.firstRowAsHeader.set(DEFAULT_TABLE_EXTRACTOR_OPTIONS.firstRowAsHeader);
    this.mergeAllPages.set(DEFAULT_TABLE_EXTRACTOR_OPTIONS.mergeAllPages);
    this.stripRepeatedHeaders.set(
      DEFAULT_TABLE_EXTRACTOR_OPTIONS.stripRepeatedHeaders
    );
    this.detectNumericTypes.set(
      DEFAULT_TABLE_EXTRACTOR_OPTIONS.detectNumericTypes
    );
    this.decimalSeparator.set(DEFAULT_TABLE_EXTRACTOR_OPTIONS.decimalSeparator);
    this.sanitizeCsvFormulas.set(
      DEFAULT_TABLE_EXTRACTOR_OPTIONS.sanitizeCsvFormulas
    );
  }

  private clearMemoryState(): void {
    this.cachedTokens = [];
    this.pageSizes = [];
    this.pdfBytes.set(null);
    this.pdfFileName.set('document.pdf');
    this.pdfSizeBytes.set(0);
    this.pageCount.set(0);
    this.currentPage.set(1);
    this.previewAvailable.set(false);
    this.tables.set([]);
    this.totalRows.set(0);
    this.isScannedFallbackNeeded.set(false);
    this.isProcessing.set(false);
    this.progressPercent.set(0);
    this.progressStage.set('');
    this.errorMessage.set(null);
    this.largeFileWarning.set(false);
    this.copiedTsv.set(false);
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

  private async renderPagePreview(): Promise<void> {
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
      const scale = Math.min(1.4, 460 / Math.max(1, unscaled.width));
      const vp = page.getViewport({ scale });
      canvas.width = Math.max(1, Math.round(vp.width));
      canvas.height = Math.max(1, Math.round(vp.height));
      await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
      this.previewAvailable.set(true);
    } catch {
      this.previewAvailable.set(false);
    }
  }

  private async runWorkerCluster(
    request: Extract<PdfTableWorkerRequest, { type: 'cluster' }>
  ): Promise<PdfTableExtractorResult> {
    if (typeof Worker !== 'undefined') {
      try {
        return await new Promise<PdfTableExtractorResult>((resolve, reject) => {
          try {
            const worker = new Worker(new URL('./worker', import.meta.url), {
              type: 'module',
            });
            this.activeWorker = worker;

            worker.onmessage = (event: MessageEvent<PdfTableWorkerResponse>) => {
              const msg = event.data;
              if (msg.type === 'progress') {
                this.progressPercent.set(msg.percent);
                this.progressStage.set(msg.stage);
                return;
              }
              if (msg.type === 'cluster_done') {
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

    return extractTablesFromTokens(
      request.tokens,
      request.pageCount,
      request.options
    );
  }

  private async runWorkerExport(
    request: Extract<PdfTableWorkerRequest, { type: 'export' }>
  ): Promise<TableExportArtifact> {
    if (typeof Worker !== 'undefined') {
      try {
        return await new Promise<TableExportArtifact>((resolve, reject) => {
          try {
            const worker = new Worker(new URL('./worker', import.meta.url), {
              type: 'module',
            });
            this.activeWorker = worker;

            worker.onmessage = (event: MessageEvent<PdfTableWorkerResponse>) => {
              const msg = event.data;
              if (msg.type === 'export_done') {
                this.terminateWorker();
                resolve(msg.artifact);
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

    if (request.format === 'xlsx') {
      return exportTablesToXlsx(
        request.tables,
        request.baseFileName,
        request.sanitizeCsvFormulas
      );
    }
    if (request.format === 'csv') {
      return exportTablesToCsv(
        request.tables,
        request.baseFileName,
        request.sanitizeCsvFormulas
      );
    }
    return exportTablesToJson(request.tables, request.baseFileName);
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
