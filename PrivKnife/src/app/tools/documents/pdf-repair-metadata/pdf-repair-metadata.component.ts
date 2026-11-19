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
import { inspectPdfHealth, processPdfRepairMetadata } from './engine';
import { createCombinedDiagnosticSamplePdf } from './test-fixtures';
import {
  DEFAULT_PDF_REPAIR_OPTIONS,
  PdfHealthReport,
  PdfRepairMetadataOptions,
  PdfRepairMetadataResult,
  PdfRepairWorkerRequest,
  PdfRepairWorkerResponse,
  RepairToolMode,
} from './types';

const MAX_PDF_FILE_BYTES = 150 * 1024 * 1024;
const LARGE_PDF_WARN_BYTES = 40 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

@Component({
  selector: 'app-pdf-repair-metadata',
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
  templateUrl: './pdf-repair-metadata.component.html',
  styleUrl: './pdf-repair-metadata.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfRepairMetadataComponent implements OnDestroy {
  readonly activeMode = signal<RepairToolMode>(DEFAULT_PDF_REPAIR_OPTIONS.mode);

  readonly pdfBytes = signal<Uint8Array | null>(null);
  readonly fileName = signal<string>('document.pdf');
  readonly fileSizeBytes = signal<number>(0);
  readonly healthReport = signal<PdfHealthReport | null>(null);

  // Mode 1: Repair & Sanitize
  readonly linearizeFastWebView = signal<boolean>(
    DEFAULT_PDF_REPAIR_OPTIONS.linearizeFastWebView
  );
  readonly stripJavaScriptAndActions = signal<boolean>(
    DEFAULT_PDF_REPAIR_OPTIONS.stripJavaScriptAndActions
  );

  // Mode 2: Metadata Editor & Scrubber
  readonly scrubAllMetadata = signal<boolean>(
    DEFAULT_PDF_REPAIR_OPTIONS.scrubAllMetadata
  );
  readonly metadataTitle = signal<string>('');
  readonly metadataAuthor = signal<string>('');
  readonly metadataSubject = signal<string>('');
  readonly metadataKeywords = signal<string>('');
  readonly metadataCreator = signal<string>('');
  readonly metadataProducer = signal<string>('');

  // Mode 3: PDF/A-2b Packaging
  readonly pdfaConformance = signal<'2b_vector' | '2b_strict_flattened'>(
    DEFAULT_PDF_REPAIR_OPTIONS.pdfaConformance
  );
  readonly pdfaFlattenDpi = signal<200 | 300>(
    DEFAULT_PDF_REPAIR_OPTIONS.pdfaFlattenDpi
  );

  // Execution & Result state
  readonly isInspecting = signal<boolean>(false);
  readonly isProcessing = signal<boolean>(false);
  readonly progressPercent = signal<number>(0);
  readonly progressStage = signal<string>('');
  readonly errorMessage = signal<string | null>(null);
  readonly largeFileWarning = signal<boolean>(false);
  readonly result = signal<PdfRepairMetadataResult | null>(null);

  private activeWorker: Worker | null = null;
  private readonly createdObjectUrls = new Set<string>();

  readonly formattedInputSize = computed(() => formatBytes(this.fileSizeBytes()));
  readonly formattedOutputSize = computed(() =>
    formatBytes(this.result()?.fileSize ?? 0)
  );
  readonly canDownload = computed(() =>
    Boolean(this.result()?.success && this.result()?.blob)
  );

  ngOnDestroy(): void {
    this.terminateWorker();
    this.revokeAllObjectUrls();
    this.pdfBytes.set(null);
  }

  setMode(mode: RepairToolMode): void {
    this.activeMode.set(mode);
    this.errorMessage.set(null);
  }

  async onFilesDropped(files: File[]): Promise<void> {
    if (!files || files.length === 0) return;
    const file = files[0];
    this.errorMessage.set(null);
    this.result.set(null);

    if (file.size > MAX_PDF_FILE_BYTES) {
      this.errorMessage.set(
        'PDF exceeds the 150 MB in-browser limit. Split large documents before repairing or packaging.'
      );
      return;
    }

    this.largeFileWarning.set(file.size > LARGE_PDF_WARN_BYTES);
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    await this.loadAndInspectBytes(bytes, file.name);
  }

  onDropzoneRejected(reason: string): void {
    this.errorMessage.set(reason || 'Unsupported or oversized PDF file.');
  }

  async loadCorruptedSample(): Promise<void> {
    this.errorMessage.set(null);
    this.result.set(null);
    this.largeFileWarning.set(false);
    const sampleBytes = await createCombinedDiagnosticSamplePdf();
    await this.loadAndInspectBytes(sampleBytes, 'damaged-js-sample.pdf');
  }

  async scrubAllHiddenMetadata(): Promise<void> {
    this.activeMode.set('metadata');
    this.scrubAllMetadata.set(true);
    this.metadataTitle.set('');
    this.metadataAuthor.set('');
    this.metadataSubject.set('');
    this.metadataKeywords.set('');
    this.metadataCreator.set('');
    this.metadataProducer.set('');
    await this.runAction();
  }

  async runAction(): Promise<void> {
    const bytes = this.pdfBytes();
    if (!bytes) {
      this.errorMessage.set('Please upload a PDF or load the diagnostic sample first.');
      return;
    }

    this.errorMessage.set(null);
    this.isProcessing.set(true);
    this.progressPercent.set(10);
    this.progressStage.set('Initializing QPDF WASM & archival pipeline');

    const options = this.buildOptions();
    try {
      const res = await this.executeProcess(bytes, this.fileName(), options);
      if (!res.success) {
        this.result.set(null);
        this.errorMessage.set(res.error || 'PDF operation failed.');
        return;
      }

      this.result.set(res);
      if (res.reportAfter) {
        this.healthReport.set(res.reportAfter);
        this.syncMetadataSignals(res.reportAfter);
      }
    } catch (err: unknown) {
      this.result.set(null);
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Unexpected PDF processing error.'
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
    this.pdfBytes.set(null);
    this.fileName.set('document.pdf');
    this.fileSizeBytes.set(0);
    this.healthReport.set(null);
    this.result.set(null);
    this.errorMessage.set(null);
    this.largeFileWarning.set(false);
    this.isInspecting.set(false);
    this.isProcessing.set(false);
    this.progressPercent.set(0);
    this.progressStage.set('');

    this.activeMode.set(DEFAULT_PDF_REPAIR_OPTIONS.mode);
    this.linearizeFastWebView.set(DEFAULT_PDF_REPAIR_OPTIONS.linearizeFastWebView);
    this.stripJavaScriptAndActions.set(
      DEFAULT_PDF_REPAIR_OPTIONS.stripJavaScriptAndActions
    );
    this.scrubAllMetadata.set(DEFAULT_PDF_REPAIR_OPTIONS.scrubAllMetadata);
    this.pdfaConformance.set(DEFAULT_PDF_REPAIR_OPTIONS.pdfaConformance);
    this.pdfaFlattenDpi.set(DEFAULT_PDF_REPAIR_OPTIONS.pdfaFlattenDpi);

    this.metadataTitle.set('');
    this.metadataAuthor.set('');
    this.metadataSubject.set('');
    this.metadataKeywords.set('');
    this.metadataCreator.set('');
    this.metadataProducer.set('');
  }

  private async loadAndInspectBytes(
    bytes: Uint8Array,
    name: string
  ): Promise<void> {
    this.isInspecting.set(true);
    this.errorMessage.set(null);
    try {
      const report = await this.executeInspect(bytes);
      this.pdfBytes.set(bytes);
      this.fileName.set(name);
      this.fileSizeBytes.set(bytes.byteLength);
      this.healthReport.set(report);
      this.syncMetadataSignals(report);
    } catch (err: unknown) {
      this.pdfBytes.set(null);
      this.healthReport.set(null);
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Unable to inspect file as PDF.'
      );
    } finally {
      this.isInspecting.set(false);
    }
  }

  private syncMetadataSignals(report: PdfHealthReport): void {
    this.metadataTitle.set(report.metadata.title);
    this.metadataAuthor.set(report.metadata.author);
    this.metadataSubject.set(report.metadata.subject);
    this.metadataKeywords.set(report.metadata.keywords);
    this.metadataCreator.set(report.metadata.creator);
    this.metadataProducer.set(report.metadata.producer);
  }

  private buildOptions(): PdfRepairMetadataOptions {
    return {
      mode: this.activeMode(),
      linearizeFastWebView: this.linearizeFastWebView(),
      stripJavaScriptAndActions: this.stripJavaScriptAndActions(),
      scrubAllMetadata: this.scrubAllMetadata(),
      metadataOverrides: {
        title: this.metadataTitle(),
        author: this.metadataAuthor(),
        subject: this.metadataSubject(),
        keywords: this.metadataKeywords(),
        creator: this.metadataCreator(),
        producer: this.metadataProducer(),
      },
      pdfaConformance: this.pdfaConformance(),
      pdfaFlattenDpi: this.pdfaFlattenDpi(),
    };
  }

  private async executeInspect(bytes: Uint8Array): Promise<PdfHealthReport> {
    if (typeof Worker !== 'undefined') {
      try {
        return await this.sendWorkerInspect({
          type: 'inspect',
          pdfBytes: new Uint8Array(bytes),
        });
      } catch {
        // Fallback when Worker runtime is unavailable or fails
      }
    }
    return inspectPdfHealth(bytes);
  }

  private async executeProcess(
    bytes: Uint8Array,
    name: string,
    options: PdfRepairMetadataOptions
  ): Promise<PdfRepairMetadataResult> {
    // 2b_strict_flattened relies on HTMLCanvas rasterization in the main thread when DOM exists
    const requiresDomCanvas =
      options.mode === 'pdfa' && options.pdfaConformance === '2b_strict_flattened';

    if (!requiresDomCanvas && typeof Worker !== 'undefined') {
      try {
        return await this.sendWorkerProcess({
          type: 'process',
          pdfBytes: new Uint8Array(bytes),
          fileName: name,
          options,
        });
      } catch {
        // Fall through cleanly to local execution
      }
    }

    return processPdfRepairMetadata(bytes, name, options, {
      onProgress: (percent, stage) => {
        this.progressPercent.set(percent);
        this.progressStage.set(stage);
      },
    });
  }

  private sendWorkerInspect(
    request: PdfRepairWorkerRequest
  ): Promise<PdfHealthReport> {
    this.terminateWorker();
    return new Promise<PdfHealthReport>((resolve, reject) => {
      try {
        const worker = new Worker(new URL('./worker', import.meta.url), {
          type: 'module',
        });
        this.activeWorker = worker;

        worker.onmessage = (event: MessageEvent<PdfRepairWorkerResponse>) => {
          const msg = event.data;
          if (msg.type === 'inspected') {
            this.terminateWorker();
            resolve(msg.report);
          } else if (msg.type === 'error') {
            this.terminateWorker();
            reject(new Error(msg.error));
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
  }

  private sendWorkerProcess(
    request: PdfRepairWorkerRequest
  ): Promise<PdfRepairMetadataResult> {
    this.terminateWorker();
    return new Promise<PdfRepairMetadataResult>((resolve, reject) => {
      try {
        const worker = new Worker(new URL('./worker', import.meta.url), {
          type: 'module',
        });
        this.activeWorker = worker;

        worker.onmessage = (event: MessageEvent<PdfRepairWorkerResponse>) => {
          const msg = event.data;
          if (msg.type === 'progress') {
            this.progressPercent.set(msg.percent);
            this.progressStage.set(msg.stage);
            return;
          }
          if (msg.type === 'done') {
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
              fileName: 'repaired.pdf',
              fileSize: 0,
              repairedWarningsCount: 0,
              error: msg.error,
            });
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
