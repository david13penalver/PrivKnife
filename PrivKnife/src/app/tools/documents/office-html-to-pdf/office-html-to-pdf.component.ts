import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  Badge,
  Button,
  Card,
  Dropzone,
  ProgressBar,
} from '../../../components';
import { TranslatePipe } from '../../../core/i18n';
import { convertOfficeToPdf } from './engine';
import {
  createMultiSheetXlsxBytes,
  createSampleDocxBytes,
  MALICIOUS_EXFIL_HTML,
  SAMPLE_MARKDOWN_DOC,
} from './test-fixtures';
import {
  DEFAULT_OFFICE_TO_PDF_OPTIONS,
  OfficeOrientation,
  OfficePaperSize,
  OfficeToPdfInput,
  OfficeToPdfOptions,
  OfficeToPdfResult,
  OfficeToPdfWorkerRequest,
  OfficeToPdfWorkerResponse,
  PaginatedPreviewPage,
  SupportedOfficeFormat,
} from './types';

const MAX_OFFICE_FILE_BYTES = 50 * 1024 * 1024;
const LARGE_FILE_WARN_BYTES = 20 * 1024 * 1024;

function formatByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

@Component({
  selector: 'app-office-html-to-pdf',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Badge,
    Button,
    Card,
    Dropzone,
    ProgressBar,
    TranslatePipe,
  ],
  templateUrl: './office-html-to-pdf.component.html',
  styleUrl: './office-html-to-pdf.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfficeHtmlToPdfComponent implements OnDestroy {
  readonly inputMode = signal<'file' | 'paste'>('file');
  readonly pasteFormat = signal<'html' | 'md' | 'csv'>('html');
  readonly pasteText = signal<string>('');

  readonly fileName = signal<string>('converted-document.pdf');
  readonly sourceFormat = signal<SupportedOfficeFormat | null>(null);
  readonly inputBytesSize = signal<number>(0);

  // Page & table options
  readonly paperSize = signal<OfficePaperSize>(DEFAULT_OFFICE_TO_PDF_OPTIONS.paperSize);
  readonly orientation = signal<OfficeOrientation>(
    DEFAULT_OFFICE_TO_PDF_OPTIONS.orientation
  );
  readonly marginMm = signal<number>(DEFAULT_OFFICE_TO_PDF_OPTIONS.marginMm);
  readonly baseFontSizePt = signal<number>(
    DEFAULT_OFFICE_TO_PDF_OPTIONS.baseFontSizePt
  );
  readonly sheetNames = signal<string[]>([]);
  readonly selectedSheets = signal<string[]>([]);
  readonly showTableGridlines = signal<boolean>(
    DEFAULT_OFFICE_TO_PDF_OPTIONS.showTableGridlines
  );
  readonly tableZebraStriping = signal<boolean>(
    DEFAULT_OFFICE_TO_PDF_OPTIONS.tableZebraStriping
  );
  readonly repeatTableHeaders = signal<boolean>(
    DEFAULT_OFFICE_TO_PDF_OPTIONS.repeatTableHeaders
  );
  readonly includePageNumbers = signal<boolean>(
    DEFAULT_OFFICE_TO_PDF_OPTIONS.includePageNumbers
  );
  readonly headerText = signal<string>(DEFAULT_OFFICE_TO_PDF_OPTIONS.headerText);

  // Conversion status & results
  readonly recommendedOrientation = signal<OfficeOrientation>('portrait');
  readonly isProcessing = signal<boolean>(false);
  readonly progressPercent = signal<number>(0);
  readonly progressStage = signal<string>('');
  readonly errorMessage = signal<string | null>(null);
  readonly largeFileWarning = signal<boolean>(false);
  readonly result = signal<OfficeToPdfResult | null>(null);
  readonly previewPages = signal<PaginatedPreviewPage[]>([]);
  readonly blockedRemoteUrls = signal<number>(0);

  private cachedBinaryBytes: Uint8Array | null = null;
  private cachedBinaryHint: SupportedOfficeFormat | undefined;
  private activeWorker: Worker | null = null;
  private readonly createdObjectUrls = new Set<string>();

  readonly formattedInputSize = computed(() =>
    formatByteSize(this.inputBytesSize())
  );
  readonly formattedOutputSize = computed(() =>
    formatByteSize(this.result()?.fileSize ?? 0)
  );
  readonly hasInput = computed(
    () => Boolean(this.cachedBinaryBytes) || this.pasteText().trim().length > 0
  );
  readonly canDownload = computed(() =>
    Boolean(this.result()?.success && this.result()?.blob)
  );
  readonly showLandscapeBanner = computed(
    () =>
      this.recommendedOrientation() === 'landscape' &&
      this.orientation() !== 'landscape'
  );

  ngOnDestroy(): void {
    this.terminateWorker();
    this.revokeAllObjectUrls();
    this.cachedBinaryBytes = null;
  }

  setInputMode(mode: 'file' | 'paste'): void {
    this.inputMode.set(mode);
    this.errorMessage.set(null);
  }

  setPasteFormat(fmt: 'html' | 'md' | 'csv'): void {
    this.pasteFormat.set(fmt);
    this.errorMessage.set(null);
  }

  updatePasteText(value: string): void {
    this.pasteText.set(value);
    this.errorMessage.set(null);
  }

  async onFilesDropped(files: File[]): Promise<void> {
    if (!files || files.length === 0) return;
    const file = files[0];
    this.errorMessage.set(null);

    if (file.size > MAX_OFFICE_FILE_BYTES) {
      this.errorMessage.set(
        'File exceeds the 50 MB in-browser conversion limit. Please split large workbooks or documents.'
      );
      return;
    }

    this.largeFileWarning.set(file.size > LARGE_FILE_WARN_BYTES);
    this.inputMode.set('file');
    this.fileName.set(file.name);
    this.inputBytesSize.set(file.size);
    this.selectedSheets.set([]);
    this.sheetNames.set([]);

    const buffer = await file.arrayBuffer();
    this.cachedBinaryBytes = new Uint8Array(buffer);
    this.cachedBinaryHint = undefined;

    await this.convert();
  }

  onDropzoneRejected(reason: string): void {
    this.errorMessage.set(reason || 'Unsupported or oversized file.');
  }

  async loadSampleDocx(): Promise<void> {
    const bytes = await createSampleDocxBytes({ includeImage: true });
    this.inputMode.set('file');
    this.fileName.set('quarterly-security-briefing.docx');
    this.inputBytesSize.set(bytes.byteLength);
    this.largeFileWarning.set(false);
    this.selectedSheets.set([]);
    this.cachedBinaryBytes = bytes;
    this.cachedBinaryHint = 'docx';
    await this.convert();
  }

  async loadSampleXlsx(): Promise<void> {
    const bytes = createMultiSheetXlsxBytes(30, 8);
    this.inputMode.set('file');
    this.fileName.set('financial-ledger.xlsx');
    this.inputBytesSize.set(bytes.byteLength);
    this.largeFileWarning.set(false);
    this.selectedSheets.set([]);
    this.cachedBinaryBytes = bytes;
    this.cachedBinaryHint = 'xlsx';
    await this.convert();
  }

  async loadSampleMarkdown(): Promise<void> {
    this.inputMode.set('paste');
    this.pasteFormat.set('md');
    this.pasteText.set(SAMPLE_MARKDOWN_DOC);
    this.fileName.set('architecture-guide.md');
    this.inputBytesSize.set(SAMPLE_MARKDOWN_DOC.length);
    this.cachedBinaryBytes = null;
    await this.convert();
  }

  async loadSampleSanitizedHtml(): Promise<void> {
    this.inputMode.set('paste');
    this.pasteFormat.set('html');
    this.pasteText.set(MALICIOUS_EXFIL_HTML);
    this.fileName.set('sandbox-test.html');
    this.inputBytesSize.set(MALICIOUS_EXFIL_HTML.length);
    this.cachedBinaryBytes = null;
    await this.convert();
  }

  async toggleSheet(sheetName: string): Promise<void> {
    const all = this.sheetNames();
    if (all.length === 0) return;

    const current =
      this.selectedSheets().length > 0 ? this.selectedSheets() : [...all];
    const next = current.includes(sheetName)
      ? current.filter((s) => s !== sheetName)
      : all.filter((s) => current.includes(s) || s === sheetName);

    if (next.length === 0) {
      this.errorMessage.set('Select at least one worksheet to export.');
      return;
    }

    this.errorMessage.set(null);
    this.selectedSheets.set(next);
    await this.convert();
  }

  async selectAllSheets(): Promise<void> {
    this.selectedSheets.set([...this.sheetNames()]);
    if (this.hasInput()) {
      await this.convert();
    }
  }

  async applyRecommendedLandscape(): Promise<void> {
    this.orientation.set('landscape');
    if (this.hasInput()) {
      await this.convert();
    }
  }

  async updateOption<K extends keyof OfficeToPdfOptions>(
    key: K,
    value: OfficeToPdfOptions[K]
  ): Promise<void> {
    switch (key) {
      case 'paperSize':
        this.paperSize.set(value as OfficePaperSize);
        break;
      case 'orientation':
        this.orientation.set(value as OfficeOrientation);
        break;
      case 'marginMm':
        this.marginMm.set(Number(value));
        break;
      case 'baseFontSizePt':
        this.baseFontSizePt.set(Number(value));
        break;
      case 'showTableGridlines':
        this.showTableGridlines.set(Boolean(value));
        break;
      case 'tableZebraStriping':
        this.tableZebraStriping.set(Boolean(value));
        break;
      case 'repeatTableHeaders':
        this.repeatTableHeaders.set(Boolean(value));
        break;
      case 'includePageNumbers':
        this.includePageNumbers.set(Boolean(value));
        break;
      case 'headerText':
        this.headerText.set(String(value));
        break;
    }

    if (this.hasInput()) {
      await this.convert();
    }
  }

  async convert(): Promise<void> {
    const input = this.buildCurrentInput();
    if (!input) {
      this.errorMessage.set(
        'Please drop an Office/HTML/Markdown file or paste markup text first.'
      );
      return;
    }

    this.errorMessage.set(null);
    this.isProcessing.set(true);
    this.progressPercent.set(10);
    this.progressStage.set('Initializing local converter');

    try {
      const res = await this.runConvert(input, this.buildCurrentOptions());
      if (!res.success) {
        this.result.set(null);
        this.previewPages.set([]);
        this.errorMessage.set(res.error || 'Client-side PDF conversion failed.');
        return;
      }

      this.result.set(res);
      this.previewPages.set(res.previewPages);
      this.sourceFormat.set(res.diagnostics.sourceFormat);
      this.blockedRemoteUrls.set(res.diagnostics.blockedRemoteUrls);
      this.recommendedOrientation.set(res.diagnostics.recommendedOrientation);

      if (res.diagnostics.sheetNames.length > 0) {
        this.sheetNames.set(res.diagnostics.sheetNames);
        if (this.selectedSheets().length === 0) {
          this.selectedSheets.set([...res.diagnostics.sheetNames]);
        }
      } else {
        this.sheetNames.set([]);
        this.selectedSheets.set([]);
      }
    } catch (err: unknown) {
      this.result.set(null);
      this.previewPages.set([]);
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Unexpected conversion error.'
      );
    } finally {
      this.isProcessing.set(false);
    }
  }

  downloadPdf(): void {
    const res = this.result();
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
    this.revokeAllObjectUrls();
    this.cachedBinaryBytes = null;
    this.cachedBinaryHint = undefined;

    this.inputMode.set('file');
    this.pasteFormat.set('html');
    this.pasteText.set('');
    this.fileName.set('converted-document.pdf');
    this.sourceFormat.set(null);
    this.inputBytesSize.set(0);

    this.paperSize.set(DEFAULT_OFFICE_TO_PDF_OPTIONS.paperSize);
    this.orientation.set(DEFAULT_OFFICE_TO_PDF_OPTIONS.orientation);
    this.marginMm.set(DEFAULT_OFFICE_TO_PDF_OPTIONS.marginMm);
    this.baseFontSizePt.set(DEFAULT_OFFICE_TO_PDF_OPTIONS.baseFontSizePt);
    this.sheetNames.set([]);
    this.selectedSheets.set([]);
    this.showTableGridlines.set(DEFAULT_OFFICE_TO_PDF_OPTIONS.showTableGridlines);
    this.tableZebraStriping.set(DEFAULT_OFFICE_TO_PDF_OPTIONS.tableZebraStriping);
    this.repeatTableHeaders.set(DEFAULT_OFFICE_TO_PDF_OPTIONS.repeatTableHeaders);
    this.includePageNumbers.set(DEFAULT_OFFICE_TO_PDF_OPTIONS.includePageNumbers);
    this.headerText.set(DEFAULT_OFFICE_TO_PDF_OPTIONS.headerText);

    this.recommendedOrientation.set('portrait');
    this.isProcessing.set(false);
    this.progressPercent.set(0);
    this.progressStage.set('');
    this.errorMessage.set(null);
    this.largeFileWarning.set(false);
    this.result.set(null);
    this.previewPages.set([]);
    this.blockedRemoteUrls.set(0);
  }

  private buildCurrentInput(): OfficeToPdfInput | null {
    if (this.inputMode() === 'file' && this.cachedBinaryBytes) {
      return {
        kind: 'binary',
        bytes: new Uint8Array(this.cachedBinaryBytes),
        fileName: this.fileName(),
        hintFormat: this.cachedBinaryHint,
      };
    }
    const text = this.pasteText();
    if (this.inputMode() === 'paste' && text.trim().length > 0) {
      const fmt = this.pasteFormat();
      const base = this.fileName().startsWith('converted-document')
        ? `pasted-document.${fmt}`
        : this.fileName();
      return {
        kind: 'text',
        content: text,
        fileName: base,
        format: fmt,
      };
    }
    if (this.cachedBinaryBytes) {
      return {
        kind: 'binary',
        bytes: new Uint8Array(this.cachedBinaryBytes),
        fileName: this.fileName(),
        hintFormat: this.cachedBinaryHint,
      };
    }
    return null;
  }

  private buildCurrentOptions(): Partial<OfficeToPdfOptions> {
    return {
      paperSize: this.paperSize(),
      orientation: this.orientation(),
      marginMm: this.marginMm(),
      baseFontSizePt: this.baseFontSizePt(),
      selectedSheets: this.selectedSheets(),
      showTableGridlines: this.showTableGridlines(),
      tableZebraStriping: this.tableZebraStriping(),
      repeatTableHeaders: this.repeatTableHeaders(),
      includePageNumbers: this.includePageNumbers(),
      headerText: this.headerText(),
      outputFileName: DEFAULT_OFFICE_TO_PDF_OPTIONS.outputFileName,
    };
  }

  private async runConvert(
    input: OfficeToPdfInput,
    options: Partial<OfficeToPdfOptions>
  ): Promise<OfficeToPdfResult> {
    this.terminateWorker();

    if (typeof Worker !== 'undefined') {
      try {
        return await new Promise<OfficeToPdfResult>((resolve, reject) => {
          try {
            const worker = new Worker(new URL('./worker', import.meta.url), {
              type: 'module',
            });
            this.activeWorker = worker;

            worker.onmessage = (
              event: MessageEvent<OfficeToPdfWorkerResponse>
            ) => {
              const msg = event.data;
              if (msg.type === 'progress') {
                this.progressPercent.set(msg.percent);
                this.progressStage.set(msg.stage);
                return;
              }
              if (msg.type === 'converted') {
                this.terminateWorker();
                const pdfBytes = msg.pdfBuffer
                  ? new Uint8Array(msg.pdfBuffer)
                  : msg.result.pdfBytes;
                const blob = pdfBytes
                  ? new Blob([pdfBytes.buffer as ArrayBuffer], {
                      type: 'application/pdf',
                    })
                  : msg.result.blob;
                resolve({
                  ...msg.result,
                  pdfBytes,
                  blob,
                });
                return;
              }
              if (msg.type === 'error') {
                this.terminateWorker();
                resolve({
                  success: false,
                  fileName: 'converted-document.pdf',
                  fileSize: 0,
                  previewHtml: '',
                  previewPages: [],
                  diagnostics: {
                    sourceFormat: 'html',
                    pageCount: 0,
                    tableCount: 0,
                    paragraphCount: 0,
                    imageCount: 0,
                    blockedRemoteUrls: 0,
                    recommendedOrientation: 'portrait',
                    sheetNames: [],
                    maxTableColumns: 0,
                    warnings: [],
                  },
                  error: msg.error,
                });
              }
            };

            worker.onerror = (err) => {
              this.terminateWorker();
              reject(err);
            };

            const request: OfficeToPdfWorkerRequest = {
              type: 'convert',
              input,
              options,
            };
            worker.postMessage(request);
          } catch (err) {
            this.terminateWorker();
            reject(err);
          }
        });
      } catch {
        // Fall through to in-thread execution when Worker runtime is unavailable
      }
    }

    return convertOfficeToPdf(input, options, (percent, stage) => {
      this.progressPercent.set(percent);
      this.progressStage.set(stage);
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
