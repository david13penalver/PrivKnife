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
  PassportExportFormat,
  PassportMetrics,
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
  processPassportPhoto,
  renderPassportSheet,
} from './engine';

@Component({
  selector: 'app-passport-biometric-photo',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, Dropzone],
  template: `
    <div class="l-page">
      <!-- Header -->
      <div class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">Passport, Visa & ID Biometric Photo Maker</h1>
          <p class="c-header__subtitle">
            Create compliant passport, visa, and ID photos with official ICAO / US / Schengen biometric head guides and multi-photo print sheets (4×6″, A4, single).
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          🛡️ 100% In-Browser • Never Leaves Your Device
        </div>
      </div>

      <!-- Quick Country Presets Bar -->
      <div class="preset-strip g--margin-bottom-4">
        <span class="preset-label">Standard Presets:</span>
        <div class="preset-buttons">
          @for (presetKey of presetKeys; track presetKey) {
            <button
              type="button"
              class="c-button c-button--small"
              [class.c-button--primary]="countryPreset() === presetKey"
              [class.c-button--outline]="countryPreset() !== presetKey"
              (click)="setCountryPreset(presetKey)"
            >
              {{ PASSPORT_SPECS[presetKey].country }} ({{ PASSPORT_SPECS[presetKey].widthMm }}×{{ PASSPORT_SPECS[presetKey].heightMm }}mm)
            </button>
          }
        </div>
      </div>

      <!-- Main Layout Columns -->
      <div class="l-columns l-columns--2">
        <!-- Controls Column -->
        <div class="l-columns__column">
          <!-- Portrait Input Card -->
          <app-card title="1. Select or Upload Portrait" class="g--margin-bottom-4">
            <!-- Sample Selector -->
            <div class="sample-selector g--margin-bottom-3">
              <span class="c-form-label">Try Sample Portrait:</span>
              <div class="sample-pills">
                @for (sample of samplePortraits; track sample.id) {
                  <button
                    type="button"
                    class="c-button c-button--small c-button--outline"
                    [class.is-active]="fileName() === sample.name"
                    (click)="selectSamplePortrait(sample)"
                  >
                    {{ sample.name }}
                  </button>
                }
              </div>
            </div>

            <!-- Dropzone -->
            <app-dropzone
              title="Drop your portrait here or click to browse"
              subtitle="JPG, PNG, WebP supported (max 25MB)"
              accept="image/*"
              [maxSizeMb]="25"
              (filesSelected)="onFilesDropped($event)"
            />
            <div class="file-name-meta g--margin-top-2">
              <small class="g--text-muted">Active Image: <strong>{{ fileName() }}</strong></small>
            </div>
          </app-card>

          <!-- Framing & Biometric Adjustments Card -->
          <app-card title="2. Framing & Adjustments" class="g--margin-bottom-4">
            <!-- Zoom Slider -->
            <div class="c-form-group g--margin-bottom-3">
              <div class="l-extremo">
                <label class="c-form-label">Scale / Zoom Level</label>
                <span class="c-form-value">{{ zoomLevel().toFixed(2) }}x</span>
              </div>
              <input
                type="range"
                class="c-range"
                [min]="0.5"
                [max]="3.0"
                [step]="0.05"
                [ngModel]="zoomLevel()"
                (ngModelChange)="setZoomLevel($event)"
              />
            </div>

            <!-- Tilt Angle Slider -->
            <div class="c-form-group g--margin-bottom-3">
              <div class="l-extremo">
                <label class="c-form-label">Head Tilt Correction</label>
                <span class="c-form-value">{{ tiltAngleDeg().toFixed(1) }}°</span>
              </div>
              <input
                type="range"
                class="c-range"
                [min]="-15"
                [max]="15"
                [step]="0.5"
                [ngModel]="tiltAngleDeg()"
                (ngModelChange)="setTiltAngle($event)"
              />
            </div>

            <!-- Brightness & Contrast -->
            <div class="l-columns l-columns--2 g--margin-bottom-3">
              <div class="c-form-group">
                <div class="l-extremo">
                  <label class="c-form-label">Brightness</label>
                  <span class="c-form-value">{{ brightness() }}</span>
                </div>
                <input
                  type="range"
                  class="c-range"
                  [min]="-50"
                  [max]="50"
                  [step]="2"
                  [ngModel]="brightness()"
                  (ngModelChange)="setBrightness($event)"
                />
              </div>

              <div class="c-form-group">
                <div class="l-extremo">
                  <label class="c-form-label">Contrast</label>
                  <span class="c-form-value">{{ contrast() }}</span>
                </div>
                <input
                  type="range"
                  class="c-range"
                  [min]="-50"
                  [max]="50"
                  [step]="2"
                  [ngModel]="contrast()"
                  (ngModelChange)="setContrast($event)"
                />
              </div>
            </div>

            <!-- Background Color Tint -->
            <div class="c-form-group g--margin-bottom-3">
              <label class="c-form-label">Background Tint</label>
              <div class="bg-options">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="backgroundColor() === 'pure_white'"
                  [class.c-button--outline]="backgroundColor() !== 'pure_white'"
                  (click)="setBackgroundColor('pure_white')"
                >
                  Pure White
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="backgroundColor() === 'off_white'"
                  [class.c-button--outline]="backgroundColor() !== 'off_white'"
                  (click)="setBackgroundColor('off_white')"
                >
                  Off-White
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="backgroundColor() === 'light_grey'"
                  [class.c-button--outline]="backgroundColor() !== 'light_grey'"
                  (click)="setBackgroundColor('light_grey')"
                >
                  Light Grey
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="backgroundColor() === 'light_blue'"
                  [class.c-button--outline]="backgroundColor() !== 'light_blue'"
                  (click)="setBackgroundColor('light_blue')"
                >
                  Light Blue
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="backgroundColor() === 'original'"
                  [class.c-button--outline]="backgroundColor() !== 'original'"
                  (click)="setBackgroundColor('original')"
                >
                  Original
                </button>
              </div>
            </div>

            <!-- Cut Guidelines & Reset -->
            <div class="l-extremo g--align-center">
              <label class="c-checkbox-label">
                <input
                  type="checkbox"
                  [checked]="cutGuideLines()"
                  (change)="toggleCutGuideLines()"
                />
                Show Scissor Cut Guidelines
              </label>

              <button
                type="button"
                class="c-button c-button--small c-button--outline"
                (click)="resetAdjustments()"
              >
                Reset All
              </button>
            </div>
          </app-card>

          <!-- Sheet & Print Layout Card -->
          <app-card title="3. Sheet & Print Format" class="g--margin-bottom-4">
            <div class="c-form-group g--margin-bottom-3">
              <label class="c-form-label">Print Sheet Size</label>
              <div class="sheet-buttons">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="printSheetSize() === '4x6_inches'"
                  [class.c-button--outline]="printSheetSize() !== '4x6_inches'"
                  (click)="setPrintSheetSize('4x6_inches')"
                >
                  4×6″ Photo Paper (10×15 cm)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="printSheetSize() === 'a4'"
                  [class.c-button--outline]="printSheetSize() !== 'a4'"
                  (click)="setPrintSheetSize('a4')"
                >
                  A4 Paper
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="printSheetSize() === 'a6'"
                  [class.c-button--outline]="printSheetSize() !== 'a6'"
                  (click)="setPrintSheetSize('a6')"
                >
                  A6 Paper
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="printSheetSize() === 'single_digital'"
                  [class.c-button--outline]="printSheetSize() !== 'single_digital'"
                  (click)="setPrintSheetSize('single_digital')"
                >
                  Single Digital Photo
                </button>
              </div>
            </div>

            <!-- Export DPI -->
            <div class="c-form-group">
              <label class="c-form-label">Export Resolution</label>
              <div class="dpi-buttons">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="exportDpi() === 300"
                  [class.c-button--outline]="exportDpi() !== 300"
                  (click)="setExportDpi(300)"
                >
                  300 DPI (Standard Print)
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="exportDpi() === 600"
                  [class.c-button--outline]="exportDpi() !== 600"
                  (click)="setExportDpi(600)"
                >
                  600 DPI (Ultra Fine)
                </button>
              </div>
            </div>
          </app-card>
        </div>

        <!-- Preview & Export Column -->
        <div class="l-columns__column">
          <!-- Live Canvas Biometric Preview Card -->
          <app-card title="Live Biometric Guideline View" class="g--margin-bottom-4">
            <div class="preview-container">
              <div class="canvas-wrapper">
                <canvas #previewCanvas class="c-preview-canvas"></canvas>

                <!-- Biometric Guideline Overlay (ICAO Head Sizing) -->
                <div class="biometric-overlay">
                  <div class="biometric-line biometric-line--crown">
                    <span class="biometric-tag">Crown of Head (Min / Max)</span>
                  </div>
                  <div class="biometric-line biometric-line--eye">
                    <span class="biometric-tag">Eye Level Centerline</span>
                  </div>
                  <div class="biometric-line biometric-line--chin">
                    <span class="biometric-tag">Chin Baseline</span>
                  </div>
                  <div class="biometric-axis"></div>
                </div>
              </div>
            </div>

            <p class="preview-hint g--text-center g--margin-top-2">
              💡 <em>Align the head between Crown and Chin lines with eyes centered horizontally.</em>
            </p>
          </app-card>

          <!-- Biometric Specification Summary -->
          <app-card title="Official Biometric Specs & Yield" class="g--margin-bottom-4">
            <div class="metrics-grid">
              <div class="metric-item">
                <span class="metric-label">Photo Size:</span>
                <span class="metric-val">{{ currentMetrics().photoWidthMm }} × {{ currentMetrics().photoHeightMm }} mm</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Pixel Dimension (300 DPI):</span>
                <span class="metric-val">{{ currentMetrics().photoWidthPx }} × {{ currentMetrics().photoHeightPx }} px</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Head Height Req:</span>
                <span class="metric-val">{{ currentSpec().minHeadHeightMm }} – {{ currentSpec().maxHeadHeightMm }} mm</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Sheet Yield:</span>
                <span class="metric-val font-bold text-success">{{ currentMetrics().photosPerSheet }} photos per sheet</span>
              </div>
            </div>

            <div class="compliance-notes g--margin-top-3">
              <h4 class="notes-title">Compliance Rules ({{ currentSpec().name }}):</h4>
              <ul class="notes-list">
                @for (note of currentSpec().complianceNotes; track note) {
                  <li>{{ note }}</li>
                }
              </ul>
            </div>
          </app-card>

          <!-- Export & Download Deliverable -->
          <app-card title="4. Export Deliverable">
            <div class="c-form-group g--margin-bottom-3">
              <label class="c-form-label">Export Deliverable Format</label>
              <div class="format-buttons">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="exportFormat() === 'jpg'"
                  [class.c-button--outline]="exportFormat() !== 'jpg'"
                  (click)="setExportFormat('jpg')"
                >
                  Print-Ready JPG
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="exportFormat() === 'pdf'"
                  [class.c-button--outline]="exportFormat() !== 'pdf'"
                  (click)="setExportFormat('pdf')"
                >
                  Print-Ready PDF
                </button>
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="exportFormat() === 'png'"
                  [class.c-button--outline]="exportFormat() !== 'png'"
                  (click)="setExportFormat('png')"
                >
                  Lossless PNG
                </button>
              </div>
            </div>

            @if (generationError()) {
              <div class="c-alert c-alert--danger g--margin-bottom-3">
                {{ generationError() }}
              </div>
            }

            <div class="action-bar">
              <button
                type="button"
                class="c-button c-button--primary c-button--large g--width-full"
                [disabled]="isGenerating()"
                (click)="generateDeliverable()"
              >
                @if (isGenerating()) {
                  <span>Rendering Print Sheet...</span>
                } @else {
                  <span>Download {{ exportFormat().toUpperCase() }} Sheet ({{ currentMetrics().photosPerSheet }} Photos)</span>
                }
              </button>
            </div>
          </app-card>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .preset-strip {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
        padding: 0.75rem 1rem;
        background: #f8fafc;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
      }
      .preset-label {
        font-weight: 600;
        font-size: 0.875rem;
        color: #475569;
      }
      .preset-buttons,
      .sample-pills,
      .bg-options,
      .sheet-buttons,
      .dpi-buttons,
      .format-buttons {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .preview-container {
        display: flex;
        justify-content: center;
        align-items: center;
        background: #1e293b;
        border-radius: 8px;
        padding: 1.5rem;
        overflow: hidden;
      }
      .canvas-wrapper {
        position: relative;
        display: inline-block;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
      }
      .c-preview-canvas {
        display: block;
        max-width: 100%;
        max-height: 400px;
        background: #ffffff;
        border-radius: 4px;
      }
      .biometric-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .biometric-line {
        position: absolute;
        left: 0;
        right: 0;
        border-top: 1px dashed rgba(239, 68, 68, 0.75);
      }
      .biometric-line--crown {
        top: 20%;
      }
      .biometric-line--eye {
        top: 45%;
        border-top-color: rgba(59, 130, 246, 0.75);
      }
      .biometric-line--chin {
        top: 75%;
      }
      .biometric-axis {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 50%;
        border-left: 1px dashed rgba(16, 185, 129, 0.6);
      }
      .biometric-tag {
        position: absolute;
        right: 6px;
        top: -16px;
        font-size: 0.65rem;
        background: rgba(15, 23, 42, 0.8);
        color: #f8fafc;
        padding: 1px 4px;
        border-radius: 3px;
      }
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
      }
      .metric-item {
        background: #f8fafc;
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
      }
      .metric-label {
        display: block;
        font-size: 0.75rem;
        color: #64748b;
      }
      .metric-val {
        font-weight: 600;
        font-size: 0.875rem;
        color: #1e293b;
      }
      .font-bold {
        font-weight: 700;
      }
      .text-success {
        color: #16a34a;
      }
      .notes-title {
        font-size: 0.85rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: #334155;
      }
      .notes-list {
        font-size: 0.8rem;
        color: #475569;
        padding-left: 1.25rem;
        margin: 0;
        line-height: 1.4;
      }
      .c-alert--danger {
        padding: 0.75rem;
        background: #fef2f2;
        color: #b91c1c;
        border: 1px solid #fecaca;
        border-radius: 6px;
        font-size: 0.875rem;
      }
    `,
  ],
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

  readonly imageSource = signal<string>(DUMMY_PORTRAIT_DATA_URL);
  readonly fileBlob = signal<File | Blob | null>(null);
  readonly fileName = signal<string>('sample-portrait.jpg');

  readonly isGenerating = signal<boolean>(false);
  readonly generationError = signal<string | null>(null);

  private createdObjectUrls: string[] = [];

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

  ngOnInit(): void {
    // Initial preview render
    setTimeout(() => {
      this.refreshPreviewCanvas();
    }, 50);
  }

  ngOnDestroy(): void {
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
    this.panX.set(x);
    this.panY.set(y);
    this.refreshPreviewCanvas();
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

  private async refreshPreviewCanvas(): Promise<void> {
    if (!this.previewCanvasRef?.nativeElement) return;
    try {
      const { canvas } = await renderPassportSheet(
        this.fileBlob() || this.imageSource(),
        this.currentOptions()
      );

      const target = this.previewCanvasRef.nativeElement;
      target.width = canvas.width;
      target.height = canvas.height;
      const ctx = target.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, target.width, target.height);
        ctx.drawImage(canvas, 0, 0);
      }
    } catch {
      // Ignored for headless or during rapid adjustment
    }
  }

  async generateDeliverable(): Promise<void> {
    this.isGenerating.set(true);
    this.generationError.set(null);

    try {
      const source = this.fileBlob() || this.imageSource();
      const result = await processPassportPhoto(
        source,
        this.currentOptions(),
        this.exportFormat()
      );

      if (result.success && result.blob) {
        this.triggerDownload(result.blob, result.fileName);
      }
    } catch (err: any) {
      this.generationError.set(err?.message || 'Failed to generate deliverable');
    } finally {
      this.isGenerating.set(false);
    }
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
  }
}
