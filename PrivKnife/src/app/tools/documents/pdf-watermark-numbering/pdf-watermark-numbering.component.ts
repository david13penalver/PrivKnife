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
  applyWatermarkAndNumbering,
  formatStampLabel,
  mirrorAnchorForFacingPage,
  parsePageRange,
} from './engine';
import { createSyntheticPdf, DEFAULT_WATERMARK_OPTIONS } from './test-fixtures';
import {
  AnchorPosition,
  NumberingAnchor,
  PdfStandardFontChoice,
  PdfWatermarkNumberingOptions,
  PdfWatermarkNumberingResult,
  PdfWatermarkWorkerRequest,
  PdfWatermarkWorkerResponse,
} from './types';

export const ANCHOR_GRID: AnchorPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'middle-left',
  'center',
  'middle-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

export const NUMBERING_ANCHORS: NumberingAnchor[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

@Component({
  selector: 'app-pdf-watermark-numbering',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, Dropzone, ProgressBar, TranslatePipe],
  templateUrl: './pdf-watermark-numbering.component.html',
  styleUrl: './pdf-watermark-numbering.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfWatermarkNumberingComponent implements OnDestroy {
  @ViewChild('previewCanvas') previewCanvasRef?: ElementRef<HTMLCanvasElement>;

  readonly anchorGrid = ANCHOR_GRID;
  readonly numberingAnchors = NUMBERING_ANCHORS;

  // Document signals
  readonly pdfBytes = signal<Uint8Array | null>(null);
  readonly fileName = signal<string>('document.pdf');
  readonly documentLoaded = signal<boolean>(false);
  readonly totalPages = signal<number>(0);
  readonly currentPreviewPage = signal<number>(1);
  readonly pageRange = signal<string>(DEFAULT_WATERMARK_OPTIONS.pageRange);

  // Watermark signals
  readonly activeTab = signal<'watermark' | 'numbering'>('watermark');
  readonly watermarkEnabled = signal<boolean>(DEFAULT_WATERMARK_OPTIONS.watermark.enabled);
  readonly watermarkKind = signal<'text' | 'image'>(DEFAULT_WATERMARK_OPTIONS.watermark.kind);
  readonly watermarkText = signal<string>(DEFAULT_WATERMARK_OPTIONS.watermark.text);
  readonly watermarkFontFamily = signal<PdfStandardFontChoice>(
    DEFAULT_WATERMARK_OPTIONS.watermark.fontFamily
  );
  readonly watermarkFontSizePt = signal<number>(
    DEFAULT_WATERMARK_OPTIONS.watermark.fontSizePt
  );
  readonly watermarkColorHex = signal<string>(
    DEFAULT_WATERMARK_OPTIONS.watermark.colorHex
  );
  readonly watermarkOpacity = signal<number>(DEFAULT_WATERMARK_OPTIONS.watermark.opacity);
  readonly watermarkRotationDeg = signal<number>(
    DEFAULT_WATERMARK_OPTIONS.watermark.rotationDeg
  );
  readonly watermarkLayout = signal<'single' | 'tiled'>(
    DEFAULT_WATERMARK_OPTIONS.watermark.layout
  );
  readonly watermarkAnchor = signal<AnchorPosition>(
    DEFAULT_WATERMARK_OPTIONS.watermark.anchor
  );
  readonly watermarkTileGapPt = signal<number>(
    DEFAULT_WATERMARK_OPTIONS.watermark.tileGapPt
  );
  readonly watermarkLayer = signal<'over' | 'under'>(
    DEFAULT_WATERMARK_OPTIONS.watermark.layer
  );
  readonly watermarkMarginPt = signal<number>(
    DEFAULT_WATERMARK_OPTIONS.watermark.marginPt
  );
  readonly logoImageBytes = signal<Uint8Array | undefined>(undefined);
  readonly logoMimeType = signal<'image/png' | 'image/jpeg' | undefined>(undefined);
  readonly logoFileName = signal<string | null>(null);
  readonly logoPreviewUrl = signal<string | null>(null);
  readonly logoScalePercent = signal<number>(
    DEFAULT_WATERMARK_OPTIONS.watermark.imageScalePercent
  );

  // Numbering & Bates signals
  readonly numberingEnabled = signal<boolean>(DEFAULT_WATERMARK_OPTIONS.numbering.enabled);
  readonly numberingMode = signal<'page_numbers' | 'bates'>(
    DEFAULT_WATERMARK_OPTIONS.numbering.mode
  );
  readonly numberingTemplate = signal<string>(
    DEFAULT_WATERMARK_OPTIONS.numbering.template
  );
  readonly numberingAnchor = signal<NumberingAnchor>(
    DEFAULT_WATERMARK_OPTIONS.numbering.anchor
  );
  readonly startNumber = signal<number>(DEFAULT_WATERMARK_OPTIONS.numbering.startNumber);
  readonly skipFirstPages = signal<number>(
    DEFAULT_WATERMARK_OPTIONS.numbering.skipFirstPages
  );
  readonly mirrorFacingPages = signal<boolean>(
    DEFAULT_WATERMARK_OPTIONS.numbering.mirrorFacingPages
  );
  readonly numberingFontFamily = signal<PdfStandardFontChoice>(
    DEFAULT_WATERMARK_OPTIONS.numbering.fontFamily
  );
  readonly numberingFontSizePt = signal<number>(
    DEFAULT_WATERMARK_OPTIONS.numbering.fontSizePt
  );
  readonly numberingColorHex = signal<string>(
    DEFAULT_WATERMARK_OPTIONS.numbering.colorHex
  );
  readonly numberingMarginPt = signal<number>(
    DEFAULT_WATERMARK_OPTIONS.numbering.marginPt
  );
  readonly opaqueBackdrop = signal<boolean>(
    DEFAULT_WATERMARK_OPTIONS.numbering.opaqueBackdrop
  );

  // Processing & output state
  readonly isProcessing = signal<boolean>(false);
  readonly progressPercent = signal<number>(0);
  readonly progressStage = signal<string>('');
  readonly errorMessage = signal<string | null>(null);
  readonly lastResult = signal<PdfWatermarkNumberingResult | null>(null);

  private activeWorker: Worker | null = null;
  private createdObjectUrls: string[] = [];

  readonly currentOptions = computed<PdfWatermarkNumberingOptions>(() => ({
    pageRange: this.pageRange(),
    watermark: {
      enabled: this.watermarkEnabled(),
      kind: this.watermarkKind(),
      text: this.watermarkText(),
      fontFamily: this.watermarkFontFamily(),
      fontSizePt: this.watermarkFontSizePt(),
      colorHex: this.watermarkColorHex(),
      opacity: this.watermarkOpacity(),
      rotationDeg: this.watermarkRotationDeg(),
      layout: this.watermarkLayout(),
      anchor: this.watermarkAnchor(),
      tileGapPt: this.watermarkTileGapPt(),
      layer: this.watermarkLayer(),
      imageBytes: this.logoImageBytes(),
      imageMimeType: this.logoMimeType(),
      imageScalePercent: this.logoScalePercent(),
      marginPt: this.watermarkMarginPt(),
    },
    numbering: {
      enabled: this.numberingEnabled(),
      mode: this.numberingMode(),
      template: this.numberingTemplate(),
      anchor: this.numberingAnchor(),
      startNumber: this.startNumber(),
      skipFirstPages: this.skipFirstPages(),
      mirrorFacingPages: this.mirrorFacingPages(),
      fontFamily: this.numberingFontFamily(),
      fontSizePt: this.numberingFontSizePt(),
      colorHex: this.numberingColorHex(),
      marginPt: this.numberingMarginPt(),
      opaqueBackdrop: this.opaqueBackdrop(),
    },
  }));

  readonly previewRangeValid = computed<boolean>(() => {
    const total = this.totalPages();
    if (total <= 0) return true;
    return parsePageRange(this.pageRange(), total).valid;
  });

  readonly isPreviewPageInTargetRange = computed<boolean>(() => {
    const total = this.totalPages();
    if (total <= 0) return true;
    const parsed = parsePageRange(this.pageRange(), total);
    return parsed.valid && parsed.pages.includes(this.currentPreviewPage());
  });

  readonly previewNumberingLabel = computed<string>(() => {
    if (!this.numberingEnabled()) return '';
    const total = Math.max(1, this.totalPages() || 1);
    const cur = this.currentPreviewPage();
    if (cur <= this.skipFirstPages()) return '';

    const parsed = parsePageRange(this.pageRange(), total);
    if (!parsed.valid || !parsed.pages.includes(cur)) return '';

    const stampedPages = parsed.pages.filter((p) => p > this.skipFirstPages());
    const seqIdx = stampedPages.indexOf(cur);
    if (seqIdx < 0) return '';

    return formatStampLabel(
      this.numberingTemplate(),
      seqIdx,
      this.startNumber(),
      total
    );
  });

  readonly effectivePreviewNumberingAnchor = computed<NumberingAnchor>(() =>
    mirrorAnchorForFacingPage(
      this.numberingAnchor(),
      this.currentPreviewPage(),
      this.mirrorFacingPages()
    )
  );

  readonly canExport = computed<boolean>(
    () =>
      this.documentLoaded() &&
      !this.isProcessing() &&
      (this.watermarkEnabled() || this.numberingEnabled())
  );

  ngOnDestroy(): void {
    this.terminateWorker();
    this.revokeAllObjectUrls();
    const canvas = this.previewCanvasRef?.nativeElement;
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  setActiveTab(tab: 'watermark' | 'numbering'): void {
    this.activeTab.set(tab);
  }

  setPageRange(range: string): void {
    this.pageRange.set(range);
    this.errorMessage.set(null);
  }

  setWatermarkEnabled(enabled: boolean): void {
    this.watermarkEnabled.set(enabled);
  }

  setWatermarkKind(kind: 'text' | 'image'): void {
    this.watermarkKind.set(kind);
  }

  setWatermarkText(text: string): void {
    this.watermarkText.set(text);
  }

  setWatermarkFontFamily(font: PdfStandardFontChoice): void {
    this.watermarkFontFamily.set(font);
  }

  setWatermarkFontSize(size: number): void {
    const val = Math.min(200, Math.max(6, Math.round(Number(size) || 6)));
    this.watermarkFontSizePt.set(val);
  }

  setWatermarkColorHex(hex: string): void {
    this.watermarkColorHex.set(hex);
  }

  setWatermarkOpacity(opacity: number): void {
    const num = Number(opacity);
    const clamped = Math.min(1, Math.max(0.05, Math.round((Number.isFinite(num) ? num : 0.2) * 100) / 100));
    this.watermarkOpacity.set(clamped);
  }

  setWatermarkRotation(deg: number): void {
    const clamped = Math.min(180, Math.max(-180, Math.round(Number(deg) || 0)));
    this.watermarkRotationDeg.set(clamped);
  }

  setWatermarkLayout(layout: 'single' | 'tiled'): void {
    this.watermarkLayout.set(layout);
  }

  setWatermarkAnchor(anchor: AnchorPosition): void {
    this.watermarkAnchor.set(anchor);
  }

  setWatermarkTileGap(gap: number): void {
    const clamped = Math.min(1000, Math.max(40, Math.round(Number(gap) || 160)));
    this.watermarkTileGapPt.set(clamped);
  }

  setWatermarkLayer(layer: 'over' | 'under'): void {
    this.watermarkLayer.set(layer);
  }

  setLogoScalePercent(pct: number): void {
    const clamped = Math.min(100, Math.max(5, Math.round(Number(pct) || 30)));
    this.logoScalePercent.set(clamped);
  }

  setNumberingEnabled(enabled: boolean): void {
    this.numberingEnabled.set(enabled);
  }

  applyPageNumberPreset(): void {
    this.numberingMode.set('page_numbers');
    this.numberingTemplate.set('Page {n} of {total}');
    this.startNumber.set(1);
  }

  applyBatesPreset(): void {
    this.numberingMode.set('bates');
    this.numberingTemplate.set('CASE-2026-{bates:6}');
    this.startNumber.set(1);
    this.opaqueBackdrop.set(true);
  }

  setNumberingTemplate(tpl: string): void {
    this.numberingTemplate.set(tpl);
  }

  setNumberingAnchor(anchor: NumberingAnchor): void {
    this.numberingAnchor.set(anchor);
  }

  setStartNumber(n: number): void {
    this.startNumber.set(Math.round(Number(n) || 1));
  }

  setSkipFirstPages(n: number): void {
    this.skipFirstPages.set(Math.max(0, Math.floor(Number(n) || 0)));
  }

  setMirrorFacingPages(enabled: boolean): void {
    this.mirrorFacingPages.set(enabled);
  }

  setNumberingFontFamily(font: PdfStandardFontChoice): void {
    this.numberingFontFamily.set(font);
  }

  setNumberingFontSize(size: number): void {
    const clamped = Math.min(72, Math.max(6, Math.round(Number(size) || 10)));
    this.numberingFontSizePt.set(clamped);
  }

  setNumberingColorHex(hex: string): void {
    this.numberingColorHex.set(hex);
  }

  setOpaqueBackdrop(enabled: boolean): void {
    this.opaqueBackdrop.set(enabled);
  }

  async onPdfDropped(files: File[]): Promise<void> {
    if (!files || files.length === 0) return;
    const file = files[0];
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      this.errorMessage.set('Please select a valid .pdf document.');
      return;
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    await this.loadPdfBytes(bytes, file.name);
  }

  async loadSamplePdf(): Promise<void> {
    const bytes = await createSyntheticPdf(3);
    await this.loadPdfBytes(bytes, 'sample-agreement.pdf');
  }

  async onLogoImageDropped(files: File[]): Promise<void> {
    if (!files || files.length === 0) return;
    const file = files[0];
    const isPng = file.type === 'image/png' || /\.png$/i.test(file.name);
    const isJpeg =
      file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name);

    if (!isPng && !isJpeg) {
      this.errorMessage.set('Watermark image must be a PNG or JPEG file.');
      return;
    }

    this.errorMessage.set(null);
    const bytes = new Uint8Array(await file.arrayBuffer());
    this.logoImageBytes.set(bytes);
    this.logoMimeType.set(isPng ? 'image/png' : 'image/jpeg');
    this.logoFileName.set(file.name);
    this.watermarkKind.set('image');

    const prevUrl = this.logoPreviewUrl();
    if (prevUrl) {
      URL.revokeObjectURL(prevUrl);
      this.createdObjectUrls = this.createdObjectUrls.filter((u) => u !== prevUrl);
    }

    if (typeof URL.createObjectURL === 'function') {
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: isPng ? 'image/png' : 'image/jpeg' })
      );
      this.createdObjectUrls.push(url);
      this.logoPreviewUrl.set(url);
    }
  }

  prevPage(): void {
    if (this.currentPreviewPage() > 1) {
      this.currentPreviewPage.update((p) => p - 1);
      void this.renderPreviewCanvas();
    }
  }

  nextPage(): void {
    if (this.currentPreviewPage() < this.totalPages()) {
      this.currentPreviewPage.update((p) => p + 1);
      void this.renderPreviewCanvas();
    }
  }

  async applyAndExport(): Promise<void> {
    const bytes = this.pdfBytes();
    if (!bytes || this.isProcessing()) return;

    if (!this.watermarkEnabled() && !this.numberingEnabled()) {
      this.errorMessage.set('Enable either Watermark or Page Numbering before exporting.');
      return;
    }

    this.isProcessing.set(true);
    this.errorMessage.set(null);
    this.progressPercent.set(5);
    this.progressStage.set('Starting stamping pass');

    const options = this.currentOptions();
    const name = this.fileName();

    try {
      let result: PdfWatermarkNumberingResult;
      if (typeof Worker !== 'undefined') {
        try {
          result = await this.stampWithWorker(bytes, name, options);
        } catch {
          result = await applyWatermarkAndNumbering(bytes, name, options, {
            onProgress: (pct, stage) => {
              this.progressPercent.set(pct);
              this.progressStage.set(stage);
            },
          });
        }
      } else {
        result = await applyWatermarkAndNumbering(bytes, name, options, {
          onProgress: (pct, stage) => {
            this.progressPercent.set(pct);
            this.progressStage.set(stage);
          },
        });
      }

      if (!result.success) {
        this.errorMessage.set(result.error || 'Failed to stamp PDF.');
        this.lastResult.set(null);
        return;
      }

      this.lastResult.set(result);
    } catch (err: unknown) {
      this.errorMessage.set(
        err instanceof Error ? err.message : 'Unexpected stamping error.'
      );
    } finally {
      this.isProcessing.set(false);
    }
  }

  downloadResult(): void {
    const res = this.lastResult();
    if (!res?.blob || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const url = URL.createObjectURL(res.blob);
    this.createdObjectUrls.push(url);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(url);
      this.createdObjectUrls = this.createdObjectUrls.filter((u) => u !== url);
    }, 150);
  }

  reset(): void {
    this.terminateWorker();
    this.revokeAllObjectUrls();

    this.pdfBytes.set(null);
    this.fileName.set('document.pdf');
    this.documentLoaded.set(false);
    this.totalPages.set(0);
    this.currentPreviewPage.set(1);
    this.pageRange.set(DEFAULT_WATERMARK_OPTIONS.pageRange);

    this.watermarkEnabled.set(DEFAULT_WATERMARK_OPTIONS.watermark.enabled);
    this.watermarkKind.set(DEFAULT_WATERMARK_OPTIONS.watermark.kind);
    this.watermarkText.set(DEFAULT_WATERMARK_OPTIONS.watermark.text);
    this.watermarkFontFamily.set(DEFAULT_WATERMARK_OPTIONS.watermark.fontFamily);
    this.watermarkFontSizePt.set(DEFAULT_WATERMARK_OPTIONS.watermark.fontSizePt);
    this.watermarkColorHex.set(DEFAULT_WATERMARK_OPTIONS.watermark.colorHex);
    this.watermarkOpacity.set(DEFAULT_WATERMARK_OPTIONS.watermark.opacity);
    this.watermarkRotationDeg.set(DEFAULT_WATERMARK_OPTIONS.watermark.rotationDeg);
    this.watermarkLayout.set(DEFAULT_WATERMARK_OPTIONS.watermark.layout);
    this.watermarkAnchor.set(DEFAULT_WATERMARK_OPTIONS.watermark.anchor);
    this.watermarkTileGapPt.set(DEFAULT_WATERMARK_OPTIONS.watermark.tileGapPt);
    this.watermarkLayer.set(DEFAULT_WATERMARK_OPTIONS.watermark.layer);
    this.logoImageBytes.set(undefined);
    this.logoMimeType.set(undefined);
    this.logoFileName.set(null);
    this.logoPreviewUrl.set(null);

    this.numberingEnabled.set(DEFAULT_WATERMARK_OPTIONS.numbering.enabled);
    this.numberingMode.set(DEFAULT_WATERMARK_OPTIONS.numbering.mode);
    this.numberingTemplate.set(DEFAULT_WATERMARK_OPTIONS.numbering.template);
    this.numberingAnchor.set(DEFAULT_WATERMARK_OPTIONS.numbering.anchor);
    this.startNumber.set(DEFAULT_WATERMARK_OPTIONS.numbering.startNumber);
    this.skipFirstPages.set(DEFAULT_WATERMARK_OPTIONS.numbering.skipFirstPages);
    this.mirrorFacingPages.set(DEFAULT_WATERMARK_OPTIONS.numbering.mirrorFacingPages);
    this.opaqueBackdrop.set(DEFAULT_WATERMARK_OPTIONS.numbering.opaqueBackdrop);

    this.isProcessing.set(false);
    this.progressPercent.set(0);
    this.progressStage.set('');
    this.errorMessage.set(null);
    this.lastResult.set(null);
  }

  private async loadPdfBytes(bytes: Uint8Array, name: string): Promise<void> {
    this.errorMessage.set(null);
    this.lastResult.set(null);

    try {
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
      this.fileName.set(name);
      this.totalPages.set(count);
      this.currentPreviewPage.set(1);
      this.documentLoaded.set(true);
      await this.renderPreviewCanvas();
    } catch (err: unknown) {
      this.documentLoaded.set(false);
      this.pdfBytes.set(null);
      this.errorMessage.set(
        err instanceof Error
          ? err.message
          : 'Unable to load PDF. File may be corrupted or encrypted.'
      );
    }
  }

  private async renderPreviewCanvas(): Promise<void> {
    if (typeof document === 'undefined') return;
    const canvas = this.previewCanvasRef?.nativeElement;
    const bytes = this.pdfBytes();
    if (!canvas || !bytes) return;

    let loadingTask: { promise: Promise<any>; destroy: () => Promise<void> } | null = null;
    try {
      const pdfjsLib = await import('pdfjs-dist');
      if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      }
      loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(bytes),
        useWorkerFetch: false,
        useSystemFonts: true,
      });
      const doc = await loadingTask.promise;
      const page = await doc.getPage(this.currentPreviewPage());
      const baseVp = page.getViewport({ scale: 1 });
      const scale = Math.min(1.4, 420 / Math.max(1, baseVp.width));
      const viewport = page.getViewport({ scale });
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    } catch {
      // Fallback CSS sheet remains visible when canvas rendering is unavailable
    } finally {
      if (loadingTask) {
        await loadingTask.destroy();
      }
    }
  }

  private stampWithWorker(
    pdfBytes: Uint8Array,
    fileName: string,
    options: PdfWatermarkNumberingOptions
  ): Promise<PdfWatermarkNumberingResult> {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(new URL('./worker', import.meta.url), {
          type: 'module',
        });
        this.activeWorker = worker;

        worker.onmessage = (
          event: MessageEvent<PdfWatermarkWorkerResponse>
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

        worker.postMessage({
          type: 'stamp',
          pdfBytes,
          fileName,
          options,
        } as PdfWatermarkWorkerRequest);
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
    this.createdObjectUrls = [];
  }
}
