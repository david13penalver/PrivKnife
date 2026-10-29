import { TranslatePipe } from '../../../core/i18n';
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
  getCanvasDimensions,
  renderMockupToCanvas,
} from './engine';
import {
  DEFAULT_MOCKUP_CONFIG,
  GRADIENT_PALETTES,
  SAMPLE_PRESETS,
  SamplePreset,
  createSyntheticScreenshotDataUrl,
} from './test-fixtures';
import {
  AnglePreset,
  BackgroundStyle,
  CanvasSizePreset,
  ChassisColor,
  DeviceType,
  ExportFormat,
  ExportResult,
  ExportScale,
  GradientPreset,
  ImageFitMode,
  MockupConfig,
} from './types';

@Component({
  selector: 'app-screenshot-mockup',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Badge, Dropzone, Card, TranslatePipe],
  template: `
    <div class="l-columns l-columns--1 g--margin-x-auto" style="max-width: 1200px;">
      <!-- Tool Header & Privacy Badge -->
      <div class="l-columns__area g--text-center g--margin-bottom-6">
        <div class="g--flex-center g--margin-bottom-3">
          <app-badge variant="privacy" [dot]="true">
            {{ 'common.privacyBadge' | translate }}
          </app-badge>
        </div>
        <h1 style="font-size: clamp(1.8rem, 4vw, 2.75rem); font-weight: 800; line-height: 1.2; letter-spacing: -0.02em;">{{ 'tools.screenshotMockup.name' | translate }}</h1>
        <p class="g--margin-top-2 g--margin-x-auto" style="max-width: 760px; color: var(--color-text-secondary); font-size: 1.1rem;">
          {{ 'tools.screenshotMockup.description' | translate }}
        </p>
      </div>

      <!-- Main Studio Workspace (12 cols) -->
      <div class="l-columns l-columns--12 mockup-workspace" style="gap: 24px; align-items: start;">
        <!-- Left: Live Canvas Viewport (7 cols) -->
        <div class="l-columns__area l-columns__area--span-7">
          <app-card title="Interactive Device Viewport">
            <div class="l-columns l-columns--1" style="gap: 16px;">
              <!-- Viewport Canvas Container -->
              <div
                style="position: relative; width: 100%; background: #07080b; border-radius: 12px; border: 1px solid var(--color-border); overflow: hidden; display: flex; align-items: center; justify-content: center; min-height: 480px; box-shadow: inset 0 2px 12px rgba(0,0,0,0.4);">
                
                <canvas
                  #mockupCanvas
                  style="max-width: 100%; max-height: 520px; object-fit: contain; display: block; border-radius: 8px;">
                </canvas>

                <!-- Canvas Dimensions & Angle Tag -->
                <div style="position: absolute; bottom: 12px; left: 12px; display: flex; gap: 8px; z-index: 10;">
                  <span class="c-badge c-badge--outline" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); font-size: 0.75rem; color: #e2e8f0;">
                    📐 {{ currentDimensions().width }} &times; {{ currentDimensions().height }} px
                  </span>
                  <span class="c-badge c-badge--outline" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); font-size: 0.75rem; color: #a5b4fc; text-transform: capitalize;">
                    🎯 {{ config().anglePreset }}
                  </span>
                </div>
              </div>

              <!-- Quick Demo Presets Deck -->
              <div class="l-columns l-columns--1" style="gap: 8px;">
                <div class="g--flex-center" style="justify-content: space-between;">
                  <span style="font-size: 0.85rem; font-weight: 600; color: var(--color-text-secondary);">
                    🎬 Instant Demo Presets
                  </span>
                  @if (screenshotDataUrl()) {
                    <button
                      type="button"
                      class="c-button c-button--outline c-button--small"
                      (click)="clearScreenshot()"
                      style="font-size: 0.75rem; padding: 4px 8px;">
                      Clear Screenshot
                    </button>
                  }
                </div>
                <div class="g--flex-center" style="gap: 8px; flex-wrap: wrap;">
                  @for (preset of samplePresets; track preset.id) {
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--outline]="selectedSampleId() !== preset.id"
                      [class.c-button--primary]="selectedSampleId() === preset.id"
                      (click)="loadSamplePreset(preset)">
                      {{ preset.name }}
                    </button>
                  }
                </div>
              </div>

              <!-- Drag-and-Drop Image Uploader -->
              <app-dropzone
                label="Drop your app screenshot here or click to browse"
                hint="Supports PNG, JPG, WebP, or SVG screenshots up to 50MB &bull; Stays 100% in local memory"
                accept="image/*,.png,.jpg,.jpeg,.webp,.svg"
                [multiple]="false"
                (filesSelected)="onScreenshotFileSelected($event)">
              </app-dropzone>
            </div>
          </app-card>
        </div>

        <!-- Right: Control Deck (5 cols) -->
        <div class="l-columns__area l-columns__area--span-5" style="display: flex; flex-direction: column; gap: 20px;">
          <!-- 1. Device & Angle Controls Card -->
          <app-card title="Device & Perspective Angle">
            <div class="l-columns l-columns--1" style="gap: 16px;">
              <!-- Device Model Selector -->
              <div>
                <label class="c-input__label" style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.85rem;">
                  Device Archetype
                </label>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
                  @for (dev of deviceTypes; track dev.id) {
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().deviceType === dev.id"
                      [class.c-button--outline]="config().deviceType !== dev.id"
                      (click)="setDeviceType(dev.id)"
                      style="justify-content: center; font-size: 0.8rem; padding: 6px 4px;">
                      {{ dev.icon }} {{ dev.label }}
                    </button>
                  }
                </div>
              </div>

              <!-- 3D Perspective Angles -->
              <div>
                <label class="c-input__label" style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.85rem;">
                  3D Perspective Angle
                </label>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
                  @for (ang of anglePresets; track ang.id) {
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().anglePreset === ang.id"
                      [class.c-button--outline]="config().anglePreset !== ang.id"
                      (click)="setAnglePreset(ang.id)"
                      style="justify-content: center; font-size: 0.78rem; padding: 6px 4px;">
                      {{ ang.label }}
                    </button>
                  }
                </div>
              </div>

              <!-- Metallic Chassis Finish -->
              <div>
                <label class="c-input__label" style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.85rem;">
                  Chassis Finish
                </label>
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px;">
                  @for (ch of chassisColors; track ch.id) {
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().chassisColor === ch.id"
                      [class.c-button--outline]="config().chassisColor !== ch.id"
                      (click)="setChassisColor(ch.id)"
                      style="justify-content: center; font-size: 0.75rem; padding: 6px 2px;"
                      [title]="ch.label">
                      {{ ch.label }}
                    </button>
                  }
                </div>
              </div>

              <!-- Image Fitting Mode -->
              <div>
                <label class="c-input__label" style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.85rem;">
                  Screenshot Screen Fit
                </label>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 6px;">
                  @for (fit of imageFitModes; track fit.id) {
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().imageFit === fit.id"
                      [class.c-button--outline]="config().imageFit !== fit.id"
                      (click)="setImageFit(fit.id)"
                      style="justify-content: center; font-size: 0.78rem;">
                      {{ fit.label }}
                    </button>
                  }
                </div>
              </div>
            </div>
          </app-card>

          <!-- 2. Background & Canvas Sizing Card -->
          <app-card title="Background & Aspect Ratio">
            <div class="l-columns l-columns--1" style="gap: 16px;">
              <!-- Background Style Toggle -->
              <div>
                <label class="c-input__label" style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.85rem;">
                  Background Style
                </label>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(95px, 1fr)); gap: 6px;">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="config().backgroundStyle === 'gradient'"
                    [class.c-button--outline]="config().backgroundStyle !== 'gradient'"
                    (click)="setBackgroundStyle('gradient')"
                    style="justify-content: center; font-size: 0.8rem;">
                    🎨 Gradient
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="config().backgroundStyle === 'solid'"
                    [class.c-button--outline]="config().backgroundStyle !== 'solid'"
                    (click)="setBackgroundStyle('solid')"
                    style="justify-content: center; font-size: 0.8rem;">
                    ⬛ Solid Color
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="config().backgroundStyle === 'transparent'"
                    [class.c-button--outline]="config().backgroundStyle !== 'transparent'"
                    (click)="setBackgroundStyle('transparent')"
                    style="justify-content: center; font-size: 0.8rem;">
                    🏁 Transparent
                  </button>
                </div>
              </div>

              <!-- Gradient Presets (if gradient selected) -->
              @if (config().backgroundStyle === 'gradient') {
                <div>
                  <label class="c-input__label" style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.85rem;">
                    Gradient Color Palette
                  </label>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(70px, 1fr)); gap: 6px;">
                    @for (grad of gradientPresets; track grad.id) {
                      <button
                        type="button"
                        class="c-button c-button--small"
                        [class.c-button--primary]="config().gradientPreset === grad.id"
                        [class.c-button--outline]="config().gradientPreset !== grad.id"
                        (click)="setGradientPreset(grad.id)"
                        style="justify-content: center; font-size: 0.75rem; padding: 6px 2px;">
                        {{ grad.label }}
                      </button>
                    }
                  </div>
                </div>
              }

              <!-- Solid Color Picker (if solid selected) -->
              @if (config().backgroundStyle === 'solid') {
                <div class="g--flex-center" style="gap: 12px;">
                  <input
                    type="color"
                    [value]="config().customBgColor"
                    (input)="onCustomColorChange($event)"
                    style="width: 48px; height: 38px; border: 1px solid var(--color-border); border-radius: 6px; cursor: pointer; padding: 0; background: none;">
                  <span style="font-family: monospace; font-size: 0.9rem;">{{ config().customBgColor }}</span>
                </div>
              }

              <!-- Canvas Aspect Ratio Preset -->
              <div>
                <label class="c-input__label" style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.85rem;">
                  Export Canvas Size &amp; Aspect Ratio
                </label>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); gap: 6px;">
                  @for (sz of canvasSizePresets; track sz.id) {
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().canvasSizePreset === sz.id"
                      [class.c-button--outline]="config().canvasSizePreset !== sz.id"
                      (click)="setCanvasSizePreset(sz.id)"
                      style="justify-content: center; font-size: 0.75rem; padding: 6px 4px;">
                      {{ sz.label }}
                    </button>
                  }
                </div>
              </div>
            </div>
          </app-card>

          <!-- 3. Lighting, Shadows & Export Card -->
          <app-card title="Lighting, Shadows & Export">
            <div class="l-columns l-columns--1" style="gap: 16px;">
              <!-- Shadow Intensity Slider -->
              <div>
                <div class="g--flex-center" style="justify-content: space-between; margin-bottom: 4px;">
                  <span style="font-size: 0.85rem; font-weight: 600;">Drop Shadow Intensity</span>
                  <span style="font-size: 0.8rem; color: var(--color-text-secondary); font-family: monospace;">
                    {{ config().shadowIntensity }}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  [value]="config().shadowIntensity"
                  (input)="onShadowIntensityChange($event)"
                  style="width: 100%;">
              </div>

              <!-- Glass Reflection Glare Slider -->
              <div>
                <div class="g--flex-center" style="justify-content: space-between; margin-bottom: 4px;">
                  <span style="font-size: 0.85rem; font-weight: 600;">Glass Reflection Glare</span>
                  <span style="font-size: 0.8rem; color: var(--color-text-secondary); font-family: monospace;">
                    {{ config().glareOpacity }}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  [value]="config().glareOpacity"
                  (input)="onGlareOpacityChange($event)"
                  style="width: 100%;">
              </div>

              <!-- Device Zoom / Scale -->
              <div>
                <div class="g--flex-center" style="justify-content: space-between; margin-bottom: 4px;">
                  <span style="font-size: 0.85rem; font-weight: 600;">Device Viewport Scale</span>
                  <span style="font-size: 0.8rem; color: var(--color-text-secondary); font-family: monospace;">
                    {{ (config().deviceScale * 100).toFixed(0) }}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.3"
                  step="0.05"
                  [value]="config().deviceScale"
                  (input)="onDeviceScaleChange($event)"
                  style="width: 100%;">
              </div>

              <div style="border-top: 1px solid var(--color-border); padding-top: 14px;">
                <!-- Export Scale Selection -->
                <div class="g--margin-bottom-3">
                  <label class="c-input__label" style="display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.85rem;">
                    Resolution Export Multiplier
                  </label>
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().exportScale === 1"
                      [class.c-button--outline]="config().exportScale !== 1"
                      (click)="setExportScale(1)"
                      style="justify-content: center; font-size: 0.8rem;">
                      1&times; (Standard)
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().exportScale === 2"
                      [class.c-button--outline]="config().exportScale !== 2"
                      (click)="setExportScale(2)"
                      style="justify-content: center; font-size: 0.8rem;">
                      2&times; (Retina)
                    </button>
                    <button
                      type="button"
                      class="c-button c-button--small"
                      [class.c-button--primary]="config().exportScale === 4"
                      [class.c-button--outline]="config().exportScale !== 4"
                      (click)="setExportScale(4)"
                      style="justify-content: center; font-size: 0.8rem;">
                      4&times; (Ultra 4K)
                    </button>
                  </div>
                </div>

                <!-- Export Action Buttons -->
                <div class="l-columns l-columns--1" style="gap: 8px;">
                  <button
                    type="button"
                    class="c-button c-button--primary"
                    (click)="exportAndDownloadMockup('png')"
                    [disabled]="isRendering()"
                    style="width: 100%; justify-content: center; padding: 12px 16px; font-size: 1rem; font-weight: 700;">
                    📥 Download High-Res PNG
                  </button>

                  <button
                    type="button"
                    class="c-button c-button--outline c-button--small"
                    (click)="exportAndDownloadMockup('webp')"
                    [disabled]="isRendering()"
                    style="width: 100%; justify-content: center;">
                    ⚡ Export Modern WebP
                  </button>
                </div>
              </div>
            </div>
          </app-card>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      @media (max-width: 1024px) {
        .mockup-workspace {
          grid-template-columns: 1fr !important;
        }

        .mockup-workspace > .l-columns__area {
          grid-column: span 1 !important;
        }
      }
    `,
  ],
})
export class ScreenshotMockupComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mockupCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly samplePresets = SAMPLE_PRESETS;

  readonly deviceTypes: { id: DeviceType; label: string; icon: string }[] = [
    { id: 'phone', label: 'Phone', icon: '📱' },
    { id: 'tablet', label: 'Tablet', icon: '📟' },
    { id: 'laptop', label: 'Laptop', icon: '💻' },
    { id: 'browser', label: 'Browser', icon: '🌐' },
  ];

  readonly anglePresets: { id: AnglePreset; label: string }[] = [
    { id: 'front', label: 'Flat Front' },
    { id: 'isometric-left', label: 'Iso Left' },
    { id: 'isometric-right', label: 'Iso Right' },
    { id: 'tilt-dynamic', label: 'Hero Tilt' },
    { id: 'float', label: 'Float' },
  ];

  readonly chassisColors: { id: ChassisColor; label: string }[] = [
    { id: 'midnight', label: 'Midnight' },
    { id: 'silver', label: 'Silver' },
    { id: 'gold', label: 'Gold' },
    { id: 'deep-purple', label: 'Purple' },
    { id: 'cyber-black', label: 'Onyx' },
  ];

  readonly gradientPresets: { id: GradientPreset; label: string }[] = [
    { id: 'sunset', label: 'Sunset' },
    { id: 'aurora', label: 'Aurora' },
    { id: 'cyberpunk', label: 'Cyber' },
    { id: 'hyper-purple', label: 'Violet' },
    { id: 'dark-slate', label: 'Slate' },
    { id: 'minimal-light', label: 'Light' },
    { id: 'emerald', label: 'Emerald' },
  ];

  readonly canvasSizePresets: { id: CanvasSizePreset; label: string }[] = [
    { id: 'twitter-landscape', label: '16:9 (1920&times;1080)' },
    { id: 'social-square', label: '1:1 (1200&times;1200)' },
    { id: 'app-store-portrait', label: '9:16 (1080&times;1920)' },
    { id: 'dribbble', label: '4:3 (1600&times;1200)' },
    { id: 'product-hunt', label: 'PH (1270&times;760)' },
  ];

  readonly imageFitModes: { id: ImageFitMode; label: string }[] = [
    { id: 'cover', label: 'Cover' },
    { id: 'contain', label: 'Contain' },
    { id: 'stretch', label: 'Stretch' },
  ];

  // State Signals
  readonly config = signal<MockupConfig>({ ...DEFAULT_MOCKUP_CONFIG });
  readonly screenshotImage = signal<HTMLImageElement | null>(null);
  readonly screenshotDataUrl = signal<string | null>(null);
  readonly screenshotFileName = signal<string>('app-mockup');
  readonly isRendering = signal<boolean>(false);
  readonly exportResult = signal<ExportResult | null>(null);
  readonly selectedSampleId = signal<string | null>(null);

  readonly currentDimensions = computed(() => {
    return getCanvasDimensions(this.config().canvasSizePreset, 1);
  });

  private activeObjectUrls: string[] = [];

  ngAfterViewInit(): void {
    // Render initial canvas preview
    this.redrawCanvas();
  }

  ngOnDestroy(): void {
    this.cleanupUrls();
  }

  onScreenshotFileSelected(files: File[]): void {
    if (!files || files.length === 0) return;
    const file = files[0];
    const cleanName = file.name.replace(/\.[^/.]+$/, '');
    this.screenshotFileName.set(cleanName);
    this.selectedSampleId.set(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.screenshotDataUrl.set(dataUrl);
      this.loadImageFromDataUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  loadSamplePreset(preset: SamplePreset): void {
    this.selectedSampleId.set(preset.id);
    this.screenshotFileName.set(preset.id);

    this.config.update((c) => ({
      ...c,
      deviceType: preset.deviceType,
      gradientPreset: preset.gradientPreset,
      backgroundStyle: 'gradient',
    }));

    const dataUrl = createSyntheticScreenshotDataUrl(preset);
    this.screenshotDataUrl.set(dataUrl);
    this.loadImageFromDataUrl(dataUrl);
  }

  clearScreenshot(): void {
    this.screenshotImage.set(null);
    this.screenshotDataUrl.set(null);
    this.selectedSampleId.set(null);
    this.redrawCanvas();
  }

  private loadImageFromDataUrl(dataUrl: string): void {
    const img = new Image();
    img.onload = () => {
      this.screenshotImage.set(img);
      this.redrawCanvas();
    };
    img.src = dataUrl;
  }

  setDeviceType(type: DeviceType): void {
    this.config.update((c) => ({ ...c, deviceType: type }));
    this.redrawCanvas();
  }

  setAnglePreset(preset: AnglePreset): void {
    this.config.update((c) => ({ ...c, anglePreset: preset }));
    this.redrawCanvas();
  }

  setChassisColor(color: ChassisColor): void {
    this.config.update((c) => ({ ...c, chassisColor: color }));
    this.redrawCanvas();
  }

  setImageFit(fit: ImageFitMode): void {
    this.config.update((c) => ({ ...c, imageFit: fit }));
    this.redrawCanvas();
  }

  setBackgroundStyle(style: BackgroundStyle): void {
    this.config.update((c) => ({ ...c, backgroundStyle: style }));
    this.redrawCanvas();
  }

  setGradientPreset(preset: GradientPreset): void {
    this.config.update((c) => ({
      ...c,
      gradientPreset: preset,
      backgroundStyle: 'gradient',
    }));
    this.redrawCanvas();
  }

  setCanvasSizePreset(preset: CanvasSizePreset): void {
    this.config.update((c) => ({ ...c, canvasSizePreset: preset }));
    this.redrawCanvas();
  }

  setExportScale(scale: ExportScale): void {
    this.config.update((c) => ({ ...c, exportScale: scale }));
  }

  onCustomColorChange(e: Event): void {
    const val = (e.target as HTMLInputElement).value;
    this.config.update((c) => ({
      ...c,
      customBgColor: val,
      backgroundStyle: 'solid',
    }));
    this.redrawCanvas();
  }

  onShadowIntensityChange(e: Event): void {
    const val = Number((e.target as HTMLInputElement).value);
    this.config.update((c) => ({ ...c, shadowIntensity: val }));
    this.redrawCanvas();
  }

  onGlareOpacityChange(e: Event): void {
    const val = Number((e.target as HTMLInputElement).value);
    this.config.update((c) => ({ ...c, glareOpacity: val }));
    this.redrawCanvas();
  }

  onDeviceScaleChange(e: Event): void {
    const val = Number((e.target as HTMLInputElement).value);
    this.config.update((c) => ({ ...c, deviceScale: val }));
    this.redrawCanvas();
  }

  redrawCanvas(): void {
    if (!this.canvasRef || !this.canvasRef.nativeElement) return;
    const canvas = this.canvasRef.nativeElement;
    renderMockupToCanvas(canvas, this.config(), this.screenshotImage(), 1);
  }

  async exportAndDownloadMockup(format: ExportFormat = 'png'): Promise<void> {
    this.isRendering.set(true);

    try {
      const offscreen = document.createElement('canvas');
      const scaleMultiplier = this.config().exportScale;
      renderMockupToCanvas(
        offscreen,
        this.config(),
        this.screenshotImage(),
        scaleMultiplier
      );

      const mimeType = format === 'webp' ? 'image/webp' : 'image/png';
      const ext = format === 'webp' ? 'webp' : 'png';
      const fileName = `${this.screenshotFileName()}-${this.config().deviceType}-${this.config().anglePreset}.${ext}`;

      const blob = await new Promise<Blob | null>((resolve) => {
        offscreen.toBlob((b) => resolve(b), mimeType, 0.95);
      });

      if (!blob) {
        throw new Error('Failed to generate image blob');
      }

      this.triggerDownload(blob, fileName);
    } finally {
      this.isRendering.set(false);
    }
  }

  triggerDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    this.activeObjectUrls.push(url);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Prompt memory hygiene
    URL.revokeObjectURL(url);
    const idx = this.activeObjectUrls.indexOf(url);
    if (idx > -1) this.activeObjectUrls.splice(idx, 1);
  }

  setExportResultForTest(result: ExportResult): void {
    this.exportResult.set(result);
  }

  resetToDefaults(): void {
    this.cleanupUrls();
    this.config.set({ ...DEFAULT_MOCKUP_CONFIG });
    this.screenshotImage.set(null);
    this.screenshotDataUrl.set(null);
    this.screenshotFileName.set('app-mockup');
    this.selectedSampleId.set(null);
    this.exportResult.set(null);
    this.redrawCanvas();
  }

  private cleanupUrls(): void {
    for (const url of this.activeObjectUrls) {
      URL.revokeObjectURL(url);
    }
    this.activeObjectUrls = [];
  }
}
