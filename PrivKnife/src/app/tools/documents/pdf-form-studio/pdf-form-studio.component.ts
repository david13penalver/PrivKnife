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
import { Card, Dropzone, ProgressBar } from '../../../components';
import { TranslatePipe } from '../../../core/i18n';
import {
  compileFormPdf,
  ensureUniqueFieldName,
  inspectPdfForm,
  parseFormSnapshot,
  pdfWidgetRectToPercent,
  serializeFormSnapshot,
} from './engine';
import { createSampleAcroFormPdf } from './test-fixtures';
import {
  FormFontFamily,
  FormStudioMode,
  PdfFieldKind,
  PdfFormFieldModel,
  PdfFormInspection,
  PdfFormStudioResult,
  PdfFormWorkerRequest,
  PdfFormWorkerResponse,
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
  selector: 'app-pdf-form-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, Dropzone, ProgressBar, TranslatePipe],
  templateUrl: './pdf-form-studio.component.html',
  styleUrl: './pdf-form-studio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfFormStudioComponent implements OnDestroy {
  @ViewChild('pageCanvas') pageCanvasRef?: ElementRef<HTMLCanvasElement>;

  readonly mode = signal<FormStudioMode>('fill');
  readonly activeCreateKind = signal<PdfFieldKind>('text');

  readonly pdfBytes = signal<Uint8Array | null>(null);
  readonly pdfFileName = signal<string>('document.pdf');
  readonly pdfSizeBytes = signal<number>(0);
  readonly pageCount = signal<number>(0);
  readonly currentPage = signal<number>(1);
  readonly pageSizes = signal<Array<{ width: number; height: number }>>([]);
  readonly hasXfa = signal<boolean>(false);
  readonly previewAvailable = signal<boolean>(false);

  readonly fields = signal<PdfFormFieldModel[]>([]);
  readonly searchQuery = signal<string>('');
  readonly flattenOutput = signal<boolean>(false);
  readonly fontFamily = signal<FormFontFamily>('helvetica');

  readonly isProcessing = signal<boolean>(false);
  readonly progressPercent = signal<number>(0);
  readonly progressStage = signal<string>('');
  readonly errorMessage = signal<string | null>(null);
  readonly warningMessages = signal<string[]>([]);
  readonly largeFileWarning = signal<boolean>(false);
  readonly lastResult = signal<PdfFormStudioResult | null>(null);

  private activeWorker: Worker | null = null;
  private pdfProxy: PdfJsDocProxyLike | null = null;
  private createdObjectUrls = new Set<string>();
  private nextFieldSeq = 1;

  readonly formattedInputSize = computed(() => formatFileSize(this.pdfSizeBytes()));

  readonly formattedOutputSize = computed(() => {
    const res = this.lastResult();
    return res?.success ? formatFileSize(res.fileSize) : '';
  });

  readonly filteredFields = computed<PdfFormFieldModel[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.fields();
    if (!q) return list;
    return list.filter((f) => f.name.toLowerCase().includes(q));
  });

  readonly currentPageOverlays = computed(() => {
    const pageIdx = this.currentPage() - 1;
    const result: Array<{
      field: PdfFormFieldModel;
      placementIndex: number;
      xPct: number;
      yPct: number;
      wPct: number;
      hPct: number;
    }> = [];

    for (const field of this.fields()) {
      field.placements.forEach((p, idx) => {
        if (p.pageIndex === pageIdx) {
          result.push({
            field,
            placementIndex: idx,
            xPct: p.xPct ?? 0,
            yPct: p.yPct ?? 0,
            wPct: p.wPct ?? 18,
            hPct: p.hPct ?? 4,
          });
        }
      });
    }
    return result;
  });

  readonly filledCount = computed<number>(() =>
    this.fields().filter((f) => {
      if (typeof f.value === 'boolean') return f.value;
      return String(f.value ?? '').trim().length > 0;
    }).length
  );

  readonly canCompile = computed<boolean>(
    () => Boolean(this.pdfBytes()) && !this.isProcessing()
  );

  ngOnDestroy(): void {
    this.terminateWorker();
    this.destroyPdfProxy();
    this.revokeAllObjectUrls();
    this.clearMemoryState();
  }

  setMode(nextMode: FormStudioMode): void {
    this.mode.set(nextMode);
    this.errorMessage.set(null);
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
    this.warningMessages.set([]);
    this.lastResult.set(null);
    this.largeFileWarning.set(file.size > LARGE_FILE_THRESHOLD_BYTES);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const inspection = await this.runWorkerInspect(bytes);
      this.pdfBytes.set(bytes);
      this.pdfFileName.set(file.name);
      this.pdfSizeBytes.set(file.size || bytes.byteLength);
      this.pageCount.set(inspection.pageCount);
      this.pageSizes.set(inspection.pageSizes);
      this.hasXfa.set(inspection.hasXfa);
      this.fields.set(inspection.fields);
      this.currentPage.set(1);

      this.destroyPdfProxy();
      await this.renderCurrentPagePreview();
    } catch (err: unknown) {
      this.clearMemoryState();
      this.errorMessage.set(
        err instanceof Error
          ? err.message
          : 'Unable to open PDF. It may be corrupted or encrypted.'
      );
    }
  }

  async loadSampleFormPdf(): Promise<void> {
    const bytes = await createSampleAcroFormPdf();
    const sample = new File([bytes.buffer as ArrayBuffer], 'sample-acroform.pdf', {
      type: 'application/pdf',
    });
    await this.onFileDropped([sample]);
  }

  async selectPage(pageNum: number): Promise<void> {
    const clamped = Math.min(Math.max(1, pageNum), Math.max(1, this.pageCount()));
    this.currentPage.set(clamped);
    await this.renderCurrentPagePreview();
  }

  updateFieldValue(fieldId: string, nextValue: string | boolean): void {
    this.fields.update((list) =>
      list.map((f) =>
        f.id === fieldId && !f.readOnly ? { ...f, value: nextValue } : f
      )
    );
  }

  updateFieldName(fieldId: string, nextName: string): void {
    const trimmed = nextName.trim();
    if (!trimmed) return;
    this.fields.update((list) =>
      list.map((f) => (f.id === fieldId && f.isNew ? { ...f, name: trimmed } : f))
    );
  }

  removeNewField(fieldId: string): void {
    this.fields.update((list) =>
      list.filter((f) => !(f.id === fieldId && f.isNew))
    );
  }

  addFieldAt(
    kind: PdfFieldKind,
    pageIndex: number,
    xPt: number,
    yPt: number
  ): void {
    const sizes = this.pageSizes();
    const pageSize = sizes[pageIndex] ?? { width: 595, height: 842 };
    const usedNames = new Set(this.fields().map((f) => f.name));
    const base = `custom_${kind}`;
    const name = ensureUniqueFieldName(base, usedNames);

    const width = kind === 'checkbox' || kind === 'radio' ? 18 : 180;
    const height = kind === 'textarea' ? 60 : kind === 'checkbox' || kind === 'radio' ? 18 : 24;
    const clampedX = Math.max(0, Math.min(pageSize.width - width, xPt));
    const clampedY = Math.max(0, Math.min(pageSize.height - height, yPt));

    const placements =
      kind === 'radio'
        ? [
            {
              pageIndex,
              x: clampedX,
              y: clampedY,
              width,
              height,
              ...pdfWidgetRectToPercent(
                { x: clampedX, y: clampedY, width, height },
                { x: 0, y: 0, width: pageSize.width, height: pageSize.height }
              ),
            },
            {
              pageIndex,
              x: Math.min(pageSize.width - width, clampedX + 70),
              y: clampedY,
              width,
              height,
              ...pdfWidgetRectToPercent(
                {
                  x: Math.min(pageSize.width - width, clampedX + 70),
                  y: clampedY,
                  width,
                  height,
                },
                { x: 0, y: 0, width: pageSize.width, height: pageSize.height }
              ),
            },
          ]
        : [
            {
              pageIndex,
              x: clampedX,
              y: clampedY,
              width,
              height,
              ...pdfWidgetRectToPercent(
                { x: clampedX, y: clampedY, width, height },
                { x: 0, y: 0, width: pageSize.width, height: pageSize.height }
              ),
            },
          ];

    const created: PdfFormFieldModel = {
      id: `new-${this.nextFieldSeq++}-${name}`,
      name,
      kind,
      isNew: true,
      readOnly: false,
      required: false,
      value: kind === 'checkbox' ? false : kind === 'radio' ? 'Option 1' : '',
      options:
        kind === 'dropdown' || kind === 'radio' ? ['Option 1', 'Option 2'] : undefined,
      fontSizePt: 11,
      placements,
    };

    this.fields.update((list) => [...list, created]);
  }

  onStageClick(event: MouseEvent): void {
    if (this.mode() !== 'create') return;
    const canvas = this.pageCanvasRef?.nativeElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const pageIdx = this.currentPage() - 1;
    const size = this.pageSizes()[pageIdx] ?? { width: 595, height: 842 };
    const xPt = ((event.clientX - rect.left) / rect.width) * size.width;
    const yPt =
      size.height - ((event.clientY - rect.top) / rect.height) * size.height - 24;

    this.addFieldAt(this.activeCreateKind(), pageIdx, xPt, yPt);
  }

  exportJsonSnapshot(): string {
    return serializeFormSnapshot(this.fields());
  }

  downloadJsonSnapshot(): void {
    const json = this.exportJsonSnapshot();
    const blob = new Blob([json], { type: 'application/json' });
    const stem = this.pdfFileName().replace(/\.pdf$/i, '') || 'form';
    this.triggerBlobDownload(blob, `${stem}-data.json`);
  }

  importJsonSnapshot(jsonText: string): boolean {
    const parsed = parseFormSnapshot(jsonText);
    if (!parsed.valid) {
      this.errorMessage.set(parsed.error || 'Invalid JSON snapshot.');
      return false;
    }

    this.errorMessage.set(null);
    this.fields.update((list) =>
      list.map((f) => {
        if (f.readOnly) return f;
        if (!Object.prototype.hasOwnProperty.call(parsed.values, f.name)) {
          return f;
        }
        const incoming = parsed.values[f.name];
        if (f.kind === 'checkbox') {
          return { ...f, value: Boolean(incoming) };
        }
        return { ...f, value: String(incoming) };
      })
    );
    return true;
  }

  async onSnapshotFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      this.importJsonSnapshot(text);
    } finally {
      if (input) input.value = '';
    }
  }

  async compileDocument(): Promise<void> {
    const bytes = this.pdfBytes();
    if (!bytes || !this.canCompile()) return;

    this.isProcessing.set(true);
    this.progressPercent.set(5);
    this.progressStage.set('Preparing local AcroForm export');
    this.errorMessage.set(null);
    this.warningMessages.set([]);
    this.lastResult.set(null);

    try {
      const result = await this.runWorkerCompile({
        type: 'compile',
        pdfBytes: bytes,
        fields: this.fields(),
        options: {
          flatten: this.flattenOutput(),
          fontFamily: this.fontFamily(),
          outputFileName: this.pdfFileName(),
        },
      });
      this.lastResult.set(result);
      if (result.warnings?.length) {
        this.warningMessages.set(result.warnings);
      }
      if (!result.success) {
        this.errorMessage.set(result.error || 'Failed to compile PDF form.');
      }
    } catch (err: unknown) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'PDF form compilation failed.'
      );
    } finally {
      this.isProcessing.set(false);
    }
  }

  downloadResult(): void {
    const res = this.lastResult();
    if (!res?.success || !res.blob) return;
    this.triggerBlobDownload(res.blob, res.fileName);
  }

  reset(): void {
    this.terminateWorker();
    this.destroyPdfProxy();
    this.revokeAllObjectUrls();
    this.clearMemoryState();
    this.flattenOutput.set(false);
    this.fontFamily.set('helvetica');
    this.mode.set('fill');
  }

  private clearMemoryState(): void {
    this.pdfBytes.set(null);
    this.pdfFileName.set('document.pdf');
    this.pdfSizeBytes.set(0);
    this.pageCount.set(0);
    this.currentPage.set(1);
    this.pageSizes.set([]);
    this.hasXfa.set(false);
    this.previewAvailable.set(false);
    this.fields.set([]);
    this.searchQuery.set('');
    this.isProcessing.set(false);
    this.progressPercent.set(0);
    this.progressStage.set('');
    this.errorMessage.set(null);
    this.warningMessages.set([]);
    this.largeFileWarning.set(false);
    this.lastResult.set(null);
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

  private async renderCurrentPagePreview(): Promise<void> {
    const bytes = this.pdfBytes();
    const canvas = this.pageCanvasRef?.nativeElement;
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
      const scale = Math.min(1.5, 480 / Math.max(1, unscaled.width));
      const viewport = page.getViewport({ scale });
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));

      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      this.previewAvailable.set(true);
    } catch {
      this.previewAvailable.set(false);
    }
  }

  private async runWorkerInspect(
    pdfBytes: Uint8Array
  ): Promise<PdfFormInspection> {
    if (typeof Worker !== 'undefined') {
      try {
        return await new Promise<PdfFormInspection>((resolve, reject) => {
          try {
            const worker = new Worker(new URL('./worker', import.meta.url), {
              type: 'module',
            });
            this.activeWorker = worker;

            worker.onmessage = (event: MessageEvent<PdfFormWorkerResponse>) => {
              const msg = event.data;
              if (msg.type === 'inspect_done') {
                this.terminateWorker();
                if (msg.inspection) {
                  resolve(msg.inspection);
                } else {
                  reject(new Error(msg.error || 'Unable to inspect form.'));
                }
              }
            };

            worker.onerror = (err) => {
              this.terminateWorker();
              reject(err);
            };

            const req: PdfFormWorkerRequest = { type: 'inspect', pdfBytes };
            worker.postMessage(req);
          } catch (err) {
            this.terminateWorker();
            reject(err);
          }
        });
      } catch {
        // Fallback in tests without Web Worker runtime
      }
    }

    return inspectPdfForm(pdfBytes);
  }

  private async runWorkerCompile(
    request: Extract<PdfFormWorkerRequest, { type: 'compile' }>
  ): Promise<PdfFormStudioResult> {
    if (typeof Worker !== 'undefined') {
      try {
        return await new Promise<PdfFormStudioResult>((resolve, reject) => {
          try {
            const worker = new Worker(new URL('./worker', import.meta.url), {
              type: 'module',
            });
            this.activeWorker = worker;

            worker.onmessage = (event: MessageEvent<PdfFormWorkerResponse>) => {
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

    return compileFormPdf(request.pdfBytes, request.fields, request.options, {
      onProgress: (percent, stage) => {
        this.progressPercent.set(percent);
        this.progressStage.set(stage);
      },
    });
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
