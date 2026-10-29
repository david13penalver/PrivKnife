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
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import {
  Badge,
  Card,
  Dropzone,
  ProgressBar,
} from '../../../components';
import {
  LithophaneGeometryType,
  LithophaneMakerOptions,
  LithophaneMetrics,
  PresetLithophane,
  BacklightColorMode,
  LithophaneWorkerRequest,
  LithophaneWorkerResponse,
} from './types';
import {
  calculateLithophaneMetrics,
  generateLithophaneGeometry,
  processLithophane,
} from './engine';
import {
  DEFAULT_LITHOPHANE_OPTIONS,
  LITHOPHANE_PRESETS,
  createSyntheticImageBuffer,
} from './test-fixtures';

@Component({
  selector: 'app-lithophane-maker',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    Badge,
    Card,
    Dropzone,
    ProgressBar,
    TranslatePipe,
  ],
  template: `
    <div class="l-page">
      <!-- Header -->
      <div class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">{{ 'tools.lithophaneMaker.name' | translate }}</h1>
          <p class="c-header__subtitle">
            {{ 'tools.lithophaneMaker.description' | translate }}
          </p>
        </div>
        <app-badge variant="privacy">
          {{ 'common.privacyBadge' | translate }}
        </app-badge>
      </div>

      <!-- Main Layout: 2 Columns -->
      <div class="l-columns l-columns--2">
        <!-- Controls Column -->
        <div class="l-columns__area">
          <!-- Preset Templates -->
          <app-card>
            <div class="c-card__header">
              <h2 class="c-card__title">{{ 'tools.lithophaneMaker.templatesTitle' | translate }}</h2>
            </div>
            <div class="c-card__body">
              <div class="litho-presets">
                @for (preset of presets; track preset.id) {
                  <button
                    type="button"
                    class="c-button c-button--outline litho-preset-btn"
                    [class.c-button--primary]="geometryType() === preset.geometryType"
                    (click)="applyPreset(preset)"
                  >
                    <strong>{{ preset.name }}</strong>
                    <span class="litho-preset-desc">{{ preset.description }}</span>
                  </button>
                }
              </div>
            </div>
          </app-card>

          <!-- Image Selection & Tuning -->
          <app-card class="g--margin-top-4">
            <div class="c-card__header">
              <h2 class="c-card__title">{{ 'tools.lithophaneMaker.imageTitle' | translate }}</h2>
            </div>
            <div class="c-card__body">
              <app-dropzone
                accept="image/png, image/jpeg, image/webp"
                subtitle="Drop your photo here (PNG, JPG, WebP) or click to browse"
                (filesSelected)="onFileDropped($event)"
              />

              <div class="sample-actions g--margin-top-3">
                <span class="g--text-muted">Or try a sample photo:</span>
                <div class="sample-btn-group">
                  <button type="button" class="c-button c-button--small c-button--outline" (click)="loadSampleImage('gradient')">
                    Sunburst Gradient
                  </button>
                  <button type="button" class="c-button c-button--small c-button--outline" (click)="loadSampleImage('circle')">
                    Portrait Vignette
                  </button>
                  <button type="button" class="c-button c-button--small c-button--outline" (click)="loadSampleImage('checker')">
                    Geometric Grid
                  </button>
                </div>
              </div>

              <!-- Contrast and Invert Controls -->
              <div class="control-row g--margin-top-4">
                <label class="c-input__label">
                  {{ 'tools.lithophaneMaker.contrastBoost' | translate }} <strong>{{ contrastFactor() | number:'1.2-2' }}x</strong>
                </label>
                <input
                  type="range"
                  class="c-input c-input__slider"
                  min="0.5"
                  max="2.2"
                  step="0.05"
                  [value]="contrastFactor()"
                  (input)="onContrastChange($event)"
                />
              </div>

              <div class="control-row g--margin-top-3">
                <label class="c-input__checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="invertLuminance()"
                    (change)="toggleInvert()"
                  />
                  <span>{{ 'tools.lithophaneMaker.invertRelief' | translate }}</span>
                </label>
              </div>
            </div>
          </app-card>

          <!-- Geometry & Sizing Parameters -->
          <app-card class="g--margin-top-4">
            <div class="c-card__header">
              <h2 class="c-card__title">{{ 'tools.lithophaneMaker.geometryTitle' | translate }}</h2>
            </div>
            <div class="c-card__body">
              <!-- Geometry Type Selector -->
              <div class="control-group">
                <label class="c-input__label">{{ 'tools.lithophaneMaker.geometryStyle' | translate }}</label>
                <div class="geom-button-row">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="geometryType() === 'flat'"
                    [class.c-button--outline]="geometryType() !== 'flat'"
                    (click)="setGeometryType('flat')"
                  >
                    Flat Plate
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="geometryType() === 'curve_arc'"
                    [class.c-button--outline]="geometryType() !== 'curve_arc'"
                    (click)="setGeometryType('curve_arc')"
                  >
                    Curved Arc
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="geometryType() === 'cylinder'"
                    [class.c-button--outline]="geometryType() !== 'cylinder'"
                    (click)="setGeometryType('cylinder')"
                  >
                    360° Cylinder
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="geometryType() === 'nightlight_panel'"
                    [class.c-button--outline]="geometryType() !== 'nightlight_panel'"
                    (click)="setGeometryType('nightlight_panel')"
                  >
                    Nightlight Tab
                  </button>
                </div>
              </div>

              <!-- Arc Degrees Slider (if curved) -->
              @if (geometryType() === 'curve_arc') {
                <div class="control-row g--margin-top-3">
                  <label class="c-input__label">
                    {{ 'tools.lithophaneMaker.arcAngle' | translate }} <strong>{{ arcDegrees() }}°</strong>
                  </label>
                  <input
                    type="range"
                    class="c-input c-input__slider"
                    min="30"
                    max="180"
                    step="5"
                    [value]="arcDegrees()"
                    (input)="onArcDegreesChange($event)"
                  />
                </div>
              }

              <!-- Width & Height -->
              <div class="param-grid g--margin-top-3">
                <div class="control-group">
                  <label class="c-input__label">{{ 'tools.lithophaneMaker.width' | translate }} <strong>{{ widthMm() }} mm</strong></label>
                  <input
                    type="range"
                    class="c-input c-input__slider"
                    min="50"
                    max="220"
                    step="5"
                    [value]="widthMm()"
                    (input)="onWidthChange($event)"
                  />
                </div>

                <div class="control-group">
                  <label class="c-input__label">{{ 'tools.lithophaneMaker.height' | translate }} <strong>{{ heightMm() }} mm</strong></label>
                  <input
                    type="range"
                    class="c-input c-input__slider"
                    min="40"
                    max="220"
                    step="5"
                    [value]="heightMm()"
                    (input)="onHeightChange($event)"
                  />
                </div>
              </div>

              <!-- Thickness Range -->
              <div class="param-grid g--margin-top-3">
                <div class="control-group">
                  <label class="c-input__label">
                    {{ 'tools.lithophaneMaker.minThickness' | translate }} <strong>{{ minThicknessMm() | number:'1.2-2' }} mm</strong>
                  </label>
                  <input
                    type="range"
                    class="c-input c-input__slider"
                    min="0.4"
                    max="1.6"
                    step="0.1"
                    [value]="minThicknessMm()"
                    (input)="onMinThicknessChange($event)"
                  />
                </div>

                <div class="control-group">
                  <label class="c-input__label">
                    {{ 'tools.lithophaneMaker.maxThickness' | translate }} <strong>{{ maxThicknessMm() | number:'1.2-2' }} mm</strong>
                  </label>
                  <input
                    type="range"
                    class="c-input c-input__slider"
                    min="1.8"
                    max="4.5"
                    step="0.1"
                    [value]="maxThicknessMm()"
                    (input)="onMaxThicknessChange($event)"
                  />
                </div>
              </div>

              <!-- Solid Border Frame -->
              <div class="param-grid g--margin-top-3">
                <div class="control-group">
                  <label class="c-input__label">Border {{ 'tools.lithophaneMaker.width' | translate }} <strong>{{ frameBorderWidthMm() }} mm</strong></label>
                  <input
                    type="range"
                    class="c-input c-input__slider"
                    min="0"
                    max="10"
                    step="1"
                    [value]="frameBorderWidthMm()"
                    (input)="onBorderWidthChange($event)"
                  />
                </div>

                <div class="control-group">
                  <label class="c-input__label">{{ 'tools.lithophaneMaker.borderDepth' | translate }} <strong>{{ frameBorderDepthMm() | number:'1.1-1' }} mm</strong></label>
                  <input
                    type="range"
                    class="c-input c-input__slider"
                    min="1.5"
                    max="5.0"
                    step="0.2"
                    [value]="frameBorderDepthMm()"
                    (input)="onBorderDepthChange($event)"
                  />
                </div>
              </div>

              <!-- Self-standing foot -->
              <div class="control-row g--margin-top-3">
                <label class="c-input__checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="baseStandSlot()"
                    (change)="toggleBaseStand()"
                  />
                  <span>{{ 'tools.lithophaneMaker.stabilizingFoot' | translate }}</span>
                </label>
              </div>
            </div>

            <div class="c-card__footer l-extremo">
              <div class="l-extremo__area-izquierda">
                <button
                  type="button"
                  class="c-button c-button--outline"
                  (click)="resetToDefaults()"
                >
                  {{ 'common.resetDefaults' | translate }}
                </button>
              </div>
            </div>
          </app-card>
        </div>

        <!-- 3D Viewport & Deliverables Column -->
        <div class="l-columns__area">
          <app-card>
            <div class="c-card__header l-extremo">
              <div class="l-extremo__area-izquierda">
                <h2 class="c-card__title">{{ 'tools.lithophaneMaker.viewportTitle' | translate }}</h2>
              </div>
              <!-- Backlight Simulator Toggle -->
              <div class="l-extremo__area-derecha backlight-toolbar">
                <button
                  type="button"
                  class="c-button c-button--small"
                  [class.c-button--primary]="backlightOn()"
                  [class.c-button--outline]="!backlightOn()"
                  (click)="toggleBacklight()"
                  title="Toggle real-time backlight transmission simulation"
                >
                  💡 {{ 'tools.lithophaneMaker.backlight' | translate }} {{ backlightOn() ? 'ON' : 'OFF' }}
                </button>
              </div>
            </div>

            <div class="c-card__body">
              <!-- 3D Canvas Container -->
              <div
                #viewportContainer
                class="c-preview litho-viewport"
                (mousedown)="onMouseDown($event)"
                (mousemove)="onMouseMove($event)"
                (mouseup)="onMouseUp()"
                (mouseleave)="onMouseUp()"
                (wheel)="onWheel($event)"
                (touchstart)="onTouchStart($event)"
                (touchmove)="onTouchMove($event)"
                (touchend)="onTouchEnd()"
              >
                <!-- Loading overlay -->
                @if (isGenerating()) {
                  <div class="viewport-overlay">
                    <app-progress-bar [value]="progressPercent()" label="Generating 3D Lithophane..." />
                  </div>
                }

                <div class="viewport-hints">
                  <span>🖱️ Click & Drag to Orbit • Scroll to Zoom</span>
                </div>
              </div>

              <!-- Telemetry & Metrics -->
              @if (currentMetrics(); as metrics) {
                <div class="metrics-grid g--margin-top-4">
                  <div class="metric-card">
                    <span class="metric-label">{{ 'common.dimensions' | translate }}</span>
                    <strong class="metric-value">{{ metrics.widthMm }} × {{ metrics.heightMm }} × {{ metrics.depthMm }} mm</strong>
                  </div>
                  <div class="metric-card">
                    <span class="metric-label">Solid Polygons</span>
                    <strong class="metric-value">{{ metrics.triangleCount | number }} tris</strong>
                  </div>
                  <div class="metric-card">
                    <span class="metric-label">{{ 'common.estWeight' | translate }}</span>
                    <strong class="metric-value">{{ metrics.estimatedGrams }} g (PLA)</strong>
                  </div>
                  <div class="metric-card">
                    <span class="metric-label">{{ 'common.estPrintTime' | translate }}</span>
                    <strong class="metric-value">~{{ metrics.estimatedPrintTimeHours }} hrs</strong>
                  </div>
                </div>

                <!-- Slicer Tips -->
                <div class="slicer-box g--margin-top-3">
                  <h4 class="slicer-title">🛠️ Optimal 3D Slicer Recommendations</h4>
                  <ul class="slicer-list">
                    @for (tip of metrics.slicerTips; track tip) {
                      <li>{{ tip }}</li>
                    }
                  </ul>
                </div>
              }
            </div>

            <!-- Export Buttons -->
            <div class="c-card__footer l-extremo">
              <div class="l-extremo__area-izquierda">
                <span class="g--text-muted">{{ 'common.exportFormats' | translate }}</span>
              </div>
              <div class="l-extremo__area-derecha export-actions">
                <button
                  type="button"
                  class="c-button c-button--outline"
                  (click)="downloadPngSnapshot()"
                >
                  {{ 'common.exportPng' | translate }}
                </button>
                <button
                  type="button"
                  class="c-button c-button--outline"
                  (click)="downloadFormat('3mf')"
                >
                  {{ 'common.export3mf' | translate }}
                </button>
                <button
                  type="button"
                  class="c-button c-button--primary"
                  (click)="downloadFormat('stl')"
                >
                  {{ 'common.exportStl' | translate }}
                </button>
              </div>
            </div>
          </app-card>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./lithophane-maker.component.scss'],
})
export class LithophaneMakerComponent implements OnInit, OnDestroy {
  @ViewChild('viewportContainer') viewportContainer!: ElementRef<HTMLDivElement>;

  // Domain signals
  readonly geometryType = signal<LithophaneGeometryType>('flat');
  readonly arcDegrees = signal<number>(90);
  readonly widthMm = signal<number>(100);
  readonly heightMm = signal<number>(80);
  readonly minThicknessMm = signal<number>(0.8);
  readonly maxThicknessMm = signal<number>(2.8);
  readonly frameBorderWidthMm = signal<number>(3.0);
  readonly frameBorderDepthMm = signal<number>(3.0);
  readonly invertLuminance = signal<boolean>(false);
  readonly contrastFactor = signal<number>(1.0);
  readonly baseStandSlot = signal<boolean>(false);
  readonly baseStandWidthMm = signal<number>(14);
  readonly resolution = signal<number>(70);

  // Viewport & backlight state
  readonly backlightOn = signal<boolean>(true);
  readonly backlightColor = signal<BacklightColorMode>('warm');
  readonly isGenerating = signal<boolean>(false);
  readonly progressPercent = signal<number>(0);

  // Telemetry metrics
  readonly currentMetrics = signal<LithophaneMetrics | null>(null);

  // Available Presets
  readonly presets = LITHOPHANE_PRESETS;

  // Active image buffer
  private currentImageBuffer: {
    width: number;
    height: number;
    data: Uint8ClampedArray;
  } | null = null;

  // Tracked object URLs for disposal
  private activeDownloadUrls: string[] = [];

  // Three.js internal engine refs
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private currentMesh: THREE.Mesh | null = null;
  private backlightLight: THREE.PointLight | null = null;
  private frontLight: THREE.DirectionalLight | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private animationFrameId: number | null = null;

  // Mouse rotation orbit state
  private isDragging = false;
  private prevMouseX = 0;
  private prevMouseY = 0;
  private meshRotationX = 0;
  private meshRotationY = 0;

  // Touch orbit state
  private isTouching = false;
  private prevTouchX = 0;
  private prevTouchY = 0;

  // Dedicated worker ref
  private worker?: Worker;

  ngOnInit(): void {
    // Load initial synthetic image
    this.currentImageBuffer = createSyntheticImageBuffer(70, 56, 'gradient');
  }

  ngAfterViewInit(): void {
    this.initThree();
    this.rebuildMesh();
  }

  ngOnDestroy(): void {
    // Memory hygiene: stop animation loop
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Clean up Three.js resources
    if (this.currentMesh) {
      this.currentMesh.geometry.dispose();
      if (Array.isArray(this.currentMesh.material)) {
        this.currentMesh.material.forEach((m) => m.dispose());
      } else {
        this.currentMesh.material.dispose();
      }
    }

    if (this.renderer && typeof this.renderer.dispose === 'function') {
      this.renderer.dispose();
    }

    if (this.worker) {
      this.worker.terminate();
      this.worker = undefined;
    }

    // Revoke all created Object URLs
    for (const url of this.activeDownloadUrls) {
      URL.revokeObjectURL(url);
    }
    this.activeDownloadUrls = [];
  }

  // --- PRESETS & CONFIGURATION ---

  applyPreset(preset: PresetLithophane): void {
    if (preset.options.geometryType) this.geometryType.set(preset.options.geometryType);
    if (preset.options.arcDegrees !== undefined) this.arcDegrees.set(preset.options.arcDegrees);
    if (preset.options.widthMm !== undefined) this.widthMm.set(preset.options.widthMm);
    if (preset.options.heightMm !== undefined) this.heightMm.set(preset.options.heightMm);
    if (preset.options.minThicknessMm !== undefined)
      this.minThicknessMm.set(preset.options.minThicknessMm);
    if (preset.options.maxThicknessMm !== undefined)
      this.maxThicknessMm.set(preset.options.maxThicknessMm);
    if (preset.options.frameBorderWidthMm !== undefined)
      this.frameBorderWidthMm.set(preset.options.frameBorderWidthMm);
    if (preset.options.frameBorderDepthMm !== undefined)
      this.frameBorderDepthMm.set(preset.options.frameBorderDepthMm);
    if (preset.options.baseStandSlot !== undefined)
      this.baseStandSlot.set(preset.options.baseStandSlot);

    this.rebuildMesh();
  }

  resetToDefaults(): void {
    this.geometryType.set(DEFAULT_LITHOPHANE_OPTIONS.geometryType);
    this.arcDegrees.set(DEFAULT_LITHOPHANE_OPTIONS.arcDegrees);
    this.widthMm.set(DEFAULT_LITHOPHANE_OPTIONS.widthMm);
    this.heightMm.set(DEFAULT_LITHOPHANE_OPTIONS.heightMm);
    this.minThicknessMm.set(DEFAULT_LITHOPHANE_OPTIONS.minThicknessMm);
    this.maxThicknessMm.set(DEFAULT_LITHOPHANE_OPTIONS.maxThicknessMm);
    this.frameBorderWidthMm.set(DEFAULT_LITHOPHANE_OPTIONS.frameBorderWidthMm);
    this.frameBorderDepthMm.set(DEFAULT_LITHOPHANE_OPTIONS.frameBorderDepthMm);
    this.invertLuminance.set(DEFAULT_LITHOPHANE_OPTIONS.invertLuminance);
    this.contrastFactor.set(DEFAULT_LITHOPHANE_OPTIONS.contrastFactor);
    this.baseStandSlot.set(DEFAULT_LITHOPHANE_OPTIONS.baseStandSlot);

    this.rebuildMesh();
  }

  setGeometryType(type: LithophaneGeometryType): void {
    this.geometryType.set(type);
    if (type === 'nightlight_panel') {
      this.baseStandSlot.set(true);
      this.widthMm.set(75);
      this.heightMm.set(100);
    }
    this.rebuildMesh();
  }

  updateContrast(val: number): void {
    this.contrastFactor.set(val);
    this.rebuildMesh();
  }

  toggleInvert(): void {
    this.invertLuminance.update((v) => !v);
    this.rebuildMesh();
  }

  toggleBaseStand(): void {
    this.baseStandSlot.update((v) => !v);
    this.rebuildMesh();
  }

  toggleBacklight(): void {
    this.backlightOn.update((v) => !v);
    this.updateLightsAndMaterial();
  }

  onContrastChange(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.updateContrast(val);
  }

  onArcDegreesChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.arcDegrees.set(val);
    this.rebuildMesh();
  }

  onWidthChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.widthMm.set(val);
    this.rebuildMesh();
  }

  onHeightChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.heightMm.set(val);
    this.rebuildMesh();
  }

  onMinThicknessChange(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.minThicknessMm.set(val);
    this.rebuildMesh();
  }

  onMaxThicknessChange(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.maxThicknessMm.set(val);
    this.rebuildMesh();
  }

  onBorderWidthChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.frameBorderWidthMm.set(val);
    this.rebuildMesh();
  }

  onBorderDepthChange(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.frameBorderDepthMm.set(val);
    this.rebuildMesh();
  }

  loadSampleImage(pattern: 'gradient' | 'checker' | 'circle'): void {
    this.currentImageBuffer = createSyntheticImageBuffer(80, 64, pattern);
    this.rebuildMesh();
  }

  // --- FILE HANDLING ---

  onFileDropped(files: File[]): void {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      // Downsample to max 140px width for smooth 60fps mesh generation
      const maxDim = 140;
      let targetW = img.width;
      let targetH = img.height;

      if (targetW > maxDim || targetH > maxDim) {
        if (targetW > targetH) {
          targetH = Math.round((targetH / targetW) * maxDim);
          targetW = maxDim;
        } else {
          targetW = Math.round((targetW / targetH) * maxDim);
          targetH = maxDim;
        }
      }

      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, targetW, targetH);
        const imgData = ctx.getImageData(0, 0, targetW, targetH);
        this.currentImageBuffer = {
          width: targetW,
          height: targetH,
          data: imgData.data,
        };

        // Auto-match aspect ratio
        const aspect = targetH / targetW;
        this.heightMm.set(Math.round(this.widthMm() * aspect));
        this.rebuildMesh();
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
    };

    img.src = objectUrl;
  }

  // --- DOWNLOAD ACTIONS ---

  async downloadFormat(format: 'stl' | '3mf'): Promise<void> {
    this.isGenerating.set(true);
    this.progressPercent.set(10);

    const options: LithophaneMakerOptions = {
      geometryType: this.geometryType(),
      arcDegrees: this.arcDegrees(),
      widthMm: this.widthMm(),
      heightMm: this.heightMm(),
      minThicknessMm: this.minThicknessMm(),
      maxThicknessMm: this.maxThicknessMm(),
      frameBorderWidthMm: this.frameBorderWidthMm(),
      frameBorderDepthMm: this.frameBorderDepthMm(),
      invertLuminance: this.invertLuminance(),
      contrastFactor: this.contrastFactor(),
      baseStandSlot: this.baseStandSlot(),
      baseStandWidthMm: this.baseStandWidthMm(),
      resolution: 120, // High quality for download
      imageData: this.currentImageBuffer,
    };

    let blob: Blob | undefined;
    let fileName = `privknife-lithophane-${options.geometryType}-${Math.round(options.widthMm)}x${Math.round(options.heightMm)}mm.${format}`;

    if (typeof Worker !== 'undefined') {
      try {
        const response = await this.executeWorkerTask(options, format);
        if (response.buffer) {
          blob = new Blob([response.buffer], {
            type: response.mimeType || (format === '3mf' ? 'model/3mf' : 'model/stl'),
          });
          if (response.fileName) fileName = response.fileName;
        }
      } catch {
        // Fallback to synchronous in test or restricted environments
      }
    }

    if (!blob) {
      const result = await processLithophane(options, format, (p) => this.progressPercent.set(p));
      if (result.success && result.blob) {
        blob = result.blob;
        fileName = result.fileName;
      }
    }

    this.isGenerating.set(false);
    this.progressPercent.set(0);

    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private executeWorkerTask(
    options: LithophaneMakerOptions,
    format: 'stl' | '3mf'
  ): Promise<LithophaneWorkerResponse> {
    return new Promise((resolve, reject) => {
      try {
        if (!this.worker) {
          this.worker = new Worker(new URL('./worker', import.meta.url), { type: 'module' });
        }
        const id = Date.now();
        const handler = (e: MessageEvent<LithophaneWorkerResponse>) => {
          if (e.data.id === id) {
            if (e.data.type === 'progress' && typeof e.data.percent === 'number') {
              this.progressPercent.set(e.data.percent);
            } else if (e.data.type === 'result') {
              this.worker?.removeEventListener('message', handler);
              resolve(e.data);
            } else if (e.data.type === 'error') {
              this.worker?.removeEventListener('message', handler);
              reject(new Error(e.data.error || 'Worker export failed'));
            }
          }
        };
        this.worker.addEventListener('message', handler);
        this.worker.postMessage({ id, options, format } as LithophaneWorkerRequest);
      } catch (err) {
        reject(err);
      }
    });
  }

  downloadPngSnapshot(): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    this.renderer.render(this.scene, this.camera);
    const canvas = this.renderer.domElement;
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `privknife-lithophane-${this.geometryType()}-${Math.round(this.widthMm())}x${Math.round(this.heightMm())}mm.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    }
  }

  // --- THREE.JS VIEWPORT & RENDERING ---

  private initThree(): void {
    if (!this.viewportContainer) return;

    try {
      const container = this.viewportContainer.nativeElement;
      const width = container.clientWidth || 400;
      const height = container.clientHeight || 380;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x111827);

      this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
      this.camera.position.set(0, 0, 180);

      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(this.renderer.domElement);

      // Ambient light
      this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      this.scene.add(this.ambientLight);

      // Front directional light (for relief shadows)
      this.frontLight = new THREE.DirectionalLight(0xffffff, 0.8);
      this.frontLight.position.set(50, 80, 120);
      this.scene.add(this.frontLight);

      // Backlight simulator (warm glow from behind)
      this.backlightLight = new THREE.PointLight(0xffecd2, 1.8, 400);
      this.backlightLight.position.set(0, 0, -80);
      this.scene.add(this.backlightLight);

      // Animation render loop
      const animate = () => {
        this.animationFrameId = requestAnimationFrame(animate);
        if (this.currentMesh) {
          this.currentMesh.rotation.y = this.meshRotationY;
          this.currentMesh.rotation.x = this.meshRotationX;
        }
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      };
      animate();
    } catch {
      // Guard against headless test environments without WebGL context
    }
  }

  private rebuildMesh(): void {
    const options: LithophaneMakerOptions = {
      geometryType: this.geometryType(),
      arcDegrees: this.arcDegrees(),
      widthMm: this.widthMm(),
      heightMm: this.heightMm(),
      minThicknessMm: this.minThicknessMm(),
      maxThicknessMm: this.maxThicknessMm(),
      frameBorderWidthMm: this.frameBorderWidthMm(),
      frameBorderDepthMm: this.frameBorderDepthMm(),
      invertLuminance: this.invertLuminance(),
      contrastFactor: this.contrastFactor(),
      baseStandSlot: this.baseStandSlot(),
      baseStandWidthMm: this.baseStandWidthMm(),
      resolution: this.resolution(),
      imageData: this.currentImageBuffer,
    };

    const geometry = generateLithophaneGeometry(options);
    const metrics = calculateLithophaneMetrics(geometry, options);
    this.currentMetrics.set(metrics);

    if (!this.scene) {
      geometry.dispose();
      return;
    }

    // Dispose old mesh
    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      this.currentMesh.geometry.dispose();
      if (Array.isArray(this.currentMesh.material)) {
        this.currentMesh.material.forEach((m) => m.dispose());
      } else {
        this.currentMesh.material.dispose();
      }
    }

    const material = this.createLithoMaterial();
    this.currentMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.currentMesh);

    // Center camera on geometry
    if (this.camera) {
      const maxDim = Math.max(options.widthMm, options.heightMm);
      this.camera.position.z = maxDim * 1.8;
    }
  }

  private createLithoMaterial(): THREE.Material {
    if (this.backlightOn()) {
      // Backlit simulated plastic with vertex colors
      return new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.35,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });
    } else {
      // Clay white 3D printed finish
      return new THREE.MeshStandardMaterial({
        color: 0xf5f5f5,
        roughness: 0.6,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });
    }
  }

  private updateLightsAndMaterial(): void {
    if (!this.currentMesh) return;

    if (this.backlightLight) {
      this.backlightLight.intensity = this.backlightOn() ? 2.0 : 0.0;
    }

    if (this.frontLight) {
      this.frontLight.intensity = this.backlightOn() ? 0.35 : 0.9;
    }

    if (this.ambientLight) {
      this.ambientLight.intensity = this.backlightOn() ? 0.25 : 0.5;
    }

    const newMaterial = this.createLithoMaterial();
    if (this.currentMesh.material) {
      if (Array.isArray(this.currentMesh.material)) {
        this.currentMesh.material.forEach((m) => m.dispose());
      } else {
        this.currentMesh.material.dispose();
      }
    }
    this.currentMesh.material = newMaterial;
  }

  // --- MOUSE ORBIT CONTROLS ---

  onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.prevMouseX = event.clientX;
    this.prevMouseY = event.clientY;
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;
    const deltaX = event.clientX - this.prevMouseX;
    const deltaY = event.clientY - this.prevMouseY;

    this.meshRotationY += deltaX * 0.01;
    this.meshRotationX += deltaY * 0.01;

    // Clamp X rotation to prevent flipping upside down
    this.meshRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.meshRotationX));

    this.prevMouseX = event.clientX;
    this.prevMouseY = event.clientY;
  }

  onMouseUp(): void {
    this.isDragging = false;
  }

  // --- TOUCH & WHEEL VIEWPORT CONTROLS ---

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (!this.camera) return;
    const zoomDelta = event.deltaY * 0.1;
    this.camera.position.z = Math.max(60, Math.min(350, this.camera.position.z + zoomDelta));
  }

  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.isTouching = true;
      this.prevTouchX = event.touches[0].clientX;
      this.prevTouchY = event.touches[0].clientY;
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isTouching || event.touches.length !== 1) return;
    event.preventDefault();
    const touch = event.touches[0];
    const deltaX = touch.clientX - this.prevTouchX;
    const deltaY = touch.clientY - this.prevTouchY;

    this.meshRotationY += deltaX * 0.01;
    this.meshRotationX += deltaY * 0.01;
    this.meshRotationX = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.meshRotationX));

    this.prevTouchX = touch.clientX;
    this.prevTouchY = touch.clientY;
  }

  onTouchEnd(): void {
    this.isTouching = false;
  }
}
