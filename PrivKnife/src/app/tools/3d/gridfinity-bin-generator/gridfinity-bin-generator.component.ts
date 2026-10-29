import { TranslatePipe } from '../../../core/i18n';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import {
  Badge,
  Card,
} from '../../../components';
import {
  GridfinityLipStyle,
  GridfinityBinGeneratorOptions,
  GridfinityBinMetrics,
  PresetGridfinityBin,
  GridfinityWorkerRequest,
  GridfinityWorkerResponse,
} from './types';
import {
  calculateGridfinityMetrics,
  generateGridfinityGeometry,
  processGridfinity,
} from './engine';
import {
  DEFAULT_GRIDFINITY_OPTIONS,
  GRIDFINITY_PRESETS,
} from './test-fixtures';

@Component({
  selector: 'app-gridfinity-bin-generator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    Badge,
    Card,
    TranslatePipe,
  ],
  template: `
    <div class="l-page">
      <!-- Header -->
      <div class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">{{ 'tools.gridfinityBinGenerator.name' | translate }}</h1>
          <p class="c-header__subtitle">
            {{ 'tools.gridfinityBinGenerator.description' | translate }}
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
              <h2 class="c-card__title">{{ 'tools.gridfinityBinGenerator.presetsTitle' | translate }}</h2>
            </div>
            <div class="c-card__body">
              <div class="presets-grid">
                @for (preset of presets; track preset.id) {
                  <button
                    type="button"
                    class="c-button c-button--outline gridfinity-preset-btn"
                    [class.c-button--primary]="gridX() === preset.options.gridX && gridY() === preset.options.gridY && heightUnits() === preset.options.heightUnits"
                    (click)="applyPreset(preset)"
                  >
                    <strong>{{ preset.name }}</strong>
                    <span class="gridfinity-preset-desc">{{ preset.description }}</span>
                  </button>
                }
              </div>
            </div>
          </app-card>

          <!-- Grid Dimensions & Height -->
          <app-card class="g--margin-top-4">
            <div class="c-card__header">
              <h2 class="c-card__title">{{ 'tools.gridfinityBinGenerator.unitsTitle' | translate }}</h2>
            </div>
            <div class="c-card__body">
              <!-- Grid X & Y Selectors -->
              <div class="param-grid">
                <div class="control-group">
                  <label class="c-input__label">
                    {{ 'tools.gridfinityBinGenerator.gridWidth' | translate }} <strong>{{ gridX() }} units</strong> ({{ gridX() * 42 - 0.5 }} mm)
                  </label>
                  <div class="unit-btn-row">
                    @for (val of [1, 2, 3, 4, 5, 6]; track val) {
                      <button
                        type="button"
                        class="c-button c-button--small unit-btn"
                        [class.c-button--primary]="gridX() === val"
                        [class.c-button--outline]="gridX() !== val"
                        (click)="setGridX(val)"
                      >
                        {{ val }}
                      </button>
                    }
                  </div>
                </div>

                <div class="control-group">
                  <label class="c-input__label">
                    {{ 'tools.gridfinityBinGenerator.gridDepth' | translate }} <strong>{{ gridY() }} units</strong> ({{ gridY() * 42 - 0.5 }} mm)
                  </label>
                  <div class="unit-btn-row">
                    @for (val of [1, 2, 3, 4, 5, 6]; track val) {
                      <button
                        type="button"
                        class="c-button c-button--small unit-btn"
                        [class.c-button--primary]="gridY() === val"
                        [class.c-button--outline]="gridY() !== val"
                        (click)="setGridY(val)"
                      >
                        {{ val }}
                      </button>
                    }
                  </div>
                </div>
              </div>

              <!-- Height in 7mm Units -->
              <div class="control-row g--margin-top-4">
                <label class="c-input__label">
                  {{ 'tools.gridfinityBinGenerator.binHeight' | translate }} <strong>{{ heightUnits() }}U</strong> ({{ heightUnits() * 7 }} mm / {{ (heightUnits() * 7 / 25.4) | number:'1.1-1' }} in)
                </label>
                <input
                  type="range"
                  class="c-input c-input__slider"
                  min="2"
                  max="14"
                  step="1"
                  [value]="heightUnits()"
                  (input)="onHeightChange($event)"
                />
              </div>

              <!-- Stacking Lip Style -->
              <div class="control-group g--margin-top-4">
                <label class="c-input__label">{{ 'tools.gridfinityBinGenerator.lipStyle' | translate }}</label>
                <div class="lip-button-row">
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="lipStyle() === 'standard'"
                    [class.c-button--outline]="lipStyle() !== 'standard'"
                    (click)="setLipStyle('standard')"
                  >
                    Standard Gridfinity (Stackable)
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="lipStyle() === 'flat'"
                    [class.c-button--outline]="lipStyle() !== 'flat'"
                    (click)="setLipStyle('flat')"
                  >
                    Flat Rim (Drawer Flush)
                  </button>
                  <button
                    type="button"
                    class="c-button c-button--small"
                    [class.c-button--primary]="lipStyle() === 'none'"
                    [class.c-button--outline]="lipStyle() !== 'none'"
                    (click)="setLipStyle('none')"
                  >
                    None (Raw Edge)
                  </button>
                </div>
              </div>
            </div>
          </app-card>

          <!-- Dividers & Ergonomics -->
          <app-card class="g--margin-top-4">
            <div class="c-card__header">
              <h2 class="c-card__title">{{ 'tools.gridfinityBinGenerator.dividersTitle' | translate }}</h2>
            </div>
            <div class="c-card__body">
              <!-- Internal Subdivisions -->
              <div class="param-grid">
                <div class="control-group">
                  <label class="c-input__label">{{ 'tools.gridfinityBinGenerator.xCompartments' | translate }} <strong>{{ subdivisionsX() }}</strong></label>
                  <input
                    type="range"
                    class="c-input c-input__slider"
                    min="1"
                    max="6"
                    step="1"
                    [value]="subdivisionsX()"
                    (input)="onSubdivisionsXChange($event)"
                  />
                </div>

                <div class="control-group">
                  <label class="c-input__label">{{ 'tools.gridfinityBinGenerator.yCompartments' | translate }} <strong>{{ subdivisionsY() }}</strong></label>
                  <input
                    type="range"
                    class="c-input c-input__slider"
                    min="1"
                    max="6"
                    step="1"
                    [value]="subdivisionsY()"
                    (input)="onSubdivisionsYChange($event)"
                  />
                </div>
              </div>

              <!-- Finger Scoop Toggle -->
              <div class="control-row g--margin-top-4">
                <label class="c-input__checkbox-label">
                  <input
                    type="checkbox"
                    data-testid="finger-scoop-toggle"
                    [checked]="fingerScoop()"
                    (change)="toggleFingerScoop()"
                  />
                  <span>{{ 'tools.gridfinityBinGenerator.fingerScoop' | translate }}</span>
                </label>
              </div>

              @if (fingerScoop()) {
                <div class="control-group g--margin-top-2 g--margin-left-4">
                  <label class="c-input__label">Scoop Radius: <strong>{{ fingerScoopRadiusMm() }} mm</strong></label>
                  <input
                    type="range"
                    class="c-input c-input__slider"
                    data-testid="scoop-radius-slider"
                    min="6"
                    max="20"
                    step="1"
                    [value]="fingerScoopRadiusMm()"
                    (input)="onFingerScoopRadiusChange($event)"
                  />
                </div>
              }

              <!-- Label Tab Toggle -->
              <div class="control-row g--margin-top-3">
                <label class="c-input__checkbox-label">
                  <input
                    type="checkbox"
                    data-testid="label-tab-toggle"
                    [checked]="labelTab()"
                    (change)="toggleLabelTab()"
                  />
                  <span>{{ 'tools.gridfinityBinGenerator.labelTab' | translate }}</span>
                </label>
              </div>

              @if (labelTab()) {
                <div class="param-grid g--margin-top-2 g--margin-left-4">
                  <div class="control-group">
                    <label class="c-input__label">Tab Width: <strong>{{ labelTabWidthMm() }} mm</strong></label>
                    <input
                      type="range"
                      class="c-input c-input__slider"
                      data-testid="label-width-slider"
                      min="12"
                      max="42"
                      step="1"
                      [value]="labelTabWidthMm()"
                      (input)="onLabelTabWidthChange($event)"
                    />
                  </div>
                  <div class="control-group">
                    <label class="c-input__label">Tab Angle: <strong>{{ labelAngleDeg() }}°</strong></label>
                    <input
                      type="range"
                      class="c-input c-input__slider"
                      data-testid="label-angle-slider"
                      min="30"
                      max="60"
                      step="5"
                      [value]="labelAngleDeg()"
                      (input)="onLabelAngleChange($event)"
                    />
                  </div>
                </div>
              }

              <!-- Magnet / Screw Base Features -->
              <div class="control-row g--margin-top-3">
                <label class="c-input__checkbox-label">
                  <input
                    type="checkbox"
                    data-testid="base-magnet-holes"
                    [checked]="baseMagnetHoles()"
                    (change)="toggleMagnetHoles()"
                  />
                  <span>{{ 'tools.gridfinityBinGenerator.magnetPockets' | translate }}</span>
                </label>
              </div>

              <div class="control-row g--margin-top-3">
                <label class="c-input__checkbox-label">
                  <input
                    type="checkbox"
                    data-testid="base-screw-holes"
                    [checked]="baseScrewHoles()"
                    (change)="toggleScrewHoles()"
                  />
                  <span>{{ 'tools.gridfinityBinGenerator.screwHoles' | translate }}</span>
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
                <h2 class="c-card__title">{{ 'tools.gridfinityBinGenerator.viewportTitle' | translate }}</h2>
              </div>
              <div class="l-extremo__area-derecha">
                <span class="badge-dim">Grid: {{ gridX() }}×{{ gridY() }} ({{ heightUnits() }}U)</span>
              </div>
            </div>

            <div class="c-card__body">
              <!-- 3D Canvas Viewport -->
              <div
                #viewportContainer
                class="c-preview gridfinity-viewport"
                tabindex="0"
                role="region"
                aria-label="Interactive 3D model viewport"
                (mousedown)="onMouseDown($event)"
                (mousemove)="onMouseMove($event)"
                (mouseup)="onMouseUp()"
                (mouseleave)="onMouseUp()"
                (wheel)="onWheel($event)"
                (touchstart)="onTouchStart($event)"
                (touchmove)="onTouchMove($event)"
                (touchend)="onTouchEnd()"
              >
                <div class="viewport-hints">
                  <span>🖱️ Click & Drag to Rotate • Scroll to Zoom</span>
                </div>
              </div>

              <!-- Telemetry Metrics -->
              @if (currentMetrics(); as metrics) {
                <div class="metrics-grid g--margin-top-4">
                  <div class="metric-card">
                    <span class="metric-label">{{ 'common.dimensions' | translate }}</span>
                    <strong class="metric-value">{{ metrics.totalWidthMm }} × {{ metrics.totalLengthMm }} × {{ metrics.totalHeightMm }} mm</strong>
                  </div>
                  <div class="metric-card">
                    <span class="metric-label">Compartments</span>
                    <strong class="metric-value">{{ metrics.internalCompartments }} {{ metrics.internalCompartments === 1 ? 'pocket' : 'pockets' }}</strong>
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
                  <h4 class="slicer-title">🛠️ Optimal Gridfinity Slicer Settings</h4>
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
  styleUrls: ['./gridfinity-bin-generator.component.scss'],
})
export class GridfinityBinGeneratorComponent implements OnInit, OnDestroy {
  @ViewChild('viewportContainer') viewportContainer!: ElementRef<HTMLDivElement>;

  // Domain signals
  readonly gridX = signal<number>(1);
  readonly gridY = signal<number>(1);
  readonly heightUnits = signal<number>(3);
  readonly subdivisionsX = signal<number>(1);
  readonly subdivisionsY = signal<number>(1);
  readonly lipStyle = signal<GridfinityLipStyle>('standard');
  readonly fingerScoop = signal<boolean>(true);
  readonly fingerScoopRadiusMm = signal<number>(10);
  readonly labelTab = signal<boolean>(true);
  readonly labelTabWidthMm = signal<number>(24);
  readonly labelAngleDeg = signal<number>(45);
  readonly baseMagnetHoles = signal<boolean>(true);
  readonly baseScrewHoles = signal<boolean>(false);
  readonly wallThicknessMm = signal<number>(1.2);

  // Telemetry metrics
  readonly currentMetrics = signal<GridfinityBinMetrics | null>(null);

  // Available Presets
  readonly presets = GRIDFINITY_PRESETS;

  // Tracked object URLs for disposal
  private activeDownloadUrls: string[] = [];

  // Dedicated worker ref
  private worker: Worker | null = null;

  // Three.js internal engine refs
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private currentMesh: THREE.Mesh | null = null;
  private animationFrameId: number | null = null;

  // Mouse & Touch rotation orbit state
  private isDragging = false;
  private prevMouseX = 0;
  private prevMouseY = 0;
  private meshRotationX = 0.5; // Slight isometric tilt
  private meshRotationY = -0.5;

  ngOnInit(): void {
    // Initial state set
  }

  ngAfterViewInit(): void {
    this.initThree();
    this.rebuildMesh();
  }

  ngOnDestroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

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

    for (const url of this.activeDownloadUrls) {
      URL.revokeObjectURL(url);
    }
    this.activeDownloadUrls = [];
  }

  // --- PRESETS & CONFIGURATION ---

  applyPreset(preset: PresetGridfinityBin): void {
    if (preset.options.gridX !== undefined) this.gridX.set(preset.options.gridX);
    if (preset.options.gridY !== undefined) this.gridY.set(preset.options.gridY);
    if (preset.options.heightUnits !== undefined) this.heightUnits.set(preset.options.heightUnits);
    if (preset.options.subdivisionsX !== undefined)
      this.subdivisionsX.set(preset.options.subdivisionsX);
    if (preset.options.subdivisionsY !== undefined)
      this.subdivisionsY.set(preset.options.subdivisionsY);
    if (preset.options.lipStyle !== undefined) this.lipStyle.set(preset.options.lipStyle);
    if (preset.options.fingerScoop !== undefined) this.fingerScoop.set(preset.options.fingerScoop);
    if (preset.options.labelTab !== undefined) this.labelTab.set(preset.options.labelTab);
    if (preset.options.baseMagnetHoles !== undefined)
      this.baseMagnetHoles.set(preset.options.baseMagnetHoles);
    if (preset.options.baseScrewHoles !== undefined)
      this.baseScrewHoles.set(preset.options.baseScrewHoles);
    if (preset.options.fingerScoopRadiusMm !== undefined)
      this.fingerScoopRadiusMm.set(preset.options.fingerScoopRadiusMm);
    if (preset.options.labelTabWidthMm !== undefined)
      this.labelTabWidthMm.set(preset.options.labelTabWidthMm);
    if (preset.options.labelAngleDeg !== undefined)
      this.labelAngleDeg.set(preset.options.labelAngleDeg);

    this.rebuildMesh();
  }

  setGridX(units: number): void {
    this.gridX.set(units);
    this.rebuildMesh();
  }

  setGridY(units: number): void {
    this.gridY.set(units);
    this.rebuildMesh();
  }

  setLipStyle(style: GridfinityLipStyle): void {
    this.lipStyle.set(style);
    this.rebuildMesh();
  }

  toggleFingerScoop(): void {
    this.fingerScoop.update((v) => !v);
    this.rebuildMesh();
  }

  toggleLabelTab(): void {
    this.labelTab.update((v) => !v);
    this.rebuildMesh();
  }

  toggleMagnetHoles(): void {
    this.baseMagnetHoles.update((v) => !v);
    this.rebuildMesh();
  }

  toggleScrewHoles(): void {
    this.baseScrewHoles.update((v) => !v);
    this.rebuildMesh();
  }

  onFingerScoopRadiusChange(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.fingerScoopRadiusMm.set(val);
    this.rebuildMesh();
  }

  onLabelTabWidthChange(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.labelTabWidthMm.set(val);
    this.rebuildMesh();
  }

  onLabelAngleChange(event: Event): void {
    const val = parseFloat((event.target as HTMLInputElement).value);
    this.labelAngleDeg.set(val);
    this.rebuildMesh();
  }

  onHeightChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.heightUnits.set(val);
    this.rebuildMesh();
  }

  onSubdivisionsXChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.subdivisionsX.set(val);
    this.rebuildMesh();
  }

  onSubdivisionsYChange(event: Event): void {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    this.subdivisionsY.set(val);
    this.rebuildMesh();
  }

  resetToDefaults(): void {
    this.gridX.set(DEFAULT_GRIDFINITY_OPTIONS.gridX);
    this.gridY.set(DEFAULT_GRIDFINITY_OPTIONS.gridY);
    this.heightUnits.set(DEFAULT_GRIDFINITY_OPTIONS.heightUnits);
    this.subdivisionsX.set(DEFAULT_GRIDFINITY_OPTIONS.subdivisionsX);
    this.subdivisionsY.set(DEFAULT_GRIDFINITY_OPTIONS.subdivisionsY);
    this.lipStyle.set(DEFAULT_GRIDFINITY_OPTIONS.lipStyle);
    this.fingerScoop.set(DEFAULT_GRIDFINITY_OPTIONS.fingerScoop);
    this.fingerScoopRadiusMm.set(DEFAULT_GRIDFINITY_OPTIONS.fingerScoopRadiusMm);
    this.labelTab.set(DEFAULT_GRIDFINITY_OPTIONS.labelTab);
    this.labelTabWidthMm.set(DEFAULT_GRIDFINITY_OPTIONS.labelTabWidthMm);
    this.labelAngleDeg.set(DEFAULT_GRIDFINITY_OPTIONS.labelAngleDeg);
    this.baseMagnetHoles.set(DEFAULT_GRIDFINITY_OPTIONS.baseMagnetHoles);
    this.baseScrewHoles.set(DEFAULT_GRIDFINITY_OPTIONS.baseScrewHoles);
    this.wallThicknessMm.set(DEFAULT_GRIDFINITY_OPTIONS.wallThicknessMm ?? 1.2);
    this.rebuildMesh();
  }

  // --- DOWNLOAD ACTIONS ---

  async downloadFormat(format: 'stl' | '3mf'): Promise<void> {
    const options: GridfinityBinGeneratorOptions = {
      gridX: this.gridX(),
      gridY: this.gridY(),
      heightUnits: this.heightUnits(),
      subdivisionsX: this.subdivisionsX(),
      subdivisionsY: this.subdivisionsY(),
      lipStyle: this.lipStyle(),
      fingerScoop: this.fingerScoop(),
      fingerScoopRadiusMm: this.fingerScoopRadiusMm(),
      labelTab: this.labelTab(),
      labelTabWidthMm: this.labelTabWidthMm(),
      labelAngleDeg: this.labelAngleDeg(),
      baseMagnetHoles: this.baseMagnetHoles(),
      baseScrewHoles: this.baseScrewHoles(),
      wallThicknessMm: this.wallThicknessMm(),
    };

    if (typeof Worker !== 'undefined') {
      try {
        await new Promise<void>((resolve, reject) => {
          const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
          this.worker = worker;

          worker.onmessage = (e: MessageEvent<GridfinityWorkerResponse>) => {
            if (e.data.type === 'result' && e.data.buffer) {
              const blob = new Blob([e.data.buffer], {
                type: e.data.mimeType || 'application/octet-stream',
              });
              this.triggerDownload(blob, e.data.fileName || `gridfinity-bin.${format}`);
              worker.terminate();
              this.worker = null;
              resolve();
            } else if (e.data.type === 'error') {
              worker.terminate();
              this.worker = null;
              reject(new Error(e.data.error || 'Worker export failed'));
            }
          };

          worker.onerror = (err) => {
            worker.terminate();
            this.worker = null;
            reject(err);
          };

          worker.postMessage({ id: Date.now(), options, format } as GridfinityWorkerRequest);
        });
        return;
      } catch {
        // Fallback to direct synchronous execution if worker fails
      }
    }

    const result = await processGridfinity(options, format);
    if (!result.success || !result.blob) return;

    this.triggerDownload(result.blob, result.fileName);
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    this.activeDownloadUrls.push(url);

    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      URL.revokeObjectURL(url);
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
      this.scene.background = new THREE.Color(0x0f172a);

      this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
      this.camera.position.set(0, -90, 100);
      this.camera.lookAt(0, 0, 10);

      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(this.renderer.domElement);

      // Lighting: Key, Fill, and Ambient
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      this.scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 0.85);
      keyLight.position.set(80, -100, 140);
      this.scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.4);
      fillLight.position.set(-80, 100, 60);
      this.scene.add(fillLight);

      const animate = () => {
        this.animationFrameId = requestAnimationFrame(animate);
        if (this.currentMesh) {
          this.currentMesh.rotation.z = this.meshRotationY;
          this.currentMesh.rotation.x = this.meshRotationX;
        }
        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }
      };
      animate();
    } catch {
      // Guard against headless test environments
    }
  }

  private rebuildMesh(): void {
    const options: GridfinityBinGeneratorOptions = {
      gridX: this.gridX(),
      gridY: this.gridY(),
      heightUnits: this.heightUnits(),
      subdivisionsX: this.subdivisionsX(),
      subdivisionsY: this.subdivisionsY(),
      lipStyle: this.lipStyle(),
      fingerScoop: this.fingerScoop(),
      fingerScoopRadiusMm: this.fingerScoopRadiusMm(),
      labelTab: this.labelTab(),
      labelTabWidthMm: this.labelTabWidthMm(),
      labelAngleDeg: this.labelAngleDeg(),
      baseMagnetHoles: this.baseMagnetHoles(),
      baseScrewHoles: this.baseScrewHoles(),
      wallThicknessMm: this.wallThicknessMm(),
    };

    const geometry = generateGridfinityGeometry(options);
    const metrics = calculateGridfinityMetrics(geometry, options);
    this.currentMetrics.set(metrics);

    if (!this.scene) {
      geometry.dispose();
      return;
    }

    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      this.currentMesh.geometry.dispose();
      if (Array.isArray(this.currentMesh.material)) {
        this.currentMesh.material.forEach((m) => m.dispose());
      } else {
        this.currentMesh.material.dispose();
      }
    }

    // Gridfinity matte orange / slate industrial plastic look
    const material = new THREE.MeshStandardMaterial({
      color: 0xf97316, // Zack Freedman signature Gridfinity safety orange
      roughness: 0.45,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    this.currentMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.currentMesh);

    // Adjust camera distance based on bin diagonal
    if (this.camera) {
      const maxDim = Math.max(metrics.totalWidthMm, metrics.totalLengthMm, metrics.totalHeightMm);
      this.camera.position.set(0, -maxDim * 1.6, maxDim * 1.5);
      this.camera.lookAt(0, 0, metrics.totalHeightMm / 2);
    }
  }

  // --- MOUSE & TOUCH ORBIT CONTROLS & WHEEL ZOOM ---

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

    this.meshRotationX = Math.max(0.1, Math.min(Math.PI / 2.2, this.meshRotationX));

    this.prevMouseX = event.clientX;
    this.prevMouseY = event.clientY;
  }

  onMouseUp(): void {
    this.isDragging = false;
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (!this.camera) return;
    const zoomFactor = event.deltaY > 0 ? 1.08 : 0.92;
    this.camera.position.x *= zoomFactor;
    this.camera.position.y *= zoomFactor;
    this.camera.position.z *= zoomFactor;
  }

  onTouchStart(event: TouchEvent): void {
    if (event.touches.length === 1) {
      this.isDragging = true;
      this.prevMouseX = event.touches[0].clientX;
      this.prevMouseY = event.touches[0].clientY;
    }
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging || event.touches.length !== 1) return;
    event.preventDefault();
    const touch = event.touches[0];
    const deltaX = touch.clientX - this.prevMouseX;
    const deltaY = touch.clientY - this.prevMouseY;

    this.meshRotationY += deltaX * 0.01;
    this.meshRotationX += deltaY * 0.01;
    this.meshRotationX = Math.max(0.1, Math.min(Math.PI / 2.2, this.meshRotationX));

    this.prevMouseX = touch.clientX;
    this.prevMouseY = touch.clientY;
  }

  onTouchEnd(): void {
    this.isDragging = false;
  }
}
