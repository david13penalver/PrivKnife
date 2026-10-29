import { TranslatePipe } from '../../../core/i18n';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Card, Dropzone } from '../../../components';

import {
  BackgroundColorOption,
  CountryPreset,
  PassportBiometricPhotoOptions,
  PassportBiometricPhotoResult,
  PassportExportFormat,
  PassportMetrics,
  PassportWorkerRequest,
  PassportWorkerResponse,
  PrintSheetSize,
} from './types';
import {
  DEFAULT_PASSPORT_OPTIONS,
  DUMMY_PORTRAIT_DATA_URL,
  PASSPORT_SPECS,
  SAMPLE_PORTRAITS,
  SamplePortrait,
} from './test-fixtures';
import {
  calculatePassportMetrics,
  computeBiometricGuidePercentages,
  processPassportPhoto,
  renderPassportSheet,
  renderSinglePhotoPreview,
} from './engine';

@Component({
  selector: 'app-passport-biometric-photo',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, Dropzone, TranslatePipe],
  templateUrl: './passport-biometric-photo.component.html',
  styleUrl: './passport-biometric-photo.component.scss',
})
export class PassportBiometricPhotoComponent implements OnInit, OnDestroy {
  @ViewChild('previewCanvas') previewCanvasRef?: ElementRef<HTMLCanvasElement>;

  readonly PASSPORT_SPECS = PASSPORT_SPECS;
  readonly presetKeys: CountryPreset[] = [
    'us_2x2_inch',
    'eu_schengen_35x45mm',
    'uk_35x45mm',
    'canada_50x70mm',
    'japan_30x40mm',
    'china_33x48mm',
  ];
  readonly samplePortraits = SAMPLE_PORTRAITS;

  // Reactive State Signals
  readonly countryPreset = signal<CountryPreset>('us_2x2_inch');
  readonly printSheetSize = signal<PrintSheetSize>('4x6_inches');
  readonly backgroundColor = signal<BackgroundColorOption>('pure_white');
  readonly zoomLevel = signal<number>(1.0);
  readonly tiltAngleDeg = signal<number>(0);
  readonly brightness = signal<number>(0);
  readonly contrast = signal<number>(0);
  readonly panX = signal<number>(0);
  readonly panY = signal<number>(0);
  readonly cutGuideLines = signal<boolean>(true);
  readonly exportDpi = signal<number>(300);
  readonly exportFormat = signal<PassportExportFormat>('jpg');
  readonly previewMode = signal<'crop_guide' | 'print_sheet'>('crop_guide');

  readonly imageSource = signal<string>(DUMMY_PORTRAIT_DATA_URL);
  readonly fileBlob = signal<File | Blob | null>(null);
  readonly fileName = signal<string>('Sample Portrait (Neutral)');

  readonly isGenerating = signal<boolean>(false);
  readonly generationError = signal<string | null>(null);
  readonly isDragging = signal<boolean>(false);

  private dragStartX = 0;
  private dragStartY = 0;
  private initialPanX = 0;
  private initialPanY = 0;

  private createdObjectUrls: string[] = [];
  private worker: Worker | null = null;

  readonly currentOptions = computed<PassportBiometricPhotoOptions>(() => ({
    countryPreset: this.countryPreset(),
    printSheetSize: this.printSheetSize(),
    backgroundColor: this.backgroundColor(),
    cutGuideLines: this.cutGuideLines(),
    exportDpi: this.exportDpi(),
    zoomLevel: this.zoomLevel(),
    tiltAngleDeg: this.tiltAngleDeg(),
    brightness: this.brightness(),
    contrast: this.contrast(),
    panX: this.panX(),
    panY: this.panY(),
  }));

  readonly currentMetrics = computed<PassportMetrics>(() =>
    calculatePassportMetrics(this.currentOptions())
  );

  readonly currentSpec = computed(
    () => this.PASSPORT_SPECS[this.countryPreset()]
  );

  readonly guidePercentages = computed(() =>
    computeBiometricGuidePercentages(this.currentSpec())
  );

  ngOnInit(): void {
    setTimeout(() => {
      this.refreshPreviewCanvas();
    }, 50);
  }

  ngOnDestroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    for (const url of this.createdObjectUrls) {
      URL.revokeObjectURL(url);
    }
    this.createdObjectUrls = [];
  }

  setCountryPreset(preset: CountryPreset): void {
    this.countryPreset.set(preset);
    this.refreshPreviewCanvas();
  }

  setPrintSheetSize(size: PrintSheetSize): void {
    this.printSheetSize.set(size);
    this.refreshPreviewCanvas();
  }

  setPreviewMode(mode: 'crop_guide' | 'print_sheet'): void {
    this.previewMode.set(mode);
    this.refreshPreviewCanvas();
  }

  setBackgroundColor(color: BackgroundColorOption): void {
    this.backgroundColor.set(color);
    this.refreshPreviewCanvas();
  }

  setZoomLevel(val: number): void {
    this.zoomLevel.set(Math.min(3.0, Math.max(0.5, val)));
    this.refreshPreviewCanvas();
  }

  setTiltAngle(val: number): void {
    this.tiltAngleDeg.set(Math.min(15, Math.max(-15, val)));
    this.refreshPreviewCanvas();
  }

  setBrightness(val: number): void {
    this.brightness.set(Math.min(50, Math.max(-50, val)));
    this.refreshPreviewCanvas();
  }

  setContrast(val: number): void {
    this.contrast.set(Math.min(50, Math.max(-50, val)));
    this.refreshPreviewCanvas();
  }

  setPan(x: number, y: number): void {
    this.panX.set(Math.min(200, Math.max(-200, x)));
    this.panY.set(Math.min(200, Math.max(-200, y)));
    this.refreshPreviewCanvas();
  }

  setPanX(x: number): void {
    this.setPan(x, this.panY());
  }

  setPanY(y: number): void {
    this.setPan(this.panX(), y);
  }

  setExportDpi(dpi: number): void {
    this.exportDpi.set(dpi);
    this.refreshPreviewCanvas();
  }

  toggleCutGuideLines(): void {
    this.cutGuideLines.set(!this.cutGuideLines());
    this.refreshPreviewCanvas();
  }

  setExportFormat(fmt: PassportExportFormat): void {
    this.exportFormat.set(fmt);
  }

  resetAdjustments(): void {
    this.zoomLevel.set(1.0);
    this.tiltAngleDeg.set(0);
    this.brightness.set(0);
    this.contrast.set(0);
    this.panX.set(0);
    this.panY.set(0);
    this.refreshPreviewCanvas();
  }

  selectSamplePortrait(sample: SamplePortrait): void {
    this.imageSource.set(sample.dataUrl);
    this.fileBlob.set(null);
    this.fileName.set(sample.name);
    this.refreshPreviewCanvas();
  }

  onFilesDropped(files: File[]): void {
    if (files && files.length > 0) {
      this.handleFileSelected(files[0]);
    }
  }

  handleFileSelected(file: File): void {
    this.fileBlob.set(file);
    this.fileName.set(file.name);

    const objectUrl = URL.createObjectURL(file);
    this.createdObjectUrls.push(objectUrl);
    this.imageSource.set(objectUrl);
    this.refreshPreviewCanvas();
  }

  onPointerDown(event: PointerEvent): void {
    const canvas = this.previewCanvasRef?.nativeElement;
    if (!canvas) return;

    this.isDragging.set(true);
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.initialPanX = this.panX();
    this.initialPanY = this.panY();

    if (canvas.setPointerCapture) {
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // Fallback for non-supported environments
      }
    }
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isDragging()) return;

    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;

    this.setPan(this.initialPanX + dx, this.initialPanY + dy);
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.isDragging()) return;
    this.isDragging.set(false);

    const canvas = this.previewCanvasRef?.nativeElement;
    if (canvas && canvas.releasePointerCapture) {
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        // Fallback
      }
    }
  }

  onPointerCancel(event: PointerEvent): void {
    this.onPointerUp(event);
  }

  private async refreshPreviewCanvas(): Promise<void> {
    if (!this.previewCanvasRef?.nativeElement) return;
    try {
      const source = this.fileBlob() || this.imageSource();
      const options = this.currentOptions();

      const { canvas } =
        this.previewMode() === 'crop_guide'
          ? await renderSinglePhotoPreview(source, options)
          : await renderPassportSheet(source, options);

      const target = this.previewCanvasRef.nativeElement;
      target.width = canvas.width;
      target.height = canvas.height;
      const ctx = target.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, target.width, target.height);
        ctx.drawImage(canvas, 0, 0);
      }
    } catch {
      // Ignored for headless or rapid adjustments
    }
  }

  async generateDeliverable(): Promise<void> {
    this.isGenerating.set(true);
    this.generationError.set(null);

    try {
      const source = this.fileBlob() || this.imageSource();
      let result: PassportBiometricPhotoResult;

      if (typeof Worker !== 'undefined') {
        try {
          result = await this.runWorkerProcess(
            source,
            this.currentOptions(),
            this.exportFormat()
          );
        } catch {
          result = await processPassportPhoto(
            source,
            this.currentOptions(),
            this.exportFormat()
          );
        }
      } else {
        result = await processPassportPhoto(
          source,
          this.currentOptions(),
          this.exportFormat()
        );
      }

      if (result.success && result.blob) {
        this.triggerDownload(result.blob, result.fileName);
      }
    } catch (err: any) {
      this.generationError.set(err?.message || 'Failed to generate deliverable');
    } finally {
      this.isGenerating.set(false);
    }
  }

  private runWorkerProcess(
    imageSource: string | Blob,
    options: PassportBiometricPhotoOptions,
    format: PassportExportFormat
  ): Promise<PassportBiometricPhotoResult> {
    return new Promise((resolve, reject) => {
      try {
        const worker = new Worker(new URL('./worker', import.meta.url), {
          type: 'module',
        });
        this.worker = worker;

        worker.onmessage = (event: MessageEvent<PassportWorkerResponse>) => {
          worker.terminate();
          if (this.worker === worker) {
            this.worker = null;
          }
          if (event.data.success && event.data.blob) {
            resolve({
              success: true,
              blob: event.data.blob,
              fileName:
                event.data.fileName ||
                `passport-photo-${options.countryPreset}.${format}`,
              fileSize: event.data.fileSize || event.data.blob.size,
              mimeType: event.data.mimeType || 'application/octet-stream',
              metrics: event.data.metrics!,
            });
          } else {
            reject(new Error(event.data.error || 'Worker generation failed'));
          }
        };

        worker.onerror = (err) => {
          worker.terminate();
          if (this.worker === worker) {
            this.worker = null;
          }
          reject(err);
        };

        worker.postMessage({
          imageSource,
          options,
          format,
        } as PassportWorkerRequest);
      } catch (err) {
        reject(err);
      }
    });
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const url = URL.createObjectURL(blob);
    this.createdObjectUrls.push(url);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(url);
      const idx = this.createdObjectUrls.indexOf(url);
      if (idx !== -1) {
        this.createdObjectUrls.splice(idx, 1);
      }
    }, 100);
  }
}
