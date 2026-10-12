import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Badge } from '../../../components/badge/badge';
import { Card } from '../../../components/card/card';
import { Dropzone } from '../../../components/dropzone/dropzone';
import {
  pixelsToPngBlob,
  removeBackgroundFromPixels,
} from './engine';
import {
  DEFAULT_REMOVER_CONFIG,
  SAMPLE_IMAGES,
} from './test-fixtures';
import {
  BackdropMode,
  BackgroundRemoverConfig,
  PresetSampleImage,
  RemovalMetrics,
  SegmentationMode,
} from './types';

@Component({
  selector: 'app-background-remover',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Badge, Card, Dropzone],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1280px; padding: 0 16px;">
      <!-- Header & Privacy Indicator -->
      <div class="l-columns__area g--text-center g--margin-bottom-6">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="privacy" [dot]="true">
            🛡️ 100% In-Browser Machine Processing &bull; Zero Server Ingestion &bull; Zero Telemetry
          </app-badge>
        </div>
        <h1 style="font-size: clamp(1.8rem, 4vw, 2.75rem); font-weight: 800; line-height: 1.2; letter-spacing: -0.02em;">
          Automated Background Removal (High Quality)
        </h1>
        <p class="g--margin-top-2 g--margin-x-auto" style="max-width: 780px; color: var(--color-text-secondary); font-size: 1.1rem;">
          Instant, client-side background removal producing clean transparent <strong>.png</strong> cutouts.
          100% private in-browser execution with edge anti-aliasing, color de-contamination, and zero server uploads.
        </p>
      </div>

      <!-- Presets Ribbon -->
      <div class="l-columns__area g--margin-bottom-5">
        <div class="c-card" style="padding: 12px 16px;">
          <div class="g--flex-center" style="justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div class="g--flex-center" style="gap: 8px; flex-wrap: wrap;">
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--color-text-secondary);">Sample Images:</span>
              @for (sample of sampleImages; track sample.id) {
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="selectedSampleId() === sample.id"
                  [class.c-button--outline]="selectedSampleId() !== sample.id"
                  (click)="loadSampleImage(sample)">
                  {{ sample.name }}
                </button>
              }
            </div>
            <button
              type="button"
              class="c-button c-button--small c-button--ghost"
              (click)="resetToDefaults()">
              ↺ Reset Defaults
            </button>
          </div>
        </div>
      </div>

      <!-- Main Layout: Controls Left (5 cols) vs Canvas / Split-View Right (7 cols) -->
      <div class="l-columns l-columns--12" style="gap: 24px; align-items: start;">
        
        <!-- Controls Column (5 cols) -->
        <div class="l-columns__area l-columns__area--span-5">
          <div class="l-columns l-columns--1" style="gap: 16px;">
            
            <!-- 1. Image Upload Dropzone -->
            <app-card title="1. Select or Drop Image">
              <div class="l-columns l-columns--1" style="gap: 12px;">
                <app-dropzone
                  label="Drop photo or graphic here or click to browse"
                  hint="PNG, JPG, WEBP, SVG — processed 100% locally in browser memory"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  [multiple]="false"
                  (filesSelected)="onImageFilesSelected($event)">
                </app-dropzone>

                <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                  <span style="color: var(--color-text-secondary);">Active File:</span>
                  <strong>{{ currentImageName() }} ({{ imageWidth() }} &times; {{ imageHeight() }} px)</strong>
                </div>
              </div>
            </app-card>

            <!-- 2. Segmentation & Sensitivity -->
            <app-card title="2. Segmentation Mode &amp; Tolerance">
              <div class="l-columns l-columns--1" style="gap: 12px;">
                <!-- Mode Selection -->
                <div>
                  <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 6px;">
                    Algorithm Mode:
                  </label>
                  <div class="l-columns l-columns--2" style="gap: 8px;">
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().mode === 'auto-subject'"
                      [class.c-button--outline]="config().mode !== 'auto-subject'"
                      (click)="setMode('auto-subject')">
                      Auto Subject
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().mode === 'light-bg'"
                      [class.c-button--outline]="config().mode !== 'light-bg'"
                      (click)="setMode('light-bg')">
                      Studio White
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().mode === 'chroma-key'"
                      [class.c-button--outline]="config().mode !== 'chroma-key'"
                      (click)="setMode('chroma-key')">
                      Chroma Key
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().mode === 'dark-bg'"
                      [class.c-button--outline]="config().mode !== 'dark-bg'"
                      (click)="setMode('dark-bg')">
                      Dark Backdrop
                    </button>
                  </div>
                </div>

                @if (config().mode === 'chroma-key') {
                  <div style="padding-top: 6px; border-top: 1px solid var(--color-border);">
                    <label style="font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 4px;">
                      Target Key Color:
                    </label>
                    <div class="g--flex-center" style="gap: 8px;">
                      <input
                        type="color"
                        [ngModel]="config().targetColor"
                        (ngModelChange)="updateTargetColor($event)"
                        style="width: 40px; height: 36px; border: none; border-radius: 4px; cursor: pointer;" />
                      <span style="font-family: monospace; font-size: 0.85rem;">{{ config().targetColor }}</span>
                    </div>
                  </div>
                }

                <!-- Tolerance Slider -->
                <div>
                  <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                    <span style="font-weight: 600;">Removal Sensitivity:</span>
                    <span style="font-family: monospace;">{{ config().tolerance }}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="85"
                    step="1"
                    [ngModel]="config().tolerance"
                    (ngModelChange)="updateTolerance($event)"
                    style="width: 100%; margin-top: 4px;" />
                </div>

                <!-- Edge Feathering -->
                <div>
                  <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                    <span style="font-weight: 600;">Edge Feather / Softness:</span>
                    <span style="font-family: monospace;">{{ config().featherRadius }} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="0.5"
                    [ngModel]="config().featherRadius"
                    (ngModelChange)="updateFeather($event)"
                    style="width: 100%; margin-top: 4px;" />
                </div>

                <!-- Defringing Halo Removal -->
                <div>
                  <div class="g--flex-center" style="justify-content: space-between; font-size: 0.85rem;">
                    <span style="font-weight: 600;">Halo Defringe Radius:</span>
                    <span style="font-family: monospace;">{{ config().defringeRadius }} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="4"
                    step="1"
                    [ngModel]="config().defringeRadius"
                    (ngModelChange)="updateDefringe($event)"
                    style="width: 100%; margin-top: 4px;" />
                </div>
              </div>
            </app-card>

            <!-- 3. Backdrop Style -->
            <app-card title="3. Backdrop Replacement Style">
              <div class="l-columns l-columns--1" style="gap: 12px;">
                <div class="g--flex-center" style="gap: 8px; flex-wrap: wrap;">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="config().backdropMode === 'transparent'"
                    [class.c-button--outline]="config().backdropMode !== 'transparent'"
                    (click)="setBackdropMode('transparent')">
                    🏁 Transparent PNG
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="config().backdropMode === 'solid'"
                    [class.c-button--outline]="config().backdropMode !== 'solid'"
                    (click)="setBackdropMode('solid')">
                    🎨 Solid Color
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="config().backdropMode === 'gradient'"
                    [class.c-button--outline]="config().backdropMode !== 'gradient'"
                    (click)="setBackdropMode('gradient')">
                    ✨ Studio Spotlight
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="config().backdropMode === 'mask-only'"
                    [class.c-button--outline]="config().backdropMode !== 'mask-only'"
                    (click)="setBackdropMode('mask-only')">
                    ⬛ Alpha Matte
                  </button>
                </div>

                @if (config().backdropMode === 'solid') {
                  <div class="g--flex-center" style="gap: 12px; margin-top: 4px;">
                    <label style="font-size: 0.85rem; font-weight: 600;">Backdrop Color:</label>
                    <input
                      type="color"
                      [ngModel]="config().backdropColor"
                      (ngModelChange)="updateBackdropColor($event)"
                      style="width: 40px; height: 36px; border: none; border-radius: 4px; cursor: pointer;" />
                    <span style="font-family: monospace; font-size: 0.85rem;">{{ config().backdropColor }}</span>
                  </div>
                }
              </div>
            </app-card>
          </div>
        </div>

        <!-- Canvas & Deliverables Column (7 cols) -->
        <div class="l-columns__area l-columns__area--span-7">
          <div class="l-columns l-columns--1" style="gap: 16px;">
            
            <!-- Canvas Viewport Card -->
            <app-card title="Interactive Split-View Comparison">
              <!-- View Controls Toolbar -->
              <div class="g--flex-center g--margin-bottom-3" style="justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                <div class="g--flex-center" style="gap: 8px;">
                  <span style="font-size: 0.85rem; font-weight: 600;">Split:</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    [ngModel]="config().splitPosition"
                    (ngModelChange)="updateSplitPosition($event)"
                    style="width: 120px;" />
                  <span style="font-size: 0.85rem; font-family: monospace;">{{ config().splitPosition }}%</span>
                </div>

                <div class="g--flex-center" style="gap: 6px;">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="viewMode() === 'split'"
                    [class.c-button--outline]="viewMode() !== 'split'"
                    (click)="setViewMode('split')">
                    Split View
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="viewMode() === 'cutout'"
                    [class.c-button--outline]="viewMode() !== 'cutout'"
                    (click)="setViewMode('cutout')">
                    Cutout Only
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="viewMode() === 'original'"
                    [class.c-button--outline]="viewMode() !== 'original'"
                    (click)="setViewMode('original')">
                    Original
                  </button>
                </div>
              </div>

              <!-- Main Canvas Container with Checkerboard Background -->
              <div
                style="width: 100%; min-height: 420px; background-color: #0f172a; background-image: linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px; border-radius: 8px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; border: 1px solid var(--color-border);">
                <canvas
                  #renderCanvas
                  style="max-width: 100%; max-height: 420px; display: block; object-fit: contain;">
                </canvas>
              </div>

              <!-- Metrics Info Banner -->
              <div class="g--margin-top-3" style="background: var(--color-bg-secondary); border-radius: 6px; padding: 12px; font-size: 0.85rem;">
                <div class="l-columns l-columns--4" style="gap: 12px; text-align: center;">
                  <div>
                    <span style="color: var(--color-text-secondary); display: block; font-size: 0.75rem;">Resolution</span>
                    <strong style="font-size: 0.95rem;">{{ imageWidth() }} &times; {{ imageHeight() }} px</strong>
                  </div>
                  <div>
                    <span style="color: var(--color-text-secondary); display: block; font-size: 0.75rem;">Cutout Transparency</span>
                    <strong style="font-size: 0.95rem;">{{ metrics().transparencyPercent }}%</strong>
                  </div>
                  <div>
                    <span style="color: var(--color-text-secondary); display: block; font-size: 0.75rem;">Subject Pixels</span>
                    <strong style="font-size: 0.95rem;">{{ metrics().foregroundPixelCount.toLocaleString() }}</strong>
                  </div>
                  <div>
                    <span style="color: var(--color-text-secondary); display: block; font-size: 0.75rem;">Processing Latency</span>
                    <strong style="font-size: 0.95rem;">{{ metrics().processingTimeMs }} ms</strong>
                  </div>
                </div>
              </div>
            </app-card>

            <!-- Export Actions Card -->
            <app-card title="Export Deliverables (Client-Side Only)">
              <div class="l-columns l-columns--1" style="gap: 12px;">
                <div class="g--flex-center" style="gap: 10px; flex-wrap: wrap;">
                  <!-- Transparent PNG Download -->
                  <button
                    type="button"
                    class="c-button c-button--primary"
                    style="flex: 1; min-width: 200px;"
                    (click)="exportTransparentPng()">
                    ⬇️ Download Transparent PNG
                  </button>

                  <!-- Alpha Matte PNG -->
                  <button
                    type="button"
                    class="c-button c-button--outline"
                    style="flex: 1; min-width: 170px;"
                    (click)="exportAlphaMaskPng()">
                    Export Alpha Matte
                  </button>
                </div>

                <div class="g--flex-center" style="gap: 10px; flex-wrap: wrap;">
                  <!-- Copy to Clipboard -->
                  <button
                    type="button"
                    class="c-button c-button--secondary c-button--small"
                    style="flex: 1;"
                    (click)="copyToClipboard()">
                    {{ copyStatus() }}
                  </button>

                  <!-- Reset Image -->
                  <button
                    type="button"
                    class="c-button c-button--outline c-button--small"
                    (click)="resetToDefaults()">
                    ↺ Clear &amp; Reset
                  </button>
                </div>
              </div>
            </app-card>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class BackgroundRemoverComponent implements AfterViewInit, OnDestroy {
  @ViewChild('renderCanvas') renderCanvas!: ElementRef<HTMLCanvasElement>;

  readonly sampleImages = SAMPLE_IMAGES;

  readonly selectedSampleId = signal<string>('product-watch');
  readonly currentImageName = signal<string>('Luxury Chronograph Watch');
  readonly imageWidth = signal<number>(400);
  readonly imageHeight = signal<number>(400);
  readonly config = signal<BackgroundRemoverConfig>({ ...DEFAULT_REMOVER_CONFIG });
  readonly viewMode = signal<'split' | 'cutout' | 'original'>('split');
  readonly copyStatus = signal<string>('📋 Copy to Clipboard');

  // Pixel buffers
  private rawSourcePixels: Uint8ClampedArray = new Uint8ClampedArray(400 * 400 * 4).fill(255);
  private cachedCutoutPixels: Uint8ClampedArray = new Uint8ClampedArray(400 * 400 * 4);
  private cachedMask: Uint8ClampedArray = new Uint8ClampedArray(400 * 400);

  readonly metrics = signal<RemovalMetrics>({
    originalWidth: 400,
    originalHeight: 400,
    transparentPixelCount: 0,
    foregroundPixelCount: 400 * 400,
    transparencyPercent: 0,
    processingTimeMs: 0,
    fileSizeBytes: 0,
  });

  ngAfterViewInit(): void {
    this.loadSampleImage(this.sampleImages[0]);
  }

  ngOnDestroy(): void {
    // Memory hygiene
    this.rawSourcePixels = new Uint8ClampedArray(0);
    this.cachedCutoutPixels = new Uint8ClampedArray(0);
    this.cachedMask = new Uint8ClampedArray(0);
  }

  // --- Image Loading Handlers ---

  loadSampleImage(sample: PresetSampleImage): void {
    this.selectedSampleId.set(sample.id);
    this.currentImageName.set(sample.name);
    this.imageWidth.set(sample.width);
    this.imageHeight.set(sample.height);

    if (sample.recommendedConfig) {
      this.config.update((c) => ({
        ...c,
        ...sample.recommendedConfig,
      }));
    }

    this.renderSvgToPixels(sample.svgDataUri, sample.width, sample.height);
  }

  resetToDefaults(): void {
    this.config.set({ ...DEFAULT_REMOVER_CONFIG });
    this.loadSampleImage(this.sampleImages[0]);
  }

  onImageFilesSelected(files: File[]): void {
    if (!files || files.length === 0) return;
    const file = files[0];
    this.selectedSampleId.set('custom');
    this.currentImageName.set(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        this.imageWidth.set(w);
        this.imageHeight.set(h);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, w, h);
          this.rawSourcePixels = new Uint8ClampedArray(imgData.data);
          this.processAndRender();
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  private renderSvgToPixels(svgDataUri: string, width: number, height: number): void {
    if (typeof document === 'undefined') {
      // Headless mock
      this.generateMockPixels(width, height);
      this.processAndRender();
      return;
    }

    try {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, width, height);
          this.rawSourcePixels = new Uint8ClampedArray(imgData.data);
          this.processAndRender();
        }
      };
      img.onerror = () => {
        this.generateMockPixels(width, height);
        this.processAndRender();
      };
      img.src = svgDataUri;
    } catch {
      this.generateMockPixels(width, height);
      this.processAndRender();
    }
  }

  private generateMockPixels(width: number, height: number): void {
    this.rawSourcePixels = new Uint8ClampedArray(width * height * 4).fill(255);
    // Add center square subject
    const halfW = Math.floor(width / 2);
    const halfH = Math.floor(height / 2);
    for (let y = halfH - 40; y < halfH + 40; y++) {
      for (let x = halfW - 40; x < halfW + 40; x++) {
        const idx = (y * width + x) * 4;
        this.rawSourcePixels[idx] = 15;
        this.rawSourcePixels[idx + 1] = 23;
        this.rawSourcePixels[idx + 2] = 42;
      }
    }
  }

  // --- Configuration Handlers ---

  setMode(mode: SegmentationMode): void {
    this.config.update((c) => ({ ...c, mode }));
    this.processAndRender();
  }

  updateTargetColor(color: string): void {
    this.config.update((c) => ({ ...c, targetColor: color }));
    this.processAndRender();
  }

  updateTolerance(tol: number): void {
    this.config.update((c) => ({ ...c, tolerance: Number(tol) }));
    this.processAndRender();
  }

  updateFeather(rad: number): void {
    this.config.update((c) => ({ ...c, featherRadius: Number(rad) }));
    this.processAndRender();
  }

  updateDefringe(rad: number): void {
    this.config.update((c) => ({ ...c, defringeRadius: Number(rad) }));
    this.processAndRender();
  }

  setBackdropMode(mode: BackdropMode): void {
    this.config.update((c) => ({ ...c, backdropMode: mode }));
    this.processAndRender();
  }

  updateBackdropColor(color: string): void {
    this.config.update((c) => ({ ...c, backdropColor: color }));
    this.processAndRender();
  }

  updateSplitPosition(pos: number): void {
    this.config.update((c) => ({ ...c, splitPosition: Number(pos) }));
    this.drawCanvas();
  }

  setViewMode(mode: 'split' | 'cutout' | 'original'): void {
    this.viewMode.set(mode);
    this.drawCanvas();
  }

  // --- Processing Pipeline ---

  processAndRender(): void {
    const width = this.imageWidth();
    const height = this.imageHeight();

    if (this.rawSourcePixels.length !== width * height * 4) {
      this.generateMockPixels(width, height);
    }

    const { outputPixels, alphaMask, metrics } = removeBackgroundFromPixels(
      this.rawSourcePixels,
      width,
      height,
      this.config()
    );

    this.cachedCutoutPixels = outputPixels;
    this.cachedMask = alphaMask;
    this.metrics.set(metrics);

    this.drawCanvas();
  }

  private drawCanvas(): void {
    if (!this.renderCanvas) return;
    const canvas = this.renderCanvas.nativeElement;
    const width = this.imageWidth();
    const height = this.imageHeight();

    canvas.width = width;
    canvas.height = height;

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const mode = this.viewMode();
      const splitPos = this.config().splitPosition / 100;
      const splitX = Math.round(width * splitPos);

      const displayImgData = ctx.createImageData(width, height);
      const dest = displayImgData.data;

      if (mode === 'original') {
        dest.set(this.rawSourcePixels);
      } else if (mode === 'cutout') {
        dest.set(this.cachedCutoutPixels);
      } else {
        // 'split' comparison: Left is Original, Right is Cutout
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            if (x < splitX) {
              dest[idx] = this.rawSourcePixels[idx];
              dest[idx + 1] = this.rawSourcePixels[idx + 1];
              dest[idx + 2] = this.rawSourcePixels[idx + 2];
              dest[idx + 3] = this.rawSourcePixels[idx + 3];
            } else {
              dest[idx] = this.cachedCutoutPixels[idx];
              dest[idx + 1] = this.cachedCutoutPixels[idx + 1];
              dest[idx + 2] = this.cachedCutoutPixels[idx + 2];
              dest[idx + 3] = this.cachedCutoutPixels[idx + 3];
            }
          }
        }
      }

      ctx.putImageData(displayImgData, 0, 0);

      // Draw split divider line if in split mode
      if (mode === 'split' && splitX > 0 && splitX < width) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(splitX, 0);
        ctx.lineTo(splitX, height);
        ctx.stroke();
      }
    } catch {
      // In headless test environments
    }
  }

  // --- Export Actions ---

  exportTransparentPng(): void {
    const width = this.imageWidth();
    const height = this.imageHeight();
    const blob = pixelsToPngBlob(this.cachedCutoutPixels, width, height);
    this.triggerDownload(blob, `${this.cleanFilename()}_transparent.png`);
  }

  exportAlphaMaskPng(): void {
    const width = this.imageWidth();
    const height = this.imageHeight();
    const maskPixels = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const a = this.cachedMask[i];
      maskPixels[i * 4] = a;
      maskPixels[i * 4 + 1] = a;
      maskPixels[i * 4 + 2] = a;
      maskPixels[i * 4 + 3] = 255;
    }
    const blob = pixelsToPngBlob(maskPixels, width, height);
    this.triggerDownload(blob, `${this.cleanFilename()}_mask.png`);
  }

  async copyToClipboard(): Promise<void> {
    try {
      const width = this.imageWidth();
      const height = this.imageHeight();
      const blob = pixelsToPngBlob(this.cachedCutoutPixels, width, height);

      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        this.copyStatus.set('✅ Copied Cutout!');
      } else {
        this.copyStatus.set('⚠️ Clipboard Unavailable');
      }
    } catch {
      this.copyStatus.set('⚠️ Clipboard Error');
    }

    setTimeout(() => {
      this.copyStatus.set('📋 Copy to Clipboard');
    }, 2500);
  }

  private cleanFilename(): string {
    return this.currentImageName().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'image';
  }

  triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
