import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Card, Dropzone, ProgressBar } from '../../../components';
import { TranslatePipe } from '../../../core/i18n';
import {
  convertExtractedDocument,
  extractStyledSpansWithPdfJs,
} from './engine';
import {
  createStructuredSamplePdf,
  DEFAULT_PDF_TO_WORD_OPTIONS,
} from './test-fixtures';
import {
  DocumentBlock,
  PdfStyledSpan,
  PdfToWordMarkdownOptions,
  PdfToWordMarkdownResult,
  PdfToWordWorkerRequest,
  PdfToWordWorkerResponse,
  PreviewTab,
} from './types';

const LARGE_FILE_THRESHOLD_BYTES = 100 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

@Component({
  selector: 'app-pdf-to-word-markdown',
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
  templateUrl: './pdf-to-word-markdown.component.html',
  styleUrl: './pdf-to-word-markdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfToWordMarkdownComponent implements OnDestroy {
  readonly activeTab = signal<PreviewTab>('word');

  readonly pdfBytes = signal<Uint8Array | null>(null);
  readonly pdfFileName = signal<string>('document.pdf');
  readonly pdfSizeBytes = signal<number>(0);
  readonly pageCount = signal<number>(0);

  // Reconstruction options
  readonly pageRange = signal<string>(DEFAULT_PDF_TO_WORD_OPTIONS.pageRange);
  readonly detectMultiColumn = signal<boolean>(
    DEFAULT_PDF_TO_WORD_OPTIONS.detectMultiColumn
  );
  readonly stripHeadersFooters = signal<boolean>(
    DEFAULT_PDF_TO_WORD_OPTIONS.stripHeadersFooters
  );
  readonly dehyphenateWords = signal<boolean>(
    DEFAULT_PDF_TO_WORD_OPTIONS.dehyphenateWords
  );
  readonly preserveInlineStyles = signal<boolean>(
    DEFAULT_PDF_TO_WORD_OPTIONS.preserveInlineStyles
  );
  readonly includePageBreaks = signal<boolean>(
    DEFAULT_PDF_TO_WORD_OPTIONS.includePageBreaks
  );

  // Result & UI signals
  readonly result = signal<PdfToWordMarkdownResult | null>(null);
  readonly blocks = signal<DocumentBlock[]>([]);
  readonly markdownContent = signal<string>('');
  readonly plainTextContent = signal<string>('');
  readonly wordCount = signal<number>(0);
  readonly headingCount = signal<number>(0);
  readonly isScannedFallbackNeeded = signal<boolean>(false);

  readonly isProcessing = signal<boolean>(false);
  readonly progressPercent = signal<number>(0);
  readonly progressStage = signal<string>('');
  readonly errorMessage = signal<string | null>(null);
  readonly largeFileWarning = signal<boolean>(false);
  readonly copiedMarkdown = signal<boolean>(false);

  private cachedSpans: PdfStyledSpan[] = [];
  private cachedPageSizes: Array<{ width: number; height: number }> = [];
  private activeWorker: Worker | null = null;
  private createdObjectUrls = new Set<string>();

  readonly formattedInputSize = computed(() => formatFileSize(this.pdfSizeBytes()));

  readonly currentOptions = computed<PdfToWordMarkdownOptions>(() => ({
    pageRange: this.pageRange(),
    detectMultiColumn: this.detectMultiColumn(),
    stripHeadersFooters: this.stripHeadersFooters(),
    dehyphenateWords: this.dehyphenateWords(),
    preserveInlineStyles: this.preserveInlineStyles(),
    includePageBreaks: this.includePageBreaks(),
  }));

  ngOnDestroy(): void {
    this.terminateWorker();
    this.revokeAllObjectUrls();
    this.clearMemoryState();
  }

  setActiveTab(tab: PreviewTab): void {
    this.activeTab.set(tab);
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
    this.copiedMarkdown.set(false);
    this.largeFileWarning.set(file.size > LARGE_FILE_THRESHOLD_BYTES);
    this.isProcessing.set(true);
    this.progressPercent.set(10);
    this.progressStage.set('Extracting PDF typography and font metrics');

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const extracted = await extractStyledSpansWithPdfJs(bytes);
      this.cachedSpans = extracted.spans;
      this.cachedPageSizes = extracted.pageSizes;
      this.pdfBytes.set(bytes);
      this.pdfFileName.set(file.name);
      this.pdfSizeBytes.set(file.size || bytes.byteLength);
      this.pageCount.set(extracted.pageCount);

      await this.reconvert();
    } catch (err: unknown) {
      this.clearMemoryState();
      this.errorMessage.set(
        err instanceof Error
          ? err.message
          : 'Unable to convert PDF layout.'
      );
    } finally {
      this.isProcessing.set(false);
    }
  }

  async loadSamplePdf(): Promise<void> {
    const bytes = await createStructuredSamplePdf();
    const sample = new File([bytes.buffer as ArrayBuffer], 'sample-report.pdf', {
      type: 'application/pdf',
    });
    await this.onFileDropped([sample]);
  }

  async toggleOptionAndReconvert(
    option:
      | 'detectMultiColumn'
      | 'stripHeadersFooters'
      | 'dehyphenateWords'
      | 'preserveInlineStyles'
      | 'includePageBreaks',
    value: boolean
  ): Promise<void> {
    this[option].set(value);
    await this.reconvert();
  }

  async reconvert(): Promise<void> {
    if (!this.pdfBytes()) return;
    const res = await this.runWorkerConvert({
      type: 'convert',
      spans: this.cachedSpans,
      pageSizes: this.cachedPageSizes,
      fileName: this.pdfFileName(),
      options: this.currentOptions(),
    });

    this.result.set(res);
    this.blocks.set(res.blocks);
    this.markdownContent.set(res.markdown);
    this.plainTextContent.set(res.plainText);
    this.wordCount.set(res.wordCount);
    this.headingCount.set(res.headingCount);
    this.isScannedFallbackNeeded.set(res.isScannedFallbackNeeded);
    if (!res.success && res.error) {
      this.errorMessage.set(res.error);
    }
  }

  downloadDocx(): void {
    const res = this.result();
    if (!res?.success || !res.docxBlob) return;
    this.triggerBlobDownload(res.docxBlob, res.fileName);
  }

  downloadMarkdown(): void {
    const md = this.markdownContent();
    if (!md) return;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const stem = this.pdfFileName().replace(/\.pdf$/i, '') || 'document';
    this.triggerBlobDownload(blob, `${stem}.md`);
  }

  downloadPlainText(): void {
    const txt = this.plainTextContent();
    if (!txt) return;
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const stem = this.pdfFileName().replace(/\.pdf$/i, '') || 'document';
    this.triggerBlobDownload(blob, `${stem}.txt`);
  }

  async copyMarkdown(): Promise<void> {
    const md = this.markdownContent();
    if (!md) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(md);
    }
    this.copiedMarkdown.set(true);
    setTimeout(() => this.copiedMarkdown.set(false), 2000);
  }

  reset(): void {
    this.terminateWorker();
    this.revokeAllObjectUrls();
    this.clearMemoryState();
    this.activeTab.set('word');
    this.pageRange.set(DEFAULT_PDF_TO_WORD_OPTIONS.pageRange);
    this.detectMultiColumn.set(DEFAULT_PDF_TO_WORD_OPTIONS.detectMultiColumn);
    this.stripHeadersFooters.set(DEFAULT_PDF_TO_WORD_OPTIONS.stripHeadersFooters);
    this.dehyphenateWords.set(DEFAULT_PDF_TO_WORD_OPTIONS.dehyphenateWords);
    this.preserveInlineStyles.set(
      DEFAULT_PDF_TO_WORD_OPTIONS.preserveInlineStyles
    );
    this.includePageBreaks.set(DEFAULT_PDF_TO_WORD_OPTIONS.includePageBreaks);
  }

  private clearMemoryState(): void {
    this.cachedSpans = [];
    this.cachedPageSizes = [];
    this.pdfBytes.set(null);
    this.pdfFileName.set('document.pdf');
    this.pdfSizeBytes.set(0);
    this.pageCount.set(0);
    this.result.set(null);
    this.blocks.set([]);
    this.markdownContent.set('');
    this.plainTextContent.set('');
    this.wordCount.set(0);
    this.headingCount.set(0);
    this.isScannedFallbackNeeded.set(false);
    this.isProcessing.set(false);
    this.progressPercent.set(0);
    this.progressStage.set('');
    this.errorMessage.set(null);
    this.largeFileWarning.set(false);
    this.copiedMarkdown.set(false);
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

  private async runWorkerConvert(
    request: PdfToWordWorkerRequest
  ): Promise<PdfToWordMarkdownResult> {
    if (typeof Worker !== 'undefined') {
      try {
        return await new Promise<PdfToWordMarkdownResult>((resolve, reject) => {
          try {
            const worker = new Worker(new URL('./worker', import.meta.url), {
              type: 'module',
            });
            this.activeWorker = worker;

            worker.onmessage = (
              event: MessageEvent<PdfToWordWorkerResponse>
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

    return convertExtractedDocument(
      request.spans,
      request.pageSizes,
      request.fileName,
      request.options,
      (percent, stage) => {
        this.progressPercent.set(percent);
        this.progressStage.set(stage);
      }
    );
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
